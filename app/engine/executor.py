from __future__ import annotations

import asyncio

from app.agents import healer, validator
from app.compiler.graph_builder import CompiledGraph, compile_spec
from app.config import settings
from app.connectors import registry
from app.connectors.base import MockConnector
from app.engine.context import eval_condition, resolve
from app.schemas import (
    Execution,
    ExecutionLog,
    ExecutionState,
    Node,
    NodeStatus,
    NodeType,
    WorkflowSpec,
)
from app.storage import repository
from app.utils import now_iso


def _log(execution: Execution, node_id: str, **kw) -> ExecutionLog:
    entry = ExecutionLog(node_id=node_id, **kw)
    execution.logs.append(entry)
    return entry


def _completed_ids(execution: Execution) -> set[str]:
    return {l.node_id for l in execution.logs if l.status == NodeStatus.succeeded}


async def _run_connector(node: Node, config: dict, context: dict, dry_run: bool):
    connector = registry.resolve(node.connector)
    if dry_run or settings.force_mock_connectors:
        connector = MockConnector(connector)
        result = await asyncio.to_thread(connector.execute, config, context)
    else:
        result = await asyncio.to_thread(connector.execute, config, context, False)
    return result


async def run_execution(spec: WorkflowSpec, execution: Execution) -> Execution:
    graph = compile_spec(spec)
    execution.state = ExecutionState.running
    repository.save_execution(execution)

    context = execution.context
    context.setdefault("trigger", _trigger_output(spec, execution.dry_run))
    context.setdefault("_vars", spec.variables)
    for k, v in spec.variables.items():
        context.setdefault(k, v)

    completed = _completed_ids(execution)
    disabled: set[str] = set(execution.context.get("_disabled", []))

    for node_id in graph.execution_order():
        if node_id in completed or node_id in disabled:
            continue
        node = graph.nodes[node_id]

        deps = [d for d in node.depends_on if not _is_control_backedge(graph, node, d)]
        if any(d in disabled for d in deps) and not any(d in completed for d in deps):
            disabled.add(node_id)
            _log(execution, node_id, status=NodeStatus.skipped, reasoning=node.reasoning)
            continue
        if not all(d in completed for d in deps):
            if any(d in disabled for d in deps):
                disabled.add(node_id)
                _log(execution, node_id, status=NodeStatus.skipped)
                continue

        paused = await _execute_node(graph, node, execution, context, completed, disabled)
        execution.context["_disabled"] = list(disabled)
        repository.save_execution(execution)
        if paused:
            return execution

    execution.state = ExecutionState.completed
    repository.save_execution(execution)
    return execution


def _is_control_backedge(graph: CompiledGraph, node: Node, dep: str) -> bool:
    return node.type == NodeType.for_each and dep in node.loop_body


async def _execute_node(
    graph: CompiledGraph,
    node: Node,
    execution: Execution,
    context: dict,
    completed: set,
    disabled: set,
) -> bool:
    start = now_iso()

    if node.type == NodeType.conditional:
        taken = eval_condition(node.condition or "false", context)
        _log(
            execution, node.id, status=NodeStatus.succeeded, start_time=start,
            end_time=now_iso(), output={"taken": "true" if taken else "false"},
            reasoning=node.reasoning,
        )
        not_taken = node.false_branch if taken else node.true_branch
        for tgt in not_taken:
            disabled.add(tgt)
        completed.add(node.id)
        return False

    if node.type == NodeType.human_approval:
        auto = node.config.get("auto_approve", True)
        if auto or execution.dry_run:
            _log(
                execution, node.id, status=NodeStatus.succeeded, start_time=start,
                end_time=now_iso(), output={"approved": True, "auto": True},
                reasoning=node.reasoning,
            )
            completed.add(node.id)
            return False
        _log(execution, node.id, status=NodeStatus.awaiting_approval, start_time=start,
             reasoning=node.reasoning)
        execution.pending_approval_node_id = node.id
        execution.state = ExecutionState.awaiting_approval
        return True

    if node.type == NodeType.for_each:
        items = resolve(node.iterate_over, context) or []
        outputs = []
        for idx, item in enumerate(items):
            loop_ctx = {**context, "item": item, "index": idx}
            iter_disabled: set[str] = set()
            for body_id in node.loop_body:
                if body_id in iter_disabled:
                    outputs.append({body_id: {"skipped": "untaken branch"}})
                    continue
                body = graph.nodes[body_id]
                res = await _run_body_node(body, loop_ctx, execution.dry_run, iter_disabled)
                outputs.append({body_id: res})
        _log(execution, node.id, status=NodeStatus.succeeded, start_time=start,
             end_time=now_iso(), input={"count": len(items)}, output={"iterations": outputs},
             reasoning=node.reasoning)
        completed.add(node.id)
        for body_id in node.loop_body:
            completed.add(body_id)
        return False

    resolved_config = resolve(node.config, context)
    attempts = max(1, node.retry_policy.max_attempts)
    backoff = node.retry_policy.backoff_seconds
    last_error = None
    for attempt in range(1, attempts + 1):
        if attempt > 1 and backoff > 0:
            await asyncio.sleep(backoff * (2 ** (attempt - 2)))
        try:
            result = await _run_connector(node, resolved_config, context, execution.dry_run)
            if result.status != "succeeded":
                raise RuntimeError(result.error or "connector reported failure")
            context[node.id] = result.output if isinstance(result.output, dict) else {"value": result.output}
            _log(execution, node.id, status=NodeStatus.succeeded, start_time=start,
                 end_time=now_iso(), input=resolved_config, output=result.output,
                 reasoning=node.reasoning, attempt=attempt)
            completed.add(node.id)
            return False
        except Exception as e:
            last_error = str(e)

    _log(execution, node.id, status=NodeStatus.failed, start_time=start,
         end_time=now_iso(), input=resolved_config, error=last_error, reasoning=node.reasoning)

    if execution.dry_run:
        execution.state = ExecutionState.failed
        return True

    patch = healer.heal(graph.spec, node, last_error or "unknown error")
    repository.log_decision(execution.workflow_id, "healer", patch.model_dump())
    execution.pending_heal = patch
    execution.state = ExecutionState.awaiting_heal_approval
    _log(execution, node.id, status=NodeStatus.healing, reasoning=patch.diff_explanation)
    return True


async def _run_body_node(node: Node, context: dict, dry_run: bool, iter_disabled: set[str]):
    if node.type == NodeType.conditional:
        taken = eval_condition(node.condition or "false", context)
        not_taken = node.false_branch if taken else node.true_branch
        iter_disabled.update(not_taken)
        return {"taken": taken}
    if node.type == NodeType.human_approval:
        return {"approved": True, "auto": True}
    if node.type != NodeType.connector:
        return {"skipped": f"unsupported node type in loop body: {node.type}"}
    resolved = resolve(node.config, context)
    result = await _run_connector(node, resolved, context, dry_run)
    return result.output


def _trigger_output(spec: WorkflowSpec, dry_run: bool) -> dict:
    trig = spec.trigger
    if trig.type != "manual" and registry.has_connector(trig.type):
        connector = registry.resolve(trig.type)
        if dry_run or settings.force_mock_connectors:
            connector = MockConnector(connector)
            return connector.execute(trig.config, {}).output or {}
        return connector.execute(trig.config, {}, False).output or {}
    return {}


async def apply_heal_and_resume(spec: WorkflowSpec, execution: Execution) -> Execution:
    patch = execution.pending_heal
    if not patch:
        return execution
    node = spec.get_node(patch.node_id)
    healed = healer.apply_patch(node, patch)
    candidate_nodes = [healed if n.id == patch.node_id else n for n in spec.nodes]
    candidate_spec = spec.model_copy(update={"nodes": candidate_nodes})

    result = validator.validate(candidate_spec)
    if not result.passed:
        reasons = "; ".join(f"{e.node_id}: {e.reason}" for e in result.errors)
        _log(execution, patch.node_id, status=NodeStatus.failed,
             error=f"patch rejected by validator: {reasons}")
        execution.state = ExecutionState.failed
        execution.pending_heal = None
        repository.save_execution(execution)
        return execution

    spec.nodes = candidate_nodes
    execution.pending_heal = None
    repository.log_decision(execution.workflow_id, "healer", {"applied": patch.node_id})
    return await run_execution(spec, execution)


async def apply_approval_and_resume(spec: WorkflowSpec, execution: Execution, approved: bool) -> Execution:
    node_id = execution.pending_approval_node_id
    if not node_id:
        return execution
    execution.pending_approval_node_id = None
    if not approved:
        _log(execution, node_id, status=NodeStatus.failed, reasoning="rejected by user")
        execution.state = ExecutionState.failed
        repository.save_execution(execution)
        return execution
    _log(execution, node_id, status=NodeStatus.succeeded, output={"approved": True, "auto": False})
    return await run_execution(spec, execution)
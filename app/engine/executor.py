"""Execution engine.

Walks the compiled DAG in dependency order, running independent nodes
concurrently. State is persisted to the store after EVERY node, so a long
workflow can be resumed across multiple (serverless) invocations rather than
needing one continuous process.

- dry_run: connectors return realistic mock data (via MockConnector).
- conditionals enable only the taken branch; unreached nodes are skipped.
- for_each runs its loop body once per item with `item` bound in context.
- human_approval gates are logged; auto-approved in this MVP unless configured.
- on real-run node failure the Self-Healing agent proposes a patch and the
  execution pauses (awaiting_heal_approval) instead of dying.
"""
from __future__ import annotations

import asyncio

from app.agents import healer
from app.compiler.graph_builder import CompiledGraph, compile_spec
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
    if dry_run:
        connector = MockConnector(connector)
        result = await asyncio.to_thread(connector.execute, config, context)
    else:
        result = await asyncio.to_thread(connector.execute, config, context, False)
    return result


async def run_execution(spec: WorkflowSpec, execution: Execution) -> Execution:
    """Run (or resume) an execution to completion or to the next pause point."""
    graph = compile_spec(spec)
    execution.state = ExecutionState.running
    repository.save_execution(execution)

    context = execution.context
    context.setdefault("trigger", _trigger_output(spec, execution.dry_run))
    context.setdefault("__vars__", spec.variables)
    # variables are addressable as bare roots too (e.g. approval_threshold)
    for k, v in spec.variables.items():
        context.setdefault(k, v)

    completed = _completed_ids(execution)
    # nodes explicitly disabled by an untaken branch
    disabled: set[str] = set(execution.context.get("__disabled__", []))

    for node_id in graph.execution_order():
        if node_id in completed or node_id in disabled:
            continue
        node = graph.nodes[node_id]

        # a node runs only if every dependency completed and none disabled it
        deps = [d for d in node.depends_on if not _is_control_backedge(graph, node, d)]
        if any(d in disabled for d in deps) and not any(d in completed for d in deps):
            disabled.add(node_id)
            _log(execution, node_id, status=NodeStatus.skipped, reasoning=node.reasoning)
            continue
        if not all(d in completed for d in deps):
            # dependency didn't complete (skipped upstream) -> skip
            if any(d in disabled for d in deps):
                disabled.add(node_id)
                _log(execution, node_id, status=NodeStatus.skipped)
                continue

        paused = await _execute_node(graph, node, execution, context, completed, disabled)
        execution.context["__disabled__"] = list(disabled)
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
    """Execute one node. Returns True if the execution must pause."""
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
        execution.state = ExecutionState.awaiting_heal_approval  # reuse pause state
        return True

    if node.type == NodeType.for_each:
        items = resolve(node.iterate_over, context) or []
        outputs = []
        for idx, item in enumerate(items):
            loop_ctx = {**context, "item": item, "index": idx}
            for body_id in node.loop_body:
                body = graph.nodes[body_id]
                res = await _run_body_node(body, loop_ctx, execution.dry_run)
                outputs.append({body_id: res})
        _log(execution, node.id, status=NodeStatus.succeeded, start_time=start,
             end_time=now_iso(), input={"count": len(items)}, output={"iterations": outputs},
             reasoning=node.reasoning)
        completed.add(node.id)
        for body_id in node.loop_body:
            completed.add(body_id)  # body nodes handled inline
        return False

    # ---- connector node ----
    resolved_config = resolve(node.config, context)
    attempts = max(1, node.retry_policy.max_attempts)
    last_error = None
    for attempt in range(1, attempts + 1):
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
        except Exception as e:  # noqa: BLE001
            last_error = str(e)

    # ---- failure: invoke self-healing (real runs only) ----
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


async def _run_body_node(node: Node, context: dict, dry_run: bool):
    if node.type != NodeType.connector:
        return {"skipped": "non-connector in loop body"}
    resolved = resolve(node.config, context)
    result = await _run_connector(node, resolved, context, dry_run)
    return result.output


def _trigger_output(spec: WorkflowSpec, dry_run: bool) -> dict:
    trig = spec.trigger
    if trig.type != "manual" and registry.has_connector(trig.type):
        connector = registry.resolve(trig.type)
        if dry_run:
            connector = MockConnector(connector)
            return connector.execute(trig.config, {}).output or {}
        return connector.execute(trig.config, {}, False).output or {}
    return {}


# --------------------------------------------------------------------------- #
# Heal approval / resume
# --------------------------------------------------------------------------- #
async def apply_heal_and_resume(spec: WorkflowSpec, execution: Execution) -> Execution:
    """Apply the pending patch to the failing node, re-run just that node, and
    continue the execution."""
    patch = execution.pending_heal
    if not patch:
        return execution
    node = spec.get_node(patch.node_id)
    healed = healer.apply_patch(node, patch)
    # mutate spec in place so downstream refs and re-run use the patched node
    spec.nodes = [healed if n.id == patch.node_id else n for n in spec.nodes]
    execution.pending_heal = None
    repository.log_decision(execution.workflow_id, "healer", {"applied": patch.node_id})
    return await run_execution(spec, execution)

from __future__ import annotations

from app.connectors import registry
from app.llm.client import complete_json
from app.schemas import HealPatch, Node, WorkflowSpec

_BASE_SYSTEM = """You are Sayso's self-healing agent. A node failed at runtime.
Given the node, the error, and the workflow, propose the smallest patch to the
node that would fix it. Output JSON matching HealPatch:
{"node_id", "error", "patch": {config/field overrides to merge into the node},
 "diff_explanation": "plain English", "reasoning": "..."}.
Do not rewrite the whole workflow — just the failing node.

## Connector config schema (the only fields each connector accepts)
{connectors}

NEVER propose adding a "credentials", "connection_id", "token", "api_key", or "auth" field to a
node's config — that is not part of this system's config schema for any connector and will not
work. Authentication is always resolved automatically from the caller's connected account; it can
never be fixed at the node-config level. Template references only ever use {{ }} syntax (e.g.
{{ trigger.from }}) — never ${...} or other interpolation syntax.

If the error is something node config genuinely cannot fix (e.g. a missing external credential
that only an administrator can set via environment configuration, or a transient network
failure), say so plainly in diff_explanation and propose the smallest patch that is actually
possible — do not invent a config field just to have something to propose."""


def heal(spec: WorkflowSpec, node: Node, error: str) -> HealPatch:
    system = _BASE_SYSTEM.replace("{connectors}", registry.connector_schema())
    return complete_json(
        task="healer",
        system=system,
        user=f"Failed node: {node.model_dump_json()}\nError: {error}\n"
        f"Workflow: {spec.model_dump_json()}",
        schema=HealPatch,
        context={"node": node.model_dump(), "error": error, "spec": spec.model_dump()},
    )


def apply_patch(node: Node, patch: HealPatch) -> Node:
    data = node.model_dump()
    for key, value in patch.patch.items():
        if isinstance(value, dict) and isinstance(data.get(key), dict):
            data[key] = {**data[key], **value}
        else:
            data[key] = value
    return Node.model_validate(data)
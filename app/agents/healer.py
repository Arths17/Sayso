"""Self-healing agent.

Input: failed node, error message, workflow spec.
Output: a proposed HealPatch (config patch + human-readable diff explanation).
Does NOT auto-apply — the API returns it for approval, then re-runs just the
affected node on approval.
"""
from __future__ import annotations

from app.llm.client import complete_json
from app.schemas import HealPatch, Node, WorkflowSpec

_SYSTEM = """You are Sayso's self-healing agent. A node failed at runtime.
Given the node, the error, and the workflow, propose the smallest patch to the
node that would fix it. Output JSON matching HealPatch:
{"node_id", "error", "patch": {config/field overrides to merge into the node},
 "diff_explanation": "plain English", "reasoning": "..."}.
Do not rewrite the whole workflow — just the failing node."""


def heal(spec: WorkflowSpec, node: Node, error: str) -> HealPatch:
    return complete_json(
        task="healer",
        system=_SYSTEM,
        user=f"Failed node: {node.model_dump_json()}\nError: {error}\n"
        f"Workflow: {spec.model_dump_json()}",
        schema=HealPatch,
        context={"node": node.model_dump(), "error": error, "spec": spec.model_dump()},
    )


def apply_patch(node: Node, patch: HealPatch) -> Node:
    """Merge the patch into the node (used on approval)."""
    data = node.model_dump()
    for key, value in patch.patch.items():
        if isinstance(value, dict) and isinstance(data.get(key), dict):
            data[key] = {**data[key], **value}
        else:
            data[key] = value
    return Node.model_validate(data)

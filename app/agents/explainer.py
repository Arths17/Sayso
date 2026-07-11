from __future__ import annotations

from pydantic import BaseModel

from app.llm.client import complete_json
from app.schemas import Node, WorkflowSpec


class _Explanation(BaseModel):
    explanation: str


_SYSTEM = """You are Sayso's explainer. In ONE sentence, plainly explain why
this node exists in the workflow and why it runs where it does. Prefer the
node's own reasoning trace. Output JSON: {"explanation": "..."}."""


def explain(spec: WorkflowSpec, node: Node, logs: list[dict] | None = None) -> str:
    result = complete_json(
        task="explainer",
        system=_SYSTEM,
        user=f"Node: {node.model_dump_json()}\n"
        f"Workflow reasoning: {spec.reasoning}\nLogs: {logs or []}",
        schema=_Explanation,
        context={"node": node.model_dump(), "workflow_reasoning": spec.reasoning},
    )
    return result.explanation
"""Critic agent — reviews the planner output for gaps before validation.

Checks for missing required fields, ambiguous steps, and references to
connectors not in the library. Returns ok OR needs_clarification with questions
that can be answered turn-by-turn via /clarify.
"""
from __future__ import annotations

from app.llm.client import complete_json
from app.schemas import ClarificationRequest, WorkflowSpec

_SYSTEM = """You are Sayso's critic. Given a workflow JSON, find problems that
need the USER to clarify: missing required connector fields (e.g. no Slack
channel), ambiguous steps, or references to unknown connectors. Output JSON:
{"status": "ok"} or
{"status": "needs_clarification", "questions": ["..."], "reasoning": "..."}.
Only ask about things a human must decide — do not invent work."""


def critique(spec: WorkflowSpec) -> ClarificationRequest:
    return complete_json(
        task="critic",
        system=_SYSTEM,
        user=f"Workflow: {spec.model_dump_json()}",
        schema=ClarificationRequest,
        context={"spec": spec.model_dump()},
    )

from __future__ import annotations

import json

from app.llm.client import complete_json
from app.schemas import WorkflowSpec
from app.connectors import registry

_SYSTEM = """You are Sayso's planner. Convert the user's request into an
automation workflow. Output ONLY JSON matching this schema:

WorkflowSpec {{
  name, description, reasoning,
  trigger: {{type, config, reasoning}},
  variables: object,
  nodes: [ Node {{
    id, type ("connector"|"conditional"|"for_each"|"human_approval"),
    connector (registry name for connector nodes, else null),
    config, depends_on: [ids], retry_policy,
    condition, true_branch, false_branch,   // conditional nodes
    iterate_over, loop_body,                 // for_each nodes
    reasoning                                // WHY this step exists
  }} ]
}}

Available connectors: {connectors}.
Use variable references like "{{{{ node_id.field }}}}". Every step MUST include a
one-sentence `reasoning`. Handle conditionals, loops, and human-approval gates
as first-class node types."""


def plan(prompt: str, answers: dict[str, str] | None = None) -> WorkflowSpec:
    system = _SYSTEM.format(connectors=", ".join(registry.available()))
    user = f"Request: {prompt}"
    if answers:
        user += "\nClarifications: " + json.dumps(answers)
    return complete_json(
        task="planner",
        system=system,
        user=user,
        schema=WorkflowSpec,
        context={"prompt": prompt, "answers": answers or {}},
    )
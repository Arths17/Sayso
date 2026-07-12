from __future__ import annotations
from app.llm.client import complete_json
from app.connectors import registry
from app.schemas import ClarificationRequest, WorkflowSpec

_BASE_SYSTEM = """
You are Sayso's critic. Given a workflow JSON file, find problems that genuinely need a human
to make a business decision the planner could not have guessed: an unspecified recipient,
an ambiguous amount/threshold, or similar missing business input.

## Connector config schema (the only fields each connector accepts)
{connectors}

Do NOT ask about:
- authentication, credentials, connection IDs, or API keys for any connector — these are never
  part of node config and are always resolved automatically (see the note above)
- structural/graph correctness (unknown node ids in depends_on, unknown connectors, missing
  required fields with an obvious value) — a separate deterministic validator checks that; if you
  spot one of these, the planner should simply be trusted to have gotten it right, not the user
- spreadsheet_id, filenames, or any other identifier the user referred to by a human-readable
  name (e.g. "the Inbox Log sheet", "invoices.pdf") — accept the name as given and let the planner
  use it directly as the identifier. No user types a raw Google Sheets ID into a prompt, so never
  ask them to. Only ask about a spreadsheet/file if the user gave no name or description for it
  at all.

Only ask about things a human must decide. Do not invent work, and do not ask more than one
question per genuinely ambiguous field.

Output JSON: {"status": "ok"} or {"status": "needs_clarification", "questions": ["..."], "reasoning": "..."}.
"""


def critique(spec: WorkflowSpec) -> ClarificationRequest:
    system = _BASE_SYSTEM.replace("{connectors}", registry.connector_schema())
    return complete_json(
        task="critic",
        system=system,
        user=f"Workflow: {spec.model_dump_json()}",
        schema=ClarificationRequest,
        context={"spec": spec.model_dump()},
    )
from __future__ import annotations

import re
from typing import Any


def respond(task: str, context: dict[str, Any]) -> dict[str, Any]:
    fn = _TASKS.get(task)
    if fn is None:
        raise ValueError(f"stub has no handler for task '{task}'")
    return fn(context)


def _plan(ctx: dict) -> dict:
    prompt = (ctx.get("prompt") or "").lower()
    answers = ctx.get("answers") or {}
    prompt_full = prompt + " " + " ".join(str(v).lower() for v in answers.values())

    if "invoice" in prompt_full:
        return _invoice_plan(prompt_full, answers)
    return _generic_plan(prompt_full, answers)


def _channel_from(text: str, answers: dict) -> str | None:
    m = re.search(r"#([\w-]+)", text)
    if m:
        return f"#{m.group(1)}"
    for v in answers.values():
        m = re.search(r"#([\w-]+)", str(v))
        if m:
            return f"#{m.group(1)}"
    return None


def _threshold_from(text: str) -> int:
    m = re.search(r"(\d[\d,]{2,})", text)
    return int(m.group(1).replace(",", "")) if m else 5000


def _invoice_plan(text: str, answers: dict) -> dict:
    channel = _channel_from(text, answers) or "#finance"
    threshold = _threshold_from(text)
    return {
        "name": "Invoice processing",
        "description": "Extract invoice data from incoming email attachments and route by amount.",
        "reasoning": "Trigger on invoice emails, pull the PDF, extract fields with AI, "
        "then branch on amount so large invoices get human approval before recording.",
        "trigger": {
            "type": "GmailTrigger",
            "config": {"query": "has:attachment subject:invoice"},
            "reasoning": "Invoices arrive as email attachments.",
        },
        "variables": {"approval_threshold": threshold},
        "nodes": [
            {
                "id": "extract_text",
                "type": "connector",
                "connector": "PDFExtractText",
                "config": {"source": {"message_id": "{{ trigger.message_id }}", "attachment_id": "{{ trigger.attachment_id }}"}},
                "depends_on": [],
                "reasoning": "The invoice body lives inside the PDF attachment.",
            },
            {
                "id": "extract_fields",
                "type": "connector",
                "connector": "LLMExtractFields",
                "config": {
                    "text": "{{ extract_text.text }}",
                    "schema": {
                        "vendor": "string",
                        "amount": "number",
                        "due_date": "string",
                        "invoice_number": "string",
                    },
                },
                "depends_on": ["extract_text"],
                "reasoning": "Turn raw invoice text into structured fields for routing.",
            },
            {
                "id": "check_amount",
                "type": "conditional",
                "connector": None,
                "condition": "{{ extract_fields.amount }} > {{ approval_threshold }}",
                "true_branch": ["approve_large"],
                "false_branch": [],
                "depends_on": ["extract_fields"],
                "reasoning": "Large invoices need a human sign-off before being recorded.",
            },
            {
                "id": "approve_large",
                "type": "human_approval",
                "connector": None,
                "config": {"prompt": "Approve large invoice payment?"},
                "depends_on": ["check_amount"],
                "reasoning": "Human approval gate for high-value invoices.",
            },
            {
                "id": "record_invoice",
                "type": "connector",
                "connector": "SheetsAppend",
                "config": {
                    "spreadsheet_id": "invoices",
                    "row": {
                        "vendor": "{{ extract_fields.vendor }}",
                        "amount": "{{ extract_fields.amount }}",
                        "due_date": "{{ extract_fields.due_date }}",
                    },
                },
                "depends_on": ["check_amount"],
                "reasoning": "Persist every invoice to the finance sheet.",
            },
            {
                "id": "notify",
                "type": "connector",
                "connector": "SlackNotify",
                "config": {
                    "channel": channel,
                    "text": "Invoice from {{ extract_fields.vendor }} for {{ extract_fields.amount }} processed.",
                },
                "depends_on": ["record_invoice"],
                "reasoning": "Tell the finance team an invoice was processed.",
            },
        ],
    }


def _generic_plan(text: str, answers: dict) -> dict:
    channel = _channel_from(text, answers) or ""
    nodes = []
    if "sheet" in text or "row" in text:
        nodes.append(
            {
                "id": "read_rows",
                "type": "connector",
                "connector": "SheetsReadRows",
                "config": {"spreadsheet_id": "source"},
                "depends_on": [],
                "reasoning": "Load the rows to iterate over.",
            }
        )
        nodes.append(
            {
                "id": "for_each_row",
                "type": "for_each",
                "connector": None,
                "iterate_over": "{{ read_rows.rows }}",
                "loop_body": ["notify_row"],
                "depends_on": ["read_rows"],
                "reasoning": "Process each row independently.",
            }
        )
        nodes.append(
            {
                "id": "notify_row",
                "type": "connector",
                "connector": "SlackNotify",
                "config": {"channel": channel, "text": "Row: {{ item }}"},
                "depends_on": ["for_each_row"],
                "reasoning": "Send a notification per row.",
            }
        )
    else:
        nodes.append(
            {
                "id": "notify",
                "type": "connector",
                "connector": "SlackNotify",
                "config": {"channel": channel, "text": "Workflow ran."},
                "depends_on": [],
                "reasoning": "Notify the team.",
            }
        )
    return {
        "name": "Generated workflow",
        "description": "Heuristically generated from the prompt.",
        "reasoning": "Best-effort plan from available keywords.",
        "trigger": {"type": "manual", "config": {}, "reasoning": "No explicit trigger found."},
        "variables": {},
        "nodes": nodes,
    }


def _critique(ctx: dict) -> dict:
    spec = ctx.get("spec") or {}
    questions: list[str] = []
    for node in spec.get("nodes", []):
        if node.get("connector") == "SlackNotify":
            ch = (node.get("config") or {}).get("channel")
            if not ch or "{{" in str(ch):
                questions.append(
                    f"Node '{node['id']}' sends a Slack message but no concrete "
                    "channel was specified. Which channel should it post to?"
                )
    if questions:
        return {
            "status": "needs_clarification",
            "questions": questions,
            "reasoning": "Required connector fields are missing or unresolved.",
        }
    return {"status": "ok", "questions": [], "reasoning": "All required fields present."}


def _heal(ctx: dict) -> dict:
    node = ctx.get("node") or {}
    error = ctx.get("error") or ""
    node_id = node.get("id", "unknown")
    config = dict(node.get("config") or {})

    if "channel" in error.lower():
        patch = {"config": {**config, "channel": "#general"}}
        expl = f"Node '{node_id}' failed because no Slack channel was set; defaulting to #general."
    elif "spreadsheet" in error.lower() or "not found" in error.lower():
        patch = {"config": {**config, "spreadsheet_id": "invoices"}}
        expl = f"Corrected the spreadsheet id on '{node_id}' to a known sheet."
    elif "field" in error.lower() or "key" in error.lower() or "regex" in error.lower():
        schema = dict(config.get("schema") or {})
        schema.setdefault("amount", "number")
        patch = {"config": {**config, "schema": schema}}
        expl = f"Added the missing 'amount' field to '{node_id}' extraction schema."
    else:
        patch = {"retry_policy": {"max_attempts": 3, "backoff_seconds": 1.0}}
        expl = f"Could not pinpoint the cause on '{node_id}'; added retries as a fallback."

    return {
        "node_id": node_id,
        "error": error,
        "patch": patch,
        "diff_explanation": expl,
        "reasoning": "Mapped the runtime error to the most likely config fix.",
    }


def _explain(ctx: dict) -> dict:
    node = ctx.get("node") or {}
    reasoning = node.get("reasoning")
    node_id = node.get("id", "this node")
    if reasoning:
        text = reasoning
    else:
        conn = node.get("connector") or node.get("type")
        text = f"Node '{node_id}' runs {conn} as part of the workflow sequence."
    return {"explanation": text}


def _extract_fields(ctx: dict) -> dict:
    schema = ctx.get("schema") or {}
    out = {}
    for k, t in schema.items():
        if t == "number":
            out[k] = 4200
        else:
            out[k] = f"stub_{k}"
    return {"fields": out}


_TASKS = {
    "planner": _plan,
    "critic": _critique,
    "healer": _heal,
    "explainer": _explain,
    "llm_extract": _extract_fields,
}
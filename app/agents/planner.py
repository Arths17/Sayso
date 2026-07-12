from __future__ import annotations

import json

from app.llm.client import complete_json
from app.schemas import WorkflowSpec
from app.connectors import registry

_BASE_SYSTEM = """You are Sayso's planner. Convert the user's request into an automation workflow.
Think step by step about what needs to happen, based on the user's input, then output ONLY valid JSON matching the schema.

## Node Types
- "connector": Calls an external service (use connector name from list below)
- "conditional": Branches based on a condition (has true_branch/false_branch)
- "for_each": Iterates over a list (has iterate_over and loop_body)
- "human_approval": Pauses for human review (has config.prompt)

## Available Connectors
{connectors}

## Examples

### Example 1: Invoice Processing
Input: "When an invoice email arrives, extract vendor, amount and due date. If the amount is greater than 5000 require human approval. Record it to the finance sheet and email finance@company.com."
Output: {
  "name": "Invoice processing",
  "description": "Extract invoice data from incoming email attachments and route by amount.",
  "reasoning": "Trigger on invoice emails, pull the PDF, extract fields with AI, then branch on amount so large invoices get human approval before recording.",
  "trigger": {"type": "GmailTrigger", "config": {"query": "has:attachment subject:invoice"}, "reasoning": "Invoices arrive as email attachments."},
  "variables": {"approval_threshold": 5000},
  "nodes": [
    {"id": "extract_text", "type": "connector", "connector": "PDFExtractText", "config": {"source": {"message_id": "{{ trigger.message_id }}", "attachment_id": "{{ trigger.attachment_id }}"}}, "depends_on": [], "reasoning": "The invoice body lives inside the PDF attachment."},
    {"id": "extract_fields", "type": "connector", "connector": "LLMExtractFields", "config": {"text": "{{ extract_text.text }}", "schema": {"vendor": "string", "amount": "number", "due_date": "string"}}, "depends_on": ["extract_text"], "reasoning": "Turn raw invoice text into structured fields for routing."},
    {"id": "check_amount", "type": "conditional", "condition": "{{ extract_fields.amount }} > {{ approval_threshold }}", "true_branch": ["approve_large"], "false_branch": [], "depends_on": ["extract_fields"], "reasoning": "Large invoices need a human sign-off before being recorded."},
    {"id": "approve_large", "type": "human_approval", "config": {"prompt": "Approve large invoice payment?"}, "depends_on": ["check_amount"], "reasoning": "Human approval gate for high-value invoices."},
    {"id": "record_invoice", "type": "connector", "connector": "SheetsAppend", "config": {"spreadsheet_id": "invoices", "row": {"vendor": "{{ extract_fields.vendor }}", "amount": "{{ extract_fields.amount }}", "due_date": "{{ extract_fields.due_date }}"}}, "depends_on": ["check_amount"], "reasoning": "Persist every invoice to the finance sheet."},
    {"id": "notify", "type": "connector", "connector": "GmailSend", "config": {"to": "finance@company.com", "subject": "Invoice processed", "body": "Invoice from {{ extract_fields.vendor }} for {{ extract_fields.amount }} processed."}, "depends_on": ["record_invoice"], "reasoning": "Tell the finance team an invoice was processed."}
  ]
}

### Example 2: For-Each Loop
Input: "For each row in the customers sheet, email team@company.com with the row."
Output: {
  "name": "Generated workflow",
  "description": "Heuristically generated from the prompt.",
  "reasoning": "Best-effort plan from available keywords.",
  "trigger": {"type": "manual", "config": {}, "reasoning": "No explicit trigger found."},
  "variables": {},
  "nodes": [
    {"id": "read_rows", "type": "connector", "connector": "SheetsReadRows", "config": {"spreadsheet_id": "source"}, "depends_on": [], "reasoning": "Load the rows to iterate over."},
    {"id": "for_each_row", "type": "for_each", "iterate_over": "{{ read_rows.rows }}", "loop_body": ["notify_row"], "depends_on": ["read_rows"], "reasoning": "Process each row independently."},
    {"id": "notify_row", "type": "connector", "connector": "GmailSend", "config": {"to": "team@company.com", "subject": "Row update", "body": "Row: {{ item }}"}, "depends_on": ["for_each_row"], "reasoning": "Send a notification per row."}
  ]
}

### Example 3: Simple Notification
Input: "Email me whenever a new signup happens"
Output: {
  "name": "Generated workflow",
  "description": "Heuristically generated from the prompt.",
  "reasoning": "Best-effort plan from available keywords.",
  "trigger": {"type": "manual", "config": {}, "reasoning": "No explicit trigger found."},
  "variables": {},
  "nodes": [
    {"id": "notify", "type": "connector", "connector": "GmailSend", "config": {"to": "", "subject": "Workflow ran", "body": "Workflow ran."}, "depends_on": [], "reasoning": "Notify the user."}
  ]
}

Every step MUST include a one-sentence `reasoning` field explaining WHY it exists."""

def plan(prompt: str, answers: dict[str, str] | None = None) -> WorkflowSpec:
    system = _BASE_SYSTEM.replace("{connectors}", registry.connector_schema())
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
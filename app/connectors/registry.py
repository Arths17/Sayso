from __future__ import annotations

from app.connectors.base import Connector, CredentialStore
from app.connectors import library

_CONNECTOR_CLASSES: dict[str, type[Connector]] = {
    cls.name: cls
    for cls in [
        library.GmailTrigger,
        library.GmailSend,
        library.DriveUpload,
        library.SheetsAppend,
        library.SheetsReadRows,
        library.HTTPRequest,
        library.PDFExtractText,
        library.LLMExtractFields,
    ]
}

_credentials = CredentialStore()


def has_connector(name: str) -> bool:
    return name in _CONNECTOR_CLASSES


def available() -> list[str]:
    return sorted(_CONNECTOR_CLASSES)


# Config schema shown to the planner/critic LLMs. Authentication for Gmail/
# Drive/Sheets is always resolved automatically by CredentialStore from
# the caller's connected account (see app/connectors/base.py) — connector
# config must never include a credentials/connection_id/auth field, so that
# guidance is stated once here instead of on every connector line.
_SCHEMA = """\
- GmailTrigger (trigger only): config.query (optional Gmail search string, e.g. "has:attachment subject:invoice")
- GmailSend: config.to (required), config.body (required), config.subject (optional)
- DriveUpload: config.filename (optional), config.content (optional)
- SheetsAppend: config.spreadsheet_id (required), config.row (optional object), config.range (optional, default "A1")
- SheetsReadRows: config.spreadsheet_id (required), config.range (optional, default "Sheet1")
- HTTPRequest: config.url (required), config.method (optional, default GET), config.json (optional), config.headers (optional)
- PDFExtractText: config.source (required — either a base64-encoded PDF string, or {message_id, attachment_id} from a GmailTrigger output)
- LLMExtractFields: config.text (required), config.schema (required, e.g. {"vendor": "string", "amount": "number"})

Authentication note: Gmail, Drive, and Sheets connectors authenticate automatically using the
user's connected Google account (managed in the Integrations tab). NEVER add a "credentials",
"connection_id", or "auth" field to any node's config — that field does not exist in this
system and must not be invented or asked about.
"""

# Output fields each connector actually produces, available downstream as
# {{ node_id.field }} (or {{ trigger.field }} for the trigger). Without this,
# the planner guesses plausible-sounding field names (e.g. "sender" instead of
# the real "from") that silently fail or resolve to nothing at runtime.
_OUTPUT_SCHEMA = """\
- GmailTrigger output: from, subject, date, message_id, attachment_id (attachment_id is only
  present when the email has an attachment; pass {message_id, attachment_id} as a unit to
  PDFExtractText, never attachment_id alone)
- GmailSend output: sent, to
- DriveUpload output: file_id, url
- SheetsAppend output: appended, row, updated_range
- SheetsReadRows output: rows (a list of objects — one per row, keyed by that sheet's own column headers, which are not known in advance)
- HTTPRequest output: status_code, body
- PDFExtractText output: text
- LLMExtractFields output: fields (an object) — each extracted field is also available directly
  by name at the top level, e.g. {{ node_id.vendor }} as well as {{ node_id.fields.vendor }}

There is no "sender" field anywhere in this system — Gmail's sender address is always under "from".
"""


def connector_schema() -> str:
    return _SCHEMA + "\n## Connector output fields (what you can reference downstream)\n" + _OUTPUT_SCHEMA


def resolve(name: str) -> Connector:
    if name not in _CONNECTOR_CLASSES:
        raise KeyError(f"unknown connector '{name}'")
    return _CONNECTOR_CLASSES[name](_credentials)
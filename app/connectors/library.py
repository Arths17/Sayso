from __future__ import annotations

import re
from typing import Any

import httpx

from app.connectors.base import Connector, ConnectorError, ConnectorResult


class GmailTrigger(Connector):
    name = "GmailTrigger"

    def run(self, config, context):
        return ConnectorResult(output={"messages": [], "note": "real gmail stub"})

    def mock(self, config, context):
        return ConnectorResult(
            output={
                "message_id": "msg_123",
                "from": "billing@acme.com",
                "subject": "Invoice #4491",
                "attachment": "invoice_4491.pdf",
            }
        )


class GmailSend(Connector):
    name = "GmailSend"

    def run(self, config, context):
        _require(config, ["to", "body"])
        return ConnectorResult(output={"sent": True, "to": config["to"]})

    def mock(self, config, context):
        return ConnectorResult(output={"sent": True, "to": config.get("to", "a@b.com")})


class DriveUpload(Connector):
    name = "DriveUpload"

    def run(self, config, context):
        return ConnectorResult(output={"file_id": "drive_real_1", "url": "https://drive/x"})

    def mock(self, config, context):
        return ConnectorResult(
            output={"file_id": "drive_mock_1", "url": "https://drive.google.com/file/mock"}
        )


class SheetsAppend(Connector):
    name = "SheetsAppend"

    def run(self, config, context):
        if not config.get("spreadsheet_id"):
            raise ConnectorError("spreadsheet_id not found")
        return ConnectorResult(output={"appended": True, "row": config.get("row")})

    def mock(self, config, context):
        return ConnectorResult(
            output={"appended": True, "row": config.get("row", {}), "updated_range": "A2:D2"}
        )


class SheetsReadRows(Connector):
    name = "SheetsReadRows"

    def run(self, config, context):
        if not config.get("spreadsheet_id"):
            raise ConnectorError("spreadsheet_id not found")
        return ConnectorResult(output={"rows": []})

    def mock(self, config, context):
        return ConnectorResult(
            output={
                "rows": [
                    {"name": "Acme", "amount": 1200},
                    {"name": "Globex", "amount": 8400},
                    {"name": "Initech", "amount": 300},
                ]
            }
        )


class SlackNotify(Connector):
    name = "SlackNotify"

    def run(self, config, context):
        channel = config.get("channel")
        if not channel or "{{" in str(channel):
            raise ConnectorError("no Slack channel specified")
        return ConnectorResult(output={"ok": True, "channel": channel})

    def mock(self, config, context):
        return ConnectorResult(
            output={"ok": True, "channel": config.get("channel", "#general"), "ts": "1680000000.0001"}
        )


class HTTPRequest(Connector):
    name = "HTTPRequest"

    def run(self, config, context):
        method = config.get("method", "GET")
        url = config.get("url")
        if not url:
            raise ConnectorError("url not specified")
        with httpx.Client(timeout=30) as c:
            r = c.request(method, url, json=config.get("json"), headers=config.get("headers"))
        return ConnectorResult(
            output={"status_code": r.status_code, "body": r.text[:2000]}
        )

    def mock(self, config, context):
        return ConnectorResult(
            output={"status_code": 200, "body": '{"ok": true, "mock": true}'}
        )


class PDFExtractText(Connector):
    name = "PDFExtractText"

    def run(self, config, context):
        if not config.get("source"):
            raise ConnectorError("no source PDF provided")
        return ConnectorResult(output={"text": "(real pdf extraction stub)"})

    def mock(self, config, context):
        return ConnectorResult(
            output={
                "text": "INVOICE #4491\nVendor: Acme Corp\nAmount: 8400.00\n"
                "Due: 2026-08-01\nInvoice Number: 4491"
            }
        )


class LLMExtractFields(Connector):
    name = "LLMExtractFields"

    def _extract(self, config, context, dry_run):
        from app.llm.client import complete_json
        from pydantic import BaseModel, Field

        schema = config.get("schema") or {}
        text = str(config.get("text") or "")

        parsed = _naive_parse(text, schema)

        class _Fields(BaseModel):
            fields: dict[str, Any] = Field(default_factory=dict)

        result = complete_json(
            task="llm_extract",
            system="Extract the requested fields from the text as JSON.",
            user=f"Schema: {schema}\nText: {text}",
            schema=_Fields,
            context={"schema": schema, "text": text},
        )
        merged = {**result.fields, **{k: v for k, v in parsed.items() if v is not None}}
        return ConnectorResult(output={"fields": merged, **merged})

    def run(self, config, context):
        return self._extract(config, context, dry_run=False)

    def mock(self, config, context):
        return self._extract(config, context, dry_run=True)


def _naive_parse(text: str, schema: dict) -> dict:
    out: dict[str, Any] = {}
    for field_name, ftype in schema.items():
        pat = re.search(rf"{field_name}\s*[:#]?\s*([^\n]+)", text, re.IGNORECASE)
        if not pat and field_name == "amount":
            pat = re.search(r"amount\s*[:#]?\s*([\d.,]+)", text, re.IGNORECASE)
        if pat:
            val = pat.group(1).strip()
            if ftype == "number":
                m = re.search(r"[\d.,]+", val)
                out[field_name] = float(m.group().replace(",", "")) if m else None
            else:
                out[field_name] = val
    return out


def _require(config: dict, keys: list[str]) -> None:
    for k in keys:
        if not config.get(k):
            raise ConnectorError(f"missing required field '{k}'")
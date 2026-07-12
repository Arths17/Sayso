from __future__ import annotations

import base64
import binascii
import json
import re
from email.message import EmailMessage
from typing import Any
from urllib.parse import quote

import httpx

from app.connectors.base import Connector, ConnectorError, ConnectorResult
from app.connectors.ssrf_guard import assert_public_url

_GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me"
_DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files"
_SHEETS = "https://sheets.googleapis.com/v4/spreadsheets"


def _google_auth_header(credentials, provider: str, context: dict) -> dict:
    uid = context.get("_uid")
    if not uid:
        raise ConnectorError(f"no authenticated user in context for {provider} call")
    token = credentials.token(provider, uid=uid)
    if token.startswith("stub-token-"):
        raise ConnectorError(
            f"Google account not connected for this user — visit /oauth/google/start "
            f"to connect {provider}"
        )
    return {"Authorization": f"Bearer {token}"}


class GmailTrigger(Connector):
    name = "GmailTrigger"

    def run(self, config, context):
        headers = _google_auth_header(self.credentials, "gmail", context)
        with httpx.Client(timeout=30, headers=headers) as c:
            r = c.get(f"{_GMAIL}/messages", params={"q": config.get("query", ""), "maxResults": 1})
            r.raise_for_status()
            found = r.json().get("messages", [])
            if not found:
                return ConnectorResult(output={"messages": []})
            msg_id = found[0]["id"]
            m = c.get(
                f"{_GMAIL}/messages/{msg_id}",
                params={"format": "metadata", "metadataHeaders": ["From", "Subject", "Date"]},
            )
            m.raise_for_status()
            data = m.json()

        hdrs = {h["name"]: h["value"] for h in data.get("payload", {}).get("headers", [])}
        attachment_id = None
        for part in data.get("payload", {}).get("parts") or []:
            if part.get("filename"):
                attachment_id = part.get("body", {}).get("attachmentId")
                break
        return ConnectorResult(
            output={
                "message_id": msg_id,
                "from": hdrs.get("From"),
                "subject": hdrs.get("Subject"),
                "date": hdrs.get("Date"),
                "attachment_id": attachment_id,
            }
        )

    def mock(self, config, context):
        return ConnectorResult(
            output={
                "message_id": "msg_123",
                "from": "billing@acme.com",
                "subject": "Invoice #4491",
                "date": "Mon, 12 Jul 2026 12:00:00 +0000",
                "attachment_id": "att_123",
            }
        )


class GmailSend(Connector):
    name = "GmailSend"

    def run(self, config, context):
        _require(config, ["to", "body"])
        headers = _google_auth_header(self.credentials, "gmail", context)
        to = config["to"]
        subject = config.get("subject", "")
        if any(c in "\r\n" for c in to) or any(c in "\r\n" for c in subject):
            raise ConnectorError("'to' and 'subject' must not contain newlines")

        msg = EmailMessage()
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(config["body"])
        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()

        with httpx.Client(timeout=30, headers=headers) as c:
            r = c.post(f"{_GMAIL}/messages/send", json={"raw": raw})
            r.raise_for_status()
        return ConnectorResult(output={"sent": True, "to": to})

    def mock(self, config, context):
        return ConnectorResult(output={"sent": True, "to": config.get("to", "a@b.com")})


class DriveUpload(Connector):
    name = "DriveUpload"

    def run(self, config, context):
        headers = _google_auth_header(self.credentials, "drive", context)
        filename = config.get("filename", "upload.txt")
        content = config.get("content", "")
        body = content.encode() if isinstance(content, str) else content
        files = {
            "metadata": (None, json.dumps({"name": filename}), "application/json"),
            "file": (filename, body),
        }
        with httpx.Client(timeout=60, headers=headers) as c:
            r = c.post(f"{_DRIVE_UPLOAD}?uploadType=multipart", files=files)
            r.raise_for_status()
            data = r.json()
        return ConnectorResult(
            output={"file_id": data["id"], "url": f"https://drive.google.com/file/d/{data['id']}/view"}
        )

    def mock(self, config, context):
        return ConnectorResult(
            output={"file_id": "drive_mock_1", "url": "https://drive.google.com/file/mock"}
        )


class SheetsAppend(Connector):
    name = "SheetsAppend"

    def run(self, config, context):
        if not config.get("spreadsheet_id"):
            raise ConnectorError("spreadsheet_id not found")
        headers = _google_auth_header(self.credentials, "sheets", context)
        row = config.get("row", {})
        values = [list(row.values())] if isinstance(row, dict) else [row]
        spreadsheet_id = quote(config["spreadsheet_id"], safe="")
        range_ = quote(config.get("range", "A1"), safe="")
        with httpx.Client(timeout=30, headers=headers) as c:
            r = c.post(
                f"{_SHEETS}/{spreadsheet_id}/values/{range_}:append",
                params={"valueInputOption": "USER_ENTERED"},
                json={"values": values},
            )
            r.raise_for_status()
            data = r.json()
        return ConnectorResult(
            output={
                "appended": True,
                "row": row,
                "updated_range": data.get("updates", {}).get("updatedRange"),
            }
        )

    def mock(self, config, context):
        return ConnectorResult(
            output={"appended": True, "row": config.get("row", {}), "updated_range": "A2:D2"}
        )


class SheetsReadRows(Connector):
    name = "SheetsReadRows"

    def run(self, config, context):
        if not config.get("spreadsheet_id"):
            raise ConnectorError("spreadsheet_id not found")
        headers = _google_auth_header(self.credentials, "sheets", context)
        spreadsheet_id = quote(config["spreadsheet_id"], safe="")
        range_ = quote(config.get("range", "Sheet1"), safe="")
        with httpx.Client(timeout=30, headers=headers) as c:
            r = c.get(f"{_SHEETS}/{spreadsheet_id}/values/{range_}")
            r.raise_for_status()
            values = r.json().get("values", [])
        if not values:
            return ConnectorResult(output={"rows": []})
        header, *body = values
        return ConnectorResult(output={"rows": [dict(zip(header, row)) for row in body]})

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
        token = self.credentials.token("slack")
        if token.startswith("stub-token-"):
            raise ConnectorError("Slack not configured — set SLACK_TOKEN to a bot token (xoxb-...)")
        with httpx.Client(timeout=30) as c:
            r = c.post(
                "https://slack.com/api/chat.postMessage",
                headers={"Authorization": f"Bearer {token}"},
                json={"channel": channel, "text": config.get("text", "")},
            )
            r.raise_for_status()
            data = r.json()
        if not data.get("ok"):
            raise ConnectorError(f"Slack API error: {data.get('error')}")
        return ConnectorResult(output={"ok": True, "channel": channel, "ts": data.get("ts")})

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
        assert_public_url(url)
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
        source = config.get("source")
        if not source:
            raise ConnectorError("no source PDF provided")

        if isinstance(source, dict) and source.get("attachment_id") and source.get("message_id"):
            data = self._fetch_gmail_attachment(context, source["message_id"], source["attachment_id"])
        elif isinstance(source, str):
            try:
                data = base64.b64decode(source, validate=True)
            except (binascii.Error, ValueError) as e:
                raise ConnectorError(f"source is not a valid base64-encoded PDF: {e}") from e
        else:
            raise ConnectorError(
                "source must be a base64-encoded PDF string or {message_id, attachment_id}"
            )

        return ConnectorResult(output={"text": _extract_pdf_text(data)})

    def _fetch_gmail_attachment(self, context, message_id: str, attachment_id: str) -> bytes:
        headers = _google_auth_header(self.credentials, "gmail", context)
        with httpx.Client(timeout=30, headers=headers) as c:
            r = c.get(f"{_GMAIL}/messages/{message_id}/attachments/{attachment_id}")
            r.raise_for_status()
            b64data = r.json()["data"]
        padded = b64data + "=" * (-len(b64data) % 4)
        return base64.urlsafe_b64decode(padded)

    def mock(self, config, context):
        return ConnectorResult(
            output={
                "text": "INVOICE #4491\nVendor: Acme Corp\nAmount: 8400.00\n"
                "Due: 2026-08-01\nInvoice Number: 4491"
            }
        )


def _extract_pdf_text(data: bytes) -> str:
    import io

    from pypdf import PdfReader

    try:
        reader = PdfReader(io.BytesIO(data))
    except Exception as e:
        raise ConnectorError(f"could not parse PDF: {e}") from e
    return "\n".join(page.extract_text() or "" for page in reader.pages)


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
        pat = re.search(rf"{re.escape(field_name)}\s*[:#]?\s*([^\n]+)", text, re.IGNORECASE)
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
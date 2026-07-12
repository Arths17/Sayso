import asyncio

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import Node, NodeType, WorkflowSpec
from app.storage import repository
from app.engine import executor

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert "GmailSend" in r.json()["connectors"]


def test_generate_invoice_workflow():
    r = client.post("/workflows/generate", json={"prompt": "Process invoice emails, if amount > 5000 require approval, log to sheet, notify #finance"})
    body = r.json()
    assert body["status"] == "validated"
    ids = [n["id"] for n in body["spec"]["nodes"]]
    assert "check_amount" in ids
    assert any(n["type"] == "conditional" for n in body["spec"]["nodes"])


def test_clarify_flow():
    r = client.post("/workflows/generate", json={"prompt": "Send an email when something happens"})
    body = r.json()
    assert body["status"] == "needs_clarification"
    wid = body["workflow_id"]
    q = body["clarification"]["questions"][0]
    r2 = client.post(f"/workflows/{wid}/clarify", json={"answers": {q: "send to alerts@company.com"}})
    assert r2.json()["status"] == "validated"


def test_clarify_accumulates_answers_across_rounds():
    r = client.post("/workflows/generate", json={"prompt": "Send an email when something happens"})
    wid = r.json()["workflow_id"]
    client.post(f"/workflows/{wid}/clarify", json={"answers": {"unrelated question": "unrelated answer"}})
    r2 = client.post(f"/workflows/{wid}/clarify", json={"answers": {"which recipient": "send to ops@company.com"}})
    assert r2.json()["status"] == "validated"
    record = repository.get_workflow(wid)
    assert record.clarification_answers == {
        "unrelated question": "unrelated answer",
        "which recipient": "send to ops@company.com",
    }


def test_dry_run_and_status():
    r = client.post("/workflows/generate", json={"prompt": "Process invoices, email finance@company.com"})
    wid = r.json()["workflow_id"]
    run = client.post(f"/workflows/{wid}/dry-run").json()
    assert run["state"] == "completed"
    status = client.get(f"/workflows/{wid}/status", params={"execution_id": run["execution_id"]}).json()
    assert status["state"] == "completed"
    assert all(l["status"] in ("succeeded", "skipped") for l in status["logs"])


def test_explain_node():
    r = client.post("/workflows/generate", json={"prompt": "Process invoices, email finance@company.com"})
    wid = r.json()["workflow_id"]
    r2 = client.get(f"/workflows/{wid}/nodes/check_amount/explain")
    assert r2.status_code == 200
    assert len(r2.json()["explanation"]) > 0


def test_edit_creates_version_with_diff():
    r = client.post("/workflows/generate", json={"prompt": "Process invoices, email finance@company.com"})
    wid = r.json()["workflow_id"]
    before = client.get(f"/workflows/{wid}/versions").json()
    r2 = client.post(f"/workflows/{wid}/edit", json={"instruction": "only run if amount > 500"})
    assert "diff" in r2.json()
    after = client.get(f"/workflows/{wid}/versions").json()
    assert len(after) == len(before) + 1


def test_revert():
    r = client.post("/workflows/generate", json={"prompt": "Process invoices, email finance@company.com"})
    wid = r.json()["workflow_id"]
    v0 = client.get(f"/workflows/{wid}/versions").json()[0]["id"]
    client.post(f"/workflows/{wid}/edit", json={"instruction": "add a step"})
    rev = client.post(f"/workflows/{wid}/revert/{v0}").json()
    assert rev["reverted_to"] == v0
    assert rev["new_version"] != v0


def test_self_heal_end_to_end(fake_gmail_send):
    spec = WorkflowSpec(name="broken", nodes=[
        Node(id="notify", type=NodeType.connector, connector="GmailSend", config={}),
    ])
    rec = repository.create_workflow("broken", spec, owner_uid="dev-user")

    async def go():
        ex = repository.new_execution(rec.id, rec.current_version_id, dry_run=False)
        ex.context["_uid"] = "dev-user"
        ex = await executor.run_execution(rec.spec, ex)
        assert ex.state == "awaiting_heal_approval"
        assert ex.pending_heal is not None
        ex = await executor.apply_heal_and_resume(rec.spec, ex)
        assert ex.state == "completed"

    asyncio.run(go())


def test_heal_patch_rejected_by_validator():
    from app.schemas import HealPatch

    spec = WorkflowSpec(name="broken2", nodes=[
        Node(id="notify", type=NodeType.connector, connector="GmailSend", config={}),
    ])
    rec = repository.create_workflow("broken2", spec)

    async def go():
        ex = repository.new_execution(rec.id, rec.current_version_id, dry_run=False)
        ex = await executor.run_execution(rec.spec, ex)
        assert ex.state == "awaiting_heal_approval"
        ex.pending_heal = HealPatch(
            node_id="notify", error="boom",
            patch={"connector": "NopeConnector"},
            diff_explanation="switch connector",
        )
        ex = await executor.apply_heal_and_resume(rec.spec, ex)
        assert ex.state == "failed"
        assert ex.pending_heal is None

    asyncio.run(go())


def test_workflow_access_denied_to_non_owner():
    from app.auth import AuthedUser, get_current_user
    from app.main import app

    r = client.post("/workflows/generate", json={"prompt": "notify #finance"})
    wid = r.json()["workflow_id"]

    app.dependency_overrides[get_current_user] = lambda: AuthedUser(uid="someone-else")
    try:
        r2 = client.get(f"/workflows/{wid}")
        assert r2.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    # the actual owner (dev-user) can still access it
    r3 = client.get(f"/workflows/{wid}")
    assert r3.status_code == 200


def test_workflow_owner_uid_set_on_creation():
    r = client.post("/workflows/generate", json={"prompt": "notify #finance"})
    wid = r.json()["workflow_id"]
    record = repository.get_workflow(wid)
    assert record.owner_uid == "dev-user"


def test_workflows_accessible_without_token_when_auth_disabled():
    r = client.post("/workflows/generate", json={"prompt": "notify #finance"})
    assert r.status_code == 200


def test_auth_rejects_missing_token_when_enabled(monkeypatch):
    from app import auth

    class FakeSettings:
        auth_enabled = True

    monkeypatch.setattr(auth, "settings", FakeSettings())
    r = client.post("/workflows/generate", json={"prompt": "notify #finance"})
    assert r.status_code == 401


def test_auth_rejects_invalid_token_when_enabled(monkeypatch):
    from firebase_admin import auth as firebase_auth

    from app import auth

    class FakeSettings:
        auth_enabled = True

    monkeypatch.setattr(auth, "settings", FakeSettings())
    monkeypatch.setattr(auth.firebase_admin_app, "get_app", lambda: object())

    def fake_verify(token, app=None):
        raise ValueError("invalid token")

    monkeypatch.setattr(firebase_auth, "verify_id_token", fake_verify)

    r = client.post(
        "/workflows/generate",
        json={"prompt": "notify #finance"},
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert r.status_code == 401


def test_local_model_unavailable_without_torch(monkeypatch):
    from app.llm import local_model
    monkeypatch.setattr(local_model.settings, "local_fallback_enabled", False)
    with pytest.raises(local_model.LocalModelUnavailable):
        local_model.generate_json(system="s", user="u")


def test_openrouter_failure_falls_back_to_local_model(monkeypatch):
    from app.llm import client, local_model
    from pydantic import BaseModel

    class Dummy(BaseModel):
        ok: bool

    monkeypatch.setattr(client.settings, "openrouter_api_key", "fake-key")

    def boom(system, user):
        raise __import__("httpx").ConnectError("network down")

    monkeypatch.setattr(client, "_call_openrouter", boom)
    monkeypatch.setattr(local_model, "generate_json", lambda system, user: '{"ok": true}')

    result = client.complete_json(task="t", system="s", user="u", schema=Dummy)
    assert result.ok is True


def test_openrouter_failure_raises_when_local_model_also_unavailable(monkeypatch):
    from app.llm import client, local_model
    from pydantic import BaseModel

    class Dummy(BaseModel):
        ok: bool

    monkeypatch.setattr(client.settings, "openrouter_api_key", "fake-key")

    def boom(system, user):
        raise __import__("httpx").ConnectError("network down")

    monkeypatch.setattr(client, "_call_openrouter", boom)
    monkeypatch.setattr(local_model, "generate_json", lambda s, u: (_ for _ in ()).throw(local_model.LocalModelUnavailable("disabled")))

    with pytest.raises(client.LLMError):
        client.complete_json(task="t", system="s", user="u", schema=Dummy)


def test_google_oauth_start_requires_configured_client():
    r = client.get("/oauth/google/start")
    assert r.status_code == 400


def test_google_oauth_start_returns_auth_url(monkeypatch):
    from app import google_oauth

    monkeypatch.setattr(google_oauth.settings, "google_oauth_client_id", "fake-id")
    monkeypatch.setattr(google_oauth.settings, "google_oauth_client_secret", "fake-secret")

    r = client.get("/oauth/google/start")
    assert r.status_code == 200
    assert "accounts.google.com" in r.json()["auth_url"]


def test_google_oauth_callback_stores_tokens(monkeypatch):
    from app import google_oauth

    monkeypatch.setattr(
        google_oauth, "exchange_code",
        lambda code: {"access_token": "tok", "refresh_token": "refresh", "expires_in": 3600},
    )
    state = google_oauth.sign_state("dev-user")
    r = client.get("/oauth/google/callback", params={"code": "abc", "state": state}, follow_redirects=False)
    assert r.status_code == 307
    assert "google_connected=1" in r.headers["location"]
    assert google_oauth.is_connected("dev-user")


def test_google_oauth_state_roundtrip():
    from app import google_oauth

    state = google_oauth.sign_state("some-uid")
    assert google_oauth.verify_state(state) == "some-uid"


def test_google_oauth_state_rejects_tampering():
    from app import google_oauth

    state = google_oauth.sign_state("some-uid")
    payload_b64, sig = state.split(".", 1)
    forged = google_oauth.base64.urlsafe_b64encode(b"someone-else:9999999999").decode().rstrip("=")
    tampered = f"{forged}.{sig}"
    with pytest.raises(google_oauth.GoogleOAuthError):
        google_oauth.verify_state(tampered)


def test_google_oauth_state_rejects_expired(monkeypatch):
    import time as time_module

    from app import google_oauth

    state = google_oauth.sign_state("some-uid")
    real_time = time_module.time()
    monkeypatch.setattr(
        google_oauth.time, "time",
        lambda: real_time + google_oauth._STATE_TTL_SECONDS + 60,
    )
    with pytest.raises(google_oauth.GoogleOAuthError):
        google_oauth.verify_state(state)


def test_google_oauth_callback_rejects_invalid_state():
    r = client.get(
        "/oauth/google/callback",
        params={"code": "abc", "state": "not-valid-base64!!"},
        follow_redirects=False,
    )
    assert r.status_code in (302, 307)
    assert "google_error=" in r.headers["location"]


def test_ssrf_guard_blocks_private_ip(monkeypatch):
    import socket

    from app.connectors.base import ConnectorError
    from app.connectors.ssrf_guard import assert_public_url

    monkeypatch.setattr(
        socket, "getaddrinfo",
        lambda *a, **k: [(socket.AF_INET, None, None, "", ("127.0.0.1", 0))],
    )
    with pytest.raises(ConnectorError):
        assert_public_url("http://example.com/")


def test_ssrf_guard_blocks_metadata_ip(monkeypatch):
    import socket

    from app.connectors.base import ConnectorError
    from app.connectors.ssrf_guard import assert_public_url

    monkeypatch.setattr(
        socket, "getaddrinfo",
        lambda *a, **k: [(socket.AF_INET, None, None, "", ("169.254.169.254", 0))],
    )
    with pytest.raises(ConnectorError):
        assert_public_url("http://sneaky.example.com/")


def test_ssrf_guard_allows_public_ip(monkeypatch):
    import socket

    from app.connectors.ssrf_guard import assert_public_url

    monkeypatch.setattr(
        socket, "getaddrinfo",
        lambda *a, **k: [(socket.AF_INET, None, None, "", ("93.184.216.34", 0))],
    )
    assert_public_url("http://example.com/")  # should not raise


def test_ssrf_guard_blocks_non_http_scheme():
    from app.connectors.base import ConnectorError
    from app.connectors.ssrf_guard import assert_public_url

    with pytest.raises(ConnectorError):
        assert_public_url("file:///etc/passwd")


def test_http_request_real_run_blocked_for_private_url(monkeypatch):
    import socket

    from app.connectors.base import ConnectorError
    from app.connectors.library import HTTPRequest

    monkeypatch.setattr(
        socket, "getaddrinfo",
        lambda *a, **k: [(socket.AF_INET, None, None, "", ("127.0.0.1", 0))],
    )
    with pytest.raises(ConnectorError):
        HTTPRequest().run({"url": "http://localhost/admin"}, {})


def _make_blank_pdf_base64() -> str:
    import base64
    import io

    from pypdf import PdfWriter

    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    buf = io.BytesIO()
    writer.write(buf)
    return base64.b64encode(buf.getvalue()).decode()


def test_pdf_extract_text_from_inline_base64():
    from app.connectors.library import PDFExtractText

    result = PDFExtractText().run({"source": _make_blank_pdf_base64()}, {})
    assert result.output["text"] == ""


def test_pdf_extract_text_invalid_base64_raises():
    from app.connectors.base import ConnectorError
    from app.connectors.library import PDFExtractText

    with pytest.raises(ConnectorError):
        PDFExtractText().run({"source": "not-valid-base64!!!"}, {})


def test_pdf_extract_text_missing_source_raises():
    from app.connectors.base import ConnectorError
    from app.connectors.library import PDFExtractText

    with pytest.raises(ConnectorError):
        PDFExtractText().run({}, {})


def test_pdf_extract_text_fetches_gmail_attachment(monkeypatch):
    import base64

    import httpx as httpx_module

    from app.connectors.library import PDFExtractText

    pdf_b64 = _make_blank_pdf_base64()
    urlsafe_no_pad = base64.urlsafe_b64encode(base64.b64decode(pdf_b64)).decode().rstrip("=")

    class FakeResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {"data": urlsafe_no_pad}

    class FakeClient:
        def __init__(self, *a, **k):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *a):
            pass

        def get(self, *a, **k):
            return FakeResponse()

    monkeypatch.setenv("GMAIL_TOKEN", "fake-gmail-token")
    monkeypatch.setattr(httpx_module, "Client", FakeClient)

    result = PDFExtractText().run(
        {"source": {"message_id": "msg1", "attachment_id": "att1"}},
        {"_uid": "dev-user"},
    )
    assert result.output["text"] == ""


def test_naive_parse_handles_regex_metacharacters_in_field_name():
    from app.connectors.library import _naive_parse

    # a field name containing regex metacharacters must not raise re.error
    result = _naive_parse("due(date): 2026-08-01", {"due(date)": "string"})
    assert result["due(date)"] == "2026-08-01"


def test_credential_store_falls_back_to_stub_without_uid():
    from app.connectors.base import CredentialStore
    token = CredentialStore().token("gmail")
    assert token == "stub-token-gmail"


def test_google_connector_rejects_run_without_authenticated_uid():
    from app.connectors.library import GmailSend
    with pytest.raises(Exception):
        GmailSend().run({"to": "a@b.com", "body": "hi"}, {})


def test_gmail_send_rejects_header_injection(monkeypatch):
    from app.connectors.base import ConnectorError
    from app.connectors.library import GmailSend

    monkeypatch.setenv("GMAIL_TOKEN", "fake-gmail-token")
    context = {"_uid": "dev-user"}

    with pytest.raises(ConnectorError):
        GmailSend().run(
            {"to": "a@b.com", "subject": "hi\r\nBcc: attacker@evil.com", "body": "hi"},
            context,
        )
    with pytest.raises(ConnectorError):
        GmailSend().run(
            {"to": "a@b.com\r\nBcc: attacker@evil.com", "body": "hi"},
            context,
        )


def test_sheets_append_escapes_url_path_segments(monkeypatch):
    import httpx as httpx_module

    from app.connectors.library import SheetsAppend

    captured = {}

    class FakeResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {"updates": {"updatedRange": "A2"}}

    class FakeClient:
        def __init__(self, *a, **k):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *a):
            pass

        def post(self, url, **k):
            captured["url"] = url
            return FakeResponse()

    monkeypatch.setenv("SHEETS_TOKEN", "fake-sheets-token")
    monkeypatch.setattr(httpx_module, "Client", FakeClient)

    SheetsAppend().run(
        {"spreadsheet_id": "abc&evil=1", "range": "Sheet 1!A1", "row": {"a": 1}},
        {"_uid": "dev-user"},
    )
    assert "&evil=1" not in captured["url"]
    assert "abc%26evil%3D1" in captured["url"]
    assert "Sheet%201%21A1" in captured["url"]


def test_validator_rejects_unknown_connector():
    from app.agents import validator
    spec = WorkflowSpec(name="x", nodes=[
        Node(id="a", type=NodeType.connector, connector="NopeConnector"),
    ])
    result = validator.validate(spec)
    assert not result.passed
    assert any("unknown connector" in e.reason for e in result.errors)


def test_retry_succeeds_after_transient_failure():
    from app.connectors import registry
    from app.connectors.base import Connector, ConnectorResult
    from app.schemas import RetryPolicy

    class FlakyConnector(Connector):
        name = "FlakyConnector"
        attempts_made = 0

        def run(self, config, context):
            FlakyConnector.attempts_made += 1
            if FlakyConnector.attempts_made < 2:
                return ConnectorResult(status="failed", error="transient blip")
            return ConnectorResult(output={"ok": True})

        def mock(self, config, context):
            return ConnectorResult(output={"ok": True})

    registry._CONNECTOR_CLASSES["FlakyConnector"] = FlakyConnector
    try:
        spec = WorkflowSpec(name="flaky", nodes=[
            Node(id="flaky", type=NodeType.connector, connector="FlakyConnector",
                 config={}, retry_policy=RetryPolicy(max_attempts=3, backoff_seconds=0.01)),
        ])
        rec = repository.create_workflow("flaky", spec)

        async def go():
            ex = repository.new_execution(rec.id, rec.current_version_id, dry_run=False)
            return await executor.run_execution(rec.spec, ex)

        ex = asyncio.run(go())
        assert ex.state == "completed"
        assert FlakyConnector.attempts_made == 2
        log = next(l for l in ex.logs if l.node_id == "flaky")
        assert log.status == "succeeded"
        assert log.attempt == 2
    finally:
        del registry._CONNECTOR_CLASSES["FlakyConnector"]


def test_force_mock_connectors_overrides_real_run():
    from app.config import settings

    spec = WorkflowSpec(name="forced-mock", nodes=[
        Node(id="notify", type=NodeType.connector, connector="GmailSend", config={}),
    ])
    rec = repository.create_workflow("forced-mock", spec)
    settings.force_mock_connectors = True
    try:
        async def go():
            ex = repository.new_execution(rec.id, rec.current_version_id, dry_run=False)
            return await executor.run_execution(rec.spec, ex)

        ex = asyncio.run(go())
        # without the override this config (missing "to"/"body") would fail
        # and trigger self-healing; the override makes even a real run use mock()
        assert ex.state == "completed"
    finally:
        settings.force_mock_connectors = False


def test_for_each_loop_body_supports_conditional():
    spec = WorkflowSpec(name="loop-cond", variables={"rows": [{"amount": 10}, {"amount": 999}]}, nodes=[
        Node(id="loop", type=NodeType.for_each, iterate_over="{{ rows }}",
             loop_body=["check", "notify_big"]),
        Node(id="check", type=NodeType.conditional, condition="{{ item.amount }} > 100",
             true_branch=["notify_big"], false_branch=[]),
        Node(id="notify_big", type=NodeType.connector, connector="GmailSend",
             config={"to": "alerts@company.com", "body": "big row"}),
    ])
    rec = repository.create_workflow("loop-cond", spec)

    async def go():
        ex = repository.new_execution(rec.id, rec.current_version_id, dry_run=True)
        return await executor.run_execution(rec.spec, ex)

    ex = asyncio.run(go())
    assert ex.state == "completed"
    loop_log = next(l for l in ex.logs if l.node_id == "loop")
    iterations = loop_log.output["iterations"]
    # first item (amount=10) takes false branch -> notify_big skipped
    assert iterations[0]["check"]["taken"] is False
    assert iterations[1]["notify_big"] == {"skipped": "untaken branch"}
    # second item (amount=999) takes true branch -> notify_big actually runs
    assert iterations[2]["check"]["taken"] is True
    assert iterations[3]["notify_big"] != {"skipped": "untaken branch"}


def test_human_approval_pauses_and_resumes(fake_gmail_send):
    spec = WorkflowSpec(name="approval-gate", nodes=[
        Node(id="gate", type=NodeType.human_approval, config={"auto_approve": False}),
        Node(id="notify", type=NodeType.connector, connector="GmailSend",
             config={"to": "finance@company.com", "body": "approved"}, depends_on=["gate"]),
    ])
    rec = repository.create_workflow("approval-gate", spec, owner_uid="dev-user")

    async def go():
        ex = repository.new_execution(rec.id, rec.current_version_id, dry_run=False)
        ex.context["_uid"] = "dev-user"
        return await executor.run_execution(rec.spec, ex)

    ex = asyncio.run(go())
    assert ex.state == "awaiting_approval"
    assert ex.pending_approval_node_id == "gate"

    r = client.post(f"/workflows/{rec.id}/executions/{ex.id}/approve", json={"approve": True})
    body = r.json()
    assert body["state"] == "completed"

    resumed = repository.get_execution(rec.id, ex.id)
    gate_log = next(l for l in resumed.logs if l.node_id == "gate" and l.status == "succeeded")
    assert gate_log.output == {"approved": True, "auto": False}


def test_human_approval_rejection_fails_execution():
    spec = WorkflowSpec(name="approval-gate-reject", nodes=[
        Node(id="gate", type=NodeType.human_approval, config={"auto_approve": False}),
    ])
    rec = repository.create_workflow("approval-gate-reject", spec, owner_uid="dev-user")

    async def go():
        ex = repository.new_execution(rec.id, rec.current_version_id, dry_run=False)
        return await executor.run_execution(rec.spec, ex)

    ex = asyncio.run(go())
    r = client.post(f"/workflows/{rec.id}/executions/{ex.id}/approve", json={"approve": False})
    assert r.json()["state"] == "failed"


def test_for_each_loop_runs():
    r = client.post("/workflows/generate", json={"prompt": "For each row in the sheet, notify #team"})
    wid = r.json()["workflow_id"]
    body = client.get(f"/workflows/{wid}").json()
    assert any(n["type"] == "for_each" for n in body["spec"]["nodes"])
    run = client.post(f"/workflows/{wid}/dry-run").json()
    assert run["state"] == "completed"
"""End-to-end coverage of the demo arc: build -> refine -> explain -> break ->
self-heal -> version history. Runs fully offline (stub LLM + in-memory store)."""
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
    assert "SlackNotify" in r.json()["connectors"]


def test_generate_invoice_workflow():
    r = client.post("/workflows/generate", json={"prompt": "Process invoice emails, if amount > 5000 require approval, log to sheet, notify #finance"})
    body = r.json()
    assert body["status"] == "validated"
    ids = [n["id"] for n in body["spec"]["nodes"]]
    assert "check_amount" in ids  # conditional present
    assert any(n["type"] == "conditional" for n in body["spec"]["nodes"])


def test_clarify_flow():
    # a Slack-only prompt with no channel triggers a critic question
    r = client.post("/workflows/generate", json={"prompt": "Send a slack message when something happens"})
    body = r.json()
    assert body["status"] == "needs_clarification"
    wid = body["workflow_id"]
    q = body["clarification"]["questions"][0]
    r2 = client.post(f"/workflows/{wid}/clarify", json={"answers": {q: "post to #alerts"}})
    assert r2.json()["status"] == "validated"


def test_dry_run_and_status():
    r = client.post("/workflows/generate", json={"prompt": "Process invoices, notify #finance"})
    wid = r.json()["workflow_id"]
    run = client.post(f"/workflows/{wid}/dry-run").json()
    assert run["state"] == "completed"
    status = client.get(f"/workflows/{wid}/status", params={"execution_id": run["execution_id"]}).json()
    assert status["state"] == "completed"
    assert all(l["status"] in ("succeeded", "skipped") for l in status["logs"])


def test_explain_node():
    r = client.post("/workflows/generate", json={"prompt": "Process invoices, notify #finance"})
    wid = r.json()["workflow_id"]
    r2 = client.get(f"/workflows/{wid}/nodes/check_amount/explain")
    assert r2.status_code == 200
    assert len(r2.json()["explanation"]) > 0


def test_edit_creates_version_with_diff():
    r = client.post("/workflows/generate", json={"prompt": "Process invoices, notify #finance"})
    wid = r.json()["workflow_id"]
    before = client.get(f"/workflows/{wid}/versions").json()
    r2 = client.post(f"/workflows/{wid}/edit", json={"instruction": "only run if amount > 500"})
    assert "diff" in r2.json()
    after = client.get(f"/workflows/{wid}/versions").json()
    assert len(after) == len(before) + 1


def test_revert():
    r = client.post("/workflows/generate", json={"prompt": "Process invoices, notify #finance"})
    wid = r.json()["workflow_id"]
    v0 = client.get(f"/workflows/{wid}/versions").json()[0]["id"]
    client.post(f"/workflows/{wid}/edit", json={"instruction": "add a step"})
    rev = client.post(f"/workflows/{wid}/revert/{v0}").json()
    assert rev["reverted_to"] == v0
    # revert is append-only: a new version is created
    assert rev["new_version"] != v0


def test_self_heal_end_to_end():
    spec = WorkflowSpec(name="broken", nodes=[
        Node(id="notify", type=NodeType.connector, connector="SlackNotify", config={}),
    ])
    rec = repository.create_workflow("broken", spec)

    async def go():
        ex = repository.new_execution(rec.id, rec.current_version_id, dry_run=False)
        ex = await executor.run_execution(rec.spec, ex)
        assert ex.state == "awaiting_heal_approval"
        assert ex.pending_heal is not None
        ex = await executor.apply_heal_and_resume(rec.spec, ex)
        assert ex.state == "completed"

    asyncio.run(go())


def test_heal_patch_rejected_by_validator():
    from app.schemas import HealPatch

    spec = WorkflowSpec(name="broken2", nodes=[
        Node(id="notify", type=NodeType.connector, connector="SlackNotify", config={}),
    ])
    rec = repository.create_workflow("broken2", spec)

    async def go():
        ex = repository.new_execution(rec.id, rec.current_version_id, dry_run=False)
        ex = await executor.run_execution(rec.spec, ex)
        assert ex.state == "awaiting_heal_approval"
        # simulate a bad patch (e.g. healer hallucinated a connector name)
        ex.pending_heal = HealPatch(
            node_id="notify", error="boom",
            patch={"connector": "NopeConnector"},
            diff_explanation="switch connector",
        )
        ex = await executor.apply_heal_and_resume(rec.spec, ex)
        assert ex.state == "failed"
        assert ex.pending_heal is None

    asyncio.run(go())


def test_workflows_accessible_without_token_when_auth_disabled():
    # SAYSO_AUTH_DISABLED=true is set in conftest.py -> no credentials configured
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


def test_local_model_unavailable_without_torch():
    from app.llm import local_model
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
    from app.llm import client
    from pydantic import BaseModel

    class Dummy(BaseModel):
        ok: bool

    monkeypatch.setattr(client.settings, "openrouter_api_key", "fake-key")

    def boom(system, user):
        raise __import__("httpx").ConnectError("network down")

    monkeypatch.setattr(client, "_call_openrouter", boom)

    with pytest.raises(client.LLMError):
        client.complete_json(task="t", system="s", user="u", schema=Dummy)


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
        Node(id="notify", type=NodeType.connector, connector="SlackNotify", config={}),
    ])
    rec = repository.create_workflow("forced-mock", spec)
    settings.force_mock_connectors = True
    try:
        async def go():
            ex = repository.new_execution(rec.id, rec.current_version_id, dry_run=False)
            return await executor.run_execution(rec.spec, ex)

        ex = asyncio.run(go())
        # without the override this config (missing "channel") would fail and
        # trigger self-healing; the override makes even a real run use mock()
        assert ex.state == "completed"
    finally:
        settings.force_mock_connectors = False


def test_for_each_loop_body_supports_conditional():
    spec = WorkflowSpec(name="loop-cond", variables={"rows": [{"amount": 10}, {"amount": 999}]}, nodes=[
        Node(id="loop", type=NodeType.for_each, iterate_over="{{ rows }}",
             loop_body=["check", "notify_big"]),
        Node(id="check", type=NodeType.conditional, condition="{{ item.amount }} > 100",
             true_branch=["notify_big"], false_branch=[]),
        Node(id="notify_big", type=NodeType.connector, connector="SlackNotify",
             config={"channel": "#alerts", "text": "big row"}),
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


def test_human_approval_pauses_and_resumes():
    spec = WorkflowSpec(name="approval-gate", nodes=[
        Node(id="gate", type=NodeType.human_approval, config={"auto_approve": False}),
        Node(id="notify", type=NodeType.connector, connector="SlackNotify",
             config={"channel": "#finance"}, depends_on=["gate"]),
    ])
    rec = repository.create_workflow("approval-gate", spec)

    async def go():
        ex = repository.new_execution(rec.id, rec.current_version_id, dry_run=False)
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
    rec = repository.create_workflow("approval-gate-reject", spec)

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

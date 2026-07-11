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
    assert "check_amount" in ids
    assert any(n["type"] == "conditional" for n in body["spec"]["nodes"])


def test_clarify_flow():
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


def test_validator_rejects_unknown_connector():
    from app.agents import validator
    spec = WorkflowSpec(name="x", nodes=[
        Node(id="a", type=NodeType.connector, connector="NopeConnector"),
    ])
    result = validator.validate(spec)
    assert not result.passed
    assert any("unknown connector" in e.reason for e in result.errors)


def test_for_each_loop_runs():
    r = client.post("/workflows/generate", json={"prompt": "For each row in the sheet, notify #team"})
    wid = r.json()["workflow_id"]
    body = client.get(f"/workflows/{wid}").json()
    assert any(n["type"] == "for_each" for n in body["spec"]["nodes"])
    run = client.post(f"/workflows/{wid}/dry-run").json()
    assert run["state"] == "completed"
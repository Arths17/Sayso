from __future__ import annotations

from app.schemas import Execution, WorkflowRecord, WorkflowSpec
from app.storage import versions
from app.storage.firestore_client import get_store
from app.utils import new_id, now_iso


def create_workflow(prompt: str, spec: WorkflowSpec, owner_uid: str = "") -> WorkflowRecord:
    store = get_store()
    wid = new_id("wf_")
    record = WorkflowRecord(
        id=wid,
        prompt=prompt,
        spec=spec,
        created_at=now_iso(),
        updated_at=now_iso(),
        owner_uid=owner_uid,
    )
    store.set_workflow(wid, record.model_dump())
    v = versions.create_version(wid, spec, message="initial")
    record.current_version_id = v.id
    return get_workflow(wid)


def get_workflow(workflow_id: str) -> WorkflowRecord | None:
    data = get_store().get_workflow(workflow_id)
    return WorkflowRecord.model_validate(data) if data else None


def list_workflows(owner_uid: str) -> list[WorkflowRecord]:
    records = [WorkflowRecord.model_validate(d) for d in get_store().list_workflows()]
    return [r for r in records if r.owner_uid == owner_uid]


def update_spec(workflow_id: str, spec: WorkflowSpec, message: str) -> WorkflowRecord:
    versions.create_version(workflow_id, spec, message=message)
    return get_workflow(workflow_id)


def save_clarification_answers(workflow_id: str, answers: dict[str, str]) -> None:
    store = get_store()
    data = store.get_workflow(workflow_id)
    if data is None:
        return
    data["clarification_answers"] = answers
    store.set_workflow(workflow_id, data)


def set_active(workflow_id: str, active: bool) -> None:
    store = get_store()
    data = store.get_workflow(workflow_id)
    if data is None:
        return
    data["active"] = active
    store.set_workflow(workflow_id, data)


def save_execution(execution: Execution) -> None:
    execution.updated_at = now_iso()
    get_store().set_execution(
        execution.workflow_id, execution.id, execution.model_dump()
    )


def get_execution(workflow_id: str, execution_id: str) -> Execution | None:
    data = get_store().get_execution(workflow_id, execution_id)
    return Execution.model_validate(data) if data else None


def list_executions(workflow_id: str) -> list[Execution]:
    execs = [Execution.model_validate(d) for d in get_store().list_executions(workflow_id)]
    return sorted(execs, key=lambda e: e.created_at or "", reverse=True)


def new_execution(workflow_id: str, version_id: str | None, dry_run: bool) -> Execution:
    ex = Execution(
        id=new_id("ex_"),
        workflow_id=workflow_id,
        version_id=version_id,
        dry_run=dry_run,
        created_at=now_iso(),
        updated_at=now_iso(),
    )
    save_execution(ex)
    return ex


def log_decision(workflow_id: str, agent: str, decision: dict) -> None:
    get_store().log_decision(
        workflow_id,
        {"agent": agent, "at": now_iso(), **decision},
    )


def list_decisions(workflow_id: str) -> list[dict]:
    return get_store().list_decisions(workflow_id)


def set_google_tokens(uid: str, data: dict) -> None:
    get_store().set_google_tokens(uid, data)


def get_google_tokens(uid: str) -> dict | None:
    return get_store().get_google_tokens(uid)
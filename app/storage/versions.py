from __future__ import annotations

from typing import Any

from app.schemas import WorkflowSpec, WorkflowVersion
from app.storage.firestore_client import get_store
from app.utils import new_id, now_iso


def compute_diff(old: dict[str, Any] | None, new: dict[str, Any]) -> dict[str, Any]:
    if old is None:
        return {"added": new, "removed": {}, "changed": {}}
    added, removed, changed = {}, {}, {}
    for k in new.keys() | old.keys():
        ov, nv = old.get(k), new.get(k)
        if k not in old:
            added[k] = nv
        elif k not in new:
            removed[k] = ov
        elif ov != nv:
            changed[k] = {"from": ov, "to": nv}
    return {"added": added, "removed": removed, "changed": changed}


def create_version(
    workflow_id: str, spec: WorkflowSpec, message: str
) -> WorkflowVersion:
    store = get_store()
    prev = store.list_versions(workflow_id)
    prev_spec = prev[-1]["spec"] if prev else None
    diff = compute_diff(prev_spec, spec.model_dump())

    version = WorkflowVersion(
        id=new_id("ver_"),
        workflow_id=workflow_id,
        spec=spec,
        diff=diff,
        message=message,
        created_at=now_iso(),
    )
    store.add_version(workflow_id, version.id, version.model_dump())

    wf = store.get_workflow(workflow_id)
    if wf:
        wf["spec"] = spec.model_dump()
        wf["current_version_id"] = version.id
        wf["updated_at"] = now_iso()
        store.set_workflow(workflow_id, wf)
    return version


def list_versions(workflow_id: str) -> list[WorkflowVersion]:
    return [
        WorkflowVersion.model_validate(v)
        for v in get_store().list_versions(workflow_id)
    ]


def revert(workflow_id: str, version_id: str) -> WorkflowVersion:
    store = get_store()
    target = store.get_version(workflow_id, version_id)
    if not target:
        raise KeyError(f"version {version_id} not found")
    spec = WorkflowSpec.model_validate(target["spec"])
    return create_version(workflow_id, spec, message=f"revert to {version_id}")
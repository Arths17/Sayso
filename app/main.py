from __future__ import annotations

import asyncio

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect

from app import service
from app.agents import explainer
from app.connectors import registry
from app.engine import executor
from app.schemas import (
    ApprovalRequest,
    ClarifyRequest,
    EditRequest,
    GenerateRequest,
    GenerateResponse,
    HealApprovalRequest,
    RunResponse,
    WorkflowSpec,
)
from app.storage import repository, versions

app = FastAPI(title="Sayso", version="0.1.0")


@app.get("/health")
def health():
    return {"status": "ok", "service": "sayso", "connectors": registry.available()}


@app.post("/workflows/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest):
    return service.generate(req.prompt)


@app.post("/workflows/{workflow_id}/clarify", response_model=GenerateResponse)
def clarify(workflow_id: str, req: ClarifyRequest):
    try:
        return service.clarify(workflow_id, req.answers)
    except KeyError:
        raise HTTPException(404, "workflow not found")


@app.post("/workflows/{workflow_id}/edit")
def edit(workflow_id: str, req: EditRequest):
    try:
        record, version = service.edit(workflow_id, req.instruction)
    except KeyError:
        raise HTTPException(404, "workflow not found")
    return {"workflow_id": workflow_id, "version": version.id, "diff": version.diff, "spec": record.spec}


@app.get("/workflows/{workflow_id}")
def get_workflow(workflow_id: str):
    record = repository.get_workflow(workflow_id)
    if not record:
        raise HTTPException(404, "workflow not found")
    return record


async def _start_run(workflow_id: str, dry_run: bool) -> RunResponse:
    record = repository.get_workflow(workflow_id)
    if not record:
        raise HTTPException(404, "workflow not found")
    execution = repository.new_execution(workflow_id, record.current_version_id, dry_run)
    execution = await executor.run_execution(record.spec, execution)
    return RunResponse(execution_id=execution.id, state=execution.state)


@app.post("/workflows/{workflow_id}/dry-run", response_model=RunResponse)
async def dry_run(workflow_id: str):
    return await _start_run(workflow_id, dry_run=True)


@app.post("/workflows/{workflow_id}/run", response_model=RunResponse)
async def run(workflow_id: str):
    return await _start_run(workflow_id, dry_run=False)


@app.get("/workflows/{workflow_id}/status")
def status(workflow_id: str, execution_id: str | None = None):
    execs = repository.get_store().list_executions(workflow_id)
    if not execs:
        raise HTTPException(404, "no executions")
    if execution_id:
        ex = repository.get_execution(workflow_id, execution_id)
        if not ex:
            raise HTTPException(404, "execution not found")
        return ex
    latest = sorted(execs, key=lambda e: e.get("created_at", ""))[-1]
    return latest


@app.post("/workflows/{workflow_id}/executions/{execution_id}/heal")
async def heal_approval(workflow_id: str, execution_id: str, req: HealApprovalRequest):
    record = repository.get_workflow(workflow_id)
    execution = repository.get_execution(workflow_id, execution_id)
    if not record or not execution:
        raise HTTPException(404, "not found")
    if not execution.pending_heal:
        raise HTTPException(400, "no pending heal patch")
    if not req.approve:
        from app.schemas import ExecutionState
        execution.state = ExecutionState.failed
        repository.save_execution(execution)
        return {"applied": False, "state": execution.state}
    execution = await executor.apply_heal_and_resume(record.spec, execution)
    versions.create_version(workflow_id, record.spec, message="self-heal patch applied")
    return {"applied": True, "state": execution.state, "execution_id": execution.id}


@app.post("/workflows/{workflow_id}/executions/{execution_id}/approve")
async def approve(workflow_id: str, execution_id: str, req: ApprovalRequest):
    record = repository.get_workflow(workflow_id)
    execution = repository.get_execution(workflow_id, execution_id)
    if not record or not execution:
        raise HTTPException(404, "not found")
    if not execution.pending_approval_node_id:
        raise HTTPException(400, "no pending approval")
    execution = await executor.apply_approval_and_resume(record.spec, execution, req.approve)
    return {"approved": req.approve, "state": execution.state, "execution_id": execution.id}


@app.get("/workflows/{workflow_id}/versions")
def list_versions(workflow_id: str):
    return versions.list_versions(workflow_id)


@app.post("/workflows/{workflow_id}/revert/{version_id}")
def revert(workflow_id: str, version_id: str):
    try:
        v = versions.revert(workflow_id, version_id)
    except KeyError:
        raise HTTPException(404, "version not found")
    return {"reverted_to": version_id, "new_version": v.id}


@app.get("/workflows/{workflow_id}/nodes/{node_id}/explain")
def explain(workflow_id: str, node_id: str):
    record = repository.get_workflow(workflow_id)
    if not record:
        raise HTTPException(404, "workflow not found")
    node = record.spec.get_node(node_id)
    if not node:
        raise HTTPException(404, "node not found")
    text = explainer.explain(record.spec, node, repository.list_decisions(workflow_id))
    return {"node_id": node_id, "explanation": text}


@app.websocket("/workflows/{workflow_id}/stream")
async def stream(websocket: WebSocket, workflow_id: str, execution_id: str):
    await websocket.accept()
    try:
        while True:
            ex = repository.get_execution(workflow_id, execution_id)
            if ex:
                await websocket.send_json({"state": ex.state, "logs": [l.model_dump() for l in ex.logs]})
                if ex.state in ("completed", "failed"):
                    break
            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        pass
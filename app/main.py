from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app import google_oauth, service
from app.agents import explainer
from app.auth import get_current_user
from app.config import settings
from app.connectors import registry
from app.engine import executor
from app.schemas import (
    ApprovalRequest,
    ClarifyRequest,
    EditRequest,
    ExecutionState,
    GenerateRequest,
    GenerateResponse,
    HealApprovalRequest,
    RunResponse,
    WorkflowRecord,
    WorkflowSpec,
)
from app.storage import repository, versions

app = FastAPI(title="Sayso", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
router = APIRouter(prefix="/api", dependencies=[Depends(get_current_user)])


def _get_owned_workflow(workflow_id: str, user) -> WorkflowRecord:
    """Fetch a workflow and verify the caller owns it — every workflow-scoped
    route goes through this instead of repository.get_workflow directly, so
    an authenticated user can't read/run/edit another user's workflow."""
    record = repository.get_workflow(workflow_id)
    if not record:
        raise HTTPException(404, "workflow not found")
    if record.owner_uid != user.uid:
        raise HTTPException(403, "not authorized to access this workflow")
    return record


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "sayso", "connectors": registry.available()}


@app.get("/api/oauth/google/start")
async def google_oauth_start(user=Depends(get_current_user)):
    if not google_oauth.settings.google_oauth_enabled:
        raise HTTPException(400, "Google OAuth not configured (GOOGLE_OAUTH_CLIENT_ID/SECRET)")
    state = google_oauth.sign_state(user.uid)
    return {"auth_url": google_oauth.build_auth_url(state)}


@app.get("/api/oauth/google/status")
async def google_oauth_status(user=Depends(get_current_user)):
    return {"connected": google_oauth.is_connected(user.uid)}


@app.get("/api/oauth/google/callback")
async def google_oauth_callback(code: str, state: str):
    try:
        uid = google_oauth.verify_state(state)
    except google_oauth.GoogleOAuthError as e:
        return RedirectResponse(f"{settings.frontend_url}/integrations?google_error={e}")
    try:
        token_response = google_oauth.exchange_code(code)
        google_oauth.store_tokens(uid, token_response)
    except google_oauth.GoogleOAuthError as e:
        return RedirectResponse(f"{settings.frontend_url}/integrations?google_error={e}")
    return RedirectResponse(f"{settings.frontend_url}/integrations?google_connected=1")


@router.post("/workflows/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest, user=Depends(get_current_user)):
    result = await asyncio.to_thread(service.generate, req.prompt, owner_uid=user.uid)
    if result.status == "validated" and result.spec:
        executor.start_continuous_execution(result.workflow_id, result.spec, user.uid)
    return result


@router.post("/workflows/{workflow_id}/clarify", response_model=GenerateResponse)
async def clarify(workflow_id: str, req: ClarifyRequest, user=Depends(get_current_user)):
    _get_owned_workflow(workflow_id, user)
    result = await asyncio.to_thread(service.clarify, workflow_id, req.answers)
    if result.status == "validated" and result.spec:
        executor.start_continuous_execution(workflow_id, result.spec, user.uid)
    return result


@router.post("/workflows/{workflow_id}/edit")
def edit(workflow_id: str, req: EditRequest, user=Depends(get_current_user)):
    _get_owned_workflow(workflow_id, user)
    record, version = service.edit(workflow_id, req.instruction)
    return {"workflow_id": workflow_id, "version": version.id, "diff": version.diff, "spec": record.spec}


@router.get("/workflows")
def list_workflows(user=Depends(get_current_user)):
    return repository.list_workflows(user.uid)


@router.get("/workflows/{workflow_id}")
def get_workflow(workflow_id: str, user=Depends(get_current_user)):
    return _get_owned_workflow(workflow_id, user)


async def _start_run(workflow_id: str, dry_run: bool, user) -> RunResponse:
    record = _get_owned_workflow(workflow_id, user)
    execution = repository.new_execution(workflow_id, record.current_version_id, dry_run)
    execution.context["_uid"] = user.uid
    execution = await executor.run_execution(record.spec, execution)
    return RunResponse(execution_id=execution.id, state=execution.state)


@router.post("/workflows/{workflow_id}/dry-run", response_model=RunResponse)
async def dry_run(workflow_id: str, user=Depends(get_current_user)):
    return await _start_run(workflow_id, dry_run=True, user=user)


@router.post("/workflows/{workflow_id}/run", response_model=RunResponse)
async def run(workflow_id: str, user=Depends(get_current_user)):
    record = _get_owned_workflow(workflow_id, user)
    executor.start_continuous_execution(workflow_id, record.spec, user.uid)
    latest = repository.list_executions(workflow_id)
    if latest:
        return RunResponse(execution_id=latest[0].id, state=latest[0].state)
    return RunResponse(execution_id="", state=ExecutionState.running)


@router.post("/workflows/{workflow_id}/stop")
async def stop(workflow_id: str, user=Depends(get_current_user)):
    _get_owned_workflow(workflow_id, user)
    await executor.stop_continuous_execution(workflow_id)
    return {"stopped": True}


@router.get("/workflows/{workflow_id}/executions")
def list_executions(workflow_id: str, user=Depends(get_current_user)):
    _get_owned_workflow(workflow_id, user)
    return repository.list_executions(workflow_id)


@router.get("/workflows/{workflow_id}/status")
def status(workflow_id: str, execution_id: str | None = None, user=Depends(get_current_user)):
    _get_owned_workflow(workflow_id, user)
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


@router.post("/workflows/{workflow_id}/executions/{execution_id}/heal")
async def heal_approval(workflow_id: str, execution_id: str, req: HealApprovalRequest, user=Depends(get_current_user)):
    record = _get_owned_workflow(workflow_id, user)
    execution = repository.get_execution(workflow_id, execution_id)
    if not execution:
        raise HTTPException(404, "not found")
    if not execution.pending_heal:
        raise HTTPException(400, "no pending heal patch")
    if not req.approve:
        from app.schemas import ExecutionState
        execution.state = ExecutionState.failed
        execution.pending_heal = None
        repository.save_execution(execution)
        return {"applied": False, "state": execution.state, "execution_id": execution.id}
    execution.context["_uid"] = user.uid
    execution = await executor.apply_heal_and_resume(record.spec, execution)
    versions.create_version(workflow_id, record.spec, message="self-heal patch applied")
    return {"applied": True, "state": execution.state, "execution_id": execution.id}


@router.post("/workflows/{workflow_id}/executions/{execution_id}/approve")
async def approve(workflow_id: str, execution_id: str, req: ApprovalRequest, user=Depends(get_current_user)):
    record = _get_owned_workflow(workflow_id, user)
    execution = repository.get_execution(workflow_id, execution_id)
    if not execution:
        raise HTTPException(404, "not found")
    if not execution.pending_approval_node_id:
        raise HTTPException(400, "no pending approval")
    execution.context["_uid"] = user.uid
    execution = await executor.apply_approval_and_resume(record.spec, execution, req.approve)
    return {"approved": req.approve, "state": execution.state, "execution_id": execution.id}


@router.get("/workflows/{workflow_id}/versions")
def list_versions(workflow_id: str, user=Depends(get_current_user)):
    _get_owned_workflow(workflow_id, user)
    return versions.list_versions(workflow_id)


@router.post("/workflows/{workflow_id}/revert/{version_id}")
def revert(workflow_id: str, version_id: str, user=Depends(get_current_user)):
    _get_owned_workflow(workflow_id, user)
    try:
        v = versions.revert(workflow_id, version_id)
    except KeyError:
        raise HTTPException(404, "version not found")
    return {"reverted_to": version_id, "new_version": v.id}


@router.get("/workflows/{workflow_id}/nodes/{node_id}/explain")
def explain(workflow_id: str, node_id: str, user=Depends(get_current_user)):
    record = _get_owned_workflow(workflow_id, user)
    node = record.spec.get_node(node_id)
    if not node:
        raise HTTPException(404, "node not found")
    text = explainer.explain(record.spec, node, repository.list_decisions(workflow_id))
    return {"node_id": node_id, "explanation": text}


@app.websocket("/api/workflows/{workflow_id}/stream")
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


app.include_router(router)

from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


class NodeType(str, Enum):
    connector = "connector"
    conditional = "conditional"
    for_each = "for_each"
    human_approval = "human_approval"


class RetryPolicy(BaseModel):
    max_attempts: int = 1
    backoff_seconds: float = 0.0


class Node(BaseModel):
    id: str
    type: NodeType = NodeType.connector
    connector: str | None = None
    config: dict[str, Any] = Field(default_factory=dict)
    depends_on: list[str] = Field(default_factory=list)
    retry_policy: RetryPolicy = Field(default_factory=RetryPolicy)

    condition: str | None = None
    true_branch: list[str] = Field(default_factory=list)
    false_branch: list[str] = Field(default_factory=list)

    iterate_over: str | None = None
    loop_body: list[str] = Field(default_factory=list)

    reasoning: str | None = None


class Trigger(BaseModel):
    type: str = "manual"
    config: dict[str, Any] = Field(default_factory=dict)
    reasoning: str | None = None


class WorkflowSpec(BaseModel):
    name: str = "Untitled workflow"
    description: str = ""
    trigger: Trigger = Field(default_factory=Trigger)
    variables: dict[str, Any] = Field(default_factory=dict)
    nodes: list[Node] = Field(default_factory=list)
    reasoning: str | None = None

    def node_ids(self) -> list[str]:
        return [n.id for n in self.nodes]

    def get_node(self, node_id: str) -> Node | None:
        return next((n for n in self.nodes if n.id == node_id), None)


class ClarificationRequest(BaseModel):
    status: Literal["ok", "needs_clarification"]
    questions: list[str] = Field(default_factory=list)
    reasoning: str | None = None


class ValidationError(BaseModel):
    node_id: str | None
    reason: str


class ValidationResult(BaseModel):
    passed: bool
    errors: list[ValidationError] = Field(default_factory=list)


class NodeStatus(str, Enum):
    pending = "pending"
    running = "running"
    succeeded = "succeeded"
    failed = "failed"
    skipped = "skipped"
    awaiting_approval = "awaiting_approval"
    healing = "healing"


class ExecutionLog(BaseModel):
    node_id: str
    status: NodeStatus
    start_time: str | None = None
    end_time: str | None = None
    input: Any = None
    output: Any = None
    error: str | None = None
    reasoning: str | None = None
    attempt: int = 1


class ExecutionState(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"
    awaiting_heal_approval = "awaiting_heal_approval"
    awaiting_approval = "awaiting_approval"


class Execution(BaseModel):
    id: str
    workflow_id: str
    version_id: str | None = None
    state: ExecutionState = ExecutionState.pending
    dry_run: bool = True
    logs: list[ExecutionLog] = Field(default_factory=list)
    context: dict[str, Any] = Field(default_factory=dict)
    created_at: str | None = None
    updated_at: str | None = None
    pending_heal: "HealPatch | None" = None
    pending_approval_node_id: str | None = None


class HealPatch(BaseModel):
    node_id: str
    error: str
    patch: dict[str, Any] = Field(default_factory=dict)
    diff_explanation: str
    reasoning: str | None = None


class WorkflowVersion(BaseModel):
    id: str
    workflow_id: str
    spec: WorkflowSpec
    diff: dict[str, Any] = Field(default_factory=dict)
    message: str = ""
    created_at: str | None = None


class WorkflowRecord(BaseModel):
    id: str
    prompt: str = ""
    spec: WorkflowSpec
    current_version_id: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
    clarification_answers: dict[str, str] = Field(default_factory=dict)
    owner_uid: str = ""


class GenerateRequest(BaseModel):
    prompt: str


class GenerateResponse(BaseModel):
    workflow_id: str
    status: Literal["validated", "needs_clarification", "invalid"]
    spec: WorkflowSpec | None = None
    clarification: ClarificationRequest | None = None
    validation: ValidationResult | None = None


class ClarifyRequest(BaseModel):
    answers: dict[str, str]


class EditRequest(BaseModel):
    instruction: str


class RunResponse(BaseModel):
    execution_id: str
    state: ExecutionState


class HealApprovalRequest(BaseModel):
    approve: bool


class ApprovalRequest(BaseModel):
    approve: bool


Execution.model_rebuild()

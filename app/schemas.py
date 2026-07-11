"""Pydantic v2 schemas — the contract every layer speaks.

A UI team can build React Flow visualisation purely off WorkflowSpec + the
ExecutionLog records, so keep these stable and self-describing.
"""
from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


# --------------------------------------------------------------------------- #
# Workflow specification (planner output → compiler input)
# --------------------------------------------------------------------------- #
class NodeType(str, Enum):
    # connector-backed nodes resolve by name against the registry
    connector = "connector"
    # control-flow nodes are first-class graph citizens, not hacks
    conditional = "conditional"
    for_each = "for_each"
    human_approval = "human_approval"


class RetryPolicy(BaseModel):
    max_attempts: int = 1
    backoff_seconds: float = 0.0


class Node(BaseModel):
    id: str
    type: NodeType = NodeType.connector
    # For connector nodes this is the connector registry key (e.g. "SlackNotify").
    # For control nodes it is a control keyword ("if" / "for_each" / "approval").
    connector: str | None = None
    config: dict[str, Any] = Field(default_factory=dict)
    depends_on: list[str] = Field(default_factory=list)
    retry_policy: RetryPolicy = Field(default_factory=RetryPolicy)

    # --- conditional nodes ---
    # A jinja-ish expression evaluated against the run context, e.g.
    # "{{ extract.amount }} > 5000". true_branch/false_branch list node ids.
    condition: str | None = None
    true_branch: list[str] = Field(default_factory=list)
    false_branch: list[str] = Field(default_factory=list)

    # --- for_each nodes ---
    # iterate over a context reference; body node ids run once per item with
    # `item` bound in context.
    iterate_over: str | None = None
    loop_body: list[str] = Field(default_factory=list)

    # Explainability: the planner emits a hidden reasoning trace per step.
    reasoning: str | None = None


class Trigger(BaseModel):
    type: str = "manual"  # e.g. "GmailTrigger", "manual", "schedule"
    config: dict[str, Any] = Field(default_factory=dict)
    reasoning: str | None = None


class WorkflowSpec(BaseModel):
    name: str = "Untitled workflow"
    description: str = ""
    trigger: Trigger = Field(default_factory=Trigger)
    variables: dict[str, Any] = Field(default_factory=dict)
    nodes: list[Node] = Field(default_factory=list)
    # top-level planner reasoning about the overall ordering
    reasoning: str | None = None

    def node_ids(self) -> list[str]:
        return [n.id for n in self.nodes]

    def get_node(self, node_id: str) -> Node | None:
        return next((n for n in self.nodes if n.id == node_id), None)


# --------------------------------------------------------------------------- #
# Critic / clarification
# --------------------------------------------------------------------------- #
class ClarificationRequest(BaseModel):
    status: Literal["ok", "needs_clarification"]
    questions: list[str] = Field(default_factory=list)
    reasoning: str | None = None


# --------------------------------------------------------------------------- #
# Validator
# --------------------------------------------------------------------------- #
class ValidationError(BaseModel):
    node_id: str | None
    reason: str


class ValidationResult(BaseModel):
    passed: bool
    errors: list[ValidationError] = Field(default_factory=list)


# --------------------------------------------------------------------------- #
# Execution
# --------------------------------------------------------------------------- #
class NodeStatus(str, Enum):
    pending = "pending"
    running = "running"
    succeeded = "succeeded"
    failed = "failed"
    skipped = "skipped"
    awaiting_approval = "awaiting_approval"
    healing = "healing"


class ExecutionLog(BaseModel):
    """One record per node execution — the substrate for explainability."""

    node_id: str
    status: NodeStatus
    start_time: str | None = None
    end_time: str | None = None
    input: Any = None
    output: Any = None
    error: str | None = None
    # populated for AI-driven nodes / agent decisions
    reasoning: str | None = None
    attempt: int = 1


class ExecutionState(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"
    awaiting_heal_approval = "awaiting_heal_approval"


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


# --------------------------------------------------------------------------- #
# Self-healing
# --------------------------------------------------------------------------- #
class HealPatch(BaseModel):
    node_id: str
    error: str
    # JSON-merge-style patch applied to the failed node's config/fields
    patch: dict[str, Any] = Field(default_factory=dict)
    diff_explanation: str
    reasoning: str | None = None


# --------------------------------------------------------------------------- #
# Version history
# --------------------------------------------------------------------------- #
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


# --------------------------------------------------------------------------- #
# API request/response envelopes
# --------------------------------------------------------------------------- #
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


Execution.model_rebuild()

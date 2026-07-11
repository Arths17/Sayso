from __future__ import annotations

from app.agents import critic, planner, validator
from app.schemas import (
    ClarificationRequest,
    GenerateResponse,
    ValidationResult,
    WorkflowSpec,
)
from app.storage import repository


def generate(prompt: str, answers: dict[str, str] | None = None) -> GenerateResponse:
    spec = planner.plan(prompt, answers)
    record = repository.create_workflow(prompt, spec)
    repository.log_decision(record.id, "planner", {"prompt": prompt, "reasoning": spec.reasoning})

    crit = critic.critique(spec)
    repository.log_decision(record.id, "critic", crit.model_dump())
    if crit.status == "needs_clarification":
        return GenerateResponse(
            workflow_id=record.id, status="needs_clarification",
            spec=spec, clarification=crit,
        )

    result = validator.validate(spec)
    repository.log_decision(record.id, "validator", result.model_dump())
    if not result.passed:
        return GenerateResponse(
            workflow_id=record.id, status="invalid", spec=spec, validation=result
        )
    return GenerateResponse(workflow_id=record.id, status="validated", spec=spec, validation=result)


def clarify(workflow_id: str, answers: dict[str, str]) -> GenerateResponse:
    record = repository.get_workflow(workflow_id)
    if not record:
        raise KeyError(workflow_id)
    spec = planner.plan(record.prompt, answers)
    repository.update_spec(workflow_id, spec, message="clarified")
    repository.log_decision(workflow_id, "planner", {"answers": answers, "reasoning": spec.reasoning})

    crit = critic.critique(spec)
    repository.log_decision(workflow_id, "critic", crit.model_dump())
    if crit.status == "needs_clarification":
        return GenerateResponse(
            workflow_id=workflow_id, status="needs_clarification", spec=spec, clarification=crit
        )
    result = validator.validate(spec)
    if not result.passed:
        return GenerateResponse(workflow_id=workflow_id, status="invalid", spec=spec, validation=result)
    return GenerateResponse(workflow_id=workflow_id, status="validated", spec=spec, validation=result)


def edit(workflow_id: str, instruction: str):
    record = repository.get_workflow(workflow_id)
    if not record:
        raise KeyError(workflow_id)
    combined = f"{record.prompt}\nAdditional instruction: {instruction}"
    spec = planner.plan(combined, {"edit": instruction})
    repository.log_decision(workflow_id, "planner", {"edit": instruction, "reasoning": spec.reasoning})
    updated = repository.update_spec(workflow_id, spec, message=f"edit: {instruction}")
    from app.storage import versions
    latest = versions.list_versions(workflow_id)[-1]
    return updated, latest
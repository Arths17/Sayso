from __future__ import annotations

from app.agents import critic, planner, validator
from app.schemas import (
    ClarificationRequest,
    GenerateResponse,
    ValidationResult,
    WorkflowSpec,
)
from app.storage import repository

_MAX_REPAIR_ATTEMPTS = 2


def _validation_feedback(result: ValidationResult) -> str:
    return "; ".join(f"{e.node_id or 'workflow'}: {e.reason}" for e in result.errors)


def _critique_validate_repair(
    workflow_id: str, prompt: str, spec: WorkflowSpec, answers: dict[str, str] | None
) -> tuple[WorkflowSpec, str, ClarificationRequest | None, ValidationResult | None, bool]:
    """Critique and validate an already-planned spec. Structural validation failures
    (a bad depends_on reference, an unknown connector, ...) are not a human decision,
    so instead of dead-ending on "invalid" they get fed back to the planner as
    corrective feedback and retried a bounded number of times — the same pattern
    complete_json already uses for malformed LLM JSON output. Returns whether a
    repair replan happened, so the caller knows whether to persist a new version."""
    repair_answers = dict(answers or {})
    repaired = False

    for attempt in range(_MAX_REPAIR_ATTEMPTS + 1):
        crit = critic.critique(spec)
        repository.log_decision(workflow_id, "critic", crit.model_dump())
        if crit.status == "needs_clarification":
            return spec, "needs_clarification", crit, None, repaired

        result = validator.validate(spec)
        repository.log_decision(workflow_id, "validator", result.model_dump())
        if result.passed:
            return spec, "validated", None, result, repaired

        if attempt == _MAX_REPAIR_ATTEMPTS:
            return spec, "invalid", None, result, repaired

        repair_answers["_validation_errors"] = _validation_feedback(result)
        spec = planner.plan(prompt, repair_answers)
        repaired = True
        repository.log_decision(workflow_id, "planner", {"answers": repair_answers, "reasoning": spec.reasoning})

    raise AssertionError("unreachable")


def generate(prompt: str, owner_uid: str = "", answers: dict[str, str] | None = None) -> GenerateResponse:
    spec = planner.plan(prompt, answers)
    record = repository.create_workflow(prompt, spec, owner_uid=owner_uid)
    repository.log_decision(record.id, "planner", {"prompt": prompt, "reasoning": spec.reasoning})

    spec, status, clarification, validation, repaired = _critique_validate_repair(
        record.id, prompt, spec, answers
    )
    if repaired:
        repository.update_spec(record.id, spec, message="planner repair")
    return GenerateResponse(
        workflow_id=record.id, status=status, spec=spec,
        clarification=clarification, validation=validation,
    )


def clarify(workflow_id: str, answers: dict[str, str]) -> GenerateResponse:
    record = repository.get_workflow(workflow_id)
    if not record:
        raise KeyError(workflow_id)
    merged_answers = {**record.clarification_answers, **answers}
    repository.save_clarification_answers(workflow_id, merged_answers)

    spec = planner.plan(record.prompt, merged_answers)
    repository.log_decision(workflow_id, "planner", {"answers": merged_answers, "reasoning": spec.reasoning})

    spec, status, clarification, validation, _ = _critique_validate_repair(
        workflow_id, record.prompt, spec, merged_answers
    )
    repository.update_spec(workflow_id, spec, message="clarified")
    return GenerateResponse(
        workflow_id=workflow_id, status=status, spec=spec,
        clarification=clarification, validation=validation,
    )


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

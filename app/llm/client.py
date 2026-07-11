"""The ONE place the app talks to an LLM.

Every agent (planner, critic, healer, explainer) calls `complete_json()` here —
never OpenRouter directly — so the model/provider is swappable in one file.

- Real mode: OpenRouter OpenAI-compatible chat/completions with
  response_format=json_object.
- Stub mode (no OPENROUTER_API_KEY): deterministic offline responses, so the
  whole pipeline runs in tests/CI without keys.

Structured output contract: callers pass a Pydantic model; we validate the
returned JSON against it and, on failure, retry up to `llm_max_retries` times
feeding the validation error back to the model.
"""
from __future__ import annotations

import json
from typing import Type, TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from app.config import settings
from app.llm import stub

T = TypeVar("T", bound=BaseModel)


class LLMError(RuntimeError):
    pass


def _call_openrouter(system: str, user: str) -> str:
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://sayso.dev",
        "X-Title": "Sayso",
    }
    payload = {
        "model": settings.llm_model,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    with httpx.Client(timeout=60) as client:
        resp = client.post(
            f"{settings.openrouter_base_url}/chat/completions",
            headers=headers,
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


def complete_json(
    *,
    task: str,
    system: str,
    user: str,
    schema: Type[T],
    context: dict | None = None,
) -> T:
    """Return a validated instance of `schema`.

    `task` selects the deterministic stub when running offline; it has no
    effect on real OpenRouter calls beyond bookkeeping.
    """
    if not settings.use_real_llm:
        raw = stub.respond(task, context or {})
        return schema.model_validate(raw)

    last_err: Exception | None = None
    prompt = user
    for attempt in range(settings.llm_max_retries + 1):
        try:
            content = _call_openrouter(system, prompt)
            data = json.loads(content)
            return schema.model_validate(data)
        except (json.JSONDecodeError, ValidationError) as e:
            last_err = e
            # feed the error back so the model can correct itself
            prompt = (
                f"{user}\n\nYour previous response was invalid: {e}\n"
                "Return ONLY valid JSON matching the required schema."
            )
        except httpx.HTTPError as e:  # pragma: no cover - network
            raise LLMError(f"OpenRouter request failed: {e}") from e
    raise LLMError(f"LLM output failed validation after retries: {last_err}")

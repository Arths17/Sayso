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
            prompt = (
                f"{user}\n\nYour previous response was invalid: {e}\n"
                "Return ONLY valid JSON matching the required schema."
            )
        except httpx.HTTPError as e:
            raise LLMError(f"OpenRouter request failed: {e}") from e
    raise LLMError(f"LLM output failed validation after retries: {last_err}")
"""Local PyTorch fallback LLM.

Only used when OpenRouter itself fails at the transport level (network error,
or a non-2xx response after `client.py`'s retry loop is exhausted) — never as
a general replacement for OpenRouter, and never on the offline stub path.

Deliberately not a dependency of the base install: torch + transformers are
GBs and only make sense on a persistent server, never the Vercel serverless
deployment described in CLAUDE.md. See requirements-local-llm.txt. If those
packages (or the model weights) aren't available, `generate_json` raises
LocalModelUnavailable and the caller should surface the original error.
"""
from __future__ import annotations

import re
from functools import lru_cache

from app.config import settings


class LocalModelUnavailable(RuntimeError):
    pass


@lru_cache
def _load():
    try:
        import torch  # noqa: F401
        from transformers import AutoModelForCausalLM, AutoTokenizer
    except ImportError as e:
        raise LocalModelUnavailable(
            f"local fallback model unavailable (torch/transformers not installed): {e}"
        ) from e

    try:
        tokenizer = AutoTokenizer.from_pretrained(settings.local_fallback_model)
        model = AutoModelForCausalLM.from_pretrained(settings.local_fallback_model)
    except Exception as e:  # noqa: BLE001 - any download/load failure
        raise LocalModelUnavailable(f"failed to load '{settings.local_fallback_model}': {e}") from e
    model.eval()
    return tokenizer, model


def _extract_json(text: str) -> str:
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise LocalModelUnavailable("local model did not produce a JSON object")
    return match.group(0)


def generate_json(system: str, user: str, max_new_tokens: int = 512) -> str:
    """Best-effort local generation of a JSON string. Raises
    LocalModelUnavailable if the dependency stack, model, or output isn't
    usable — callers should treat that as "no fallback available", not a
    silent failure."""
    if not settings.local_fallback_enabled:
        raise LocalModelUnavailable("local fallback disabled via config")

    try:
        import torch
    except ImportError as e:
        raise LocalModelUnavailable(str(e)) from e

    tokenizer, model = _load()
    messages = [
        {"role": "system", "content": f"{system}\nRespond with ONLY valid JSON. No prose, no markdown fences."},
        {"role": "user", "content": user},
    ]
    prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(prompt, return_tensors="pt")
    with torch.no_grad():
        out = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            pad_token_id=tokenizer.eos_token_id or tokenizer.pad_token_id,
        )
    text = tokenizer.decode(out[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
    return _extract_json(text)

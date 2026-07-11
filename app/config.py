"""Central configuration. All external-service switches live here.

The backend is designed to run fully offline: if OpenRouter / Firebase
credentials are absent, it transparently falls back to a deterministic stub
LLM and an in-memory store so the entire pipeline can be exercised via tests
and curl without any keys.
"""
from __future__ import annotations

import os
from functools import lru_cache

try:  # optional: load a local .env if present
    from dotenv import load_dotenv

    load_dotenv()
except Exception:  # pragma: no cover
    pass


def _bool(name: str, default: bool = False) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    # --- LLM (OpenRouter) ---
    openrouter_api_key: str | None = os.getenv("OPENROUTER_API_KEY")
    openrouter_base_url: str = os.getenv(
        "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
    )
    # Confirm the exact slug on openrouter.ai/models; this is the current default.
    llm_model: str = os.getenv("SAYSO_LLM_MODEL", "anthropic/claude-sonnet-4.5")
    llm_max_retries: int = int(os.getenv("SAYSO_LLM_MAX_RETRIES", "2"))

    # --- Firebase / Firestore ---
    # firebase-admin conventions: either GOOGLE_APPLICATION_CREDENTIALS (path)
    # or FIREBASE_SERVICE_ACCOUNT_JSON (inline JSON, useful on Vercel).
    firebase_credentials_path: str | None = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    firebase_service_account_json: str | None = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_JSON"
    )
    firebase_project_id: str | None = os.getenv("FIREBASE_PROJECT_ID")

    # --- Connectors ---
    # When true, every connector returns realistic mock data (dry-run default).
    force_mock_connectors: bool = _bool("SAYSO_FORCE_MOCK_CONNECTORS", True)

    @property
    def use_real_llm(self) -> bool:
        return bool(self.openrouter_api_key)

    @property
    def use_firestore(self) -> bool:
        return bool(
            self.firebase_credentials_path or self.firebase_service_account_json
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

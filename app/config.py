from __future__ import annotations

import os
from functools import lru_cache

try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:
    pass


def _bool(name: str, default: bool = False) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    openrouter_api_key: str | None = os.getenv("OPENROUTER_API_KEY")
    openrouter_base_url: str = os.getenv(
        "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
    )
    llm_model: str = os.getenv(
        "SAYSO_LLM_MODEL", "nvidia/nemotron-3-super-120b-a12b:free"
    )
    llm_max_retries: int = int(os.getenv("SAYSO_LLM_MAX_RETRIES", "2"))

    local_fallback_enabled: bool = _bool("SAYSO_LOCAL_FALLBACK_ENABLED", True)
    local_fallback_model: str = os.getenv(
        "SAYSO_LOCAL_FALLBACK_MODEL", "Qwen/Qwen2.5-0.5B-Instruct"
    )

    firebase_credentials_path: str | None = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    firebase_service_account_json: str | None = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_JSON"
    )
    firebase_project_id: str | None = os.getenv("FIREBASE_PROJECT_ID")

    # --- Auth ---
    # Verifies Firebase Auth ID tokens on every /workflows request. Off by
    # default when no Firebase credentials are configured, so tests/local dev
    # keep working without a service account; explicitly set
    # SAYSO_AUTH_DISABLED=false once credentials + a real client are in place.
    _auth_disabled_override: str | None = os.getenv("SAYSO_AUTH_DISABLED")

    # --- Connectors ---
    # Manual override: when true, every connector returns mock data even on a
    # real (non-dry-run) execution. Off by default so /run behaves like a
    # real run; set this to force-mock in environments without live credentials.
    force_mock_connectors: bool = _bool("SAYSO_FORCE_MOCK_CONNECTORS", False)

    @property
    def use_real_llm(self) -> bool:
        return bool(self.openrouter_api_key)

    @property
    def use_firestore(self) -> bool:
        return bool(
            self.firebase_credentials_path or self.firebase_service_account_json
        )

    @property
    def auth_enabled(self) -> bool:
        if self._auth_disabled_override is not None:
            return not _bool("SAYSO_AUTH_DISABLED", False)
        return self.use_firestore


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
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

    # --- Local PyTorch fallback (used only when OpenRouter itself is
    # unreachable — network error / non-2xx after retries). Requires
    # requirements-local-llm.txt; silently unavailable otherwise. ---
    local_fallback_enabled: bool = _bool("SAYSO_LOCAL_FALLBACK_ENABLED", True)
    local_fallback_model: str = os.getenv(
        "SAYSO_LOCAL_FALLBACK_MODEL", "Qwen/Qwen2.5-0.5B-Instruct"
    )

    firebase_credentials_path: str | None = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    firebase_service_account_json: str | None = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_JSON"
    )
    firebase_project_id: str | None = os.getenv("FIREBASE_PROJECT_ID")

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


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
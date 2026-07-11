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

    # --- Google OAuth (Gmail/Drive/Sheets connectors) ---
    # Separate from Firebase Auth's "Sign in with Google" — this is the OAuth
    # client used to get user consent for Gmail/Drive/Sheets API scopes.
    google_oauth_client_id: str | None = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
    google_oauth_client_secret: str | None = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET")
    google_oauth_redirect_uri: str = os.getenv(
        "GOOGLE_OAUTH_REDIRECT_URI", "http://localhost:8000/oauth/google/callback"
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
    def google_oauth_enabled(self) -> bool:
        return bool(self.google_oauth_client_id and self.google_oauth_client_secret)

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
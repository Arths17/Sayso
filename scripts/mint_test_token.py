"""Mint a real, verifiable Firebase ID token for local dev/testing.

Once real Firebase credentials are configured, `auth_enabled` is True
everywhere (see app/config.py) — including your local server — so curl/manual
testing needs a real ID token instead of the dev-bypass user. This creates a
custom token for a fake uid via the Admin SDK, then exchanges it for an ID
token through the Identity Toolkit REST API (the same exchange a real client
SDK does after any sign-in method), so it exercises the actual
verify_id_token() path in app/auth.py rather than bypassing it.

Usage:
    python scripts/mint_test_token.py [uid]

    curl -H "Authorization: Bearer $(python scripts/mint_test_token.py)" \\
        http://localhost:8000/workflows/generate -d '...'
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx
from firebase_admin import auth as firebase_auth

from app.config import settings
from app.firebase_admin_app import get_app

_EXCHANGE_URL = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken"


def mint(uid: str) -> str:
    if not settings.firebase_web_api_key:
        raise SystemExit("FIREBASE_WEB_API_KEY not set in .env")

    custom_token = firebase_auth.create_custom_token(uid, app=get_app())

    resp = httpx.post(
        _EXCHANGE_URL,
        params={"key": settings.firebase_web_api_key},
        json={"token": custom_token.decode(), "returnSecureToken": True},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["idToken"]


if __name__ == "__main__":
    uid = sys.argv[1] if len(sys.argv) > 1 else "local-test-user"
    print(mint(uid))

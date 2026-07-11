from __future__ import annotations

import base64
import hashlib
import hmac
import time
import urllib.parse

import httpx

from app.config import settings
from app.storage import repository
from app.utils import now_iso

_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_TOKEN_URL = "https://oauth2.googleapis.com/token"
_STATE_TTL_SECONDS = 600

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/spreadsheets",
]


class GoogleOAuthError(RuntimeError):
    pass


def _state_secret() -> bytes:
    return (settings.google_oauth_client_secret or "").encode()


def sign_state(uid: str) -> str:
    """HMAC-sign uid + timestamp so /oauth/google/callback can trust the uid
    it's given without a Bearer token — prevents an attacker from forging a
    state value to attach their own Google tokens to someone else's uid."""
    payload_b64 = base64.urlsafe_b64encode(f"{uid}:{int(time.time())}".encode()).decode().rstrip("=")
    sig = hmac.new(_state_secret(), payload_b64.encode(), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{sig}"


def verify_state(state: str) -> str:
    try:
        payload_b64, sig = state.split(".", 1)
    except ValueError as e:
        raise GoogleOAuthError("invalid state format") from e

    expected_sig = hmac.new(_state_secret(), payload_b64.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected_sig):
        raise GoogleOAuthError("state signature mismatch")

    try:
        padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        uid, ts = base64.urlsafe_b64decode(padded).decode().rsplit(":", 1)
        ts = int(ts)
    except Exception as e:
        raise GoogleOAuthError("invalid state payload") from e

    if time.time() - ts > _STATE_TTL_SECONDS:
        raise GoogleOAuthError("state expired")
    return uid


def build_auth_url(state: str) -> str:
    if not settings.google_oauth_enabled:
        raise GoogleOAuthError("GOOGLE_OAUTH_CLIENT_ID/SECRET not configured")
    params = {
        "client_id": settings.google_oauth_client_id,
        "redirect_uri": settings.google_oauth_redirect_uri,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return f"{_AUTH_URL}?{urllib.parse.urlencode(params)}"


def exchange_code(code: str) -> dict:
    data = {
        "client_id": settings.google_oauth_client_id,
        "client_secret": settings.google_oauth_client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": settings.google_oauth_redirect_uri,
    }
    with httpx.Client(timeout=30) as client:
        resp = client.post(_TOKEN_URL, data=data)
    if resp.status_code != 200:
        raise GoogleOAuthError(f"code exchange failed: {resp.status_code} {resp.text}")
    return resp.json()


def _refresh(refresh_token: str) -> dict:
    data = {
        "client_id": settings.google_oauth_client_id,
        "client_secret": settings.google_oauth_client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }
    with httpx.Client(timeout=30) as client:
        resp = client.post(_TOKEN_URL, data=data)
    if resp.status_code != 200:
        raise GoogleOAuthError(f"token refresh failed: {resp.status_code} {resp.text}")
    return resp.json()


def store_tokens(uid: str, token_response: dict) -> None:
    existing = repository.get_google_tokens(uid) or {}
    refresh_token = token_response.get("refresh_token") or existing.get("refresh_token")
    if not refresh_token:
        raise GoogleOAuthError(
            "no refresh_token returned — revoke prior access at "
            "https://myaccount.google.com/permissions and reconnect"
        )
    repository.set_google_tokens(uid, {
        "refresh_token": refresh_token,
        "access_token": token_response["access_token"],
        "expires_at": time.time() + token_response.get("expires_in", 3600),
        "scope": token_response.get("scope", " ".join(SCOPES)),
        "updated_at": now_iso(),
    })


def get_access_token(uid: str) -> str:
    tokens = repository.get_google_tokens(uid)
    if not tokens:
        raise GoogleOAuthError(f"no Google credentials connected for user '{uid}'")

    if tokens.get("expires_at", 0) > time.time() + 30:
        return tokens["access_token"]

    refreshed = _refresh(tokens["refresh_token"])
    repository.set_google_tokens(uid, {
        **tokens,
        "access_token": refreshed["access_token"],
        "expires_at": time.time() + refreshed.get("expires_in", 3600),
        "updated_at": now_iso(),
    })
    return refreshed["access_token"]


def is_connected(uid: str) -> bool:
    return repository.get_google_tokens(uid) is not None

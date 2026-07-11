"""Google OAuth2 (authorization code) flow for the Gmail/Drive/Sheets
connectors — separate from Firebase Auth's "Sign in with Google", which only
identifies the user in our own app. This flow gets user consent for Google
Workspace API scopes so the connectors can make real calls on their behalf.

Flow:
  1. GET /oauth/google/start   (authenticated) -> redirect to Google consent
  2. GET /oauth/google/callback?code=&state=   -> exchange code, store tokens
  3. app.connectors.base.CredentialStore.token() calls get_access_token(uid)
     on every real connector run, refreshing if the access token expired.

Tokens are stored per-uid via app.storage.repository (Firestore in
production, in-memory in dev/tests) — never in this module.
"""
from __future__ import annotations

import time
import urllib.parse

import httpx

from app.config import settings
from app.storage import repository
from app.utils import now_iso

_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_TOKEN_URL = "https://oauth2.googleapis.com/token"

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/spreadsheets",
]


class GoogleOAuthError(RuntimeError):
    pass


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
    """Exchange an authorization code for tokens, return the raw token response."""
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
    """Return a valid access token for this user, refreshing if expired."""
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

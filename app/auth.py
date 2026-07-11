from __future__ import annotations

from dataclasses import dataclass

from fastapi import Header, HTTPException
from firebase_admin import auth as firebase_auth

from app import firebase_admin_app
from app.config import settings


@dataclass
class AuthedUser:
    uid: str
    email: str | None = None


async def get_current_user(authorization: str | None = Header(default=None)) -> AuthedUser:
    if not settings.auth_enabled:
        return AuthedUser(uid="dev-user", email="dev@local")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()

    try:
        decoded = firebase_auth.verify_id_token(token, app=firebase_admin_app.get_app())
    except Exception as e:  # noqa: BLE001
        raise HTTPException(401, f"invalid auth token: {e}") from e

    return AuthedUser(uid=decoded["uid"], email=decoded.get("email"))

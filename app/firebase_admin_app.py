"""Single shared firebase_admin App instance.

Both Firestore storage (app/storage/firestore_client.py) and Auth token
verification (app/auth.py) need one initialized App — this is the one place
that happens, so credentials are configured once.
"""
from __future__ import annotations

import json

import firebase_admin
from firebase_admin import credentials

from app.config import settings


def get_app() -> firebase_admin.App:
    if firebase_admin._apps:
        return firebase_admin.get_app()

    if settings.firebase_service_account_json:
        cred = credentials.Certificate(json.loads(settings.firebase_service_account_json))
    elif settings.firebase_credentials_path:
        cred = credentials.Certificate(settings.firebase_credentials_path)
    else:
        cred = credentials.ApplicationDefault()

    return firebase_admin.initialize_app(
        cred,
        {"projectId": settings.firebase_project_id} if settings.firebase_project_id else None,
    )

"""Small shared helpers."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str = "") -> str:
    stub = uuid.uuid4().hex[:12]
    return f"{prefix}{stub}" if prefix else stub

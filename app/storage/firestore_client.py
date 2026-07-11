"""Thin data-access layer.

The rest of the app NEVER talks to Firestore directly — it goes through
`get_store()`, which returns either a Firestore-backed store or an in-memory
store when no credentials are configured. Both implement the same interface,
so swapping the backend later touches nothing else.

Collection layout (mirrors the spec):
    workflows/{workflow_id}
    workflows/{workflow_id}/versions/{version_id}
    workflows/{workflow_id}/executions/{execution_id}
"""
from __future__ import annotations

import json
import threading
from abc import ABC, abstractmethod
from typing import Any

from app.config import settings


class Store(ABC):
    # --- workflows ---
    @abstractmethod
    def set_workflow(self, wid: str, data: dict[str, Any]) -> None: ...
    @abstractmethod
    def get_workflow(self, wid: str) -> dict[str, Any] | None: ...
    @abstractmethod
    def list_workflows(self) -> list[dict[str, Any]]: ...

    # --- versions ---
    @abstractmethod
    def add_version(self, wid: str, vid: str, data: dict[str, Any]) -> None: ...
    @abstractmethod
    def get_version(self, wid: str, vid: str) -> dict[str, Any] | None: ...
    @abstractmethod
    def list_versions(self, wid: str) -> list[dict[str, Any]]: ...

    # --- executions ---
    @abstractmethod
    def set_execution(self, wid: str, eid: str, data: dict[str, Any]) -> None: ...
    @abstractmethod
    def get_execution(self, wid: str, eid: str) -> dict[str, Any] | None: ...
    @abstractmethod
    def list_executions(self, wid: str) -> list[dict[str, Any]]: ...

    # --- agent decision log (explainability substrate) ---
    @abstractmethod
    def log_decision(self, wid: str, record: dict[str, Any]) -> None: ...
    @abstractmethod
    def list_decisions(self, wid: str) -> list[dict[str, Any]]: ...


class InMemoryStore(Store):
    """Offline / test backend. Deep-copies via JSON round-trip to mimic the
    serialise-on-write semantics of Firestore."""

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._workflows: dict[str, dict] = {}
        self._versions: dict[str, dict[str, dict]] = {}
        self._executions: dict[str, dict[str, dict]] = {}
        self._decisions: dict[str, list[dict]] = {}

    @staticmethod
    def _copy(d: dict) -> dict:
        return json.loads(json.dumps(d, default=str))

    def set_workflow(self, wid, data):
        with self._lock:
            self._workflows[wid] = self._copy(data)

    def get_workflow(self, wid):
        with self._lock:
            v = self._workflows.get(wid)
            return self._copy(v) if v else None

    def list_workflows(self):
        with self._lock:
            return [self._copy(v) for v in self._workflows.values()]

    def add_version(self, wid, vid, data):
        with self._lock:
            self._versions.setdefault(wid, {})[vid] = self._copy(data)

    def get_version(self, wid, vid):
        with self._lock:
            v = self._versions.get(wid, {}).get(vid)
            return self._copy(v) if v else None

    def list_versions(self, wid):
        with self._lock:
            items = list(self._versions.get(wid, {}).values())
        return sorted((self._copy(i) for i in items), key=lambda x: x.get("created_at", ""))

    def set_execution(self, wid, eid, data):
        with self._lock:
            self._executions.setdefault(wid, {})[eid] = self._copy(data)

    def get_execution(self, wid, eid):
        with self._lock:
            v = self._executions.get(wid, {}).get(eid)
            return self._copy(v) if v else None

    def list_executions(self, wid):
        with self._lock:
            return [self._copy(v) for v in self._executions.get(wid, {}).values()]

    def log_decision(self, wid, record):
        with self._lock:
            self._decisions.setdefault(wid, []).append(self._copy(record))

    def list_decisions(self, wid):
        with self._lock:
            return [self._copy(r) for r in self._decisions.get(wid, [])]


class FirestoreStore(Store):
    def __init__(self) -> None:
        from firebase_admin import firestore

        from app.firebase_admin_app import get_app

        self.db = firestore.client(get_app())

    def _wf(self, wid: str):
        return self.db.collection("workflows").document(wid)

    def set_workflow(self, wid, data):
        self._wf(wid).set(data)

    def get_workflow(self, wid):
        doc = self._wf(wid).get()
        return doc.to_dict() if doc.exists else None

    def list_workflows(self):
        return [d.to_dict() for d in self.db.collection("workflows").stream()]

    def add_version(self, wid, vid, data):
        self._wf(wid).collection("versions").document(vid).set(data)

    def get_version(self, wid, vid):
        doc = self._wf(wid).collection("versions").document(vid).get()
        return doc.to_dict() if doc.exists else None

    def list_versions(self, wid):
        items = [d.to_dict() for d in self._wf(wid).collection("versions").stream()]
        return sorted(items, key=lambda x: x.get("created_at", ""))

    def set_execution(self, wid, eid, data):
        self._wf(wid).collection("executions").document(eid).set(data)

    def get_execution(self, wid, eid):
        doc = self._wf(wid).collection("executions").document(eid).get()
        return doc.to_dict() if doc.exists else None

    def list_executions(self, wid):
        return [d.to_dict() for d in self._wf(wid).collection("executions").stream()]

    def log_decision(self, wid, record):
        self._wf(wid).collection("decisions").add(record)

    def list_decisions(self, wid):
        return [d.to_dict() for d in self._wf(wid).collection("decisions").stream()]


_store: Store | None = None


def get_store() -> Store:
    global _store
    if _store is None:
        if settings.use_firestore:
            try:
                _store = FirestoreStore()
            except Exception as e:  # pragma: no cover
                print(f"[sayso] Firestore init failed ({e}); using in-memory store")
                _store = InMemoryStore()
        else:
            _store = InMemoryStore()
    return _store

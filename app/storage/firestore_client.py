from __future__ import annotations

import json
import logging
import threading
from abc import ABC, abstractmethod
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)


class Store(ABC):
    @abstractmethod
    def set_workflow(self, wid: str, data: dict[str, Any]) -> None: ...
    @abstractmethod
    def get_workflow(self, wid: str) -> dict[str, Any] | None: ...
    @abstractmethod
    def list_workflows(self) -> list[dict[str, Any]]: ...

    @abstractmethod
    def add_version(self, wid: str, vid: str, data: dict[str, Any]) -> None: ...
    @abstractmethod
    def get_version(self, wid: str, vid: str) -> dict[str, Any] | None: ...
    @abstractmethod
    def list_versions(self, wid: str) -> list[dict[str, Any]]: ...

    @abstractmethod
    def set_execution(self, wid: str, eid: str, data: dict[str, Any]) -> None: ...
    @abstractmethod
    def get_execution(self, wid: str, eid: str) -> dict[str, Any] | None: ...
    @abstractmethod
    def list_executions(self, wid: str) -> list[dict[str, Any]]: ...

    @abstractmethod
    def log_decision(self, wid: str, record: dict[str, Any]) -> None: ...
    @abstractmethod
    def list_decisions(self, wid: str) -> list[dict[str, Any]]: ...

    @abstractmethod
    def set_google_tokens(self, uid: str, data: dict[str, Any]) -> None: ...
    @abstractmethod
    def get_google_tokens(self, uid: str) -> dict[str, Any] | None: ...


class InMemoryStore(Store):
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._workflows: dict[str, dict] = {}
        self._versions: dict[str, dict[str, dict]] = {}
        self._executions: dict[str, dict[str, dict]] = {}
        self._decisions: dict[str, list[dict]] = {}
        self._google_tokens: dict[str, dict] = {}

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

    def set_google_tokens(self, uid, data):
        with self._lock:
            self._google_tokens[uid] = self._copy(data)

    def get_google_tokens(self, uid):
        with self._lock:
            v = self._google_tokens.get(uid)
            if v:
                return self._copy(v)
            else:
                return None


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
        if doc.exists:
            return doc.to_dict()
        else:
            return None

    def list_workflows(self):
        return [d.to_dict() for d in self.db.collection("workflows").stream()]

    def add_version(self, wid, vid, data):
        self._wf(wid).collection("versions").document(vid).set(data)

    def get_version(self, wid, vid):
        doc = self._wf(wid).collection("versions").document(vid).get()
        if doc.exists:
            return doc.to_dict()
        else:
            return None

    def list_versions(self, wid):
        items = [d.to_dict() for d in self._wf(wid).collection("versions").stream()]
        return sorted(items, key=lambda x: x.get("created_at", ""))

    def set_execution(self, wid, eid, data):
        self._wf(wid).collection("executions").document(eid).set(data)

    def get_execution(self, wid, eid):
        doc = self._wf(wid).collection("executions").document(eid).get()
        if doc.exists:
            return doc.to_dict()
        else:
            return None

    def list_executions(self, wid):
        return [d.to_dict() for d in self._wf(wid).collection("executions").stream()]

    def log_decision(self, wid, record):
        self._wf(wid).collection("decisions").add(record)

    def list_decisions(self, wid):
        return [d.to_dict() for d in self._wf(wid).collection("decisions").stream()]

    def _user(self, uid: str):
        return self.db.collection("users").document(uid)

    def set_google_tokens(self, uid, data):
        self._user(uid).collection("credentials").document("google").set(data)

    def get_google_tokens(self, uid):
        doc = self._user(uid).collection("credentials").document("google").get()
        return doc.to_dict() if doc.exists else None


_store: Store | None = None
_store_lock = threading.Lock()


def get_store() -> Store:
    global _store
    if _store is not None:
        return _store
    with _store_lock:
        if _store is None:
            if settings.use_firestore:
                try:
                    _store = FirestoreStore()
                except Exception as e:
                    logger.warning("Firestore init failed (%s); using in-memory store", e)
                    _store = InMemoryStore()
            else:
                _store = InMemoryStore()
    return _store
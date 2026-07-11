"""Connector registry — resolve connectors by name only.

The execution engine imports THIS, never a concrete connector, keeping the
whole library swappable.
"""
from __future__ import annotations

from app.connectors.base import Connector, CredentialStore
from app.connectors import library

_CONNECTOR_CLASSES: dict[str, type[Connector]] = {
    cls.name: cls
    for cls in [
        library.GmailTrigger,
        library.GmailSend,
        library.DriveUpload,
        library.SheetsAppend,
        library.SheetsReadRows,
        library.SlackNotify,
        library.HTTPRequest,
        library.PDFExtractText,
        library.LLMExtractFields,
    ]
}

_credentials = CredentialStore()


def has_connector(name: str) -> bool:
    return name in _CONNECTOR_CLASSES


def available() -> list[str]:
    return sorted(_CONNECTOR_CLASSES)


def resolve(name: str) -> Connector:
    if name not in _CONNECTOR_CLASSES:
        raise KeyError(f"unknown connector '{name}'")
    return _CONNECTOR_CLASSES[name](_credentials)

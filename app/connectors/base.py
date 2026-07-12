from __future__ import annotations
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ConnectorResult:
    output: Any = None
    status: str = "succeeded"
    error: str | None = None
    meta: dict[str, Any] = field(default_factory=dict)


_GOOGLE_PROVIDERS = {"gmail", "drive", "sheets"}


class CredentialStore:
    """Resolves an access token for a connector to use.

    Gmail/Drive/Sheets go through the real Google OAuth flow
    (app/google_oauth.py) when a `uid` is supplied and that user has
    connected their Google account; everything else (and any provider with
    no uid/connection) falls back to a stub env-var token, keeping offline
    dev/tests working without OAuth.
    """

    def token(self, provider: str, uid: str | None = None) -> str:
        if uid and provider.lower() in _GOOGLE_PROVIDERS:
            from app.google_oauth import GoogleOAuthError, get_access_token

            try:
                return get_access_token(uid)
            except GoogleOAuthError:
                pass
        return os.getenv(f"{provider.upper()}_TOKEN", f"stub-token-{provider}")


class ConnectorError(RuntimeError):
    pass


class Connector(ABC):
    name: str = "Connector"

    def __init__(self, credentials: CredentialStore | None = None) -> None:
        self.credentials = credentials or CredentialStore()

    @abstractmethod
    def run(self, config: dict, context: dict) -> ConnectorResult:
        pass

    @abstractmethod
    def mock(self, config: dict, context: dict) -> ConnectorResult:
        pass

    def execute(self, config: dict, context: dict, dry_run: bool) -> ConnectorResult:
        if dry_run:
            return self.mock(config, context)
        else:
            self.run(config, context)


class MockConnector:
    def __init__(self, inner: Connector) -> None:
        self.inner = inner
        self.name = inner.name

    def execute(self, config: dict, context: dict, dry_run: bool = True) -> ConnectorResult:
        return self.inner.mock(config, context)
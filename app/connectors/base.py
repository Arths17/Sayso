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


class CredentialStore:
    def token(self, provider: str) -> str:
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
        return self.mock(config, context) if dry_run else self.run(config, context)


class MockConnector:
    def __init__(self, inner: Connector) -> None:
        self.inner = inner
        self.name = inner.name

    def execute(self, config: dict, context: dict, dry_run: bool = True) -> ConnectorResult:
        return self.inner.mock(config, context)
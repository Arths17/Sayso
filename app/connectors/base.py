"""Connector base class + credential stubbing.

The execution engine NEVER imports a concrete connector — it resolves by name
from the registry. Every connector implements both a real `run()` and a
`mock()` returning realistic fake data (used by dry-run and the MockConnector
wrapper), so the two code paths stay interface-identical.
"""
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
    """Stub OAuth handling — real flows are out of scope for the MVP.
    Tokens come from env vars keyed by provider name."""

    def token(self, provider: str) -> str:
        return os.getenv(f"{provider.upper()}_TOKEN", f"stub-token-{provider}")


class ConnectorError(RuntimeError):
    pass


class Connector(ABC):
    """A connector executes one node against an external service."""

    name: str = "Connector"

    def __init__(self, credentials: CredentialStore | None = None) -> None:
        self.credentials = credentials or CredentialStore()

    @abstractmethod
    def run(self, config: dict, context: dict) -> ConnectorResult:
        """Real execution — hits the external API."""

    @abstractmethod
    def mock(self, config: dict, context: dict) -> ConnectorResult:
        """Realistic fake response — used in dry-run / tests."""

    def execute(self, config: dict, context: dict, dry_run: bool) -> ConnectorResult:
        return self.mock(config, context) if dry_run else self.run(config, context)


class MockConnector:
    """Wrapper that shadows any real connector's interface but always mocks.
    Used to force dry-run behaviour regardless of the underlying connector."""

    def __init__(self, inner: Connector) -> None:
        self.inner = inner
        self.name = inner.name

    def execute(self, config: dict, context: dict, dry_run: bool = True) -> ConnectorResult:
        return self.inner.mock(config, context)

"""Force the offline stub LLM, in-memory store, and disabled auth/OAuth
regardless of a local .env, so the suite stays deterministic and doesn't hit
real OpenRouter/Firestore/Google (including billed Firestore operations)."""
import os

import pytest

os.environ["OPENROUTER_API_KEY"] = ""
os.environ["SAYSO_AUTH_DISABLED"] = "true"
os.environ["GOOGLE_OAUTH_CLIENT_ID"] = ""
os.environ["GOOGLE_OAUTH_CLIENT_SECRET"] = ""
os.environ["FIREBASE_SERVICE_ACCOUNT_JSON"] = ""
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = ""


@pytest.fixture
def fake_slack(monkeypatch):
    """Real (non-dry-run) SlackNotify calls hit slack.com; this fixture fakes
    a successful chat.postMessage response instead, so tests can exercise a
    real (non-mocked) connector run without a network call."""
    import httpx as httpx_module

    class FakeResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {"ok": True, "ts": "123.456"}

    class FakeClient:
        def __init__(self, *a, **k):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *a):
            pass

        def post(self, *a, **k):
            return FakeResponse()

    monkeypatch.setenv("SLACK_TOKEN", "xoxb-fake-test-token")
    monkeypatch.setattr(httpx_module, "Client", FakeClient)

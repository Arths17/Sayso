# Sayso — AI Workflow Builder (Backend)

Natural-language → automation. "Cursor for automation." **Backend only** — no UI.
A UI team can build React Flow visualisation purely off `GET /workflows/{id}`
(the `WorkflowSpec` JSON) plus the execution logs / status polling.

## Architecture

```
prompt ─▶ Planner ─▶ Critic ─▶ (clarify loop) ─▶ Validator ─▶ Compiler(DAG) ─▶ Executor
                                                                                   │
                                          Self-Healing agent ◀── node failure ─────┤
                                          Explainer ◀── execution logs / reasoning ─┘
```

| Module | File | Role |
|--------|------|------|
| Planner | `app/agents/planner.py` | NL prompt → `WorkflowSpec` JSON (with per-step hidden `reasoning`) |
| Critic | `app/agents/critic.py` | finds missing/ambiguous fields → `needs_clarification` questions |
| Validator | `app/agents/validator.py` | **deterministic** graph check vs connector registry, refs, cycles |
| Compiler | `app/compiler/graph_builder.py` | `WorkflowSpec` → executable `networkx` DAG (conditionals & loops first-class) |
| Executor | `app/engine/executor.py` | async DAG walk, dry-run, per-node persistence, resumable |
| Healer | `app/agents/healer.py` | failed node → proposed patch + diff (never auto-applies) |
| Explainer | `app/agents/explainer.py` | node id → one-sentence plain-English rationale |
| Connectors | `app/connectors/` | base + registry + 9 MVP connectors, each with mock mode |
| Storage | `app/storage/` | Firestore client + in-memory fallback + append-only versions |
| LLM | `app/llm/client.py` | single OpenRouter gateway + offline stub, JSON validate + retry |

Every LLM call is routed through `app/llm/client.py`, validated against a
Pydantic schema, and retried (up to 2×) feeding the error back on failure.
Every agent decision is logged to the store for explainability & history.

## Quick start (offline — no keys needed)

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt

pytest -q            # 10 e2e tests: build→clarify→dry-run→explain→heal→versions
python seed.py       # create example workflows (invoice / loop / clarify / self-heal)
uvicorn app.main:app --reload --port 8000
```

Then follow **`demo_script.md`** for the full curl-driven demo arc.

With no credentials, the backend transparently uses a **deterministic stub LLM**
and an **in-memory store**, so the entire pipeline runs end-to-end in CI. Set the
env vars below to switch to real services — no code changes.

## Environment variables

| Var | Purpose | Default |
|-----|---------|---------|
| `OPENROUTER_API_KEY` | Enables real LLM calls via OpenRouter | unset → stub LLM |
| `SAYSO_LLM_MODEL` | Model slug (confirm on openrouter.ai/models) | `anthropic/claude-sonnet-4.5` |
| `SAYSO_LLM_MAX_RETRIES` | JSON-validation retries | `2` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Firebase service-account JSON | unset → in-memory |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Inline service-account JSON (for Vercel) | unset |
| `FIREBASE_PROJECT_ID` | Firestore project id | unset |
| `SAYSO_FORCE_MOCK_CONNECTORS` | Force all connectors to mock (dry-run) | `true` |
| `<PROVIDER>_TOKEN` | Stub OAuth token per connector provider | `stub-token-*` |

Firestore layout: `workflows/{id}`, `workflows/{id}/versions/{vid}`,
`workflows/{id}/executions/{eid}`, `workflows/{id}/decisions/*`.

## API surface

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | health check (verify on Vercel first) |
| POST | `/workflows/generate` | prompt → planner → critic → (clarify \| validated) |
| POST | `/workflows/{id}/clarify` | answer critic questions, re-plan |
| POST | `/workflows/{id}/edit` | NL edit → new version + diff |
| GET | `/workflows/{id}` | full workflow spec (UI reads this) |
| POST | `/workflows/{id}/dry-run` | execute with mocked connectors |
| POST | `/workflows/{id}/run` | execute for real (triggers healer on failure) |
| POST | `/workflows/{id}/executions/{eid}/heal` | approve/reject a self-heal patch |
| GET | `/workflows/{id}/status` | poll execution state per node (serverless default) |
| GET | `/workflows/{id}/versions` | list version history |
| POST | `/workflows/{id}/revert/{version}` | revert (append-only) |
| GET | `/workflows/{id}/nodes/{node_id}/explain` | plain-English node rationale |
| WS | `/workflows/{id}/stream` | optional stretch goal — persistent servers only |

## Deploying to Vercel

- Entry point: **`api/index.py`** exports the FastAPI ASGI `app` (with a Mangum
  handler fallback); `vercel.json` routes all traffic to it via `@vercel/python`.
- **Verify `/health` first.** After `vercel deploy`, `curl https://<app>.vercel.app/health`
  should return `{"status":"ok",...}` before demoing anything else.
- **What had to be adapted for serverless:**
  - **No WebSockets** on Vercel functions → the default realtime path is polling
    `GET /workflows/{id}/status`. The `/stream` WS endpoint is included but only
    works on a persistent server. **Preferred path for a future UI:** subscribe
    directly to Firestore real-time listeners instead of polling this API.
  - **Function timeouts** (10s Hobby / up to 300s Pro) → the executor persists
    state to the store after **every node**, so a long/looping/self-healing run
    is resumable across invocations (re-invoke `run` / `heal`; completed nodes
    are skipped) rather than needing one continuous process.
  - Use `FIREBASE_SERVICE_ACCOUNT_JSON` (inline) rather than a file path, since
    serverless functions have no persistent local disk.

> Note: `/health` deploy verification is documented and locally confirmed; run
> `vercel deploy` with your account to confirm live, then check the URL above.

## Connectors (MVP)

`GmailTrigger`, `GmailSend`, `DriveUpload`, `SheetsAppend`, `SheetsReadRows`,
`SlackNotify`, `HTTPRequest`, `PDFExtractText`, `LLMExtractFields`. Each has a
real `run()` (behind the `CredentialStore` OAuth stub) and a realistic `mock()`.
The executor resolves connectors **by name from the registry** — it never imports
a concrete connector, so the library is fully swappable.

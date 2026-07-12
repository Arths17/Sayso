# Sayso

Turn natural language into executable automation workflows.

Sayso is an AI-powered workflow engine. Give it a prompt, and it builds a structured `WorkflowSpec`, checks it, compiles it into a directed graph, and runs it through a connector system.

The backend is a REST API that returns the full `WorkflowSpec` as JSON, so a frontend (React Flow, for example) can render workflows without any extra backend logic. Execution history, versions, and status updates all come through the same API.

The core idea: AI plans the workflow, deterministic code validates and runs it. Every decision the AI makes gets stored, so a generated workflow can be inspected, explained, or revised later, instead of just executed and forgotten.

---

## What is Sayso?

"Cursor for automation" is the closest comparison. Instead of dragging and wiring blocks together like n8n, Zapier, or Make, you describe what you want and the AI builds, tests, and runs it.

**Example prompt:**

> "Whenever I receive an invoice PDF in Gmail, extract the invoice number, total amount, and due date, save the PDF to Google Drive, append the data to Google Sheets, and send me a Slack message."

**Generated workflow:**

```
Gmail Trigger
   │
Download Attachment
   │
Extract PDF Text
   │
AI Information Extraction
   │
Upload PDF to Google Drive
   │
Append Row to Google Sheets
   │
Send Slack Notification
```

Click Run, and it works.

### Demo narrative

Build, then refine ("only notify me if it's over $5,000"), then understand (explain why a node exists), then recover (the Self-Healing Agent proposes a fix for a broken step), then run it for real.

Each of those stages is something you can actually see and interact with, not one hardcoded happy path pretending to be several:

* **Conditions** — "If the invoice is over $5,000, send it to my manager, otherwise archive it" compiles into a branch.
* **Loops** — "For every row in this spreadsheet, generate an email and send it" compiles into a `for_each` node.
* **Human approval** — "Let me approve before sending" pauses execution until you confirm.
* **AI error recovery** — transient failures (rate limits, expired logins) get retried automatically. Structural failures go to the Self-Healing Agent, which proposes a diff for you to approve — it doesn't patch things on its own.
* **General AI steps** — extraction, summarization, classification, translation, sentiment analysis. These are workflow steps like any other, not special-cased rules bolted on.

---

## Architecture

```
prompt
   │
   ▼
Planner
   │
   ▼
Critic
   │
   ├── needs clarification ───────► user answers ───► Planner
   │
   ▼
Validator
   │
   ▼
Compiler (DAG)
   │
   ▼
Executor
   │
   ├── execution failure ───────► Healer
   │
   └── execution logs ──────────► Explainer
```

### Components

| Component  | Location                        | Responsibility                                                                                       |
| ---------- | -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Planner    | `app/agents/planner.py`         | Turns a prompt into a structured `WorkflowSpec`. Each step carries hidden reasoning used for debugging. |
| Critic     | `app/agents/critic.py`          | Checks the generated workflow for ambiguity or gaps, and asks for clarification when it needs to.       |
| Validator  | `app/agents/validator.py`       | Deterministic checks — connectors, references, graph structure, cycles, schema — before anything runs. |
| Compiler   | `app/compiler/graph_builder.py` | Turns a validated workflow into a `networkx` DAG, with branching and loops.                             |
| Executor   | `app/engine/executor.py`        | Runs workflows async, supports dry runs, persists node state, can resume an interrupted execution.      |
| Healer     | `app/agents/healer.py`          | Suggests a patch and diff when execution fails. Never applies fixes on its own.                          |
| Explainer  | `app/agents/explainer.py`       | Writes a short plain-English explanation for any node, using stored reasoning and execution history.     |
| Connectors | `app/connectors/`               | The connector registry plus the built-in connectors. Each supports real execution and a mock mode.       |
| Storage    | `app/storage/`                  | Firestore in production, in-memory for local dev and tests. History is append-only.                      |
| LLM Client | `app/llm/client.py`             | The one place all LLM calls go through — retries, schema validation, offline fallback.                   |

### Design notes

Every LLM request goes through `app/llm/client.py`. Responses get validated against Pydantic models before they're accepted. If validation fails, the error goes back to the model along with the original response, up to two retries, so it can fix itself.

Planner, critic, validator, and healer decisions are all recorded in storage. That's what lets you go back and see how a workflow evolved, why a particular decision got made, or debug something odd — without having to guess based on generated text alone.

---

## Getting started

The whole thing runs offline. No API keys, no cloud credentials needed — Sayso falls back to a deterministic stub LLM, in-memory storage, and mock connectors. Full pipeline, works locally and in CI.

### Installation

```bash
python3 -m venv .venv
. .venv/bin/activate

pip install -r requirements.txt

pytest -q
python seed.py

uvicorn app.main:app --reload --port 8000
```

The test suite covers the full workflow lifecycle: generation, clarification, validation, dry-run execution, explanations, self-healing, approvals, version history, OAuth flows.

`seed.py` creates a handful of example workflows — invoice processing, loops, clarification examples, self-healing scenarios.

Once the server's up, `demo_script.md` walks through the API end to end.

---

## Environment variables

The app checks for real cloud services and falls back to local implementations when it doesn't find them, so you don't need anything configured to start developing.

| Variable                         | Description                                                       | Default                                       |
| --------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| `OPENROUTER_API_KEY`             | Enables OpenRouter instead of the stub LLM.                        | Stub LLM                                        |
| `SAYSO_LLM_MODEL`                | Model used for planning and reasoning.                             | `nvidia/nemotron-3-super-120b-a12b:free`        |
| `SAYSO_LLM_MAX_RETRIES`          | Retries after schema validation failures.                          | `2`                                             |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to a Firebase service account file.                           | In-memory storage                               |
| `FIREBASE_SERVICE_ACCOUNT_JSON`  | Inline Firebase credentials (handy on Vercel).                     | Disabled                                        |
| `FIREBASE_PROJECT_ID`            | Firestore project ID.                                              | Disabled                                        |
| `SAYSO_AUTH_DISABLED`            | Overrides Firebase auth checks.                                    | Follows Firestore config                        |
| `SAYSO_FORCE_MOCK_CONNECTORS`    | Forces all connectors into mock mode.                              | `false`                                         |
| `SAYSO_LOCAL_FALLBACK_ENABLED`   | Falls back to a local model if OpenRouter is unreachable.          | Enabled                                         |
| `SAYSO_LOCAL_FALLBACK_MODEL`     | Local fallback model.                                              | `Qwen/Qwen2.5-0.5B-Instruct`                    |
| `GOOGLE_OAUTH_CLIENT_ID`         | OAuth client for Google-based connectors.                          | Unset                                           |
| `GOOGLE_OAUTH_CLIENT_SECRET`     | OAuth client secret.                                                | Unset                                           |
| `GOOGLE_OAUTH_REDIRECT_URI`      | Redirect URI registered with Google OAuth.                         | `http://localhost:8000/oauth/google/callback`   |
| `<PROVIDER>_TOKEN`               | Stub token connectors use during development.                      | `stub-token-*`                                  |

### Firestore structure

```
workflows/{id}
workflows/{id}/versions/{version}
workflows/{id}/executions/{execution}
workflows/{id}/decisions/*
users/{uid}/credentials/google
```

Versions are append-only, so old revisions stick around for comparison or rollback.

---

## API

Most of what you'll do with Sayso is: generate a workflow, review it, run it. The backend is built so a frontend can construct its whole UI from the workflow spec and execution state these endpoints return.

| Method | Endpoint                                   | Description                                                                              |
| ------ | ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| GET    | `/health`                                  | Basic health check — good for confirming a deployment before testing anything else.        |
| GET    | `/oauth/google/start`                      | Starts the Google OAuth flow for Gmail, Drive, and Sheets.                                 |
| GET    | `/oauth/google/status`                     | Whether the current user has a Google account connected.                                   |
| GET    | `/oauth/google/callback`                   | Handles Google's OAuth callback, exchanges the code, stores the tokens.                    |
| POST   | `/workflows/generate`                      | Generates a workflow from a prompt. Returns either a validated workflow or clarification questions. |
| POST   | `/workflows/{id}/clarify`                  | Submits answers to clarification questions, regenerates the workflow.                      |
| POST   | `/workflows/{id}/edit`                     | Applies a natural-language edit to an existing workflow, creates a new version.             |
| GET    | `/workflows/{id}`                          | The full `WorkflowSpec`. This is what a frontend should use to render the workflow.         |
| POST   | `/workflows/{id}/dry-run`                  | Runs the workflow with mock connectors — no external services needed.                       |
| POST   | `/workflows/{id}/run`                      | Runs the workflow for real. A failure kicks off self-healing.                              |
| POST   | `/workflows/{id}/executions/{eid}/heal`    | Accept or reject a suggested self-healing patch.                                            |
| POST   | `/workflows/{id}/executions/{eid}/approve` | Continues execution past a `human_approval` node.                                           |
| GET    | `/workflows/{id}/status`                   | Current execution status per node — the way to monitor a run on serverless.                 |
| GET    | `/workflows/{id}/versions`                 | Every saved version of a workflow.                                                          |
| POST   | `/workflows/{id}/revert/{version}`         | Reverts to a previous version by creating a new one; history stays intact.                  |
| GET    | `/workflows/{id}/nodes/{node_id}/explain`  | A short explanation of why a given node exists.                                             |
| WS     | `/workflows/{id}/stream`                   | Optional WebSocket endpoint, for servers that stay running.                                 |

### Authentication

Most workflow endpoints expect a Firebase ID token:

```text
Authorization: Bearer <Firebase ID token>
```

This turns on automatically once Firestore credentials are configured. Locally, it's off by default so you can run the backend without having to touch the Firebase.

---

## Deploying to Vercel

The app runs as a serverless FastAPI app. `api/index.py` exports the ASGI application, and `vercel.json` routes everything through `@vercel/python`.

After deploying, check the health endpoint:

```bash
curl https://<your-app>.vercel.app/health
```

You should get:

```json
{
  "status": "ok"
}
```

If that works, the rest of the API should too.

### Notes for serverless

Running workflows inside serverless functions comes with a few constraints, and the executor is built around them.

**No WebSockets.** Vercel Functions don't support long-lived connections, so the default is polling:

```text
GET /workflows/{id}/status
```

If your frontend already talks to Firestore, subscribing to its realtime listeners directly beats polling the API.

**Execution time limits.** Serverless functions time out, so long workflows can't assume they'll finish in one invocation. The executor saves state after every completed node — if a function times out, running the workflow again picks up from the last unfinished node instead of starting over. That also happens to work well for loops and human-approval steps.

**Credentials.** Serverless functions don't have persistent local storage, so Firebase credentials need to come from environment variables. `FIREBASE_SERVICE_ACCOUNT_JSON` is usually easier than pointing at a local credentials file.

---

## Built-in connectors

* Gmail Trigger
* Gmail Send
* Google Drive Upload
* Google Sheets Append
* Google Sheets Read Rows
* Slack Notify
* HTTP Request
* PDF Extract Text
* LLM Extract Fields

Each one implements `run()` for real execution and `mock()` for testing and dry runs, so you can test a full workflow locally without touching external services.

The executor never imports a connector directly — it resolves connectors through the registry at runtime, so you can add, swap, or drop a connector without touching the execution engine.

---

## Development notes

A few decisions shaped this project.

AI plans workflows; it doesn't execute them — that split is the whole point. Validation is deterministic, so a bad workflow gets caught before it runs, not halfway through. Every AI decision gets stored, mostly because I got tired of debugging generated behavior with no idea why the model did what it did. History is append-only, so edits and rollbacks don't need special-case code. Connectors sit behind a registry, so adding one doesn't mean touching the execution engine.

Planning can stay a little loose and experimental. Execution can't.

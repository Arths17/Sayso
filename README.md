# Sayso

Turn natural language into executable automation workflows.

Sayso is an AI-powered workflow engine that takes a user's prompt, converts it into a structured workflow, validates it, compiles it into a directed graph, and executes it through a connector system.

The backend exposes a REST API that returns a complete `WorkflowSpec` JSON object, making it easy for a frontend (for example, React Flow) to visualize workflows without needing any additional backend logic. Execution history, workflow versions, and status updates are all available through the API as well.

The project is built around the idea that AI should **plan** workflows, while deterministic code is responsible for **validating and executing** them. Every AI decision is stored so generated workflows can be inspected, explained, and revised later.

---

# Architecture

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

## Components

| Component  | Location                        | Responsibility                                                                                                                                                 |
| ---------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planner    | `app/agents/planner.py`         | Converts a natural-language prompt into a structured `WorkflowSpec`. Each generated step also includes hidden reasoning used for debugging and explainability. |
| Critic     | `app/agents/critic.py`          | Reviews the generated workflow for ambiguity or missing information and requests clarification when needed.                                                    |
| Validator  | `app/agents/validator.py`       | Performs deterministic validation of connectors, references, graph structure, cycles, and schema correctness before execution.                                 |
| Compiler   | `app/compiler/graph_builder.py` | Converts a validated workflow into an executable `networkx` DAG with support for branching and loops.                                                          |
| Executor   | `app/engine/executor.py`        | Executes workflows asynchronously, supports dry runs, persists node state, and allows interrupted executions to resume later.                                  |
| Healer     | `app/agents/healer.py`          | When execution fails, generates a suggested patch and diff for review. Fixes are never applied automatically.                                                  |
| Explainer  | `app/agents/explainer.py`       | Produces a short plain-English explanation for any workflow node using stored reasoning and execution history.                                                 |
| Connectors | `app/connectors/`               | Contains the connector registry along with the built-in connector implementations. Every connector supports both real execution and mock mode for testing.     |
| Storage    | `app/storage/`                  | Uses Firestore in production with an in-memory fallback for local development and testing. Workflow history is append-only.                                    |
| LLM Client | `app/llm/client.py`             | Central entry point for all language model interactions. Handles retries, schema validation, and offline fallback models.                                      |

---

## Design Notes

Every LLM request goes through `app/llm/client.py`.

Responses are validated against Pydantic models before being accepted. If validation fails, the response is sent back to the model (up to two retries) together with the validation error so it can correct itself.

Each planner, critic, validator, and healer decision is recorded in storage. This makes it possible to inspect how a workflow evolved, explain why particular decisions were made, and debug unexpected behavior without relying solely on generated text.

---

# Getting Started

The project can run completely offline.

Without any API keys or cloud credentials, Sayso automatically switches to:

* a deterministic stub LLM
* an in-memory storage backend
* mock connector implementations

This allows the full workflow pipeline to run locally and inside CI without requiring any external services.

## Installation

```bash
python3 -m venv .venv
. .venv/bin/activate

pip install -r requirements.txt

pytest -q
python seed.py

uvicorn app.main:app --reload --port 8000
```

The test suite covers the complete workflow lifecycle, including:

* workflow generation
* clarification
* validation
* dry-run execution
* explanations
* self-healing
* approvals
* version history
* OAuth flows

Running `seed.py` creates several example workflows, including invoice processing, loops, clarification examples, and self-healing scenarios.

After starting the server, follow `demo_script.md` for a complete API walkthrough.

---

# Environment Variables

The application automatically detects whether real cloud services are available.

If no credentials are configured, it falls back to local implementations so development remains straightforward.

| Variable                         | Description                                                       | Default                                       |
| -------------------------------- | ----------------------------------------------------------------- | --------------------------------------------- |
| `OPENROUTER_API_KEY`             | Enables OpenRouter instead of the stub language model.            | Stub LLM                                      |
| `SAYSO_LLM_MODEL`                | Model used for planning and reasoning.                            | `nvidia/nemotron-3-super-120b-a12b:free`      |
| `SAYSO_LLM_MAX_RETRIES`          | Number of retries after schema validation failures.               | `2`                                           |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to a Firebase service account file.                          | In-memory storage                             |
| `FIREBASE_SERVICE_ACCOUNT_JSON`  | Inline Firebase credentials (useful on Vercel).                   | Disabled                                      |
| `FIREBASE_PROJECT_ID`            | Firestore project identifier.                                     | Disabled                                      |
| `SAYSO_AUTH_DISABLED`            | Overrides Firebase authentication checks.                         | Follows Firestore configuration               |
| `SAYSO_FORCE_MOCK_CONNECTORS`    | Forces all connectors to use mock implementations.                | `false`                                       |
| `SAYSO_LOCAL_FALLBACK_ENABLED`   | Enables the local language model if OpenRouter cannot be reached. | Enabled                                       |
| `SAYSO_LOCAL_FALLBACK_MODEL`     | Local fallback model.                                             | `Qwen/Qwen2.5-0.5B-Instruct`                  |
| `GOOGLE_OAUTH_CLIENT_ID`         | OAuth client used by Google-based connectors.                     | Unset                                         |
| `GOOGLE_OAUTH_CLIENT_SECRET`     | OAuth client secret.                                              | Unset                                         |
| `GOOGLE_OAUTH_REDIRECT_URI`      | Redirect URI registered with Google OAuth.                        | `http://localhost:8000/oauth/google/callback` |
| `<PROVIDER>_TOKEN`               | Stub token used by connector implementations during development.  | `stub-token-*`                                |

## Firestore Structure

```
workflows/{id}
workflows/{id}/versions/{version}
workflows/{id}/executions/{execution}
workflows/{id}/decisions/*
users/{uid}/credentials/google
```

Workflow versions are append-only so previous revisions remain available for comparison or rollback.
# API

Most interactions with Sayso revolve around generating a workflow, reviewing it, and then executing it. The backend is designed so that a frontend can build its UI entirely from the workflow specification and execution state returned by these endpoints.

| Method | Endpoint                                   | Description                                                                                                                                        |
| ------ | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/health`                                  | Basic health check. Useful for verifying deployments before testing the rest of the API.                                                           |
| GET    | `/oauth/google/start`                      | Starts the Google OAuth flow for Gmail, Drive, and Sheets connectors.                                                                              |
| GET    | `/oauth/google/status`                     | Returns whether the current user has connected a Google account.                                                                                   |
| GET    | `/oauth/google/callback`                   | Handles Google's OAuth callback, exchanges the authorization code, and stores the resulting tokens.                                                |
| POST   | `/workflows/generate`                      | Generates a workflow from a natural-language prompt. Returns either a validated workflow or clarification questions if more information is needed. |
| POST   | `/workflows/{id}/clarify`                  | Submits answers to clarification questions and regenerates the workflow.                                                                           |
| POST   | `/workflows/{id}/edit`                     | Applies a natural-language edit to an existing workflow. A new workflow version is created automatically.                                          |
| GET    | `/workflows/{id}`                          | Returns the complete `WorkflowSpec`. This is the primary endpoint a frontend should use to visualize workflows.                                    |
| POST   | `/workflows/{id}/dry-run`                  | Executes the workflow using mock connector implementations. Useful for testing without external services.                                          |
| POST   | `/workflows/{id}/run`                      | Executes the workflow using real connectors. If execution fails, the self-healing flow is triggered.                                               |
| POST   | `/workflows/{id}/executions/{eid}/heal`    | Accepts or rejects a suggested self-healing patch.                                                                                                 |
| POST   | `/workflows/{id}/executions/{eid}/approve` | Continues execution after a `human_approval` node.                                                                                                 |
| GET    | `/workflows/{id}/status`                   | Returns the current execution status for each node. This is the recommended way to monitor execution on serverless deployments.                    |
| GET    | `/workflows/{id}/versions`                 | Lists every saved version of a workflow.                                                                                                           |
| POST   | `/workflows/{id}/revert/{version}`         | Creates a new version by reverting to a previous one. Existing history is preserved.                                                               |
| GET    | `/workflows/{id}/nodes/{node_id}/explain`  | Returns a short explanation describing why a particular node exists.                                                                               |
| WS     | `/workflows/{id}/stream`                   | Optional WebSocket endpoint for environments with persistent servers.                                                                              |

### Authentication

Most workflow endpoints require a Firebase ID token:

```text
Authorization: Bearer <Firebase ID token>
```

Authentication is automatically enabled when Firestore credentials are configured. During local development, it is disabled by default so the backend can run without Firebase.

---

# Deploying to Vercel

The application is set up to run as a serverless FastAPI application.

`api/index.py` exports the ASGI application, while `vercel.json` routes all incoming requests through `@vercel/python`.

After deployment, verify that everything is working by checking the health endpoint:

```bash
curl https://<your-app>.vercel.app/health
```

You should receive a response similar to:

```json
{
  "status": "ok"
}
```

If the health check succeeds, the rest of the API should be available.

## Notes for Serverless Deployments

Running workflows inside serverless functions introduces a few constraints, so the executor is designed with those in mind.

### No WebSockets

Vercel Functions don't support long-lived WebSocket connections.

For that reason, the default approach is polling:

```text
GET /workflows/{id}/status
```

If you're building a frontend with Firestore, subscribing directly to Firestore's realtime listeners is generally a better experience than polling the API.

### Execution Time Limits

Serverless functions have execution time limits, so long-running workflows cannot assume they'll finish in a single invocation.

To work around this, the executor saves execution state after every completed node.

If a function times out, running the workflow again resumes from the last unfinished node instead of restarting from the beginning.

This also works well for workflows containing loops or human approval steps.

### Credentials

Because serverless functions don't have persistent local storage, Firebase credentials should be supplied through environment variables.

Using `FIREBASE_SERVICE_ACCOUNT_JSON` is generally more convenient than referencing a local credentials file.

---

# Built-in Connectors

The backend includes a small collection of connectors that cover common automation tasks:

* Gmail Trigger
* Gmail Send
* Google Drive Upload
* Google Sheets Append
* Google Sheets Read Rows
* Slack Notify
* HTTP Request
* PDF Extract Text
* LLM Extract Fields

Each connector implements both:

* `run()` for real execution
* `mock()` for testing and dry runs

This makes it possible to test complete workflows locally without needing access to external services.

The executor never imports connector implementations directly. Instead, it resolves connectors through the connector registry at runtime, making it straightforward to add, replace, or remove connectors without changing the execution engine.

---

# Development Notes

A few design decisions guided the project:

* AI is responsible for planning workflows, not executing them.
* Validation is deterministic so invalid workflows are caught before execution.
* Every AI decision is stored to make workflows explainable and easier to debug.
* Workflow history is append-only, making edits and rollbacks straightforward.
* Connector implementations are isolated behind a registry, allowing new integrations to be added with minimal changes elsewhere in the codebase.

The goal is to keep the planning layer flexible while ensuring execution remains predictable and reliable.

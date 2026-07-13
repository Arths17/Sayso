# Sayso

AI workflow builder — "Cursor for automation." A user describes an automation in plain English
and the system plans, validates, compiles, and executes it as an executable DAG, instead of
requiring manual drag-and-drop node wiring (n8n/Zapier/Make style).

Example: "Whenever I receive an invoice PDF in Gmail, extract the invoice number, total amount,
and due date, save the PDF to Google Drive, append the data to Google Sheets, and email me a
summary" becomes a working pipeline the user can click Run on.

## Code style

- Do not add comments to code.

## Git commits

- Never add a `Co-Authored-By: Claude` trailer (or any other Claude/Anthropic attribution) to commit messages.

## Core AI pipeline

1. **Planner Agent** (`app/agents/planner.py`) — turns the natural language prompt into a
   structured JSON workflow spec (trigger, ordered steps, conditions, loops, variables).
2. **Critic Agent** (`app/agents/critic.py`) — reviews the plan for ambiguity/missing info and
   can surface a clarifying question instead of guessing.
3. **Validator Agent** (`app/agents/validator.py`) — deterministic, non-LLM check: every node
   exists in the connector library, every variable reference points to a real prior output, no
   unintended cycles.
4. **Workflow Compiler** (`app/compiler/graph_builder.py`) — converts validated JSON into an
   executable DAG. Nodes: `{id, type, config, depends_on, retry_policy}`. Conditionals and loops
   are first-class node types, not bolted on.
5. **Execution Engine** (`app/engine/executor.py`, `app/engine/context.py`) — walks the DAG in
   dependency order, parallelizing where possible. On node failure, pauses and hands off to the
   Self-Healing Agent before giving up.
6. **Self-Healing Agent** (`app/agents/healer.py`) — proposes an actual fix for a broken node
   (e.g. a changed PDF layout) and shows a diff for user approval. Nothing auto-patches without
   approval.
7. **Explainability Layer** (`app/agents/explainer.py`) — per-node "why did you do it this way?"
   answers generated from the planner's original reasoning trace, not invented after the fact.
8. **Version History** (`app/storage/versions.py`) — every edit creates a new diffed version,
   revertible — same mental model as Cursor's undo/diff history, applied to automations.

## Architecture

```text
FastAPI Backend (app/main.py)
        │
        ▼
LLM Planner / Critic / Healer / Explainer (via OpenRouter, app/llm/client.py)
        │
        ▼
Workflow Compiler (app/compiler)
        │
        ▼
Execution Engine (app/engine)
        │
        ▼
Service Connectors (app/connectors) — Gmail, Sheets, Drive, HTTP, PDF, LLM extraction
        │
        ▼
Firebase Firestore (app/storage) — workflows, versions, execution logs
```

React frontend (React Flow + Tailwind + Firebase Auth) is a later phase, not yet in this repo.

## Tech stack

- **Language/API:** Python 3.12, FastAPI + Pydantic v2
- **Database:** Firebase Firestore via `firebase-admin` (`app/storage/firestore_client.py`)
- **LLM:** OpenRouter (OpenAI-compatible endpoint), not a direct Anthropic key — all calls go
  through the single swappable client in `app/llm/client.py`. `app/llm/stub.py` provides a
  mock/stub path for tests and dry-run.
- **Hosting:** Vercel, `@vercel/python` serverless functions (`api/index.py`, `vercel.json`)
- **Execution model:** `asyncio`-based; persists state to Firestore after every node so
  long-running workflows survive across serverless invocations
- **Realtime updates:** polling (`GET /api/workflows/{id}/status`) — Vercel functions can't hold
  persistent WebSocket connections

## Connectors

Defined in `app/connectors/` behind a common interface (`base.py`), looked up via
`registry.py`/`library.py` so the planner/executor only ever deal with registry names, never
implementation details:

- `GmailTrigger` / `GmailSend`
- `DriveUpload`
- `SheetsAppend` / `SheetsReadRows`
- `HTTPRequest` (generic external API call)
- `PDFExtractText`
- `LLMExtractFields` (generic schema-driven AI extraction)

Every connector has a mock-mode implementation for dry-run execution without live credentials.

## API surface

All routes below live under `/api` (e.g. `/api/workflows/generate`) so they don't collide with
the Next.js frontend's own `/workflows` and `/workflows/{id}` pages.

```text
POST   /api/workflows/generate        # prompt -> planner -> critic -> (clarify | validated JSON)
POST   /api/workflows/{id}/clarify    # answer critic's questions, re-run planner+critic
POST   /api/workflows/{id}/edit       # natural language edit -> new version, diff returned
POST   /api/workflows/{id}/dry-run    # execute with mocked connectors
POST   /api/workflows/{id}/run        # execute for real
GET    /api/workflows/{id}/versions   # list version history
POST   /api/workflows/{id}/revert/{version}
GET    /api/workflows/{id}/nodes/{node_id}/explain
GET    /api/workflows/{id}/status     # poll execution status per node
GET    /api/health
```

## Advanced features to keep in mind when extending the pipeline

- AI error recovery: transient failures get retry/backoff; structural failures escalate to the
  Self-Healing Agent
- Variables: steps reference prior step outputs
- Conditions: compiled into branching nodes (e.g. amount-based routing)
- Loops: compiled into `for_each` node types
- Human approval gates: execution pauses until the user approves a step (e.g. before sending)
- Dry-run/simulation mode: runs against mocked connector responses, no live API dependency
- General AI capabilities (extraction, summarization, classification, translation, sentiment)
  are workflow steps, not hardcoded rules

## Testing

- `tests/test_e2e.py`, `conftest.py` — run with `pytest`
- `seed.py` — seed data for local/dev Firestore

## Demo narrative (for context when working on UX/behavior)

Build → refine ("only notify me if it's over $5,000") → understand (explain a node's reasoning)
→ recover (Self-Healing Agent proposes a fix for a broken step) → execute for real. The product
differentiator is that all of this is visible and interactive, not just a single hardcoded
happy-path run.

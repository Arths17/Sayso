# Sayso Demo Script — build → refine → explain → break → self-heal → run

Every step is a real API call. Start the server first:

```bash
. .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

All calls below hit `http://localhost:8000`. The backend runs fully offline
(deterministic stub LLM + in-memory store) unless `OPENROUTER_API_KEY` and
Firebase creds are set — the demo arc is identical either way.

---

## 0. Health check (verify first — mirrors the Vercel smoke test)

```bash
curl -s localhost:8000/health | jq
# { "status": "ok", "service": "sayso", "connectors": [ ... ] }
```

## 1. BUILD — natural language → validated workflow

```bash
curl -s -X POST localhost:8000/workflows/generate \
  -H 'content-type: application/json' \
  -d '{"prompt":"When an invoice email arrives, extract vendor, amount and due date. If the amount is greater than 5000 require human approval. Record it to the finance sheet and notify #finance."}' | jq

# -> { "workflow_id": "wf_xxx", "status": "validated", "spec": { nodes: [...] } }
```

Save the id:

```bash
WID=wf_xxx
```

Note the conditional (`check_amount`), the human-approval gate (`approve_large`),
and the `notify` step — all first-class nodes.

## 2. REFINE — a clarification round (different workflow)

```bash
# A Slack prompt with no channel makes the critic ask a question:
curl -s -X POST localhost:8000/workflows/generate \
  -H 'content-type: application/json' \
  -d '{"prompt":"Send a Slack message whenever a new signup happens"}' | jq
# -> status: "needs_clarification", clarification.questions: [...]

WID2=wf_yyy   # id from above
curl -s -X POST localhost:8000/workflows/$WID2/clarify \
  -H 'content-type: application/json' \
  -d '{"answers":{"which channel":"post to #signups"}}' | jq
# -> status: "validated"
```

## 3. EDIT — natural-language edit creates a new version + diff

```bash
curl -s -X POST localhost:8000/workflows/$WID/edit \
  -H 'content-type: application/json' \
  -d '{"instruction":"only run this if amount > 500"}' | jq
# -> { version: "ver_...", diff: { changed: {...} }, spec: {...} }
```

## 4. EXPLAIN — why does a node exist?

```bash
curl -s localhost:8000/workflows/$WID/nodes/check_amount/explain | jq
# -> { "node_id": "check_amount", "explanation": "Large invoices need a human sign-off ..." }
```

## 5. DRY-RUN — mocked connectors, full execution path

```bash
curl -s -X POST localhost:8000/workflows/$WID/dry-run | jq
# -> { execution_id: "ex_...", state: "completed" }

EX=ex_...
curl -s "localhost:8000/workflows/$WID/status?execution_id=$EX" | jq '.logs[] | {node_id, status}'
```

## 6. BREAK + SELF-HEAL — real run of a broken node

The seed script creates a Slack node with no channel. Real-run it:

```bash
python seed.py            # prints a "[self-heal demo] wf_zzz" id
WID3=wf_zzz

curl -s -X POST localhost:8000/workflows/$WID3/run | jq
# -> state: "awaiting_heal_approval"  (healer proposed a patch, did NOT auto-apply)

# inspect the proposed patch on the execution:
EX3=$(curl -s "localhost:8000/workflows/$WID3/status" | jq -r .id)
curl -s "localhost:8000/workflows/$WID3/status?execution_id=$EX3" | jq '.pending_heal'
# -> { patch: { config: { channel: "#general" } }, diff_explanation: "..." }

# approve the patch -> re-runs just the affected node and continues:
curl -s -X POST localhost:8000/workflows/$WID3/executions/$EX3/heal \
  -H 'content-type: application/json' -d '{"approve":true}' | jq
# -> { applied: true, state: "completed" }
```

## 7. VERSION HISTORY — list + revert (append-only)

```bash
curl -s localhost:8000/workflows/$WID/versions | jq '.[] | {id, message}'

V0=$(curl -s localhost:8000/workflows/$WID/versions | jq -r '.[0].id')
curl -s -X POST localhost:8000/workflows/$WID/revert/$V0 | jq
# -> { reverted_to: "ver_initial", new_version: "ver_new" }  (history kept intact)
```

---

That's the full arc: **build → refine → explain → dry-run → break → self-heal → run → versions**,
entirely through the REST API with no UI.

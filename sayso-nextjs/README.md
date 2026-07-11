# SaySo

Natural language → automation. Describe a workflow in one sentence and SaySo
plans it, renders it as a node graph, and runs it while you watch.

Built at vsHacks 2026.

## Stack

- Next.js 14 (App Router), TypeScript
- Plain CSS (CSS variables + CSS Modules) — no Tailwind, no UI kit
- next/font for Space Grotesk + JetBrains Mono (self-hosted, no layout shift)
- Tabler icon webfont (loaded via CDN in the root layout)

## Routes

| Route          | File                        | Notes                                              |
| -------------- | --------------------------- | --------------------------------------------------- |
| `/`            | `app/page.tsx`              | Marketing hero, server component                    |
| `/auth`        | `app/auth/page.tsx`         | Sign in, server component                           |
| `/loading`     | `app/loading/page.tsx`      | Boot sequence, client component, redirects to /builder |
| `/builder`     | `app/builder/page.tsx`      | The app. Client component, run simulation in React state |
| `/connectors`  | `app/connectors/page.tsx`   | Connector library, server component                 |
| `/runs`        | `app/runs/page.tsx`         | Run history + log detail, server component          |

Shared UI lives in `components/` (`NavBar`, `Logo`, `HeroGlow`, `WNode`).
Design tokens and shared classes live in `app/globals.css`; page-specific
layout rules use CSS Modules (`*.module.css`) next to each page.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Build

```bash
npm run build
npm run start
```

## Notes on the demo data

The builder's run simulation, the connector list, and the run history are
all static/mock data (see `app/builder/run-sequence.ts`, `app/connectors/data.ts`,
`app/runs/data.ts`) — there's no real backend wired up yet. Swapping in a real
LLM planner and execution engine means replacing `startRun()` in
`app/builder/page.tsx` with real API calls; the UI already models the states
(idle / running / done / error) you'd need.

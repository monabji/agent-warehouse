# Agent Warehouse

Agent Warehouse is a polished, self-contained operations floor for collaborating AI agents. It turns work into a live warehouse scene: workers occupy stations, task handoffs travel between them, and every update is recorded in a replayable event timeline.

![Demo mode is the default](https://img.shields.io/badge/mode-demo%20safe-36d399)

## What works today

- Five animated warehouse workers: Foreman, Frontend, Backend, QA, and Research.
- A responsive, accessible warehouse scene with live handoff paths, status states, and reduced-motion support.
- Deterministic simulated agents, work orders, tools, messages, and task lifecycle events.
- Worker inspection, an event feed, pause/resume/speed/reset controls, and a safe sample incident.
- Command simulation: send a worker an update, priority, or pause request and observe the auditable response. Demo mode never accesses a shell, filesystem, agent session, or network.
- Provider-neutral TypeScript contracts and an implementation-ready, configuration-gated Codex/OpenAI provider design.

## Quick start

```bash
git clone https://github.com/monabji/agent-warehouse.git
cd agent-warehouse
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No credentials are required for Demo mode.

## Commands

```bash
npm run dev        # local development server
npm run typecheck  # strict TypeScript check
npm test           # deterministic DemoProvider tests
npm run lint       # ESLint
npm run build      # production build
```

## Architecture

```text
DemoProvider → provider-neutral event reducer → live dashboard → warehouse scene / task queue / event feed

Future live providers:
OpenAI Responses API or a dedicated Codex worker host → server-side normalizer → SSE → browser
```

The current MVP uses a deterministic in-memory `DemoProvider`, which keeps the app useful and safe without external configuration. Its contracts are designed so a durable PostgreSQL event store and server-sent event delivery can be added without changing UI contracts.

See [Architecture](docs/ARCHITECTURE.md), [Demo provider](docs/DEMO_PROVIDER.md), and [Codex provider boundary](docs/CODEX_PROVIDER.md) for the full design.

## Codex integration: intentional boundary

Agent Warehouse does not claim it can observe or control arbitrary tasks already open in Codex Web or Desktop. A future `CodexLocalProvider` should run on a supervised server-side worker that owns the Codex threads it exposes. The browser must never receive API keys, host paths, or arbitrary thread control.

## Deploying

This is a standard Vercel-compatible Next.js application. Import the GitHub repository in Vercel, leave all live-provider variables unset for the safe demo deployment, and deploy. Enable a live provider only after implementing the documented server-side adapter and its approval/rate-limit controls.

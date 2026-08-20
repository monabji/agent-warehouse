# Agent Warehouse plan

## Goal

Ship a responsive, visually polished Next.js MVP that simulates a team of collaborating AI agents in a warehouse, with a provider-neutral event model and a safe Codex integration boundary.

## Phases

1. **Foundation** — complete. TypeScript/Next project, developer tooling, shared domain types, deterministic demo data, and documentation are in place.
2. **Vertical slice** — complete. The dashboard renders a live warehouse scene, event feed, worker inspection, task queue, controls, and simulated user commands.
3. **Provider boundary** — complete for design/MVP. The DemoProvider is implemented; the Codex adapter is deliberately documented and configuration-gated rather than pretending to control arbitrary sessions.
4. **Quality and shipping** — complete for the repository. Type checks, tests, lint, production build, and browser interaction QA passed; CI is committed; the `codex/agent-warehouse` branch is pushed and draft PR #1 is open. Preview deployment is intentionally pending a connected Vercel (or other hosting) project.

## Current decisions

- Build a web app with Next.js App Router, TypeScript, Tailwind CSS, and browser-native animations for the first MVP. This keeps the experience deployable on Vercel without a canvas-engine dependency.
- Use an in-memory, deterministic event stream first; retain a provider-neutral interface so Postgres/Prisma persistence can be added without changing UI contracts.
- Use a high-fidelity demo mode by default. Live provider controls are visibly configuration-gated and server-side only.

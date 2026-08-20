# Agent Warehouse architecture

## Purpose

Agent Warehouse is a provider-neutral event viewer. The warehouse UI renders normalized facts about runs, agents, tasks, messages, tools, artifacts, and user commands; it does not depend on a provider's native event format.

Demo mode is the default and must work without credentials. Live providers are opt-in, server-side, and visibly identified in the UI.

## System shape

```text
Browser (warehouse, task board, replay, worker drawer)
  |  GET snapshot / SSE events / POST command
  v
Next.js server boundary
  |-- auth + validation + command policy + rate limit
  |-- ProviderRegistry -> DemoProvider | OpenAIProvider | CodexLocalProvider
  |-- EventNormalizer -> RunEvent append/broadcast
  `-- repositories -> in-memory MVP | PostgreSQL later

CodexLocalProvider -> dedicated worker host -> Codex SDK/app-server -> allowed workspace
OpenAIProvider     -> OpenAI Responses API -> optional signed webhook
```

The browser never connects directly to OpenAI or Codex and never receives provider credentials. A deployed web frontend cannot launch local Codex by itself: live Codex needs a separately configured worker host with the repository mounted.

## Domain contracts

Core records:

- `Run`: one replayable unit of work and the ordering boundary for events.
- `Agent`: stable worker identity, role, provider reference, capabilities, and current state.
- `Task`: work order with status, assignee IDs, and dependency task IDs.
- `Command`: authenticated user request, target agent, disposition, and provider correlation ID.
- `Artifact`: metadata for a diff, report, file, test result, or link; large content lives outside the event.
- `RunEvent`: immutable, provider-neutral event envelope.

```ts
type AgentState =
  | "idle" | "planning" | "working" | "waiting"
  | "blocked" | "reviewing" | "completed" | "failed";

type EventType =
  | "run.created" | "run.completed" | "run.failed"
  | "agent.created" | "agent.state_changed"
  | "task.created" | "task.updated" | "task.completed" | "task.blocked"
  | "message.sent"
  | "tool.started" | "tool.completed" | "tool.failed"
  | "artifact.created"
  | "user.command.sent" | "user.command.response";

interface RunEvent<T = unknown> {
  schemaVersion: 1;
  eventId: string;          // globally unique; idempotency key
  runId: string;
  sequence: number;         // strictly increasing within a run
  type: EventType;
  occurredAt: string;       // provider time when trustworthy, otherwise ingestion time
  ingestedAt: string;
  source: { provider: string; nativeEventId?: string };
  agentId?: string;
  taskId?: string;
  commandId?: string;
  correlationId?: string;
  causationId?: string;
  payload: T;
}
```

Payloads are discriminated and validated with Zod at the ingestion boundary. Preserve a redacted native payload only in server logs when needed; never forward arbitrary provider payloads, secrets, raw command output, or hidden reasoning to the browser. Stream user-visible messages and reasoning summaries only.

### Ordering and replay invariants

- Assign `sequence` while appending, not in providers. Provider timestamps do not define order.
- Ignore duplicate `eventId` values. Map repeatable native IDs to deterministic event IDs when available.
- A completed item/event is authoritative over earlier deltas.
- Snapshot response includes `lastSequence`; SSE reconnect uses `Last-Event-ID` to request later events.
- Reducers must be deterministic: replaying the same ordered events produces the same UI state.

## Provider interface

```ts
interface AgentProvider {
  readonly id: string;
  capabilities(): Promise<ProviderCapabilities>;
  startRun(input: StartRunInput, sink: EventSink): Promise<ProviderRun>;
  sendCommand(input: ProviderCommand, sink: EventSink): Promise<CommandReceipt>;
  stopRun?(runId: string): Promise<void>;
  dispose?(): Promise<void>;
}
```

Providers emit internal `ProviderEvent` values; only `EventNormalizer` can create `RunEvent`s. Capability checks happen before command acceptance, so the UI can disable unsupported controls rather than fail optimistically.

## DemoProvider

`DemoProvider` is deterministic and has no network or filesystem access.

- A seed plus virtual clock determines worker, task, tool, handoff, and completion events.
- `pause`, `resume`, speed, reset, and sample-incident controls affect the virtual clock.
- Commands use bounded templates keyed by worker role and current task; response timing is seeded.
- Reset creates a new run rather than mutating history.
- Tests use a manual clock and compare the exact normalized event sequence.

## Realtime delivery

Use HTTP `POST` for commands and Server-Sent Events for server-to-browser updates in the MVP:

- `GET /api/runs/:runId` returns the current snapshot and `lastSequence`.
- `GET /api/runs/:runId/events` streams normalized events as SSE; event ID is `sequence`.
- `POST /api/agents/:agentId/commands` validates and enqueues a command, returning `202` plus `commandId`.
- `POST /api/demo/control` changes only the in-memory demo clock.

SSE matches the dominant one-way flow, reconnects naturally, and keeps provider transports private. The server may use a Codex stdio/JSON-RPC stream or OpenAI Responses stream internally. Add browser WebSockets only if later interaction requires true bidirectional low-latency steering.

For longer OpenAI work, background Responses can stream with sequence cursors and resume after a disconnect. An optional webhook should be treated as a completion signal, verified, deduplicated, and converted to the same event log rather than sent directly to clients. See the official [streaming](https://developers.openai.com/api/docs/guides/streaming-responses), [background mode](https://developers.openai.com/api/docs/guides/background), and [webhooks](https://developers.openai.com/api/docs/guides/webhooks) guides.

## Command security

All command routes require an authenticated user and server-side authorization for the run and target agent.

1. Parse with a strict schema; cap text length and reject unknown fields.
2. Create `user.command.sent` before dispatch and an auditable response/failure event afterward.
3. Apply per-user, per-run, and provider-wide token-bucket limits; also cap concurrent provider turns.
4. Treat command text as untrusted model input, never as shell, a file path, or a provider method name.
5. Separate harmless status requests from mutating instructions. Mutation requires provider capability plus explicit approval policy.
6. Enforce an explicit workspace root, sandbox, tool allowlist, timeout, and output-size limit on the worker host.
7. Never auto-approve destructive commands, network access, credential access, deploys, pushes, or writes outside the configured workspace.
8. Return `429` with retry information on local throttling. Respect upstream retry guidance and avoid unbounded retries.

OpenAI recommends human review for code generation, bounded inputs, and per-user usage limits; API keys must stay in environment variables or a secret manager. See [safety best practices](https://developers.openai.com/api/docs/guides/safety-best-practices), [rate limits](https://developers.openai.com/api/docs/guides/rate-limits), and [production best practices](https://developers.openai.com/api/docs/guides/production-best-practices).

## Configuration boundary

Configuration is read and validated once on the server. Placeholder names (values belong in deployment secrets, never Git):

```dotenv
AGENT_PROVIDER=demo
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-terra
OPENAI_WEBHOOK_SECRET=

CODEX_ENABLED=false
CODEX_WORKSPACE_ROOT=
CODEX_MODEL=gpt-5.6-terra
CODEX_SANDBOX=readOnly
CODEX_APPROVAL_POLICY=onRequest
CODEX_APP_SERVER_TRANSPORT=stdio
CODEX_APP_SERVER_URL=

COMMAND_RATE_LIMIT_PER_MINUTE=10
PROVIDER_MAX_CONCURRENT_TURNS=2
```

If required live settings are absent or invalid, report `available: false` with a non-secret reason and stay in demo mode. Details are in [CODEX_PROVIDER.md](./CODEX_PROVIDER.md).

## Persistence path

The MVP can use a process-local event store. Production should add PostgreSQL tables for `runs`, `agents`, `tasks`, `commands`, `artifacts`, and append-only `events` with unique `(run_id, sequence)` and `event_id` indexes. Store provider thread/response IDs encrypted or access-controlled. Object storage holds large artifacts; events contain references and integrity metadata.

A single database writer can allocate sequence numbers initially. Add Redis only when multiple realtime instances require fan-out, distributed rate limits, or queued worker dispatch. The database remains the replay source of truth; Redis is never the only event store.

## OpenAI/Codex boundary

The official [Codex SDK](https://learn.chatgpt.com/docs/codex-sdk) starts, continues, and resumes local Codex threads server-side. The richer [Codex app-server](https://learn.chatgpt.com/docs/app-server) exposes streamed turn/item events and approvals, but its TCP WebSocket transport is documented as experimental and unsupported for production; prefer a supervised local stdio connection on the worker host.

These interfaces support threads the integration creates or can explicitly resume. They do **not** establish a supported way to discover, observe, or take over every arbitrary task already open in Codex Web or Desktop. Agent Warehouse must never imply otherwise.

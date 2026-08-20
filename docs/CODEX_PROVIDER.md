# Codex and OpenAI provider boundary

## Status

Live mode is configuration-gated. Until a provider passes capability checks, the product remains in Demo mode and labels commands as simulated.

There are two distinct live integrations:

| Adapter | Best for | Execution location | What it controls |
| --- | --- | --- | --- |
| `OpenAIProvider` | Hosted model/agent runs | Application server | Responses created by this application |
| `CodexLocalProvider` | Repository-aware coding work | Dedicated worker host | Local Codex threads created or explicitly resumed by this adapter |

An OpenAI Responses run is not a Codex Web/Desktop task. A local Codex thread is not automatically the same task visible in another Codex client.

## Supported, not assumed

Official OpenAI documentation says the server-side [Codex SDK](https://learn.chatgpt.com/docs/codex-sdk) can start, continue, and resume local Codex threads. The [Codex app-server](https://learn.chatgpt.com/docs/app-server) provides a deeper JSON-RPC integration with history, approvals, and streamed thread/turn/item events.

The documentation does not establish a general public API for listing, attaching to, or controlling arbitrary existing Codex Web/Desktop tasks. Therefore:

- only expose threads whose IDs were created by or explicitly registered with Agent Warehouse;
- never scrape a Codex UI, read private local task stores opportunistically, or reuse browser/session credentials;
- call the adapter `codex-local`, not `codex-cloud`, unless a separately documented cloud API is implemented and tested;
- show `external_control: unsupported` for unrelated Web/Desktop tasks.

## Capability contract

```ts
interface ProviderCapabilities {
  available: boolean;
  mode: "demo" | "openai" | "codex-local";
  reason?: string; // safe for UI; contains no paths, tokens, or raw errors
  commands: Array<"status" | "instruct" | "steer" | "interrupt">;
  streams: Array<"message_delta" | "tool" | "artifact" | "usage" | "approval">;
  sandbox: "none" | "readOnly" | "workspaceWrite";
  approvals: "none" | "onRequest";
}
```

Capability detection must verify configuration, SDK/runtime availability, model/provider support, an explicit accessible workspace, and a successful provider handshake. It must not launch work or modify files.

## OpenAIProvider

Use the official OpenAI SDK and Responses API from server code only.

1. Create a response with a stable internal `runId`/`commandId` in application metadata where supported.
2. Consume typed streaming events and normalize only approved, user-visible fields.
3. Map response creation/deltas/tool lifecycle/completion/failure to the warehouse schema.
4. For long work, use background mode and persist `response_id` plus the last `sequence_number` so a dropped stream can resume.
5. Optionally accept completion webhooks. Verify the signature against the raw body, acknowledge quickly, deduplicate, then retrieve/normalize the response server-side.
6. Never expose an API key, raw webhook secret, full provider error, tool credential, or hidden reasoning.

The Responses stream documents typed lifecycle events such as `response.created`, text deltas, `response.completed`, and errors. Background streams can be resumed from a sequence cursor. See [streaming Responses](https://developers.openai.com/api/docs/guides/streaming-responses), [background mode](https://developers.openai.com/api/docs/guides/background), and [webhooks](https://developers.openai.com/api/docs/guides/webhooks).

Suggested normalization:

| Responses signal | Warehouse event |
| --- | --- |
| response created/in progress | `run.created`, `agent.state_changed` → `working` |
| output text delta/final message | coalesce deltas; emit `message.sent` at safe intervals/final |
| tool call in progress/completed/failed | `tool.started` / `tool.completed` / `tool.failed` |
| response completed | `run.completed`, agent → `completed` |
| response failed/incomplete/cancelled | `run.failed` or task blocked, with redacted error |
| usage update/final usage | attach allowed token/cost estimate fields to state or completion payload |

Do not emit every text token as a durable database row. Broadcast deltas ephemerally and checkpoint coalesced text; persist the authoritative final message.

## CodexLocalProvider

### Deployment requirement

Run Codex on a dedicated, supervised worker host with Node.js and the repository mounted at one explicit absolute root. A serverless web function should enqueue work to this host; it should not attempt to spawn Codex against a user's laptop filesystem.

For simple start/continue/resume automation, prefer `@openai/codex-sdk`. For rich warehouse telemetry, supervise `codex app-server` over its default stdio JSONL transport and normalize its notifications. The app-server docs explicitly mark TCP WebSocket transport as experimental and unsupported for production. If a remote transport is evaluated later, require `wss`, bearer authentication, TLS, network isolation, and a separate threat review.

### Thread ownership

Store this mapping server-side:

```ts
interface CodexThreadBinding {
  warehouseRunId: string;
  warehouseAgentId: string;
  codexThreadId: string;
  workspaceRootId: string; // opaque ID; never a browser-supplied path
  createdByAdapter: boolean;
  lastSeenAt: string;
}
```

Only dispatch to a binding owned by the authenticated workspace. Never accept an arbitrary thread ID or filesystem path directly from the browser.

### Event mapping

The app-server lifecycle is thread → turn → item. `item/completed` is authoritative, and approvals are server-initiated requests. Normalize as follows:

| App-server notification/item | Warehouse event |
| --- | --- |
| `thread/started` | `agent.created` or provider binding metadata |
| `turn/started` | `agent.state_changed` → `working`; command accepted |
| `turn/plan/updated` | `task.updated`; agent → `planning` |
| `item/agentMessage/delta` | ephemeral UI delta; checkpoint to `message.sent` |
| `commandExecution` / `mcpToolCall` item | `tool.started` then completed/failed |
| `fileChange` item or `turn/diff/updated` | `artifact.created` with redacted diff reference |
| approval request | agent → `waiting`; create explicit pending-approval UI record |
| `turn/completed` | `user.command.response`; update task/run and agent state |

Do not expose raw command output or arbitrary diffs by default. Apply size limits, secret redaction, and authorization before serving artifact content.

### Command flow

1. API validates auth, ownership, command type, text length, idempotency key, and rate/concurrency limits.
2. Persist/emit `user.command.sent` with status `queued`.
3. Worker revalidates the binding and resolves `workspaceRootId` from server configuration.
4. `status` runs read-only. `instruct` uses the configured sandbox and approval policy. `steer` is available only while a known turn is active. `interrupt` targets only that bound turn.
5. Provider requests for command execution, file mutation, network access, credentials, deployment, push, or destructive action are surfaced for explicit approval; the model cannot grant its own approval.
6. Completion emits `user.command.response` with a safe summary and provider correlation IDs. Failures are redacted and classified as retryable or terminal.

The app-server exposes approval flows and sandbox choices; the SDK documents `read_only`, `workspace_write`, and unrestricted presets. This project must not enable unrestricted/full-access mode from web input. Human review is especially important for generated code, per OpenAI's [safety guidance](https://developers.openai.com/api/docs/guides/safety-best-practices).

## Rate limiting and failure policy

- Default application limit: 10 commands per authenticated user per minute, burst 3.
- Default concurrency: 1 active turn per agent and 2 per provider worker.
- A repeated idempotency key returns the original receipt rather than dispatching again.
- Queue depth and command age are bounded; reject stale/overflow work with a safe `429` or `503`.
- Use SDK retry behavior for eligible OpenAI `429`s. For custom clients, honor `Retry-After`, then bounded exponential backoff with jitter; never retry auth, billing, policy, approval, or validation failures.
- App-server overload and transport loss move the agent to `waiting`/`blocked`; they do not silently replay a mutating command unless the idempotency outcome is known.

See OpenAI's [rate-limit guidance](https://developers.openai.com/api/docs/guides/rate-limits).

## Environment placeholders

```dotenv
# Provider selection. Demo remains the safe default.
AGENT_PROVIDER=demo

# OpenAIProvider
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-terra
OPENAI_WEBHOOK_SECRET=

# CodexLocalProvider
CODEX_ENABLED=false
CODEX_BIN=codex
CODEX_WORKSPACE_ROOT=
CODEX_MODEL=gpt-5.6-terra
CODEX_SANDBOX=readOnly
CODEX_APPROVAL_POLICY=onRequest
CODEX_APP_SERVER_TRANSPORT=stdio
CODEX_APP_SERVER_URL=

# Application enforcement
COMMAND_RATE_LIMIT_PER_MINUTE=10
COMMAND_RATE_LIMIT_BURST=3
PROVIDER_MAX_CONCURRENT_TURNS=2
COMMAND_MAX_CHARACTERS=4000
```

`OPENAI_API_KEY`, webhook secrets, remote transport tokens, absolute workspace paths, and provider thread IDs are server-only. OpenAI's [production guidance](https://developers.openai.com/api/docs/guides/production-best-practices) recommends environment variables or a secret manager rather than source code or public repositories.

## Acceptance checks before enabling live mode

- Demo mode still works with every live variable unset.
- Capability endpoint reports live mode unavailable without leaking configuration values.
- Browser bundles and network responses contain no secrets or host paths.
- Worker refuses a browser-supplied path, unknown thread ID, out-of-root path, and full-access sandbox request.
- Status command cannot write; mutating tool calls stop at the approval boundary.
- Duplicate command/webhook delivery does not duplicate work or durable events.
- Stream reconnect resumes without gaps or duplicate reducer effects.
- Provider outage produces a visible blocked/error state and can recover without losing the event log.
- Documentation and UI never claim control of unrelated Codex Web/Desktop tasks.

import type {
  TaskArtifact,
  WarehouseAgent,
  WarehouseEvent,
  WarehouseMessage,
  WarehouseRun,
  WarehouseSnapshot,
  WarehouseTask,
} from "./domain";

/** A fixed timestamp keeps the default demo suitable for screenshots and tests. */
export const DEMO_START = "2026-08-20T08:30:00.000Z";
export const DEMO_RUN_ID = "run-launchpad";

export const DEMO_AGENTS: WarehouseAgent[] = [
  { id: "agent-foreman", name: "Maya", role: "orchestrator", state: "reviewing", station: "Dispatch desk", color: "#FBBF24", icon: "✦", currentTaskId: "task-ship", mission: "Coordinate the launch and remove delivery blockers.", model: "gpt-5.6-sol", updatedAt: "2026-08-20T08:43:00.000Z" },
  { id: "agent-frontend", name: "Iris", role: "frontend", state: "working", station: "Interface bench", color: "#60A5FA", icon: "◒", currentTaskId: "task-dashboard", mission: "Build a legible live operations dashboard.", model: "gpt-5.6-terra", updatedAt: "2026-08-20T08:44:00.000Z" },
  { id: "agent-backend", name: "Theo", role: "backend", state: "working", station: "Integration bay", color: "#A78BFA", icon: "◇", currentTaskId: "task-stream", mission: "Deliver a reliable event stream and API contracts.", model: "gpt-5.6-terra", updatedAt: "2026-08-20T08:43:30.000Z" },
  { id: "agent-qa", name: "Jun", role: "qa", state: "waiting", station: "Inspection line", color: "#34D399", icon: "✓", currentTaskId: "task-smoke", mission: "Verify the critical paths before release.", model: "gpt-5.6-luna", updatedAt: "2026-08-20T08:42:00.000Z" },
  { id: "agent-research", name: "Sana", role: "researcher", state: "completed", station: "Signal room", color: "#FB7185", icon: "⌁", mission: "Surface integration constraints and product signals.", model: "gpt-5.6-luna", updatedAt: "2026-08-20T08:41:00.000Z" },
];

export const DEMO_RUN: WarehouseRun = {
  id: DEMO_RUN_ID,
  title: "Launchpad dashboard MVP",
  objective: "Ship a polished, observable demo of collaborating warehouse agents.",
  status: "running",
  provider: "demo",
  createdAt: DEMO_START,
  startedAt: DEMO_START,
};

export const DEMO_ARTIFACTS: TaskArtifact[] = [
  { id: "artifact-brief", kind: "report", name: "Integration constraints", uri: "/artifacts/integration-constraints", createdAt: "2026-08-20T08:36:00.000Z", createdByAgentId: "agent-research" },
  { id: "artifact-schema", kind: "document", name: "Event contract v1", uri: "/artifacts/event-contract-v1", createdAt: "2026-08-20T08:40:00.000Z", createdByAgentId: "agent-backend" },
];

export const DEMO_TASKS: WarehouseTask[] = [
  { id: "task-discovery", runId: DEMO_RUN_ID, title: "Map provider constraints", description: "Identify which live-agent actions are safe to expose.", status: "done", priority: "high", assigneeIds: ["agent-research"], dependencyIds: [], artifactIds: ["artifact-brief"], createdAt: DEMO_START, updatedAt: "2026-08-20T08:41:00.000Z", completedAt: "2026-08-20T08:41:00.000Z" },
  { id: "task-stream", runId: DEMO_RUN_ID, title: "Shape the live event stream", description: "Normalize provider activity into a resilient UI contract.", status: "in_progress", priority: "critical", assigneeIds: ["agent-backend"], dependencyIds: ["task-discovery"], artifactIds: ["artifact-schema"], createdAt: "2026-08-20T08:32:00.000Z", updatedAt: "2026-08-20T08:43:30.000Z" },
  { id: "task-dashboard", runId: DEMO_RUN_ID, title: "Assemble warehouse dashboard", description: "Render workers, stations, and activity without losing clarity.", status: "in_progress", priority: "high", assigneeIds: ["agent-frontend"], dependencyIds: ["task-discovery"], artifactIds: [], createdAt: "2026-08-20T08:33:00.000Z", updatedAt: "2026-08-20T08:44:00.000Z" },
  { id: "task-smoke", runId: DEMO_RUN_ID, title: "Prepare release smoke test", description: "Queue browser checks for the end-to-end demo path.", status: "ready", priority: "normal", assigneeIds: ["agent-qa"], dependencyIds: ["task-stream", "task-dashboard"], artifactIds: [], createdAt: "2026-08-20T08:34:00.000Z", updatedAt: "2026-08-20T08:42:00.000Z" },
  { id: "task-ship", runId: DEMO_RUN_ID, title: "Review launch readiness", description: "Coordinate handoffs and approve the MVP showcase.", status: "in_review", priority: "high", assigneeIds: ["agent-foreman"], dependencyIds: ["task-smoke"], artifactIds: [], createdAt: "2026-08-20T08:35:00.000Z", updatedAt: "2026-08-20T08:43:00.000Z" },
];

export const DEMO_MESSAGES: WarehouseMessage[] = [
  { id: "message-brief", runId: DEMO_RUN_ID, kind: "handoff", text: "Constraint brief is ready: keep provider controls server-side and configuration-gated.", fromAgentId: "agent-research", toAgentId: "agent-foreman", taskId: "task-discovery", createdAt: "2026-08-20T08:41:00.000Z" },
  { id: "message-stream", runId: DEMO_RUN_ID, kind: "update", text: "The normalized event contract is in place. I am wiring the stream reducer now.", fromAgentId: "agent-backend", toAgentId: "agent-foreman", taskId: "task-stream", createdAt: "2026-08-20T08:43:30.000Z" },
  { id: "message-dashboard", runId: DEMO_RUN_ID, kind: "update", text: "Dashboard layout is flowing. I am tuning the worker states for quick scanning.", fromAgentId: "agent-frontend", toAgentId: "agent-foreman", taskId: "task-dashboard", createdAt: "2026-08-20T08:44:00.000Z" },
];

export const DEMO_INITIAL_EVENTS: WarehouseEvent[] = [
  { id: "event-001", sequence: 1, type: "run.created", source: "system", runId: DEMO_RUN_ID, createdAt: DEMO_START, payload: { run: DEMO_RUN } },
  ...DEMO_AGENTS.map((agent, index): WarehouseEvent => ({ id: `event-agent-${agent.id}`, sequence: index + 2, type: "agent.created", source: "provider", runId: DEMO_RUN_ID, agentId: agent.id, createdAt: "2026-08-20T08:30:05.000Z", payload: { agent } })),
  { id: "event-007", sequence: 7, type: "task.created", source: "provider", runId: DEMO_RUN_ID, taskId: "task-discovery", createdAt: "2026-08-20T08:31:00.000Z", payload: { task: DEMO_TASKS[0] } },
  { id: "event-008", sequence: 8, type: "task.created", source: "provider", runId: DEMO_RUN_ID, taskId: "task-stream", createdAt: "2026-08-20T08:32:00.000Z", payload: { task: DEMO_TASKS[1] } },
  { id: "event-009", sequence: 9, type: "task.created", source: "provider", runId: DEMO_RUN_ID, taskId: "task-dashboard", createdAt: "2026-08-20T08:33:00.000Z", payload: { task: DEMO_TASKS[2] } },
  { id: "event-010", sequence: 10, type: "message.sent", source: "provider", runId: DEMO_RUN_ID, agentId: "agent-research", taskId: "task-discovery", createdAt: "2026-08-20T08:41:00.000Z", payload: { message: DEMO_MESSAGES[0] } },
  { id: "event-011", sequence: 11, type: "artifact.created", source: "provider", runId: DEMO_RUN_ID, agentId: "agent-research", taskId: "task-discovery", createdAt: "2026-08-20T08:41:00.000Z", payload: { artifact: DEMO_ARTIFACTS[0] } },
  { id: "event-012", sequence: 12, type: "task.completed", source: "provider", runId: DEMO_RUN_ID, agentId: "agent-research", taskId: "task-discovery", createdAt: "2026-08-20T08:41:00.000Z", payload: { completedAt: "2026-08-20T08:41:00.000Z" } },
  { id: "event-013", sequence: 13, type: "message.sent", source: "provider", runId: DEMO_RUN_ID, agentId: "agent-backend", taskId: "task-stream", createdAt: "2026-08-20T08:43:30.000Z", payload: { message: DEMO_MESSAGES[1] } },
  { id: "event-014", sequence: 14, type: "message.sent", source: "provider", runId: DEMO_RUN_ID, agentId: "agent-frontend", taskId: "task-dashboard", createdAt: "2026-08-20T08:44:00.000Z", payload: { message: DEMO_MESSAGES[2] } },
];

/** Returns a fresh object graph; callers can safely apply reducer events. */
export function createInitialDemoSnapshot(): WarehouseSnapshot {
  return {
    run: { ...DEMO_RUN },
    agents: DEMO_AGENTS.map((agent) => ({ ...agent })),
    tasks: DEMO_TASKS.map((task) => ({ ...task, assigneeIds: [...task.assigneeIds], dependencyIds: [...task.dependencyIds], artifactIds: [...task.artifactIds] })),
    messages: DEMO_MESSAGES.map((message) => ({ ...message })),
    artifacts: DEMO_ARTIFACTS.map((artifact) => ({ ...artifact })),
    events: DEMO_INITIAL_EVENTS.map((event) => ({ ...event })),
    nextSequence: 15,
  };
}

import { createInitialDemoSnapshot, DEMO_RUN_ID } from "./demo-data";
import type {
  AgentProvider,
  AgentState,
  EntityId,
  TaskPriority,
  WarehouseEvent,
  WarehouseMessage,
  WarehouseSnapshot,
} from "./domain";

export interface DemoCommandInput {
  agentId: EntityId;
  /** Display-only, untrusted text. The demo provider never executes it. */
  text: string;
}

export interface DemoProvider extends AgentProvider {
  advance(): WarehouseEvent | undefined;
  sendCommand(input: DemoCommandInput): { command: WarehouseEvent; response: WarehouseEvent };
  reset(): WarehouseSnapshot;
}

type Listener = (event: WarehouseEvent, snapshot: WarehouseSnapshot) => void;

const MAX_COMMAND_LENGTH = 500;
const DEMO_SCRIPT: Array<{
  type: "tool.started" | "tool.completed" | "agent.state_changed" | "task.updated" | "message.sent";
  agentId: string;
  taskId?: string;
  payload: Record<string, unknown>;
}> = [
  { type: "tool.started", agentId: "agent-backend", taskId: "task-stream", payload: { toolName: "event-contract-check", summary: "Validating the provider event shape" } },
  { type: "tool.completed", agentId: "agent-backend", taskId: "task-stream", payload: { toolName: "event-contract-check", summary: "All required event types normalize cleanly" } },
  { type: "message.sent", agentId: "agent-backend", taskId: "task-stream", payload: { text: "Stream contract is ready for the dashboard handoff.", kind: "handoff", toAgentId: "agent-frontend" } },
  { type: "agent.state_changed", agentId: "agent-qa", taskId: "task-smoke", payload: { previous: "waiting", current: "working", reason: "Both delivery dependencies are ready for inspection." } },
  { type: "task.updated", agentId: "agent-frontend", taskId: "task-dashboard", payload: { changes: { status: "in_review" } } },
  { type: "message.sent", agentId: "agent-qa", taskId: "task-smoke", payload: { text: "Smoke test queued: verifying worker selection, command replies, and the event feed.", kind: "update", toAgentId: "agent-foreman" } },
];

function cloneSnapshot(snapshot: WarehouseSnapshot): WarehouseSnapshot {
  // Events have nested payloads, so a shallow copy would leak mutable state to
  // subscribers. This data is plain JSON-compatible domain data by design.
  return structuredClone(snapshot);
}

function timeFor(sequence: number): string {
  return new Date(Date.parse("2026-08-20T08:45:00.000Z") + (sequence - 15) * 20_000).toISOString();
}

function eventId(sequence: number): string {
  return `demo-event-${String(sequence).padStart(4, "0")}`;
}

function replaceAt<T extends { id: string }>(items: T[], replacement: T): T[] {
  return items.map((item) => (item.id === replacement.id ? replacement : item));
}

/** Applies an event without side effects. Unknown entity references are ignored safely. */
export function reduceDemoEvent(snapshot: WarehouseSnapshot, event: WarehouseEvent): WarehouseSnapshot {
  const next = cloneSnapshot(snapshot);
  next.events.push(event);
  next.nextSequence = Math.max(next.nextSequence, event.sequence + 1);

  switch (event.type) {
    case "run.created":
      next.run = { ...event.payload.run };
      break;
    case "run.completed":
      next.run = { ...next.run, status: "completed", completedAt: event.payload.completedAt };
      break;
    case "run.failed":
      next.run = { ...next.run, status: "failed" };
      break;
    case "agent.created":
      if (!next.agents.some((agent) => agent.id === event.payload.agent.id)) next.agents.push({ ...event.payload.agent });
      break;
    case "agent.state_changed": {
      const agent = next.agents.find((item) => item.id === event.agentId);
      if (agent) next.agents = replaceAt(next.agents, { ...agent, state: event.payload.current, updatedAt: event.createdAt });
      break;
    }
    case "task.created":
      if (!next.tasks.some((task) => task.id === event.payload.task.id)) {
        next.tasks.push({
          ...event.payload.task,
          assigneeIds: [...event.payload.task.assigneeIds],
          dependencyIds: [...event.payload.task.dependencyIds],
          artifactIds: [...event.payload.task.artifactIds],
        });
      }
      break;
    case "task.updated": {
      const task = next.tasks.find((item) => item.id === event.taskId);
      if (task) next.tasks = replaceAt(next.tasks, { ...task, ...event.payload.changes, updatedAt: event.createdAt });
      break;
    }
    case "task.completed": {
      const task = next.tasks.find((item) => item.id === event.taskId);
      if (task) next.tasks = replaceAt(next.tasks, { ...task, status: "done", completedAt: event.payload.completedAt, updatedAt: event.createdAt });
      break;
    }
    case "task.blocked": {
      const task = next.tasks.find((item) => item.id === event.taskId);
      if (task) next.tasks = replaceAt(next.tasks, { ...task, status: "blocked", updatedAt: event.createdAt });
      break;
    }
    case "message.sent":
      next.messages.push({ ...event.payload.message });
      break;
    case "artifact.created":
      if (!next.artifacts.some((artifact) => artifact.id === event.payload.artifact.id)) next.artifacts.push({ ...event.payload.artifact });
      break;
  }
  return next;
}

function buildScriptEvent(snapshot: WarehouseSnapshot, offset: number): WarehouseEvent | undefined {
  const step = DEMO_SCRIPT[offset];
  if (!step) return undefined;
  const sequence = snapshot.nextSequence;
  const base = { id: eventId(sequence), sequence, source: "provider" as const, runId: DEMO_RUN_ID, createdAt: timeFor(sequence), agentId: step.agentId, taskId: step.taskId };

  if (step.type === "message.sent") {
    const message: WarehouseMessage = {
      id: `demo-message-${sequence}`,
      runId: DEMO_RUN_ID,
      kind: String(step.payload.kind) as WarehouseMessage["kind"],
      text: String(step.payload.text),
      fromAgentId: step.agentId,
      toAgentId: String(step.payload.toAgentId),
      taskId: step.taskId,
      createdAt: base.createdAt,
    };
    return { ...base, type: "message.sent", payload: { message } };
  }
  if (step.type === "agent.state_changed") {
    return { ...base, type: step.type, payload: { previous: step.payload.previous as AgentState, current: step.payload.current as AgentState, reason: String(step.payload.reason) } };
  }
  if (step.type === "task.updated") {
    return { ...base, type: step.type, payload: { changes: step.payload.changes as { status?: "in_review" } } };
  }
  if (step.type === "tool.started") {
    return { ...base, type: "tool.started", payload: { toolName: String(step.payload.toolName), summary: String(step.payload.summary) } };
  }
  return { ...base, type: "tool.completed", payload: { toolName: String(step.payload.toolName), summary: String(step.payload.summary) } };
}

function commandReply(text: string, agentName: string): string {
  const lower = text.toLowerCase();
  if (/(status|update|progress)/.test(lower)) return `${agentName} reports: current work is on track. The next visible event will show the latest handoff or inspection result.`;
  if (/(priority|prioritize|urgent)/.test(lower)) return `${agentName} logged the priority request for review. Demo mode records intent only and never changes external systems.`;
  if (/(stop|pause)/.test(lower)) return `${agentName} acknowledged the pause request. Demo mode will finish no external work because it has no external work to control.`;
  return `${agentName} received your note. In demo mode, commands are simulated safely and shown in the event timeline.`;
}

export function createDemoProvider(): DemoProvider {
  let snapshot = createInitialDemoSnapshot();
  let scriptOffset = 0;
  const listeners = new Set<Listener>();
  const emit = (event: WarehouseEvent) => {
    snapshot = reduceDemoEvent(snapshot, event);
    const readOnlySnapshot = cloneSnapshot(snapshot);
    listeners.forEach((listener) => listener(event, readOnlySnapshot));
  };

  return {
    id: "demo",
    capabilities: { supportsLiveEvents: true, supportsCommands: true, supportsReplay: true },
    getSnapshot: () => cloneSnapshot(snapshot),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    advance() {
      const event = buildScriptEvent(snapshot, scriptOffset);
      if (!event) return undefined;
      scriptOffset += 1;
      emit(event);
      return event;
    },
    sendCommand(input) {
      const target = snapshot.agents.find((agent) => agent.id === input.agentId);
      if (!target) throw new Error(`Unknown demo agent: ${input.agentId}`);
      const text = input.text.trim().slice(0, MAX_COMMAND_LENGTH) || "Give me an update.";
      const commandId = `demo-command-${snapshot.nextSequence}`;
      const command: WarehouseEvent = {
        id: eventId(snapshot.nextSequence), sequence: snapshot.nextSequence, type: "user.command.sent", source: "user", runId: DEMO_RUN_ID,
        createdAt: timeFor(snapshot.nextSequence), agentId: target.id, payload: { commandId, text, targetAgentId: target.id },
      };
      emit(command);
      const response: WarehouseEvent = {
        id: eventId(snapshot.nextSequence), sequence: snapshot.nextSequence, type: "user.command.response", source: "provider", runId: DEMO_RUN_ID,
        createdAt: timeFor(snapshot.nextSequence), agentId: target.id, payload: { commandId, text: commandReply(text, target.name), targetAgentId: target.id },
      };
      emit(response);
      return { command, response };
    },
    reset() { snapshot = createInitialDemoSnapshot(); scriptOffset = 0; return cloneSnapshot(snapshot); },
  };
}

/** Convenience for UI controls that only offer the supported demo priorities. */
export const DEMO_PRIORITIES: TaskPriority[] = ["low", "normal", "high", "critical"];

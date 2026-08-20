/**
 * Shared, provider-neutral domain contracts for Agent Warehouse.
 *
 * Providers emit immutable events; the UI and persistence layers consume the
 * resulting WarehouseSnapshot without needing to know which agent framework
 * produced it.
 */

export type ISODateTime = string;
export type EntityId = string;

export type AgentRole =
  | "orchestrator"
  | "frontend"
  | "backend"
  | "qa"
  | "researcher";

export type AgentState =
  | "idle"
  | "planning"
  | "working"
  | "waiting"
  | "blocked"
  | "reviewing"
  | "completed"
  | "failed"
  | "paused";

export type RunStatus = "queued" | "running" | "paused" | "completed" | "failed";
export type TaskStatus = "backlog" | "ready" | "in_progress" | "in_review" | "blocked" | "done";
export type TaskPriority = "low" | "normal" | "high" | "critical";
export type ArtifactKind = "code" | "document" | "report" | "test_result" | "link";
export type MessageKind = "instruction" | "update" | "handoff" | "question" | "answer" | "system";
export type EventSource = "provider" | "user" | "system";

export interface WarehouseAgent {
  id: EntityId;
  name: string;
  role: AgentRole;
  state: AgentState;
  /** Human-readable workstation used by visual renderers. */
  station: string;
  color: string;
  icon: string;
  currentTaskId?: EntityId;
  mission: string;
  model?: string;
  updatedAt: ISODateTime;
}

export interface TaskArtifact {
  id: EntityId;
  kind: ArtifactKind;
  name: string;
  uri?: string;
  createdAt: ISODateTime;
  createdByAgentId?: EntityId;
}

export interface WarehouseTask {
  id: EntityId;
  runId: EntityId;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeIds: EntityId[];
  dependencyIds: EntityId[];
  artifactIds: EntityId[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  completedAt?: ISODateTime;
}

export interface WarehouseRun {
  id: EntityId;
  title: string;
  objective: string;
  status: RunStatus;
  provider: string;
  startedAt: ISODateTime;
  completedAt?: ISODateTime;
  createdAt: ISODateTime;
}

export interface WarehouseMessage {
  id: EntityId;
  runId: EntityId;
  kind: MessageKind;
  text: string;
  createdAt: ISODateTime;
  fromAgentId?: EntityId;
  toAgentId?: EntityId;
  taskId?: EntityId;
  /** Set for commands sent by a human through the control surface. */
  isUserAuthored?: boolean;
}

export interface UsageEstimate {
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
}

export interface EventBase<TType extends string, TPayload> {
  id: EntityId;
  sequence: number;
  type: TType;
  source: EventSource;
  runId: EntityId;
  createdAt: ISODateTime;
  agentId?: EntityId;
  taskId?: EntityId;
  payload: TPayload;
  usage?: UsageEstimate;
}

export type WarehouseEvent =
  | EventBase<"run.created", { run: WarehouseRun }>
  | EventBase<"run.completed", { completedAt: ISODateTime }>
  | EventBase<"run.failed", { reason: string }>
  | EventBase<"agent.created", { agent: WarehouseAgent }>
  | EventBase<"agent.state_changed", { previous: AgentState; current: AgentState; reason?: string }>
  | EventBase<"task.created", { task: WarehouseTask }>
  | EventBase<"task.updated", { changes: Partial<Pick<WarehouseTask, "title" | "description" | "status" | "priority" | "assigneeIds" | "dependencyIds" | "artifactIds" | "completedAt">> }>
  | EventBase<"task.completed", { completedAt: ISODateTime }>
  | EventBase<"task.blocked", { reason: string }>
  | EventBase<"message.sent", { message: WarehouseMessage }>
  | EventBase<"tool.started", { toolName: string; summary: string }>
  | EventBase<"tool.completed", { toolName: string; summary: string }>
  | EventBase<"tool.failed", { toolName: string; reason: string }>
  | EventBase<"artifact.created", { artifact: TaskArtifact }>
  | EventBase<"user.command.sent", { commandId: EntityId; text: string; targetAgentId: EntityId }>
  | EventBase<"user.command.response", { commandId: EntityId; text: string; targetAgentId: EntityId }>;

export interface WarehouseSnapshot {
  run: WarehouseRun;
  agents: WarehouseAgent[];
  tasks: WarehouseTask[];
  messages: WarehouseMessage[];
  artifacts: TaskArtifact[];
  events: WarehouseEvent[];
  /** The next monotonic event sequence a provider should assign. */
  nextSequence: number;
}

export interface ProviderCapabilities {
  supportsLiveEvents: boolean;
  supportsCommands: boolean;
  supportsReplay: boolean;
}

export interface AgentProvider {
  readonly id: string;
  readonly capabilities: ProviderCapabilities;
  getSnapshot(): WarehouseSnapshot;
  subscribe(listener: (event: WarehouseEvent, snapshot: WarehouseSnapshot) => void): () => void;
}

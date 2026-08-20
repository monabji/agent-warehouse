export type WorkerStatus =
  | "idle"
  | "planning"
  | "working"
  | "waiting"
  | "blocked"
  | "reviewing"
  | "completed"
  | "failed";

export type WorkerRole =
  | "orchestrator"
  | "frontend"
  | "backend"
  | "qa"
  | "research";

export interface WarehouseWorker {
  id: string;
  name: string;
  role: WorkerRole;
  roleLabel: string;
  status: WorkerStatus;
  currentTask: string;
  progress?: number;
  position: {
    x: number;
    y: number;
  };
}

export interface TaskPackage {
  id: string;
  label: string;
  fromWorkerId: string;
  toWorkerId: string;
  state: "queued" | "moving" | "delivered" | "failed";
  progress: number;
}

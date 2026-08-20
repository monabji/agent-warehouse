"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";

import type { TaskPackage, WarehouseWorker, WorkerRole, WorkerStatus } from "./types";

const STATUS_STYLE: Record<
  WorkerStatus,
  { label: string; dot: string; ring: string; glow: string }
> = {
  idle: {
    label: "Idle",
    dot: "bg-slate-400",
    ring: "border-slate-500/60",
    glow: "shadow-slate-500/10",
  },
  planning: {
    label: "Planning",
    dot: "bg-violet-400",
    ring: "border-violet-400/70",
    glow: "shadow-violet-500/20",
  },
  working: {
    label: "Working",
    dot: "bg-cyan-400",
    ring: "border-cyan-400/70",
    glow: "shadow-cyan-500/25",
  },
  waiting: {
    label: "Waiting",
    dot: "bg-amber-300",
    ring: "border-amber-400/70",
    glow: "shadow-amber-500/20",
  },
  blocked: {
    label: "Blocked",
    dot: "bg-orange-400",
    ring: "border-orange-400/70",
    glow: "shadow-orange-500/25",
  },
  reviewing: {
    label: "Reviewing",
    dot: "bg-fuchsia-400",
    ring: "border-fuchsia-400/70",
    glow: "shadow-fuchsia-500/20",
  },
  completed: {
    label: "Completed",
    dot: "bg-emerald-400",
    ring: "border-emerald-400/70",
    glow: "shadow-emerald-500/25",
  },
  failed: {
    label: "Failed",
    dot: "bg-rose-400",
    ring: "border-rose-400/70",
    glow: "shadow-rose-500/25",
  },
};

const ROLE_ACCENT: Record<WorkerRole, string> = {
  orchestrator: "from-amber-300 to-orange-500",
  frontend: "from-cyan-300 to-blue-500",
  backend: "from-emerald-300 to-teal-600",
  qa: "from-fuchsia-300 to-violet-600",
  research: "from-sky-300 to-indigo-600",
};

export const DEFAULT_WORKERS: WarehouseWorker[] = [
  {
    id: "foreman",
    name: "Atlas",
    role: "orchestrator",
    roleLabel: "Orchestrator / Foreman",
    status: "planning",
    currentTask: "Sequencing the release plan",
    progress: 34,
    position: { x: 50, y: 20 },
  },
  {
    id: "frontend",
    name: "Pixel",
    role: "frontend",
    roleLabel: "Frontend Builder",
    status: "working",
    currentTask: "Assembling the run timeline",
    progress: 68,
    position: { x: 24, y: 46 },
  },
  {
    id: "backend",
    name: "Relay",
    role: "backend",
    roleLabel: "Backend Builder",
    status: "waiting",
    currentTask: "Waiting on event schema approval",
    progress: 46,
    position: { x: 76, y: 46 },
  },
  {
    id: "qa",
    name: "Gauge",
    role: "qa",
    roleLabel: "QA Inspector",
    status: "reviewing",
    currentTask: "Inspecting command flow",
    progress: 82,
    position: { x: 32, y: 76 },
  },
  {
    id: "research",
    name: "Scout",
    role: "research",
    roleLabel: "Researcher / Analyst",
    status: "completed",
    currentTask: "Provider capability report",
    progress: 100,
    position: { x: 68, y: 76 },
  },
];

export const DEFAULT_PACKAGES: TaskPackage[] = [
  {
    id: "pkg-schema",
    label: "Event schema",
    fromWorkerId: "foreman",
    toWorkerId: "backend",
    state: "moving",
    progress: 58,
  },
  {
    id: "pkg-ui",
    label: "UI build",
    fromWorkerId: "frontend",
    toWorkerId: "qa",
    state: "moving",
    progress: 38,
  },
  {
    id: "pkg-notes",
    label: "Research notes",
    fromWorkerId: "research",
    toWorkerId: "foreman",
    state: "delivered",
    progress: 100,
  },
];

interface WarehouseSceneProps {
  workers?: WarehouseWorker[];
  packages?: TaskPackage[];
  selectedWorkerId?: string | null;
  onWorkerSelect?: (worker: WarehouseWorker) => void;
  className?: string;
  showLegend?: boolean;
}

/**
 * A provider-agnostic warehouse floor. Position values are percentages so the
 * scene remains usable from compact laptop widths through large dashboards.
 */
export function WarehouseScene({
  workers = DEFAULT_WORKERS,
  packages = DEFAULT_PACKAGES,
  selectedWorkerId,
  onWorkerSelect,
  className = "",
  showLegend = true,
}: WarehouseSceneProps) {
  const [internalSelection, setInternalSelection] = useState<string | null>(
    workers[0]?.id ?? null,
  );
  const activeWorkerId = selectedWorkerId === undefined ? internalSelection : selectedWorkerId;

  const workersById = useMemo(
    () => new Map(workers.map((worker) => [worker.id, worker])),
    [workers],
  );

  function selectWorker(worker: WarehouseWorker) {
    if (selectedWorkerId === undefined) setInternalSelection(worker.id);
    onWorkerSelect?.(worker);
  }

  return (
    <section
      aria-label="Agent warehouse floor"
      className={`overflow-hidden rounded-[2rem] border border-white/10 bg-[#071018] text-slate-100 shadow-2xl shadow-black/40 ${className}`}
    >
      <div className="flex flex-col gap-3 border-b border-white/10 bg-white/[0.025] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.8)] motion-reduce:animate-none" />
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-emerald-300">
              Live operations floor
            </p>
          </div>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-white sm:text-xl">
            Assembly Bay 01
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
          <Metric label="Workers" value={workers.length.toString()} />
          <Metric
            label="In motion"
            value={packages.filter((item) => item.state === "moving").length.toString()}
          />
          <Metric
            label="Blocked"
            value={workers.filter((worker) => worker.status === "blocked").length.toString()}
          />
        </div>
      </div>

      <div className="relative min-h-[38rem] overflow-hidden sm:min-h-[43rem] lg:min-h-[46rem]">
        <WarehouseBackdrop />

        <div className="absolute inset-0 min-w-[46rem] origin-top-left max-md:left-1/2 max-md:w-[46rem] max-md:-translate-x-1/2">
          <HandoffNetwork packages={packages} workersById={workersById} />

          {workers.map((worker) => (
            <WorkerStation
              key={worker.id}
              worker={worker}
              selected={worker.id === activeWorkerId}
              onSelect={() => selectWorker(worker)}
            />
          ))}

          <FloorLabel className="left-[4%] top-[5%]">ZONE A · INTAKE</FloorLabel>
          <FloorLabel className="right-[4%] top-[5%]">ZONE B · BUILD</FloorLabel>
          <FloorLabel className="bottom-[3%] left-1/2 -translate-x-1/2">
            QUALITY GATE · SHIPPING
          </FloorLabel>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#071018] to-transparent" />
      </div>

      {showLegend ? <StatusLegend /> : null}
    </section>
  );
}

function WarehouseBackdrop() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(56,189,248,0.12),transparent_34%),radial-gradient(circle_at_18%_70%,rgba(245,158,11,0.08),transparent_28%),linear-gradient(180deg,#0b1822_0%,#081119_100%)]" />
      <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(148,163,184,0.13)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.13)_1px,transparent_1px)] [background-size:52px_52px] [mask-image:linear-gradient(to_bottom,black,transparent_96%)]" />
      <div className="absolute left-1/2 top-[12%] h-[76%] w-[2px] -translate-x-1/2 border-l border-dashed border-amber-300/20" />
      <div className="absolute left-[8%] top-[31%] h-[3px] w-[84%] bg-[repeating-linear-gradient(90deg,rgba(251,191,36,0.3)_0_16px,transparent_16px_30px)] opacity-40" />
      <div className="absolute inset-x-[7%] bottom-[7%] h-3 rounded-full border border-white/5 bg-black/25 shadow-inner" />
      <div className="absolute inset-x-[8%] bottom-[8.2%] h-px bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent" />
    </div>
  );
}

function WorkerStation({
  worker,
  selected,
  onSelect,
}: {
  worker: WarehouseWorker;
  selected: boolean;
  onSelect: () => void;
}) {
  const status = STATUS_STYLE[worker.status];
  const style = {
    left: `${worker.position.x}%`,
    top: `${worker.position.y}%`,
  } satisfies CSSProperties;

  return (
    <button
      type="button"
      style={style}
      onClick={onSelect}
      aria-label={`${worker.name}, ${worker.roleLabel}. ${status.label}: ${worker.currentTask}`}
      aria-pressed={selected}
      className="group absolute z-20 w-40 -translate-x-1/2 -translate-y-1/2 rounded-2xl text-left outline-none transition duration-300 hover:-translate-y-[54%] focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#071018] motion-reduce:transition-none sm:w-44"
    >
      <div
        className={`relative rounded-2xl border bg-[#0c1923]/95 p-2.5 shadow-xl backdrop-blur transition duration-300 motion-reduce:transition-none ${
          selected
            ? "border-cyan-300/80 shadow-cyan-500/20"
            : `${status.ring} ${status.glow} group-hover:border-white/30`
        }`}
      >
        <div className="absolute -inset-px -z-10 rounded-2xl bg-gradient-to-b from-white/10 to-transparent opacity-50" />
        <div className="flex items-center gap-2.5">
          <WorkerAvatar role={worker.role} status={worker.status} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{worker.name}</p>
            <p className="truncate text-[0.62rem] font-medium uppercase tracking-[0.12em] text-slate-400">
              {worker.roleLabel}
            </p>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/[0.07] pt-2">
          <span className="flex min-w-0 items-center gap-1.5 text-[0.65rem] font-semibold text-slate-300">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot} ${
                worker.status === "working" || worker.status === "planning"
                  ? "animate-pulse motion-reduce:animate-none"
                  : ""
              }`}
            />
            {status.label}
          </span>
          {worker.progress !== undefined ? (
            <span className="font-mono text-[0.62rem] text-slate-500">{worker.progress}%</span>
          ) : null}
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${ROLE_ACCENT[worker.role]} transition-[width] duration-700 motion-reduce:transition-none`}
            style={{ width: `${Math.min(100, Math.max(0, worker.progress ?? 0))}%` }}
          />
        </div>
        <p className="mt-2 line-clamp-2 min-h-7 text-[0.65rem] leading-3.5 text-slate-400">
          {worker.currentTask}
        </p>
      </div>

      <StationBase role={worker.role} />
    </button>
  );
}

function WorkerAvatar({ role, status }: { role: WorkerRole; status: WorkerStatus }) {
  const active = status === "working" || status === "planning" || status === "reviewing";

  return (
    <span
      aria-hidden="true"
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${ROLE_ACCENT[role]} shadow-lg`}
    >
      {active ? (
        <span className="absolute inset-0 animate-ping rounded-xl border border-white/25 opacity-30 motion-reduce:animate-none" />
      ) : null}
      <RoleGlyph role={role} />
    </span>
  );
}

function RoleGlyph({ role }: { role: WorkerRole }) {
  const common = "h-5 w-5 text-[#071018]";

  if (role === "orchestrator") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="5" r="2.5" />
        <circle cx="5" cy="18" r="2.5" />
        <circle cx="19" cy="18" r="2.5" />
        <path d="M10.6 7 6.4 15.7M13.4 7l4.2 8.7M7.5 18h9" />
      </svg>
    );
  }

  if (role === "frontend") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="15" rx="2" />
        <path d="M3 8h18M7 6h.01M10 6h.01M8 13l-2 2 2 2M16 13l2 2-2 2" />
      </svg>
    );
  }

  if (role === "backend") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} stroke="currentColor" strokeWidth="2">
        <ellipse cx="12" cy="5" rx="7" ry="3" />
        <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
      </svg>
    );
  }

  if (role === "qa") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} stroke="currentColor" strokeWidth="2">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m15.5 15.5 5 5M7.5 10.5l2 2 4-4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className={common} stroke="currentColor" strokeWidth="2">
      <path d="M12 3a7 7 0 0 0-4 12.7V20h8v-4.3A7 7 0 0 0 12 3Z" />
      <path d="M9 23h6M9 10h6M12 7v6" />
    </svg>
  );
}

function StationBase({ role }: { role: WorkerRole }) {
  return (
    <span aria-hidden="true" className="relative mx-auto block h-5 w-[84%]">
      <span className="absolute inset-x-2 top-1 h-3 -skew-x-[28deg] rounded-sm border border-white/10 bg-slate-800/90 shadow-xl" />
      <span
        className={`absolute inset-x-6 top-1.5 h-px bg-gradient-to-r ${ROLE_ACCENT[role]} opacity-70`}
      />
      <span className="absolute left-4 top-3 h-2 w-1 rounded-b bg-slate-600" />
      <span className="absolute right-4 top-3 h-2 w-1 rounded-b bg-slate-600" />
    </span>
  );
}

function HandoffNetwork({
  packages,
  workersById,
}: {
  packages: TaskPackage[];
  workersById: Map<string, WarehouseWorker>;
}) {
  return (
    <svg
      aria-label="Active task handoffs"
      className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
      viewBox="0 0 1000 720"
      preserveAspectRatio="none"
      role="img"
    >
      <defs>
        <filter id="handoff-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {packages.map((taskPackage) => {
        const from = workersById.get(taskPackage.fromWorkerId);
        const to = workersById.get(taskPackage.toWorkerId);
        if (!from || !to) return null;

        const x1 = from.position.x * 10;
        const y1 = from.position.y * 7.2;
        const x2 = to.position.x * 10;
        const y2 = to.position.y * 7.2;
        const controlX = (x1 + x2) / 2;
        const controlY = (y1 + y2) / 2 - 42;
        const path = `M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`;
        const tone = taskPackage.state === "failed" ? "#fb7185" : "#67e8f9";

        return (
          <g key={taskPackage.id}>
            <title>{`${taskPackage.label}: ${from.name} to ${to.name}, ${taskPackage.state}`}</title>
            <path
              d={path}
              fill="none"
              stroke={tone}
              strokeOpacity="0.18"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d={path}
              fill="none"
              stroke={tone}
              strokeOpacity="0.68"
              strokeWidth="1.5"
              strokeDasharray="7 10"
              strokeLinecap="round"
              className={
                taskPackage.state === "moving"
                  ? "animate-pulse motion-reduce:animate-none"
                  : ""
              }
            />
            <PackageMarker
              start={{ x: x1, y: y1 }}
              control={{ x: controlX, y: controlY }}
              end={{ x: x2, y: y2 }}
              item={taskPackage}
              tone={tone}
            />
          </g>
        );
      })}
    </svg>
  );
}

function PackageMarker({
  start,
  control,
  end,
  item,
  tone,
}: {
  start: { x: number; y: number };
  control: { x: number; y: number };
  end: { x: number; y: number };
  item: TaskPackage;
  tone: string;
}) {
  const t = Math.min(1, Math.max(0, item.progress / 100));
  const inverse = 1 - t;
  const x = inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x;
  const y = inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y;

  return (
    <g
      filter="url(#handoff-glow)"
      transform={`translate(${x} ${y})`}
      className={item.state === "moving" ? "animate-pulse motion-reduce:animate-none" : ""}
    >
      <rect width="28" height="20" x="-14" y="-10" rx="4" fill="#0b1822" stroke={tone} />
      <path d="M-7-2h14M-4 3h8" stroke={tone} strokeWidth="1.5" />
    </g>
  );
}

function StatusLegend() {
  return (
    <div className="flex flex-col gap-3 border-t border-white/10 bg-black/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-slate-500">
        Worker telemetry
      </p>
      <ul aria-label="Worker status legend" className="flex flex-wrap gap-x-3 gap-y-2">
        {(Object.entries(STATUS_STYLE) as [WorkerStatus, (typeof STATUS_STYLE)[WorkerStatus]][]).map(
          ([key, value]) => (
            <li key={key} className="flex items-center gap-1.5 text-[0.65rem] text-slate-400">
              <span className={`h-1.5 w-1.5 rounded-full ${value.dot}`} />
              {value.label}
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="font-mono text-sm font-semibold text-white">{value}</span>
      <span>{label}</span>
    </span>
  );
}

function FloorLabel({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute font-mono text-[0.55rem] font-semibold tracking-[0.28em] text-slate-600 ${className}`}
    >
      {children}
    </span>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { WarehouseScene, type TaskPackage, type WarehouseWorker } from "@/components/warehouse";
import { createDemoProvider, type DemoProvider } from "@/lib/demo-provider";
import type { AgentState, WarehouseAgent, WarehouseEvent, WarehouseSnapshot, WarehouseTask } from "@/lib/domain";

const speeds = [
  { label: "1×", value: 5000 },
  { label: "2×", value: 2600 },
  { label: "4×", value: 1300 },
];

const stateTone: Record<AgentState, string> = {
  idle: "bg-slate-400", planning: "bg-violet-400", working: "bg-cyan-400", waiting: "bg-amber-300",
  blocked: "bg-orange-400", reviewing: "bg-fuchsia-400", completed: "bg-emerald-400", failed: "bg-rose-400", paused: "bg-slate-500",
};

const roleLabel: Record<WarehouseAgent["role"], string> = {
  orchestrator: "Orchestrator / Foreman", frontend: "Frontend Builder", backend: "Backend Builder", qa: "QA Inspector", researcher: "Researcher / Analyst",
};

function toWorker(agent: WarehouseAgent, index: number, task?: WarehouseTask): WarehouseWorker {
  const position = [[50, 20], [24, 46], [76, 46], [32, 76], [68, 76]][index] ?? [50, 50];
  return {
    id: agent.id,
    name: agent.name,
    role: agent.role === "researcher" ? "research" : agent.role,
    roleLabel: roleLabel[agent.role],
    status: agent.state === "paused" ? "waiting" : agent.state,
    currentTask: task?.title ?? "Available for the next work order",
    progress: task?.status === "done" ? 100 : task?.status === "in_review" ? 82 : agent.state === "working" ? 64 : agent.state === "waiting" ? 42 : 28,
    position: { x: position[0], y: position[1] },
  };
}

function eventText(event: WarehouseEvent, agents: WarehouseAgent[]) {
  const person = agents.find((agent) => agent.id === event.agentId)?.name ?? "System";
  if (event.type === "message.sent") return event.payload.message.text;
  if (event.type === "user.command.sent") return `You → ${person}: ${event.payload.text}`;
  if (event.type === "user.command.response") return `${person}: ${event.payload.text}`;
  if (event.type === "tool.started" || event.type === "tool.completed") return `${person} · ${event.payload.summary}`;
  if (event.type === "task.completed") return `${person} completed a work order`;
  if (event.type === "agent.state_changed") return `${person} is now ${event.payload.current.replace("_", " ")}`;
  return event.type.replace(".", " · ");
}

export function WarehouseDashboard() {
  const [provider] = useState<DemoProvider>(createDemoProvider);
  const [snapshot, setSnapshot] = useState<WarehouseSnapshot>(() => provider.getSnapshot());
  const [selectedId, setSelectedId] = useState(snapshot.agents[0]?.id ?? "");
  const [isPlaying, setIsPlaying] = useState(true);
  const [intervalMs, setIntervalMs] = useState(speeds[0].value);
  const [command, setCommand] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [notice, setNotice] = useState("Demo provider connected · no external agent actions are available.");

  useEffect(() => provider.subscribe((_event, next) => setSnapshot(next)), [provider]);
  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => provider.advance(), intervalMs);
    return () => window.clearInterval(timer);
  }, [provider, isPlaying, intervalMs]);

  const selected = snapshot.agents.find((agent) => agent.id === selectedId) ?? snapshot.agents[0];
  const tasksById = useMemo(() => new Map(snapshot.tasks.map((task) => [task.id, task])), [snapshot.tasks]);
  const workers = useMemo(() => snapshot.agents.map((agent, index) => toWorker(agent, index, agent.currentTaskId ? tasksById.get(agent.currentTaskId) : undefined)), [snapshot.agents, tasksById]);
  const packages = useMemo<TaskPackage[]>(() => [
    { id: "handoff-stream", label: "Event contract", fromWorkerId: "agent-foreman", toWorkerId: "agent-backend", state: "moving", progress: 60 },
    { id: "handoff-ui", label: "Interface build", fromWorkerId: "agent-frontend", toWorkerId: "agent-qa", state: "moving", progress: 44 },
    { id: "handoff-research", label: "Constraint brief", fromWorkerId: "agent-research", toWorkerId: "agent-foreman", state: "delivered", progress: 100 },
  ], []);
  const activeTasks = snapshot.tasks.filter((task) => task.status !== "done");
  const recentEvents = [...snapshot.events].slice(-6).reverse();

  function reset() {
    const next = provider.reset();
    setSnapshot(next);
    setSelectedId(next.agents[0]?.id ?? "");
    setNotice("Demo run reset to its seeded timeline.");
  }

  function createIncident() {
    setIsPlaying(false);
    setNotice("Sample incident raised: stream latency is being held for QA review. (Demo-only)");
  }

  function submitCommand(text = command) {
    if (!selected || !text.trim() || isSending) return;
    setIsSending(true);
    setNotice(`Sending a safe demo command to ${selected.name}…`);
    window.setTimeout(() => {
      const response = provider.sendCommand({ agentId: selected.id, text });
      setSnapshot(provider.getSnapshot());
      setCommand("");
      setNotice(
        response.response.type === "user.command.response"
          ? response.response.payload.text
          : "Demo command recorded.",
      );
      setIsSending(false);
    }, 420);
  }

  return (
    <main className="grid-fade min-h-screen px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.24em] text-cyan-300">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_16px_#67e8f9]" /> Agent Warehouse
            </div>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">Your AI team, visible at work.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">A live, replayable floor for agent handoffs, tooling, and delivery decisions.</p>
            <Link href="/runs" className="mt-4 inline-flex text-xs font-semibold text-cyan-300 transition hover:text-cyan-100">Open run history <span aria-hidden="true" className="ml-1">→</span></Link>
          </div>
          <div className="panel flex flex-wrap items-center gap-2 rounded-2xl p-2">
            <span className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-300">DEMO MODE</span>
            <button onClick={() => setIsPlaying((value) => !value)} className="rounded-xl bg-white/8 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15">{isPlaying ? "Pause floor" : "Resume floor"}</button>
            <select aria-label="Demo speed" value={intervalMs} onChange={(event) => setIntervalMs(Number(event.target.value))} className="rounded-xl border border-white/10 bg-[#101d27] px-3 py-2 text-xs font-semibold text-slate-200 outline-none">
              {speeds.map((speed) => <option key={speed.value} value={speed.value}>{speed.label} speed</option>)}
            </select>
            <button onClick={reset} className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10">Reset</button>
            <button onClick={createIncident} className="rounded-xl border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/20">Create incident</button>
          </div>
        </header>

        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Live workers" value={`${snapshot.agents.filter((agent) => ["working", "planning", "reviewing"].includes(agent.state)).length} / ${snapshot.agents.length}`} detail="On the floor now" />
          <Metric label="Active orders" value={String(activeTasks.length)} detail="Across 3 work zones" />
          <Metric label="Handoffs" value={String(snapshot.messages.length)} detail="Recorded this run" />
          <Metric label="Run health" value="98%" detail="Demo telemetry" accent="text-emerald-300" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
          <section className="min-w-0 space-y-5">
            <WarehouseScene workers={workers} packages={packages} selectedWorkerId={selectedId} onWorkerSelect={(worker) => setSelectedId(worker.id)} />
            <section aria-labelledby="orders-heading" className="panel overflow-hidden rounded-3xl">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div><p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-slate-500">Production queue</p><h2 id="orders-heading" className="mt-1 font-semibold text-white">Active work orders</h2></div>
                <span className="font-mono text-xs text-slate-500">RUN-01</span>
              </div>
              <div className="divide-y divide-white/[0.07]">
                {activeTasks.map((task) => <TaskRow key={task.id} task={task} agents={snapshot.agents} onSelect={(agentId) => setSelectedId(agentId)} />)}
              </div>
            </section>
          </section>

          <aside className="space-y-5">
            <section className="panel rounded-3xl p-5" aria-live="polite">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-slate-500">Selected worker</p>
              {selected ? <>
                <div className="mt-4 flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl text-xl" style={{ background: `${selected.color}25`, color: selected.color }}>{selected.icon}</span><div><h2 className="font-semibold text-white">{selected.name}</h2><p className="text-xs text-slate-400">{roleLabel[selected.role]}</p></div></div>
                <div className="mt-5 grid grid-cols-2 gap-2 text-xs"><Info label="State" value={selected.state.replace("_", " ")} /><Info label="Model" value={selected.model ?? "Unassigned"} /></div>
                <p className="mt-4 border-l-2 border-cyan-300/50 pl-3 text-sm leading-5 text-slate-300">{selected.mission}</p>
                <p className="mt-4 text-xs text-slate-500">{selected.station} · {selected.currentTaskId ? tasksById.get(selected.currentTaskId)?.title : "Awaiting task"}</p>
                <div className="mt-5 border-t border-white/10 pt-4"><p className="mb-2 text-xs font-semibold text-slate-300">Send a work instruction</p><div className="flex gap-2"><input value={command} maxLength={500} onChange={(event) => setCommand(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submitCommand(); }} placeholder="Ask for an update…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/50" /><button disabled={isSending || !command.trim()} onClick={() => submitCommand()} className="rounded-xl bg-cyan-300 px-3 py-2 text-xs font-bold text-[#061017] disabled:opacity-40">{isSending ? "…" : "Send"}</button></div><div className="mt-2 flex flex-wrap gap-1.5">{["Give me an update", "Prioritize this", "Pause after task"].map((suggestion) => <button key={suggestion} onClick={() => submitCommand(suggestion)} className="rounded-lg border border-white/10 px-2 py-1 text-[0.65rem] text-slate-400 hover:border-cyan-300/30 hover:text-cyan-200">{suggestion}</button>)}</div></div>
              </> : null}
            </section>

            <section className="panel rounded-3xl p-5"><div className="flex items-center justify-between"><div><p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-slate-500">Live event feed</p><h2 className="mt-1 font-semibold text-white">Floor radio</h2></div><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 motion-reduce:animate-none" /></div><div className="mt-4 space-y-4">{recentEvents.map((event) => <div key={event.id} className="flex gap-3"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${event.source === "user" ? "bg-amber-300" : "bg-cyan-300"}`} /><div className="min-w-0"><p className="text-xs leading-5 text-slate-300">{eventText(event, snapshot.agents)}</p><p className="mt-0.5 font-mono text-[0.6rem] uppercase text-slate-600">{event.type}</p></div></div>)}</div></section>
            <p className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.04] px-4 py-3 text-xs leading-5 text-slate-400">{notice}</p>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value, detail, accent = "text-white" }: { label: string; value: string; detail: string; accent?: string }) {
  return <div className="panel rounded-2xl px-4 py-3"><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p><div className="mt-2 flex items-baseline justify-between gap-2"><strong className={`text-xl tracking-tight ${accent}`}>{value}</strong><span className="text-right text-[0.65rem] text-slate-500">{detail}</span></div></div>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-2.5"><p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p><p className="mt-1 truncate text-xs capitalize text-slate-200">{value}</p></div>; }

function TaskRow({ task, agents, onSelect }: { task: WarehouseTask; agents: WarehouseAgent[]; onSelect: (agentId: string) => void }) {
  const agent = agents.find((person) => person.id === task.assigneeIds[0]);
  const tones: Record<WarehouseTask["status"], string> = { backlog: "bg-slate-400", ready: "bg-amber-300", in_progress: "bg-cyan-300", in_review: "bg-fuchsia-400", blocked: "bg-orange-400", done: "bg-emerald-400" };
  return <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"><span className={`h-2 w-2 shrink-0 rounded-full ${tones[task.status]}`} /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-100">{task.title}</p><p className="mt-1 truncate text-xs text-slate-500">{task.description}</p></div><div className="flex items-center gap-3"><span className="rounded-lg border border-white/[0.08] px-2 py-1 font-mono text-[0.6rem] uppercase text-slate-400">{task.status.replace("_", " ")}</span>{agent ? <button onClick={() => onSelect(agent.id)} className="flex items-center gap-2 text-left"><span className={`h-2 w-2 rounded-full ${stateTone[agent.state]}`} /><span className="text-xs text-slate-300">{agent.name}</span></button> : null}</div></div>;
}

import Link from "next/link";

import { DEMO_INITIAL_EVENTS, DEMO_RUN, DEMO_TASKS } from "@/lib/demo-data";

function label(event: (typeof DEMO_INITIAL_EVENTS)[number]) {
  if (event.type === "message.sent") return event.payload.message.text;
  if (event.type === "task.completed") return "Research handoff accepted and work order completed.";
  if (event.type === "artifact.created") return `Artifact logged: ${event.payload.artifact.name}`;
  if (event.type === "agent.created") return `${event.payload.agent.name} checked in at ${event.payload.agent.station}.`;
  if (event.type === "task.created") return `Work order opened: ${event.payload.task.title}`;
  return event.type.replace(".", " · ");
}

export default function RunsPage() {
  return (
    <main className="grid-fade min-h-screen px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="inline-flex text-xs font-semibold text-cyan-300 hover:text-cyan-100">← Back to floor</Link>
        <header className="mt-6 border-b border-white/10 pb-7">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-slate-500">Replay archive</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-4xl font-semibold tracking-tight text-white">Run history</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Inspect a deterministic record of work orders, handoffs, and artifacts. The current MVP seeds this archive locally; production storage is documented for the provider boundary.</p></div><span className="w-fit rounded-xl border border-emerald-300/15 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-300">{DEMO_RUN.status.toUpperCase()}</span></div>
        </header>

        <section className="panel mt-6 rounded-3xl p-5 sm:p-7" aria-labelledby="run-title">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-cyan-300">{DEMO_RUN.id}</p><h2 id="run-title" className="mt-2 text-2xl font-semibold text-white">{DEMO_RUN.title}</h2><p className="mt-2 max-w-2xl text-sm text-slate-400">{DEMO_RUN.objective}</p></div><dl className="grid grid-cols-2 gap-4 text-xs"><div><dt className="uppercase tracking-wider text-slate-600">Provider</dt><dd className="mt-1 font-semibold text-slate-200">{DEMO_RUN.provider}</dd></div><div><dt className="uppercase tracking-wider text-slate-600">Events</dt><dd className="mt-1 font-semibold text-slate-200">{DEMO_INITIAL_EVENTS.length}</dd></div></dl></div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]"><div><h3 className="text-sm font-semibold text-white">Work order snapshot</h3><ul className="mt-3 space-y-2">{DEMO_TASKS.map((task) => <li key={task.id} className="rounded-xl border border-white/[0.07] bg-black/10 p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-slate-200">{task.title}</span><span className="font-mono text-[0.6rem] uppercase text-slate-500">{task.status.replace("_", " ")}</span></div><p className="mt-1 text-xs leading-5 text-slate-500">{task.description}</p></li>)}</ul></div><div><h3 className="text-sm font-semibold text-white">Immutable event timeline</h3><ol className="mt-3 space-y-0 border-l border-cyan-300/20 pl-5">{DEMO_INITIAL_EVENTS.map((event) => <li key={event.id} className="relative pb-4 last:pb-0"><span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full border-2 border-[#0a141d] bg-cyan-300" /><p className="text-xs leading-5 text-slate-300">{label(event)}</p><p className="mt-0.5 font-mono text-[0.6rem] uppercase tracking-wide text-slate-600">#{event.sequence.toString().padStart(3, "0")} · {event.type}</p></li>)}</ol></div></div>
        </section>
      </div>
    </main>
  );
}

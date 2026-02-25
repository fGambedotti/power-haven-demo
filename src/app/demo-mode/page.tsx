"use client";

import { useMemo, useState } from "react";
import { PageHero, StatTile } from "../../components/ProductUI";
import RoleLens from "../../components/RoleLens";

const sequence = [
  {
    id: "shadow",
    title: "Observe Demand (Shadow Mode)",
    route: "/shadow-mode",
    durationSec: 45,
    objective: "Show non-invasive monitoring, forecast confidence, and detected flex windows.",
    talkTrack: "We start read-only. VoltPilot learns demand and pre-notifies flexible windows before any control integration."
  },
  {
    id: "portfolio",
    title: "Rank Portfolio Readiness",
    route: "/portfolio",
    durationSec: 40,
    objective: "Show aggregator prioritization across sites.",
    talkTrack: "The portfolio engine ranks sites by forecasted headroom, reserve policy, and confidence."
  },
  {
    id: "dispatch",
    title: "Execute Safe Dispatch",
    route: "/",
    durationSec: 50,
    objective: "Trigger NESO dispatch and show safety constraints and fail-safe behavior.",
    talkTrack: "Dispatch is allowed only if reserve, control-link, and load constraints all pass."
  },
  {
    id: "proof",
    title: "Prove Value and Reporting",
    route: "/revenue",
    durationSec: 35,
    objective: "Show value capture, service mix, and reporting outputs.",
    talkTrack: "Commercial and operations stakeholders get clear, exportable performance evidence."
  },
  {
    id: "roi",
    title: "Counterfactual Economics",
    route: "/roi-studio",
    durationSec: 45,
    objective: "Quantify with-vs-without VoltPilot outcomes.",
    talkTrack: "This converts technical capability into an investment case and pilot scope discussion."
  }
] as const;

export default function DemoModePage() {
  const [active, setActive] = useState(0);
  const totalTime = useMemo(() => sequence.reduce((s, x) => s + x.durationSec, 0), []);
  const current = sequence[active];

  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHero
        eyebrow="Demo Mode"
        title="Guided product story (investor-ready)"
        description="One coherent sequence for presenting VoltPilot from observability to orchestration to proof of value."
        right={
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatTile label="Scenes" value={`${sequence.length}`} />
            <StatTile label="Run time" value={`${Math.ceil(totalTime / 60)} min`} />
            <StatTile label="Current" value={`${active + 1}/${sequence.length}`} />
          </div>
        }
      />

      <RoleLens context="demo" />

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
        <div className="panel p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Scene sequence</p>
          <div className="mt-3 space-y-2">
            {sequence.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setActive(idx)}
                className={`w-full rounded-xl border px-3 py-3 text-left ${idx === active ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-800">{idx + 1}. {item.title}</p>
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{item.durationSec}s</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{item.objective}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Active scene</p>
                <p className="font-display text-xl font-semibold text-slate-900">{current.title}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setActive((i) => Math.max(0, i - 1))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-700">Prev</button>
                <button onClick={() => setActive((i) => Math.min(sequence.length - 1, i + 1))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-700">Next</button>
                <a href={current.route} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white">Open Scene</a>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Objective</p>
              <p className="mt-1 text-sm text-slate-700">{current.objective}</p>
              <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Talk track</p>
              <p className="mt-1 text-sm text-slate-700">{current.talkTrack}</p>
              <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Route</p>
              <p className="mt-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-700">{current.route}</p>
            </div>
          </div>

          <div className="panel p-5 sm:p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Presenter checklist</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li className="rounded-lg border border-slate-200 bg-white px-3 py-2">Keep each scene under target duration; move fast.</li>
              <li className="rounded-lg border border-slate-200 bg-white px-3 py-2">Lead with safety and trust before revenue claims.</li>
              <li className="rounded-lg border border-slate-200 bg-white px-3 py-2">Use ROI Studio only after showing operational feasibility.</li>
              <li className="rounded-lg border border-slate-200 bg-white px-3 py-2">End on a pilot proposal discussion, not a chart detail debate.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

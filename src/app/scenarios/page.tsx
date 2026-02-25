"use client";

import { useMemo, useState } from "react";
import { PageHero } from "../../components/ProductUI";

const scenarios = [
  {
    id: "wind-curtailment",
    title: "Wind Curtailment Absorption",
    summary: "Excess renewable output creates a charge opportunity for datacentre UPS assets.",
    steps: [
      { t: "00:00", phase: "Detect", detail: "Regional wind output exceeds local demand; curtailment risk rises." },
      { t: "00:15", phase: "Forecast", detail: "Shadow Mode predicts low internal load and identifies safe charging headroom." },
      { t: "00:30", phase: "Decide", detail: "Portfolio engine ranks eligible sites and allocates charging setpoints." },
      { t: "00:45", phase: "Prove", detail: "Event logged with reserve preserved and carbon displacement estimate." }
    ]
  },
  {
    id: "grid-stress",
    title: "Grid Stress Frequency Support",
    summary: "Dispatch event requests fast discharge while backup reserve remains protected.",
    steps: [
      { t: "00:00", phase: "Detect", detail: "Frequency response requirement detected from system operator event." },
      { t: "00:10", phase: "Check", detail: "Reserve floor, control link, and site load thresholds pass validation." },
      { t: "00:20", phase: "Dispatch", detail: "Battery discharges under service constraints; nearby corridors highlighted." },
      { t: "00:40", phase: "Settle", detail: "Revenue accrues and audit trail captures compliance state." }
    ]
  },
  {
    id: "failsafe",
    title: "Control Link Loss Fail-safe",
    summary: "System defaults to backup-only mode and blocks dispatch immediately.",
    steps: [
      { t: "00:00", phase: "Detect", detail: "Telemetry heartbeat misses threshold and communication integrity fails." },
      { t: "00:05", phase: "Protect", detail: "Flex dispatch curtailed; reserve locked to 100% backup priority." },
      { t: "00:10", phase: "Notify", detail: "Operator alert and event log update recorded with abort reason." },
      { t: "00:20", phase: "Recover", detail: "System remains in backup-only until control link restored and revalidated." }
    ]
  }
] as const;

export default function ScenariosPage() {
  const [scenarioId, setScenarioId] = useState<(typeof scenarios)[number]["id"]>(scenarios[0].id);
  const [stepIndex, setStepIndex] = useState(0);

  const scenario = scenarios.find((s) => s.id === scenarioId) ?? scenarios[0];
  const step = scenario.steps[stepIndex];

  const progress = useMemo(() => ((stepIndex + 1) / scenario.steps.length) * 100, [stepIndex, scenario.steps.length]);

  function selectScenario(id: string) {
    setScenarioId(id as (typeof scenarios)[number]["id"]);
    setStepIndex(0);
  }

  function nextStep() {
    setStepIndex((idx) => Math.min(scenario.steps.length - 1, idx + 1));
  }

  function prevStep() {
    setStepIndex((idx) => Math.max(0, idx - 1));
  }

  function autoplay() {
    let i = 0;
    setStepIndex(0);
    const timer = setInterval(() => {
      i += 1;
      setStepIndex((prev) => {
        if (prev >= scenario.steps.length - 1) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
      if (i >= scenario.steps.length - 1) clearInterval(timer);
    }, 900);
  }

  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHero
        eyebrow="Guided Replay"
        title="Deterministic demo scenarios"
        description="Presentation-safe scenario presets explain system behavior step-by-step with consistent outcomes and language."
      />

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.3fr]">
        <div className="panel p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Scenario presets</p>
          <div className="mt-3 space-y-2">
            {scenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => selectScenario(s.id)}
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${s.id === scenarioId ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
              >
                <p className="text-sm font-semibold text-slate-800">{s.title}</p>
                <p className="mt-1 text-xs text-slate-600">{s.summary}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Active scenario</p>
                <p className="font-display text-xl font-semibold text-slate-900">{scenario.title}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={prevStep} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-700">Prev</button>
                <button onClick={nextStep} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-700">Next</button>
                <button onClick={autoplay} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white">Replay</button>
              </div>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-700" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{step.phase}</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">T+{step.t}</p>
              <p className="mt-2 text-sm text-slate-600">{step.detail}</p>
            </div>
          </div>

          <div className="panel p-5 sm:p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Presenter notes</p>
            <ol className="mt-3 space-y-2 text-sm text-slate-700">
              {scenario.steps.map((s, idx) => (
                <li key={`${s.t}-${s.phase}`} className={`rounded-lg border px-3 py-2 ${idx === stepIndex ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}>
                  <span className="font-semibold">{idx + 1}. {s.phase}</span> - {s.detail}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </main>
  );
}

"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";

type Role = "Ops" | "Commercial" | "Investor";
type Context = "dispatch" | "shadow" | "portfolio" | "revenue" | "compliance" | "roi" | "demo";

const ROLE_COPY: Record<Context, Record<Role, string>> = {
  dispatch: {
    Ops: "Focus on reserve protection, fail-safe state, and dispatch eligibility rules.",
    Commercial: "Focus on service activation quality, utilization headroom, and revenue capture continuity.",
    Investor: "Focus on safe controllability and why this expands into a scalable aggregator platform."
  },
  shadow: {
    Ops: "Focus on data quality, forecast confidence, and false-positive reduction for flex windows.",
    Commercial: "Focus on pre-notification quality and how it improves commercial readiness before dispatch integration.",
    Investor: "Focus on low-friction entry wedge: read-only monitoring that produces proprietary demand data."
  },
  portfolio: {
    Ops: "Focus on readiness ranking logic and risk-aware site selection under constraints.",
    Commercial: "Focus on aggregate flexible MW and which sites monetize best in near-term windows.",
    Investor: "Focus on portfolio orchestration as the core aggregator moat, not single-site control."
  },
  revenue: {
    Ops: "Focus on service contribution stability and evidence trails for settlement reconciliation.",
    Commercial: "Focus on service mix, price sensitivity, and recurring value capture patterns.",
    Investor: "Focus on repeatable revenue mechanics and reporting maturity for enterprise sales."
  },
  compliance: {
    Ops: "Focus on policy enforcement states and failure handling evidence.",
    Commercial: "Focus on audit-readiness as a procurement accelerant and risk reducer.",
    Investor: "Focus on trust layer defensibility and enterprise adoption readiness."
  },
  roi: {
    Ops: "Focus on reserve assumptions and utilization inputs that drive operational feasibility.",
    Commercial: "Focus on net revenue, service pricing sensitivity, and pilot sizing.",
    Investor: "Focus on with-vs-without uplift and scalability of portfolio economics."
  },
  demo: {
    Ops: "Lead with safety, controls, and fail-safe before discussing economics.",
    Commercial: "Lead with value proof and pilot scope after operational feasibility is shown.",
    Investor: "Lead with wedge, moat, and expansion path from Shadow Mode to orchestration."
  }
};

export default function RoleLens({ context }: { context: Context }) {
  const [role, setRole] = useState<Role>("Investor");

  useEffect(() => {
    const saved = window.localStorage.getItem("voltpilot-role-lens") as Role | null;
    if (saved && ["Ops", "Commercial", "Investor"].includes(saved)) setRole(saved);
  }, []);

  function choose(next: Role) {
    setRole(next);
    window.localStorage.setItem("voltpilot-role-lens", next);
  }

  return (
    <div className="panel p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Role View</p>
          <p className="text-sm font-semibold text-slate-800">{role} lens</p>
        </div>
        <div className="flex gap-2">
          {(["Ops", "Commercial", "Investor"] as Role[]).map((opt) => (
            <button
              key={opt}
              onClick={() => choose(opt)}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] transition",
                role === opt ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-600">{ROLE_COPY[context][role]}</p>
    </div>
  );
}

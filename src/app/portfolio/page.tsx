"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import datacentres from "../../../data/datacentres.json";

function scoreSite(dc: (typeof datacentres)[number], i: number) {
  const loadFactor = 0.78 + ((i % 7) * 0.03);
  const forecastLoadMw = dc.baselineLoadMw * loadFactor;
  const reservePolicyPct = 25 + (i % 4) * 5;
  const reserveLockedMw = (dc.batteryMw * reservePolicyPct) / 100;
  const availableFlexMw = Math.max(0, dc.batteryMw - reserveLockedMw - forecastLoadMw * 0.08);
  const confidencePct = 84 + (i % 6) * 2;
  const readiness = Math.round(Math.min(100, availableFlexMw * 0.9 + confidencePct * 0.45));
  return {
    ...dc,
    forecastLoadMw: round1(forecastLoadMw),
    reservePolicyPct,
    availableFlexMw: round1(availableFlexMw),
    confidencePct,
    readiness,
    nextWindow: `${String((i * 2) % 24).padStart(2, "0")}:00-${String(((i * 2) % 24) + 2).padStart(2, "0")}:00`
  };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export default function PortfolioPage() {
  const sites = useMemo(() => datacentres.map(scoreSite).sort((a, b) => b.readiness - a.readiness), []);
  const top10 = sites.slice(0, 10);
  const totals = useMemo(() => {
    const portfolioFlexMw = sites.reduce((s, x) => s + x.availableFlexMw, 0);
    const weightedConfidence = sites.reduce((s, x) => s + x.confidencePct, 0) / sites.length;
    return {
      portfolioFlexMw: round1(portfolioFlexMw),
      weightedConfidence: Math.round(weightedConfidence),
      readySites: sites.filter((s) => s.readiness >= 70).length
    };
  }, [sites]);

  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Portfolio Operations</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-slate-900">Aggregator readiness and site prioritization</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Portfolio-level view ranks candidate sites by forecast headroom, reserve policy, and forecast confidence to
              support dispatch allocation decisions.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Portfolio flex available" value={`${totals.portfolioFlexMw} MW`} note="Forecast-adjusted" />
        <Metric label="Ready sites (>=70)" value={`${totals.readySites}/${sites.length}`} note="Dispatch readiness score" />
        <Metric label="Forecast confidence" value={`${totals.weightedConfidence}%`} note="Portfolio weighted average" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_1.2fr]">
        <div className="panel p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Top dispatch candidates</p>
          <div className="mt-4 h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} layout="vertical" margin={{ left: 12, right: 12, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbe3ef" />
                <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fill: "#475569", fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="availableFlexMw" fill="#0284c7" radius={[0, 4, 4, 0]} name="Available flex (MW)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Site ranking table</p>
            <p className="mt-1 text-sm text-slate-600">Shows how an aggregator prioritizes sites before dispatching flexibility.</p>
          </div>
          <div className="max-h-[430px] overflow-auto px-4 py-4 sm:px-6">
            <table className="w-full text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="px-2 py-2 text-left">Site</th>
                  <th className="px-2 py-2 text-left">Region</th>
                  <th className="px-2 py-2 text-right">Flex MW</th>
                  <th className="px-2 py-2 text-right">Conf.</th>
                  <th className="px-2 py-2 text-right">Ready</th>
                  <th className="px-2 py-2 text-left">Next window</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => (
                  <tr key={site.id} className="border-t border-slate-100">
                    <td className="px-2 py-2 font-semibold text-slate-800">{site.name}</td>
                    <td className="px-2 py-2 text-slate-600">{site.region}</td>
                    <td className="px-2 py-2 text-right text-slate-700">{site.availableFlexMw}</td>
                    <td className="px-2 py-2 text-right text-slate-700">{site.confidencePct}%</td>
                    <td className="px-2 py-2 text-right">
                      <span className={`rounded-full px-2 py-1 font-bold ${site.readiness >= 80 ? "bg-emerald-100 text-emerald-700" : site.readiness >= 60 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                        {site.readiness}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-slate-600">{site.nextWindow}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="metric-tile p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  );
}

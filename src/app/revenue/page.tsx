"use client";

import { useMemo } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Pie, PieChart, Cell } from "recharts";
import clsx from "clsx";

const dailyRevenue = Array.from({ length: 14 }).map((_, index) => ({
  day: `Day ${index + 1}`,
  revenue: Math.round(4200 + Math.sin(index / 2) * 900 + index * 120)
}));

const serviceBreakdown = [
  { name: "Dynamic Containment", value: 62 },
  { name: "Balancing Mechanism", value: 38 }
];

const eventLogSample = [
  { id: "EV-091", service: "Dynamic Containment", direction: "DISCHARGE", targetMw: 70, status: "EXECUTED" },
  { id: "EV-092", service: "Balancing Mechanism", direction: "CHARGE", targetMw: 55, status: "CURTAILED" },
  { id: "EV-093", service: "Dynamic Containment", direction: "DISCHARGE", targetMw: 60, status: "EXECUTED" }
];

const COLORS = ["#2563eb", "#10b981"];

function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  const headers = Object.keys(rows[0] ?? {});
  const csv = [headers.join(",")]
    .concat(rows.map((row) => headers.map((key) => row[key]).join(",")))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function RevenuePage() {
  const total = useMemo(() => dailyRevenue.reduce((sum, row) => sum + row.revenue, 0), []);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-6">
      <div className="rounded-3xl border border-slate/10 bg-white p-6 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate/60">Revenue & Reporting</p>
            <h1 className="mt-2 font-display text-3xl text-ink">Dispatch revenue performance</h1>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.3em] text-slate/60">14-day total</p>
            <p className="text-2xl font-semibold text-ink">£{total.toLocaleString()}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl border border-slate/10 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate/60">Daily revenue</p>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyRevenue}>
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate/10 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate/60">Service mix</p>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={serviceBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                    {serviceBreakdown.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              {serviceBreakdown.map((service, index) => (
                <div key={service.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                    <span>{service.name}</span>
                  </div>
                  <span className="font-semibold text-ink">{service.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate/10 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate/60">Export data</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                className={clsx("rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white")}
                onClick={() => downloadCsv("power-haven-event-log.csv", eventLogSample)}
              >
                Export event log CSV
              </button>
              <button
                className={clsx("rounded-full border border-ink px-4 py-2 text-xs font-semibold text-ink")}
                onClick={() => downloadCsv("power-haven-revenue-summary.csv", dailyRevenue)}
              >
                Export revenue summary CSV
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate/10 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate/60">Notes</p>
            <p className="mt-2 text-sm text-slate">
              Revenue series and service breakdown are simulated for demo purposes. Exported CSVs include
              the current snapshot used in this view.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

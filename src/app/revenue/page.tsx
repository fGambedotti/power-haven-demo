"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart
} from "recharts";
import marketSignals from "../../../data/market_signals.json";
import { PageHero, StatTile } from "../../components/ProductUI";

const dailyRevenue = Array.from({ length: 14 }).map((_, index) => ({
  day: `D${index + 1}`,
  revenue: Math.round(4300 + Math.sin(index / 2.2) * 760 + index * 135),
  baseline: 4200 + index * 120
}));

const serviceBreakdown = [
  { name: "Dynamic Containment", value: 62, color: "#0284c7" },
  { name: "Balancing Mechanism", value: 38, color: "#10b981" }
];

const serviceDaily = dailyRevenue.map((row, index) => ({
  day: row.day,
  containment: Math.round(row.revenue * (0.58 + ((index % 4) - 1.5) * 0.02)),
  balancing: Math.round(row.revenue * (0.42 - ((index % 4) - 1.5) * 0.02))
}));

const eventLogSample = [
  { id: "EV-091", service: "Dynamic Containment", direction: "DISCHARGE", targetMw: 70, status: "EXECUTED" },
  { id: "EV-092", service: "Balancing Mechanism", direction: "CHARGE", targetMw: 55, status: "CURTAILED" },
  { id: "EV-093", service: "Dynamic Containment", direction: "DISCHARGE", targetMw: 60, status: "EXECUTED" }
];

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

function money(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

export default function RevenuePage() {
  const total = useMemo(() => dailyRevenue.reduce((sum, row) => sum + row.revenue, 0), []);
  const mean = useMemo(() => total / dailyRevenue.length, [total]);
  const peak = useMemo(() => Math.max(...dailyRevenue.map((d) => d.revenue)), []);
  const marketSummary = useMemo(
    () =>
      marketSignals.hours.map((h) => ({
        hour: h.hour,
        blendedPrice: Math.round(h.dynamicContainment * 0.45 + h.balancingMechanism * 0.55),
        curtailmentMwh: h.curtailmentMwh
      })),
    []
  );

  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHero
        eyebrow="Revenue & Reporting"
        title="Dispatch value analytics"
        description="Simulated settlement performance across grid services with export-ready reporting outputs."
        right={
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <StatTile label="14-day total" value={money(total)} />
            <StatTile label="Daily mean" value={money(mean)} />
            <StatTile label="Peak day" value={money(peak)} />
          </div>
        }
      />

      <section className="grid gap-6 lg:grid-cols-[1.45fr_0.95fr]">
        <div className="panel p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Daily revenue trend</p>
          <p className="mb-4 mt-1 text-sm text-slate-600">Shaded area shows realized revenue. Dashed line indicates baseline expectation.</p>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyRevenue} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbe3ef" />
                <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => `£${v / 1000}k`} />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Legend />
                <Area type="monotone" dataKey="revenue" name="Realized" stroke="#0284c7" fill="url(#revFill)" strokeWidth={3} />
                <Area type="monotone" dataKey="baseline" name="Baseline" stroke="#64748b" fillOpacity={0} strokeDasharray="6 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel p-5 sm:p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Service mix</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={serviceBreakdown} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82}>
                    {serviceBreakdown.map((slice) => (
                      <Cell key={slice.name} fill={slice.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 text-sm">
              {serviceBreakdown.map((service) => (
                <div key={service.name} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: service.color }} />
                    {service.name}
                  </span>
                  <span className="font-bold text-slate-900">{service.value}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-5 sm:p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Export</p>
            <p className="mt-1 text-sm text-slate-600">Download reporting snapshots for meetings and diligence packs.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white"
                onClick={() => downloadCsv("power-haven-event-log.csv", eventLogSample)}
              >
                Event log CSV
              </button>
              <button
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-700"
                onClick={() => downloadCsv("power-haven-revenue-summary.csv", dailyRevenue)}
              >
                Revenue CSV
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="panel p-5 sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Daily service contribution</p>
        <p className="mb-4 mt-1 text-sm text-slate-600">Shows estimated revenue share by service each day for performance transparency.</p>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serviceDaily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbe3ef" />
              <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => `£${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(value) => money(Number(value))} />
              <Legend />
              <Bar dataKey="containment" name="Dynamic Containment" fill="#0284c7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="balancing" name="Balancing Mechanism" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Sample intraday market signals</p>
          <p className="mb-4 mt-1 text-sm text-slate-600">Illustrative prices and curtailment traces for revenue-context storytelling.</p>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={marketSummary}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbe3ef" />
                <XAxis dataKey="hour" interval={1} tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="blendedPrice" stroke="#0284c7" fill="#bfdbfe" fillOpacity={0.35} name="Blended price" />
                <Area type="monotone" dataKey="curtailmentMwh" stroke="#10b981" fill="#bbf7d0" fillOpacity={0.35} name="Curtailment" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Data provenance (demo)</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">Revenue and service split: simulated portfolio settlement outputs.</li>
            <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">Intraday prices and curtailment: illustrative UK-style sample traces.</li>
            <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">Purpose: improve realism and explain how commercial outcomes relate to system conditions.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

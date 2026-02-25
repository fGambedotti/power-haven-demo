"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import datacentres from "../../../data/datacentres.json";
import marketSignals from "../../../data/market_signals.json";
import weatherSites from "../../../data/weather_sites.json";
import DecisionRationale from "../../components/DecisionRationale";
import { PageHero, StatTile } from "../../components/ProductUI";

type Site = (typeof datacentres)[number];

type ForecastRow = {
  hour: string;
  actualMw: number;
  forecastMw: number;
  upperMw: number;
  lowerMw: number;
  flexMarginMw: number;
  flexWindow: boolean;
};

function buildForecast(site: Site): ForecastRow[] {
  return Array.from({ length: 24 }).map((_, h) => {
    const base = site.baselineLoadMw;
    const diurnal = Math.sin(((h - 7) / 24) * Math.PI * 2) * 0.12;
    const aiBurst = h >= 18 && h <= 21 ? 0.08 : 0;
    const maintenanceDip = h >= 2 && h <= 4 ? -0.05 : 0;
    const actualMw = base * (1 + diurnal + aiBurst + maintenanceDip);
    const forecastNoise = Math.sin((h + 2) * 1.1) * 0.018;
    const forecastMw = base * (1 + diurnal + aiBurst * 0.95 + maintenanceDip * 0.9 + forecastNoise);
    const uncertainty = Math.max(1.8, base * (h >= 17 && h <= 22 ? 0.07 : 0.05));
    const thresholdMw = base * 1.05;
    const headroomMw = Math.max(0, thresholdMw - forecastMw);
    return {
      hour: `${String(h).padStart(2, "0")}:00`,
      actualMw: round1(actualMw),
      forecastMw: round1(forecastMw),
      upperMw: round1(forecastMw + uncertainty),
      lowerMw: round1(Math.max(0, forecastMw - uncertainty)),
      flexMarginMw: round1(headroomMw),
      flexWindow: headroomMw >= Math.max(2, site.baselineLoadMw * 0.06)
    };
  });
}

function findWindows(rows: ForecastRow[]) {
  const windows: { start: number; end: number; avgFlexMw: number }[] = [];
  let start = -1;
  let sum = 0;
  let count = 0;

  rows.forEach((r, idx) => {
    if (r.flexWindow) {
      if (start === -1) start = idx;
      sum += r.flexMarginMw;
      count += 1;
      return;
    }
    if (start !== -1) {
      windows.push({ start, end: idx - 1, avgFlexMw: round1(sum / count) });
      start = -1;
      sum = 0;
      count = 0;
    }
  });

  if (start !== -1) {
    windows.push({ start, end: rows.length - 1, avgFlexMw: round1(sum / count) });
  }

  return windows;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export default function ShadowModePage() {
  const [selectedId, setSelectedId] = useState(datacentres[16]?.id ?? datacentres[0].id);
  const site = datacentres.find((d) => d.id === selectedId) ?? datacentres[0];

  const rows = useMemo(() => buildForecast(site), [site]);
  const windows = useMemo(() => findWindows(rows), [rows]);
  const mae = useMemo(() => round1(rows.reduce((s, r) => s + Math.abs(r.actualMw - r.forecastMw), 0) / rows.length), [rows]);
  const nextWindow = windows[0] ?? null;
  const totalFlexHours = windows.reduce((s, w) => s + (w.end - w.start + 1), 0);
  const avgFlex = round1(rows.reduce((s, r) => s + r.flexMarginMw, 0) / rows.length);
  const weather = weatherSites.find((w) => w.region === site.region);
  const marketRows = marketSignals.hours.map((r) => ({
    ...r,
    flexSignal: round1((r.dynamicContainment * 0.45 + r.curtailmentMwh * 0.9) / 10)
  }));

  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHero
        eyebrow="Shadow Mode"
        title="Demand forecasting and flex window pre-notification"
        description="Read-only monitoring predicts near-term datacentre demand and identifies safe flexibility windows before operational dispatch integration."
        right={
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-3 sm:w-auto">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Site under observation</p>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
            >
              {datacentres.map((dc) => (
                <option key={dc.id} value={dc.id}>{dc.name}</option>
              ))}
            </select>
          </div>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[1.15fr_1.05fr]">
        <div className="panel p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Market and curtailment context (sample)</p>
          <p className="mb-4 mt-1 text-sm text-slate-600">Illustrative UK-style price and curtailment traces used to contextualize pre-notification timing.</p>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={marketRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbe3ef" />
                <XAxis dataKey="hour" interval={1} tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="dynamicContainment" stroke="#0284c7" strokeWidth={2} dot={false} name="DC price" />
                <Line type="monotone" dataKey="balancingMechanism" stroke="#0f172a" strokeWidth={2} dot={false} name="BM price" />
                <Line type="monotone" dataKey="curtailmentMwh" stroke="#10b981" strokeWidth={2} dot={false} name="Curtailment MWh" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Regional weather linkage (sample)</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <InfoStat label="Region" value={site.region} />
            <InfoStat label="Wind speed" value={`${weather?.windSpeedMs ?? "-"} m/s`} />
            <InfoStat label="Temperature" value={`${weather?.tempC ?? "-"} °C`} />
            <InfoStat label="Wind forecast index" value={`${weather?.windForecastIndex ?? "-"} / 100`} />
          </div>
          <p className="mt-4 text-xs text-slate-600">
            In production, this layer would incorporate weather forecasts and market traces to improve flex window confidence and pre-notification quality.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Forecast MAE" value={`${mae} MW`} note="Synthetic daily error" />
        <StatTile label="Flex hours (24h)" value={`${totalFlexHours} h`} note="Predicted safe windows" />
        <StatTile label="Avg flex margin" value={`${avgFlex} MW`} note="Threshold headroom" />
        <StatTile label="Next window" value={nextWindow ? formatWindow(nextWindow.start, nextWindow.end) : "None"} note={nextWindow ? `${nextWindow.avgFlexMw} MW avg` : "No window predicted"} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <div className="panel p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Demand forecast (24h)</p>
          <p className="mb-4 mt-1 text-sm text-slate-600">
            Forecast line with confidence interval. Highlighted periods indicate predicted flexibility windows under the
            configured demand threshold proxy.
          </p>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rows} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="ciFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#93c5fd" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#93c5fd" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbe3ef" />
                <XAxis dataKey="hour" interval={1} tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                <Tooltip />
                {windows.map((w) => (
                  <ReferenceArea key={`${w.start}-${w.end}`} x1={rows[w.start].hour} x2={rows[w.end].hour} fill="#dcfce7" fillOpacity={0.4} />
                ))}
                <Area type="monotone" dataKey="upperMw" stroke="none" fill="url(#ciFill)" />
                <Area type="monotone" dataKey="lowerMw" stroke="none" fill="#fff" fillOpacity={1} />
                <Line type="monotone" dataKey="actualMw" stroke="#0f172a" strokeWidth={2} dot={false} name="Actual" />
                <Line type="monotone" dataKey="forecastMw" stroke="#0284c7" strokeWidth={3} dot={false} name="Forecast" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel p-5 sm:p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Flex windows</p>
            <div className="mt-3 space-y-2">
              {windows.length === 0 && <p className="text-sm text-slate-500">No flex windows detected.</p>}
              {windows.map((w, idx) => (
                <div key={`${w.start}-${w.end}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Window {idx + 1}</p>
                  <p className="font-semibold text-slate-800">{formatWindow(w.start, w.end)}</p>
                  <p className="text-xs text-slate-600">Avg headroom: {w.avgFlexMw} MW</p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-5 sm:p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Pre-notification payload (demo)</p>
            <pre className="mt-3 overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-3 text-xs text-slate-100">
{JSON.stringify(
  {
    siteId: site.id,
    siteName: site.name,
    mode: "shadow",
    forecastAccuracyMaeMw: mae,
    nextFlexWindow: nextWindow
      ? {
          startHour: rows[nextWindow.start].hour,
          endHour: rows[nextWindow.end].hour,
          avgHeadroomMw: nextWindow.avgFlexMw
        }
      : null,
    confidence: "illustrative",
    dispatchEnabled: false
  },
  null,
  2
)}
            </pre>
          </div>
        </div>
      </section>

      <section className="panel p-5 sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Interpretation</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <NoteCard title="Non-invasive" body="Shadow Mode is read-only. No battery or workload control is triggered." />
          <NoteCard title="Decision support" body="Predicted flex windows are planning signals for commercial and operational coordination." />
          <NoteCard title="Bridge to Option 3" body="Once validated with clients, the same data layer feeds dispatch and compliance workflows." />
        </div>
      </section>

      <DecisionRationale
        title="Why a flex window is flagged"
        subtitle="Shadow Mode suggests windows when forecast demand stays below a threshold proxy with acceptable uncertainty."
        outcome={nextWindow ? "Pre-notify Candidate" : "No Window"}
        rules={[
          {
            label: "Forecast confidence",
            value: `MAE ${mae} MW`,
            status: mae <= Math.max(2, site.baselineLoadMw * 0.08) ? "pass" : "warn",
            reason: "Lower forecast error improves confidence in pre-notification."
          },
          {
            label: "Headroom threshold",
            value: `${avgFlex} MW average`,
            status: avgFlex >= Math.max(2, site.baselineLoadMw * 0.06) ? "pass" : "warn",
            reason: "Minimum headroom avoids false positives."
          },
          {
            label: "Dispatch enablement",
            value: "Disabled in Shadow Mode",
            status: "pass",
            reason: "This route is observational and non-invasive."
          }
        ]}
      />

      <section className="panel p-5 sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Observed vs forecast residuals</p>
        <div className="mt-4 h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows.map((r) => ({ hour: r.hour, residual: round1(r.actualMw - r.forecastMw) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbe3ef" />
              <XAxis dataKey="hour" interval={1} tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="residual" stroke="#7c3aed" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </main>
  );
}

function NoteCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-xs text-slate-600">{body}</p>
    </div>
  );
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function formatWindow(start: number, end: number) {
  return `${String(start).padStart(2, "0")}:00-${String(end + 1).padStart(2, "0")}:00`;
}

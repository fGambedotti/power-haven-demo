"use client";

import { useMemo } from "react";

const auditEvents = [
  { ts: "2026-02-25T09:10:00Z", site: "London Docklands", event: "DISPATCH_REQUEST", service: "Dynamic Containment", result: "APPROVED", reason: "All constraints passed" },
  { ts: "2026-02-25T09:10:05Z", site: "London Docklands", event: "RESERVE_CHECK", service: "-", result: "PASS", reason: "SoC 68% > reserve 30%" },
  { ts: "2026-02-25T09:12:14Z", site: "Manchester Grid", event: "DISPATCH_REQUEST", service: "Balancing Mechanism", result: "REJECTED", reason: "Control link lost" },
  { ts: "2026-02-25T09:14:30Z", site: "Cambridge AI", event: "FAILSAFE_TRIGGER", service: "-", result: "ABORTED", reason: "Load spike above threshold" },
  { ts: "2026-02-25T09:16:40Z", site: "Slough Core", event: "DISPATCH_REQUEST", service: "Dynamic Containment", result: "CURTAILED", reason: "Reserve floor protection engaged" }
];

const controlPolicies = [
  { key: "Reserve floor", value: "Configurable per site (default 25-35% SoC)", status: "ENFORCED" },
  { key: "Grid failure mode", value: "Backup-only, dispatch blocked", status: "ENFORCED" },
  { key: "Control link integrity", value: "Heartbeat required; link loss triggers fail-safe", status: "ENFORCED" },
  { key: "Load spike threshold", value: "Site-specific threshold with immediate dispatch stop", status: "ENFORCED" },
  { key: "Audit trace retention (demo)", value: "Illustrative in-memory export", status: "SIMULATED" }
] as const;

function downloadCsv(filename: string, rows: Record<string, string>[]) {
  const headers = Object.keys(rows[0] ?? {});
  const csv = [headers.join(",")].concat(rows.map((r) => headers.map((h) => r[h]).join(","))).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CompliancePage() {
  const summary = useMemo(() => {
    const approved = auditEvents.filter((e) => e.result === "APPROVED").length;
    const blocked = auditEvents.filter((e) => ["REJECTED", "ABORTED", "CURTAILED"].includes(e.result)).length;
    return { approved, blocked, total: auditEvents.length };
  }, []);

  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="panel p-5 sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Compliance & Audit</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-slate-900">Operational trust and evidence layer</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Demonstrates control policy enforcement, fail-safe outcomes, and exportable audit traces for buyer diligence conversations.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Audit events" value={`${summary.total}`} note="Illustrative demo snapshot" />
        <Metric label="Approved" value={`${summary.approved}`} note="Constraints passed" />
        <Metric label="Blocked / curtailed" value={`${summary.blocked}`} note="Safety protections engaged" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
        <div className="panel p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Control policies</p>
          <div className="mt-3 space-y-2">
            {controlPolicies.map((p) => (
              <div key={p.key} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{p.key}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${p.status === "ENFORCED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{p.status}</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{p.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white" onClick={() => downloadCsv("voltpilot-audit-events.csv", auditEvents.map((e) => ({ ...e })))}>
              Export audit CSV
            </button>
            <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-700" onClick={() => downloadCsv("voltpilot-control-policies.csv", controlPolicies.map((p) => ({ key: p.key, value: p.value, status: p.status })))}>
              Export policy CSV
            </button>
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Audit event trace</p>
            <p className="mt-1 text-sm text-slate-600">Every dispatch decision should produce a human-readable explanation and machine-readable record.</p>
          </div>
          <div className="max-h-[430px] overflow-auto px-4 py-4 sm:px-6">
            <table className="w-full text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="px-2 py-2 text-left">Timestamp</th>
                  <th className="px-2 py-2 text-left">Site</th>
                  <th className="px-2 py-2 text-left">Event</th>
                  <th className="px-2 py-2 text-left">Result</th>
                  <th className="px-2 py-2 text-left">Reason</th>
                </tr>
              </thead>
              <tbody>
                {auditEvents.map((e) => (
                  <tr key={`${e.ts}-${e.site}-${e.event}`} className="border-t border-slate-100">
                    <td className="px-2 py-2 font-mono text-slate-600">{e.ts}</td>
                    <td className="px-2 py-2 font-semibold text-slate-800">{e.site}</td>
                    <td className="px-2 py-2 text-slate-700">{e.event}</td>
                    <td className="px-2 py-2">
                      <span className={`rounded-full px-2 py-1 font-bold ${e.result === "APPROVED" || e.result === "PASS" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{e.result}</span>
                    </td>
                    <td className="px-2 py-2 text-slate-600">{e.reason}</td>
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

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import datacentres from "../../../data/datacentres.json";
import demandProfiles from "../../../data/demand_profiles.json";
import marketSignals from "../../../data/market_signals.json";
import Logo from "../../components/Logo";

const views = [
  "Grid Connection Tracker",
  "Market Dispatch",
  "Revenue Dashboard",
  "Portfolio Overview",
  "ANM Pathway Status"
] as const;

type ViewName = (typeof views)[number];

export default function DemoModePage() {
  const [activeView, setActiveView] = useState<ViewName>("Grid Connection Tracker");
  const [selectedDispatchHour, setSelectedDispatchHour] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "batteryMw" | "revenue">("revenue");
  const marketRows = marketSignals.hours;

  const dispatchEvents = marketRows
    .filter((row) => row.dynamicContainment > 55)
    .map((row) => ({
      hour: row.hour,
      price: row.dynamicContainment,
      revenue: Math.round(row.dynamicContainment * 2 * 0.85),
      duration: 30
    }));

  const monthlyRevenue = useMemo(() => {
    const avgDc = marketRows.reduce((sum, row) => sum + row.dynamicContainment, 0) / marketRows.length;
    const avgBm = marketRows.reduce((sum, row) => sum + row.balancingMechanism, 0) / marketRows.length;
    return Array.from({ length: 12 }, (_, index) => {
      const seasonality = 0.86 + (index % 6) * 0.06;
      return {
        month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][index],
        dc: Math.round(avgDc * 5 * 24 * 30 * seasonality * 0.65),
        bm: Math.round(avgBm * 5 * 24 * 30 * seasonality * 0.35)
      };
    });
  }, [marketRows]);

  const totalAnnual = monthlyRevenue.reduce((sum, row) => sum + row.dc + row.bm, 0);
  const bestMonth = [...monthlyRevenue].sort((a, b) => b.dc + b.bm - (a.dc + a.bm))[0];

  const portfolioRows = useMemo(() => {
    const demandRegions = demandProfiles.regions as Record<string, number[]>;
    return (datacentres as Array<{ id: string; name: string; region: string; batteryMw: number }>)
      .slice(0, 5)
      .map((site, index) => {
        const regionDemand = demandRegions[site.region] ?? demandProfiles.today;
        const demandFactor = regionDemand.reduce((sum, value) => sum + value, 0) / regionDemand.length;
        const revenue = Math.round(site.batteryMw * 1250 * demandFactor);
        return {
          ...site,
          flexibleMw: Number((site.batteryMw * 0.58).toFixed(1)),
          anmStatus: index < 3 ? "Active" : "Pending",
          monthlyRevenue: revenue
        };
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "batteryMw") return b.flexibleMw - a.flexibleMw;
        return b.monthlyRevenue - a.monthlyRevenue;
      });
  }, [sortBy]);

  const selectedEvent = selectedDispatchHour
    ? dispatchEvents.find((event) => event.hour === selectedDispatchHour) ?? null
    : dispatchEvents[0] ?? null;

  return (
    <div className="min-h-screen bg-[var(--ph-bg)] text-[var(--ph-text)]">
      <header className="border-b border-[var(--ph-divider)] bg-[var(--ph-bg-card)]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/landing" className="focus-ring inline-flex items-center gap-2 text-sm text-[var(--ph-text-soft)]">
            ← Back to site
          </Link>
          <Logo markSize={22} />
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[0.3fr_0.7fr] lg:px-8">
        <aside className="rounded-2xl border border-[var(--ph-divider)] bg-[var(--ph-bg-card)] p-4">
          <p className="ph-eyebrow">Product Areas</p>
          <nav className="mt-4 space-y-2">
            {views.map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`focus-ring w-full border-l-2 px-3 py-3 text-left text-sm ${
                  activeView === view
                    ? "border-[var(--ph-accent)] bg-[var(--ph-surface)] text-white"
                    : "border-transparent text-[var(--ph-text-soft)]"
                }`}
              >
                {view}
              </button>
            ))}
          </nav>
        </aside>

        <section className="rounded-2xl border border-[var(--ph-divider)] bg-[var(--ph-bg-card)] p-5 md:p-6">
          {activeView === "Grid Connection Tracker" ? (
            <div>
              <h1 className="font-display text-3xl font-semibold">Grid Connection Tracker</h1>
              <p className="mt-2 max-w-[65ch] text-sm text-[var(--ph-text-soft)]">Timeline comparison for London Colocation Facility.</p>
              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[var(--ph-text-soft)]">Standard queue</p>
                  <div className="mt-2 h-8 rounded bg-[var(--ph-surface)]">
                    <div className="h-8 w-[92%] rounded bg-[var(--ph-accent-magenta)]/70" />
                  </div>
                  <p className="mt-1 text-xs text-[var(--ph-text-soft)]">2026 → 2031</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[var(--ph-text-soft)]">ANM pathway</p>
                  <div className="mt-2 h-8 rounded bg-[var(--ph-surface)]">
                    <div className="h-8 w-[42%] rounded bg-[var(--ph-accent)]" />
                  </div>
                  <p className="mt-1 text-xs text-[var(--ph-text-soft)]">2026 → Q3 2026</p>
                </div>
              </div>
              <p className="mt-6 font-display text-4xl text-[var(--ph-accent)]">Saving 4.5 years</p>
            </div>
          ) : null}

          {activeView === "Market Dispatch" ? (
            <div>
              <h1 className="font-display text-3xl font-semibold">Market Dispatch</h1>
              <div className="mt-5 h-[330px] rounded-xl border border-[var(--ph-divider)] bg-[var(--ph-surface)] p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={marketRows}>
                    <CartesianGrid stroke="rgba(122,144,170,0.2)" strokeDasharray="3 3" />
                    <XAxis dataKey="hour" stroke="#7A90AA" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#7A90AA" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="dynamicContainment" stroke="#22D3EE" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {dispatchEvents.map((event) => (
                  <button
                    key={event.hour}
                    onClick={() => setSelectedDispatchHour(event.hour)}
                    className={`focus-ring rounded-full border px-3 py-1 text-xs ${
                      selectedEvent?.hour === event.hour
                        ? "border-[var(--ph-accent)] text-[var(--ph-accent)]"
                        : "border-[var(--ph-divider)] text-[var(--ph-text-soft)]"
                    }`}
                  >
                    {event.hour}
                  </button>
                ))}
              </div>

              {selectedEvent ? (
                <div className="mt-4 rounded-xl border border-[var(--ph-divider)] bg-[var(--ph-surface)] p-4 text-sm text-[var(--ph-text-soft)]">
                  <p className="text-white">Dispatch Event {selectedEvent.hour}</p>
                  <p>DC Price £{selectedEvent.price}/MWh</p>
                  <p>Revenue £{selectedEvent.revenue}</p>
                  <p>Duration {selectedEvent.duration} min</p>
                  <p className="text-[var(--ph-accent)]">All constraints passed ✓</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {activeView === "Revenue Dashboard" ? (
            <div>
              <h1 className="font-display text-3xl font-semibold">Revenue Dashboard</h1>
              <div className="mt-5 h-[330px] rounded-xl border border-[var(--ph-divider)] bg-[var(--ph-surface)] p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyRevenue}>
                    <CartesianGrid stroke="rgba(122,144,170,0.2)" strokeDasharray="3 3" />
                    <XAxis dataKey="month" stroke="#7A90AA" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#7A90AA" tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => [`£${value.toLocaleString("en-GB")}`, "Revenue"]} />
                    <Bar dataKey="dc" stackId="a" fill="#22D3EE" />
                    <Bar dataKey="bm" stackId="a" fill="#FF38C7" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-[var(--ph-divider)] bg-[var(--ph-surface)] p-3">
                  <p className="text-xs text-[var(--ph-text-soft)]">Total annual</p>
                  <p className="mt-1 text-xl text-white">£{totalAnnual.toLocaleString("en-GB")}</p>
                </div>
                <div className="rounded-lg border border-[var(--ph-divider)] bg-[var(--ph-surface)] p-3">
                  <p className="text-xs text-[var(--ph-text-soft)]">Monthly average</p>
                  <p className="mt-1 text-xl text-white">£{Math.round(totalAnnual / 12).toLocaleString("en-GB")}</p>
                </div>
                <div className="rounded-lg border border-[var(--ph-divider)] bg-[var(--ph-surface)] p-3">
                  <p className="text-xs text-[var(--ph-text-soft)]">Best month</p>
                  <p className="mt-1 text-xl text-white">{bestMonth.month}</p>
                </div>
              </div>
            </div>
          ) : null}

          {activeView === "Portfolio Overview" ? (
            <div>
              <h1 className="font-display text-3xl font-semibold">Portfolio Overview</h1>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <button onClick={() => setSortBy("name")} className="focus-ring rounded-full border border-[var(--ph-divider)] px-3 py-1 text-[var(--ph-text-soft)]">Sort: Site</button>
                <button onClick={() => setSortBy("batteryMw")} className="focus-ring rounded-full border border-[var(--ph-divider)] px-3 py-1 text-[var(--ph-text-soft)]">Sort: Capacity</button>
                <button onClick={() => setSortBy("revenue")} className="focus-ring rounded-full border border-[var(--ph-divider)] px-3 py-1 text-[var(--ph-text-soft)]">Sort: Revenue</button>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-[var(--ph-text-soft)]">
                    <tr>
                      <th className="px-3 py-2">Site Name</th>
                      <th className="px-3 py-2">Location</th>
                      <th className="px-3 py-2">Flexible MW</th>
                      <th className="px-3 py-2">ANM Status</th>
                      <th className="px-3 py-2">Monthly Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolioRows.map((row) => (
                      <tr key={row.id} className="border-t border-[var(--ph-divider)]">
                        <td className="px-3 py-2 text-white">{row.name}</td>
                        <td className="px-3 py-2 text-[var(--ph-text-soft)]">{row.region}</td>
                        <td className="px-3 py-2 text-[var(--ph-text-soft)]">{row.flexibleMw}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-1 text-xs ${row.anmStatus === "Active" ? "bg-[var(--ph-accent)]/20 text-[var(--ph-accent)]" : "bg-[var(--ph-accent-magenta)]/20 text-[var(--ph-accent-magenta)]"}`}>
                            {row.anmStatus}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[var(--ph-text-soft)]">£{row.monthlyRevenue.toLocaleString("en-GB")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {activeView === "ANM Pathway Status" ? (
            <div>
              <h1 className="font-display text-3xl font-semibold">ANM Pathway Status</h1>
              <ol className="mt-6 space-y-4">
                {[
                  ["Assessment", "complete"],
                  ["Technical Design", "complete"],
                  ["NESO Submission", "progress"],
                  ["Network Review", "pending"],
                  ["Active", "pending"]
                ].map(([label, status]) => (
                  <li key={label} className="flex items-center gap-3 rounded-lg border border-[var(--ph-divider)] bg-[var(--ph-surface)] px-4 py-3">
                    <span
                      className={`inline-flex h-3 w-3 rounded-full ${
                        status === "complete"
                          ? "bg-[var(--ph-accent)]"
                          : status === "progress"
                            ? "badge-pulse bg-[var(--ph-accent-magenta)]"
                            : "bg-slate-500"
                      }`}
                    />
                    <span className="text-[var(--ph-text)]">{label}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-5 text-sm text-[var(--ph-text-soft)]">Estimated completion: Q3 2026. Standard queue comparison: 2031.</p>
            </div>
          ) : null}
        </section>
      </div>

      <div className="sticky bottom-0 border-t border-[var(--ph-divider)] bg-[rgb(6_13_27_/_0.96)] px-4 py-3">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3 text-sm">
          <p className="text-[var(--ph-text-soft)]">Ready to assess your site?</p>
          <Link href="/landing#contact" className="focus-ring rounded-full bg-[var(--ph-accent)] px-4 py-2 font-semibold text-[var(--ph-bg)]">Request Early Access</Link>
          <button type="button" className="focus-ring rounded-full border border-[var(--ph-accent-magenta)] px-4 py-2 font-semibold text-[var(--ph-accent-magenta)]">Download Technical Brief</button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import datacentres from "../../data/datacentres.json";
import marketSignals from "../../data/market_signals.json";

type MarketRow = {
  hour: string;
  dynamicContainment: number;
  balancingMechanism: number;
};

type ServiceBar = {
  label: string;
  value: number;
};

export default function LandingProductUI() {
  const marketRows = marketSignals.hours as MarketRow[];
  const latest = marketRows[marketRows.length - 1];
  const maxPrice = Math.max(...marketRows.map((r) => Math.max(r.dynamicContainment, r.balancingMechanism)));

  const bars = useMemo<ServiceBar[]>(
    () => [
      { label: "Dynamic Containment", value: latest.dynamicContainment },
      { label: "Balancing Mechanism", value: latest.balancingMechanism },
      { label: "Firm Frequency Response", value: Math.max(30, Math.round((latest.dynamicContainment + latest.balancingMechanism) / 2.2)) }
    ],
    [latest.balancingMechanism, latest.dynamicContainment]
  );

  const [barsVisible, setBarsVisible] = useState(false);
  const [revenueValue, setRevenueValue] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setBarsVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.35 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!barsVisible) return;
    const target = 4280;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / 900, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setRevenueValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [barsVisible]);

  return (
    <div
      ref={rootRef}
      className="overflow-hidden rounded-2xl border border-[var(--ph-divider)] bg-[var(--ph-bg-card)]"
      style={{ boxShadow: "0 0 0 1px var(--ph-divider), 0 0 40px var(--ph-accent-glow)" }}
    >
      <div className="flex items-center justify-between border-b border-[var(--ph-divider)] bg-[var(--ph-surface)] px-4 py-3 text-xs">
        <p className="font-semibold uppercase tracking-[0.14em] text-[var(--ph-text)]">VoltPilot</p>
        <div className="flex gap-2 text-[11px] text-[var(--ph-text-soft)]">
          <span className="rounded-full border border-[var(--ph-divider)] px-2 py-0.5">Live</span>
          <span className="rounded-full border border-[var(--ph-divider)] px-2 py-0.5">Shadow</span>
          <span className="rounded-full border border-[var(--ph-divider)] px-2 py-0.5">Report</span>
        </div>
      </div>

      <div className="grid md:grid-cols-[0.36fr_0.64fr]">
        <aside className="border-b border-r border-[var(--ph-divider)] bg-[var(--ph-surface)] p-4 md:border-b-0">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--ph-text-soft)]">ANM Pathways</p>
          <ul className="mt-4 space-y-2 text-sm text-[var(--ph-text)]">
            {(datacentres as Array<{ id: string; name: string }>).slice(0, 4).map((site) => (
              <li key={site.id} className="flex items-center gap-2 rounded-lg border border-[var(--ph-divider)] px-3 py-2">
                <span className="badge-pulse inline-flex h-2.5 w-2.5 rounded-full bg-[var(--ph-accent)]" />
                {site.name}
              </li>
            ))}
          </ul>
        </aside>

        <div className="p-4 md:p-5">
          <div className="space-y-3">
            {bars.map((bar) => (
              <div key={bar.label}>
                <div className="mb-1 flex items-center justify-between text-xs text-[var(--ph-text-soft)]">
                  <span>{bar.label}</span>
                  <span>{bar.value}</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--ph-divider)]">
                  <div
                    className="h-2 rounded-full bg-[var(--ph-accent)] transition-all duration-700"
                    style={{ width: barsVisible ? `${Math.min(100, (bar.value / maxPrice) * 100)}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 h-[160px] rounded-xl border border-[var(--ph-divider)] bg-[var(--ph-surface)] p-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={marketRows}>
                <defs>
                  <linearGradient id="product-ui-dc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  cursor={{ stroke: "rgba(122, 144, 170, 0.35)", strokeDasharray: "4 4" }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload[0]) return null;
                    const point = payload[0].payload as MarketRow;
                    return (
                      <div className="rounded-md border border-[var(--ph-divider)] bg-[var(--ph-bg-card)] px-2 py-1 text-xs text-[var(--ph-text)]">
                        {`${point.hour} — £${point.dynamicContainment}/MWh`}
                      </div>
                    );
                  }}
                />
                <Area type="monotone" dataKey="dynamicContainment" stroke="#0EA5E9" strokeWidth={2} fill="url(#product-ui-dc)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-lg border border-[var(--ph-divider)] bg-[var(--ph-surface)] px-3 py-2 text-[var(--ph-text-soft)]">
              Revenue today: <span className="font-semibold text-[var(--ph-accent)]">£{revenueValue.toLocaleString("en-GB")}</span>
              <span className="ml-2 text-[var(--ph-accent)]">↑ 12%</span>
            </div>
            <div className="rounded-lg border border-[var(--ph-divider)] bg-[var(--ph-surface)] px-3 py-2 text-[var(--ph-text-soft)]">
              Connection: <span className="font-semibold text-white">ANM pathway active ✓</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import marketSignals from "../../data/market_signals.json";
import AnimatedCounter from "./AnimatedCounter";

type SignalPoint = {
  hour: string;
  dynamicContainment: number;
  balancingMechanism: number;
  curtailmentMwh: number;
  windIndex: number;
};

function money(value: number) {
  return `£${Math.round(value).toLocaleString("en-GB")}`;
}

export default function HeroMarketPanel() {
  const data = useMemo(() => (marketSignals.hours as SignalPoint[]).slice(-8), []);
  const [hovered, setHovered] = useState<number | null>(null);
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const activeIndex = hovered ?? data.length - 1;
  const activePoint = data[activeIndex];
  const peak = Math.max(...data.map((d) => d.dynamicContainment));
  const averageDc = data.reduce((sum, row) => sum + row.dynamicContainment, 0) / data.length;
  const annualBase = averageDc * 8760 * 2 * 0.85;
  const annualAtPoint = activePoint.dynamicContainment * 8760 * 2 * 0.85;

  return (
    <aside className="rounded-2xl border border-[var(--ph-divider)] bg-[var(--ph-bg-card)] p-6 shadow-[0_0_0_1px_var(--ph-divider),0_0_32px_var(--ph-accent-glow)]">
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ph-text)]">
          <span className="badge-pulse inline-flex h-2.5 w-2.5 rounded-full bg-[var(--ph-accent)]" />
          NESO Market — Live
        </p>
        <p className="text-xs text-[var(--ph-text-soft)]">
          {clock.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      <div className="mt-4">
        <p className="ph-eyebrow">Dynamic Containment — £/MWh</p>
        <div className="mt-2 h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 12, right: 4, left: 4, bottom: 0 }}
              onMouseMove={(state) => setHovered(typeof state.activeTooltipIndex === "number" ? state.activeTooltipIndex : null)}
              onMouseLeave={() => setHovered(null)}
            >
              <defs>
                <linearGradient id="hero-dc-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#02C39A" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#02C39A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                cursor={{ stroke: "rgba(122, 144, 170, 0.3)", strokeDasharray: "4 4" }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload[0]) return null;
                  const point = payload[0].payload as SignalPoint;
                  return (
                    <div className="rounded-md border border-[var(--ph-divider)] bg-[var(--ph-surface)] px-3 py-2 text-xs text-[var(--ph-text)] shadow-lg">
                      <p>{`Hour: ${point.hour}`}</p>
                      <p>{`DC Price: £${point.dynamicContainment}/MWh`}</p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="dynamicContainment"
                stroke="#02C39A"
                strokeWidth={2}
                fill="url(#hero-dc-gradient)"
                isAnimationActive
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-[var(--ph-text-soft)]">Current: {money(activePoint.dynamicContainment)} /MWh</p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-[var(--ph-divider)] bg-[var(--ph-surface)] p-3">
          <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--ph-text-soft)]">Current DC Price</p>
          <p className="mt-1 font-display text-xl text-white">
            £<AnimatedCounter value={activePoint.dynamicContainment} />/MWh
          </p>
        </article>
        <article className="rounded-xl border border-[var(--ph-divider)] bg-[var(--ph-surface)] p-3">
          <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--ph-text-soft)]">Today&apos;s Peak</p>
          <p className="mt-1 font-display text-xl text-white">
            £<AnimatedCounter value={Math.max(...data.slice(0, activeIndex + 1).map((d) => d.dynamicContainment)) || peak} />/MWh
          </p>
        </article>
        <article className="rounded-xl border border-[var(--ph-divider)] bg-[var(--ph-surface)] p-3">
          <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--ph-text-soft)]">Est. Annual Revenue*</p>
          <p className="mt-1 font-display text-xl text-white">
            {`${money(annualAtPoint * 0.8)}–${money(annualAtPoint * 1.2)}`}
          </p>
        </article>
      </div>
      <p className="mt-2 text-[11px] text-[var(--ph-text-muted)]">*based on 2MW flexible headroom, actual results vary</p>
      <p className="mt-1 text-[11px] text-[var(--ph-text-muted)]">24h indicative range baseline: {`${money(annualBase * 0.8)}–${money(annualBase * 1.2)}`}</p>
    </aside>
  );
}

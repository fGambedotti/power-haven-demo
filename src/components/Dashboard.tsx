"use client";

import { useMemo, useState } from "react";
import MapView from "./MapView";
import regions from "../../data/uk_regions.json";
import corridors from "../../data/transmission_lines.json";
import generationSites from "../../data/generation_sites.json";
import datacentres from "../../data/datacentres.json";
import demandProfiles from "../../data/demand_profiles.json";
import { useSimulation } from "../lib/useSimulation";
import clsx from "clsx";

const tabs = ["Datacentre", "Dispatch", "Settings"] as const;
type GenerationSiteRecord = {
  id: string;
  name: string;
  type: "renewable" | "non-renewable";
  capacityMw: number;
  lat: number;
  lon: number;
};

export default function Dashboard() {
  const {
    state,
    eventLog,
    dispatchPulse,
    flex,
    selectedId,
    setSelectedId,
    triggerDispatch,
    updateSetting
  } = useSimulation(datacentres);

  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Datacentre");

  const selectedDc = datacentres.find((dc) => dc.id === selectedId);

  const dispatchLine = useMemo(() => {
    if (!selectedDc || (!dispatchPulse && !state.activeDispatch)) return null;
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [-1.7, 52.7],
              [selectedDc.lon, selectedDc.lat]
            ]
          }
        }
      ]
    } as GeoJSON.FeatureCollection;
  }, [selectedDc, dispatchPulse, state.activeDispatch]);

  const highlightedCorridors = useMemo(() => {
    if (!selectedDc || (!dispatchPulse && !state.activeDispatch)) return [] as string[];
    return (corridors as GeoJSON.FeatureCollection).features
      .filter((feature) => feature.properties?.near === selectedDc.region)
      .map((feature) => String(feature.properties?.id ?? ""));
  }, [selectedDc, dispatchPulse, state.activeDispatch]);

  const backupAtRisk = state.powerMw > 0 && state.socPct <= state.reservePct + 1;

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[1.4fr_0.9fr]">
      <section className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="SoC" value={`${state.socPct.toFixed(1)}%`} sub={`Reserve ${state.reservePct}%`} />
          <KpiCard title="Power" value={`${state.powerMw.toFixed(1)} MW`} sub="Dispatch output" />
          <KpiCard title="Reserved backup" value={`${flex.reservedBackupPct.toFixed(0)}%`} sub="Protected energy" />
          <KpiCard title="Available flexibility" value={`${flex.availableFlexMw.toFixed(0)} MW`} sub="Headroom now" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <KpiCard title="Today’s revenue" value={`£${state.todayRevenue.toFixed(0)}`} sub="Simulated" highlight />
          <KpiCard title="Active service" value={state.activeService ?? "Standby"} sub="NESO instruction" />
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate/10 bg-white px-6 py-4 shadow-card">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate/60">Backup Status</p>
            <p className="font-display text-2xl text-ink">Reserve protection is enforced</p>
          </div>
          <span
            className={clsx(
              "rounded-full px-4 py-2 text-sm font-semibold",
              backupAtRisk ? "bg-coral/20 text-coral" : "bg-emerald/15 text-emerald",
              !backupAtRisk && "badge-pulse"
            )}
          >
            {backupAtRisk ? "BACKUP: AT RISK" : "BACKUP: PROTECTED"}
          </span>
        </div>

        <MapView
          regions={regions as GeoJSON.FeatureCollection}
          corridors={corridors as GeoJSON.FeatureCollection}
          datacentres={datacentres}
          generationSites={generationSites as GenerationSiteRecord[]}
          selectedDatacentreId={selectedId}
          highlightedCorridors={highlightedCorridors}
          dispatchLine={dispatchLine}
          onSelectDatacentre={setSelectedId}
        />

        <div className="rounded-xl border border-slate/10 bg-white px-4 py-2 text-xs text-slate/70">
          Illustrative simulation for demonstration — not an operational control system.
        </div>
      </section>

      <aside className="flex flex-col gap-4">
        <div className="rounded-3xl border border-slate/10 bg-white p-5 shadow-card">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={clsx(
                  "rounded-full px-4 py-2 text-sm font-semibold",
                  tab === activeTab ? "bg-ink text-white" : "bg-mist text-slate"
                )}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "Datacentre" && (
            <div className="mt-5 space-y-4">
              <label className="text-xs uppercase tracking-[0.3em] text-slate/60">Selected site</label>
              <select
                className="w-full rounded-xl border border-slate/20 px-4 py-2 text-sm"
                value={selectedId ?? ""}
                onChange={(event) => setSelectedId(event.target.value)}
              >
                {datacentres.map((dc) => (
                  <option key={dc.id} value={dc.id}>
                    {dc.name}
                  </option>
                ))}
              </select>

              {selectedDc && (
                <div className="rounded-2xl bg-mist px-4 py-4">
                  <p className="text-sm font-semibold text-ink">{selectedDc.name}</p>
                  <p className="text-xs text-slate/70">{selectedDc.region}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em]">Battery</p>
                      <p>{selectedDc.batteryMw} MW / {selectedDc.batteryMwh} MWh</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em]">Baseline</p>
                      <p>{selectedDc.baselineLoadMw} MW load</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em]">Demand now</p>
                      <p>{(demandProfiles.today[Math.floor(state.timeSeconds / 3600) % 24] * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em]">Grid status</p>
                      <p>{state.gridStatus === "OK" ? "Normal" : "Failed"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "Dispatch" && (
            <div className="mt-5 space-y-4">
              <button
                className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow"
                onClick={triggerDispatch}
              >
                Trigger NESO Dispatch
              </button>
              <div className="text-xs text-slate/70">
                Command flow, corridor highlight, and battery response will animate on the map.
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate/60">Event log</p>
                <div className="mt-2 max-h-72 overflow-auto rounded-xl border border-slate/10">
                  <table className="w-full text-xs">
                    <thead className="bg-mist text-slate">
                      <tr>
                        <th className="px-3 py-2 text-left">ID</th>
                        <th className="px-3 py-2 text-left">Service</th>
                        <th className="px-3 py-2 text-left">Dir</th>
                        <th className="px-3 py-2 text-left">MW</th>
                        <th className="px-3 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventLog.length === 0 && (
                        <tr>
                          <td className="px-3 py-3 text-slate/60" colSpan={5}>
                            No dispatches yet.
                          </td>
                        </tr>
                      )}
                      {eventLog.map((event) => (
                        <tr key={event.id} className="border-t border-slate/10">
                          <td className="px-3 py-2">{event.id}</td>
                          <td className="px-3 py-2">{event.service}</td>
                          <td className="px-3 py-2">{event.direction === "DISCHARGE" ? "Flex up" : "Flex down"}</td>
                          <td className="px-3 py-2">{event.targetMw}</td>
                          <td className="px-3 py-2">
                            <span className={clsx("rounded-full px-2 py-1 text-[10px] font-semibold",
                              event.status === "EXECUTED" && "bg-emerald/15 text-emerald",
                              event.status === "REJECTED" && "bg-coral/20 text-coral",
                              event.status === "CURTAILED" && "bg-amber-100 text-amber-700",
                              event.status === "ABORTED" && "bg-slate/10 text-slate"
                            )}>
                              {event.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Settings" && (
            <div className="mt-5 space-y-4">
              <SliderRow
                label="Reserve SoC"
                value={state.reservePct}
                min={10}
                max={60}
                onChange={(value) => updateSetting("reservePct", value)}
                suffix="%"
              />
              <SliderRow
                label="Load spike threshold"
                value={state.loadSpikeThresholdMw}
                min={selectedDc?.baselineLoadMw ?? 20}
                max={(selectedDc?.baselineLoadMw ?? 20) * 2}
                onChange={(value) => updateSetting("loadSpikeThresholdMw", value)}
                suffix="MW"
              />

              <ToggleRow
                label="Auto dispatch"
                value={state.autoDispatch}
                onToggle={(value) => updateSetting("autoDispatch", value)}
              />
              <ToggleRow
                label="Grid status FAILED"
                value={state.gridStatus === "FAILED"}
                onToggle={(value) => updateSetting("gridStatus", value ? "FAILED" : "OK")}
              />
              <ToggleRow
                label="Control link lost"
                value={!state.controlLinkOk}
                onToggle={(value) => updateSetting("controlLinkOk", !value)}
              />
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate/10 bg-white p-5 shadow-card">
          <p className="text-xs uppercase tracking-[0.3em] text-slate/60">Fail-safe status</p>
          <p className="mt-2 text-sm text-ink">
            {state.failSafeMode
              ? "Fail-safe engaged. Dispatch is blocked and reserve locked for backup."
              : "Control link healthy. Dispatch is permitted within reserve constraints."}
          </p>
        </div>
      </aside>
    </main>
  );
}

function KpiCard({ title, value, sub, highlight }: { title: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <div className={clsx("rounded-2xl border border-slate/10 bg-white p-4 shadow-card", highlight && "bg-ink text-white")}> 
      <p className={clsx("text-xs uppercase tracking-[0.3em]", highlight ? "text-white/60" : "text-slate/60")}>{title}</p>
      <p className={clsx("mt-2 text-2xl font-semibold", highlight ? "text-white" : "text-ink")}>{value}</p>
      <p className={clsx("text-xs", highlight ? "text-white/70" : "text-slate/70")}>{sub}</p>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  onChange,
  suffix
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  suffix: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate">{label}</span>
        <span className="font-semibold text-ink">{value.toFixed(0)} {suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full"
      />
    </div>
  );
}

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate">{label}</span>
      <button
        className={clsx(
          "h-7 w-14 rounded-full p-1 transition",
          value ? "bg-emerald" : "bg-slate/20"
        )}
        onClick={() => onToggle(!value)}
      >
        <span
          className={clsx(
            "block h-5 w-5 rounded-full bg-white shadow",
            value ? "translate-x-7" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

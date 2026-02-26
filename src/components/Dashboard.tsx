"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useSearchParams } from "next/navigation";
import MapView from "./MapView";
import regions from "../../data/uk_regions.json";
import corridors from "../../data/transmission_lines.json";
import generationSites from "../../data/generation_sites.json";
import datacentres from "../../data/datacentres.json";
import demandProfiles from "../../data/demand_profiles.json";
import { useSimulation } from "../lib/useSimulation";
import DecisionRationale from "./DecisionRationale";
import RoleLens from "./RoleLens";
import { applyDashboardBootstrapSettings, getDashboardSceneBootstrap } from "../lib/demoBootstrap";

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
    decisionTraces,
    stepSnapshots,
    dispatchPulse,
    flex,
    selectedId,
    setSelectedId,
    triggerDispatch,
    updateSetting
  } = useSimulation(datacentres);
  const searchParams = useSearchParams();
  const appliedDemoSceneRef = useRef<string | null>(null);

  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Datacentre");
  const [mapLayers, setMapLayers] = useState({
    regions: true,
    corridors: true,
    generation: true,
    labels: false
  });
  const [replayCursor, setReplayCursor] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);

  const selectedDc = datacentres.find((dc) => dc.id === selectedId);
  const activeDemoScene = searchParams.get("demoScene");
  const backupAtRisk = state.powerMw > 0 && state.socPct <= state.reservePct + 1;
  const nowHour = Math.floor(state.timeSeconds / 3600) % 24;
  const currentDemand = demandProfiles.today[nowHour] ?? 0;
  const dispatchOrchestrationActive = Boolean(dispatchPulse || state.activeDispatch);

  const portfolioAllocation = useMemo(() => {
    const demandFactor = demandProfiles.today[nowHour] ?? 0.7;
    return datacentres
      .map((dc, idx) => {
        const reservePenalty = dc.batteryMw * (state.reservePct / 100) * 0.25;
        const regionalDemandPenalty = dc.region === selectedDc?.region ? 0 : demandFactor * 4;
        const healthBias = (idx % 5) * 1.2;
        const availableMw = Math.max(0, dc.batteryMw - reservePenalty - regionalDemandPenalty - healthBias);
        const confidence = Math.max(72, Math.min(98, 90 - (idx % 6) * 3 + (dc.region === selectedDc?.region ? 4 : 0)));
        const score = Math.round(availableMw * 0.75 + confidence * 0.35);
        return { ...dc, availableMw: Math.round(availableMw * 10) / 10, confidence, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [nowHour, selectedDc?.region, state.reservePct]);

  const dispatchLine = useMemo(() => {
    if (!selectedDc || !dispatchOrchestrationActive) return null;
    return {
      type: "FeatureCollection",
      features: portfolioAllocation.map((candidate, index) => ({
        type: "Feature",
        properties: {
          tier: candidate.id === selectedDc.id ? "primary" : index < 3 ? "secondary" : "candidate",
          siteId: candidate.id
        },
        geometry: {
          type: "LineString",
          coordinates: [[-1.7, 52.7], [candidate.lon, candidate.lat]]
        }
      }))
    } as GeoJSON.FeatureCollection;
  }, [selectedDc, dispatchOrchestrationActive, portfolioAllocation]);

  const highlightedCorridors = useMemo(() => {
    if (!selectedDc || !dispatchOrchestrationActive) return [] as string[];
    const activeRegions = new Set(portfolioAllocation.slice(0, 3).map((c) => c.region));
    return (corridors as GeoJSON.FeatureCollection).features
      .filter((feature) => activeRegions.has(String(feature.properties?.near ?? "")))
      .map((feature) => String(feature.properties?.id ?? ""));
  }, [selectedDc, dispatchOrchestrationActive, portfolioAllocation]);

  const allocationRows = useMemo(() => {
    if (!dispatchOrchestrationActive) return [] as Array<{ id: string; name: string; role: "Primary" | "Secondary"; mw: number; confidence: number }>;
    const targetMw = state.activeDispatch?.targetMw ?? Math.max(10, Math.round(state.batteryMw * 0.65));
    const weights = [0.5, 0.3, 0.2, 0];
    return portfolioAllocation.slice(0, 3).map((dc, idx) => ({
      id: dc.id,
      name: dc.name,
      role: idx === 0 ? "Primary" : "Secondary",
      mw: Math.round(Math.min(dc.availableMw, targetMw * weights[idx]) * 10) / 10,
      confidence: dc.confidence
    }));
  }, [dispatchOrchestrationActive, portfolioAllocation, state.activeDispatch, state.batteryMw]);
  const latestDecisionTrace = decisionTraces[0];
  const recentSnapshots = stepSnapshots.slice(0, 6);
  const replayFrames = useMemo(() => [...stepSnapshots].slice(0, 20).reverse(), [stepSnapshots]);
  const selectedReplayFrame = replayFrames[Math.min(replayCursor, Math.max(replayFrames.length - 1, 0))] ?? null;

  useEffect(() => {
    if (!replayFrames.length) {
      setReplayCursor(0);
      setReplayPlaying(false);
      return;
    }
    setReplayCursor((prev) => Math.min(prev, replayFrames.length - 1));
  }, [replayFrames.length]);

  useEffect(() => {
    if (!replayPlaying || replayFrames.length < 2) return;
    const interval = setInterval(() => {
      setReplayCursor((prev) => {
        if (prev >= replayFrames.length - 1) {
          setReplayPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 650);
    return () => clearInterval(interval);
  }, [replayPlaying, replayFrames.length]);

  useEffect(() => {
    const scene = searchParams.get("demoScene");
    if (!scene || appliedDemoSceneRef.current === scene) return;
    appliedDemoSceneRef.current = scene;
    const bootstrap = getDashboardSceneBootstrap(scene);
    if (!bootstrap) return;
    setSelectedId(bootstrap.selectedDatacentreId);
    setActiveTab(bootstrap.activeTab);
    applyDashboardBootstrapSettings(updateSetting, bootstrap.settings);
    if (bootstrap.autoTriggerDispatch) {
      const timer = setTimeout(() => triggerDispatch(), 450);
      return () => clearTimeout(timer);
    }
  }, [searchParams, setSelectedId, triggerDispatch, updateSetting]);

  return (
    <main className="mx-auto grid w-full max-w-[1440px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.5fr_0.9fr] lg:px-8">
      <section className="space-y-6">
        <div className="panel p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Live Demonstration</p>
              <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                NESO dispatch to datacentre battery flexibility
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Simulation shows dispatch routing, corridor impact, reserve enforcement, and fail-safe behavior for
                backup protection.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-right">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Sim Time</p>
              <p className="font-display text-lg font-semibold text-slate-900">T+{state.timeSeconds}s</p>
            </div>
          </div>
        </div>

        {activeDemoScene && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-medium text-blue-800">
            Demo preset active: <span className="font-bold">{activeDemoScene}</span>. Use `/demo-mode` scene links for presenter-guided states.
          </div>
        )}

        <RoleLens context="dispatch" />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard title="State of Charge" value={`${state.socPct.toFixed(1)}%`} note={`Reserve floor ${state.reservePct}%`} />
          <MetricCard title="Battery Power" value={`${state.powerMw.toFixed(1)} MW`} note="Positive = discharge" />
          <MetricCard title="Available Flex" value={`${flex.availableFlexMw.toFixed(1)} MW`} note="Constraint-adjusted" />
          <MetricCard title="Backup Reserved" value={`${flex.reservedBackupPct.toFixed(0)}%`} note="Auto-lock in fail-safe" />
          <MetricCard title="Active Service" value={state.activeService ?? "Standby"} note="NESO service route" />
          <MetricCard title="Today Revenue" value={formatCurrency(state.todayRevenue)} note="Simulated settlement" tone="accent" />
        </div>

        <div className="panel p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">System Safety</p>
              <p className="font-display text-xl font-semibold text-slate-900">Backup integrity state</p>
            </div>
            <span
              className={clsx(
                "rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.14em]",
                backupAtRisk ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700 badge-pulse"
              )}
            >
              {backupAtRisk ? "Backup At Risk" : "Backup Protected"}
            </span>
          </div>
          <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
            <StatusPill label="Grid" value={state.gridStatus === "OK" ? "Normal" : "Failed"} ok={state.gridStatus === "OK"} />
            <StatusPill label="Control Link" value={state.controlLinkOk ? "Connected" : "Lost"} ok={state.controlLinkOk} />
            <StatusPill label="Load Spike" value={`${state.loadSpikeMw.toFixed(1)} MW`} ok={state.loadSpikeMw <= state.loadSpikeThresholdMw} />
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Network View</p>
              <p className="font-display text-lg font-semibold text-slate-900">UK demand, corridors, and assets</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <LegendDot color="bg-blue-500" label="Demand intensity" />
              <LegendDot color="bg-cyan-500" label="Active corridor" />
              <LegendDot color="bg-emerald-500" label="Renewable" />
              <LegendDot color="bg-orange-500" label="Non-renewable" />
              <LegendDot color="bg-slate-900" label="Datacentre" />
            </div>
          </div>
          <div className="p-4 sm:p-6">
            <MapView
              regions={regions as GeoJSON.FeatureCollection}
              corridors={corridors as GeoJSON.FeatureCollection}
              datacentres={datacentres}
              generationSites={generationSites as GenerationSiteRecord[]}
              selectedDatacentreId={selectedId}
              highlightedCorridors={highlightedCorridors}
              dispatchLine={dispatchLine}
              showRegions={mapLayers.regions}
              showCorridors={mapLayers.corridors}
              showGeneration={mapLayers.generation}
              showDatacentreLabels={mapLayers.labels}
              onSelectDatacentre={setSelectedId}
            />
            <div className="mt-4 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Aggregator allocation preview</p>
                <p className="mt-1 text-sm text-slate-700">
                  {dispatchOrchestrationActive
                    ? "Primary and secondary routing candidates are visualized to show portfolio-level dispatch orchestration."
                    : "Trigger a dispatch to preview multi-site route allocation and corridor impact."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <MiniToggle label="Regions" enabled={mapLayers.regions} onToggle={() => setMapLayers((prev) => ({ ...prev, regions: !prev.regions }))} />
                  <MiniToggle label="Corridors" enabled={mapLayers.corridors} onToggle={() => setMapLayers((prev) => ({ ...prev, corridors: !prev.corridors }))} />
                  <MiniToggle label="Generation" enabled={mapLayers.generation} onToggle={() => setMapLayers((prev) => ({ ...prev, generation: !prev.generation }))} />
                  <MiniToggle label="DC labels" enabled={mapLayers.labels} onToggle={() => setMapLayers((prev) => ({ ...prev, labels: !prev.labels }))} />
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="px-2 py-2 text-left">Site</th>
                      <th className="px-2 py-2 text-left">Role</th>
                      <th className="px-2 py-2 text-right">MW</th>
                      <th className="px-2 py-2 text-right">Conf.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocationRows.length === 0 ? (
                      <tr>
                        <td className="px-2 py-3 text-slate-500" colSpan={4}>No active dispatch allocation.</td>
                      </tr>
                    ) : (
                      allocationRows.map((row) => (
                        <tr key={row.id} className="border-t border-slate-100">
                          <td className="px-2 py-2 font-semibold text-slate-700">{row.name}</td>
                          <td className="px-2 py-2">
                            <span className={clsx(
                              "rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]",
                              row.role === "Primary" ? "bg-amber-100 text-amber-700" : "bg-cyan-100 text-cyan-700"
                            )}>
                              {row.role}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-right text-slate-700">{row.mw}</td>
                          <td className="px-2 py-2 text-right text-slate-700">{row.confidence}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
          Illustrative simulation for demonstration only. Not an operational control system.
        </div>

        <DecisionRationale
          title="Dispatch eligibility for selected site"
          subtitle="Rules are evaluated before any dispatch power is applied."
          outcome={state.failSafeMode ? "Dispatch Blocked" : "Dispatch Permitted"}
          rules={[
            {
              label: "Reserve protection",
              value: `${state.socPct.toFixed(1)}% SoC vs ${state.reservePct}% floor`,
              status: state.socPct > state.reservePct + 1 ? "pass" : "warn",
              reason: "Minimum backup reserve must remain available."
            },
            {
              label: "Grid status",
              value: state.gridStatus,
              status: state.gridStatus === "OK" ? "pass" : "block",
              reason: "Grid failure forces backup-only behavior."
            },
            {
              label: "Control link",
              value: state.controlLinkOk ? "Connected" : "Lost",
              status: state.controlLinkOk ? "pass" : "block",
              reason: "Link loss triggers fail-safe and blocks dispatch."
            },
            {
              label: "Load threshold",
              value: `${state.loadSpikeMw.toFixed(1)} / ${state.loadSpikeThresholdMw.toFixed(1)} MW`,
              status: state.loadSpikeMw <= state.loadSpikeThresholdMw ? "pass" : "block",
              reason: "Unexpected load spikes preserve capacity for backup resilience."
            }
          ]}
        />

        {latestDecisionTrace && (
          <div className="panel p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Dispatch Decision Trace</p>
                <p className="font-display text-lg font-semibold text-slate-900">
                  {latestDecisionTrace.eventId} · {latestDecisionTrace.resolvedStatus}
                </p>
              </div>
              <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white">
                {latestDecisionTrace.proposed.service}
              </span>
            </div>
            <div className="mt-3 grid gap-2">
              {latestDecisionTrace.checks.map((check) => (
                <div key={check.rule} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                  <div>
                    <p className="font-semibold text-slate-800">{check.rule}</p>
                    <p className="text-slate-500">{check.detail}</p>
                  </div>
                  <span className={clsx(
                    "rounded-full px-2 py-1 font-bold uppercase tracking-[0.08em]",
                    check.passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                  )}>
                    {check.passed ? "Pass" : "Fail"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentSnapshots.length > 0 && (
          <div className="panel p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Replay Buffer</p>
                <p className="font-display text-lg font-semibold text-slate-900">Latest Simulation Steps</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-700">
                {stepSnapshots.length} captured
              </span>
            </div>

            {selectedReplayFrame && replayFrames.length > 1 && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Replay Scrubber</p>
                    <p className="text-sm font-semibold text-slate-900">
                      Frame {replayCursor + 1} / {replayFrames.length} · t={selectedReplayFrame.t}s
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      onClick={() => {
                        setReplayPlaying(false);
                        setReplayCursor(0);
                      }}
                    >
                      Reset
                    </button>
                    <button
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                      onClick={() => setReplayPlaying((v) => !v)}
                    >
                      {replayPlaying ? "Pause" : "Play"}
                    </button>
                  </div>
                </div>

                <input
                  className="mt-3 w-full accent-slate-900"
                  type="range"
                  min={0}
                  max={Math.max(replayFrames.length - 1, 0)}
                  step={1}
                  value={replayCursor}
                  onChange={(event) => {
                    setReplayPlaying(false);
                    setReplayCursor(Number(event.target.value));
                  }}
                />

                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <ReplayMetric label="SoC" value={`${selectedReplayFrame.socPct.toFixed(1)}%`} ratio={selectedReplayFrame.socPct / 100} tone="emerald" />
                  <ReplayMetric label="Power" value={`${selectedReplayFrame.powerMw.toFixed(1)} MW`} ratio={Math.min(Math.abs(selectedReplayFrame.powerMw) / Math.max(state.batteryMw || 1, 1), 1)} tone="blue" />
                  <ReplayMetric label="Load" value={`${selectedReplayFrame.loadMw.toFixed(1)} MW`} ratio={Math.min(selectedReplayFrame.loadMw / Math.max(state.loadSpikeThresholdMw || 1, 1), 1)} tone={selectedReplayFrame.failSafeMode ? "rose" : "amber"} />
                  <ReplayMetric label="Revenue" value={`£${selectedReplayFrame.revenue.toLocaleString()}`} ratio={Math.min(selectedReplayFrame.revenue / Math.max(state.todayRevenue || 1, 1), 1)} tone="slate" />
                </div>

                <p className="mt-3 text-xs text-slate-600">
                  {selectedReplayFrame.failSafeMode
                    ? "Fail-safe active: dispatch is suppressed and backup reserve is prioritized."
                    : selectedReplayFrame.activeDispatchEventId
                      ? `Dispatch ${selectedReplayFrame.activeDispatchEventId} active.`
                      : "No active dispatch in this frame."}
                </p>
              </div>
            )}
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="pb-2 pr-3 font-semibold">t(s)</th>
                    <th className="pb-2 pr-3 font-semibold">Dispatch</th>
                    <th className="pb-2 pr-3 font-semibold">SoC</th>
                    <th className="pb-2 pr-3 font-semibold">Power</th>
                    <th className="pb-2 pr-3 font-semibold">Load</th>
                    <th className="pb-2 pr-3 font-semibold">Mode</th>
                    <th className="pb-2 font-semibold">Rev</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSnapshots.map((snap) => (
                    <tr key={`${snap.t}-${snap.activeDispatchEventId ?? "idle"}`} className="border-t border-slate-100 text-slate-700">
                      <td className="py-2 pr-3">{snap.t}</td>
                      <td className="py-2 pr-3">{snap.activeDispatchEventId ?? "—"}</td>
                      <td className="py-2 pr-3">{snap.socPct.toFixed(1)}%</td>
                      <td className="py-2 pr-3">{snap.powerMw.toFixed(1)} MW</td>
                      <td className="py-2 pr-3">{snap.loadMw.toFixed(1)} MW</td>
                      <td className="py-2 pr-3">{snap.failSafeMode ? "Fail-safe" : "Normal"}</td>
                      <td className="py-2">£{snap.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <aside className="space-y-6">
        <div className="panel p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={clsx(
                  "rounded-lg px-4 py-2 text-sm font-semibold transition",
                  tab === activeTab
                    ? "bg-slate-900 text-white shadow-md"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "Datacentre" && (
            <div className="space-y-4">
              <FieldLabel text="Selected Datacentre" />
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-400"
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
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-display text-lg font-semibold text-slate-900">{selectedDc.name}</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{selectedDc.region}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <DataChip label="Battery" value={`${selectedDc.batteryMw} MW`} />
                    <DataChip label="Storage" value={`${selectedDc.batteryMwh} MWh`} />
                    <DataChip label="Baseline" value={`${selectedDc.baselineLoadMw} MW`} />
                    <DataChip label="Demand" value={`${(currentDemand * 100).toFixed(0)}%`} />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "Dispatch" && (
            <div className="space-y-4">
              <button
                className={clsx(
                  "w-full rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-[0.08em] text-white",
                  state.failSafeMode
                    ? "cursor-not-allowed bg-slate-400"
                    : "bg-gradient-to-r from-cyan-500 to-blue-700 shadow-lg"
                )}
                onClick={triggerDispatch}
                disabled={state.failSafeMode}
              >
                Trigger NESO Dispatch
              </button>

              <p className="text-xs text-slate-600">
                Dispatch animation draws the command path from NESO to the selected datacentre and highlights impacted
                nearby transmission corridors.
              </p>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Event</th>
                      <th className="px-3 py-2 text-left font-semibold">Service</th>
                      <th className="px-3 py-2 text-left font-semibold">MW</th>
                      <th className="px-3 py-2 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventLog.length === 0 && (
                      <tr>
                        <td className="px-3 py-3 text-slate-500" colSpan={4}>
                          No dispatch events yet.
                        </td>
                      </tr>
                    )}
                    {eventLog.map((event) => (
                      <tr key={event.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-semibold text-slate-700">{event.id}</td>
                        <td className="px-3 py-2 text-slate-600">{event.service}</td>
                        <td className="px-3 py-2 text-slate-600">{event.targetMw}</td>
                        <td className="px-3 py-2">
                          <span className={statusClass(event.status)}>{event.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "Settings" && (
            <div className="space-y-5">
              <RangeField
                label="Reserve SoC"
                value={state.reservePct}
                min={10}
                max={60}
                suffix="%"
                onChange={(value) => updateSetting("reservePct", value)}
              />

              <RangeField
                label="Load spike threshold"
                value={state.loadSpikeThresholdMw}
                min={Math.max(10, selectedDc?.baselineLoadMw ?? 20)}
                max={Math.max(40, (selectedDc?.baselineLoadMw ?? 20) * 2)}
                suffix="MW"
                onChange={(value) => updateSetting("loadSpikeThresholdMw", value)}
              />

              <SwitchField
                label="Auto dispatch"
                caption="Generates periodic dispatch requests automatically"
                enabled={state.autoDispatch}
                onToggle={(value) => updateSetting("autoDispatch", value)}
              />

              <SwitchField
                label="Grid failed"
                caption="Immediately blocks flexibility and preserves backup"
                enabled={state.gridStatus === "FAILED"}
                onToggle={(value) => updateSetting("gridStatus", value ? "FAILED" : "OK")}
              />

              <SwitchField
                label="Control link lost"
                caption="Fail-safe backup-only mode"
                enabled={!state.controlLinkOk}
                onToggle={(value) => updateSetting("controlLinkOk", !value)}
              />
            </div>
          )}
        </div>

        <div className="panel p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Fail-safe Monitor</p>
          <p className="mt-2 font-display text-lg font-semibold text-slate-900">
            {state.failSafeMode ? "Fail-safe engaged" : "Fail-safe inactive"}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {state.failSafeMode
              ? "Dispatch is disabled. Battery reserve is preserved for backup service continuity."
              : "Dispatch can run while reserve floor, link health, and load thresholds remain valid."}
          </p>
        </div>
      </aside>
    </main>
  );
}

function ReplayMetric({
  label,
  value,
  ratio,
  tone
}: {
  label: string;
  value: string;
  ratio: number;
  tone: "emerald" | "blue" | "amber" | "rose" | "slate";
}) {
  const toneClass = {
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    slate: "bg-slate-700"
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
      <div className="mt-2 h-1.5 rounded-full bg-slate-100">
        <div className={clsx("h-1.5 rounded-full transition-all", toneClass)} style={{ width: `${Math.max(0, Math.min(ratio, 1)) * 100}%` }} />
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  note,
  tone = "default"
}: {
  title: string;
  value: string;
  note: string;
  tone?: "default" | "accent";
}) {
  return (
    <div className={clsx("metric-tile p-4", tone === "accent" && "bg-gradient-to-r from-cyan-50 to-blue-50")}>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  );
}

function StatusPill({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className={clsx("rounded-xl border px-3 py-2", ok ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50")}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={clsx("font-semibold", ok ? "text-emerald-700" : "text-rose-700")}>{value}</p>
    </div>
  );
}

function FieldLabel({ text }: { text: string }) {
  return <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">{text}</p>;
}

function DataChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={clsx("h-2.5 w-2.5 rounded-full", color)} />
      {label}
    </span>
  );
}

function MiniToggle({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={clsx(
        "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] transition",
        enabled ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-500"
      )}
    >
      {label}
    </button>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  suffix,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold text-slate-900">{value.toFixed(0)} {suffix}</span>
      </div>
      <input
        type="range"
        className="w-full accent-blue-600"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function SwitchField({
  label,
  caption,
  enabled,
  onToggle
}: {
  label: string;
  caption: string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          <p className="text-xs text-slate-500">{caption}</p>
        </div>
        <button
          className={clsx("h-7 w-14 rounded-full p-1 transition", enabled ? "bg-blue-600" : "bg-slate-300")}
          onClick={() => onToggle(!enabled)}
        >
          <span className={clsx("block h-5 w-5 rounded-full bg-white transition", enabled ? "translate-x-7" : "translate-x-0")} />
        </button>
      </div>
    </div>
  );
}

function statusClass(status: string) {
  return clsx(
    "rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]",
    status === "EXECUTED" && "bg-emerald-100 text-emerald-700",
    status === "REJECTED" && "bg-rose-100 text-rose-700",
    status === "CURTAILED" && "bg-amber-100 text-amber-700",
    status === "ABORTED" && "bg-slate-200 text-slate-700"
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(amount);
}

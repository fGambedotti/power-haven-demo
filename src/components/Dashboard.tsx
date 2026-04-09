"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useSearchParams } from "next/navigation";
import MapView from "./MapView";
import regions from "../../data/uk_regions.json";
import ukOutline from "../../data/uk_outline.json";
import corridors from "../../data/transmission_lines.json";
import generationSites from "../../data/generation_sites.json";
import datacentres from "../../data/datacentres.json";
import demandProfiles from "../../data/demand_profiles.json";
import { useSimulation } from "../lib/useSimulation";
import { useAudienceMode } from "./AudienceMode";
import { applyDashboardBootstrapSettings, getDashboardSceneBootstrap } from "../lib/demoBootstrap";

const tabs = ["Datacentre", "Dispatch", "Settings"] as const;
const tabMeta: Record<(typeof tabs)[number], { label: string; description: string }> = {
  Datacentre: { label: "Site", description: "Select a datacentre and view its backup battery profile." },
  Dispatch: { label: "Action", description: "Trigger or review dispatch events and outcomes." },
  Settings: { label: "Safety", description: "Adjust reserve policy and fail-safe controls." }
};

type GenerationSiteRecord = {
  id: string;
  name: string;
  type: "renewable" | "non-renewable";
  capacityMw: number;
  lat: number;
  lon: number;
};

type SiteStatus = "operational" | "under_construction";

export default function Dashboard() {
  const { mode } = useAudienceMode();
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
    updateSetting,
    isPlaying,
    setIsPlaying,
    resetScenario,
    demoLoopSeconds,
    researchSignal
  } = useSimulation(datacentres);
  const searchParams = useSearchParams();
  const appliedDemoSceneRef = useRef<string | null>(null);

  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Datacentre");
  const [mapLayers, setMapLayers] = useState({
    regions: false,
    corridors: true,
    generation: true,
    labels: true
  });
  const [showTechnicalView, setShowTechnicalView] = useState(false);
  const [replayCursor, setReplayCursor] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [portfolioActiveIds, setPortfolioActiveIds] = useState<string[]>(["DC-17", "DC-18", "DC-09", "DC-13"]);
  const [mapStatusFilter, setMapStatusFilter] = useState<"all" | SiteStatus | "portfolio">("all");
  const [mapRegionFilter, setMapRegionFilter] = useState<string>("all");
  const [showImpactModal, setShowImpactModal] = useState(false);
  const [liveContext, setLiveContext] = useState({
    carbonIntensity: 125,
    servicePrice: 58,
    updatedAtLabel: "simulated"
  });

  const selectedDc = datacentres.find((dc) => dc.id === selectedId);
  const activeDemoScene = searchParams.get("demoScene");
  const backupAtRisk = state.powerMw > 0 && state.socPct <= state.reservePct + 1;
  const nowHour = Math.floor(state.timeSeconds / 3600) % 24;
  const currentDemand = demandProfiles.today[nowHour] ?? 0;
  const dispatchOrchestrationActive = Boolean(dispatchPulse || state.activeDispatch);
  const scenarioLoopSecond = state.timeSeconds % demoLoopSeconds;
  const scenarioMinute = Math.floor(scenarioLoopSecond / 60)
    .toString()
    .padStart(2, "0");
  const scenarioSecond = Math.floor(scenarioLoopSecond % 60)
    .toString()
    .padStart(2, "0");
  const safetyChecks = [
    { label: "Reserve floor", ok: state.socPct > state.reservePct + 1, detail: `${state.socPct.toFixed(1)}% >= ${state.reservePct}%` },
    { label: "Grid status", ok: state.gridStatus === "OK", detail: state.gridStatus === "OK" ? "Normal" : "Failed" },
    { label: "Control link", ok: state.controlLinkOk, detail: state.controlLinkOk ? "Connected" : "Lost" }
  ];
  const primaryWhyLines = [
    state.failSafeMode
      ? "Fail-safe is active, so flexibility dispatch is blocked and backup reserve is prioritized."
      : state.activeDispatch
        ? `Dispatch ${state.activeDispatch.eventId} is active and routed to the selected site.`
        : "System is ready to dispatch if a NESO signal is triggered.",
    `Reserve policy keeps at least ${state.reservePct}% SoC for backup continuity.`,
    state.gridStatus === "OK" && state.controlLinkOk
      ? "Grid and control link are healthy."
      : "One or more safety conditions are blocking dispatch."
  ];
  const regionOptions = useMemo(
    () => ["all", ...Array.from(new Set(datacentres.map((dc) => dc.region))).sort((a, b) => a.localeCompare(b))],
    []
  );

  const getSiteStatus = (dcId: string): SiteStatus => {
    const numericId = Number(dcId.split("-")[1]);
    return numericId >= 12 ? "under_construction" : "operational";
  };

  const filteredDatacentres = useMemo(() => {
    return datacentres.filter((dc) => {
      const regionMatch = mapRegionFilter === "all" || dc.region === mapRegionFilter;
      const status = getSiteStatus(dc.id);
      const statusMatch =
        mapStatusFilter === "all"
          ? true
          : mapStatusFilter === "portfolio"
            ? portfolioActiveIds.includes(dc.id)
            : status === mapStatusFilter;
      return regionMatch && statusMatch;
    });
  }, [mapRegionFilter, mapStatusFilter, portfolioActiveIds]);

  const portfolioImpact = useMemo(() => {
    const targets = datacentres.filter((dc) => portfolioActiveIds.includes(dc.id));
    const result = targets.reduce(
      (acc, dc) => {
        const enrolledMw = dc.batteryMw * 0.6;
        const enrolledMwh = dc.batteryMwh * 0.6;
        const grossRevenue = enrolledMwh * liveContext.servicePrice * 1200;
        const dcRevenue = grossRevenue * 0.85;
        const phRevenue = grossRevenue * 0.15;
        const co2Avoided = (enrolledMwh * 1200 * liveContext.carbonIntensity) / 1000;
        acc.sites += 1;
        acc.enrolledMw += enrolledMw;
        acc.dcRevenue += dcRevenue;
        acc.phRevenue += phRevenue;
        acc.co2Avoided += co2Avoided;
        return acc;
      },
      { sites: 0, enrolledMw: 0, dcRevenue: 0, phRevenue: 0, co2Avoided: 0 }
    );

    return {
      sites: result.sites,
      enrolledMw: Math.round(result.enrolledMw),
      dcRevenue: Math.round(result.dcRevenue),
      phRevenue: Math.round(result.phRevenue),
      co2Avoided: Math.round(result.co2Avoided)
    };
  }, [portfolioActiveIds, liveContext]);

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
    if (mode === "Technical") {
      setShowTechnicalView(true);
      setMapLayers((prev) => ({ ...prev, regions: true, labels: true }));
    } else if (mode === "Operator") {
      setShowTechnicalView(false);
      setMapLayers((prev) => ({ ...prev, regions: false, generation: false, labels: true }));
    } else {
      setShowTechnicalView(false);
      setMapLayers((prev) => ({ ...prev, regions: false, generation: true, labels: true }));
    }
  }, [mode]);

  useEffect(() => {
    const updateLiveContext = async () => {
      try {
        const [carbonRes, nesoRes] = await Promise.all([
          fetch("https://api.carbonintensity.org.uk/intensity"),
          fetch("https://api.neso.energy/api/3/action/datastore_search?resource_id=0e14e21d-b2b7-461d-a524-0b3b53fa7c83&limit=1")
        ]);
        const carbonData = await carbonRes.json();
        const nesoData = await nesoRes.json();
        const carbon =
          carbonData?.data?.[0]?.intensity?.actual ?? carbonData?.data?.[0]?.intensity?.forecast ?? 125;
        const firstRecord = nesoData?.result?.records?.[0];
        const nesoPriceRaw =
          firstRecord?.["Clearing Price (£/MWh)"] ?? firstRecord?.clearingPrice ?? firstRecord?.price ?? 58;
        const servicePrice = Number.parseFloat(String(nesoPriceRaw));
        setLiveContext({
          carbonIntensity: Number.isFinite(carbon) ? carbon : 125,
          servicePrice: Number.isFinite(servicePrice) ? servicePrice : 58,
          updatedAtLabel: "live"
        });
      } catch {
        setLiveContext((prev) => ({ ...prev, updatedAtLabel: "fallback" }));
      }
    };

    void updateLiveContext();
    const timer = setInterval(updateLiveContext, 180000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const stillVisible = filteredDatacentres.some((dc) => dc.id === selectedId);
    if (!stillVisible && filteredDatacentres[0]) {
      setSelectedId(filteredDatacentres[0].id);
    }
  }, [filteredDatacentres, selectedId, setSelectedId]);

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
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">{mode} Mode · Interactive Scenario</p>
              <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                VoltPilot safely turns backup batteries into grid flexibility
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                {mode === "Investor"
                  ? "Simple scenario playback showing how VoltPilot monetizes idle backup batteries while preserving resilience."
                  : mode === "Operator"
                    ? "Operational view focused on uptime protection, dispatch behavior, and what changes at the site."
                    : "Technical validation view showing dispatch behavior, constraint enforcement, and execution telemetry."}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Scenario Playback</p>
              <p className="font-display text-lg font-semibold text-slate-900">
                {scenarioMinute}:{scenarioSecond} <span className="text-sm text-slate-500">/ {Math.floor(demoLoopSeconds / 60)}:00 loop</span>
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                <button className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700" onClick={() => setIsPlaying((v) => !v)}>
                  {isPlaying ? "Pause" : "Play"}
                </button>
                <button className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700" onClick={resetScenario}>
                  Restart Scenario
                </button>
                <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white" onClick={triggerDispatch} disabled={state.failSafeMode}>
                  Next Event
                </button>
              </div>
            </div>
          </div>
        </div>

        {activeDemoScene && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-medium text-blue-800">
            Demo preset active: <span className="font-bold">{activeDemoScene}</span>. Use `/demo-mode` scene links for presenter-guided states.
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <LiveChip label="Grid Carbon" value={`${Math.round(liveContext.carbonIntensity)} gCO2/kWh`} tone="emerald" />
          <LiveChip label="DC Service Price" value={`£${liveContext.servicePrice.toFixed(2)}/MWh`} tone="blue" />
          <LiveChip label="Context Source" value={liveContext.updatedAtLabel} tone="slate" />
          <button
            type="button"
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={() => {
              setPortfolioActiveIds(datacentres.map((dc) => dc.id));
              setShowImpactModal(true);
            }}
          >
            Activate Full Portfolio
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Backup Status" value={backupAtRisk || state.failSafeMode ? (state.failSafeMode ? "Fail-safe" : "Warning") : "Protected"} note="Click to review safety controls" tone={backupAtRisk || state.failSafeMode ? "warn" : "accent"} onClick={() => setActiveTab("Settings")} />
          <MetricCard title="Battery SoC" value={`${state.socPct.toFixed(1)}%`} note={`Reserve floor ${state.reservePct}% · Click for site`} onClick={() => setActiveTab("Datacentre")} />
          <MetricCard
            title={mode === "Operator" ? "Uptime Risk" : "Flexibility Available"}
            value={mode === "Operator" ? (state.failSafeMode ? "Low (Protected)" : backupAtRisk ? "Watch" : "Low") : `${flex.availableFlexMw.toFixed(1)} MW`}
            note={(mode === "Operator" ? "Derived from reserve + fail-safe checks" : state.failSafeMode ? "Blocked by fail-safe" : "Ready for dispatch") + " · Click for action"}
            onClick={() => setActiveTab("Dispatch")}
          />
          <MetricCard
            title={mode === "Technical" ? "Dispatch State" : "Today's Revenue"}
            value={mode === "Technical" ? (state.activeDispatch ? state.activeDispatch.eventId : "Standby") : formatCurrency(state.todayRevenue)}
            note={mode === "Technical" ? `Service: ${state.activeService ?? "None"} · Trace below` : `Service: ${state.activeService ?? "Standby"} · Live sim`}
            onClick={() => (mode === "Technical" ? setShowTechnicalView(true) : window.location.assign("/roi-studio"))}
          />
        </div>

        {state.calibrationMode === "RESEARCH" && (
          <div className="panel p-5 sm:p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Research-Calibrated Mode</p>
            <p className="mt-1 text-sm text-slate-600">
              Dispatch envelope is calibrated using published workload flexibility and day-ahead pricing assumptions.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <DataChip label="Mapped hour" value={`${researchSignal.hour}:00`} />
              <DataChip label="Flex index" value={`${(researchSignal.flexibilityIndex * 100).toFixed(0)}%`} />
              <DataChip label="Max flex duration" value={`${state.maxFlexDurationMin} min`} />
            </div>
          </div>
        )}

        <div className="panel p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Safety Shield</p>
              <p className="font-display text-xl font-semibold text-slate-900">Is backup protected?</p>
            </div>
            <span
              className={clsx(
                "rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.14em]",
                backupAtRisk || state.failSafeMode ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700 badge-pulse"
              )}
            >
              {state.failSafeMode ? "Fail-safe Active" : backupAtRisk ? "Warning" : "Backup Protected"}
            </span>
          </div>
          <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
            {safetyChecks.map((check) => (
              <StatusPill key={check.label} label={check.label} value={check.detail} ok={check.ok} />
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Why this action?</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {primaryWhyLines.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
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
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <MiniToggle label="All Sites" enabled={mapStatusFilter === "all"} onToggle={() => setMapStatusFilter("all")} />
              <MiniToggle label="Operational" enabled={mapStatusFilter === "operational"} onToggle={() => setMapStatusFilter("operational")} />
              <MiniToggle label="Under Construction" enabled={mapStatusFilter === "under_construction"} onToggle={() => setMapStatusFilter("under_construction")} />
              <MiniToggle label="VoltPilot Active" enabled={mapStatusFilter === "portfolio"} onToggle={() => setMapStatusFilter("portfolio")} />
              <select
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                value={mapRegionFilter}
                onChange={(event) => setMapRegionFilter(event.target.value)}
              >
                {regionOptions.map((region) => (
                  <option key={region} value={region}>
                    {region === "all" ? "All Regions" : region}
                  </option>
                ))}
              </select>
            </div>
            <MapView
              ukOutline={ukOutline as GeoJSON.FeatureCollection}
              regions={regions as GeoJSON.FeatureCollection}
              corridors={corridors as GeoJSON.FeatureCollection}
              datacentres={filteredDatacentres}
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
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Dispatch Plan (Portfolio)</p>
                <p className="mt-1 text-sm text-slate-700">
                  {dispatchOrchestrationActive
                    ? mode === "Operator"
                      ? "This is the dispatch plan VoltPilot would execute across eligible sites while keeping backup reserve protected."
                      : "VoltPilot splits the dispatch across the best-ready sites while protecting reserve policy."
                    : mode === "Operator"
                      ? "Trigger a dispatch to see which sites are selected and how much power each contributes."
                      : "Trigger a dispatch to show how VoltPilot selects and splits a grid instruction across the portfolio."}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="font-semibold text-slate-800">{portfolioImpact.sites}</p>
                    <p className="text-slate-500">Active sites</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="font-semibold text-slate-800">{portfolioImpact.enrolledMw} MW</p>
                    <p className="text-slate-500">Enrolled flex</p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {allocationRows.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-xs text-slate-500">
                      No active dispatch plan yet.
                    </div>
                  ) : (
                    allocationRows.map((row) => (
                      <div key={row.id} className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-800">{row.name}</p>
                            <p className="text-slate-500">{row.role} · {row.confidence}% confidence</p>
                          </div>
                          <p className="font-bold text-slate-900">{row.mw} MW</p>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-slate-200">
                          <div
                            className={clsx("h-2 rounded-full", row.role === "Primary" ? "bg-amber-500" : "bg-cyan-500")}
                            style={{ width: `${Math.min(100, (row.mw / Math.max(state.activeDispatch?.targetMw ?? state.batteryMw ?? 1, 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <MiniToggle label="Heatmap" enabled={mapLayers.regions} onToggle={() => setMapLayers((prev) => ({ ...prev, regions: !prev.regions }))} />
                  <MiniToggle label="Labels" enabled={mapLayers.labels} onToggle={() => setMapLayers((prev) => ({ ...prev, labels: !prev.labels }))} />
                  <MiniToggle label="Gen sites" enabled={mapLayers.generation} onToggle={() => setMapLayers((prev) => ({ ...prev, generation: !prev.generation }))} />
                </div>
              </div>
              <div className={clsx("overflow-hidden rounded-xl border border-slate-200 bg-white", mode === "Operator" && "hidden lg:block")}>
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

        <div className="panel p-4 sm:p-5">
          <button
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left"
            onClick={() => setShowTechnicalView((v) => !v)}
          >
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Technical View</p>
              <p className="text-sm font-semibold text-slate-900">
                {showTechnicalView ? "Hide detailed traces and telemetry" : "Show detailed traces and telemetry"}
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600">{showTechnicalView ? "Hide" : "Show"}</span>
          </button>
        </div>

        {showTechnicalView && latestDecisionTrace && (
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

        {showTechnicalView && recentSnapshots.length > 0 && (
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
                {tabMeta[tab].label}
              </button>
            ))}
          </div>
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">{tabMeta[activeTab].label}</p>
            <p className="text-xs text-slate-600">{tabMeta[activeTab].description}</p>
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

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                  onClick={() => setPortfolioActiveIds(portfolioAllocation.map((row) => row.id))}
                >
                  Activate Top 4 Sites
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                  onClick={() => {
                    setPortfolioActiveIds(datacentres.map((dc) => dc.id));
                    setShowImpactModal(true);
                  }}
                >
                  Enrol All (Demo)
                </button>
              </div>

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
                  <button
                    type="button"
                    className={clsx(
                      "mt-4 w-full rounded-lg px-3 py-2 text-sm font-semibold",
                      portfolioActiveIds.includes(selectedDc.id)
                        ? "bg-emerald-600 text-white"
                        : "border border-slate-300 bg-white text-slate-700"
                    )}
                    onClick={() =>
                      setPortfolioActiveIds((prev) =>
                        prev.includes(selectedDc.id)
                          ? prev.filter((id) => id !== selectedDc.id)
                          : [...prev, selectedDc.id]
                      )
                    }
                  >
                    {portfolioActiveIds.includes(selectedDc.id) ? "VoltPilot Active" : "Activate in VoltPilot"}
                  </button>
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
                Starts a simulated dispatch event. The map shows the route from NESO to selected portfolio sites.
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

              <SwitchField
                label="Research-calibrated mode"
                caption="Uses literature-calibrated workload flexibility and day-ahead pricing profile"
                enabled={state.calibrationMode === "RESEARCH"}
                onToggle={(value) => updateSetting("calibrationMode", value ? "RESEARCH" : "DEMO")}
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

      {showImpactModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Portfolio Impact</p>
            <h3 className="mt-1 font-display text-2xl font-semibold text-slate-900">
              VoltPilot full-portfolio scenario
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Illustrative annual impact if all currently visible sites are activated under current service-price assumptions.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ImpactStat label="Active sites" value={`${portfolioImpact.sites}`} />
              <ImpactStat label="Enrolled flexibility" value={`${portfolioImpact.enrolledMw} MW`} />
              <ImpactStat label="Datacentre revenue" value={formatCurrency(portfolioImpact.dcRevenue)} />
              <ImpactStat label="VoltPilot revenue" value={formatCurrency(portfolioImpact.phRevenue)} />
              <ImpactStat label="CO2 avoided" value={`${portfolioImpact.co2Avoided.toLocaleString()} t`} />
              <ImpactStat label="Service price input" value={`£${liveContext.servicePrice.toFixed(2)}/MWh`} />
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                onClick={() => {
                  setShowImpactModal(false);
                  window.location.assign("/roi-studio");
                }}
              >
                Open ROI Studio
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                onClick={() => setShowImpactModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
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

function LiveChip({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "emerald" | "blue" | "slate";
}) {
  const toneClass = tone === "emerald" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : tone === "blue" ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-slate-50 border-slate-200 text-slate-700";
  return (
    <div className={clsx("rounded-full border px-3 py-1.5 text-xs", toneClass)}>
      <span className="font-semibold">{label}:</span> {value}
    </div>
  );
}

function ImpactStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function MetricCard({
  title,
  value,
  note,
  tone = "default",
  onClick
}: {
  title: string;
  value: string;
  note: string;
  tone?: "default" | "accent" | "warn";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "metric-tile w-full p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md",
        tone === "accent" && "bg-gradient-to-r from-cyan-50 to-blue-50",
        tone === "warn" && "bg-gradient-to-r from-amber-50 to-rose-50"
      )}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </button>
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

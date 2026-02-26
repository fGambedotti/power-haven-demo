"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DispatchDecisionTrace, DispatchEvent, DispatchRequest, SimState, SimStepSnapshot } from "./types";
import { applyDispatchRequest, computeFlex, initState, tickState } from "./simEngine";

interface Datacentre {
  id: string;
  name: string;
  lat: number;
  lon: number;
  batteryMw: number;
  batteryMwh: number;
  baselineLoadMw: number;
  region: string;
}

const SERVICES = ["Dynamic Containment", "Balancing Mechanism"] as const;

function calculateLoad(baseline: number, timeSeconds: number): number {
  const wave = Math.sin(timeSeconds / 45) * 0.08;
  const evening = Math.sin(timeSeconds / 90) * 0.04;
  return baseline * (1 + wave + evening);
}

export function useSimulation(datacentres: Datacentre[]) {
  const [selectedId, setSelectedId] = useState(datacentres[0]?.id ?? null);
  const initialDc = datacentres.find((dc) => dc.id === selectedId) ?? datacentres[0];

  const [state, setState] = useState<SimState>(() =>
    initState({
      datacentreId: initialDc?.id ?? null,
      batteryMw: initialDc?.batteryMw ?? 0,
      batteryMwh: initialDc?.batteryMwh ?? 0,
      baselineLoadMw: initialDc?.baselineLoadMw ?? 0
    })
  );

  const [eventLog, setEventLog] = useState<DispatchEvent[]>([]);
  const [decisionTraces, setDecisionTraces] = useState<DispatchDecisionTrace[]>([]);
  const [stepSnapshots, setStepSnapshots] = useState<SimStepSnapshot[]>([]);
  const [dispatchPulse, setDispatchPulse] = useState(false);
  const idCounter = useRef(1);

  useEffect(() => {
    if (!selectedId) return;
    const dc = datacentres.find((item) => item.id === selectedId);
    if (!dc) return;
    setState((prev) => ({
      ...prev,
      selectedDatacentreId: dc.id,
      batteryMw: dc.batteryMw,
      batteryMwh: dc.batteryMwh,
      baselineLoadMw: dc.baselineLoadMw
    }));
  }, [selectedId, datacentres]);

  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => {
        const updatedLoad = calculateLoad(prev.baselineLoadMw, prev.timeSeconds);
        const withLoad = { ...prev, loadSpikeMw: updatedLoad };
        const result = tickState(withLoad, 1);

        if (result.curtailed && prev.activeDispatch) {
          setDecisionTraces((traces) =>
            traces.map((trace) =>
              trace.eventId === prev.activeDispatch?.eventId
                ? { ...trace, resolvedStatus: "CURTAILED", resolvedPowerMw: result.state.powerMw, note: "Reserve limit reached during execution" }
                : trace
            )
          );
          setEventLog((log) =>
            log.map((event) =>
              event.id === prev.activeDispatch?.eventId
                ? { ...event, status: "CURTAILED", curtailedReason: "Reserve limit reached" }
                : event
            )
          );
        }

        if (prev.activeDispatch && !result.state.activeDispatch && !result.state.failSafeMode) {
          setDecisionTraces((traces) =>
            traces.map((trace) =>
              trace.eventId === prev.activeDispatch?.eventId
                ? { ...trace, resolvedStatus: "EXECUTED", resolvedPowerMw: prev.powerMw || trace.resolvedPowerMw || 0 }
                : trace
            )
          );
          setEventLog((log) =>
            log.map((event) =>
              event.id === prev.activeDispatch?.eventId ? { ...event, status: "EXECUTED" } : event
            )
          );
        }

        if (prev.activeDispatch && result.state.failSafeMode) {
          setDecisionTraces((traces) =>
            traces.map((trace) =>
              trace.eventId === prev.activeDispatch?.eventId
                ? { ...trace, resolvedStatus: "ABORTED", resolvedPowerMw: 0, note: "Fail-safe engaged during active dispatch" }
                : trace
            )
          );
          setEventLog((log) =>
            log.map((event) =>
              event.id === prev.activeDispatch?.eventId
                ? { ...event, status: "ABORTED", curtailedReason: "Fail-safe engaged" }
                : event
            )
          );
        }

        if (result.state.autoDispatch && !result.state.activeDispatch && result.state.timeSeconds % 45 === 0) {
          const request: DispatchRequest = {
            service: SERVICES[result.state.timeSeconds % 2],
            direction: result.state.socPct > 55 ? "DISCHARGE" : "CHARGE",
            targetMw: Math.max(10, Math.round(result.state.batteryMw * 0.6)),
            durationSec: 30
          };
          const id = `EV-${String(idCounter.current++).padStart(3, "0")}`;
          const trace = buildDecisionTrace(result.state, request, id);
          setDecisionTraces((traces) => [trace, ...traces].slice(0, 20));
          const resultDispatch = applyDispatchRequest(result.state, request, id);
          setDecisionTraces((traces) =>
            traces.map((t) =>
              t.eventId === id
                ? {
                    ...t,
                    resolvedStatus: resultDispatch.event.status === "REJECTED" ? "REJECTED" : "APPROVED",
                    resolvedPowerMw: resultDispatch.state.activeDispatch ? resultDispatch.state.activeDispatch.targetMw : 0,
                    note: resultDispatch.event.curtailedReason
                  }
                : t
            )
          );
          setEventLog((log) => [resultDispatch.event, ...log].slice(0, 12));
          setDispatchPulse(true);
          setTimeout(() => setDispatchPulse(false), 1200);
          return resultDispatch.state;
        }

        setStepSnapshots((snapshots) => [
          {
            t: result.state.timeSeconds,
            selectedDatacentreId: result.state.selectedDatacentreId,
            activeDispatchEventId: result.state.activeDispatch?.eventId ?? null,
            socPct: Math.round(result.state.socPct * 10) / 10,
            powerMw: Math.round(result.state.powerMw * 10) / 10,
            loadMw: Math.round(updatedLoad * 10) / 10,
            failSafeMode: result.state.failSafeMode,
            revenue: Math.round(result.state.todayRevenue)
          },
          ...snapshots
        ].slice(0, 30));

        return result.state;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerDispatch = () => {
    setState((prev) => {
      const request: DispatchRequest = {
        service: SERVICES[Math.floor(prev.timeSeconds) % 2],
        direction: prev.socPct > 55 ? "DISCHARGE" : "CHARGE",
        targetMw: Math.max(10, Math.round(prev.batteryMw * 0.65)),
        durationSec: 30
      };
      const id = `EV-${String(idCounter.current++).padStart(3, "0")}`;
      const trace = buildDecisionTrace(prev, request, id);
      setDecisionTraces((traces) => [trace, ...traces].slice(0, 20));
      const result = applyDispatchRequest(prev, request, id);
      setDecisionTraces((traces) =>
        traces.map((t) =>
          t.eventId === id
            ? {
                ...t,
                resolvedStatus: result.event.status === "REJECTED" ? "REJECTED" : "APPROVED",
                resolvedPowerMw: result.state.activeDispatch ? result.state.activeDispatch.targetMw : 0,
                note: result.event.curtailedReason
              }
            : t
        )
      );
      setEventLog((log) => [result.event, ...log].slice(0, 12));
      setDispatchPulse(true);
      setTimeout(() => setDispatchPulse(false), 1200);
      return result.state;
    });
  };

  const updateSetting = (key: keyof SimState, value: SimState[keyof SimState]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const flex = useMemo(() => computeFlex(state), [state]);

  return {
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
  };
}

function buildDecisionTrace(state: SimState, request: DispatchRequest, eventId: string): DispatchDecisionTrace {
  const checks = [
    {
      rule: "Reserve floor",
      passed: state.socPct > state.reservePct + 1 || request.direction === "CHARGE",
      detail: `${state.socPct.toFixed(1)}% vs ${state.reservePct}%`
    },
    {
      rule: "Grid status",
      passed: state.gridStatus === "OK",
      detail: state.gridStatus
    },
    {
      rule: "Control link",
      passed: state.controlLinkOk,
      detail: state.controlLinkOk ? "Connected" : "Lost"
    },
    {
      rule: "Load threshold",
      passed: state.loadSpikeMw <= state.loadSpikeThresholdMw,
      detail: `${state.loadSpikeMw.toFixed(1)} / ${state.loadSpikeThresholdMw.toFixed(1)} MW`
    }
  ];

  const blocked = checks.some((c) => !c.passed && c.rule !== "Reserve floor");
  return {
    eventId,
    timestamp: new Date().toISOString(),
    datacentreId: state.selectedDatacentreId,
    proposed: request,
    checks,
    resolvedStatus: blocked ? "REJECTED" : "PUTATIVE",
    resolvedPowerMw: 0
  };
}

import type { DispatchEvent, DispatchRequest, SimState } from "./types";

export const SERVICE_RATES: Record<string, number> = {
  "Dynamic Containment": 45,
  "Balancing Mechanism": 65
};

export function initState(params: {
  datacentreId: string | null;
  batteryMw: number;
  batteryMwh: number;
  baselineLoadMw: number;
}): SimState {
  return {
    timeSeconds: 0,
    selectedDatacentreId: params.datacentreId,
    batteryMw: params.batteryMw,
    batteryMwh: params.batteryMwh,
    baselineLoadMw: params.baselineLoadMw,
    socPct: 72,
    reservePct: 25,
    powerMw: 0,
    gridStatus: "OK",
    controlLinkOk: true,
    loadSpikeMw: 0,
    loadSpikeThresholdMw: params.baselineLoadMw * 1.3,
    autoDispatch: false,
    activeDispatch: null,
    activeService: null,
    todayRevenue: 0,
    dispatchAllowed: true,
    failSafeMode: false
  };
}

export function applyDispatchRequest(
  state: SimState,
  request: DispatchRequest,
  eventId: string
): { state: SimState; event: DispatchEvent } {
  const failSafe = isFailSafe(state);
  if (failSafe) {
    return {
      state: { ...state, activeDispatch: null, powerMw: 0, activeService: null },
      event: {
        id: eventId,
        timestamp: new Date().toISOString(),
        datacentreId: state.selectedDatacentreId ?? "UNASSIGNED",
        service: request.service,
        direction: request.direction,
        targetMw: request.targetMw,
        durationSec: request.durationSec,
        status: "REJECTED",
        curtailedReason: "Fail-safe mode"
      }
    };
  }

  const activeDispatch = {
    eventId,
    service: request.service,
    direction: request.direction,
    targetMw: request.targetMw,
    remainingSec: request.durationSec
  };

  return {
    state: {
      ...state,
      activeDispatch,
      activeService: request.service
    },
    event: {
      id: eventId,
      timestamp: new Date().toISOString(),
      datacentreId: state.selectedDatacentreId ?? "UNASSIGNED",
      service: request.service,
      direction: request.direction,
      targetMw: request.targetMw,
      durationSec: request.durationSec,
      status: "EXECUTED"
    }
  };
}

export function tickState(state: SimState, dtSec: number): { state: SimState; curtailed: boolean } {
  const failSafe = isFailSafe(state);
  if (failSafe) {
    return {
      state: {
        ...state,
        timeSeconds: state.timeSeconds + dtSec,
        powerMw: 0,
        activeDispatch: null,
        activeService: null,
        dispatchAllowed: false,
        failSafeMode: true
      },
      curtailed: false
    };
  }

  const next = {
    ...state,
    timeSeconds: state.timeSeconds + dtSec,
    failSafeMode: false,
    dispatchAllowed: true
  };
  let curtailed = false;

  if (next.activeDispatch) {
    const directionMultiplier = next.activeDispatch.direction === "DISCHARGE" ? 1 : -1;
    next.powerMw = directionMultiplier * Math.min(next.activeDispatch.targetMw, next.batteryMw);
    next.activeDispatch.remainingSec = Math.max(0, next.activeDispatch.remainingSec - dtSec);
    if (next.activeDispatch.remainingSec === 0) {
      next.activeDispatch = null;
      next.activeService = null;
      next.powerMw = 0;
    }
  } else {
    next.powerMw = 0;
  }

  const reserveResult = enforceReserve(next, dtSec);
  curtailed = reserveResult.curtailed;
  const withEnergy = applyEnergyDelta(reserveResult.state, dtSec);
  const revenue = accrueRevenue(withEnergy, dtSec);

  return {
    state: { ...withEnergy, todayRevenue: revenue },
    curtailed
  };
}

export function enforceReserve(state: SimState, dtSec: number): { state: SimState; curtailed: boolean } {
  if (state.powerMw <= 0) {
    return { state, curtailed: false };
  }

  const maxDischargeMwh = Math.max(0, ((state.socPct - state.reservePct) / 100) * state.batteryMwh);
  const maxDischargeMw = (maxDischargeMwh * 3600) / dtSec;

  if (maxDischargeMw <= 0) {
    return { state: { ...state, powerMw: 0 }, curtailed: true };
  }

  if (state.powerMw > maxDischargeMw) {
    return { state: { ...state, powerMw: maxDischargeMw }, curtailed: true };
  }

  return { state, curtailed: false };
}

export function applyEnergyDelta(state: SimState, dtSec: number): SimState {
  const energyDeltaMwh = (state.powerMw * dtSec) / 3600;
  const socDelta = (energyDeltaMwh / state.batteryMwh) * 100;
  const nextSoc = Math.max(0, Math.min(100, state.socPct - socDelta));
  return { ...state, socPct: nextSoc };
}

export function accrueRevenue(state: SimState, dtSec: number): number {
  if (!state.activeService || state.powerMw === 0) {
    return state.todayRevenue;
  }
  const rate = SERVICE_RATES[state.activeService] ?? 40;
  const revenuePerSec = (rate * Math.abs(state.powerMw)) / 3600;
  return state.todayRevenue + revenuePerSec * dtSec;
}

export function finalizeTick(state: SimState, dtSec: number): SimState {
  return applyEnergyDelta(state, dtSec);
}

export function isFailSafe(state: SimState): boolean {
  const loadSpike = state.loadSpikeMw > state.loadSpikeThresholdMw;
  return state.gridStatus === "FAILED" || !state.controlLinkOk || loadSpike;
}

export function computeFlex(state: SimState): { reservedBackupPct: number; availableFlexMw: number } {
  const failSafe = isFailSafe(state);
  const reservedBackupPct = failSafe ? 100 : state.reservePct;
  if (failSafe) {
    return { reservedBackupPct, availableFlexMw: 0 };
  }
  const availableEnergyMwh = Math.max(0, ((state.socPct - state.reservePct) / 100) * state.batteryMwh);
  const availableFlexMw = Math.min(state.batteryMw, availableEnergyMwh);
  return { reservedBackupPct, availableFlexMw };
}

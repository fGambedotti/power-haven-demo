import type { DispatchEvent, DispatchRequest, DispatchService, SimState } from "./types";

export const SERVICE_PRICING: Record<
  DispatchService,
  { availabilityGbpPerMwH: number; activationGbpPerMwh: number }
> = {
  // Source baseline: UK dynamic services market medians (illustrative, 2024-2025 range).
  "Dynamic Containment": { availabilityGbpPerMwH: 18, activationGbpPerMwh: 20 },
  "Dynamic Moderation": { availabilityGbpPerMwH: 21, activationGbpPerMwh: 24 },
  "Dynamic Regulation": { availabilityGbpPerMwH: 24, activationGbpPerMwh: 28 },
  FFR: { availabilityGbpPerMwH: 16, activationGbpPerMwh: 18 },
  "Balancing Mechanism": { availabilityGbpPerMwH: 8, activationGbpPerMwh: 40 }
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
    failSafeMode: false,
    calibrationMode: "DEMO",
    researchHour: 0,
    serviceRateGbpPerMwh: 55,
    flexibilityIndex: 1,
    maxFlexDurationMin: 90,
    frequencyHz: 50,
    frequencyTriggerHz: 49.8,
    contractedMw: Math.max(1, params.batteryMw * 0.6),
    rampRateMwPerSec: Math.max(0.01, (Math.max(1, params.batteryMw * 0.6) * 0.05) / 60),
    availabilityRateGbpPerMwH: SERVICE_PRICING["Dynamic Containment"].availabilityGbpPerMwH,
    activationRateGbpPerMwh: SERVICE_PRICING["Dynamic Containment"].activationGbpPerMwh,
    dayAheadPriceGbpPerMwh: 70,
    energyCostAvoidedToday: 0,
    roundTripEfficiency: 0.92,
    effectiveBatteryMwh: params.batteryMwh,
    cumulativeThroughputMwh: 0,
    degradationPctPerCycle: 0.003,
    coolingFlexMw: Math.max(1, params.baselineLoadMw * 0.15),
    coolingSaturationPct: 0,
    inletTempC: 22.5,
    maxInletTempC: 27,
    coolingRecoveryUntilSec: null,
    anmConstraintActive: false
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
  const nextFrequency = simulateFrequency(state.timeSeconds + dtSec);
  const nextStateWithFreq = { ...state, frequencyHz: nextFrequency };
  const failSafe = isFailSafe(nextStateWithFreq);
  if (failSafe) {
    return {
      state: {
        ...nextStateWithFreq,
        timeSeconds: nextStateWithFreq.timeSeconds + dtSec,
        powerMw: 0,
        activeDispatch: null,
        activeService: null,
        dispatchAllowed: false,
        failSafeMode: true,
        todayRevenue: accrueAvailabilityRevenue(nextStateWithFreq, dtSec) + nextStateWithFreq.todayRevenue
      },
      curtailed: false
    };
  }

  const next = {
    ...nextStateWithFreq,
    timeSeconds: nextStateWithFreq.timeSeconds + dtSec,
    failSafeMode: false,
    dispatchAllowed: true
  };
  let curtailed = false;

  if (next.activeDispatch) {
    const directionMultiplier = next.activeDispatch.direction === "DISCHARGE" ? 1 : -1;
    const targetPower = directionMultiplier * Math.min(next.activeDispatch.targetMw, next.batteryMw);
    const maxStep = next.rampRateMwPerSec * dtSec;
    const delta = targetPower - next.powerMw;
    if (Math.abs(delta) <= maxStep) {
      next.powerMw = targetPower;
    } else {
      next.powerMw = next.powerMw + Math.sign(delta) * maxStep;
    }
    next.activeDispatch.remainingSec = Math.max(0, next.activeDispatch.remainingSec - dtSec);
    if (next.activeDispatch.remainingSec === 0) {
      next.activeDispatch = null;
      next.activeService = null;
    }
  } else {
    const maxStep = next.rampRateMwPerSec * dtSec;
    if (Math.abs(next.powerMw) <= maxStep) {
      next.powerMw = 0;
    } else {
      next.powerMw = next.powerMw - Math.sign(next.powerMw) * maxStep;
    }
  }

  const coolingAdjusted = updateCoolingState(next, dtSec);

  const reserveResult = enforceReserve(coolingAdjusted, dtSec);
  curtailed = reserveResult.curtailed;
  const withEnergy = applyEnergyDelta(reserveResult.state, dtSec);
  const availabilityRevenue = accrueAvailabilityRevenue(withEnergy, dtSec);
  const activationRevenue = accrueActivationRevenue(withEnergy, dtSec);
  const avoidedCost = accrueEnergyCostAvoided(withEnergy, dtSec);

  return {
    state: {
      ...withEnergy,
      todayRevenue: withEnergy.todayRevenue + availabilityRevenue + activationRevenue,
      energyCostAvoidedToday: withEnergy.energyCostAvoidedToday + avoidedCost
    },
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
  const energyDeltaMwh = (Math.abs(state.powerMw) * dtSec) / 3600;
  const mwhBase = Math.max(0.1, state.effectiveBatteryMwh);
  let nextSoc = state.socPct;
  let throughput = state.cumulativeThroughputMwh;

  if (state.powerMw > 0) {
    const dischargeSocDelta = (energyDeltaMwh / mwhBase) * 100;
    nextSoc = state.socPct - dischargeSocDelta;
    throughput += energyDeltaMwh;
  } else if (state.powerMw < 0) {
    const storedMwh = energyDeltaMwh * state.roundTripEfficiency;
    const chargeSocDelta = (storedMwh / mwhBase) * 100;
    nextSoc = state.socPct + chargeSocDelta;
    throughput += energyDeltaMwh;
  }

  nextSoc = Math.max(0, Math.min(100, nextSoc));
  const equivalentCycles = throughput / Math.max(0.1, state.batteryMwh);
  const degradation = equivalentCycles * (state.degradationPctPerCycle / 100);
  const effectiveBatteryMwh = Math.max(state.batteryMwh * 0.8, state.batteryMwh * (1 - degradation));

  return {
    ...state,
    socPct: nextSoc,
    cumulativeThroughputMwh: throughput,
    effectiveBatteryMwh
  };
}

export function accrueAvailabilityRevenue(state: SimState, dtSec: number): number {
  if (state.failSafeMode || !state.controlLinkOk || state.anmConstraintActive) {
    return 0;
  }
  return (state.availabilityRateGbpPerMwH * state.contractedMw * dtSec) / 3600;
}

export function accrueActivationRevenue(state: SimState, dtSec: number): number {
  if (!state.activeService || state.powerMw === 0) return 0;
  return (state.activationRateGbpPerMwh * Math.abs(state.powerMw) * dtSec) / 3600;
}

export function accrueEnergyCostAvoided(state: SimState, dtSec: number): number {
  if (state.powerMw <= 0) return 0;
  return (state.dayAheadPriceGbpPerMwh * state.powerMw * dtSec) / 3600;
}

export function finalizeTick(state: SimState, dtSec: number): SimState {
  return applyEnergyDelta(state, dtSec);
}

export function isFailSafe(state: SimState): boolean {
  const loadSpike = state.loadSpikeMw > state.loadSpikeThresholdMw;
  const thermalLimit = state.inletTempC > state.maxInletTempC;
  return state.gridStatus === "FAILED" || !state.controlLinkOk || loadSpike || state.anmConstraintActive || thermalLimit;
}

export function computeFlex(state: SimState): { reservedBackupPct: number; availableFlexMw: number } {
  const failSafe = isFailSafe(state);
  const reservedBackupPct = failSafe ? 100 : state.reservePct;
  if (failSafe) {
    return { reservedBackupPct, availableFlexMw: 0 };
  }
  const availableEnergyMwh = Math.max(0, ((state.socPct - state.reservePct) / 100) * state.batteryMwh);
  const coolingAvailable = state.coolingRecoveryUntilSec && state.timeSeconds < state.coolingRecoveryUntilSec
    ? 0
    : state.coolingFlexMw * Math.max(0, 1 - state.coolingSaturationPct / 100);
  const batteryFlex = Math.min(state.batteryMw, availableEnergyMwh) * Math.max(0.2, Math.min(1, state.flexibilityIndex));
  const availableFlexMw = Math.max(0, batteryFlex + coolingAvailable);
  return { reservedBackupPct, availableFlexMw };
}

export function servicePricingFor(service: DispatchService) {
  return SERVICE_PRICING[service];
}

export function simulateFrequency(timeSeconds: number): number {
  const base = 50 + Math.sin(timeSeconds / 15) * 0.04;
  const dip = timeSeconds % 75 > 60 && timeSeconds % 75 < 66 ? -0.28 : 0;
  return Math.max(49.4, Math.min(50.4, base + dip));
}

function updateCoolingState(state: SimState, dtSec: number): SimState {
  const next = { ...state };
  const discharging = next.powerMw > 0;
  const coolingDispatch = discharging ? Math.min(next.coolingFlexMw, next.baselineLoadMw * 0.12) : 0;

  if (coolingDispatch > 0) {
    next.coolingSaturationPct = Math.min(100, next.coolingSaturationPct + (dtSec / 90) * 100);
    next.inletTempC = Math.min(next.maxInletTempC + 2, next.inletTempC + dtSec * 0.012);
    if (next.coolingSaturationPct >= 100 || next.inletTempC > next.maxInletTempC) {
      next.coolingRecoveryUntilSec = next.timeSeconds + 1800;
    }
  } else {
    const recovering = !next.coolingRecoveryUntilSec || next.timeSeconds >= next.coolingRecoveryUntilSec;
    if (recovering) {
      next.coolingSaturationPct = Math.max(0, next.coolingSaturationPct - (dtSec / 600) * 100);
      next.inletTempC = Math.max(22.5, next.inletTempC - dtSec * 0.008);
      if (next.coolingSaturationPct === 0) {
        next.coolingRecoveryUntilSec = null;
      }
    }
  }
  return next;
}

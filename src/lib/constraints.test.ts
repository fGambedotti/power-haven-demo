import { describe, expect, it } from "vitest";
import { enforceReserve, initState, isFailSafe, tickState } from "./simEngine";

describe("constraints", () => {
  it("never lets SoC drop below reserve", () => {
    const state = initState({ datacentreId: "DC-01", batteryMw: 50, batteryMwh: 100, baselineLoadMw: 30 });
    state.socPct = 31;
    state.reservePct = 30;
    state.powerMw = 40;

    const result = enforceReserve(state, 60);
    const ticked = tickState({ ...result.state, activeDispatch: null }, 60).state;

    expect(ticked.socPct).toBeGreaterThanOrEqual(30);
  });

  it("curtails when reserve would be violated", () => {
    const state = initState({ datacentreId: "DC-02", batteryMw: 80, batteryMwh: 100, baselineLoadMw: 30 });
    state.socPct = 32;
    state.reservePct = 30;
    state.powerMw = 80;

    const result = enforceReserve(state, 300);
    expect(result.curtailed).toBe(true);
    expect(result.state.powerMw).toBeLessThan(80);
  });

  it("flags fail-safe on load spike threshold breach", () => {
    const state = initState({ datacentreId: "DC-03", batteryMw: 80, batteryMwh: 100, baselineLoadMw: 30 });
    state.loadSpikeMw = 50;
    state.loadSpikeThresholdMw = 45;
    expect(isFailSafe(state)).toBe(true);
  });

  it("flags fail-safe when control link is lost", () => {
    const state = initState({ datacentreId: "DC-04", batteryMw: 80, batteryMwh: 100, baselineLoadMw: 30 });
    state.controlLinkOk = false;
    expect(isFailSafe(state)).toBe(true);
  });

  it("flags fail-safe when ANM constraint is active", () => {
    const state = initState({ datacentreId: "DC-05", batteryMw: 80, batteryMwh: 100, baselineLoadMw: 30 });
    state.anmConstraintActive = true;
    expect(isFailSafe(state)).toBe(true);
  });

  it("SoC is clamped to never exceed 100 during charging", () => {
    const state = initState({ datacentreId: "DC-06", batteryMw: 50, batteryMwh: 100, baselineLoadMw: 30 });
    state.socPct = 99.9;
    state.activeDispatch = {
      eventId: "EV-charge",
      service: "Dynamic Moderation",
      direction: "CHARGE",
      targetMw: 40,
      remainingSec: 600
    };
    const next = tickState(state, 300).state;
    expect(next.socPct).toBeLessThanOrEqual(100);
  });

  it("SoC is clamped to never fall below 0", () => {
    const state = initState({ datacentreId: "DC-07", batteryMw: 100, batteryMwh: 100, baselineLoadMw: 30 });
    state.socPct = 1;
    state.activeDispatch = {
      eventId: "EV-deep",
      service: "Balancing Mechanism",
      direction: "DISCHARGE",
      targetMw: 100,
      remainingSec: 3600
    };
    const next = tickState(state, 3600).state;
    expect(next.socPct).toBeGreaterThanOrEqual(0);
  });

  it("round-trip efficiency causes smaller SoC gain during charge", () => {
    const charge = initState({ datacentreId: "DC-08", batteryMw: 50, batteryMwh: 100, baselineLoadMw: 30 });
    charge.socPct = 50;
    charge.activeDispatch = {
      eventId: "EV-c",
      service: "Dynamic Regulation",
      direction: "CHARGE",
      targetMw: 20,
      remainingSec: 1800
    };
    const chargeNext = tickState(charge, 1800).state;

    const discharge = initState({ datacentreId: "DC-08", batteryMw: 50, batteryMwh: 100, baselineLoadMw: 30 });
    discharge.socPct = 50;
    discharge.activeDispatch = {
      eventId: "EV-d",
      service: "Dynamic Regulation",
      direction: "DISCHARGE",
      targetMw: 20,
      remainingSec: 1800
    };
    const dischargeNext = tickState(discharge, 1800).state;

    const chargeGain = chargeNext.socPct - 50;
    const dischargeDrop = 50 - dischargeNext.socPct;
    expect(chargeGain).toBeLessThan(dischargeDrop);
  });
});

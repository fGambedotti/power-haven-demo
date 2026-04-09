import { describe, expect, it } from "vitest";
import {
  accrueActivationRevenue,
  accrueAvailabilityRevenue,
  applyDispatchRequest,
  computeFlex,
  initState,
  servicePricingFor,
  simulateFrequency,
  tickState
} from "./simEngine";

describe("simEngine", () => {
  it("increments time deterministically", () => {
    const state = initState({ datacentreId: "DC-03", batteryMw: 60, batteryMwh: 120, baselineLoadMw: 25 });
    const next = tickState(state, 5).state;
    expect(next.timeSeconds).toBe(5);
  });

  it("reduces SoC when discharging", () => {
    const state = initState({ datacentreId: "DC-04", batteryMw: 50, batteryMwh: 100, baselineLoadMw: 20 });
    state.activeDispatch = {
      eventId: "EV-1",
      service: "Balancing Mechanism",
      direction: "DISCHARGE",
      targetMw: 40,
      remainingSec: 120
    };
    const next = tickState(state, 60).state;
    expect(next.socPct).toBeLessThan(state.socPct);
  });

  it("ramps power instead of stepping instantly", () => {
    const state = initState({ datacentreId: "DC-05", batteryMw: 50, batteryMwh: 100, baselineLoadMw: 20 });
    state.activeDispatch = {
      eventId: "EV-ramp",
      service: "Dynamic Containment",
      direction: "DISCHARGE",
      targetMw: 40,
      remainingSec: 300
    };
    const next = tickState(state, 1).state;
    expect(next.powerMw).toBeLessThan(5);
    expect(next.powerMw).toBeGreaterThan(0);
  });

  it("accrues availability revenue even with no active dispatch", () => {
    const state = initState({ datacentreId: "DC-06", batteryMw: 20, batteryMwh: 60, baselineLoadMw: 15 });
    const revenue = accrueAvailabilityRevenue(state, 3600);
    expect(revenue).toBeGreaterThan(0);
  });

  it("accrues zero activation revenue when power is zero", () => {
    const state = initState({ datacentreId: "DC-07", batteryMw: 30, batteryMwh: 80, baselineLoadMw: 18 });
    const revenue = accrueActivationRevenue(state, 300);
    expect(revenue).toBe(0);
  });

  it("applies activation revenue when dispatch is active", () => {
    const state = initState({ datacentreId: "DC-08", batteryMw: 30, batteryMwh: 80, baselineLoadMw: 18 });
    state.powerMw = 20;
    state.activeService = "Dynamic Moderation";
    state.activationRateGbpPerMwh = 24;
    const revenue = accrueActivationRevenue(state, 3600);
    expect(revenue).toBeCloseTo(480, 3);
  });

  it("computeFlex returns zero in fail-safe mode", () => {
    const state = initState({ datacentreId: "DC-09", batteryMw: 30, batteryMwh: 80, baselineLoadMw: 18 });
    state.gridStatus = "FAILED";
    const flex = computeFlex(state);
    expect(flex.availableFlexMw).toBe(0);
    expect(flex.reservedBackupPct).toBe(100);
  });

  it("computeFlex respects flexibilityIndex bounds", () => {
    const state = initState({ datacentreId: "DC-10", batteryMw: 30, batteryMwh: 80, baselineLoadMw: 18 });
    state.socPct = 90;
    state.reservePct = 20;
    state.flexibilityIndex = 0.01;
    const low = computeFlex(state).availableFlexMw;
    state.flexibilityIndex = 2;
    const high = computeFlex(state).availableFlexMw;
    expect(low).toBeGreaterThan(0);
    expect(high).toBeLessThanOrEqual(state.batteryMw + state.coolingFlexMw);
  });

  it("frequency simulator stays within safe demo bounds", () => {
    for (let t = 0; t < 360; t += 5) {
      const hz = simulateFrequency(t);
      expect(hz).toBeGreaterThanOrEqual(49.4);
      expect(hz).toBeLessThanOrEqual(50.4);
    }
  });

  it("service pricing exposes DM and DR entries", () => {
    expect(servicePricingFor("Dynamic Moderation").availabilityGbpPerMwH).toBeGreaterThan(0);
    expect(servicePricingFor("Dynamic Regulation").activationGbpPerMwh).toBeGreaterThan(0);
  });

  it("blocks dispatch when in fail-safe", () => {
    const state = initState({ datacentreId: "DC-11", batteryMw: 30, batteryMwh: 80, baselineLoadMw: 18 });
    state.controlLinkOk = false;
    const result = applyDispatchRequest(
      state,
      { service: "Dynamic Containment", direction: "DISCHARGE", targetMw: 10, durationSec: 30 },
      "EV-block"
    );
    expect(result.event.status).toBe("REJECTED");
  });

  it("enables dispatch when conditions are healthy", () => {
    const state = initState({ datacentreId: "DC-12", batteryMw: 30, batteryMwh: 80, baselineLoadMw: 18 });
    const result = applyDispatchRequest(
      state,
      { service: "Dynamic Regulation", direction: "DISCHARGE", targetMw: 10, durationSec: 30 },
      "EV-ok"
    );
    expect(result.event.status).toBe("EXECUTED");
    expect(result.state.activeDispatch?.targetMw).toBe(10);
  });

  it("failsafe tick clears active dispatch", () => {
    const state = initState({ datacentreId: "DC-13", batteryMw: 30, batteryMwh: 80, baselineLoadMw: 18 });
    state.activeDispatch = {
      eventId: "EV-live",
      service: "FFR",
      direction: "DISCHARGE",
      targetMw: 15,
      remainingSec: 60
    };
    state.gridStatus = "FAILED";
    const next = tickState(state, 1).state;
    expect(next.failSafeMode).toBe(true);
    expect(next.activeDispatch).toBeNull();
  });

  it("degrades effective battery capacity with throughput", () => {
    const state = initState({ datacentreId: "DC-14", batteryMw: 40, batteryMwh: 100, baselineLoadMw: 20 });
    state.activeDispatch = {
      eventId: "EV-deg",
      service: "Balancing Mechanism",
      direction: "DISCHARGE",
      targetMw: 40,
      remainingSec: 7200
    };
    let current = state;
    for (let i = 0; i < 120; i += 1) {
      current = tickState(current, 60).state;
    }
    expect(current.effectiveBatteryMwh).toBeLessThanOrEqual(state.batteryMwh);
    expect(current.effectiveBatteryMwh).toBeGreaterThanOrEqual(state.batteryMwh * 0.8);
  });
});

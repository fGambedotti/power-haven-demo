import { describe, expect, it } from "vitest";
import { enforceReserve, initState, tickState } from "./simEngine";

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
});

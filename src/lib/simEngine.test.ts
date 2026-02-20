import { describe, expect, it } from "vitest";
import { initState, tickState } from "./simEngine";

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
});

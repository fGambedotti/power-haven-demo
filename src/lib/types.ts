export type GridStatus = "OK" | "FAILED";
export type DispatchDirection = "DISCHARGE" | "CHARGE";
export type DispatchService = "Dynamic Containment" | "Balancing Mechanism";

export interface DispatchEvent {
  id: string;
  timestamp: string;
  datacentreId: string;
  service: DispatchService;
  direction: DispatchDirection;
  targetMw: number;
  durationSec: number;
  status: "EXECUTED" | "CURTAILED" | "REJECTED" | "ABORTED";
  curtailedReason?: string;
}

export interface ActiveDispatch {
  eventId: string;
  service: DispatchService;
  direction: DispatchDirection;
  targetMw: number;
  remainingSec: number;
}

export interface SimState {
  timeSeconds: number;
  selectedDatacentreId: string | null;
  batteryMw: number;
  batteryMwh: number;
  baselineLoadMw: number;
  socPct: number;
  reservePct: number;
  powerMw: number;
  gridStatus: GridStatus;
  controlLinkOk: boolean;
  loadSpikeMw: number;
  loadSpikeThresholdMw: number;
  autoDispatch: boolean;
  activeDispatch: ActiveDispatch | null;
  activeService: DispatchService | null;
  todayRevenue: number;
  dispatchAllowed: boolean;
  failSafeMode: boolean;
}

export interface DispatchRequest {
  service: DispatchService;
  direction: DispatchDirection;
  targetMw: number;
  durationSec: number;
}

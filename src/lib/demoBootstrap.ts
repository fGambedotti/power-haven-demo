import type { GridStatus, SimState } from "./types";

export type DashboardTab = "Datacentre" | "Dispatch" | "Settings";

export interface DashboardSceneBootstrap {
  selectedDatacentreId: string;
  activeTab: DashboardTab;
  settings: Partial<Pick<SimState, "gridStatus" | "controlLinkOk" | "autoDispatch" | "reservePct">>;
  autoTriggerDispatch?: boolean;
}

const DASHBOARD_SCENE_BOOTSTRAPS: Record<string, DashboardSceneBootstrap> = {
  "dispatch-grid-stress": {
    selectedDatacentreId: "DC-17",
    activeTab: "Dispatch",
    settings: {
      gridStatus: "OK",
      controlLinkOk: true,
      autoDispatch: false,
      reservePct: 25
    },
    autoTriggerDispatch: true
  },
  "dispatch-failsafe": {
    selectedDatacentreId: "DC-18",
    activeTab: "Dispatch",
    settings: {
      gridStatus: "FAILED",
      controlLinkOk: false,
      autoDispatch: false,
      reservePct: 30
    },
    autoTriggerDispatch: false
  },
  "dispatch-standby": {
    selectedDatacentreId: "DC-13",
    activeTab: "Datacentre",
    settings: {
      gridStatus: "OK",
      controlLinkOk: true,
      autoDispatch: false,
      reservePct: 25
    },
    autoTriggerDispatch: false
  }
};

export function getDashboardSceneBootstrap(sceneId: string | null | undefined): DashboardSceneBootstrap | null {
  if (!sceneId) return null;
  return DASHBOARD_SCENE_BOOTSTRAPS[sceneId] ?? null;
}

export function applyDashboardBootstrapSettings(
  apply: <K extends keyof SimState>(key: K, value: SimState[K]) => void,
  settings: DashboardSceneBootstrap["settings"]
) {
  const entries = Object.entries(settings) as Array<[keyof DashboardSceneBootstrap["settings"], GridStatus | boolean | number]>;
  for (const [key, value] of entries) {
    if (value === undefined) continue;
    apply(key as keyof SimState, value as SimState[keyof SimState]);
  }
}

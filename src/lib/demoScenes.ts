export type DemoSceneId =
  | "observe_shadow_mode"
  | "rank_portfolio"
  | "execute_dispatch"
  | "prove_value"
  | "counterfactual_roi";

export interface DemoSceneSpec {
  id: DemoSceneId;
  shortId: string;
  title: string;
  route: string;
  durationSec: number;
  objective: string;
  talkTrack: string;
}

export const DEMO_SCENES: DemoSceneSpec[] = [
  {
    id: "observe_shadow_mode",
    shortId: "shadow",
    title: "Observe Demand (Shadow Mode)",
    route: "/shadow-mode?preset=observe-london",
    durationSec: 45,
    objective: "Show non-invasive monitoring, forecast confidence, and detected flex windows.",
    talkTrack: "We start read-only. VoltPilot learns demand and pre-notifies flexible windows before any control integration."
  },
  {
    id: "rank_portfolio",
    shortId: "portfolio",
    title: "Rank Portfolio Readiness",
    route: "/portfolio?preset=top-candidates",
    durationSec: 40,
    objective: "Show aggregator prioritization across sites.",
    talkTrack: "The portfolio engine ranks sites by forecasted headroom, reserve policy, and confidence."
  },
  {
    id: "execute_dispatch",
    shortId: "dispatch",
    title: "Execute Safe Dispatch",
    route: "/?demoScene=dispatch-grid-stress",
    durationSec: 50,
    objective: "Trigger NESO dispatch and show safety constraints and fail-safe behavior.",
    talkTrack: "Dispatch is allowed only if reserve, control-link, and load constraints all pass."
  },
  {
    id: "prove_value",
    shortId: "proof",
    title: "Prove Value and Reporting",
    route: "/revenue?preset=investor-proof",
    durationSec: 35,
    objective: "Show value capture, service mix, and reporting outputs.",
    talkTrack: "Commercial and operations stakeholders get clear, exportable performance evidence."
  },
  {
    id: "counterfactual_roi",
    shortId: "roi",
    title: "Counterfactual Economics",
    route: "/roi-studio?preset=tier2-colo",
    durationSec: 45,
    objective: "Quantify with-vs-without VoltPilot outcomes.",
    talkTrack: "This converts technical capability into an investment case and pilot scope discussion."
  }
];

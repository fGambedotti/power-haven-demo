"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AssumptionsPanel, PageHero, StatTile } from "../../components/ProductUI";
import { useAudienceMode } from "../../components/AudienceMode";

type IntegrationMode = "Dedicated battery" | "Shared UPS";
type ServiceCode = "DC" | "DM" | "DR" | "DFS";

interface ServiceSpec {
  code: ServiceCode;
  name: string;
  pricePerMwh: number;
  utilizationHours: number;
  minMw: number;
  response: string;
  availability: string;
}

const SERVICE_SPECS: ServiceSpec[] = [
  { code: "DC", name: "Dynamic Containment", pricePerMwh: 58, utilizationHours: 280, minMw: 1, response: "<1s", availability: "EFA 4h blocks" },
  { code: "DM", name: "Dynamic Moderation", pricePerMwh: 42, utilizationHours: 240, minMw: 1, response: "1-2s", availability: "EFA 4h blocks" },
  { code: "DR", name: "Dynamic Regulation", pricePerMwh: 36, utilizationHours: 220, minMw: 1, response: "2-10s", availability: "EFA 4h blocks" },
  { code: "DFS", name: "Demand Flexibility Service", pricePerMwh: 740, utilizationHours: 18, minMw: 1, response: "Event-based", availability: "Scarcity events" }
];

export default function RoiStudioPage() {
  const { mode } = useAudienceMode();
  const [batteryMw, setBatteryMw] = useState(20);
  const [batteryMwh, setBatteryMwh] = useState(80);
  const [reservePct, setReservePct] = useState(30);
  const [sites, setSites] = useState(4);
  const [degradationPct, setDegradationPct] = useState(2);
  const [integrationMode, setIntegrationMode] = useState<IntegrationMode>("Dedicated battery");
  const [serviceSelection, setServiceSelection] = useState<ServiceCode>("DC");
  const [stackServices, setStackServices] = useState(true);
  const [connectionOfferYear, setConnectionOfferYear] = useState(2028);
  const [anmAccelerationMonths, setAnmAccelerationMonths] = useState(12);
  const [anmEligibilityPct, setAnmEligibilityPct] = useState(60);
  const [deferredValuePerMonthM, setDeferredValuePerMonthM] = useState(1.6);

  const model = useMemo(() => {
    const reserveFactor = Math.max(0, 1 - reservePct / 100);
    const integrationFactor = integrationMode === "Dedicated battery" ? 1 : 0.88;
    const degradationFactor = Math.max(0.75, 1 - degradationPct / 100);

    const usableMwPerSite = batteryMw * reserveFactor * integrationFactor;
    const usableMwhPerSite = batteryMwh * reserveFactor * integrationFactor;

    const revenuesByService = SERVICE_SPECS.map((spec) => {
      const eligible = usableMwPerSite >= spec.minMw;
      const annual = eligible
        ? usableMwPerSite * spec.pricePerMwh * spec.utilizationHours * sites * degradationFactor
        : 0;
      return {
        ...spec,
        eligible,
        annualRevenue: round(annual)
      };
    });

    const selectedRevenue = revenuesByService.find((s) => s.code === serviceSelection)?.annualRevenue ?? 0;
    const stackedRevenue = revenuesByService.reduce((sum, row) => sum + row.annualRevenue, 0);
    const grossRevenueWithVoltPilot = stackServices ? stackedRevenue : selectedRevenue;

    const annualRevenueNoVoltPilot = 0;
    const softwareFee = grossRevenueWithVoltPilot * 0.18;
    const netRevenueWith = grossRevenueWithVoltPilot - softwareFee;

    const connectionDelayMonths = Math.max(0, (connectionOfferYear - 2026) * 12);
    const expectedAccelerationMonths = Math.min(connectionDelayMonths, anmAccelerationMonths) * (anmEligibilityPct / 100);
    const connectionValue = expectedAccelerationMonths * deferredValuePerMonthM * 1_000_000;

    const capexEstimate = batteryMwh * 1000 * 220 * sites;
    const totalAnnualBenefit = netRevenueWith + connectionValue;
    const paybackYearsWith = totalAnnualBenefit > 0 ? capexEstimate / totalAnnualBenefit : Infinity;

    return {
      usableMwPerSite: round(usableMwPerSite),
      usableMwhPerSite: round(usableMwhPerSite),
      annualRevenueNoVoltPilot: round(annualRevenueNoVoltPilot),
      grossRevenueWithVoltPilot: round(grossRevenueWithVoltPilot),
      netRevenueWith: round(netRevenueWith),
      connectionDelayMonths,
      expectedAccelerationMonths: round(expectedAccelerationMonths),
      connectionValue: round(connectionValue),
      capexEstimate: round(capexEstimate),
      paybackYearsWith: Number.isFinite(paybackYearsWith) ? round(paybackYearsWith) : null,
      revenuesByService
    };
  }, [batteryMw, batteryMwh, reservePct, sites, degradationPct, integrationMode, serviceSelection, stackServices, connectionOfferYear, anmAccelerationMonths, anmEligibilityPct, deferredValuePerMonthM]);

  const comparisonData = [
    { metric: "Flex revenue", without: model.annualRevenueNoVoltPilot, with: model.netRevenueWith },
    { metric: "Connection value", without: 0, with: model.connectionValue },
    { metric: "Annual benefit", without: 0, with: model.netRevenueWith + model.connectionValue }
  ];

  const modeDescription =
    mode === "Investor"
      ? "Investor view: compare portfolio economics and acceleration upside with vs without VoltPilot."
      : mode === "Operator"
        ? "Operator view: focus on payback period, uptime-safe reserve policy, and connection delay value."
        : "Technical view: inspect service eligibility thresholds, response expectations, and modeling assumptions.";

  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHero
        eyebrow="Economics"
        title="ROI Studio: with vs without VoltPilot"
        description={modeDescription}
      />

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
        <div className="panel space-y-5 p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Battery configuration</p>
          <Slider label="Battery power per site" value={batteryMw} min={1} max={60} suffix="MW" onChange={setBatteryMw} />
          <Slider label="Battery storage per site" value={batteryMwh} min={2} max={300} suffix="MWh" onChange={setBatteryMwh} />
          <Slider label="Reserve policy" value={reservePct} min={10} max={70} suffix="%" onChange={setReservePct} />
          <Slider label="Degradation rate" value={degradationPct} min={0} max={8} suffix="%/year" onChange={setDegradationPct} />
          <Slider label="Portfolio size" value={sites} min={1} max={25} suffix="sites" onChange={setSites} />

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">UPS integration mode</p>
            <div className="grid grid-cols-2 gap-2">
              {["Dedicated battery", "Shared UPS"].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setIntegrationMode(option as IntegrationMode)}
                  className={integrationMode === option ? "rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white" : "rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Connection acceleration</p>
            <Slider label="Current connection offer year" value={connectionOfferYear} min={2026} max={2032} suffix="" onChange={setConnectionOfferYear} />
            <Slider label="Potential ANM acceleration" value={anmAccelerationMonths} min={0} max={24} suffix="months" onChange={setAnmAccelerationMonths} />
            <Slider label="ANM eligibility probability" value={anmEligibilityPct} min={0} max={100} suffix="%" onChange={setAnmEligibilityPct} />
            <Slider label="Deferred value per month" value={deferredValuePerMonthM} min={0.2} max={5} step={0.1} suffix="£M" onChange={setDeferredValuePerMonthM} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Usable flex/site" value={`${model.usableMwPerSite} MW`} note={`${model.usableMwhPerSite} MWh usable`} />
            <StatTile label="Net flex revenue" value={money(model.netRevenueWith)} note={stackServices ? "Stacked services" : `Single service ${serviceSelection}`} />
            <StatTile label="Connection value" value={money(model.connectionValue)} note={`${model.expectedAccelerationMonths} expected months accelerated`} />
            <StatTile label="Payback (with VoltPilot)" value={model.paybackYearsWith ? `${model.paybackYearsWith} years` : "N/A"} note="Includes connection value" />
          </div>

          <div className="panel p-5 sm:p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Market service selector</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {SERVICE_SPECS.map((spec) => (
                <button
                  key={spec.code}
                  type="button"
                  onClick={() => setServiceSelection(spec.code)}
                  className={serviceSelection === spec.code ? "rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white" : "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"}
                >
                  {spec.code}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setStackServices((v) => !v)}
                className={stackServices ? "rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white" : "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"}
              >
                {stackServices ? "Revenue stacking: ON" : "Revenue stacking: OFF"}
              </button>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Service</th>
                    <th className="px-3 py-2 text-right">Price (£/MWh)</th>
                    <th className="px-3 py-2 text-right">Min MW</th>
                    <th className="px-3 py-2 text-left">Response</th>
                    <th className="px-3 py-2 text-left">Availability</th>
                    <th className="px-3 py-2 text-right">Projected annual (£)</th>
                  </tr>
                </thead>
                <tbody>
                  {model.revenuesByService.map((row) => (
                    <tr key={row.code} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-semibold text-slate-800">{row.name}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{row.pricePerMwh}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{row.minMw}</td>
                      <td className="px-3 py-2 text-slate-700">{row.response}</td>
                      <td className="px-3 py-2 text-slate-700">{row.availability}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-800">{row.eligible ? money(row.annualRevenue) : "Ineligible"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel p-5 sm:p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Without vs with VoltPilot</p>
            <p className="mt-1 text-sm text-slate-600">Includes both flexibility revenue and connection acceleration value.</p>
            <div className="mt-4 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbe3ef" />
                  <XAxis dataKey="metric" tick={{ fill: "#64748b", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                  <Tooltip formatter={(v) => Number(v).toLocaleString("en-GB")} />
                  <Bar dataKey="without" fill="#94a3b8" name="Without VoltPilot" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="with" fill="#0284c7" name="With VoltPilot" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <OutcomeCard
                title="Without VoltPilot"
                tone="muted"
                bullets={[
                  `Flex revenue: ${money(model.annualRevenueNoVoltPilot)}`,
                  `Connection still delayed ~${model.connectionDelayMonths} months`,
                  "No orchestration layer for service participation",
                  "No integrated safety and audit reporting stack"
                ]}
              />
              <OutcomeCard
                title="With VoltPilot"
                tone="accent"
                bullets={[
                  `Net flex revenue: ${money(model.netRevenueWith)}`,
                  `Expected connection value unlocked: ${money(model.connectionValue)}`,
                  `Total annual upside: ${money(model.netRevenueWith + model.connectionValue)}`,
                  `Estimated payback: ${model.paybackYearsWith ? `${model.paybackYearsWith} years` : "N/A"}`
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      <AssumptionsPanel
        items={[
          "Service prices and utilization are illustrative demo inputs (not live settlement data).",
          "ANM acceleration and eligibility are modeled assumptions and should be replaced with DNO-specific assessments.",
          "Capex estimate assumes £220/kWh equivalent installed cost and excludes financing/tax effects.",
          "This page is a decision-support simulation and not an investment advice tool."
        ]}
      />
    </main>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
  step = 1
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold text-slate-900">{value} {suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-blue-600" />
    </div>
  );
}

function OutcomeCard({ title, bullets, tone }: { title: string; bullets: string[]; tone: "muted" | "accent" }) {
  return (
    <div className={`rounded-xl border p-4 ${tone === "accent" ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50"}`}>
      <p className="font-display text-lg font-semibold text-slate-900">{title}</p>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        {bullets.map((b) => (
          <li key={b} className="rounded-lg border border-white/70 bg-white/70 px-3 py-2">{b}</li>
        ))}
      </ul>
    </div>
  );
}

function money(v: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(v);
}

function round(v: number) {
  return Math.round(v * 10) / 10;
}

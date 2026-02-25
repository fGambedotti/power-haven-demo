"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHero, StatTile } from "../../components/ProductUI";
import RoleLens from "../../components/RoleLens";

export default function RoiStudioPage() {
  const [batteryMw, setBatteryMw] = useState(20);
  const [batteryMwh, setBatteryMwh] = useState(80);
  const [reservePct, setReservePct] = useState(30);
  const [sites, setSites] = useState(4);
  const [servicePrice, setServicePrice] = useState(55);
  const [utilizationHours, setUtilizationHours] = useState(320);

  const model = useMemo(() => {
    const usableMwPerSite = batteryMw * (1 - reservePct / 100) * 0.72;
    const usableMwhPerSite = batteryMwh * (1 - reservePct / 100) * 0.8;
    const annualRevenueNoVoltPilot = 0;
    const annualRevenueWithVoltPilot = usableMwPerSite * servicePrice * utilizationHours * sites;
    const dispatchSuccessRateNo = 0;
    const dispatchSuccessRateWith = 92;
    const reserveViolationRiskNo = 14;
    const reserveViolationRiskWith = 1;
    const curtailmentAbsorptionMwh = usableMwhPerSite * 42 * sites;
    const co2AvoidedTons = curtailmentAbsorptionMwh * 0.2;
    const softwareFee = annualRevenueWithVoltPilot * 0.18;
    const netRevenueWith = annualRevenueWithVoltPilot - softwareFee;
    return {
      usableMwPerSite: round(usableMwPerSite),
      usableMwhPerSite: round(usableMwhPerSite),
      annualRevenueNoVoltPilot: round(annualRevenueNoVoltPilot),
      annualRevenueWithVoltPilot: round(annualRevenueWithVoltPilot),
      netRevenueWith: round(netRevenueWith),
      dispatchSuccessRateNo,
      dispatchSuccessRateWith,
      reserveViolationRiskNo,
      reserveViolationRiskWith,
      curtailmentAbsorptionMwh: round(curtailmentAbsorptionMwh),
      co2AvoidedTons: round(co2AvoidedTons)
    };
  }, [batteryMw, batteryMwh, reservePct, sites, servicePrice, utilizationHours]);

  const comparisonData = [
    { metric: "Gross Revenue", without: model.annualRevenueNoVoltPilot, with: model.annualRevenueWithVoltPilot },
    { metric: "Net Revenue", without: 0, with: model.netRevenueWith },
    { metric: "Curtailment MWh", without: 0, with: model.curtailmentAbsorptionMwh },
    { metric: "CO2 Avoided (t)", without: 0, with: model.co2AvoidedTons }
  ];

  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHero
        eyebrow="ROI Studio"
        title="With vs without VoltPilot economics"
        description="Configure a representative datacentre portfolio and compare economic outcomes with idle backup assets versus a managed flexibility participation model."
      />

      <RoleLens context="roi" />

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
        <div className="panel p-5 sm:p-6 space-y-5">
          <Slider label="Battery power per site" value={batteryMw} min={5} max={60} suffix="MW" onChange={setBatteryMw} />
          <Slider label="Battery storage per site" value={batteryMwh} min={10} max={300} suffix="MWh" onChange={setBatteryMwh} />
          <Slider label="Reserve policy" value={reservePct} min={10} max={70} suffix="%" onChange={setReservePct} />
          <Slider label="Portfolio size" value={sites} min={1} max={25} suffix="sites" onChange={setSites} />
          <Slider label="Service price" value={servicePrice} min={20} max={120} suffix="£/MW/h" onChange={setServicePrice} />
          <Slider label="Annual utilization" value={utilizationHours} min={50} max={800} suffix="h" onChange={setUtilizationHours} />
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Usable flex/site" value={`${model.usableMwPerSite} MW`} note={`${model.usableMwhPerSite} MWh usable`} />
            <StatTile label="Gross revenue" value={money(model.annualRevenueWithVoltPilot)} note="With VoltPilot" />
            <StatTile label="Net revenue" value={money(model.netRevenueWith)} note="After illustrative fee" />
            <StatTile label="CO2 avoided" value={`${model.co2AvoidedTons} t`} note="Illustrative estimate" />
          </div>

          <div className="panel p-5 sm:p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Counterfactual comparison</p>
            <p className="mt-1 text-sm text-slate-600">Demonstrates asset monetization and reporting uplift relative to unmanaged backup assets.</p>
            <div className="mt-4 h-[320px]">
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
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <OutcomeCard
              title="Without VoltPilot"
              tone="muted"
              bullets={[
                `Revenue: ${money(model.annualRevenueNoVoltPilot)}`,
                `Dispatch success: ${model.dispatchSuccessRateNo}% (no orchestration)`,
                `Reserve violation risk exposure: ${model.reserveViolationRiskNo}%`,
                "No audit-ready compliance reporting"
              ]}
            />
            <OutcomeCard
              title="With VoltPilot"
              tone="accent"
              bullets={[
                `Revenue: ${money(model.netRevenueWith)} net (illustrative)`,
                `Dispatch success: ${model.dispatchSuccessRateWith}%`,
                `Reserve violation risk exposure: ${model.reserveViolationRiskWith}%`,
                "Forecasting, dispatch logic, and reporting layer enabled"
              ]}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  suffix,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold text-slate-900">{value} {suffix}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-blue-600" />
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

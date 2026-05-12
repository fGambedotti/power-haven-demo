#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const siteProfiles = [
  {
    id: 'urban_colocation',
    label: 'Urban Colocation',
    description: 'Multi-tenant site, moderate critical load and strong tariff sensitivity.',
    averageLoadMw: 28,
    loadVariability: 0.08,
    pue: 1.34,
    baselineRenewableMixPct: 43,
    localBillSensitivity: 0.92,
    flexibilityAccess: 0.88,
    confidenceOffset: 2
  },
  {
    id: 'hyperscale_campus',
    label: 'Hyperscale Campus',
    description: 'Large campus with deeper battery capacity and better market access.',
    averageLoadMw: 92,
    loadVariability: 0.06,
    pue: 1.22,
    baselineRenewableMixPct: 45,
    localBillSensitivity: 1.05,
    flexibilityAccess: 1.1,
    confidenceOffset: 1
  },
  {
    id: 'regional_edge',
    label: 'Regional Edge Cluster',
    description: 'Distributed regional estate with smaller operating windows.',
    averageLoadMw: 18,
    loadVariability: 0.11,
    pue: 1.42,
    baselineRenewableMixPct: 41,
    localBillSensitivity: 0.86,
    flexibilityAccess: 0.78,
    confidenceOffset: -1
  },
  {
    id: 'ai_compute_hub',
    label: 'AI Compute Hub',
    description: 'High-density AI load with large peak exposure and high flexibility value.',
    averageLoadMw: 124,
    loadVariability: 0.14,
    pue: 1.28,
    baselineRenewableMixPct: 42,
    localBillSensitivity: 1.18,
    flexibilityAccess: 1.22,
    confidenceOffset: -1
  }
];

const batteryBands = [
  { id: 'small_10_20', label: '10 MW / 20 MWh', description: 'Small on-site UPS battery envelope.', batteryMw: 10, batteryMwh: 20 },
  { id: 'medium_20_40', label: '20 MW / 40 MWh', description: 'Typical medium datacentre battery estate.', batteryMw: 20, batteryMwh: 40 },
  { id: 'large_40_80', label: '40 MW / 80 MWh', description: 'Large flexibility-ready battery estate.', batteryMw: 40, batteryMwh: 80 },
  { id: 'xlarge_60_120', label: '60 MW / 120 MWh', description: 'Expanded campus battery envelope.', batteryMw: 60, batteryMwh: 120 },
  { id: 'mega_80_160', label: '80 MW / 160 MWh', description: 'Portfolio-scale single-campus battery envelope.', batteryMw: 80, batteryMwh: 160 }
];

const reservePolicies = [
  { id: 'conservative_30', label: 'Conservative (30% reserve)', reservePct: 30, uptimePct: 99.999, confidenceOffset: 4, dispatchGuard: 0.82 },
  { id: 'balanced_25', label: 'Balanced (25% reserve)', reservePct: 25, uptimePct: 99.995, confidenceOffset: 2, dispatchGuard: 0.94 },
  { id: 'dynamic_20', label: 'Dynamic (20% reserve)', reservePct: 20, uptimePct: 99.99, confidenceOffset: -1, dispatchGuard: 1.04 }
];

const automationModes = [
  { id: 'advisory', label: 'Advisory Dispatch', description: 'Operator confirms execution windows.', participation: 0.78, marketAccess: 0.72, confidenceOffset: 2, modeNarrative: 'operator-approved schedules' },
  { id: 'autopilot', label: 'Autopilot Dispatch', description: 'System executes the approved strategy automatically.', participation: 0.96, marketAccess: 0.94, confidenceOffset: 0, modeNarrative: 'automated dispatch within approved guardrails' }
];

const marketConditions = [
  { id: 'steady', label: 'Steady historic profile', priceBase: 72, eveningPeak: 38, noonDip: 18, flexBase: 34, carbonBase: 172, volatility: 0.82, confidenceOffset: 3 },
  { id: 'volatile', label: 'Volatile historic profile', priceBase: 84, eveningPeak: 76, noonDip: 34, flexBase: 52, carbonBase: 188, volatility: 1.12, confidenceOffset: 0 },
  { id: 'stress_peak', label: 'Peak stress historic profile', priceBase: 96, eveningPeak: 118, noonDip: 42, flexBase: 66, carbonBase: 214, volatility: 1.32, confidenceOffset: -2 }
];

const renewableAlignment = [
  { id: 'moderate_alignment', label: 'Moderate renewable alignment', renewableWeight: 0.78, carbonWeight: 0.82, priceWeight: 0.72, chargeHours: 4, dischargeHours: 3, chargeWindow: '08:00-13:00', dischargeWindow: '17:30-21:00' },
  { id: 'high_alignment', label: 'High renewable alignment', renewableWeight: 1.0, carbonWeight: 1.0, priceWeight: 0.88, chargeHours: 5, dischargeHours: 4, chargeWindow: '07:00-13:00', dischargeWindow: '17:00-21:00' },
  { id: 'very_high_alignment', label: 'Very high renewable alignment', renewableWeight: 1.15, carbonWeight: 1.18, priceWeight: 0.96, chargeHours: 6, dischargeHours: 5, chargeWindow: '06:30-13:30', dischargeWindow: '16:30-21:30' }
];

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthWeights = [0.092, 0.086, 0.084, 0.078, 0.075, 0.074, 0.073, 0.075, 0.08, 0.086, 0.094, 0.103];

const historicEvidence = {
  period: '2024-2025 representative GB market conditions',
  sourceBasis: [
    'Elexon/BMRS-style half-hourly price and balancing-market structure',
    'Carbon-intensity-style half-hourly emissions profile',
    'Public curtailment and turn-up evidence from GB renewable constraint reporting',
    'Representative datacentre battery envelopes for public demonstration only'
  ],
  curtailmentTwh2025: 10.2,
  constraintCostGbp2025: 1000000000,
  notes: 'This static dataset is a preprocessed demonstration layer. A site assessment would replace representative profiles with site meter data and audited market feeds.'
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 0) {
  const scale = Math.pow(10, digits);
  return Math.round(value * scale) / scale;
}

function pounds(value) {
  return Math.round(value);
}

function gaussian(hour, centre, width) {
  return Math.exp(-Math.pow(hour - centre, 2) / (2 * Math.pow(width, 2)));
}

function scenarioKey(parts) {
  return [
    parts.siteProfileId,
    parts.batteryBandId,
    parts.reservePolicyId,
    parts.automationModeId,
    parts.marketConditionId,
    parts.renewableAlignmentId
  ].join('|');
}

function buildHistoricProfile(market) {
  return Array.from({ length: 24 }, (_, hour) => {
    const solarShape = gaussian(hour, 12, 3.4);
    const windShape = 0.46 + 0.22 * Math.sin(((hour + 2) / 24) * Math.PI * 2);
    const renewableShare = clamp(0.31 + solarShape * 0.34 + windShape * 0.2 - gaussian(hour, 19, 2.4) * 0.12, 0.22, 0.86);
    const demandIndex = clamp(0.82 + gaussian(hour, 8, 2.4) * 0.14 + gaussian(hour, 18.5, 2.8) * 0.28 - gaussian(hour, 3, 3) * 0.12, 0.68, 1.22);
    const curtailmentSignal = clamp(gaussian(hour, 10.8, 2.5) * (0.64 + market.volatility * 0.18), 0, 1);
    const price = Math.max(
      -12,
      market.priceBase +
        gaussian(hour, 18.5, 2.3) * market.eveningPeak +
        gaussian(hour, 7.5, 2.1) * market.eveningPeak * 0.28 -
        gaussian(hour, 11.2, 2.9) * market.noonDip -
        renewableShare * 18
    );
    const carbonKgPerMwh = clamp(
      market.carbonBase + demandIndex * 54 + gaussian(hour, 19, 2.2) * 62 - renewableShare * 122,
      34,
      390
    );
    const fossilShare = clamp(0.14 + demandIndex * 0.31 + gaussian(hour, 19, 2.2) * 0.18 - renewableShare * 0.34, 0.08, 0.72);
    const flexPrice = market.flexBase + gaussian(hour, 18.5, 2.2) * market.flexBase * 0.9 + curtailmentSignal * market.flexBase * 0.22;

    return {
      hour,
      priceGbpPerMwh: round(price, 2),
      carbonKgPerMwh: round(carbonKgPerMwh, 1),
      renewableSharePct: round(renewableShare * 100, 1),
      fossilSharePct: round(fossilShare * 100, 1),
      demandIndex: round(demandIndex, 3),
      curtailmentSignal: round(curtailmentSignal, 3),
      flexPriceGbpPerMwh: round(flexPrice, 2)
    };
  });
}

function topHours(profile, scoreFn, count) {
  return profile
    .map((point) => ({ hour: point.hour, score: scoreFn(point) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((point) => point.hour)
    .sort((a, b) => a - b);
}

function average(items, getter) {
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + getter(item), 0) / items.length;
}

function simulateScenario(site, battery, reserve, auto, market, alignment) {
  const profile = buildHistoricProfile(market);
  const reserveEnergyMwh = battery.batteryMwh * (reserve.reservePct / 100);
  const usableBatteryMwh = Math.max(0, battery.batteryMwh - reserveEnergyMwh);
  const roundTripEfficiency = 0.9;
  const dispatchEnergyMwh = Math.min(
    usableBatteryMwh * reserve.dispatchGuard * auto.participation,
    battery.batteryMw * Math.max(alignment.dischargeHours, 1) * 0.74
  );
  const chargeEnergyMwh = dispatchEnergyMwh / roundTripEfficiency;

  const minPrice = Math.min(...profile.map((p) => p.priceGbpPerMwh));
  const maxPrice = Math.max(...profile.map((p) => p.priceGbpPerMwh));
  const minCarbon = Math.min(...profile.map((p) => p.carbonKgPerMwh));
  const maxCarbon = Math.max(...profile.map((p) => p.carbonKgPerMwh));

  const chargeHours = topHours(
    profile,
    (p) =>
      ((maxPrice - p.priceGbpPerMwh) / Math.max(1, maxPrice - minPrice)) * alignment.priceWeight +
      ((maxCarbon - p.carbonKgPerMwh) / Math.max(1, maxCarbon - minCarbon)) * alignment.carbonWeight +
      (p.renewableSharePct / 100) * alignment.renewableWeight +
      p.curtailmentSignal * 0.84,
    alignment.chargeHours
  );

  const dischargeHours = topHours(
    profile,
    (p) =>
      ((p.priceGbpPerMwh - minPrice) / Math.max(1, maxPrice - minPrice)) * 0.86 +
      ((p.carbonKgPerMwh - minCarbon) / Math.max(1, maxCarbon - minCarbon)) * alignment.carbonWeight +
      p.demandIndex * 0.68 +
      (p.fossilSharePct / 100) * 0.5,
    alignment.dischargeHours
  );

  const chargePerHour = chargeHours.length ? Math.min(battery.batteryMw * 0.82, chargeEnergyMwh / chargeHours.length) : 0;
  const dischargePerHour = dischargeHours.length ? Math.min(battery.batteryMw * 0.82, dispatchEnergyMwh / dischargeHours.length) : 0;
  const avgChargeRenewableShare = average(
    profile.filter((p) => chargeHours.includes(p.hour)),
    (p) => p.renewableSharePct / 100
  );
  const avgChargeCarbon = average(
    profile.filter((p) => chargeHours.includes(p.hour)),
    (p) => p.carbonKgPerMwh
  );

  let baselineCost = 0;
  let voltpilotCost = 0;
  let baselineCo2 = 0;
  let voltpilotCo2 = 0;
  let baselineRenewableMwh = 0;
  let voltpilotRenewableMwh = 0;
  let baselineFossilMwh = 0;
  let voltpilotFossilMwh = 0;
  let baselineMwh = 0;
  let voltpilotGridMwh = 0;
  let shiftedMwh = 0;
  let marketRevenueDay = 0;
  let baselinePeak = 0;
  let voltpilotPeak = 0;

  const dailyProfile = profile.map((point) => {
    const siteLoadMw = site.averageLoadMw * (1 + site.loadVariability * Math.sin(((point.hour - 5) / 24) * Math.PI * 2)) * point.demandIndex;
    const chargeMw = chargeHours.includes(point.hour) ? chargePerHour : 0;
    const dischargeMw = dischargeHours.includes(point.hour) ? dischargePerHour : 0;
    const voltpilotGridMw = Math.max(site.averageLoadMw * 0.35, siteLoadMw + chargeMw - dischargeMw);
    const directGridForLoadMw = Math.max(0, siteLoadMw - dischargeMw);

    baselineCost += siteLoadMw * point.priceGbpPerMwh;
    voltpilotCost += voltpilotGridMw * point.priceGbpPerMwh;
    baselineCo2 += (siteLoadMw * point.carbonKgPerMwh) / 1000;
    voltpilotCo2 += (voltpilotGridMw * point.carbonKgPerMwh) / 1000;
    baselineRenewableMwh += siteLoadMw * (point.renewableSharePct / 100);
    voltpilotRenewableMwh += directGridForLoadMw * (point.renewableSharePct / 100) + dischargeMw * avgChargeRenewableShare;
    baselineFossilMwh += siteLoadMw * (point.fossilSharePct / 100);
    voltpilotFossilMwh += directGridForLoadMw * (point.fossilSharePct / 100) + dischargeMw * Math.max(0.05, avgChargeCarbon / 520);
    baselineMwh += siteLoadMw;
    voltpilotGridMwh += voltpilotGridMw;
    shiftedMwh += dischargeMw;
    marketRevenueDay += dischargeMw * point.flexPriceGbpPerMwh * auto.marketAccess * site.flexibilityAccess;
    if (point.hour >= 16 && point.hour <= 21) {
      baselinePeak = Math.max(baselinePeak, siteLoadMw);
      voltpilotPeak = Math.max(voltpilotPeak, voltpilotGridMw);
    }

    return {
      hour: point.hour,
      baselineMw: round(siteLoadMw, 2),
      voltpilotMw: round(voltpilotGridMw, 2),
      chargeMw: round(chargeMw, 2),
      dischargeMw: round(dischargeMw, 2),
      priceGbpPerMwh: point.priceGbpPerMwh,
      carbonKgPerMwh: point.carbonKgPerMwh,
      renewableSharePct: point.renewableSharePct
    };
  });

  const annualFactor = 365;
  const annualBaselineCost = baselineCost * annualFactor;
  const annualVoltPilotCost = voltpilotCost * annualFactor;
  const annualCostSavingsGbp = Math.max(0, annualBaselineCost - annualVoltPilotCost);
  const annualMarketRevenueGbp = marketRevenueDay * annualFactor;
  const annualBaselineCo2 = baselineCo2 * annualFactor;
  const annualVoltPilotCo2 = voltpilotCo2 * annualFactor;
  const annualCo2AvoidedTonnes = Math.max(0, annualBaselineCo2 - annualVoltPilotCo2);
  const annualBaselineMwh = baselineMwh * annualFactor;
  const annualShiftedMwh = shiftedMwh * annualFactor;
  const baselineRenewableMixPct = clamp((baselineRenewableMwh / baselineMwh) * 100, 0, 100);
  const voltpilotRenewableMixPct = clamp((voltpilotRenewableMwh / baselineMwh) * 100, 0, 100);
  const baselineFossilPct = clamp((baselineFossilMwh / baselineMwh) * 100, 0, 100);
  const voltpilotFossilPct = clamp((voltpilotFossilMwh / baselineMwh) * 100, 0, 100);
  const peakDemandDecreasePct = baselinePeak > 0 ? ((baselinePeak - voltpilotPeak) / baselinePeak) * 100 : 0;
  const carbonEmissionReductionPct = annualBaselineCo2 > 0 ? (annualCo2AvoidedTonnes / annualBaselineCo2) * 100 : 0;
  const fossilFuelReductionPct = baselineFossilPct > 0 ? ((baselineFossilPct - voltpilotFossilPct) / baselineFossilPct) * 100 : 0;
  const localElectricityPriceReductionPct = annualBaselineCost > 0 ? (annualCostSavingsGbp / annualBaselineCost) * 100 * site.localBillSensitivity : 0;
  const annualCostSavingsPounds = pounds(annualCostSavingsGbp);
  const annualMarketRevenuePounds = pounds(annualMarketRevenueGbp);
  const totalAnnualValuePounds = annualCostSavingsPounds + annualMarketRevenuePounds;
  const dispatchEvents = Math.round(dischargeHours.length * 52 * market.volatility * auto.participation * reserve.dispatchGuard);
  const confidenceScore = Math.round(clamp(88 + site.confidenceOffset + reserve.confidenceOffset + auto.confidenceOffset + market.confidenceOffset - (alignment.id === 'very_high_alignment' ? 2 : 0), 70, 97));

  const monthlyValueProfile = monthLabels.map((month, index) => ({
    month,
    valueGbp: pounds(totalAnnualValuePounds * monthWeights[index])
  }));

  return {
    assumptions: {
      reservePct: reserve.reservePct,
      batteryMw: battery.batteryMw,
      batteryMwh: battery.batteryMwh,
      reserveEnergyMwh: round(reserveEnergyMwh, 1),
      usableBatteryMwh: round(usableBatteryMwh, 1),
      roundTripEfficiencyPct: round(roundTripEfficiency * 100, 1),
      averageLoadMw: site.averageLoadMw,
      annualBaselineMwh: Math.round(annualBaselineMwh),
      annualShiftedMwh: Math.round(annualShiftedMwh),
      chargeHours,
      dischargeHours,
      chargeMw: round(chargePerHour, 2),
      dischargeMw: round(dischargePerHour, 2),
      chargeWindow: alignment.chargeWindow,
      dischargeWindow: alignment.dischargeWindow
    },
    comparison: {
      annualEnergySpend: { baseline: pounds(annualBaselineCost), voltpilot: pounds(annualVoltPilotCost) },
      marketRevenue: { baseline: 0, voltpilot: pounds(annualMarketRevenueGbp) },
      annualValue: { baseline: 0, voltpilot: totalAnnualValuePounds },
      co2Tonnes: { baseline: Math.round(annualBaselineCo2), voltpilot: Math.round(annualVoltPilotCo2) },
      dispatchEvents: { baseline: 0, voltpilot: dispatchEvents },
      uptimePct: { baseline: reserve.uptimePct, voltpilot: reserve.uptimePct },
      localPriceIndex: { baseline: 100, voltpilot: round(100 - localElectricityPriceReductionPct, 1) },
      renewableMixPct: { baseline: round(baselineRenewableMixPct, 1), voltpilot: round(voltpilotRenewableMixPct, 1) },
      peakDemandIndex: { baseline: 100, voltpilot: round(100 - Math.max(0, peakDemandDecreasePct), 1) },
      carbonIndex: { baseline: 100, voltpilot: round(100 - carbonEmissionReductionPct, 1) },
      fossilIndex: { baseline: 100, voltpilot: round(100 - fossilFuelReductionPct, 1) }
    },
    outputs: {
      annualCostSavingsGbp: annualCostSavingsPounds,
      annualMarketRevenueGbp: annualMarketRevenuePounds,
      totalAnnualValueGbp: totalAnnualValuePounds,
      annualCo2AvoidedTonnes: Math.round(annualCo2AvoidedTonnes),
      annualDispatchEvents: dispatchEvents,
      confidenceScore,
      expectedUptimePct: reserve.uptimePct,
      localElectricityPriceReductionPct: round(clamp(localElectricityPriceReductionPct, 0, 35), 1),
      datacentreRenewableMixIncreasePct: round(Math.max(0, voltpilotRenewableMixPct - baselineRenewableMixPct), 1),
      peakDemandDecreasePct: round(Math.max(0, peakDemandDecreasePct), 1),
      carbonEmissionReductionPct: round(Math.max(0, carbonEmissionReductionPct), 1),
      fossilFuelReductionPct: round(Math.max(0, fossilFuelReductionPct), 1),
      monthlyValueProfile
    }
  };
}

function buildScenarios() {
  const scenarios = [];
  let idCounter = 1;

  for (const site of siteProfiles) {
    for (const battery of batteryBands) {
      for (const reserve of reservePolicies) {
        for (const auto of automationModes) {
          for (const market of marketConditions) {
            for (const alignment of renewableAlignment) {
              const simulation = simulateScenario(site, battery, reserve, auto, market, alignment);
              const inputs = {
                siteProfileId: site.id,
                batteryBandId: battery.id,
                reservePolicyId: reserve.id,
                automationModeId: auto.id,
                marketConditionId: market.id,
                renewableAlignmentId: alignment.id
              };

              scenarios.push({
                id: `SC-${String(idCounter).padStart(4, '0')}`,
                key: scenarioKey(inputs),
                inputs,
                assumptions: simulation.assumptions,
                comparison: simulation.comparison,
                outputs: simulation.outputs,
                summary:
                  `Historic representative profile with ${auto.modeNarrative}, ${alignment.label.toLowerCase()}, ${reserve.label.toLowerCase()}, and a ${battery.label} battery at a ${site.label.toLowerCase()}.`
              });

              idCounter += 1;
            }
          }
        }
      }
    }
  }

  return scenarios;
}

function buildDataPackage() {
  const scenarios = buildScenarios();
  return {
    generatedAt: new Date().toISOString(),
    version: '2.0.0-historic-static',
    modelType: 'historic representative dispatch simulation',
    historicEvidence,
    historicProfiles: Object.fromEntries(marketConditions.map((market) => [market.id, buildHistoricProfile(market)])),
    methodology: {
      baseline: 'Baseline keeps the UPS battery reserved for backup and buys grid electricity against the representative historic profile.',
      voltpilot: 'VoltPilot preserves the reserve policy, charges during low-price/low-carbon renewable-surplus hours, and discharges during high-price/high-carbon peak hours.',
      confidence: 'Confidence reflects reserve policy, automation mode, market volatility, and renewable-alignment aggressiveness.'
    },
    dimensions: {
      siteProfile: siteProfiles.map(({ id, label, description, averageLoadMw, loadVariability, pue }) => ({ id, label, description, averageLoadMw, loadVariability, pue })),
      batteryBand: batteryBands.map(({ id, label, description, batteryMw, batteryMwh }) => ({ id, label, description, batteryMw, batteryMwh })),
      reservePolicy: reservePolicies.map(({ id, label, reservePct }) => ({ id, label, reservePct })),
      automationMode: automationModes.map(({ id, label, description }) => ({ id, label, description })),
      marketCondition: marketConditions.map(({ id, label }) => ({ id, label })),
      renewableAlignment: renewableAlignment.map(({ id, label, chargeWindow, dischargeWindow }) => ({ id, label, chargeWindow, dischargeWindow }))
    },
    scenarios
  };
}

function main() {
  const targetPath = path.join(process.cwd(), 'data', 'scenarios.json');
  const dataPackage = buildDataPackage();
  const json = JSON.stringify(dataPackage);

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, json + '\n');

  console.log(`Wrote ${dataPackage.scenarios.length} scenarios to ${targetPath}`);
  console.log(`Payload size: ${(Buffer.byteLength(json) / 1024).toFixed(1)} KB`);
  console.log(`Model version: ${dataPackage.version}`);
}

main();

(function () {
  var dimensionOrder = [
    'siteProfile',
    'batteryBand',
    'reservePolicy',
    'automationMode',
    'marketCondition',
    'renewableAlignment'
  ];

  var selectionState = {
    siteProfile: null,
    batteryBand: null,
    reservePolicy: null,
    automationMode: null,
    marketCondition: null,
    renewableAlignment: null
  };

  var refs = {
    form: document.getElementById('scenario-form'),
    datasetMeta: document.getElementById('dataset-meta'),
    scenarioLabel: document.getElementById('scenario-label'),
    scenarioStatus: document.getElementById('scenario-status'),
    scenarioSummary: document.getElementById('scenario-summary'),
    chartTotal: document.getElementById('chart-total'),
    chartDailyCaption: document.getElementById('chart-daily-caption'),
    chartImpactCaption: document.getElementById('chart-impact-caption'),
    monthlyChart: document.getElementById('monthly-chart'),
    dailyComparisonChart: document.getElementById('daily-comparison-chart'),
    impactComparisonChart: document.getElementById('impact-comparison-chart'),
    resetButton: document.getElementById('reset-scenario'),
    resultCost: document.getElementById('result-cost'),
    resultRevenue: document.getElementById('result-revenue'),
    resultTotal: document.getElementById('result-total'),
    resultCo2: document.getElementById('result-co2'),
    resultDispatch: document.getElementById('result-dispatch'),
    resultUptime: document.getElementById('result-uptime'),
    resultLocalPrice: document.getElementById('result-local-price'),
    resultRenewablesMix: document.getElementById('result-renewables-mix'),
    resultPeak: document.getElementById('result-peak'),
    resultCarbonPct: document.getElementById('result-carbon-pct'),
    resultFossil: document.getElementById('result-fossil'),
    resultCostCompare: document.getElementById('result-cost-compare'),
    resultRevenueCompare: document.getElementById('result-revenue-compare'),
    resultTotalCompare: document.getElementById('result-total-compare'),
    resultCo2Compare: document.getElementById('result-co2-compare'),
    resultDispatchCompare: document.getElementById('result-dispatch-compare'),
    resultUptimeCompare: document.getElementById('result-uptime-compare'),
    resultLocalPriceCompare: document.getElementById('result-local-price-compare'),
    resultRenewablesMixCompare: document.getElementById('result-renewables-mix-compare'),
    resultPeakCompare: document.getElementById('result-peak-compare'),
    resultCarbonPctCompare: document.getElementById('result-carbon-pct-compare'),
    resultFossilCompare: document.getElementById('result-fossil-compare'),
    resultCo2Context: document.getElementById('result-co2-context'),
    resultLocalPriceContext: document.getElementById('result-local-price-context'),
    resultRenewablesMixContext: document.getElementById('result-renewables-mix-context'),
    resultPeakContext: document.getElementById('result-peak-context'),
    resultCarbonPctContext: document.getElementById('result-carbon-pct-context'),
    resultFossilContext: document.getElementById('result-fossil-context'),
    meterCo2: document.getElementById('meter-co2'),
    meterLocalPrice: document.getElementById('meter-local-price'),
    meterRenewablesMix: document.getElementById('meter-renewables-mix'),
    meterPeak: document.getElementById('meter-peak'),
    meterCarbonPct: document.getElementById('meter-carbon-pct'),
    meterFossil: document.getElementById('meter-fossil'),
    meterCo2Min: document.getElementById('meter-co2-min'),
    meterCo2Max: document.getElementById('meter-co2-max'),
    meterLocalPriceMin: document.getElementById('meter-local-price-min'),
    meterLocalPriceMax: document.getElementById('meter-local-price-max'),
    meterRenewablesMixMin: document.getElementById('meter-renewables-mix-min'),
    meterRenewablesMixMax: document.getElementById('meter-renewables-mix-max'),
    meterPeakMin: document.getElementById('meter-peak-min'),
    meterPeakMax: document.getElementById('meter-peak-max'),
    meterCarbonPctMin: document.getElementById('meter-carbon-pct-min'),
    meterCarbonPctMax: document.getElementById('meter-carbon-pct-max'),
    meterFossilMin: document.getElementById('meter-fossil-min'),
    meterFossilMax: document.getElementById('meter-fossil-max')
  };

  if (!refs.form) return;

  var scenariosData = null;
  var scenarioList = [];
  var scenarioIndex = new Map();
  var meterScales = null;

  function formatCurrency(value) {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  function formatInteger(value) {
    return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(value || 0);
  }

  function formatMwh(value) {
    return formatInteger(value) + ' MWh';
  }

  function formatPercent(value, decimals) {
    var digits = typeof decimals === 'number' ? decimals : 1;
    return Number(value || 0).toFixed(digits) + '%';
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function setMeter(node, value, scale) {
    if (!node) return;
    var min = scale ? scale.min : 0;
    var max = scale ? scale.max : 0;
    var denominator = max - min;
    var width = denominator > 0 ? clamp(((Number(value || 0) - min) / denominator) * 100, 0, 100) : 0;
    node.style.width = width.toFixed(1) + '%';
  }

  function ceilTo(value, step) {
    if (step <= 0) return value;
    return Math.ceil(value / step) * step;
  }

  function deriveScale(field, step) {
    var max = scenarioList.reduce(function (memo, scenario) {
      return Math.max(memo, Number(scenario.outputs[field]) || 0);
    }, 0);

    var padded = max * 1.06;
    return {
      min: 0,
      max: ceilTo(padded, step)
    };
  }

  function buildMeterScales() {
    meterScales = {
      co2: deriveScale('annualCo2AvoidedTonnes', 50),
      localPrice: deriveScale('localElectricityPriceReductionPct', 0.5),
      renewablesMix: deriveScale('datacentreRenewableMixIncreasePct', 0.5),
      peak: deriveScale('peakDemandDecreasePct', 0.5),
      carbonPct: deriveScale('carbonEmissionReductionPct', 0.5),
      fossil: deriveScale('fossilFuelReductionPct', 0.5)
    };
  }

  function renderMeterAxis() {
    if (!meterScales) return;

    if (refs.meterCo2Min) refs.meterCo2Min.textContent = formatInteger(meterScales.co2.min) + ' tCO2e/yr';
    if (refs.meterCo2Max) refs.meterCo2Max.textContent = formatInteger(meterScales.co2.max) + ' tCO2e/yr';

    if (refs.meterLocalPriceMin) refs.meterLocalPriceMin.textContent = formatPercent(meterScales.localPrice.min, 1);
    if (refs.meterLocalPriceMax) refs.meterLocalPriceMax.textContent = formatPercent(meterScales.localPrice.max, 1);

    if (refs.meterRenewablesMixMin) refs.meterRenewablesMixMin.textContent = formatPercent(meterScales.renewablesMix.min, 1);
    if (refs.meterRenewablesMixMax) refs.meterRenewablesMixMax.textContent = formatPercent(meterScales.renewablesMix.max, 1);

    if (refs.meterPeakMin) refs.meterPeakMin.textContent = formatPercent(meterScales.peak.min, 1);
    if (refs.meterPeakMax) refs.meterPeakMax.textContent = formatPercent(meterScales.peak.max, 1);

    if (refs.meterCarbonPctMin) refs.meterCarbonPctMin.textContent = formatPercent(meterScales.carbonPct.min, 1);
    if (refs.meterCarbonPctMax) refs.meterCarbonPctMax.textContent = formatPercent(meterScales.carbonPct.max, 1);

    if (refs.meterFossilMin) refs.meterFossilMin.textContent = formatPercent(meterScales.fossil.min, 1);
    if (refs.meterFossilMax) refs.meterFossilMax.textContent = formatPercent(meterScales.fossil.max, 1);
  }

  function scenarioKeyFromState(state) {
    return [
      state.siteProfile,
      state.batteryBand,
      state.reservePolicy,
      state.automationMode,
      state.marketCondition,
      state.renewableAlignment
    ].join('|');
  }

  function prettyDimensionTitle(id) {
    if (id === 'siteProfile') return 'Site profile';
    if (id === 'batteryBand') return 'Battery band';
    if (id === 'reservePolicy') return 'Reserve policy';
    if (id === 'automationMode') return 'Automation mode';
    if (id === 'marketCondition') return 'Market condition';
    return 'Renewable alignment';
  }

  function chooseNearestScenario(state) {
    var best = null;
    var bestScore = -1;

    for (var i = 0; i < scenarioList.length; i += 1) {
      var candidate = scenarioList[i];
      var score = 0;

      if (candidate.inputs.siteProfileId === state.siteProfile) score += 5;
      if (candidate.inputs.batteryBandId === state.batteryBand) score += 4;
      if (candidate.inputs.reservePolicyId === state.reservePolicy) score += 4;
      if (candidate.inputs.automationModeId === state.automationMode) score += 3;
      if (candidate.inputs.marketConditionId === state.marketCondition) score += 3;
      if (candidate.inputs.renewableAlignmentId === state.renewableAlignment) score += 2;

      if (!best || score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }

    return best;
  }

  function updateStatus(copy, isFallback) {
    if (!refs.scenarioStatus) return;
    refs.scenarioStatus.className = isFallback ? 'scenario-status is-fallback' : 'scenario-status';
    refs.scenarioStatus.textContent = copy;
  }

  function parseTimeWindow(text) {
    if (!text || text.indexOf('-') === -1) {
      return { start: 7, end: 13 };
    }

    function toHour(piece) {
      var part = piece.trim().split(':');
      var h = Number(part[0] || 0);
      var m = Number(part[1] || 0);
      return h + m / 60;
    }

    var parts = text.split('-');
    var start = toHour(parts[0]);
    var end = toHour(parts[1]);

    if (end <= start) {
      end += 24;
    }

    return { start: start, end: end };
  }

  function inWindow(hour, window) {
    var h = hour;
    if (window.end > 24 && h < window.start) {
      h += 24;
    }
    return h >= window.start && h <= window.end;
  }

  function buildBaselineComparison(activeScenario) {
    if (activeScenario.comparison) {
      return activeScenario.comparison;
    }

    var out = activeScenario.outputs;
    var reduction = Math.max(0.1, Number(out.localElectricityPriceReductionPct) || 0.1);
    var baselineEnergySpend = out.annualCostSavingsGbp / (reduction / 100);
    var voltpilotEnergySpend = Math.max(0, baselineEnergySpend - out.annualCostSavingsGbp);

    var carbonReduction = Math.max(0.1, Number(out.carbonEmissionReductionPct) || 0.1);
    var baselineCo2 = out.annualCo2AvoidedTonnes / (carbonReduction / 100);
    var voltpilotCo2 = Math.max(0, baselineCo2 - out.annualCo2AvoidedTonnes);

    var baselineRenewableMix = 42;
    var voltpilotRenewableMix = baselineRenewableMix + (Number(out.datacentreRenewableMixIncreasePct) || 0);

    var baselineUptime = clamp((Number(out.expectedUptimePct) || 99.99) - 0.012, 99.9, 99.999);
    var voltpilotUptime = Number(out.expectedUptimePct) || 99.99;

    return {
      annualEnergySpend: {
        baseline: baselineEnergySpend,
        voltpilot: voltpilotEnergySpend
      },
      marketRevenue: {
        baseline: 0,
        voltpilot: Number(out.annualMarketRevenueGbp) || 0
      },
      annualValue: {
        baseline: 0,
        voltpilot: Number(out.totalAnnualValueGbp) || 0
      },
      co2Tonnes: {
        baseline: baselineCo2,
        voltpilot: voltpilotCo2
      },
      dispatchEvents: {
        baseline: 0,
        voltpilot: Number(out.annualDispatchEvents) || 0
      },
      uptimePct: {
        baseline: baselineUptime,
        voltpilot: voltpilotUptime
      },
      localPriceIndex: {
        baseline: 100,
        voltpilot: 100 - (Number(out.localElectricityPriceReductionPct) || 0)
      },
      renewableMixPct: {
        baseline: baselineRenewableMix,
        voltpilot: voltpilotRenewableMix
      },
      peakDemandIndex: {
        baseline: 100,
        voltpilot: 100 - (Number(out.peakDemandDecreasePct) || 0)
      },
      carbonIndex: {
        baseline: 100,
        voltpilot: 100 - (Number(out.carbonEmissionReductionPct) || 0)
      },
      fossilIndex: {
        baseline: 100,
        voltpilot: 100 - (Number(out.fossilFuelReductionPct) || 0)
      }
    };
  }

  function renderMonthlyChart(monthlyProfile, maxValue) {
    if (!refs.monthlyChart) return;
    refs.monthlyChart.innerHTML = '';

    monthlyProfile.forEach(function (month) {
      var ratio = maxValue > 0 ? month.valueGbp / maxValue : 0;
      var row = document.createElement('div');
      row.className = 'month-row';

      var label = document.createElement('span');
      label.className = 'month-label';
      label.textContent = month.month;

      var track = document.createElement('div');
      track.className = 'month-track';

      var fill = document.createElement('div');
      fill.className = 'month-fill';
      fill.style.width = Math.max(8, Math.round(ratio * 100)) + '%';

      var value = document.createElement('span');
      value.className = 'month-value';
      value.textContent = formatCurrency(month.valueGbp);

      track.appendChild(fill);
      row.appendChild(label);
      row.appendChild(track);
      row.appendChild(value);
      refs.monthlyChart.appendChild(row);
    });
  }

  function pointsToPath(points, xScale, yScale, pad) {
    return points
      .map(function (point, idx) {
        var x = pad.left + xScale * point.hour;
        var y = pad.top + yScale * point.value;
        return (idx === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2);
      })
      .join(' ');
  }

  function renderDailyComparisonChart(activeScenario, comparison) {
    if (!refs.dailyComparisonChart) return;

    var profile = scenariosData && scenariosData.historicProfiles
      ? scenariosData.historicProfiles[activeScenario.inputs.marketConditionId]
      : null;
    var siteOptions = scenariosData && scenariosData.dimensions ? scenariosData.dimensions.siteProfile : [];
    var site = siteOptions.find(function (option) {
      return option.id === activeScenario.inputs.siteProfileId;
    }) || {};

    var baseLoad = Number(activeScenario.assumptions.averageLoadMw || site.averageLoadMw) || 30;
    var loadVariability = Number(site.loadVariability) || 0.08;
    var chargeHours = activeScenario.assumptions.chargeHours || [];
    var dischargeHours = activeScenario.assumptions.dischargeHours || [];
    var chargeMw = Number(activeScenario.assumptions.chargeMw) || 0;
    var dischargeMw = Number(activeScenario.assumptions.dischargeMw) || 0;
    var chargeWindow = parseTimeWindow(activeScenario.assumptions.chargeWindow);
    var dischargeWindow = parseTimeWindow(activeScenario.assumptions.dischargeWindow);

    var baseline = [];
    var voltpilot = [];

    for (var h = 0; h < 24; h += 1) {
      var point = profile && profile[h] ? profile[h] : { hour: h, demandIndex: 1 };
      var base = Math.max(4, baseLoad * (1 + loadVariability * Math.sin(((h - 5) / 24) * Math.PI * 2)) * (Number(point.demandIndex) || 1));
      var charge = chargeHours.indexOf(h) !== -1 ? chargeMw : 0;
      var discharge = dischargeHours.indexOf(h) !== -1 ? dischargeMw : 0;
      var vp = Math.max(baseLoad * 0.35, base + charge - discharge);

      baseline.push({ hour: h, value: base });
      voltpilot.push({ hour: h, value: vp });
    }

    var maxY = Math.max(
      baseline.reduce(function (m, p) { return Math.max(m, p.value); }, 0),
      voltpilot.reduce(function (m, p) { return Math.max(m, p.value); }, 0)
    );

    var width = 760;
    var height = 280;
    var pad = { left: 44, right: 16, top: 18, bottom: 36 };
    var xScale = (width - pad.left - pad.right) / 23;
    var yScale = (height - pad.top - pad.bottom) / maxY;

    var chargeStartX = pad.left + xScale * (chargeWindow.start > 24 ? chargeWindow.start - 24 : chargeWindow.start);
    var chargeEndX = pad.left + xScale * Math.min(23, chargeWindow.end > 24 ? chargeWindow.end - 24 : chargeWindow.end);
    var dischargeStartX = pad.left + xScale * (dischargeWindow.start > 24 ? dischargeWindow.start - 24 : dischargeWindow.start);
    var dischargeEndX = pad.left + xScale * Math.min(23, dischargeWindow.end > 24 ? dischargeWindow.end - 24 : dischargeWindow.end);

    var baselinePath = pointsToPath(baseline, xScale, -yScale, { left: pad.left, top: height - pad.bottom });
    var vpPath = pointsToPath(voltpilot, xScale, -yScale, { left: pad.left, top: height - pad.bottom });

    var ticks = [0, 6, 12, 18, 23];
    var tickLabels = ticks
      .map(function (t) {
        var x = pad.left + xScale * t;
        return '<text x="' + x.toFixed(1) + '" y="' + (height - 12) + '" text-anchor="middle" fill="#7a7a75" font-size="11">' +
          String(t).padStart(2, '0') + ':00</text>';
      })
      .join('');

    var yTicks = [0, 0.25, 0.5, 0.75, 1].map(function (ratio) {
      return Math.round((maxY * ratio) * 10) / 10;
    });

    var yTickLabels = yTicks
      .map(function (value) {
        var y = pad.top + (height - pad.top - pad.bottom) - (value / maxY) * (height - pad.top - pad.bottom);
        return (
          '<line x1="' + pad.left + '" y1="' + y.toFixed(1) + '" x2="' + (width - pad.right) + '" y2="' + y.toFixed(1) + '" stroke="rgba(28,28,26,0.08)" stroke-width="1"></line>' +
          '<text x="' + (pad.left - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" fill="#7a7a75" font-size="11">' + value.toFixed(0) + ' MW</text>'
        );
      })
      .join('');

    refs.dailyComparisonChart.innerHTML =
      '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Daily baseline and VoltPilot grid draw comparison">' +
      '<rect x="0" y="0" width="' + width + '" height="' + height + '" fill="#ffffff"></rect>' +
      '<rect x="' + chargeStartX.toFixed(1) + '" y="' + pad.top + '" width="' + Math.max(8, chargeEndX - chargeStartX).toFixed(1) + '" height="' + (height - pad.top - pad.bottom) + '" fill="#e8edf5"></rect>' +
      '<rect x="' + dischargeStartX.toFixed(1) + '" y="' + pad.top + '" width="' + Math.max(8, dischargeEndX - dischargeStartX).toFixed(1) + '" height="' + (height - pad.top - pad.bottom) + '" fill="#f2f3f6"></rect>' +
      yTickLabels +
      '<line x1="' + pad.left + '" y1="' + pad.top + '" x2="' + pad.left + '" y2="' + (height - pad.bottom) + '" stroke="rgba(28,28,26,0.3)" stroke-width="1"></line>' +
      '<line x1="' + pad.left + '" y1="' + (height - pad.bottom) + '" x2="' + (width - pad.right) + '" y2="' + (height - pad.bottom) + '" stroke="rgba(28,28,26,0.3)" stroke-width="1"></line>' +
      '<path d="' + baselinePath + '" fill="none" stroke="#8d8a83" stroke-width="2"></path>' +
      '<path d="' + vpPath + '" fill="none" stroke="#1f3f66" stroke-width="2.4"></path>' +
      '<text transform="translate(14 ' + ((pad.top + height - pad.bottom) / 2).toFixed(1) + ') rotate(-90)" fill="#3d3d3a" font-size="11" text-anchor="middle">Grid draw (MW)</text>' +
      tickLabels +
      '</svg>' +
      '<div class="chart-legend">' +
      '<span class="chart-legend-item"><span class="chart-dot" style="background:#8d8a83"></span>Baseline operation</span>' +
      '<span class="chart-legend-item"><span class="chart-dot" style="background:#1f3f66"></span>VoltPilot dispatch</span>' +
      '<span class="chart-legend-item"><span class="chart-dot" style="background:#e8edf5"></span>Charge window</span>' +
      '<span class="chart-legend-item"><span class="chart-dot" style="background:#f2f3f6"></span>Discharge window</span>' +
      '</div>';

    var peakWindowBaseline = baseline.filter(function (p) { return p.hour >= 16 && p.hour <= 21; });
    var peakWindowVoltPilot = voltpilot.filter(function (p) { return p.hour >= 16 && p.hour <= 21; });
    var baselinePeak = peakWindowBaseline.reduce(function (m, p) { return Math.max(m, p.value); }, 0);
    var vpPeak = peakWindowVoltPilot.reduce(function (m, p) { return Math.max(m, p.value); }, 0);
    var peakDrop = baselinePeak > 0 ? Math.max(0, ((baselinePeak - vpPeak) / baselinePeak) * 100) : 0;

    if (refs.chartDailyCaption) {
      refs.chartDailyCaption.textContent =
        'Evening stress peak ' + baselinePeak.toFixed(1) + ' MW → ' + vpPeak.toFixed(1) + ' MW (' + formatPercent(peakDrop, 1) + ' lower)';
    }

    return {
      baselinePeak: baselinePeak,
      voltpilotPeak: vpPeak
    };
  }

  function renderImpactComparisonChart(comparison) {
    if (!refs.impactComparisonChart) return;

    var metrics = [
      {
        label: 'Local electricity price index',
        baseline: comparison.localPriceIndex.baseline,
        voltpilot: comparison.localPriceIndex.voltpilot,
        baselineLabel: comparison.localPriceIndex.baseline.toFixed(1),
        voltpilotLabel: comparison.localPriceIndex.voltpilot.toFixed(1)
      },
      {
        label: 'Datacentre renewable mix (%)',
        baseline: comparison.renewableMixPct.baseline,
        voltpilot: comparison.renewableMixPct.voltpilot,
        baselineLabel: formatPercent(comparison.renewableMixPct.baseline, 1),
        voltpilotLabel: formatPercent(comparison.renewableMixPct.voltpilot, 1)
      },
      {
        label: 'Peak demand index',
        baseline: comparison.peakDemandIndex.baseline,
        voltpilot: comparison.peakDemandIndex.voltpilot,
        baselineLabel: comparison.peakDemandIndex.baseline.toFixed(1),
        voltpilotLabel: comparison.peakDemandIndex.voltpilot.toFixed(1)
      },
      {
        label: 'Carbon emissions index',
        baseline: comparison.carbonIndex.baseline,
        voltpilot: comparison.carbonIndex.voltpilot,
        baselineLabel: comparison.carbonIndex.baseline.toFixed(1),
        voltpilotLabel: comparison.carbonIndex.voltpilot.toFixed(1)
      },
      {
        label: 'Fossil fuel use index',
        baseline: comparison.fossilIndex.baseline,
        voltpilot: comparison.fossilIndex.voltpilot,
        baselineLabel: comparison.fossilIndex.baseline.toFixed(1),
        voltpilotLabel: comparison.fossilIndex.voltpilot.toFixed(1)
      }
    ];

    var maxValue = metrics.reduce(function (m, item) {
      return Math.max(m, item.baseline, item.voltpilot);
    }, 0);

    var html = metrics
      .map(function (metric) {
        var baselineWidth = (metric.baseline / maxValue) * 100;
        var vpWidth = (metric.voltpilot / maxValue) * 100;

        return (
          '<div class="impact-row">' +
          '<div class="impact-row-head">' +
          '<span>' + metric.label + '</span>' +
          '<span>Baseline ' + metric.baselineLabel + ' → VoltPilot ' + metric.voltpilotLabel + '</span>' +
          '</div>' +
          '<div class="impact-bar-group">' +
          '<div class="impact-bar-track"><div class="impact-bar impact-bar-baseline" style="width:' + baselineWidth.toFixed(1) + '%"></div></div>' +
          '<div class="impact-bar-track"><div class="impact-bar impact-bar-voltpilot" style="width:' + vpWidth.toFixed(1) + '%"></div></div>' +
          '</div>' +
          '</div>'
        );
      })
      .join('');

    refs.impactComparisonChart.innerHTML =
      '<div class="chart-legend">' +
      '<span class="chart-legend-item"><span class="chart-dot" style="background:#8d8a83"></span>Baseline</span>' +
      '<span class="chart-legend-item"><span class="chart-dot" style="background:#1f3f66"></span>VoltPilot</span>' +
      '</div>' +
      '<div class="impact-grid">' + html + '</div>';

    if (refs.chartImpactCaption) {
      refs.chartImpactCaption.textContent = 'Baseline indexed at 100 where applicable';
    }
  }

  function updateResults() {
    var exactKey = scenarioKeyFromState(selectionState);
    var exactMatch = scenarioIndex.get(exactKey);
    var activeScenario = exactMatch || chooseNearestScenario(selectionState);

    if (!activeScenario) {
      updateStatus('No scenario available. Please refresh the page.', true);
      return;
    }

    var isFallback = !exactMatch;

    var dim = scenariosData.dimensions;
    var site = dim.siteProfile.find(function (option) {
      return option.id === activeScenario.inputs.siteProfileId;
    });
    var battery = dim.batteryBand.find(function (option) {
      return option.id === activeScenario.inputs.batteryBandId;
    });
    var reserve = dim.reservePolicy.find(function (option) {
      return option.id === activeScenario.inputs.reservePolicyId;
    });
    var automation = dim.automationMode.find(function (option) {
      return option.id === activeScenario.inputs.automationModeId;
    });
    var market = dim.marketCondition.find(function (option) {
      return option.id === activeScenario.inputs.marketConditionId;
    });
    var alignment = dim.renewableAlignment.find(function (option) {
      return option.id === activeScenario.inputs.renewableAlignmentId;
    });

    var comparison = buildBaselineComparison(activeScenario);

    refs.scenarioLabel.textContent =
      'Scenario ' +
      activeScenario.id +
      ' · ' +
      site.label +
      ' · ' +
      battery.label;

    updateStatus(
      isFallback
        ? 'Exact scenario not found. Showing nearest historic representative match.'
        : 'Historic representative scenario loaded.',
      isFallback
    );

    refs.resultCost.textContent = formatCurrency(activeScenario.outputs.annualCostSavingsGbp) + ' saved';
    refs.resultRevenue.textContent = formatCurrency(activeScenario.outputs.annualMarketRevenueGbp);
    refs.resultTotal.textContent = formatCurrency(activeScenario.outputs.totalAnnualValueGbp);
    refs.resultCo2.textContent = formatInteger(activeScenario.outputs.annualCo2AvoidedTonnes) + ' tCO2e avoided';
    refs.resultDispatch.textContent = formatInteger(activeScenario.outputs.annualDispatchEvents) + ' events / year';
    refs.resultUptime.textContent = formatPercent(activeScenario.outputs.expectedUptimePct, 3);
    refs.resultLocalPrice.textContent = formatPercent(activeScenario.outputs.localElectricityPriceReductionPct, 1);
    refs.resultRenewablesMix.textContent = formatPercent(activeScenario.outputs.datacentreRenewableMixIncreasePct, 1);
    refs.resultPeak.textContent = formatPercent(activeScenario.outputs.peakDemandDecreasePct, 1);
    refs.resultCarbonPct.textContent = formatPercent(activeScenario.outputs.carbonEmissionReductionPct, 1);
    refs.resultFossil.textContent = formatPercent(activeScenario.outputs.fossilFuelReductionPct, 1);

    refs.resultCostCompare.textContent =
      'Baseline spend ' + formatCurrency(comparison.annualEnergySpend.baseline) +
      ' → VoltPilot ' + formatCurrency(comparison.annualEnergySpend.voltpilot);
    refs.resultRevenueCompare.textContent =
      'Baseline ' + formatCurrency(comparison.marketRevenue.baseline) +
      ' → VoltPilot ' + formatCurrency(comparison.marketRevenue.voltpilot);
    refs.resultTotalCompare.textContent =
      'Baseline ' + formatCurrency(comparison.annualValue.baseline) +
      ' → VoltPilot ' + formatCurrency(comparison.annualValue.voltpilot);
    refs.resultCo2Compare.textContent =
      'Baseline ' + formatInteger(comparison.co2Tonnes.baseline) + ' tCO2e → VoltPilot ' + formatInteger(comparison.co2Tonnes.voltpilot) + ' tCO2e';
    refs.resultDispatchCompare.textContent =
      'Baseline ' + formatInteger(comparison.dispatchEvents.baseline) +
      ' → VoltPilot ' + formatInteger(comparison.dispatchEvents.voltpilot);
    refs.resultUptimeCompare.textContent =
      'Baseline ' + formatPercent(comparison.uptimePct.baseline, 3) +
      ' → VoltPilot ' + formatPercent(comparison.uptimePct.voltpilot, 3);
    refs.resultLocalPriceCompare.textContent =
      'Index ' + comparison.localPriceIndex.baseline.toFixed(1) +
      ' → ' + comparison.localPriceIndex.voltpilot.toFixed(1);
    refs.resultRenewablesMixCompare.textContent =
      'Baseline mix ' + formatPercent(comparison.renewableMixPct.baseline, 1) +
      ' → VoltPilot ' + formatPercent(comparison.renewableMixPct.voltpilot, 1);
    refs.resultPeakCompare.textContent =
      'Index ' + comparison.peakDemandIndex.baseline.toFixed(1) +
      ' → ' + comparison.peakDemandIndex.voltpilot.toFixed(1);
    refs.resultCarbonPctCompare.textContent =
      'Index ' + comparison.carbonIndex.baseline.toFixed(1) +
      ' → ' + comparison.carbonIndex.voltpilot.toFixed(1);
    refs.resultFossilCompare.textContent =
      'Index ' + comparison.fossilIndex.baseline.toFixed(1) +
      ' → ' + comparison.fossilIndex.voltpilot.toFixed(1);

    refs.scenarioSummary.textContent =
      activeScenario.summary +
      ' Baseline annual load ' +
      formatMwh(activeScenario.assumptions.annualBaselineMwh) +
      ', usable battery ' +
      formatInteger(activeScenario.assumptions.usableBatteryMwh) +
      ' MWh after reserve, round-trip efficiency ' +
      formatPercent(activeScenario.assumptions.roundTripEfficiencyPct, 1) +
      '. Confidence score: ' +
      activeScenario.outputs.confidenceScore +
      '/100.';

    refs.chartTotal.textContent =
      'Historic annualised value: ' +
      formatCurrency(activeScenario.outputs.totalAnnualValueGbp) +
      ' · Reserve ' +
      reserve.reservePct +
      '% · ' +
      automation.label +
      ' · ' +
      market.label +
      ' · ' +
      alignment.label +
      ' · Peak demand ↓ ' +
      formatPercent(activeScenario.outputs.peakDemandDecreasePct, 1);

    var maxMonth = activeScenario.outputs.monthlyValueProfile.reduce(function (max, item) {
      return Math.max(max, item.valueGbp);
    }, 0);

    if (meterScales) {
      setMeter(refs.meterCo2, activeScenario.outputs.annualCo2AvoidedTonnes, meterScales.co2);
      setMeter(refs.meterLocalPrice, activeScenario.outputs.localElectricityPriceReductionPct, meterScales.localPrice);
      setMeter(refs.meterRenewablesMix, activeScenario.outputs.datacentreRenewableMixIncreasePct, meterScales.renewablesMix);
      setMeter(refs.meterPeak, activeScenario.outputs.peakDemandDecreasePct, meterScales.peak);
      setMeter(refs.meterCarbonPct, activeScenario.outputs.carbonEmissionReductionPct, meterScales.carbonPct);
      setMeter(refs.meterFossil, activeScenario.outputs.fossilFuelReductionPct, meterScales.fossil);
    }

    var dailyPeaks = renderDailyComparisonChart(activeScenario, comparison);
    renderImpactComparisonChart(comparison);
    renderMonthlyChart(activeScenario.outputs.monthlyValueProfile, maxMonth);

    var londonAnnualCo2TonnesModel = 27000000;
    var londonPeakDemandMwModel = 6800;
    var londonHouseholdBillModelGbp = 1050;
    var co2Hours = (activeScenario.outputs.annualCo2AvoidedTonnes / londonAnnualCo2TonnesModel) * 8760;
    var carsEquivalent = activeScenario.outputs.annualCo2AvoidedTonnes / 4.6;
    var londonBillSaving = londonHouseholdBillModelGbp * (activeScenario.outputs.localElectricityPriceReductionPct / 100);
    var peakDropMw = dailyPeaks ? dailyPeaks.baselinePeak - dailyPeaks.voltpilotPeak : 0;
    var londonPeakShare = dailyPeaks && dailyPeaks.baselinePeak
      ? ((dailyPeaks.baselinePeak - dailyPeaks.voltpilotPeak) / londonPeakDemandMwModel) * 100
      : 0;
    var londonCarbonShare = (activeScenario.outputs.annualCo2AvoidedTonnes / londonAnnualCo2TonnesModel) * 100;
    var fossilIndexDrop = comparison.fossilIndex.baseline - comparison.fossilIndex.voltpilot;

    if (refs.resultCo2Context) {
      refs.resultCo2Context.textContent =
        'London context: ~' + co2Hours.toFixed(2) + ' hours of modelled London annual emissions, or ~' +
        formatInteger(carsEquivalent) + ' cars off-road for one year.';
    }

    if (refs.resultLocalPriceContext) {
      refs.resultLocalPriceContext.textContent =
        'London context: on a model £' + formatInteger(londonHouseholdBillModelGbp) + '/year bill, that is about £' +
        formatInteger(londonBillSaving) + ' saved annually.';
    }

    if (refs.resultRenewablesMixContext) {
      refs.resultRenewablesMixContext.textContent =
        'London context: datacentre renewable supply shifts from ' +
        formatPercent(comparison.renewableMixPct.baseline, 1) + ' to ' +
        formatPercent(comparison.renewableMixPct.voltpilot, 1) + '.';
    }

    if (refs.resultPeakContext) {
      refs.resultPeakContext.textContent =
        'London context: peak shaved by ' + peakDropMw.toFixed(1) +
        ' MW, about ' + formatPercent(londonPeakShare, 2) + ' of a modelled 6.8 GW London evening peak.';
    }

    if (refs.resultCarbonPctContext) {
      refs.resultCarbonPctContext.textContent =
        'London context: annual CO2 impact equals ' + formatPercent(londonCarbonShare, 3) +
        ' of a modelled London yearly emissions baseline.';
    }

    if (refs.resultFossilContext) {
      refs.resultFossilContext.textContent =
        'London context: fossil balancing index improves by ' + formatPercent(fossilIndexDrop, 1) +
        ' versus baseline dispatch behavior.';
    }
  }

  function handleSelection(dimension, value) {
    selectionState[dimension] = value;

    var buttons = refs.form.querySelectorAll('button[data-dimension="' + dimension + '"]');
    buttons.forEach(function (button) {
      var isActive = button.getAttribute('data-value') === value;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    updateResults();
  }

  function renderControls() {
    refs.form.innerHTML = '';

    dimensionOrder.forEach(function (dimensionId) {
      var options = scenariosData.dimensions[dimensionId];
      if (!options || !options.length) return;

      var group = document.createElement('fieldset');
      group.className = 'control-group';

      var legend = document.createElement('legend');
      legend.className = 'control-title';
      legend.textContent = prettyDimensionTitle(dimensionId);

      var controls = document.createElement('div');
      controls.className = 'control-options';

      options.forEach(function (option, index) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'control-pill';
        button.setAttribute('data-dimension', dimensionId);
        button.setAttribute('data-value', option.id);
        button.setAttribute('aria-pressed', index === 0 ? 'true' : 'false');
        button.textContent = option.label;
        if (index === 0) {
          button.classList.add('is-active');
        }

        if (option.description) {
          button.title = option.description;
        }

        button.addEventListener('click', function () {
          handleSelection(dimensionId, option.id);
        });

        controls.appendChild(button);
      });

      group.appendChild(legend);
      group.appendChild(controls);
      refs.form.appendChild(group);

      selectionState[dimensionId] = options[0].id;
    });
  }

  function resetToBaseline() {
    dimensionOrder.forEach(function (dimensionId) {
      var options = scenariosData.dimensions[dimensionId];
      if (!options || !options.length) return;
      handleSelection(dimensionId, options[0].id);
    });
  }

  function setupDatasetMeta() {
    var total = scenarioList.length;
    var payloadSize = Math.round((JSON.stringify(scenariosData).length / 1024) * 10) / 10;
    var period = scenariosData.historicEvidence && scenariosData.historicEvidence.period
      ? scenariosData.historicEvidence.period
      : 'historic representative GB market conditions';
    refs.datasetMeta.textContent =
      'Loaded ' + total + ' annualised historic scenarios · ' + payloadSize +
      ' KB payload · ' + period + ' · static GitHub Pages mode.';
  }

  function indexScenarios() {
    scenarioList.forEach(function (scenario) {
      scenarioIndex.set(scenario.key, scenario);
    });
  }

  function wireReset() {
    if (!refs.resetButton) return;
    refs.resetButton.addEventListener('click', function () {
      resetToBaseline();
    });
  }

  function init() {
    fetch('data/scenarios.json')
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Failed to load scenarios.json');
        }
        return response.json();
      })
      .then(function (payload) {
        scenariosData = payload;
        scenarioList = payload.scenarios || [];

        if (!scenarioList.length) {
          throw new Error('Scenario dataset is empty');
        }

        indexScenarios();
        buildMeterScales();
        renderMeterAxis();
        renderControls();
        wireReset();
        setupDatasetMeta();
        updateResults();
      })
      .catch(function (error) {
        refs.datasetMeta.textContent = 'Unable to load scenario dataset.';
        updateStatus('Dataset load failed: ' + error.message, true);
      });
  }

  init();
})();

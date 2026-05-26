(function () {
  var svg = document.getElementById('hero-market-chart');
  if (!svg) return;

  var NS = 'http://www.w3.org/2000/svg';
  var width = 620;
  var height = 430;
  var pad = { top: 32, right: 26, bottom: 52, left: 42 };
  var chartWidth = width - pad.left - pad.right;
  var chartHeight = height - pad.top - pad.bottom;

  function createNode(tag, attrs) {
    var node = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(function (key) {
      node.setAttribute(key, attrs[key]);
    });
    return node;
  }

  function x(hour) {
    return pad.left + (hour / 23.5) * chartWidth;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  var data = Array.from({ length: 48 }, function (_, i) {
    var hour = i / 2;
    var renewable =
      18 +
      13 * Math.exp(-Math.pow(hour - 10.5, 2) / 18) +
      4.5 * Math.exp(-Math.pow(hour - 7, 2) / 8) +
      2.5 * Math.exp(-Math.pow(hour - 13.5, 2) / 10);
    var price =
      86 +
      64 * Math.exp(-Math.pow(hour - 19.5, 2) / 8) -
      58 * Math.exp(-Math.pow(hour - 10, 2) / 7) +
      16 * Math.exp(-Math.pow(hour - 6, 2) / 9);

    return {
      hour: hour,
      renewable: clamp(renewable, 8, 44),
      price: clamp(price, 14, 190)
    };
  });

  var priceValues = data.map(function (d) {
    return d.price;
  });
  var renewableValues = data.map(function (d) {
    return d.renewable;
  });

  var priceMin = Math.min.apply(null, priceValues);
  var priceMax = Math.max.apply(null, priceValues);
  var renewableMin = Math.min.apply(null, renewableValues);
  var renewableMax = Math.max.apply(null, renewableValues);

  function yPrice(value) {
    return pad.top + chartHeight - ((value - priceMin) / (priceMax - priceMin)) * chartHeight;
  }

  function yRenewable(value) {
    return pad.top + chartHeight - ((value - renewableMin) / (renewableMax - renewableMin)) * chartHeight;
  }

  function buildPath(values, yScale) {
    return values
      .map(function (d, idx) {
        var cmd = idx === 0 ? 'M' : 'L';
        return cmd + x(d.hour).toFixed(2) + ' ' + yScale(d).toFixed(2);
      })
      .join(' ');
  }

  var backdrop = createNode('rect', {
    x: '0',
    y: '0',
    width: String(width),
    height: String(height),
    fill: '#ffffff'
  });

  var surplusShade = createNode('rect', {
    x: String(x(7)),
    y: String(pad.top),
    width: String(x(13) - x(7)),
    height: String(chartHeight),
    fill: '#e8f3ee'
  });

  var baseline = createNode('line', {
    x1: String(pad.left),
    y1: String(pad.top + chartHeight),
    x2: String(width - pad.right),
    y2: String(pad.top + chartHeight),
    stroke: 'rgba(28, 28, 26, 0.34)',
    'stroke-width': '1'
  });

  var pricePath = createNode('path', {
    d: buildPath(data.map(function (d) { return { hour: d.hour, value: d.price }; }), function (d) { return yPrice(d.value); }),
    fill: 'none',
    stroke: '#506070',
    'stroke-width': '2.2',
    'stroke-linejoin': 'round',
    'stroke-linecap': 'round',
    class: 'chart-line chart-line-price'
  });

  var renewablePath = createNode('path', {
    d: buildPath(data.map(function (d) { return { hour: d.hour, value: d.renewable }; }), function (d) { return yRenewable(d.value); }),
    fill: 'none',
    stroke: '#8c877e',
    'stroke-width': '2.2',
    'stroke-linejoin': 'round',
    'stroke-linecap': 'round',
    class: 'chart-line chart-line-renewable'
  });

  var chargeMarkerX = x(10.5);
  var chargeMarkerY = yPrice(
    data.find(function (d) {
      return d.hour === 10.5;
    }).price
  );

  var dischargeMarkerX = x(19);
  var dischargeMarkerY = yPrice(
    data.find(function (d) {
      return d.hour === 19;
    }).price
  );

  var chargeDot = createNode('circle', {
    cx: String(chargeMarkerX),
    cy: String(chargeMarkerY),
    r: '4',
    fill: '#1f3f66'
  });

  var dischargeDot = createNode('circle', {
    cx: String(dischargeMarkerX),
    cy: String(dischargeMarkerY),
    r: '4',
    fill: '#1f3f66'
  });

  function label(text, xPos, yPos, opts) {
    var textNode = createNode('text', {
      x: String(xPos),
      y: String(yPos),
      fill: opts && opts.color ? opts.color : '#3d3d3a',
      'font-size': opts && opts.size ? opts.size : '13',
      'font-family': opts && opts.serif ? "'Playfair Display', serif" : "'Libre Franklin', sans-serif"
    });
    if (opts && opts.anchor) {
      textNode.setAttribute('text-anchor', opts.anchor);
    }
    textNode.textContent = text;
    svg.appendChild(textNode);
  }

  svg.appendChild(backdrop);
  svg.appendChild(surplusShade);
  svg.appendChild(baseline);
  svg.appendChild(renewablePath);
  svg.appendChild(pricePath);
  svg.appendChild(chargeDot);
  svg.appendChild(dischargeDot);

  var ticks = [0, 6, 12, 18, 23];
  ticks.forEach(function (hourValue) {
    var tickLabel = createNode('text', {
      x: String(x(hourValue)),
      y: String(height - 20),
      'text-anchor': hourValue === 0 ? 'start' : hourValue === 23 ? 'end' : 'middle',
      fill: '#7a7a75',
      'font-size': '12',
      'font-family': "'Libre Franklin', sans-serif"
    });
    var display = String(hourValue).padStart(2, '0') + ':00';
    tickLabel.textContent = display;
    svg.appendChild(tickLabel);
  });

  var topAnnotationY = pad.top + 52;

  label('Wind + solar peak', x(8.2), topAnnotationY, {
    serif: true,
    color: '#4f4b45',
    size: '12',
    anchor: 'middle'
  });

  label('Battery charges here', chargeMarkerX + 8, chargeMarkerY - 8, {
    serif: true,
    color: '#1f3f66',
    size: '13'
  });

  label('Grid needs balancing here', x(17.4), topAnnotationY + 18, {
    serif: true,
    anchor: 'middle',
    color: '#4f4b45',
    size: '12'
  });

  var legendX2 = width - pad.right - 10;
  var legendX1 = legendX2 - 22;
  var legendTop = pad.top + 16;

  svg.appendChild(
    createNode('line', {
      x1: String(legendX1),
      y1: String(legendTop),
      x2: String(legendX2),
      y2: String(legendTop),
      stroke: '#506070',
      'stroke-width': '2'
    })
  );

  label('Wholesale price (£/MWh)', legendX2, legendTop + 4, {
    anchor: 'end',
    color: '#506070',
    size: '12'
  });

  svg.appendChild(
    createNode('line', {
      x1: String(legendX1),
      y1: String(legendTop + 22),
      x2: String(legendX2),
      y2: String(legendTop + 22),
      stroke: '#8c877e',
      'stroke-width': '2'
    })
  );

  label('Renewable generation (GW)', legendX2, legendTop + 26, {
    anchor: 'end',
    color: '#8c877e',
    size: '12'
  });

  var priceLength = pricePath.getTotalLength();
  var renewableLength = renewablePath.getTotalLength();
  pricePath.style.setProperty('--dash-length', String(priceLength));
  renewablePath.style.setProperty('--dash-length', String(renewableLength));
})();

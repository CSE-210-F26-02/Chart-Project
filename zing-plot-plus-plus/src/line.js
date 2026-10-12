/**
 * @typedef {object} Point
 * @property {Array<number>} coordinate - Array containing the X and Y coordinates of the point
 */

/**
 * @typedef {object} ChartData
 * @property {string} title - The title of the chart
 * @property {string} "x-axis-label" - The label for the X axis
 * @property {string} "y-axis-label" - The label for the Y axis
 * @property {Array<Point>} points - An array of points to display on the chart
 */

/**
 * Generates a line plot contained in an SVG HTML object.
 * 
 * @param {ChartData} chartData - JSON object following the chart format
 * @param {number} x - Width of the component
 * @param {number} y - Height of the component
 * @param {boolean} center - If true, chart frame is fixed by a center point. If false, fixed by left-bottom corner.
 * @param {number} centerX - Anchor coordinate X (e.g., what the value of the center/left of the X axis is).
 * @param {number} centerY - Anchor coordinate Y (e.g., what the value of the center/bottom of the Y axis is).
 * @param {number} rangeX - Range of displayed X values.
 * @param {number} rangeY - Range of displayed Y values.
 * @param {number} ticks - Number of displayed tick values per axis, result may have slightly less or more ticks due to rounding
 * @returns {string} - An SVG string component containing the chart.
 */
function normalizeChartData(chartData) {
  const points = (chartData?.points ?? []).map((point, index) => {
    if (Array.isArray(point)) {
      if (point.length < 2) {
        throw new Error(`Point ${index} must include an x and y value.`);
      }
      return {
        coordinate: [Number(point[0]), Number(point[1])],
      };
    }

    if (point && Array.isArray(point.coordinate)) {
      return {
        coordinate: [Number(point.coordinate[0]), Number(point.coordinate[1])],
      };
    }

    if (point && typeof point === "object") {
      return {
        coordinate: [Number(point.x ?? point[0]), Number(point.y ?? point[1])],
      };
    }

    throw new Error(`Point ${index} is not a valid coordinate pair.`);
  });

  return {
    title: chartData?.title ?? chartData?.["chart name"] ?? "Untitled Chart",
    "x-axis-label": chartData?.["x-axis-label"] ?? chartData?.xAxis ?? chartData?.["x axis"] ?? "X",
    "y-axis-label": chartData?.["y-axis-label"] ?? chartData?.yAxis ?? chartData?.["y axis"] ?? "Y",
    points,
  };
}

function line(chartData, x, y, center, centerx, centery, rangeX, rangeY, ticks, sortByX = false) {
  const normalizedChart = normalizeChartData(chartData);
  const points = sortByX
    ? [...normalizedChart.points].sort((a, b) => a.coordinate[0] - b.coordinate[0])
    : normalizedChart.points;

  const minDim = Math.min(x, y);

  const sizes = {
    tickFont: minDim * 0.022,
    labelFont: minDim * 0.03,
    titleFont: minDim * 0.04,
    pointRadius: Math.max(minDim * 0.008, 1.5),
    axisStroke: Math.max(minDim * 0.003, 0.5),
    gridStroke: Math.max(minDim * 0.0015, 0.25),
    gridDash: Math.max(minDim * 0.008, 2),
    lineStroke: Math.max(minDim * 0.0035, 1.5),
  };

  const margin = {
    top: minDim * 0.08,
    right: minDim * 0.05,
    bottom: minDim * 0.12,
    left: minDim * 0.20,
  };

  const plotWidth = x - margin.left - margin.right;
  const plotHeight = y - margin.top - margin.bottom;

  let domainMinX, domainMaxX, domainMinY, domainMaxY;
  if (center === true) {
    domainMinX = centerx - (rangeX / 2);
    domainMaxX = centerx + (rangeX / 2);
    domainMinY = centery - (rangeY / 2);
    domainMaxY = centery + (rangeY / 2);
  } else {
    domainMinX = centerx;
    domainMaxX = centerx + rangeX;
    domainMinY = centery;
    domainMaxY = centery + rangeY;
  }

  const scaleX = (val) => margin.left + ((val - domainMinX) / rangeX) * plotWidth;
  const scaleY = (val) => margin.top + plotHeight - ((val - domainMinY) / rangeY) * plotHeight;

  const getTicks = (min, max, maxTicks) => {
    const range = max - min;
    const roughStep = range / maxTicks;
    const stepPower = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const normalizedStep = roughStep / stepPower;

    let multiplier = 1;
    if (normalizedStep >= 1.5 && normalizedStep < 3) multiplier = 2;
    else if (normalizedStep >= 3 && normalizedStep < 7) multiplier = 5;
    else if (normalizedStep >= 7) multiplier = 10;

    const step = stepPower * multiplier;
    const startTick = Math.ceil(min / step) * step;
    const numTicks = Math.floor((max - startTick) / step + 1e-6) + 1;

    const ticksList = [];
    for (let i = 0; i < numTicks; i++) {
      ticksList.push(startTick + (i * step));
    }
    return ticksList;
  };

  const xTicks = getTicks(domainMinX, domainMaxX, ticks);
  const yTicks = getTicks(domainMinY, domainMaxY, ticks);

  const formatAxisNumber = (num) => {
    if (num === 0) return "0";
    const absNum = Math.abs(num);
    if (absNum >= 1e6 || absNum <= 1e-4) {
      return num.toExponential(2);
    }
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(num);
  };

  const polylinePoints = points
    .map((point) => {
      const [px, py] = point.coordinate;
      return `${scaleX(px)},${scaleY(py)}`;
    })
    .join(" ");

  let svg = `<svg class="chart-svg" width="${x}" height="${y}" viewBox="0 0 ${x} ${y}" xmlns="http://www.w3.org/2000/svg">
        <style>
            .grid-line { stroke: #e0e0e0; stroke-width: ${sizes.gridStroke}; stroke-dasharray: ${sizes.gridDash}; }
            .axis-line { stroke: #333; stroke-width: ${sizes.axisStroke}; }
            .axis-text { font-family: sans-serif; font-size: ${sizes.tickFont}px; fill: #555; text-anchor: middle; }
            .label-text { font-family: sans-serif; font-size: ${sizes.labelFont}px; font-weight: bold; fill: #333; text-anchor: middle; }
            .title-text { font-family: sans-serif; font-size: ${sizes.titleFont}px; font-weight: bold; fill: #111; text-anchor: middle; }
            .point { fill: #3498db; stroke: #2980b9; stroke-width: ${Math.max(sizes.axisStroke / 2, 0.5)}; opacity: 0.8; }
            .line-path { fill: none; stroke: #2980b9; stroke-width: ${sizes.lineStroke}; stroke-linecap: round; stroke-linejoin: round; }
        </style>
        
        <defs>
            <clipPath id="plot-clip">
                <rect x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" />
            </clipPath>
        </defs>

        <rect width="${x}" height="${y}" fill="#ffffff" />`;

  xTicks.forEach((tick) => {
    const px = scaleX(tick);
    const textY = margin.top + plotHeight + (margin.bottom * 0.35);
    svg += `
            <line x1="${px}" y1="${margin.top}" x2="${px}" y2="${margin.top + plotHeight}" class="grid-line" />
            <text x="${px}" y="${textY}" class="axis-text">${formatAxisNumber(tick)}</text>
        `;
  });

  yTicks.forEach((tick) => {
    const py = scaleY(tick);
    const textX = margin.left - (margin.left * 0.30);
    const textY = py + (sizes.tickFont * 0.3);
    svg += `
            <line x1="${margin.left}" y1="${py}" x2="${margin.left + plotWidth}" y2="${py}" class="grid-line" />
            <text x="${textX}" y="${textY}" class="axis-text" text-anchor="end">${formatAxisNumber(tick)}</text>
        `;
  });

  svg += `
        <line x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${margin.left + plotWidth}" y2="${margin.top + plotHeight}" class="axis-line" />
        <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotHeight}" class="axis-line" />
    `;

  const titleY = margin.top * 0.6;
  const xLabelY = y - (margin.bottom * 0.15);
  const yLabelX = margin.left * 0.25;
  const yLabelY = margin.top + (plotHeight / 2);

  svg += `
        <text x="${x / 2}" y="${titleY}" class="title-text">${normalizedChart.title}</text>
        <text x="${margin.left + (plotWidth / 2)}" y="${xLabelY}" class="label-text">${normalizedChart['x-axis-label']}</text>
        <text x="${yLabelX}" y="${yLabelY}" class="label-text" transform="rotate(-90, ${yLabelX}, ${yLabelY})">${normalizedChart['y-axis-label']}</text>
    `;

  svg += `<g clip-path="url(#plot-clip)">`;
  svg += `<polyline class="line-path" points="${polylinePoints}" />`;

  points.forEach((point) => {
    const [px, py] = point.coordinate;
    svg += `<circle cx="${scaleX(px)}" cy="${scaleY(py)}" r="${sizes.pointRadius}" data-x="${px}" data-y="${py}" class="point" />`;
  });

  svg += `</g></svg>`;

  return svg;
}

export default line;

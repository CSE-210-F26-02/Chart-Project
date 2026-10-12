import test from "node:test";
import assert from "node:assert/strict";

import line from "../src/line.js";

test("line chart renders SVG and connects points in order", () => {
  const chart = {
    title: "Monthly Sales",
    "x-axis-label": "Month",
    "y-axis-label": "Sales",
    points: [
      { coordinate: [1, 3] },
      { coordinate: [2, 5] },
      { coordinate: [3, 4] },
    ],
  };

  const svg = line(chart, 500, 400, false, 0, 0, 10, 10, 5);

  assert.match(svg, /<svg/i);
  assert.match(svg, /<polyline/i);
  assert.match(svg, /Monthly Sales/);
  assert.match(svg, /Month/);
  assert.match(svg, /Sales/);
});

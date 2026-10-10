(function () {
  'use strict';
  var XZ = window.XZ;
  function round(n) { return Math.round(n * 100) / 100; }
  function interpolate(points, x) {
    if (x <= points[0].x) { return points[0].y; }
    for (var i = 1; i < points.length; i += 1) {
      if (x <= points[i].x) { var a = points[i - 1], b = points[i]; return a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x); }
    }
    return points[points.length - 1].y;
  }
  function series(real, demo, valid) { return Array.isArray(real.value) && valid(real.value) ? real : demo; }
  XZ.rules = { round: round, interpolate: interpolate, series: series };
}());

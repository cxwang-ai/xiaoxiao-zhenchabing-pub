(function () {
  'use strict';
  var XZ = window.XZ;
  function round(n) { return Math.round(n * 100) / 100; }
  function option(dimensions, key, id) {
    var dimension = dimensions.find(function (item) { return item.id === key; });
    return dimension && dimension.options.find(function (item) { return item.id === id; });
  }
  function outcome(entry, loss, cost, days, stars, explanations, complete) {
    entry = { energy: Math.round(entry.energy), supplies: Math.round(entry.supplies), days: Math.round(entry.days) };
    loss = Math.round(loss); cost = Math.round(cost); days = Math.round(days);
    var remaining = { energy: Math.max(0, entry.energy - loss), supplies: Math.max(0, entry.supplies - cost), days: entry.days + days };
    var failure = remaining.energy <= 0 || cost > entry.supplies;
    if (cost > entry.supplies) { explanations = explanations.concat('物资不足，本关失败；重试恢复本关出发前资源，请调整准备或路线。'); }
    var success = !failure && complete !== false;
    return { success: success, failure: failure, stars: success ? stars : 0, remaining: remaining,
      delta: { energy: remaining.energy - entry.energy, supplies: remaining.supplies - entry.supplies, days: days },
      explanations: explanations, requiredSupplies: cost, loss: loss };
  }
  function interpolate(points, x) {
    if (x <= points[0].x) { return points[0].y; }
    for (var i = 1; i < points.length; i += 1) {
      if (x <= points[i].x) { var a = points[i - 1], b = points[i]; return a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x); }
    }
    return points[points.length - 1].y;
  }
  function series(real, demo, valid) { return Array.isArray(real.value) && valid(real.value) ? real : demo; }
  XZ.rules = { round: round, option: option, outcome: outcome, interpolate: interpolate, series: series };
}());

(function () {
  'use strict';
  var XZ = window.XZ, shared = XZ.rules;
  var level = XZ.data.levels.find(function (item) { return item.id === 'caodi'; });
  var clues = level.exploration.clues;
  function climateData() { return shared.series(level.dailyTemperature, level.exploration.demoTemperature, function (points) { return points.length >= 2 && points.every(function (p, i) { return Number.isFinite(p.x) && Number.isFinite(p.y) && (i === 0 || p.x > points[i - 1].x); }); }); }
  function temperature(hour) { return shared.interpolate(climateData().value, hour); }
  function temperatureRange() { var ys = climateData().value.map(function (p) { return p.y; }); return Math.max.apply(null, ys) - Math.min.apply(null, ys); }
  function neighbors(index, size, rows) { rows = rows || size; var result = []; if (index % size > 0) { result.push(index - 1); } if (index % size < size - 1) { result.push(index + 1); } if (index >= size) { result.push(index - size); } if (index < size * (rows - 1)) { result.push(index + size); } return result; }
  // BFS 只用于生成与测试，界面不公开隐藏的 hazard 属性或保底路线。
  function safePath(map) {
    var queue = [map.start], prev = {}; prev[map.start] = null;
    for (var head = 0; head < queue.length; head += 1) {
      var at = queue[head];
      if (at === map.end) { var path = []; while (at !== null) { path.unshift(at); at = prev[at]; } return path; }
      neighbors(at, map.size, map.rows).forEach(function (next) { if (!map.cells[next].hazard && !Object.prototype.hasOwnProperty.call(prev, next)) { prev[next] = at; queue.push(next); } });
    }
    return null;
  }
  function generate(seed, options) {
    options = options || {};
    var rng = XZ.engine.rng(seed), size = options.columns || level.arcade.columns.value, rows = options.rows || size;
    function cell(index, safe) {
      var clue = safe ? clues[0] : clues[options.hummockShare ? (rng() < options.hummockShare ? 0 : 1 + Math.floor(rng() * (clues.length - 1))) : Math.floor(rng() * clues.length)];
      return { index: index, clue: clue.id, hazard: safe ? false : rng() < clue.probability.value };
    }
    var map = { seed: seed >>> 0, size: size, rows: rows, start: options.north ? (rows - 1) * size + Math.floor(size / 2) : 0, end: options.north ? Math.floor(size / 2) : size * rows - 1, cells: [] };
    for (var i = 0; i < size * rows; i += 1) { map.cells.push(cell(i, false)); }
    if (options.north) {
      map.cells.forEach(function (c, i) { if (i < size || i >= (rows - (options.tutorialRows || 1)) * size) { map.cells[i] = cell(i, true); } });
    }
    map.cells[map.start] = cell(map.start, true); map.cells[map.end] = cell(map.end, true);
    if (!safePath(map)) {
      // 随机铺一条单调安全通道，并重设可观察线索；再由 BFS 验证。
      var at = map.start;
      while (at !== map.end) {
        if (options.north) {
          var col = at % size, goal = map.end % size;
          at += col !== goal && rng() < 0.25 ? (col < goal ? 1 : -1) : at >= size ? -size : (col < goal ? 1 : -1);
        } else {
          var right = at % size < size - 1, down = at < size * (rows - 1);
          at += right && (!down || rng() < 0.5) ? 1 : size;
        }
        map.cells[at] = cell(at, true);
      }
    }
    if (!safePath(map)) { throw new Error('地图缺少安全路径'); }
    return map;
  }
  XZ.levels = XZ.levels || {};
  XZ.levels.caodi = { climateData: climateData, temperature: temperature, temperatureRange: temperatureRange, neighbors: neighbors, safePath: safePath, generate: generate };
}());

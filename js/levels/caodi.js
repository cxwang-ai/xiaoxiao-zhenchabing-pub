(function () {
  'use strict';
  var XZ = window.XZ, shared = XZ.rules;
  var level = XZ.data.levels.find(function (item) { return item.id === 'caodi'; });
  var rules = level.rules, clues = level.exploration.clues;
  function climateData() { return shared.series(level.dailyTemperature, level.exploration.demoTemperature, function (points) { return points.length >= 2 && points.every(function (p, i) { return Number.isFinite(p.x) && Number.isFinite(p.y) && (i === 0 || p.x > points[i - 1].x); }); }); }
  function temperature(hour) { return shared.interpolate(climateData().value, hour); }
  function temperatureRange() { var ys = climateData().value.map(function (p) { return p.y; }); return Math.max.apply(null, ys) - Math.min.apply(null, ys); }
  function random(seed) { var state = seed >>> 0; return function () { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; }; }
  function neighbors(index, size) { var result = []; if (index % size > 0) { result.push(index - 1); } if (index % size < size - 1) { result.push(index + 1); } if (index >= size) { result.push(index - size); } if (index < size * (size - 1)) { result.push(index + size); } return result; }
  // BFS 只用于生成与测试，界面不公开隐藏的 hazard 属性或保底路线。
  function safePath(map) {
    var queue = [map.start], prev = {}; prev[map.start] = null;
    for (var head = 0; head < queue.length; head += 1) {
      var at = queue[head];
      if (at === map.end) { var path = []; while (at !== null) { path.unshift(at); at = prev[at]; } return path; }
      neighbors(at, map.size).forEach(function (next) { if (!map.cells[next].hazard && !Object.prototype.hasOwnProperty.call(prev, next)) { prev[next] = at; queue.push(next); } });
    }
    return null;
  }
  function generate(seed) {
    var rng = random(seed), size = rules.size.value;
    function cell(index, safe) {
      var clue = safe ? clues[0] : clues[Math.floor(rng() * clues.length)];
      return { index: index, clue: clue.id, hazard: safe ? false : rng() < clue.probability.value };
    }
    var map = { seed: seed >>> 0, size: size, start: 0, end: size * size - 1, cells: [] };
    for (var i = 0; i < size * size; i += 1) { map.cells.push(cell(i, false)); }
    map.cells[map.start] = cell(map.start, true); map.cells[map.end] = cell(map.end, true);
    if (!safePath(map)) {
      // 随机铺一条单调安全通道，并重设可观察线索；再由 BFS 验证。
      var at = map.start;
      while (at !== map.end) {
        var right = at % size < size - 1, down = at < size * (size - 1);
        at += right && (!down || rng() < 0.5) ? 1 : size;
        map.cells[at] = cell(at, true);
      }
    }
    if (!safePath(map)) { throw new Error('地图缺少安全路径'); }
    return map;
  }
  function preparation(id) { return rules.preparations.find(function (p) { return p.id === id; }); }
  function visibility(map, path, probes) {
    var at = path[path.length - 1], adjacent = neighbors(at, map.size);
    return map.cells.map(function (cell) {
      var visited = path.indexOf(cell.index) !== -1, visible = visited || adjacent.indexOf(cell.index) !== -1;
      var confirmed = visited || (probes || []).indexOf(cell.index) !== -1;
      return { index: cell.index, visible: visible, clue: visible ? cell.clue : null,
        safety: confirmed ? (cell.hazard ? 'hazard' : 'safe') : null };
    });
  }
  function evaluate(map, path, id, entry, probes) {
    probes = probes || [];
    var prep = preparation(id);
    if (!prep || !Array.isArray(path) || path[0] !== map.start || !Array.isArray(probes) || probes.some(function (index, i) { return !Number.isInteger(index) || !map.cells[index] || probes.indexOf(index) !== i; })) { return null; }
    var hazards = 0, reasons = [];
    for (var i = 1; i < path.length; i += 1) {
      if (neighbors(path[i - 1], map.size).indexOf(path[i]) === -1) { return null; }
      if (map.cells[path[i]].hazard) {
        hazards += 1;
        var clue = clues.find(function (c) { return c.id === map.cells[path[i]].clue; });
        reasons.push('踩到第 ' + (path[i] + 1) + ' 格的松软沼泽，扣体力 ' + rules.hazardLoss.value + '。线索“' + clue.label + '”只有概率意义：' + clue.explanation);
      }
    }
    var steps = path.length - 1, climateLoss = temperatureRange() * prep.climateFactor.value;
    var loss = climateLoss + steps * rules.stepEnergy.value + hazards * rules.hazardLoss.value;
    var cost = prep.cost.value + steps * rules.stepSupplies.value + probes.length * rules.probeSupplies.value;
    var complete = path[path.length - 1] === map.end;
    var stars = hazards === 0 && steps <= rules.highSteps.value ? 3 : hazards <= rules.midHazards.value ? 2 : 1;
    var result = shared.outcome(entry, loss, cost, complete ? rules.travelDays.value : 0, stars, [
      '同一气温曲线的昼夜温差 ' + temperatureRange() + ' °C × 补给系数 ' + prep.climateFactor.value + ' = 体力消耗 ' + climateLoss.toFixed(1) + '。',
      '已走 ' + steps + ' 步：每步物资 ' + rules.stepSupplies.value + '、体力 ' + rules.stepEnergy.value + '。线索来自探索面板的同一概率表，不能保证绝对安全。',
      '已试探 ' + probes.length + ' 格 × 每格物资 ' + rules.probeSupplies.value + ' = ' + probes.length * rules.probeSupplies.value + '。探杆确认隐患，供你绕路避免体力损失；补给越多，温差消耗越低，但余下物资越少。'
    ].concat(reasons), complete);
    result.steps = steps; result.hazards = hazards;
    return result;
  }
  function step(map, path, next, id, entry, probes) {
    var previous = evaluate(map, path, id, entry, probes);
    if (!previous || previous.success || previous.failure || neighbors(path[path.length - 1], map.size).indexOf(next) === -1) { return null; }
    return evaluate(map, path.concat(next), id, entry, probes);
  }
  function probe(map, path, next, id, entry, probes) {
    probes = probes || [];
    var previous = evaluate(map, path, id, entry, probes);
    if (!previous || previous.success || previous.failure || neighbors(path[path.length - 1], map.size).indexOf(next) === -1 || probes.indexOf(next) !== -1 || path.indexOf(next) !== -1 || previous.remaining.supplies < rules.probeSupplies.value) { return null; }
    var updated = probes.concat(next);
    return { probes: updated, safe: !map.cells[next].hazard, result: evaluate(map, path, id, entry, updated) };
  }
  XZ.levels = XZ.levels || {};
  XZ.levels.caodi = { climateData: climateData, temperature: temperature, temperatureRange: temperatureRange, random: random, neighbors: neighbors, safePath: safePath, generate: generate, visibility: visibility, evaluate: evaluate, step: step, probe: probe };
}());

(function () {
  'use strict';
  var XZ = window.XZ, terrain = XZ.levels.caodi;
  var directions = {up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0]};
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function point(s, index) { return {x: index % s.map.size, y: Math.floor(index / s.map.size)}; }
  function target(s, direction) {
    var d = directions[direction], p = s.player, x = p.x + d[0], y = p.y + d[1];
    return x >= 0 && x < s.map.size && y >= 0 && y < s.map.rows ? y * s.map.size + x : null;
  }
  function observe(s) {
    // 只导出玩家能看见的线索与已经确认的信息；渲染和普通机器人不读 hazard。
    return s.map.cells.map(function (cell) {
      var p = point(s, cell.index), visible = Math.max(Math.abs(p.x - s.player.x), Math.abs(p.y - s.player.y)) <= s.vision;
      return {index: cell.index, x: p.x, y: p.y, visible: visible, clue: visible ? cell.clue : null,
        safety: visible && Object.prototype.hasOwnProperty.call(s.confirmed, cell.index) ? s.confirmed[cell.index] : null};
    });
  }
  function climate(s) {
    s.hour = (s.config.startHour.value + s.elapsed / s.config.daySeconds.value * 24) % 24;
    s.temperature = terrain.temperature(s.hour);
    s.night = s.hour >= 20 || s.hour < 6;
    s.vision = s.night ? s.config.nightVision.value : s.config.vision.value;
    s.weather = s.weatherEvents.find(function (w) { return s.elapsed >= w.start && s.elapsed < w.end; }) || null;
    s.hud = {hour: s.hour, temperature: s.temperature, range: terrain.temperatureRange(), progress: 1 - s.player.y / (s.map.rows - 1)};
  }
  function energyRate(s) { return s.tuning.idleDrain.value + Math.max(0, s.config.coldThreshold.value - s.temperature) * s.config.coldDrain.value * s.tuning.coldFactor.value; }
  function createState(options) {
    var c = options.level.arcade, difficulty = options.difficulty === 'easy' ? 'easy' : 'standard';
    var seed = options.seed === undefined ? c.chestSeed.value : options.seed;
    var map = terrain.generate(seed, {columns: c.columns.value, rows: c.rows.value, north: true, hummockShare: c.hummockShare.value, tutorialRows: c.tutorialRows.value});
    var energy = clamp(XZ.challenge.resources(options).energy, 0, XZ.data.game.maxResource.value), rng = XZ.engine.rng(seed ^ 0x43414f44);
    // 基础行进补给先携带并消耗；余下物资才用于道具，重试由宿主恢复快照。
    var travelSupplies = Math.min(options.resources.supplies, c.difficulties[difficulty].travelSupplies.value);
    var itemSupplies = options.resources.supplies - travelSupplies;
    var s = {config: c, tuning: c.difficulties[difficulty], difficulty: difficulty, entry: Object.assign({}, options.resources), usedSupplement: Boolean(options.usedSupplement), map: map,
      elapsed: 0, energy: energy, energyMax: energy, travelSupplies: travelSupplies, suppliesUsed: travelSupplies, probes: Math.min(c.probeLimit.value, Math.floor(itemSupplies / c.probeCost.value)), bonusProbes: Math.max(0, c.minimumProbes.value - Math.floor(itemSupplies / c.probeCost.value)), probesUsed: 0, hazardsConfirmed: 0, rescued: 0, stragglers: 0, pendingIncidents: [], lastSafe: map.start,
      rations: Math.min(c.entryRations.value, Math.floor(itemSupplies / c.rationCost.value)), bonusRations: Math.max(0, c.minimumRations.value - Math.floor(itemSupplies / c.rationCost.value)), rationsUsed: 0,
      player: Object.assign(point({map: map}, map.start), {facing: 'up'}), trace: [map.start, map.start, map.start, map.start], companions: [],
      confirmed: {}, guidance: null, cooldown: c.difficulties[difficulty].stepSeconds.value, tween: 0, previousActors: [], steps: 0, traps: 0, trapped: null,
      over: energy <= 0, success: false, failure: energy <= 0 ? '体力耗尽' : '', activeChest: null, chests: [], rewardBudget: {used: 0, limit: c.quizRewardLimit.value},
      weatherEvents: [], milestone: {text: '', remaining: 0, source: '', status: ''}, milestoneCounts: [0, 0], feedback: {text: '', remaining: 0}};
    s.confirmed[map.start] = 'safe';
    for (var i = 0; i < 3; i += 1) { s.companions.push(Object.assign(point(s, map.start), {dropped: false})); }
    s.previousActors = [point(s, map.start)].concat(s.companions.map(function (p) { return Object.assign({}, p); }));
    for (var start = c.weatherEvery.value; start < s.tuning.timeLimit.value; start += c.weatherEvery.value) {
      if (rng() < c.weatherChance.value) { s.weatherEvents.push({start: start, end: start + c.weatherSeconds.value, kind: rng() < 0.5 ? '阵雨' : '冰雹'}); }
    }
    // BFS 起点连通的安全格才可放箱子；排除会提前通关的北缘，不向玩家暴露安全路线。
    var queue = [map.start], reached = {}; reached[map.start] = true;
    for (var head = 0; head < queue.length; head += 1) {
      terrain.neighbors(queue[head], map.size, map.rows).forEach(function (next) {
        if (next >= map.size && !map.cells[next].hazard && !reached[next]) { reached[next] = true; queue.push(next); }
      });
    }
    var questions = XZ.quiz.pickQuestions(options.level.id, c.chestCount.value, rng);
    var candidates = queue.filter(function (index) { return index !== map.start && index !== map.end; }).map(function (index) { return Object.assign(point(s, index), {index: index}); });
    s.chests = XZ.quiz.placeChests(candidates, questions.length, rng).map(function (p, i) {
      return {x: p.x, y: p.y, index: p.index, question: questions[i], kind: i % 2 ? 'ration' : 'probe', opened: false};
    });
    climate(s); XZ.challenge.attach(s, function (reason) {
      // 掉队者保留原位；扣命不重置已完成的救援、脚印账本或掉队状态。
      if (reason === '队友掉队') { return; }
      var index = s.lastSafe;
      s.player = Object.assign(point(s, index), {facing: 'up'});
      s.trace = [index, index, index, index];
      s.companions.forEach(function (p) { if (!p.dropped) { Object.assign(p, point(s, index)); } });
      s.previousActors = [point(s, index)].concat(s.companions.map(function (p) { return Object.assign({}, p); }));
      s.trapped = null; s.guidance = null; s.pendingIncidents = []; s.tween = 0;
      s.cooldown = s.tuning.stepSeconds.value;
      s.energy = s.energyMax * XZ.data.game.challenge.recoveryEnergy.value; climate(s);
    }); return s;
  }
  function notify(s, text) { s.feedback = {text: text, remaining: 3}; }
  function probe(s) {
    var next = target(s, s.player.facing), c = s.config;
    if (next === null) { notify(s, '前方已到草地边缘'); return; }
    if (Object.prototype.hasOwnProperty.call(s.confirmed, next)) { notify(s, s.confirmed[next] === 'safe' ? '这一格已确认安全' : '这一格已确认危险'); return; }
    if (s.probes + s.bonusProbes <= 0 || (s.bonusProbes === 0 && s.entry.supplies - s.suppliesUsed < c.probeCost.value)) { notify(s, '探杆次数用完，优先找草墩'); return; }
    if (s.bonusProbes > 0) { s.bonusProbes -= 1; }
    else { s.probes -= 1; s.suppliesUsed += c.probeCost.value; }
    s.probesUsed += 1; s.confirmed[next] = s.map.cells[next].hazard ? 'hazard' : 'safe';
    if (s.confirmed[next] === 'hazard') { s.hazardsConfirmed += 1; }
    notify(s, s.confirmed[next] === 'safe' ? '探杆：安全，可以落脚' : '探杆：危险，试着绕路');
  }
  function ration(s) {
    var c = s.config;
    if (s.energy > s.energyMax * c.rationThreshold.value || s.rations + s.bonusRations <= 0) { return; }
    if (s.bonusRations > 0) { s.bonusRations -= 1; }
    else if (s.entry.supplies - s.suppliesUsed >= c.rationCost.value) { s.rations -= 1; s.suppliesUsed += c.rationCost.value; }
    else { s.rations = 0; return; }
    s.probes = Math.min(s.probes, Math.floor((s.entry.supplies - s.suppliesUsed) / c.probeCost.value));
    s.rationsUsed += 1; s.energy = Math.min(s.energyMax, s.energy + c.rationEnergy.value); notify(s, '自动吃干粮，恢复体力');
  }
  function milestone(s, index) {
    if (s.milestoneCounts[index]) { return; }
    s.milestoneCounts[index] += 1;
    var quote = XZ.data.quiz.find(function (q) { return q.id === (index ? 'cd-s1' : 'cd-h3'); });
    if (quote) { s.milestone = {text: quote.quote, source: quote.source, status: quote.status, remaining: s.config.milestoneDuration.value}; }
  }
  function adjacent(s) {
    return s.trapped && (s.trapped.actor === 0 || Math.abs(s.player.x - s.trapped.x) + Math.abs(s.player.y - s.trapped.y) === 1);
  }
  function guide(s, kind) {
    s.guidance = null;
    if (s.over) { return; }
    var rescue = kind === 'rescue', trapped = s.trapped;
    if (rescue && (!trapped || !trapped.actor)) { return; }
    if (rescue && adjacent(s)) {
      s.guidance = {kind: kind, index: null, direction: 'secondary', text: '已靠近队友，按住救援（Shift / X）拉出。'}; return;
    }
    // 只在险情后提供一个真实安全的下一步，优先选能通向目标的安全路线。
    var start = s.player.y * s.map.size + s.player.x, size = s.map.cells.length;
    var costs = Array(size).fill(Infinity), previous = Array(size).fill(null), visited = {};
    costs[start] = 0;
    var end = null, blocked = rescue ? trapped.y * s.map.size + trapped.x : null;
    for (var count = 0; count < size; count += 1) {
      var at = -1;
      for (var i = 0; i < size; i += 1) { if (!visited[i] && (at === -1 || costs[i] < costs[at])) { at = i; } }
      if (at === -1 || !Number.isFinite(costs[at])) { break; }
      var p = point(s, at);
      if (rescue ? Math.abs(p.x - trapped.x) + Math.abs(p.y - trapped.y) === 1 : p.y === 0) { end = at; break; }
      visited[at] = true;
      terrain.neighbors(at, s.map.size, s.map.rows).forEach(function (next) {
        if (next === blocked || visited[next]) { return; }
        var cost = costs[at] + 1 + (s.map.cells[next].hazard ? size + 1 : 0);
        if (cost < costs[next]) { costs[next] = cost; previous[next] = at; }
      });
    }
    if (end === null || end === start) { return; }
    var path = [];
    for (var step = end; step !== start; step = previous[step]) { path.unshift(step); }
    // 极端围困时补齐最少的安全落脚格，确保帮助提示不会指向另一个泥潭。
    path.forEach(function (index) { s.map.cells[index].hazard = false; });
    var next = path[0], dest = point(s, next), delta = next - start;
    var direction = delta === -s.map.size ? 'up' : delta === s.map.size ? 'down' : delta === 1 ? 'right' : 'left';
    var label = {up: '↑ 北', down: '↓ 南', left: '← 西', right: '东 →'}[direction];
    s.confirmed[next] = 'safe';
    s.guidance = {kind: kind, index: next, x: dest.x, y: dest.y, direction: direction,
      text: '下一步：' + label + '，走一格到箭头框处。' + (rescue ? '靠近队友后按住救援。' : '这是安全格，可继续向北。')};
  }
  function trap(s, actor, index) {
    var p = point(s, index);
    s.trapped = {progress: 0, actor: actor, x: p.x, y: p.y, remaining: s.tuning.rescueSeconds.value, duration: s.tuning.rescueSeconds.value};
    if (actor) { Object.assign(s.companions[actor - 1], p); s.cooldown = Math.min(s.cooldown, s.tuning.stepSeconds.value * s.config.rescueStepFactor.value); }
    if (actor) { guide(s, 'rescue'); } else { s.guidance = null; }
    notify(s, actor ? '队友陷入！先到相邻格，再按住救援' : '领队陷入！按住救援自救');
  }
  function move(s, direction) {
    var next = target(s, direction);
    if (next === null || (s.trapped && next === s.trapped.y * s.map.size + s.trapped.x)) { return; }
    // 回救只沿已确认的脚印或试探格靠近，不可借救援状态穿过新隐患。
    if (s.trapped && !Object.prototype.hasOwnProperty.call(s.confirmed, next)) { notify(s, '先沿已走脚印回到队友相邻格'); return; }
    var guidance = s.guidance;
    s.previousActors = [Object.assign({}, s.player)].concat(s.companions.map(function (p) { return Object.assign({}, p); }));
    var probedSafe = s.confirmed[next] === 'safe', p = point(s, next);
    s.player.x = p.x; s.player.y = p.y; s.steps += 1;
    s.trace.push(next); if (s.trace.length > 4) { s.trace.shift(); }
    if (!s.trapped) {
      s.companions.forEach(function (actor, i) { if (!actor.dropped) { Object.assign(actor, point(s, s.trace[s.trace.length - 2 - i])); } });
    }
    s.tween = s.config.tweenSeconds.value;
    s.cooldown = s.trapped ? s.tuning.stepSeconds.value * s.config.rescueStepFactor.value : s.tuning.stepSeconds.value * (s.weather ? s.tuning.weatherSlow.value : 1) * (probedSafe ? s.config.confirmedStepFactor.value : 1);
    s.energy = Math.max(0, s.energy - s.tuning.stepDrain.value);
    s.confirmed[next] = s.map.cells[next].hazard ? 'hazard' : 'safe';
    if (!s.map.cells[next].hazard) { s.lastSafe = next; }
    if (s.map.cells[next].hazard && !s.trapped) {
      s.traps += 1; trap(s, 0, next);
      if (s.traps % s.config.followerIncidentEvery.value === 0) { s.pendingIncidents.push({index: next, step: s.steps + s.config.followerLag.value}); }
    }
    if (guidance && s.guidance === guidance) {
      if (guidance.kind === 'continue' && next === guidance.index) { s.guidance = null; notify(s, '已到安全格，继续向北到出口'); }
      else { guide(s, guidance.kind); }
    }
    followerIncident(s);
  }
  function followerIncident(s) {
    if (s.over || s.trapped) { return; }
    // 北缘整排是安全出口；抵达后直接带队离开，不再触发延迟险情。
    if (s.player.y === 0) { s.pendingIncidents = []; return; }
    while (s.pendingIncidents.length && s.steps >= s.pendingIncidents[0].step) {
      var incident = s.pendingIncidents.shift(), actor = s.companions.findIndex(function (p) { return !p.dropped; });
      if (actor >= 0) { trap(s, actor + 1, incident.index); break; }
    }
  }
  function update(s, input, dt) {
    if (s.over || s.activeChest || !Number.isFinite(dt) || dt <= 0) { return; }
    dt = Math.min(dt, 0.05); XZ.challenge.tick(s, dt); s.elapsed += dt; climate(s);
    s.milestone.remaining = Math.max(0, s.milestone.remaining - dt); s.feedback.remaining = Math.max(0, s.feedback.remaining - dt);
    s.tween = Math.max(0, s.tween - dt); s.energy = Math.max(0, s.energy - energyRate(s) * dt);
    s.cooldown = Math.max(0, s.cooldown - dt);
    var keys = Object.keys(directions), direction = keys.find(function (key) { return input.isDown(key) || input.pressed(key); });
    var primary = input.pressed('primary'), rescue = input.pressed('secondary');
    if (direction) { s.player.facing = direction; }
    if (s.trapped) {
      var t = s.trapped, near = adjacent(s);
      t.remaining = Math.max(0, t.remaining - dt);
      var taps = keys.concat(['primary', 'secondary']).some(function (key) { return input.pressed(key); });
      // 按住专用救援键即可持续拉动；原有连按操作仍可用，同帧不重复计入。
      if (t.remaining > 0 && near) {
        var pull = taps ? s.config.rescueTap.value : input.isDown('secondary') ? dt / s.config.rescueHoldSeconds.value : 0;
        t.progress = Math.min(1, t.progress + pull);
      }
      if (near) { s.energy = Math.max(0, s.energy - dt * s.tuning.rescueDrain.value); }
      if (t.progress >= 1) { s.trapped = null; s.guidance = null; s.rescued += 1; notify(s, '已拉出泥潭，继续向北'); }
      else if (t.remaining <= 0) {
        if (t.actor) {
          s.companions[t.actor - 1].dropped = true; s.stragglers += 1; s.trapped = null;
          s.loseLife('队友掉队', true); guide(s, 'continue'); notify(s, s.over ? '队友掉队 · 生命用尽，请重新游戏' : '队友掉队 · 扣一条生命 · 跟随箭头继续前进');
        } else { s.loseLife('领队自救超时', true); }
      } else if (!near && direction && !primary && !rescue && s.cooldown <= 0) { move(s, direction); }
    } else {
      if (primary) { probe(s); }
      if (direction && !primary && !rescue && s.cooldown <= 0) { move(s, direction); }
    }
    if (s.player.y === 0) { followerIncident(s); }
    ration(s); climate(s);
    if (s.hud.progress >= 0.5) { milestone(s, 0); }
    if (s.energy <= 0) { s.loseLife('体力耗尽'); }
    if (!s.over && s.elapsed >= s.tuning.timeLimit.value) { s.over = true; s.failure = '超时，尚未走出草地'; }
    else if (!s.over && s.player.y === 0 && !s.trapped && !s.pendingIncidents.length) { s.over = true; s.success = true; milestone(s, 1); }
    if (!s.over && !s.trapped) { s.activeChest = s.chests.find(function (chest) { return !chest.opened && chest.x === s.player.x && chest.y === s.player.y; }) || null; }
  }
  function reward(s, correct) {
    var chest = s.activeChest, c = s.config;
    if (!chest) { return {status: 'param', text: '没有待开启的宝箱'}; }
    if (chest.result) { return chest.result.reward; }
    var room = chest.kind === 'ration' ? c.rationLimit.value - s.rations - s.bonusRations : c.probeLimit.value - s.probes - s.bonusProbes;
    var amount = correct && room > 0 ? XZ.quiz.grantReward(s.rewardBudget, 1, room) : 0;
    var probes = chest.kind === 'probe' ? Math.min(room, amount * c.probeReward.value) : 0;
    if (chest.kind === 'ration') { s.bonusRations += amount; } else { s.bonusProbes += probes; }
    var r = {status: 'param', probes: probes, rations: chest.kind === 'ration' ? amount : 0,
      text: correct ? (chest.kind === 'ration' ? '额外干粮 + ' + amount + ' 份' : '额外探杆 + ' + probes + ' 次') + '，累计奖励上限 ' + s.rewardBudget.limit + ' 箱' : '答错不扣体力'};
    chest.result = {correct: correct, reward: r}; return r;
  }
  function score(s) {
    var count = s.success ? 1 + s.companions.filter(function (p) { return !p.dropped; }).length : 0;
    var points = XZ.challenge.score(s, count / 4, '带出人数 ' + count + '/4');
    var bonus = {label: '探杆确认隐患', value: Math.min(s.hazardsConfirmed, s.config.scoring.probeCap.value) * s.config.scoring.probe.value};
    points.parts.push(bonus);
    points.total = Math.max(0, points.parts.reduce(function (sum, p) { return sum + p.value; }, 0));
    return points;
  }
  function result(s) {
    var c = s.config, success = s.success && XZ.challenge.remainingEnergy(s) > 0, points = score(s);
    return {success: success, score: points, stars: success ? XZ.challenge.stars(s, points) : 0,
      delta: {energy: XZ.challenge.remainingEnergy(s) - s.entry.energy, supplies: -XZ.challenge.suppliesUsed(s), days: Math.ceil(s.elapsed / c.secondsPerDay.value)},
      notes: [success ? '小队已走出草地北缘。' : (s.failure || '尚未走出草地') + '，可立即重试本关。',
        '带出 ' + (success ? 4 - s.stragglers : 0) + '/4 人 · 掉队 ' + s.stragglers + ' 人 · 救出 ' + s.rescued + ' 次 · 基础行进补给 ' + s.travelSupplies + ' · 用时 ' + s.elapsed.toFixed(1) + ' 秒 · 陷入 ' + s.traps + ' 次 · 探杆 ' + s.probesUsed + ' 次 · 剩余体力 ' + Math.round(s.energy) + '。',
        '草墩、深草与积水是概率线索；探杆确认前方隐患，确认安全后可快步。气温来自日内曲线，寒冷增加体力消耗；曲线、天气、救援与资源变化为游戏参数。']};
  }
  XZ.games = XZ.games || {};
  XZ.games.caodi = {createState: createState, update: update, isOver: function (s) { return s.over; }, result: result, score: score,
    observe: observe, adjacent: adjacent, target: target, climate: climate, energyRate: energyRate, probe: probe, ration: ration, reward: reward};
}());

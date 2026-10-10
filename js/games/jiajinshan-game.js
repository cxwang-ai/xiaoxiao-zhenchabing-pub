(function () {
  'use strict';
  var XZ = window.XZ, physics = XZ.engine.physics;
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function approach(value, target, change) { return value < target ? Math.min(target, value + change) : Math.max(target, value - change); }
  // 路线海拔取横坐标，不把跳跃高度当作地理海拔；上坡单调增、下坡单调减。
  function altitudeAt(state, x) {
    var c = state.config, start = c.startX.value, summit = c.summitX.value;
    var teaching = c.tutorialX.value, teachingAltitude = clamp(c.tutorialAltitude.value, state.baseAltitude, state.summitAltitude);
    if (x <= teaching) { return state.baseAltitude + (teachingAltitude - state.baseAltitude) * clamp((x - start) / (teaching - start), 0, 1); }
    return x <= summit ? teachingAltitude + (state.summitAltitude - teachingAltitude) * clamp((x - teaching) / (summit - teaching), 0, 1) :
      state.summitAltitude + (state.endAltitude - state.summitAltitude) * clamp((x - summit) / (c.finishX.value - summit), 0, 1);
  }
  function groundAt(state, x) { return state.config.ground.value - (altitudeAt(state, x) - state.baseAltitude) * state.config.altitudePixels.value; }
  function floorAt(state, x) {
    for (var i = 0; i < state.platforms.length; i += 1) {
      var floor = state.platforms[i]; if (!floor.collapsed && x >= floor.x && x < floor.x + floor.w) { return floor; }
    }
    return null;
  }
  function topAt(floor, x) { return floor.y + (floor.slope || 0) * clamp(x - floor.x, 0, floor.w); }
  function surfaceAt(state, x) { var floor = floorAt(state, x); return floor ? topAt(floor, x) : groundAt(state, x); }
  function xAtAltitude(state, altitude) {
    var c = state.config, h = clamp(c.tutorialAltitude.value, state.baseAltitude, state.summitAltitude);
    return altitude <= h ? c.startX.value + (c.tutorialX.value - c.startX.value) * (altitude - state.baseAltitude) / (h - state.baseAltitude || 1) :
      c.tutorialX.value + (c.summitX.value - c.tutorialX.value) * (altitude - h) / (state.summitAltitude - h || 1);
  }
  function formatTemperature(value) { return value.toFixed(1).replace('-', '−') + ' ℃'; }
  function rates(state, altitude) {
    var science = XZ.levels.jiajinshan, c = state.config, t = state.tuning;
    var temperature = science.temperature(altitude), oxygen = science.oxygen(altitude);
    var high = Math.max(0, altitude - c.highAltitude.value);
    var factor = (1 + Math.max(0, 100 - oxygen) / c.oxygenDeficitScale.value) * (1 + high / c.highDeficitScale.value);
    var recovery = t.oxygenRecovery.value / (1 + Math.max(0, 100 - oxygen) / 100 + high / c.recoveryAltitudeScale.value);
    return { altitude: altitude, temperature: temperature, relativeOxygen: oxygen,
      oxygenDrain: t.oxygenDrain.value * factor, jumpOxygen: t.jumpOxygen.value * factor, oxygenRecovery: recovery,
      warmthDrain: t.warmthDrain.value + Math.max(0, c.coldReference.value - temperature) * t.coldDrain.value };
  }
  function updateHUD(state) {
    var h = state.hud, science = XZ.levels.jiajinshan;
    h.altitude = altitudeAt(state, state.player.x); h.temperature = science.temperature(h.altitude); h.relativeOxygen = science.oxygen(h.altitude);
  }
  function createState(options) {
    var level = options.level, c = level.arcade, difficulty = options.difficulty === 'easy' ? 'easy' : 'standard';
    var science = XZ.levels.jiajinshan, summit = science.crossingAltitude().value;
    var base = level.baseAltitude.status === 'verified' && science.finiteDatum(level.baseAltitude) ? level.baseAltitude.value : c.demoBaseAltitude.value;
    base = clamp(base, 0, summit); var rng = XZ.engine.rng(options.seed === undefined ? c.chestSeed.value : options.seed);
    var energy = clamp(XZ.challenge.resources(options).energy, 0, XZ.data.game.maxResource.value);
    // 基础行进补给先携带并消耗；余下物资才用于道具，重试由宿主恢复快照。
    var travelSupplies = Math.min(options.resources.supplies, c.difficulties[difficulty].travelSupplies.value);
    var itemSupplies = options.resources.supplies - travelSupplies;
    var paidStock = Math.min(c.stockLimit.value, Math.floor(itemSupplies / c.supplyUnit.value));
    var stock = Math.max(c.minimumStock.value, paidStock);
    var s = { config: c, tuning: c.difficulties[difficulty], difficulty: difficulty, entry: Object.assign({}, options.resources), usedSupplement: Boolean(options.usedSupplement),
      baseAltitude: base, summitAltitude: summit, summitStatus: science.crossingAltitude().status,
      endAltitude: clamp(c.endAltitude.value, 0, summit), energy: energy, energyMax: energy,
      oxygenMax: c.meterMax.value * (XZ.data.game.challenge.oxygenBase.value + XZ.data.game.challenge.oxygenEnergy.value * energy / XZ.data.game.maxResource.value),
      oxygen: 0, warmth: c.meterMax.value, exhausted: false, exhaustionCount: 0, exhaustedSeconds: 0,
      carried: { food: Math.floor(stock / 2), chili: stock - Math.floor(stock / 2) },
      freeCarried: {food: Math.floor(stock / 2) - Math.floor(paidStock / 2),
        chili: stock - Math.floor(stock / 2) - paidStock + Math.floor(paidStock / 2)}, travelSupplies: travelSupplies, suppliesUsed: travelSupplies,
      elapsed: 0, over: energy <= 0, success: false, failure: '', retries: 0, lastSetback: '',
      rng: rng, platforms: [], obstacles: [], pickups: [], checkpoints: [], checkpointIndex: -1,
      feedback: { text: '', remaining: 0 }, breathing: 0, milestone: { text: '', remaining: 0 }, milestoneCounts: [0, 0], activeChest: null,
      rewardBudget: { used: 0, limit: c.quizRewardLimit.value },
      hud: { altitude: base, temperature: 0, relativeOxygen: 0 },
      weather: { untilGust: c.gustInterval.value, warning: 0, gust: 0, direction: 1, snow: c.snowBase.value, untilHail: 0, grace: 0, hail: [] },
      player: { x: c.startX.value, y: 0, w: c.playerWidth.value, h: c.playerHeight.value, vx: 0, vy: 0, grounded: true, coyote: 0, buffer: 0, facing: 1 } };
    // 台阶与深谷的所有边界先排序，平台没有意外缝隙；谷内不生成地面。
    var edges = [0, c.worldWidth.value, c.summitX.value, c.tutorialX.value];
    for (var x = c.terraceWidth.value; x < c.worldWidth.value; x += c.terraceWidth.value) { edges.push(x); }
    c.gaps.value.forEach(function (g) { edges.push(g.x, g.x + g.w); }); c.thinIce.value.forEach(function (g) { edges.push(g.x, g.x + g.w); }); edges.sort(function (a, b) { return a - b; });
    for (var i = 0; i < edges.length - 1; i += 1) {
      var left = edges[i], right = edges[i + 1];
      if (right === left || c.gaps.value.some(function (g) { return left >= g.x && right <= g.x + g.w; }) && !c.thinIce.value.some(function (g) { return left >= g.x && right <= g.x + g.w; })) { continue; }
      s.platforms.push({ x: left, y: groundAt(s, left), w: right - left, h: c.fallDepth.value,
        slope: (groundAt(s, right) - groundAt(s, left) + c.stepRise.value) / (right - left),
        thin: c.thinIce.value.some(function (g) { return left >= g.x && right <= g.x + g.w; }), stood: 0, cracked: false, collapsed: false,
        ice: c.ice.value.some(function (ice) { return left >= ice.x && left < ice.x + ice.w; }) });
    }
    s.player.y = surfaceAt(s, s.player.x + s.player.w / 2) - s.player.h;
    c.obstacles.value.forEach(function (b) { s.obstacles.push({ x: b.x, y: surfaceAt(s, b.x) - b.h, w: b.w, h: b.h }); });
    c.pickups.value.forEach(function (item) { s.pickups.push({ x: item.x, y: surfaceAt(s, item.x) - c.chestSize.value,
      w: c.chestSize.value, h: c.chestSize.value, kind: item.kind, collected: false }); });
    c.checkpointAltitudes.value.slice(0, 2).forEach(function (target) {
      var adjusted = target <= base ? base + (summit - base) * (s.checkpoints.length + 1) / 4 : target;
      var cx = xAtAltitude(s, adjusted);
      if (!floorAt(s, cx)) { var gap = c.gaps.value.find(function (g) { return cx >= g.x && cx < g.x + g.w; }); cx = gap.x + gap.w; }
      s.checkpoints.push({x: cx, y: surfaceAt(s, cx + s.player.w / 2) - s.player.h, altitude: altitudeAt(s, cx), visited: false, status: 'param'});
    });
    [c.avalancheStart.value, c.summitX.value].forEach(function (cx, i) {
      s.checkpoints.push({x: cx, y: surfaceAt(s, cx + s.player.w / 2) - s.player.h, altitude: altitudeAt(s, cx),
        visited: false, status: 'param', label: i ? '王母寨垭口 ' + summit + ' m' : '雪崩段前'});
    });
    s.avalanche = {active: false, warning: 0, x: 0, speed: 0, finished: false, triggers: 0, sprintSeconds: 0, breathSeconds: 0};
    s.oxygen = s.oxygenMax;
    // 即使开发预览开启，本关也只用已核实题目。
    var questions = XZ.quiz.pickQuestions(level.id, c.chestCount.value, rng);
    var candidates = c.chestCandidates.value.map(function (point) { return { x: point.x, y: surfaceAt(s, point.x) - c.chestSize.value, w: c.chestSize.value, h: c.chestSize.value }; });
    s.chests = XZ.quiz.placeChests(candidates, questions.length, rng).map(function (point, index) {
      return Object.assign({}, point, { question: questions[index], opened: false, kind: index % 2 ? 'food' : 'chili' });
    });
    for (i = 0; i < c.hailPool.value; i += 1) { s.weather.hail.push({ x: 0, y: 0, w: c.hailSize.value, h: c.hailSize.value, active: false }); }
    updateHUD(s); XZ.challenge.attach(s, function (reason) { setback(s, reason); }); return s;
  }
  function restoreItem(s, kind, amount) {
    if (kind === 'food') { s.energy = Math.min(s.energyMax, s.energy + amount); }
    else { s.warmth = Math.min(s.config.meterMax.value, s.warmth + amount); }
  }
  function useCarried(s, kind) {
    s.carried[kind] -= 1;
    if (s.freeCarried[kind] > 0) { s.freeCarried[kind] -= 1; }
    else { s.suppliesUsed += s.config.supplyUnit.value; }
  }
  function setback(s, reason) {
    var p = s.player, c = s.config, point = s.checkpoints[s.checkpointIndex];
    s.retries += 1; s.lastSetback = reason; s.energy = Math.max(s.energy, s.energyMax * XZ.data.game.challenge.recoveryEnergy.value);
    p.x = point ? point.x : c.startX.value; p.y = point ? point.y : surfaceAt(s, p.x + p.w / 2) - p.h;
    p.vx = 0; p.vy = 0; p.grounded = true; p.buffer = 0; p.coyote = 0;
    s.oxygen = Math.min(s.oxygenMax, c.resetOxygen.value); s.warmth = c.resetWarmth.value; s.exhausted = false;
    s.weather.hail.forEach(function (h) { h.active = false; });
    s.platforms.forEach(function (f) { if (f.thin) { f.stood = 0; f.cracked = false; f.collapsed = false; } });
    s.avalanche.active = false; s.avalanche.finished = p.x >= c.avalancheEnd.value; updateHUD(s);
  }
  function weather(s, dt) {
    var w = s.weather, c = s.config, p = s.player;
    var proximity = clamp((s.hud.altitude - s.baseAltitude) / (s.summitAltitude - s.baseAltitude || 1), 0, 1);
    w.snow = c.snowBase.value + (c.snowPeak.value - c.snowBase.value) * proximity;
    if (w.gust > 0) { w.gust = Math.max(0, w.gust - dt); }
    else if (w.warning > 0) {
      w.warning = Math.max(0, w.warning - dt); if (w.warning === 0) { w.gust = c.gustDuration.value; }
    } else {
      w.untilGust -= dt;
      if (w.untilGust <= 0) {
        w.warning = c.gustWarning.value; w.direction = s.rng() < 0.5 ? -1 : 1;
        w.untilGust = (c.gustInterval.value + (c.gustPeakInterval.value - c.gustInterval.value) * proximity) * (1 + s.rng() * c.weatherJitter.value);
      }
    }
    w.grace = Math.max(0, w.grace - dt); w.untilHail -= dt;
    if (p.x >= c.hailZone.value.x && p.x < c.hailZone.value.x + c.hailZone.value.w && w.untilHail <= 0) {
      var free = w.hail.find(function (h) { return !h.active; });
      if (free) { free.active = true; free.x = p.x + (s.rng() - 0.5) * c.hailSpread.value; free.y = groundAt(s, p.x) - c.hailHeight.value; }
      w.untilHail = c.hailInterval.value;
    }
    for (var i = 0; i < w.hail.length; i += 1) {
      var h = w.hail[i]; if (!h.active) { continue; }
      h.y += c.hailSpeed.value * dt;
      if (w.grace === 0 && s.lifeGrace === 0 && physics.intersects(p, h)) { s.warmth = Math.max(0, s.warmth - c.hailWarmth.value); w.grace = c.hailGrace.value; h.active = false; }
      if (h.y > groundAt(s, h.x)) { h.active = false; }
    }
  }
  function update(s, input, dt) {
    if (s.over || s.activeChest || !Number.isFinite(dt) || dt <= 0) { return; }
    dt = Math.min(dt, 0.05); XZ.challenge.tick(s, dt);
    var p = s.player, c = s.config, t = s.tuning, max = c.meterMax.value;
    var direction = Number(input.isDown('right')) - Number(input.isDown('left')), sprint = input.isDown('secondary');
    var effort = rates(s, altitudeAt(s, p.x));
    s.elapsed += dt; s.milestone.remaining = Math.max(0, s.milestone.remaining - dt);
    s.feedback.remaining = Math.max(0, s.feedback.remaining - dt); s.breathing = Math.max(0, s.breathing - dt);
    weather(s, dt);
    p.buffer = input.pressed('primary') ? c.jumpBuffer.value : Math.max(0, p.buffer - dt);
    p.coyote = p.grounded ? c.coyoteTime.value : Math.max(0, p.coyote - dt);
    if (s.oxygen < effort.jumpOxygen && !s.exhausted) { s.exhausted = true; s.exhaustionCount += 1; }
    if (s.exhausted && s.oxygen >= effort.jumpOxygen + c.exhaustedRecovery.value) { s.exhausted = false; }
    var jumped = false;
    if (p.buffer > 0 && p.coyote > 0) {
      if (!s.exhausted && s.oxygen >= effort.jumpOxygen) {
        p.vy = -c.jumpSpeed.value * (c.jumpOxygenFloor.value + (1 - c.jumpOxygenFloor.value) * s.oxygen / c.meterMax.value); p.grounded = false; p.coyote = 0; p.buffer = 0; jumped = true;
        s.oxygen = Math.max(0, s.oxygen - effort.jumpOxygen);
      } else { s.breathing = 2; }
    }
    // 恢复看实际动作，不看方向键：贴墙走路、站立及被拒绝的跳跃都能喘气。
    // 缺氧时冲刺被拒绝并自动恢复，持续按键也不会锁死资源。
    if (sprint && direction && !s.exhausted) { s.oxygen = Math.max(0, s.oxygen - effort.oxygenDrain * dt); }
    else if (!jumped && p.grounded) { s.oxygen = Math.min(s.oxygenMax, s.oxygen + effort.oxygenRecovery * dt); }
    if (s.elapsed <= c.tutorialSeconds.value) { s.oxygen = Math.max(Math.min(s.oxygenMax, c.tutorialOxygenFloor.value), s.oxygen); }
    if (s.oxygen < effort.jumpOxygen && !s.exhausted) { s.exhausted = true; s.exhaustionCount += 1; }
    if (s.exhausted) { s.exhaustedSeconds += dt; }
    var speed = s.exhausted && p.grounded ? t.exhaustedSpeed.value : sprint && !s.exhausted ? t.sprintSpeed.value : t.speed.value;
    if (s.energyMax < c.lowEnergy.value) { speed *= c.lowEnergySpeed.value; }
    var floor = floorAt(s, p.x + p.w / 2), ice = floor && floor.ice, wasGrounded = p.grounded;
    if (direction) { p.facing = direction; p.vx = approach(p.vx, direction * speed, (ice ? c.iceAcceleration.value : c.acceleration.value) * dt); }
    else { p.vx *= Math.max(0, 1 - (ice ? c.iceFriction.value : c.friction.value) * dt); }
    if (s.weather.gust > 0) { p.vx += s.weather.direction * t.gustStrength.value * dt; }
    // 缺氧后立刻限速，防止用冰面惯性绕过氧气条。
    p.vx = clamp(p.vx, -speed, speed);
    var oldFeet = p.y + p.h;
    p.x = clamp(p.x + p.vx * dt, 0, c.worldWidth.value - p.w);
    var nextFloor = floorAt(s, p.x + p.w / 2);
    if (wasGrounded && nextFloor && Math.abs(topAt(nextFloor, p.x + p.w / 2) - oldFeet) <= c.stepHeight.value) { p.y = topAt(nextFloor, p.x + p.w / 2) - p.h; oldFeet = p.y + p.h; }
    for (var i = 0; i < s.obstacles.length; i += 1) {
      var b = s.obstacles[i];
      if (physics.intersects(p, b)) { p.x = p.vx > 0 ? b.x - p.w : b.x + b.w; p.vx = 0; }
    }
    p.vy += c.gravity.value * (p.vy < 0 && !input.isDown('primary') ? c.jumpCut.value : 1) * dt;
    p.y += p.vy * dt; p.grounded = false;
    // 只在从上往下跨越顶面时落地，谷底没有隐形地板。
    for (i = 0; i < s.platforms.length + s.obstacles.length; i += 1) {
      b = i < s.platforms.length ? s.platforms[i] : s.obstacles[i - s.platforms.length];
      var top = topAt(b, p.x + p.w / 2);
      if (!b.collapsed && p.x + p.w > b.x && p.x < b.x + b.w && oldFeet <= top + 0.001 && p.y + p.h >= top && p.vy >= 0) {
        p.y = top - p.h; p.vy = 0; p.grounded = true;
      }
    }
    // 薄冰首次站上后计时；离开也继续崩裂，不能反复点踩重置计时。
    s.platforms.forEach(function (f) {
      if (!f.thin || f.collapsed) { return; }
      if (f.stood > 0 || (p.grounded && floorAt(s, p.x + p.w / 2) === f)) { f.stood += dt; }
      f.cracked = f.stood + 1e-8 >= c.thinCrack.value;
      if (f.stood + 1e-8 >= c.thinCollapse.value) { f.collapsed = true; if (floorAt(s, p.x + p.w / 2) === null) { p.grounded = false; } }
    });
    updateHUD(s);
    s.warmth = Math.max(0, s.warmth - (t.warmthDrain.value + Math.max(0, c.coldReference.value - s.hud.temperature) * t.coldDrain.value) * dt);
    s.energy = Math.max(0, s.energy - t.energyDrain.value * dt);
    for (i = 0; i < s.pickups.length; i += 1) {
      var item = s.pickups[i];
      if (!item.collected && physics.intersects(p, item)) { item.collected = true; restoreItem(s, item.kind, item.kind === 'food' ? c.foodRestore.value : c.chiliRestore.value);
        s.feedback = { text: item.kind === 'food' ? '拾取干粮 · 体力恢复' : '拾取干辣椒 · 体温恢复', remaining: 2.5 }; }
    }
    // 携带物资按需自动使用，玩家只需移动/跳跃/冲刺；路边拾取与问答不花携带物资。
    if (s.warmth <= c.chiliThreshold.value && s.carried.chili > 0) { useCarried(s, 'chili'); restoreItem(s, 'chili', c.chiliRestore.value); }
    if (s.energy <= s.energyMax * c.foodThreshold.value && s.carried.food > 0) { useCarried(s, 'food'); restoreItem(s, 'food', c.foodRestore.value); }
    for (i = 0; i < s.checkpoints.length; i += 1) {
      var checkpoint = s.checkpoints[i];
      if (!checkpoint.visited && p.x >= checkpoint.x && p.grounded) {
        checkpoint.visited = true; s.checkpointIndex = i;
        checkpoint.elapsed = s.elapsed;
        if (i === 1 || i === 3) {
          s.milestoneCounts[i === 1 ? 0 : 1] += 1; s.milestone.remaining = c.milestoneDuration.value;
          var level = XZ.data.levels.find(function (level) { return level.id === 'jiajinshan'; });
          s.milestone.text = i === 1 ? '史料记载携带' + level.provisions.value :
            '王母寨垭口 海拔 ' + s.summitAltitude + ' m';
        }
      }
    }
    var avalanche = s.avalanche;
    if (!avalanche.finished && !avalanche.active && p.x >= c.avalancheStart.value) {
      avalanche.active = true; avalanche.warning = c.avalancheWarning.value; avalanche.triggers += 1;
      avalanche.x = c.avalancheStart.value - c.avalancheLead.value;
      avalanche.speed = Math.max(t.speed.value + c.avalancheSpeedMargin.value, c.avalancheSpeed[s.difficulty].value * (1 + (s.rng() - 0.5) * c.avalancheJitter.value));
    }
    if (avalanche.active) {
      if (sprint && !s.exhausted) { avalanche.sprintSeconds += dt; }
      else if (p.grounded) { avalanche.breathSeconds += dt; }
      if (avalanche.warning > 0) { avalanche.warning = Math.max(0, avalanche.warning - dt); }
      else { avalanche.x += avalanche.speed * dt; }
      if (p.x >= c.avalancheEnd.value) { avalanche.active = false; avalanche.finished = true; }
    }
    if (s.warmth <= 0) { s.loseLife('体温耗尽'); }
    else if (p.y > groundAt(s, p.x) + c.fallDepth.value) { s.loseLife('跌落深谷'); }
    else if (avalanche.active && avalanche.warning <= 0 && avalanche.x >= p.x) { s.loseLife('被雪崩追上'); }
    else if (s.energy <= 0) { s.loseLife('体力耗尽'); }
    if (!s.over && s.elapsed >= t.timeLimit.value) { s.over = true; s.failure = '超时'; }
    else if (!s.over && p.x >= c.finishX.value && p.grounded) { s.over = true; s.success = true; }
    if (!s.over) { s.activeChest = s.chests.find(function (chest) { return !chest.opened && physics.intersects(p, chest); }) || null; }
  }
  function reward(s, correct) {
    var kind = s.activeChest ? s.activeChest.kind : 'chili', room = kind === 'food' ? s.energyMax - s.energy : s.config.meterMax.value - s.warmth;
    var amount = correct ? XZ.quiz.grantReward(s.rewardBudget, s.config.quizReward.value, room) : 0;
    restoreItem(s, kind, amount);
    return { energy: kind === 'food' ? amount : 0, warmth: kind === 'chili' ? amount : 0, status: 'param',
      text: correct ? (kind === 'food' ? '干粮 · 体力恢复 ' : '干辣椒 · 体温恢复 ') + amount + '（累计上限 ' + s.rewardBudget.limit + '）' : '答错不扣体力' };
  }
  function score(s) {
    var points = XZ.challenge.score(s, s.success ? 1 : s.checkpoints.filter(function (cp) { return cp.visited; }).length / s.checkpoints.length, '检查点完成度');
    var thermal = Math.round(s.warmth * s.config.scoring.warmth.value);
    points.parts.push({label: '体温储备', value: thermal}); points.total = Math.max(0, points.parts.reduce(function (sum, part) { return sum + part.value; }, 0)); return points;
  }
  function result(s) {
    var c = s.config, remaining = XZ.challenge.remainingEnergy(s), points = score(s);
    var success = s.success && remaining > 0;
    return { success: success, score: points, stars: success ? XZ.challenge.stars(s, points) : 0,
      delta: { energy: remaining - s.entry.energy, supplies: -XZ.challenge.suppliesUsed(s), days: Math.ceil(s.elapsed / c.secondsPerDay.value) },
      notes: [success ? '已抵达山北麓达维木牌。' : (s.failure || '体力不足') + '，可重试本关。',
        '基础行进补给 ' + s.travelSupplies + ' · 用时 ' + Math.round(s.elapsed) + ' 秒 · 回检查点 ' + s.retries + ' 次 · 缺氧慢行 ' + Math.round(s.exhaustedSeconds) + ' 秒。',
        '海拔路径、物资效果、天气与耗时为游戏参数；气温和相对氧含量为已有简化模型推算。干辣椒回温仅为游戏效果。'] };
  }
  XZ.games = XZ.games || {};
  XZ.games.jiajinshan = { createState: createState, update: update, altitudeAt: altitudeAt, groundAt: groundAt, floorAt: floorAt, surfaceAt: surfaceAt, topAt: topAt, rates: rates, formatTemperature: formatTemperature,
    reward: reward, score: score, isOver: function (s) { return s.over; }, result: result };
}());

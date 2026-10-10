(function () {
  'use strict';
  var XZ = window.XZ, physics = XZ.engine.physics;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  // 河道坐标：x 向下游，y 从此岸向对岸；平均值 ∫₀¹6u(1-u)du = 1。
  function currentAt(s, y) { var u = clamp(y / s.width, 0, 1); return s.meanFlow * 6 * u * (1 - u); }
  function compose(heading, rowSpeed, flow) { return physics.add({ x: Math.sin(heading) * rowSpeed, y: Math.cos(heading) * rowSpeed }, { x: flow, y: 0 }); }
  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function updateHUD(s) { s.hud.meanFlow = s.meanFlow; s.hud.trip = s.trip; s.hud.localFlow = currentAt(s, s.player.y); s.hud.progress = clamp(s.player.y / s.width, 0, 1); }
  function createState(options) {
    var level = options.level, c = Object.assign({}, level.arcade), difficulty = options.difficulty === 'easy' ? 'easy' : 'standard';
    var trips = c.tripOptions.value.indexOf(options.trips) !== -1 ? options.trips : c.defaultTrips.value;
    var scoring = c.scoringByTrips.value[trips];
    c.scoring = Object.assign({}, c.scoring, {
      budget: Object.assign({}, c.scoring.budget, {value: scoring.budget}),
      time: Object.assign({}, c.scoring.time, {value: scoring.time}),
      stars: Object.assign({}, c.scoring.stars, {value: scoring.stars})
    });
    var ford = XZ.levels.daduhe.ford(options.ford || 'wide');
    if (!ford) { throw new Error('无效渡口'); }
    var rng = XZ.engine.rng(options.seed === undefined ? c.chestSeed.value : options.seed), width = ford.width.value;
    var energy = clamp(XZ.challenge.resources(options).energy, 0, XZ.data.game.maxResource.value);
    // 基础行进补给先携带并消耗；余下物资才用于道具，重试由宿主恢复快照。
    var travelSupplies = Math.min(options.resources.supplies, c.difficulties[difficulty].travelSupplies.value);
    var itemSupplies = options.resources.supplies - travelSupplies;
    var s = { config: c, tuning: c.difficulties[difficulty], difficulty: difficulty, entry: Object.assign({}, options.resources), usedSupplement: Boolean(options.usedSupplement),
      ford: ford.id, width: width, depth: ford.depth.value, month: level.arrivalMonth.value,
      meanFlow: XZ.levels.daduhe.velocity(level.arrivalMonth.value, ford.id),
      timeScale: width / (c.difficulties.standard.rowSpeed.value * c.nominalSeconds.value),
      elapsed: 0, totalTrips: trips, totalPeople: trips * c.peoplePerTrip.value, flowMultipliers: c.flowMultipliers.value[trips].slice(), trip: 1, completedTrips: 0, delivered: 0, tripElapsed: 0, tripTimes: [], transition: 0,
      baseDischarge: XZ.levels.daduhe.flowData().value[level.arrivalMonth.value - 1], seed: options.seed === undefined ? c.chestSeed.value : options.seed,
      lastStrokeCost: 0, hasteRemaining: 0, fatigue: 0, lastStroke: null, strokeCount: 0, lastImpulse: 0, strokeAge: 99, rowVelocity: 0,
      cadence: c.rhythm.interval.value, autoRow: false, lastDirection: 1, returnRemaining: null,
      rhythmQuality: 1, energy: energy, energyMax: energy, hull: c.hullMax.value, collisions: 0, invulnerable: 0,
      repairs: Math.min(c.repairLimit.value, Math.floor(itemSupplies / c.supplyUnit.value)), bonusRepairs: Math.max(0, c.minimumRepairs.value - Math.floor(itemSupplies / c.supplyUnit.value)), repairsUsed: 0, travelSupplies: travelSupplies, suppliesUsed: travelSupplies,
      boost: 0, rewardBudget: {used: 0, limit: c.quizRewardLimit.value}, activeChest: null,
      over: energy <= 0, success: false, failure: energy <= 0 ? '体力耗尽' : '',
      milestone: { text: '', remaining: 0 }, milestoneCounts: [0, 0],
      feedback: { text: '', remaining: 0 },
      player: {x: c.startX.value, y: width * c.startProgress.value, heading: 0, vx: 0, vy: 0, r: width * c.boatRadius.value},
      landing: {min: width * c.landingMin.value, max: width * (c.difficulties[difficulty].landingMax || c.landingMax).value},
      hud: {meanFlow: 0, localFlow: 0, progress: 0}, vortices: [], rocks: [], logs: [] };
    resetTrip(s);
    // 随机抖动只发生在预留安全区；不使用开发预览中的 pending 题。
    var questions = XZ.quiz.pickQuestions(level.id, c.chestCount.value, rng);
    s.chests = XZ.quiz.placeChests(c.chestCandidates.value, questions.length, rng).map(function (p, i) {
      return {x: (p.x + (rng() - 0.5) * c.chestJitter.value) * width,
        y: (p.y + (rng() - 0.5) * c.chestJitter.value) * width, r: c.chestRadius.value * width,
        question: questions[i], kind: i % 2 ? 'boost' : 'repair', opened: false};
    });
    s.hud.meanFlow = s.meanFlow; updateHUD(s);
    XZ.challenge.attach(s, function () {
      resetTrip(s); s.invulnerable = XZ.data.game.challenge.grace.value;
      s.energy = Math.max(s.energy, s.energyMax * XZ.data.game.challenge.recoveryEnergy.value); updateHUD(s);
    }); return s;
  }
  function milestone(s, index) {
    if (s.milestoneCounts[index]) { return; }
    s.milestoneCounts[index] += 1;
    var level = XZ.data.levels.find(function (l) { return l.id === 'daduhe'; }), caption = level.comic[0].caption;
    s.milestone.text = (index ? '全部送达 · ' : '第 1 趟到岸 · ') + caption.value;
    s.milestone.remaining = s.config.milestoneDuration.value;
  }
  function repair(s) {
    var c = s.config;
    if (s.hull > c.repairThreshold.value || s.repairs + s.bonusRepairs <= 0) { return; }
    if (s.bonusRepairs > 0) { s.bonusRepairs -= 1; }
    else { s.repairs -= 1; s.suppliesUsed += c.supplyUnit.value; }
    s.repairsUsed += 1; s.hull = Math.min(c.hullMax.value, s.hull + c.repairAmount.value);
    s.feedback = {text: '自动修船 · 耐久恢复 ' + c.repairAmount.value, remaining: 3};
  }
  function collide(s) {
    if (s.invulnerable > 0) { return; }
    s.energy = Math.max(0, s.energy - s.tuning.collisionEnergy.value);
    s.hull = Math.max(0, s.hull - s.tuning.collisionLoss.value); s.collisions += 1;
    s.invulnerable = s.config.invulnerableSeconds.value; repair(s);
  }
  function resetTrip(s) {
    var c = s.config, stage = c.obstacleStages.value[s.totalTrips][s.trip - 1], p = s.player, rng = XZ.engine.rng(s.seed + s.trip * 101);
    s.meanFlow = s.baseDischarge * s.flowMultipliers[s.trip - 1] / (s.width * s.depth);
    s.returnRemaining = null; s.autoRow = false; s.lastDirection = 1; s.cadence = c.rhythm.interval.value;
    s.hasteRemaining = 0; s.tripElapsed = 0; s.rowVelocity = 0; s.lastStroke = null; s.strokeAge = 99; s.fatigue = 0;
    p.x = c.startX.value; p.y = s.width * c.startProgress.value;
    p.heading = 0; p.vx = 0; p.vy = 0; s.hull = c.hullMax.value;
    ['vortices', 'rocks', 'logs'].forEach(function (key) {
      var extra = key === 'rocks' ? c.extraRocks.value : key === 'vortices' ? c.extraVortices.value : c.logs.value;
      var objects = c[key].value.concat(extra.slice(0, stage));
      if (s.trip === 1 && key === 'rocks') { objects = objects.slice(0, c.tutorialRocks.value); }
      if (s.trip === 1 && key === 'logs') { objects = []; }
      s[key] = objects.map(function (o, i) {
        var x = (o.x + (rng() - 0.5) * c.obstacleJitter.value) * s.width;
        return {x: x, baseX: x, y: o.y * s.width, r: (o.r || c.vortexRadius.value) * s.width,
          moving: key === 'vortices' && i > 0, phase: rng() * Math.PI * 2};
      });
    }); updateHUD(s);
  }
  // 最佳区间为平顶；区间外线性下降，疲劳再乘效率。冲量单位为 m/s。
  function rhythmEfficiency(interval, r) {
    if (interval === null || interval >= r.min.value && interval <= r.max.value) { return 1; }
    return r.weak.value + (1 - r.weak.value) * clamp(interval < r.min.value ? interval / r.min.value :
      1 - (interval - r.max.value) / r.max.value, 0, 1);
  }
  function stroke(s, direction, automatic) {
    var r = s.config.rhythm, interval = s.lastStroke === null ? null : s.elapsed - s.lastStroke;
    var haste = automatic || interval === null ? 0 : clamp(1 - interval / r.min.value, 0, 1);
    s.fatigue = clamp(s.fatigue + haste * r.fatigueGain.value, 0, 1);
    s.rhythmQuality = (automatic ? s.config.autoImpulse.value : rhythmEfficiency(interval, r)) * (automatic ? 1 : 1 - r.fatigueLoss.value * s.fatigue);
    s.lastImpulse = s.tuning.rowSpeed.value * r.drag.value * r.interval.value * s.rhythmQuality *
      (direction < 0 ? s.config.reverseFactor.value : 1) * (s.boost > 0 ? s.config.boostFactor.value : 1);
    s.rowVelocity += direction * s.lastImpulse;
    var cost = r.strokeCost.value + haste * s.tuning.hasteCost.value;
    s.lastStrokeCost = Math.min(s.energy, cost);
    s.energy = Math.max(0, s.energy - cost);
    if (haste > 1e-8) { s.hasteRemaining = s.config.hasteNoticeSeconds.value; }
    s.cadence = automatic ? s.config.autoInterval.value : interval === null ? r.interval.value : clamp(interval, 0.15, 1.5);
    s.autoRow = Boolean(automatic); s.lastDirection = direction;
    s.lastStroke = s.elapsed; s.strokeAge = 0; s.strokeCount += 1;
  }
  function update(s, input, dt) {
    if (s.over || s.activeChest || !Number.isFinite(dt) || dt <= 0) { return; }
    var p = s.player, c = s.config, t = s.tuning;
    dt = Math.min(dt, 0.05); XZ.challenge.tick(s, dt); s.elapsed += dt;
    s.invulnerable = Math.max(0, s.invulnerable - dt); s.boost = Math.max(0, s.boost - dt);
    s.hasteRemaining = Math.max(0, s.hasteRemaining - dt);
    s.milestone.remaining = Math.max(0, s.milestone.remaining - dt); s.feedback.remaining = Math.max(0, s.feedback.remaining - dt);
    if (s.transition > 0) {
      s.transition = Math.max(0, s.transition - dt);
      if (s.transition === 0) { s.trip += 1; resetTrip(s); }
      return;
    }
    s.tripElapsed += dt; s.strokeAge += dt;
    s.fatigue = Math.max(0, s.fatigue - c.rhythm.fatigueRecovery.value * dt);
    var turn = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
    p.heading = clamp(p.heading + turn * t.turnSpeed.value * dt, -c.maxHeading.value, c.maxHeading.value);
    var heldRow = s.difficulty === 'easy' && (input.isDown('up') || input.isDown('primary'));
    if (input.pressed('up') || input.pressed('primary')) { stroke(s, 1); }
    else if (input.pressed('down')) { stroke(s, -1); }
    else if (heldRow && (s.lastStroke === null || s.strokeAge + 1e-8 >= c.autoInterval.value)) { stroke(s, 1, true); }
    // 精确积分指数阻力；速度合成仍使用同一个科学流速模型。
    var drag = c.rhythm.drag.value, decay = Math.exp(-drag * dt);
    var speed = s.rowVelocity * (1 - decay) / (drag * dt);
    s.rowVelocity *= decay;
    var velocity = compose(p.heading, speed, currentAt(s, p.y));
    s.vortices.forEach(function (v) {
      if (v.moving) { v.x = v.baseX + Math.sin(s.tripElapsed * Math.PI * 2 / c.vortexPeriod.value + v.phase) * c.vortexMotion.value * s.width; }
      var d = distance(p, v);
      if (s.tripElapsed > c.tutorialSeconds.value && d < v.r) {
        var strength = (1 - d / v.r) * t.vortexFactor.value;
        velocity.x += (v.x - p.x) / (d || 1) * c.vortexPull.value * strength;
        velocity.y += (v.y - p.y) / (d || 1) * c.vortexPull.value * strength;
        p.heading = clamp(p.heading + c.vortexSpin.value * strength * dt, -c.maxHeading.value, c.maxHeading.value);
      }
    });
    p.vx = velocity.x; p.vy = velocity.y;
    p.x += p.vx * s.timeScale * dt; p.y = clamp(p.y + p.vy * s.timeScale * dt, 0, s.width);
    p.x = Math.max(c.bankMinX.value * s.width, p.x);
    s.logs.forEach(function (log) {
      log.x += currentAt(s, log.y) * s.timeScale * dt;
      if (log.x > c.logWrap.value * s.width) { log.x = c.bankMinX.value * s.width; }
    });
    if (s.tripElapsed > c.tutorialSeconds.value) {
      s.rocks.concat(s.logs).forEach(function (o) { if (distance(p, o) < p.r + o.r) { collide(s); } });
    }
    repair(s); updateHUD(s);
    if (p.x > s.landing.max) {
      if (s.returnRemaining === null) { s.returnRemaining = c.returnSeconds.value; }
      else { s.returnRemaining = Math.max(0, s.returnRemaining - dt); }
    } else { s.returnRemaining = null; }
    var swept = s.returnRemaining !== null && s.returnRemaining <= 1e-8;
    var exhausted = s.difficulty !== 'easy' && s.energy <= 0;
    if (s.hull <= 0 || swept || exhausted || s.tripElapsed >= c.tripTimeLimit.value) {
      s.loseLife(s.hull <= 0 ? '耐久耗尽' : swept ? '冲出登陆区' : exhausted ? '体力耗尽' : '本趟超时');
      return;
    }
    if (s.elapsed >= t.timeLimit.value) { s.over = true; s.failure = '超时'; return; }
    if (p.y >= s.width && p.x >= s.landing.min && p.x <= s.landing.max) {
      s.completedTrips += 1; s.delivered += c.peoplePerTrip.value; s.tripTimes.push(s.tripElapsed);
      if (s.trip === 1) { milestone(s, 0); }
      if (s.trip === s.totalTrips) { s.over = true; s.success = true; milestone(s, 1); }
      else { s.transition = c.transitionSeconds.value; }
    }
    if (!s.over && !s.transition) { s.activeChest = s.chests.find(function (chest) { return !chest.opened && distance(p, chest) <= p.r + chest.r; }) || null; }
  }
  // 保持当前船头与最近一次节奏的反事实；不预测未来转向、碰撞或漩涡。
  // 与 update 相同的 1/60 s 积分、冲量/疲劳/加速道具规则，不修改状态。
  function predictRoute(s) {
    var c = s.config, r = c.rhythm, dt = 1 / 60, interval = s.cadence;
    var x = s.player.x, y = s.player.y, velocity = s.rowVelocity, age = s.strokeAge;
    var fatigue = s.fatigue, points = [{x: x, y: y}], heading = s.player.heading;
    var decay = Math.exp(-r.drag.value * dt), elapsed = 0;
    while (y < s.width && elapsed < c.tripTimeLimit.value) {
      elapsed += dt; age += dt; fatigue = Math.max(0, fatigue - r.fatigueRecovery.value * dt);
      if (age + 1e-8 >= interval) {
        var haste = s.autoRow ? 0 : clamp(1 - interval / r.min.value, 0, 1);
        fatigue = clamp(fatigue + haste * r.fatigueGain.value, 0, 1);
        var quality = s.autoRow ? c.autoImpulse.value : rhythmEfficiency(interval, r) * (1 - r.fatigueLoss.value * fatigue);
        velocity += s.lastDirection * s.tuning.rowSpeed.value * r.drag.value * r.interval.value * quality *
          (s.lastDirection < 0 ? c.reverseFactor.value : 1) * (s.boost > elapsed ? c.boostFactor.value : 1);
        age = 0;
      }
      var speed = velocity * (1 - decay) / (r.drag.value * dt);
      velocity *= decay;
      var v = compose(heading, speed, currentAt(s, y));
      x = Math.max(c.bankMinX.value * s.width, x + v.x * s.timeScale * dt);
      y = clamp(y + v.y * s.timeScale * dt, 0, s.width);
      if (points.length === 1 || elapsed >= (points.length - 1) * 2 || y >= s.width) { points.push({x: x, y: y}); }
    }
    return {points: points, x: x, y: y, seconds: elapsed, complete: y >= s.width,
      safe: y >= s.width && x >= s.landing.min && x <= s.landing.max};
  }
  function reward(s, correct) {
    if (!s.activeChest) { return {status: 'param', text: '没有待开启的宝箱'}; }
    var chest = s.activeChest;
    if (chest.result) { return chest.result.reward; }
    var kind = chest.kind, c = s.config, room = kind === 'repair' ? c.repairLimit.value - s.repairs - s.bonusRepairs : s.boost === 0 ? 1 : 0;
    var amount = correct ? XZ.quiz.grantReward(s.rewardBudget, 1, room) : 0;
    if (kind === 'repair') { s.bonusRepairs += amount; } else if (amount) { s.boost = c.boostSeconds.value; }
    var r = {status: 'param', repairs: kind === 'repair' ? amount : 0, boost: kind === 'boost' && amount ? s.boost : 0,
      text: correct ? (kind === 'repair' ? '修船 + ' + amount + ' 次（自动使用）' : '额外划桨力 ' + (amount ? s.boost : 0) + ' 秒') + '，累计上限 ' + s.rewardBudget.limit + ' 次' : '答错不扣体力'};
    chest.result = {correct: correct, reward: r}; return r;
  }
  function score(s) { return XZ.challenge.score(s, s.delivered / s.totalPeople, '送达人数（' + s.delivered + '/' + s.totalPeople + ' 人；' + s.completedTrips + '/' + s.totalTrips + ' 趟）'); }
  function result(s) {
    var c = s.config, success = s.success && XZ.challenge.remainingEnergy(s) > 0, points = score(s);
    var deviation = Math.abs(s.player.x - (s.landing.min + s.landing.max) / 2);
    return {success: success, trips: s.totalTrips, score: points, stars: success ? XZ.challenge.stars(s, points) : 0,
      delta: {energy: XZ.challenge.remainingEnergy(s) - s.entry.energy, supplies: -XZ.challenge.suppliesUsed(s), days: Math.ceil(s.elapsed / c.secondsPerDay.value)},
      notes: [success ? s.totalTrips + ' 趟全部送达，共 ' + s.delivered + ' 人。' : (s.failure || '尚未登陆') + '；' + s.totalTrips + ' 趟目标已送达 ' + s.delivered + '/' + s.totalPeople + ' 人，可立即重试本关。',
        '基础行进补给 ' + s.travelSupplies + ' · 用时 ' + s.elapsed.toFixed(1) + ' 秒 · 碰撞 ' + s.collisions + ' 次 · 修船 ' + s.repairsUsed + ' 次 · 登陆偏差 ' + deviation.toFixed(1) + ' m。',
        '本趟平均流速 ' + s.meanFlow.toFixed(2) + ' m/s = 5 月演示流量 × 上涨系数 ÷ 断面面积；中间快、岸边慢为简化模型。划速、时间伸缩、障碍与资源变化均为游戏参数。']};
  }
  XZ.games = XZ.games || {};
  XZ.games.daduhe = {createState: createState, update: update, currentAt: currentAt, compose: compose, collide: collide, repair: repair, resetTrip: resetTrip, stroke: stroke, rhythmEfficiency: rhythmEfficiency,
    predictRoute: predictRoute, reward: reward, score: score, result: result, isOver: function (s) { return s.over; }};
}());

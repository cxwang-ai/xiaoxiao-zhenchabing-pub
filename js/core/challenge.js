(function () {
  'use strict';
  var XZ = window.XZ, KEY = 'xz-highscores-v1', cache = {};
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function attach(s, recover) {
    s.livesMax = XZ.data.game.challenge.lives[s.difficulty].value;
    s.lives = s.livesMax; s.mistakes = 0; s.lifeGrace = 0;
    s.usedSupplement = Boolean(s.usedSupplement);
    s.lifeNotice = {reason: '', remaining: 0}; s.lifeEvents = [];
    s.energySpent = 0; s.lastEnergy = s.energy;
    Object.defineProperty(s, 'loseLife', {value: function (reason, unavoidable) {
      if (s.over || (s.lifeGrace > 0 && !unavoidable)) { return false; }
      account(s); s.lives -= 1; s.mistakes += 1;
      s.lifeEvents.push({reason: reason, elapsed: s.elapsed, checkpoint: s.checkpointIndex === undefined ? 0 : s.checkpointIndex});
      s.lifeNotice = {reason: reason, remaining: XZ.data.game.challenge.noticeSeconds.value};
      if (s.lives <= 0) { s.over = true; s.success = false; s.failure = reason + ' · 生命用尽'; }
      else {
        recover(reason); s.lifeGrace = XZ.data.game.challenge.grace.value;
        s.lastEnergy = s.energy;
      }
      return true;
    }});
    return s;
  }
  function resources(options) {
    var f = options.level.arcade.resourceFloor;
    return {energy: Math.max(f.energy.value, options.resources.energy), usedSupplement: Boolean(options.usedSupplement)};
  }
  function account(s) {
    s.energySpent += Math.max(0, s.lastEnergy - s.energy); s.lastEnergy = s.energy;
  }
  function tick(s, dt) {
    account(s); s.lifeGrace = Math.max(0, s.lifeGrace - dt);
    s.lifeNotice.remaining = Math.max(0, s.lifeNotice.remaining - dt);
  }
  function remainingEnergy(s) {
    var remaining = Math.round(clamp(s.entry.energy - s.energySpent - Math.max(0, s.lastEnergy - s.energy) -
      s.mistakes * XZ.data.game.challenge.energyLoss.value, 0, s.entry.energy));
    return s.success && s.config.resourceFloor ? Math.max(s.config.resourceFloor.exitEnergy.value, remaining) : remaining;
  }
  function suppliesUsed(s) {
    return Math.min(s.entry.supplies, s.suppliesUsed + s.mistakes * XZ.data.game.challenge.supplyLoss.value);
  }
  function score(s, completion, goalLabel) {
    var c = s.config.scoring;
    var parts = [ {label: goalLabel, value: Math.round(clamp(completion, 0, 1) * c.goal.value)},
      {label: '用时奖励', value: s.success ? Math.round(Math.max(0, c.budget.value - s.elapsed) * c.time.value) : 0},
      {label: '剩余生命', value: s.lives * c.life.value},
      {label: '失误扣分', value: -s.mistakes * c.mistake.value},
      {label: '剩余耐力', value: Math.round(s.energy * c.reserve.value)} ];
    if (s.config.resourceFloor) {
      var f = s.config.resourceFloor;
      parts.push({label: '入场资源不足', value: -Math.round(f.resourcePenalty.value *
        (1 - (s.entry.energy + s.entry.supplies) / (2 * XZ.data.game.maxResource.value)))});
      if (s.usedSupplement) { parts.push({label: '使用补给', value: -f.supplementPenalty.value}); }
    }
    return {total: Math.max(0, parts.reduce(function (sum, p) { return sum + p.value; }, 0)), parts: parts};
  }
  function stars(s, points) {
    if (!s.success) { return 0; }
    return s.config.scoring.stars.value.reduce(function (n, threshold) { return n + Number(points.total >= threshold); }, 0);
  }
  // 仅本机，严格验证存储；权限、损坏或配额错误均保留内存结果并继续游玩。
  function read() {
    try {
      var raw = window.localStorage.getItem(KEY), parsed = raw ? JSON.parse(raw) : {};
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        XZ.data.levels.forEach(function (level) {
          ['easy', 'standard'].forEach(function (difficulty) {
            var base = level.id + ':' + difficulty;
            var keys = level.id === 'daduhe' ? [base + ':1', base + ':2', base + ':3'] : [base];
            keys.forEach(function (key) {
              var value = parsed[key];
              if (Number.isSafeInteger(value) && value >= 0) { cache[key] = Math.max(cache[key] || 0, value); }
            });
            // v1 固定趟数成绩迁移到旧模式分区，保留原 key 直至下次写入。
            if (level.id === 'daduhe' && Number.isSafeInteger(parsed[base]) && parsed[base] >= 0) {
              cache[base + ':3'] = Math.max(cache[base + ':3'] || 0, parsed[base]);
            }
          });
        });
      }
    } catch (error) { /* storage unavailable */ }
  }
  function scoreKey(id, difficulty, trips) {
    var c = XZ.data.levels[0].arcade;
    return id + ':' + difficulty + (id === 'daduhe' ? ':' + (c.tripOptions.value.indexOf(trips) !== -1 ? trips : c.defaultTrips.value) : '');
  }
  function best(id, difficulty, trips) { read(); return cache[scoreKey(id, difficulty, trips)] || 0; }
  function record(id, difficulty, points, trips) {
    var previous = best(id, difficulty, trips), valid = Number.isSafeInteger(points) && points >= 0;
    if (valid && points > previous) {
      cache[scoreKey(id, difficulty, trips)] = points;
      try { window.localStorage.setItem(KEY, JSON.stringify(cache)); } catch (error) { /* keep memory score */ }
    }
    return {best: best(id, difficulty, trips), newRecord: valid && points > previous};
  }
  function clear() {
    // 清除独立成绩 key；失败时不谎报已清除持久化记录。
    try { window.localStorage.removeItem(KEY); cache = {}; return true; }
    catch (error) { cache = {}; return false; }
  }
  XZ.challenge = {resources: resources, attach: attach, tick: tick, account: account, remainingEnergy: remainingEnergy,
    suppliesUsed: suppliesUsed, score: score, stars: stars};
  XZ.highscores = {best: best, record: record, clear: clear};
}());

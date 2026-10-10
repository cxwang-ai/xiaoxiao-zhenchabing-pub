(function () {
  'use strict';
  var XZ = window.XZ;
  var KEY = 'xz-save-v2';
  var listeners = [];
  var saved = false;
  var storageOK = true;

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function integerResources(value) { return { energy: Math.round(value.energy), supplies: Math.round(value.supplies), days: Math.round(value.days) }; }
  function fresh() {
    var initial = XZ.data.game.initial;
    var progress = {};
    XZ.data.levels.forEach(function (level) { progress[level.id] = { completed: false, stars: 0, failures: 0 }; });
    return { version: 2, started: false, difficulty: 'easy', riverTrips: XZ.data.levels[0].arcade.defaultTrips.value, resources: { energy: initial.energy.value, supplies: initial.supplies.value, days: initial.days.value }, progress: progress, cards: [], active: null };
  }
  var current = fresh();

  function validResources(resources) {
    return resources && ['energy', 'supplies', 'days'].every(function (key) {
      return typeof resources[key] === 'number' && Number.isFinite(resources[key]) && resources[key] >= 0;
    }) && resources.energy <= XZ.data.game.maxResource.value && resources.supplies <= XZ.data.game.maxResource.value && Number.isInteger(resources.days);
  }

  function validTrips(trips) { return XZ.data.levels[0].arcade.tripOptions.value.indexOf(trips) !== -1; }

  function restore(raw) {
    if (!raw || raw.version !== 2 || raw.started !== true || !validResources(raw.resources) || !raw.progress || !Array.isArray(raw.cards)) { return null; }
    var clean = fresh();
    clean.started = true;
    // 旧存档没有难度字段时按标准模式读取。
    clean.difficulty = raw.difficulty === 'easy' ? 'easy' : 'standard';
    clean.resources = integerResources(raw.resources);
    clean.riverTrips = validTrips(raw.riverTrips) ? raw.riverTrips : clean.riverTrips;
    XZ.data.levels.forEach(function (level) {
      var item = raw.progress[level.id];
      if (item && Number.isSafeInteger(item.failures) && item.failures >= 0) { clean.progress[level.id].failures = item.failures; }
      if (level.available && item && item.completed === true && Number.isInteger(item.stars) && item.stars >= 1 && item.stars <= XZ.data.game.starMax.value) {
        clean.progress[level.id] = { completed: true, stars: item.stars, failures: 0 };
        if (Number.isSafeInteger(item.score) && item.score >= 0) { clean.progress[level.id].score = item.score; }
        clean.progress[level.id].usedSupplement = Boolean(item.usedSupplement);
        if (level.id === 'daduhe') { clean.progress[level.id].trips = validTrips(item.trips) ? item.trips : 3; }
        if (raw.cards.indexOf(level.history.id) !== -1) { clean.cards.push(level.history.id); }
      }
    });
    // 未结算的一次尝试只保存起点，刷新后从“看”重新开始，避免重复扣资源。
    if (raw.active && validResources(raw.active.entry)) {
      var activeLevel = XZ.data.levels.find(function (level) { return level.available && level.id === raw.active.id; });
      if (activeLevel && !clean.progress[activeLevel.id].completed && raw.active.entry.energy > 0) {
        clean.active = { id: activeLevel.id, entry: integerResources(raw.active.entry), usedSupplement: Boolean(raw.active.usedSupplement) };
        clean.resources = integerResources(raw.active.entry);
      }
    }
    if (clean.resources.energy === 0 && !clean.active && XZ.data.levels.some(function (level) { return level.available && !clean.progress[level.id].completed; })) { return null; }
    return clean;
  }

  function emit() { listeners.forEach(function (listener) { listener(XZ.state.get()); }); }
  function persist() {
    try { window.localStorage.setItem(KEY, JSON.stringify(current)); saved = true; storageOK = true; }
    catch (error) { storageOK = false; }
    emit();
  }
  function limit(value) { return Math.round(Math.max(0, Math.min(XZ.data.game.maxResource.value, value))); }

  XZ.state = {
    load: function () {
      var text = null;
      try {
        text = window.localStorage.getItem(KEY);
        storageOK = true;
      } catch (error) { storageOK = false; }
      // 损坏的存档与存储不可用是两件事，损坏时安全地回到初始状态。
      var restored = null;
      try { restored = text ? restore(JSON.parse(text)) : null; } catch (error) { restored = null; }
      current = restored || fresh(); saved = Boolean(restored);
      emit();
    },
    get: function () { return clone(current); },
    hasSave: function () { return saved && current.started; },
    storageAvailable: function () { return storageOK; },
    subscribe: function (listener) { listeners.push(listener); },
    start: function (difficulty) { current.started = true; if (difficulty) { current.difficulty = difficulty === 'easy' ? 'easy' : 'standard'; } persist(); },
    setRiverTrips: function (trips) { if (validTrips(trips)) { current.riverTrips = trips; persist(); } },
    setDifficulty: function (difficulty) { current.difficulty = difficulty === 'easy' ? 'easy' : 'standard'; persist(); },
    reset: function () {
      current = fresh(); saved = false;
      try { window.localStorage.removeItem(KEY); storageOK = true; } catch (error) { storageOK = false; }
      emit();
    },
    isUnlocked: function (id) {
      var index = XZ.data.levels.findIndex(function (level) { return level.id === id; });
      return index >= 0 && XZ.data.levels[index].available;
    },
    enter: function (id) {
      var level = XZ.data.levels.find(function (item) { return item.id === id && item.available; });
      if (!level || !XZ.state.isUnlocked(id) || !current.started || (current.resources.energy <= 0 && (!current.active || current.active.id !== id))) { return null; }
      if (current.progress[id].completed) { return { completed: true }; }
      if (!current.active || current.active.id !== id) {
        current.active = { id: id, entry: clone(current.resources) };
      }
      current.resources = clone(current.active.entry);
      persist();
      return clone(current.active);
    },
    fail: function (id, outcome) {
      if (!current.active || current.active.id !== id || outcome.success) { return; }
      current.resources = clone(outcome.remaining);
      current.progress[id].failures = (current.progress[id].failures || 0) + 1;
      // 存档含出发快照，失败后刷新也能恢复本关，不会永久卡在零体力。
      persist();
    },
    supplement: function (id) {
      var level = XZ.data.levels.find(function (item) { return item.id === id; });
      if (!level || !current.active || current.active.id !== id ||
          current.progress[id].failures < XZ.data.game.challenge.supplementFailures.value) { return false; }
      var f = level.arcade.resourceFloor;
      current.active.entry.energy = Math.max(current.active.entry.energy, f.energy.value);
      current.active.entry.supplies = Math.max(current.active.entry.supplies, f.supplies.value);
      current.active.usedSupplement = true; current.resources = clone(current.active.entry); persist(); return true;
    },
    finish: function (id, outcome) {
      if (!current.active || current.active.id !== id || current.progress[id].completed || !outcome.success) { return false; }
      var entry = current.active.entry;
      current.resources = {
        energy: limit(entry.energy + outcome.delta.energy),
        supplies: limit(entry.supplies + outcome.delta.supplies),
        days: entry.days + outcome.delta.days
      };
      current.progress[id] = { completed: true, stars: outcome.stars, failures: 0,
        score: outcome.score && Number.isSafeInteger(outcome.score.total) ? outcome.score.total : 0,
        usedSupplement: Boolean(outcome.score && outcome.score.parts.some(function (part) { return part.label === '使用补给'; })) };
      if (id === 'daduhe') { current.progress[id].trips = validTrips(outcome.trips) ? outcome.trips : current.riverTrips; }
      current.active = null;
      persist();
      return true;
    },
    unlockCard: function (id) {
      var level = XZ.data.levels.find(function (item) { return item.id === id; });
      if (level && current.progress[id].completed && current.cards.indexOf(level.history.id) === -1) {
        current.cards.push(level.history.id); persist();
      }
    },
    allAvailableComplete: function () {
      return XZ.data.levels.filter(function (level) { return level.available; }).every(function (level) { return current.progress[level.id].completed; });
    }
  };
}());

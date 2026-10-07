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
    XZ.data.levels.forEach(function (level) { progress[level.id] = { completed: false, stars: 0 }; });
    return { version: 2, started: false, resources: { energy: initial.energy.value, supplies: initial.supplies.value, days: initial.days.value }, progress: progress, cards: [], active: null };
  }
  var current = fresh();

  function validResources(resources) {
    return resources && ['energy', 'supplies', 'days'].every(function (key) {
      return typeof resources[key] === 'number' && Number.isFinite(resources[key]) && resources[key] >= 0;
    }) && resources.energy <= XZ.data.game.maxResource.value && resources.supplies <= XZ.data.game.maxResource.value && Number.isInteger(resources.days);
  }

  function restore(raw) {
    if (!raw || raw.version !== 2 || raw.started !== true || !validResources(raw.resources) || !raw.progress || !Array.isArray(raw.cards)) { return null; }
    var clean = fresh();
    clean.started = true;
    clean.resources = integerResources(raw.resources);
    XZ.data.levels.forEach(function (level, index) {
      var item = raw.progress[level.id];
      if ((index === 0 || clean.progress[XZ.data.levels[index - 1].id].completed) && level.available && item && item.completed === true && Number.isInteger(item.stars) && item.stars >= 1 && item.stars <= XZ.data.game.starMax.value) {
        clean.progress[level.id] = { completed: true, stars: item.stars };
        if (raw.cards.indexOf(level.history.id) !== -1) { clean.cards.push(level.history.id); }
      }
    });
    // 未结算的一次尝试只保存起点，刷新后从“看”重新开始，避免重复扣资源。
    if (raw.active && validResources(raw.active.entry)) {
      var activeLevel = XZ.data.levels.find(function (level) { return level.available && level.id === raw.active.id; });
      if (activeLevel && (XZ.data.levels.indexOf(activeLevel) === 0 || clean.progress[XZ.data.levels[XZ.data.levels.indexOf(activeLevel) - 1].id].completed) && !clean.progress[activeLevel.id].completed && raw.active.entry.energy > 0) {
        clean.active = { id: activeLevel.id, entry: integerResources(raw.active.entry) };
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
    start: function () { current.started = true; persist(); },
    reset: function () {
      current = fresh(); saved = false;
      try { window.localStorage.removeItem(KEY); storageOK = true; } catch (error) { storageOK = false; }
      emit();
    },
    isUnlocked: function (id) {
      var index = XZ.data.levels.findIndex(function (level) { return level.id === id; });
      return index >= 0 && XZ.data.levels[index].available && (index === 0 || current.progress[XZ.data.levels[index - 1].id].completed);
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
    preview: function (id, outcome) {
      if (current.active && current.active.id === id) { current.resources = clone(outcome.remaining); persist(); }
    },
    fail: function (id, outcome) {
      if (!current.active || current.active.id !== id || outcome.success) { return; }
      current.resources = clone(outcome.remaining);
      // 存档含出发快照，失败后刷新也能恢复本关，不会永久卡在零体力。
      persist();
    },
    finish: function (id, outcome) {
      if (!current.active || current.active.id !== id || current.progress[id].completed || !outcome.success) { return false; }
      var entry = current.active.entry;
      current.resources = {
        energy: limit(entry.energy + outcome.delta.energy),
        supplies: limit(entry.supplies + outcome.delta.supplies),
        days: entry.days + outcome.delta.days
      };
      current.progress[id] = { completed: true, stars: outcome.stars };
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

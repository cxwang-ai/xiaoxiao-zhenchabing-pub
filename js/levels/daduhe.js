(function () {
  'use strict';
  var XZ = window.XZ, shared = XZ.rules;
  var level = XZ.data.levels.find(function (item) { return item.id === 'daduhe'; });
  function flowData() { return shared.series(level.monthlyFlow, level.exploration.demoFlow, function (values) { return values.length === 12 && values.every(function (n) { return Number.isFinite(n) && n >= 0; }); }); }
  function ford(id) { return level.exploration.fords.find(function (item) { return item.id === id; }); }
  function velocity(month, id) { var f = ford(id); return f && Number.isInteger(month) && month >= 1 && month <= 12 ? flowData().value[month - 1] / (f.width.value * f.depth.value) : null; }
  XZ.levels = XZ.levels || {};
  XZ.levels.daduhe = { flowData: flowData, ford: ford, velocity: velocity };
}());

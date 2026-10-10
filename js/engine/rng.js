(function () {
  'use strict';
  var XZ = window.XZ;
  XZ.engine = XZ.engine || {};
  // 与 v1 草地使用相同序列，旧种子仍可复现。
  XZ.engine.rng = function (seed) {
    var state = seed >>> 0;
    return function () {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  };
}());

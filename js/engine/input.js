(function () {
  'use strict';
  var XZ = window.XZ;
  var mapping = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    Space: 'primary', ShiftLeft: 'secondary', ShiftRight: 'secondary', KeyX: 'secondary',
    Escape: 'pause', KeyP: 'pause'
  };
  XZ.engine.input = function (area, options) {
    options = options || {};
    var win = options.window || window, doc = options.document || document;
    var sources = {}, pending = {}, edges = {}, removers = [], captures = {};
    function isDown(action) { return Object.keys(sources).some(function (key) { return sources[key] === action; }); }
    function press(source, action) {
      if (sources[source] || (options.enabled && !options.enabled() && action !== 'pause')) { return; }
      var wasDown = isDown(action); sources[source] = action;
      if (!wasDown) { pending[action] = true; if (options.onAction) { options.onAction(action); } }
    }
    function release(source) { delete sources[source]; }
    function clear() {
      sources = {}; pending = {}; edges = {};
      Object.keys(captures).forEach(function (id) {
        var button = captures[id];
        if (button.hasPointerCapture(Number(id))) { button.releasePointerCapture(Number(id)); }
      });
      captures = {};
    }
    function listen(node, type, fn) {
      node.addEventListener(type, fn); removers.push(function () { node.removeEventListener(type, fn); });
    }
    function keydown(event) {
      var action = mapping[event.code], target = event.target;
      if (!action || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) { return; }
      var enabled = options.enabled ? options.enabled() : area.contains(doc.activeElement);
      if (!enabled && (action !== 'pause' || !area.contains(doc.activeElement))) { return; }
      if (enabled) { event.preventDefault(); }
      if (!event.repeat) { press('key:' + event.code, action); }
    }
    listen(doc, 'keydown', keydown);
    listen(doc, 'keyup', function (event) {
      var source = 'key:' + event.code;
      if (sources[source]) { release(source); }
    });
    Array.prototype.forEach.call(area.querySelectorAll('[data-action]'), function (button) {
      listen(button, 'pointerdown', function (event) {
        if (event.pointerType === 'mouse' && event.button !== 0) { return; }
        event.preventDefault(); button.focus({ preventScroll: true });
        button.setPointerCapture(event.pointerId); captures[event.pointerId] = button;
        press('pointer:' + event.pointerId, button.dataset.action);
      });
      function up(event) {
        release('pointer:' + event.pointerId); delete captures[event.pointerId];
        if (button.hasPointerCapture(event.pointerId)) { button.releasePointerCapture(event.pointerId); }
      }
      listen(button, 'pointerup', up); listen(button, 'pointercancel', up); listen(button, 'lostpointercapture', up);
      // Enter/读屏点击也能产生一次动作；指针点击已由 pointerdown 处理。
      listen(button, 'click', function (event) {
        if (event.detail === 0) { press('click', button.dataset.action); release('click'); }
      });
    });
    listen(area, 'contextmenu', function (event) { event.preventDefault(); });
    listen(win, 'blur', clear);
    listen(doc, 'visibilitychange', function () { if (doc.hidden) { clear(); } });
    return {
      isDown: isDown, pressed: function (action) { return Boolean(edges[action]); },
      // 每个固定步消耗一次边沿，渲染帧中的追帧不会重复跳跃。
      beginFrame: function () { edges = pending; pending = {}; },
      endFrame: function () { edges = {}; }, clear: clear,
      stop: function () { clear(); removers.forEach(function (remove) { remove(); }); removers = []; }
    };
  };
  XZ.engine.input.mapping = mapping;
}());

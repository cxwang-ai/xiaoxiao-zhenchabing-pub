(function () {
  'use strict';
  var XZ = window.XZ;
  function intersects(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function separation(a, b) {
    if (!intersects(a, b)) { return { x: 0, y: 0 }; }
    var x = a.x + a.w / 2 < b.x + b.w / 2 ? b.x - a.x - a.w : b.x + b.w - a.x;
    var y = a.y + a.h / 2 < b.y + b.h / 2 ? b.y - a.y - a.h : b.y + b.h - a.y;
    return Math.abs(x) < Math.abs(y) ? { x: x, y: 0 } : { x: 0, y: y };
  }
  XZ.engine.physics = {
    vector: function (x, y) { return { x: x, y: y }; },
    add: function (a, b) { return { x: a.x + b.x, y: a.y + b.y }; },
    scale: function (a, n) { return { x: a.x * n, y: a.y * n }; },
    length: function (a) { return Math.hypot(a.x, a.y); },
    intersects: intersects, separation: separation,
    separate: function (a, b) { var offset = separation(a, b); a.x += offset.x; a.y += offset.y; return offset; },
    integrate: function (body, dt, options) {
      body.vy += (options.gravity || 0) * dt;
      body.vx *= Math.max(0, 1 - (options.friction || 0) * dt);
      body.x += body.vx * dt; body.y += body.vy * dt;
    }
  };
}());

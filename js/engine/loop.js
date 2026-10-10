(function () {
  'use strict';
  var XZ = window.XZ;
  XZ.engine.loop = function (options) {
    var win = options.window || window, doc = options.document || document;
    var step = options.step || 1 / 60, maxSteps = options.maxSteps || 5;
    var last = null, accumulator = 0, frameId = null, stopped = false, paused = true;
    function frame(now) {
      frameId = null;
      if (paused || stopped) { return; }
      if (last !== null) { accumulator += Math.min(Math.max(0, (now - last) / 1000), step * maxSteps); }
      last = now;
      var count = 0;
      while (accumulator + 1e-10 >= step && count < maxSteps && !paused && !stopped) {
        accumulator -= step; count += 1; options.update(step);
      }
      // 丢弃过长帧的积压，防止追帧螺旋。
      accumulator = Math.max(0, accumulator % step);
      if (!paused && !stopped) {
        if (options.render) { options.render(accumulator / step); }
        if (!paused && !stopped) { frameId = win.requestAnimationFrame(frame); }
      }
    }
    function pause(reason) {
      if (paused || stopped) { return; }
      paused = true; last = null; accumulator = 0;
      if (frameId !== null) { win.cancelAnimationFrame(frameId); frameId = null; }
      if (options.onPause) { options.onPause(reason || 'manual'); }
    }
    function resume() {
      if (stopped || !paused || doc.hidden) { return; }
      paused = false; last = null; accumulator = 0;
      if (!options.manual) { frameId = win.requestAnimationFrame(frame); }
    }
    function visibility() { if (doc.hidden) { pause('hidden'); } }
    function blur() { pause('blur'); }
    doc.addEventListener('visibilitychange', visibility);
    win.addEventListener('blur', blur);
    return {
      start: resume, resume: resume, pause: pause,
      isPaused: function () { return paused; },
      stop: function () {
        pause('stop'); stopped = true;
        doc.removeEventListener('visibilitychange', visibility); win.removeEventListener('blur', blur);
      }
    };
  };
}());

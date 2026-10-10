(function () {
  'use strict';
  var XZ = window.XZ;
  var screens = {};
  var cleanup = null;
  XZ.router = {
    register: function (name, render) { screens[name] = render; },
    go: function (name, options) {
      if (!screens[name]) { return; }
      if (cleanup) { var dispose = cleanup; cleanup = null; dispose(); }
      var app = document.getElementById('app');
      app.textContent = '';
      app.dataset.screen = name;
      var result = screens[name](app, options || {});
      if (typeof result === 'function') { cleanup = result; }
      // 屏幕切换后让键盘和读屏用户从新标题开始。
      window.scrollTo(0, 0);
      var title = app.querySelector('h1');
      if (title) { title.id = 'screen-title'; title.tabIndex = -1; title.focus({ preventScroll: true }); }
    }
  };
}());

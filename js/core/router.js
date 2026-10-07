(function () {
  'use strict';
  var XZ = window.XZ;
  var screens = {};
  XZ.router = {
    register: function (name, render) { screens[name] = render; },
    go: function (name, options) {
      if (!screens[name]) { return; }
      var app = document.getElementById('app');
      app.textContent = '';
      app.dataset.screen = name;
      screens[name](app, options || {});
      // 屏幕切换后让键盘和读屏用户从新标题开始。
      window.scrollTo(0, 0);
      var title = app.querySelector('h1');
      if (title) { title.id = 'screen-title'; title.tabIndex = -1; title.focus({ preventScroll: true }); }
    }
  };
}());

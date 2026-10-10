(function () {
  'use strict';
  var XZ = window.XZ;
  XZ.engine.view = function (canvas, container, options) {
    var ctx = canvas.getContext('2d');
    var view = { width: 480, height: options && options.height || 270, ctx: ctx, dpr: 1 };
    var normalHeight = view.height;
    function resize() {
      var width = container.clientWidth;
      // HUD 按 CSS 尺寸选择模式；像素密度不影响文字的可读尺寸。
      view.cssWidth = canvas.getBoundingClientRect ? canvas.getBoundingClientRect().width : canvas.clientWidth || width;
      view.compactHUD = view.cssWidth > 0 && view.cssWidth < 420;
      var wide = window.matchMedia && window.matchMedia('(min-width: 900px)').matches;
      view.height = wide && options && options.wideHeight || view.compactHUD && options && options.compactHeight || normalHeight;
      if (canvas.style) { canvas.style.aspectRatio = view.width + ' / ' + view.height; }
      view.typography = XZ.engine.hud.typography();
      view.dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(width * view.dpr));
      canvas.height = Math.max(1, Math.round(width * view.height / view.width * view.dpr));
      ctx.setTransform(canvas.width / view.width, 0, 0, canvas.height / view.height, 0, 0);
      ctx.imageSmoothingEnabled = false;
      if (view.onResize) { view.onResize(); }
    }
    var observer = window.ResizeObserver ? new window.ResizeObserver(resize) : null;
    if (observer) { observer.observe(container); }
    window.addEventListener('resize', resize); resize();
    view.stop = function () { if (observer) { observer.disconnect(); } window.removeEventListener('resize', resize); };
    return view;
  };
}());

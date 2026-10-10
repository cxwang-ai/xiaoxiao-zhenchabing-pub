(function () {
  'use strict';
  var XZ = window.XZ;
  var ui = XZ.ui;
  XZ.router.register('map', function (app) {
    if (!XZ.state.get().started) { XZ.router.go('start'); return; }
    var state = XZ.state.get(), stopCredits = null;
    ui.heading(app, '路线总图 / 艺术演绎', '沿途的自然天险', '大渡河、夹金山、草地均可自由选择，无需依次解锁；三关共享体力与物资。');
    var layout = ui.el('div', 'map-layout');
    var mapSection = ui.el('section', 'map-section');
    var mapData = XZ.data.map;
    var picking = /(?:^|&)pick=1(?:&|$)/.test((window.location.search || '').slice(1));
    var zoom = ui.button('放大查看地图', function () { openViewer(); }, { secondary: true, disabled: true });

    function positionStatus(level) {
      return level.position.x.status === 'verified' && level.position.y.status === 'verified' ? 'verified' : 'pending';
    }
    function progressLabel(level) {
      return !XZ.state.isUnlocked(level.id) ? '未开放' : state.progress[level.id].completed ? '已过' : '待挑战';
    }
    function progressClass(level) {
      return !XZ.state.isUnlocked(level.id) ? 'is-locked' : state.progress[level.id].completed ? 'is-complete' : 'is-available';
    }
    function createLegend() {
      var legend = ui.el('div', 'map-legend');
      legend.setAttribute('aria-label', '关卡图例');
      XZ.data.levels.forEach(function (level, index) {
        legend.appendChild(ui.el('span', 'map-legend-entry ' + progressClass(level),
          '①②③'.charAt(index) + ' ' + level.name + ' · ' + progressLabel(level)));
      });
      return legend;
    }
    function addPoints(surface) {
      XZ.data.levels.forEach(function (level, index) {
        var x = level.position.x.value, y = level.position.y.value;
        // 按整图比例计算最近点的轴向间距；标记至多占间距的八成，互不遮挡。
        var spacing = XZ.data.levels.reduce(function (nearest, other) {
          if (other === level) { return nearest; }
          return Math.min(nearest, Math.max(Math.abs(x - other.position.x.value),
            Math.abs(y - other.position.y.value) * mapData.height / mapData.width));
        }, 100) * 0.8;
        var point = ui.el('span', 'map-point ' + progressClass(level));
        point.setAttribute('role', 'img');
        point.setAttribute('aria-label', level.name + ' · ' + progressLabel(level));
        point.title = level.name + ' · ' + progressLabel(level) + '；坐标' + (positionStatus(level) === 'verified' ? '已核实' : '待核实');
        point.style.left = x + '%'; point.style.top = y + '%';
        point.style.setProperty('--map-point-spacing', spacing + 'cqw');
        var dot = ui.el('span', 'map-dot', String(index + 1));
        dot.setAttribute('aria-hidden', 'true'); point.appendChild(dot);
        surface.appendChild(point);
      });
    }
    function enablePicker(surface, image) {
      if (!picking) { return; }
      surface.dataset.picking = 'true';
      surface.addEventListener('click', function (event) {
        if (surface.dataset.loaded !== 'true') { return; }
        var rect = image.getBoundingClientRect();
        var x = Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)).toFixed(1);
        var y = Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100)).toFixed(1);
        var label = '关卡点位置（待作者对照地图核实）';
        // file:// 也可选中复制，不依赖剪贴板权限或在线 API。
        window.prompt('相对整幅图片：x = ' + x + '%，y = ' + y + '%。复制片段后替换对应关卡 position；核实后再把 x、y 的 status 改为 verified。',
          'position: { x: param(' + x + ", '%', '" + label + "', 'pending'), y: param(" + y + ", '%', '" + label + "', 'pending') }");
      });
    }
    function createMap(enlarged) {
      var surface = ui.el('div', 'map-placeholder' + (enlarged ? ' map-original' : ''));
      surface.style.aspectRatio = mapData.width + ' / ' + mapData.height;
      surface.setAttribute('aria-label', '标准地图底图，关卡点由作者对照标准地图标注');
      var note = ui.el('div', 'map-placeholder-note');
      note.appendChild(ui.el('span', 'eyebrow', '标准地图底图位置'));
      var message = ui.el('p', '', '此处待放置自然资源部标准地图，资料见下方。');
      note.appendChild(message); note.appendChild(ui.badge('pending')); surface.appendChild(note);
      // 未配置图片时不创建 img，也不请求占位路径。
      if (mapData.image) {
        var image = ui.el('img', 'standard-map');
        image.alt = '中国地图 1:2200万 16开 无邻国 线划一，含南海诸岛附图、图例及审图号 GS(2016)2884号';
        image.width = mapData.width; image.height = mapData.height; image.hidden = true;
        image.onload = function () {
          image.hidden = false; note.hidden = true; surface.dataset.loaded = 'true';
          if (!enlarged) { zoom.disabled = false; }
        };
        image.onerror = function () {
          image.hidden = true; note.hidden = false; surface.dataset.loaded = 'false';
          message.textContent = '底图加载失败，请检查 XZ.data.map.image 的本地文件路径。';
          if (!enlarged) { zoom.disabled = true; }
        };
        image.src = mapData.image; surface.appendChild(image); enablePicker(surface, image);
      }
      addPoints(surface); return surface;
    }
    function openViewer() {
      var previousFocus = document.activeElement;
      var viewer = ui.el('dialog', 'map-viewer');
      viewer.setAttribute('aria-labelledby', 'map-viewer-title');
      var toolbar = ui.el('div', 'map-viewer-toolbar');
      var title = ui.el('h2', '', '放大查看地图'); title.id = 'map-viewer-title'; toolbar.appendChild(title);
      var close = ui.button('关闭地图', function () { viewer.close(); }, { secondary: true });
      toolbar.appendChild(close); viewer.appendChild(toolbar);
      var tiers = ['适合宽度', '2 倍', '原始大小'], tier = 1;
      var controls = ui.el('div', 'map-viewer-zoom');
      controls.setAttribute('role', 'group'); controls.setAttribute('aria-label', '地图缩放');
      var smaller = ui.button('－', function () { changeTier(-1); }, { secondary: true });
      smaller.setAttribute('aria-label', '缩小地图');
      var current = ui.el('span', 'map-viewer-scale'); current.setAttribute('aria-live', 'polite');
      var larger = ui.button('＋', function () { changeTier(1); }, { secondary: true });
      larger.setAttribute('aria-label', '放大地图');
      controls.appendChild(smaller); controls.appendChild(current); controls.appendChild(larger); viewer.appendChild(controls);
      viewer.appendChild(ui.el('p', 'map-viewer-help', '可上下、左右滚动查看整幅地图；按 Esc 关闭。'));
      if (picking) { viewer.appendChild(ui.el('p', 'map-pick-note', '坐标拾取已启用：点击地图，复制弹出的坐标片段。')); }
      var scroll = ui.el('div', 'map-viewer-scroll'); scroll.tabIndex = 0;
      scroll.setAttribute('role', 'region'); scroll.setAttribute('aria-label', '地图滚动区域');
      var original = createMap(true);
      scroll.appendChild(original); viewer.appendChild(scroll);
      viewer.appendChild(createLegend());
      viewer.appendChild(ui.el('p', 'map-viewer-help', '审图号：' + mapData.reviewNumber.value + ' · ' + mapData.source.value));
      function sizeAndCenter() {
        var width = tier === 2 ? mapData.width : scroll.clientWidth * (tier === 1 ? 2 : 1);
        var height = width * mapData.height / mapData.width;
        original.style.width = width + 'px'; original.style.height = height + 'px';
        var center = XZ.data.levels.reduce(function (sum, level) {
          sum.x += level.position.x.value; sum.y += level.position.y.value; return sum;
        }, { x: 0, y: 0 });
        var count = XZ.data.levels.length;
        var x = count ? center.x / count / 100 : 0.5, y = count ? center.y / count / 100 : 0.5;
        // 边缘或整图小于视口时，滚动范围自然限制到图片边界。
        scroll.scrollLeft = Math.max(0, Math.min(width - scroll.clientWidth, width * x - scroll.clientWidth / 2));
        scroll.scrollTop = Math.max(0, Math.min(height - scroll.clientHeight, height * y - scroll.clientHeight / 2));
        current.textContent = tiers[tier];
        smaller.disabled = tier === 0; larger.disabled = tier === tiers.length - 1;
      }
      function changeTier(step) {
        tier = Math.max(0, Math.min(tiers.length - 1, tier + step)); sizeAndCenter();
      }
      var previousOverflow = document.body.style.overflow;
      viewer.addEventListener('close', function () {
        window.removeEventListener('resize', sizeAndCenter);
        document.body.style.overflow = previousOverflow;
        viewer.parentNode.removeChild(viewer);
        if (previousFocus && previousFocus.isConnected) { previousFocus.focus(); }
      });
      // 原生 modal dialog 提供背景隔离、Tab 焦点限制与 Esc 关闭。
      document.body.appendChild(viewer); document.body.style.overflow = 'hidden'; viewer.showModal();
      sizeAndCenter(); window.addEventListener('resize', sizeAndCenter); close.focus();
    }
    mapSection.appendChild(createMap(false));
    mapSection.appendChild(createLegend());
    var mapActions = ui.el('div', 'actions'); mapActions.appendChild(zoom); mapSection.appendChild(mapActions);
    if (picking) { mapSection.appendChild(ui.el('p', 'map-pick-note', '坐标拾取已启用：点击地图，复制弹出的坐标片段。')); }
    // 作者要求精简显示并保留一处审图号；完整信息保留在 XZ.data.map 与规则文档中。
    var metadata = ui.el('div', 'map-metadata');
    metadata.appendChild(ui.el('p', 'map-metadata-title', '底图来源'));
    metadata.appendChild(ui.el('p', '', mapData.source.value + '，出处：' + mapData.source.source + '，关卡点由作者对照标准地图标注'));
    metadata.appendChild(ui.el('p', '', '审图号：' + (mapData.reviewNumber.value || '待填写')));
    mapSection.appendChild(metadata);
    layout.appendChild(mapSection);
    var list = ui.el('div', 'level-list');
    XZ.data.levels.forEach(function (level, index) {
      var content = ui.el('div');
      content.appendChild(ui.illustration(level, 'level-thumbnail'));
      content.appendChild(ui.el('p', 'eyebrow', level.kind));
      var verification = ui.el('p', 'map-coordinate-status', '关卡点坐标：');
      verification.dataset.status = positionStatus(level); content.appendChild(verification);
      if (!XZ.state.isUnlocked(level.id)) {
        content.appendChild(ui.el('span', 'locked-label', '本关暂未开放'));
      } else if (state.progress[level.id].completed) {
        content.appendChild(ui.el('span', 'passed-seal', '已过'));
        content.appendChild(ui.stars(state.progress[level.id].stars));
        content.appendChild(ui.button('重看本关字幕', function () {
          stopCredits = ui.credits.open(level.id, { onDone: function () { stopCredits = null; } });
        }, { secondary: true }));
        content.appendChild(ui.badge('param'));
        var historyButton = ui.button('查看史料卡', function () { XZ.router.go('level', { id: level.id }); }, { secondary: true });
        historyButton.setAttribute('aria-label', level.name + ' · 查看史料卡'); content.appendChild(historyButton);
      } else {
        content.appendChild(ui.el('p', '', '读一张侦察简报，再带队伍闯过自然天险。'));
        var enterButton = ui.button(state.active && state.active.id === level.id ? '继续本关侦察 →' : '进入关卡 →', function () { XZ.router.go('level', { id: level.id }); });
        enterButton.setAttribute('aria-label', level.name + ' · 进入'); content.appendChild(enterButton);
      }
      var card = ui.card((index + 1) + ' · ' + level.name, content);
      // 关卡坐标的标签单独保留在对应说明旁，避免被卡片通用去重移走。
      verification.appendChild(ui.badge(positionStatus(level))); list.appendChild(card);
    });
    layout.appendChild(list); app.appendChild(layout);
    var actions = ui.el('div', 'actions');
    if (XZ.state.allAvailableComplete()) {
      actions.appendChild(ui.button('查看三关结算 →', function () { XZ.router.go('result'); }));
    }
    actions.appendChild(ui.button('返回开始页', function () { XZ.router.go('start'); }, { secondary: true }));
    app.appendChild(actions);
    return function () { if (stopCredits) { stopCredits(); } };
  });
}());

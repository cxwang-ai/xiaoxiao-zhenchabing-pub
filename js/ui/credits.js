(function () {
  'use strict';
  var XZ = window.XZ, ui = XZ.ui;
  function sceneFor(levelId) {
    return XZ.data.credits.scenes.find(function (scene) { return scene.level === levelId; });
  }
  function storyFor(scene) {
    var candidate = scene.story.useCandidate && XZ.data.historyCandidates[scene.level];
    return candidate ? { text: candidate.text, source: candidate.source, status: candidate.status || scene.story.status } : scene.story;
  }
  function content(levelId) {
    var scene = sceneFor(levelId), body = ui.el('div', 'credits-content');
    if (!scene) { return body; }
    body.appendChild(ui.el('p', 'eyebrow', scene.heading + ' · ' + XZ.data.credits.title));
    var story = storyFor(scene), history = ui.el('section', 'credits-story');
    history.appendChild(ui.el('h2', '', '背景故事')); history.appendChild(ui.badge(story.status));
    history.appendChild(ui.el('blockquote', '', story.text)); history.appendChild(ui.source(story)); body.appendChild(history);
    var today = XZ.data.today[levelId];
    if (today) {
      var comparison = ui.el('section', 'credits-today');
      comparison.appendChild(ui.el('h2', '', '今昔对比')); comparison.appendChild(ui.badge(today.status));
      var columns = ui.el('div', 'today-columns');
      [['当年', today.then], ['今天', today.now]].forEach(function (item) {
        var column = ui.el('div'); column.appendChild(ui.el('h3', '', item[0])); column.appendChild(ui.el('p', '', item[1])); columns.appendChild(column);
      });
      comparison.appendChild(columns); comparison.appendChild(ui.source(today)); body.appendChild(comparison);
    }
    var essay = ui.el('section', 'credits-essay');
    essay.appendChild(ui.el('h2', '', scene.essay.title)); essay.appendChild(ui.el('span', 'badge badge-author', '作者原创'));
    // 每个段落直接 textContent，保留每个字符与全部段落，禁止摘要、改写和截断。
    scene.essay.paragraphs.forEach(function (paragraph) { essay.appendChild(ui.el('p', 'essay-paragraph', paragraph)); });
    body.appendChild(essay); body.appendChild(ui.el('p', 'credits-ending', '本关字幕完 · 虚构人物 · 艺术演绎'));
    return body;
  }
  function open(levelId, options) {
    options = options || {};
    var scene = sceneFor(levelId), dialog = ui.el('dialog', 'credits-dialog');
    dialog.setAttribute('aria-label', scene.heading + '关卡字幕');
    var toolbar = ui.el('div', 'credits-toolbar');
    toolbar.appendChild(ui.el('strong', '', scene.heading + ' · 关卡字幕'));
    var reduced = Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var paused = reduced, fast = false, frame = null, last = null, ending = 0, disposed = false, position = 0;
    var scroll = ui.el('div', 'credits-scroll'); scroll.tabIndex = 0;
    scroll.setAttribute('role', 'region'); scroll.setAttribute('aria-label', '字幕阅读区域'); scroll.appendChild(content(levelId));
    var status = ui.el('p', 'credits-help', reduced ? '减少动态效果已启用，请滚动阅读，读完后点击结束。' : '字幕缓缓上移，可暂停后滚动阅读。');
    var pause = ui.button(reduced ? '手动阅读' : '暂停', function () {
      paused = !paused; position = scroll.scrollTop; pause.textContent = paused ? '继续' : '暂停'; last = null;
    }, { secondary: true, disabled: reduced });
    var speed = ui.button('加速', function () { fast = !fast; speed.textContent = fast ? '正常' : '加速'; }, { secondary: true, disabled: reduced });
    toolbar.appendChild(pause); toolbar.appendChild(speed);
    toolbar.appendChild(ui.button(reduced ? '结束字幕' : '跳过字幕', function () { dialog.close(); }, { secondary: true }));
    dialog.appendChild(toolbar); dialog.appendChild(status); dialog.appendChild(scroll);
    function stopAnimation() { disposed = true; if (frame !== null) { window.cancelAnimationFrame(frame); frame = null; } }
    var disposeModal = ui.modal(dialog, function () { stopAnimation(); if (options.onDone) { options.onDone(); } });
    function animate(now) {
      frame = null; if (disposed) { return; }
      var dt = last === null ? 0 : Math.min(0.1, (now - last) / 1000); last = now;
      if (!paused && !document.hidden) {
        position += dt * (options.speed || 18) * (fast ? 3 : 1);
        scroll.scrollTop = position;
        if (scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 1) {
          ending += dt; if (ending >= 3) { dialog.close(); return; }
        } else { ending = 0; }
      } else { position = scroll.scrollTop; }
      frame = window.requestAnimationFrame(animate);
    }
    // 鼠标、触屏和键盘手动阅读时停住字幕，避免与读者争夺滚动位置。
    function manual() { if (!reduced) { paused = true; pause.textContent = '继续'; } }
    scroll.addEventListener('wheel', manual); scroll.addEventListener('touchstart', manual);
    scroll.addEventListener('keydown', function (event) { if (/^(Arrow|Page|Home|End| )/.test(event.key)) { manual(); } });
    if (!reduced) { frame = window.requestAnimationFrame(animate); }
    pause.focus({ preventScroll: true });
    if (reduced) { scroll.focus({ preventScroll: true }); }
    return function () { stopAnimation(); disposeModal(); };
  }
  function sources() {
    var entries = [];
    function add(data) {
      if (data && data.source && data.source !== '作者原创' && entries.indexOf(data.source) === -1) { entries.push(data.source); }
    }
    function walk(data) {
      if (!data || typeof data !== 'object') { return; }
      add(data); Object.keys(data).forEach(function (key) { if (key !== 'source') { walk(data[key]); } });
    }
    XZ.data.credits.scenes.forEach(function (scene) { add(storyFor(scene)); add(XZ.data.today[scene.level]); });
    // 关卡展示过的科学数据、连环画与史料来源，加上可进入本次题库的来源。
    XZ.data.levels.forEach(walk);
    (XZ.data.quiz || []).filter(function (q) { return q.status === 'verified' || (ui.quiz.isPreview() && q.status === 'pending'); }).forEach(add);
    add({ source: XZ.data.map.source.value }); return entries;
  }
  ui.credits = { content: content, open: open, sources: sources };
}());

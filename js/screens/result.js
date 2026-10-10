(function () {
  'use strict';
  var XZ = window.XZ;
  var ui = XZ.ui;
  XZ.router.register('result', function (app) {
    if (!XZ.state.allAvailableComplete()) { XZ.router.go('map'); return; }
    var state = XZ.state.get(), stopCredits = null;
    function levelName(level) { return level.name + (level.id === 'daduhe' ? ' · ' + state.progress[level.id].trips + ' 趟' : ''); }
    ui.heading(app, '侦察手记 / 三关结算', '这一程，你走过了三道天险', '大渡河、夹金山与草地已完成，回望你的资源选择与探索收获。');
    var summary = ui.el('div');
    summary.appendChild(ui.el('p', 'result-days', '总用时 ' + state.resources.days + ' 天'));
    summary.appendChild(ui.badge('param')); summary.appendChild(ui.el('p', 'science-note', '本页资源、用时与星级均为游戏参数，不代表真实行军数据或历史评价。')); summary.appendChild(ui.resources(state.resources));
    app.appendChild(ui.card('队伍的行进记录', summary));
    var ratings = ui.el('div', 'rating-grid');
    XZ.data.levels.forEach(function (level) {
      var content = ui.el('div');
      if (state.progress[level.id].completed) {
        var progress = state.progress[level.id];
        content.appendChild(ui.el('p', 'level-score', '本次分数 ' + (progress.score === undefined ? '旧成绩未记录' : progress.score)));
        if (progress.usedSupplement) { content.appendChild(ui.el('p', 'supplement-mark', '使用补给')); }
        content.appendChild(ui.stars(state.progress[level.id].stars));
        content.appendChild(ui.button('重看本关字幕', function () {
          stopCredits = ui.credits.open(level.id, { onDone: function () { stopCredits = null; } });
        }, { secondary: true }));
      }
      else { content.appendChild(ui.el('p', 'muted', '未开放')); }
      ratings.appendChild(ui.card(levelName(level), content));
    });
    app.appendChild(ratings);
    var records = ui.el('section', 'highscore-summary');
    records.appendChild(ui.el('h2', 'section-title', '本机最高分 · ' + (state.difficulty === 'easy' ? '轻松' : '标准')));
    var total = 0, bestTotal = 0, missing = false;
    XZ.data.levels.forEach(function (level) {
      var best = XZ.highscores.best(level.id, state.difficulty, state.progress[level.id].trips); bestTotal += best;
      var score = state.progress[level.id].score;
      if (score === undefined) { missing = true; } else { total += score; }
      records.appendChild(ui.el('p', '', levelName(level) + '：' + best));
    });
    records.appendChild(ui.el('p', 'score-total', '三关总分 ' + total + (missing ? '（旧存档部分成绩未记录）' : '')));
    records.appendChild(ui.el('p', '', '三关最高分合计 ' + bestTotal));
    var confirm = ui.el('div'); confirm.hidden = true;
    confirm.appendChild(ui.el('p', '', '确定清除两种难度的全部最高分？此操作无法撤销。'));
    confirm.appendChild(ui.button('确认清除', function () {
      var cleared = XZ.highscores.clear();
      if (cleared) { XZ.router.go('result'); }
      else { confirm.appendChild(ui.el('p', '', '存储暂时不可用，未能清除磁盘记录；游戏可继续。')); }
    }));
    confirm.appendChild(ui.button('取消', function () { confirm.hidden = true; clearButton.focus(); }, {secondary: true}));
    var clearButton = ui.button('清除最高分', function () { confirm.hidden = false; confirm.querySelector('button').focus(); }, {secondary: true});
    records.appendChild(clearButton); records.appendChild(confirm); app.appendChild(records);
    app.appendChild(ui.el('h2', 'section-title', '已解锁的史料卡'));
    var collected = XZ.data.levels.filter(function (level) { return state.cards.indexOf(level.history.id) !== -1; });
    if (!collected.length) { app.appendChild(ui.el('p', '', '还未阅读史料卡。回到总图打开已完成的关卡，即可完成“史”步骤。')); }
    collected.forEach(function (level) { app.appendChild(ui.history(level.history)); });
    // “长征精神与今天”由作者三篇短文构成（见 credits.js），此处列出标题，全文在各关字幕中。
    var reflection = ui.el('div');
    var essays = ui.el('ul', 'reflection-essays');
    XZ.data.credits.scenes.forEach(function (scene) {
      essays.appendChild(ui.el('li', '', scene.heading + '：《' + scene.essay.title + '》'));
    });
    reflection.appendChild(essays);
    reflection.appendChild(ui.el('p', 'muted', '作者原创短文，全文见各关通关后的字幕，可在上方点击“重看本关字幕”。'));
    app.appendChild(ui.card('长征精神与今天', reflection));
    var ending = ui.el('section', 'ending-notes');
    ending.appendChild(ui.el('h2', 'section-title', '片尾说明 · 史料与数据出处汇总'));
    ending.appendChild(ui.el('p', '', '三关字幕可在上方关卡卡片重看。虚构人物 · 艺术演绎。'));
    ending.appendChild(ui.el('p', '', '标准地图审图号：' + XZ.data.map.reviewNumber.value));
    ending.appendChild(ui.badge(XZ.data.map.reviewNumber.status));
    ui.credits.sources().forEach(function (source) { ending.appendChild(ui.source({ source: source })); });
    app.appendChild(ending);
    var actions = ui.el('div', 'actions');
    actions.appendChild(ui.button('重新挑战 →', function () { var difficulty = state.difficulty; XZ.state.reset(); XZ.state.start(difficulty); XZ.router.go('map'); }));
    actions.appendChild(ui.button('回到总图', function () { XZ.router.go('map'); }, { secondary: true }));
    app.appendChild(actions);
    app.appendChild(ui.el('p', 'muted', '重新挑战会清空存档、资源、星级与已解锁卡片，从头开始；本机最高分保留。'));
    return function () { if (stopCredits) { stopCredits(); } };
  });
}());

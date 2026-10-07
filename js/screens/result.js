(function () {
  'use strict';
  var XZ = window.XZ;
  var ui = XZ.ui;
  XZ.router.register('result', function (app) {
    if (!XZ.state.allAvailableComplete()) { XZ.router.go('map'); return; }
    var state = XZ.state.get();
    ui.heading(app, '侦察手记 / 三关结算', '这一程，你走过了三道天险', '大渡河、夹金山与草地已完成，回望你的资源选择与探索收获。');
    var summary = ui.el('div');
    summary.appendChild(ui.el('p', 'result-days', '总用时 ' + state.resources.days + ' 天'));
    summary.appendChild(ui.badge('param')); summary.appendChild(ui.el('p', 'science-note', '本页资源、用时与星级均为游戏参数，不代表真实行军数据或历史评价。')); summary.appendChild(ui.resources(state.resources));
    app.appendChild(ui.card('队伍的行进记录', summary));
    var ratings = ui.el('div', 'rating-grid');
    XZ.data.levels.forEach(function (level) {
      var content = ui.el('div');
      if (state.progress[level.id].completed) { content.appendChild(ui.stars(state.progress[level.id].stars)); }
      else { content.appendChild(ui.el('p', 'muted', '未开放')); }
      ratings.appendChild(ui.card(level.name, content));
    });
    app.appendChild(ratings);
    app.appendChild(ui.el('h2', 'section-title', '已解锁的史料卡'));
    var collected = XZ.data.levels.filter(function (level) { return state.cards.indexOf(level.history.id) !== -1; });
    if (!collected.length) { app.appendChild(ui.el('p', '', '还未阅读史料卡。回到总图打开已完成的关卡，即可完成“史”步骤。')); }
    collected.forEach(function (level) { app.appendChild(ui.history(level.history)); });
    var reflection = ui.el('div');
    reflection.appendChild(ui.badge(XZ.data.game.reflection.status)); reflection.appendChild(ui.el('p', '', XZ.data.game.reflection.value));
    reflection.appendChild(ui.source(XZ.data.game.reflection)); app.appendChild(ui.card('长征精神与今天', reflection));
    var actions = ui.el('div', 'actions');
    actions.appendChild(ui.button('重新挑战 →', function () { XZ.state.reset(); XZ.state.start(); XZ.router.go('map'); }));
    actions.appendChild(ui.button('回到总图', function () { XZ.router.go('map'); }, { secondary: true }));
    app.appendChild(actions);
    app.appendChild(ui.el('p', 'muted', '重新挑战会清空存档、资源、星级与已解锁卡片，从头开始。'));
  });
}());

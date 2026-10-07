(function () {
  'use strict';
  var XZ = window.XZ;
  var ui = XZ.ui;
  XZ.router.register('start', function (app) {
    var hero = ui.el('section', 'start-hero');
    var copy = ui.el('div', 'hero-copy');
    ui.heading(copy, '从自然科学读懂行进的选择', '小小侦察兵', '长征路上的自然天险');
    copy.appendChild(ui.el('p', 'hero-intro', '做一名虚构的小侦察兵，观察环境、探索规律，再为队伍作出选择。'));
    var statement = ui.el('p', 'art-statement', '艺术演绎 · 角色、决策与资源均为游戏设计；待核实内容不能当作历史事实。');
    copy.appendChild(statement);
    var actions = ui.el('div', 'actions');
    if (XZ.state.hasSave()) {
      actions.appendChild(ui.button('继续侦察 →', function () { XZ.router.go('map'); }));
    }
    actions.appendChild(ui.button(XZ.state.hasSave() ? '重新开始' : '开始侦察 →', function () {
      XZ.state.reset(); XZ.state.start(); XZ.router.go('map');
    }, { secondary: XZ.state.hasSave() }));
    copy.appendChild(actions); hero.appendChild(copy);
    var art = ui.el('figure', 'hero-art');
    var image = ui.el('img'); image.src = 'assets/img/snow-mountain.svg';
    image.alt = '木刻风格的雪山和一名背向观众的虚构侦察兵剪影';
    art.appendChild(image); art.appendChild(ui.el('figcaption', '', '山高路远，先看清，再出发。'));
    hero.appendChild(art); app.appendChild(hero);

    var instructions = ui.el('div', 'instruction-grid');
    [
      ['看', '认识天险', '先读简介与数据标签，分清已知内容和待核实资料。'],
      ['探', '动手探索', '探索水文、海拔与沼泽线索，观察自然模型怎样变化。'],
      ['闯', '组合决策', '依次走过三关，共享资源，检验决策与寻路后果。'],
      ['史', '回望史料', '通关后解锁史料卡；原文与出处由作者核实后填写。']
    ].forEach(function (item) {
      var card = ui.card(item[1], item[2], { className: 'instruction-card' });
      card.insertBefore(ui.el('span', 'step-seal', item[0]), card.firstChild); instructions.appendChild(card);
    });
    app.appendChild(instructions);
    var legend = ui.el('div', 'data-legend');
    legend.appendChild(ui.el('p', '', '读懂标签'));
    ['pending', 'model', 'param', 'verified'].forEach(function (status) { legend.appendChild(ui.badge(status)); });
    legend.appendChild(ui.el('p', 'muted', '模型帮助理解规律，游戏参数不是真实观测；待核实资料请看出处。'));
    app.appendChild(legend);
  });
}());

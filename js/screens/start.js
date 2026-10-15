(function () {
  'use strict';
  var XZ = window.XZ;
  var ui = XZ.ui;
  function accessForm() {
    var form = ui.el('form', 'access-gate');
    form.id = 'access-form'; form.noValidate = true;
    var label = ui.el('label', 'access-label', '侦察通行验证');
    label.htmlFor = 'access-code';
    form.appendChild(label);
    var help = ui.el('p', 'muted', '请输入获得的 4 位验证码，解锁游戏入口。');
    help.id = 'access-help'; form.appendChild(help);
    var row = ui.el('div', 'access-row');
    var input = ui.el('input', 'access-input');
    input.id = 'access-code'; input.name = 'access-code';
    input.type = 'password'; input.inputMode = 'numeric';
    input.maxLength = 4; input.required = true; input.autocomplete = 'off';
    input.placeholder = '4 位验证码';
    input.setAttribute('aria-describedby', 'access-help access-error');
    input.setAttribute('aria-invalid', 'false');
    var submit = ui.el('button', 'button', '验证并解锁 →');
    submit.type = 'submit';
    row.appendChild(input); row.appendChild(submit); form.appendChild(row);
    var error = ui.el('p', 'access-error');
    error.id = 'access-error'; error.setAttribute('role', 'alert');
    form.appendChild(error);
    input.addEventListener('input', function () {
      error.textContent = ''; input.setAttribute('aria-invalid', 'false');
    });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var code = input.value.trim();
      if (!XZ.router.verifyAccess(code)) {
        error.textContent = code ? '验证码不正确，请重新输入。' : '请输入验证码。';
        input.setAttribute('aria-invalid', 'true'); input.focus(); return;
      }
      XZ.router.go('start');
    });
    return form;
  }
  XZ.router.register('start', function (app) {
    var hero = ui.el('section', 'start-hero');
    var copy = ui.el('div', 'hero-copy');
    ui.heading(copy, '从自然科学读懂行进的选择', '小小侦察兵', '长征路上的自然天险');
    copy.appendChild(ui.el('p', 'hero-intro', '做一名虚构的小侦察兵，观察环境、探索规律，再带队伍渡河、攀山、走出沼泽。'));
    var statement = ui.el('p', 'art-statement', '艺术演绎 · 角色、玩法与资源均为游戏设计；待核实内容不能当作历史事实。');
    copy.appendChild(statement);
    if (!XZ.router.isAuthorized()) {
      copy.appendChild(accessForm());
    } else {
      copy.appendChild(ui.el('p', 'access-success', '验证通过，可以开始侦察。'));
      var difficulty = XZ.state.get().difficulty;
      var selection = ui.el('fieldset', 'difficulty-select'); selection.appendChild(ui.el('legend', '', '选择难度 · 游戏参数'));
      [['easy', '轻松', '第一次玩推荐轻松 · 可按住划桨'], ['standard', '标准', '速度较快、消耗较多']].forEach(function (item) {
        var label = ui.el('label', 'choice'), radio = ui.el('input');
        radio.type = 'radio'; radio.name = 'difficulty'; radio.value = item[0]; radio.checked = difficulty === item[0];
        radio.addEventListener('change', function () { difficulty = item[0]; });
        label.appendChild(radio); label.appendChild(ui.el('span', '', item[1] + ' · ' + item[2])); selection.appendChild(label);
      });
      copy.appendChild(selection);
      var actions = ui.el('div', 'actions');
      if (XZ.state.hasSave()) {
        actions.appendChild(ui.button('继续侦察 →', function () { XZ.state.setDifficulty(difficulty); XZ.router.go('map'); }));
      }
      actions.appendChild(ui.button(XZ.state.hasSave() ? '重新开始' : '开始侦察 →', function () {
        XZ.state.reset(); XZ.state.start(difficulty); XZ.router.go('map');
      }, { secondary: XZ.state.hasSave() }));
      copy.appendChild(actions);
    }
    hero.appendChild(copy);
    var art = ui.el('figure', 'hero-art');
    var image = ui.el('img'); image.src = 'assets/img/snow-mountain.svg';
    image.alt = '木刻风格的雪山和一名背向观众的虚构侦察兵剪影';
    art.appendChild(image); art.appendChild(ui.el('figcaption', '', '山高路远，先看清，再出发。'));
    hero.appendChild(art); app.appendChild(hero);

    var instructions = ui.el('div', 'instruction-grid');
    [
      ['看', '开场连环画', '读三格木刻旁白与核验标签，也可跳过。'],
      ['探', '侦察简报', '约 30 秒读懂一个关键图表，也可直接开始闯关。'],
      ['闯', '动手闯关', '划桨渡河、跳跃攀山、探杆行军；键盘或手机按键都可玩。'],
      ['史', '回望史料', '通关后阅读史料卡，查看原文、核实状态与出处。']
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

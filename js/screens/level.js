(function () {
  'use strict';
  var XZ = window.XZ;
  var ui = XZ.ui;
  XZ.router.register('level', function (app, options) {
    var level = XZ.data.levels.find(function (item) { return item.id === options.id && item.available; });
    if (!level || !XZ.state.get().started) { XZ.router.go('map'); return; }
    var entry = XZ.state.enter(level.id);
    if (!entry) { XZ.router.go('map'); return; }
    var engine = XZ.levels[level.id];
    var run = { step: entry.completed ? 3 : 0, furthest: entry.completed ? 3 : 0, entry: entry.entry, choices: {}, outcome: null, completed: Boolean(entry.completed) };
    var names = ['看', '探', '闯', '史'];
    var descriptions = ['认识天险', '探索科学', '组合决策', '解锁史料'];

    function move(step) { run.step = step; run.furthest = Math.max(run.furthest, step); render(true); }
    function retry() {
      var restored = XZ.state.enter(level.id);
      run.entry = restored.entry;
      run.seed = (run.grass ? run.grass.map.seed : (run.seed || XZ.data.levels[2].rules.defaultSeed.value)) + XZ.data.levels[2].rules.retrySeedStep.value; run.grass = null;
      run.outcome = null; run.furthest = 2; run.step = 2;
      render(true);
    }
    function render(focus, focusId) {
      app.textContent = '';
      ui.heading(app, level.kind + '侦察 / 艺术演绎', level.name, '观察自然规律，再决定如何前行。');
      if (focusId) { app.querySelector('.screen-heading').className += ' keep-heading'; }
      var stepper = ui.el('ol', 'stepper'); stepper.setAttribute('aria-label', '关卡步骤');
      names.forEach(function (name, index) {
        var item = ui.el('li', index === run.step ? 'is-active' : index < run.step ? 'is-past' : '');
        var canVisit = index <= run.furthest && (index < 3 || run.completed || (run.outcome && run.outcome.success));
        var control = ui.button(name + ' · ' + descriptions[index], function () { move(index); }, { secondary: true, disabled: !canVisit });
        if (index === run.step) { control.setAttribute('aria-current', 'step'); }
        item.appendChild(control); stepper.appendChild(item);
      });
      app.appendChild(stepper);
      var stage = ui.el('div', 'stage' + (focus || !focusId ? ' stage-enter' : '') + (run.step === 1 ? ' explore-stage' : ''));
      var stepTitle = ui.el('h2', 'stage-title', names[run.step] + ' · ' + descriptions[run.step]);
      stepTitle.id = 'step-title'; stepTitle.tabIndex = -1; stage.appendChild(stepTitle);
      if (run.step === 0) {
        stage.appendChild(ui.illustration(level, 'level-art'));
        var intro = ui.el('div'); intro.appendChild(ui.badge(level.introduction.status));
        intro.appendChild(ui.el('p', '', level.introduction.value || '【待填写：请由作者核验关卡位置、历史简介与出处】')); intro.appendChild(ui.source(level.introduction));
        intro.appendChild(ui.el('p', 'science-note', '你是一名虚构的普通红军侦察兵。在这一关，先探索自然模型，再安排队伍的行进方案。'));
        var facts = ui.el('div', 'fact-grid'); facts.appendChild(ui.datum(level.distance)); facts.appendChild(ui.datum(level.duration));
        intro.appendChild(facts); stage.appendChild(ui.card(level.name + '侦察任务', intro));
        stage.appendChild(ui.el('p', 'muted', '天险点位请在路线总图中查看；真实底图与地理位置待作者核验后补入。'));
      } else if (run.step === 1) {
        engine.renderExplore(stage, run);
      } else if (run.step === 2) {
        if (run.completed && !run.outcome) {
          stage.appendChild(ui.card('本关已完成', '本次存档已记录星级与资源，可以继续阅读史料卡。重新挑战请前往结算页。'));
        } else {
          engine.renderChallenge(stage, run, function (id) { render(false, id); }, retry);
        }
      } else {
        XZ.state.unlockCard(level.id);
        stage.appendChild(ui.history(level.history));
        stage.appendChild(ui.el('p', 'muted', '解锁代表完成游戏步骤；史料占位符仍待核实，不是已收集的真实引文。'));
      }
      app.appendChild(stage);
      var navigation = ui.el('nav', 'stage-navigation'); navigation.setAttribute('aria-label', '关卡翻页');
      navigation.appendChild(ui.button('← 上一步', function () { move(run.step - 1); }, { secondary: true, disabled: run.step === 0 }));
      if (run.step === 3) {
        navigation.appendChild(ui.button('回到路线总图 →', function () { XZ.router.go('map'); }));
      } else {
        var blocked = run.step === 2 && !run.completed && !(run.outcome && run.outcome.success);
        navigation.appendChild(ui.button(run.step === 2 ? '下一步 · 解锁史料 →' : '下一步 →', function () { move(run.step + 1); }, { disabled: blocked }));
      }
      app.appendChild(navigation);
      app.appendChild(ui.button('返回总图', function () {
        if (run.outcome && !run.outcome.success) { XZ.state.enter(level.id); }
        XZ.router.go('map');
      }, { secondary: true, className: 'back-map' }));
      if (focus || focusId) {
        window.scrollTo(0, 0);
        var target = document.getElementById(focusId || 'step-title');
        if (/^H[1-6]$/.test(target.tagName)) { target.tabIndex = -1; } target.focus({ preventScroll: true });
        if (focusId) { target.scrollIntoView({ block: 'center' }); }
      }
    }
    render(false);
  });
}());

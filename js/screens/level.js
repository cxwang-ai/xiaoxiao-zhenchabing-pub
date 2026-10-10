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
    var run = { step: entry.completed ? 3 : 0, entry: entry.entry, outcome: null, completed: Boolean(entry.completed), usedSupplement: Boolean(entry.usedSupplement) };
    var names = ['看', '探', '闯', '史'];
    var descriptions = ['开场连环画', '侦察简报', '街机闯关', '解锁史料'];
    var stopArcade = null, stopCredits = null;

    function returnToMap() {
      if (run.outcome && !run.outcome.success) { XZ.state.enter(level.id); }
      XZ.router.go('map');
    }
    function move(step) { run.step = step; render(true); }
    function retry(supplement) {
      // click 事件不是补给请求，只有显式 true 才使用补给。
      if (supplement === true) {
        if (run.practice) {
          run.entry.energy = Math.max(run.entry.energy, level.arcade.resourceFloor.energy.value);
          run.entry.supplies = Math.max(run.entry.supplies, level.arcade.resourceFloor.supplies.value);
          run.usedSupplement = true;
        } else { XZ.state.supplement(level.id); }
      }
      var restored = XZ.state.enter(level.id);
      run.practice = Boolean(restored.completed);
      run.entry = restored.entry || (supplement === true && run.practice ? run.entry : XZ.state.get().resources);
      run.usedSupplement = Boolean(restored.usedSupplement || run.practice && run.usedSupplement);
      run.arcadeAttempt = null;
      run.outcome = null; run.step = 2;
      render(true);
    }
    function render(focus, focusId) {
      if (stopArcade) { stopArcade(); stopArcade = null; }
      app.textContent = '';
      ui.heading(app, level.kind + '侦察 / 艺术演绎', level.name, '看一段连环画，探索自然，再动手闯关。');
      if (focusId) { app.querySelector('.screen-heading').className += ' keep-heading'; }
      var stepper = ui.el('ol', 'stepper'); stepper.setAttribute('aria-label', '关卡步骤');
      names.forEach(function (name, index) {
        var item = ui.el('li', index === run.step ? 'is-active' : index < run.step ? 'is-past' : '');
        var control = ui.el('span', 'step-label', name + ' · ' + descriptions[index]);
        if (index === run.step) { control.setAttribute('aria-current', 'step'); }
        item.appendChild(control); stepper.appendChild(item);
      });
      app.appendChild(stepper);
      var stage = ui.el('div', 'stage' + (focus || !focusId ? ' stage-enter' : '') + (run.step === 1 ? ' explore-stage' : ''));
      var stepTitle = ui.el('h2', 'stage-title', names[run.step] + ' · ' + descriptions[run.step]);
      stepTitle.id = 'step-title'; stepTitle.tabIndex = -1; stage.appendChild(stepTitle);
      if (run.step === 0) {
        stage.appendChild(ui.comic(level));
        if (ui.quiz.isPreview()) { stage.appendChild(ui.quiz.preview(level.id)); }
      } else if (run.step === 1) {
        engine.renderExplore(stage, run);
      } else if (run.step === 2) {
        if (run.completed && !run.outcome && !run.practice) {
          var completedCard = ui.card('本关已完成', '点击“重新游戏”可再次挑战本关，也可继续阅读史料卡。重玩保留本次存档中的星级与资源。');
          completedCard.appendChild(ui.button('重新游戏', retry));
          stage.appendChild(completedCard);
        } else {
          stage.dataset.arcade = 'true';
        }
      } else {
        XZ.state.unlockCard(level.id);
        stage.appendChild(ui.history(level.history));
        stage.appendChild(ui.el('p', 'muted', '解锁表示完成本关；史料核实状态与出处见卡片。'));
      }
      app.appendChild(stage);
      if (run.step === 2 && stage.dataset.arcade) {
        stopArcade = XZ.arcade.mount(stage, level, run, {
          retry: retry,
          result: function (outcome) {
            run.outcome = outcome; if (outcome.success) { run.completed = true; }
            render(false);
            if (outcome.success) {
              stopCredits = ui.credits.open(level.id, { onDone: function () { stopCredits = null; move(3); } });
            }
          }
        });
      }
      var navigation = ui.el('nav', 'stage-navigation'); navigation.setAttribute('aria-label', '关卡翻页');
      if (run.step > 0) {
        navigation.appendChild(ui.button('← 上一步', function () { move(run.step - 1); }, { secondary: true }));
      } else {
        navigation.appendChild(ui.button('返回总图', returnToMap, { secondary: true }));
      }
      if (run.step < 2) {
        navigation.appendChild(ui.button(run.step === 1 ? '开始闯关 →' : '下一步 →', function () { move(run.step + 1); }));
      } else {
        if (run.step === 2 && run.completed) {
          navigation.className += ' has-history';
          navigation.appendChild(ui.button('下一步 · 解锁史料 →', function () { move(3); }, { secondary: true }));
        }
        navigation.appendChild(ui.button('返回总图', returnToMap));
      }
      app.appendChild(navigation);
      if (run.step === 1) {
        app.appendChild(ui.button('返回总图', returnToMap, { secondary: true, className: 'back-map' }));
      }
      if (focus || focusId) {
        // 进入或重玩游戏保留阅读位置，开始按钮不额外触发页面跳转。
        if (run.step !== 2) { window.scrollTo(0, 0); }
        var target = document.getElementById(focusId || 'step-title');
        if (/^H[1-6]$/.test(target.tagName)) { target.tabIndex = -1; } target.focus({ preventScroll: true });
        if (focusId) { target.scrollIntoView({ block: 'center' }); }
      }
    }
    render(false);
    return function () { if (stopCredits) { stopCredits(); stopCredits = null; } if (stopArcade) { stopArcade(); stopArcade = null; } };
  });
}());

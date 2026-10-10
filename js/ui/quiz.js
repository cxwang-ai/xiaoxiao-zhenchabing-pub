(function () {
  'use strict';
  var XZ = window.XZ, ui = XZ.ui;
  ui.quiz = {
    isPreview: function () { return /(?:^|&)quiz=preview(?:&|$)/.test((window.location.search || '').slice(1)); },
    preview: function (levelId) {
      var body = ui.el('div', 'quiz-preview');
      body.appendChild(ui.el('p', 'notice', '作者核对用；待核实题目不会进入街机宝箱。'));
      (XZ.data.quiz || []).filter(function (q) { return q.level === levelId; }).forEach(function (q) {
        var item = ui.el('section', 'quiz-preview-item');
        item.appendChild(ui.el('h3', '', q.id + ' · ' + q.question)); item.appendChild(ui.badge(q.status));
        q.options.forEach(function (text, index) { item.appendChild(ui.el('p', '', (index + 1) + ' · ' + text)); });
        item.appendChild(ui.el('p', '', '正确答案：' + q.options[q.answer]));
        item.appendChild(ui.el('p', '', q.explain));
        if (q.quote && q.quote.trim() !== q.explain.trim()) { item.appendChild(ui.el('blockquote', '', q.quote)); }
        item.appendChild(ui.source(q)); body.appendChild(item);
      });
      return ui.details('作者题目预览', body);
    },
    // onReward(correct, question) 决定具体奖励；onClose({correct, reward}) 恢复小游戏。
    open: function (question, options) {
      var dialog = ui.el('dialog', 'quiz-dialog'), result = options.result || null, buttons = [], selected = 0;
      var title = ui.el('h2', '', '宝箱问答'); title.id = 'quiz-title';
      dialog.setAttribute('aria-labelledby', title.id); dialog.appendChild(title);
      dialog.appendChild(ui.badge(question.status));
      dialog.appendChild(ui.el('p', 'quiz-question', question.question));
      var choices = ui.el('div', 'quiz-choices'), feedback = ui.el('div', 'quiz-feedback');
      feedback.setAttribute('role', 'status');
      function showResult() {
        buttons.forEach(function (button) { button.disabled = true; });
        feedback.appendChild(ui.el('h3', '', result.correct ? '答对了' : '答错不惩罚'));
        feedback.appendChild(ui.el('p', '', '正确答案：' + question.options[question.answer]));
        if (result.correct) {
          feedback.appendChild(ui.el('p', 'quiz-reward', result.reward && result.reward.text || '已完成问答'));
          if (result.reward && result.reward.status) { feedback.appendChild(ui.badge(result.reward.status)); }
        }
        var explain = (question.explain || '').trim(), quote = (question.quote || '').trim();
        if (explain) { feedback.appendChild(ui.el('p', '', explain)); }
        if (quote && quote !== explain) { feedback.appendChild(ui.el('blockquote', '', quote)); }
        feedback.appendChild(ui.source(question));
        var close = ui.button('关闭 · 继续游戏', function () { dialog.close(); });
        feedback.appendChild(close); close.focus({ preventScroll: true });
      }
      function answer(index) {
        if (result) { return; }
        var correct = index === question.answer;
        result = { correct: correct, reward: options.onReward ? options.onReward(correct, question) : null };
        showResult();
      }
      question.options.forEach(function (text, index) {
        var button = ui.button((index + 1) + ' · ' + text, function () { answer(index); }, { secondary: true });
        buttons.push(button); choices.appendChild(button);
      });
      dialog.appendChild(choices); dialog.appendChild(feedback);
      dialog.appendChild(ui.el('p', 'muted', '按 1 / 2 / 3 选择，或方向键选项、回车确认。答错不扣体力。'));
      dialog.addEventListener('keydown', function (event) {
        if (result) { return; }
        var digit = /^[123]$/.test(event.key) ? Number(event.key) - 1 : -1;
        if (digit >= 0) { event.preventDefault(); answer(digit); }
        else if (/^Arrow(Left|Right|Up|Down)$/.test(event.key)) {
          event.preventDefault(); selected = buttons.indexOf(document.activeElement);
          selected = (Math.max(0, selected) + (/Left|Up/.test(event.key) ? 2 : 1)) % 3;
          buttons[selected].focus({ preventScroll: true });
        }
      });
      dialog.addEventListener('cancel', function (event) { if (!result) { event.preventDefault(); } });
      var modal = ui.modal(dialog, function () { options.onClose(result); });
      if (result) { showResult(); } else { buttons[0].focus({ preventScroll: true }); }
      return modal;
    }
  };
}());

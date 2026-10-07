(function () {
  'use strict';
  var XZ = window.XZ, ui = XZ.ui;
  function slider(id, title, min, max, value, unit) {
    var node = ui.el('div', 'slider-group'), label = ui.el('label', 'slider-label', title);
    label.htmlFor = id;
    var output = ui.el('output', 'slider-output', value + ' ' + (unit || '')); output.htmlFor = id; label.appendChild(output); node.appendChild(label);
    var input = ui.el('input'); input.type = 'range'; input.id = id; input.min = min; input.max = max; input.step = 1; input.value = value; node.appendChild(input);
    var limits = ui.el('div', 'slider-limits'); limits.appendChild(ui.el('span', '', min + ' ' + (unit || ''))); limits.appendChild(ui.el('span', '', max + ' ' + (unit || ''))); node.appendChild(limits);
    return { node: node, input: input, output: output };
  }
  function choices(form, dimensions, values, disabled, onChange) {
    dimensions.forEach(function (dimension) {
      var field = ui.el('fieldset'); field.appendChild(ui.el('legend', '', dimension.title));
      var grid = ui.el('div', 'choice-grid');
      dimension.options.forEach(function (option) {
        var label = ui.el('label', 'choice'), radio = ui.el('input'); radio.type = 'radio'; radio.name = dimension.id; radio.value = option.id;
        radio.checked = values[dimension.id] === option.id; radio.disabled = Boolean(disabled);
        radio.addEventListener('change', function () { values[dimension.id] = option.id; if (onChange) { onChange(); } });
        var parts = option.label.split('：'), copy = ui.el('span', 'choice-copy');
        copy.appendChild(ui.el('strong', '', parts[0]));
        if (parts[1]) { copy.appendChild(ui.el('small', 'choice-note', parts[1])); }
        if (option.cost) { copy.appendChild(ui.el('small', 'choice-note', '物资 ' + option.cost.value)); }
        label.appendChild(radio); label.appendChild(copy); grid.appendChild(label);
      });
      field.appendChild(grid); form.appendChild(field);
    });
  }
  // 只整理界面文案，结算数值、评价与完整解释仍直接来自规则返回值。
  function resultCopy(result, level, choices) {
    choices = choices || {};
    var id = level.id, reasons, conclusion;
    if (id === 'daduhe') {
      conclusion = result.stars === 3 ? '队伍稳稳渡过激流，保留了前行的力量。' : '队伍渡过了激流，渡河仍花费不少体力与时间。';
      reasons = [choices.ford === 'wide' ? '宽浅断面较大，同流量下流速较低。' : choices.ford === 'narrow' ? '窄深断面较小，同流量下流速较高。' : '断面面积影响流速与渡河消耗。',
        choices.period === 'night' ? '夜间省去等候，视野较差。' : '白天视野较好，另需等候与补给。',
        choices.wait && choices.wait !== 'now' ? '等候增加侦察，也消耗时间和物资。' : '立即出发，省下等候时间与补给。'];
    } else if (id === 'jiajinshan') {
      conclusion = result.stars === 3 ? '队伍翻过雪山，准备与节奏帮助保存了体力。' : '队伍翻过雪山，低温与稀薄空气都在消耗体力。';
      reasons = [choices.warmth === 'full' ? '充分保暖，减轻低温带来的消耗。' : '保暖准备影响低温下的体力消耗。',
        choices.pace === 'fast' ? '快速冲顶省时，缺氧消耗更大。' : '放慢节奏，减轻缺氧消耗但用时更长。',
        choices.departure === 'afternoon' ? '午后演示天气风险较高，干粮需求较少。' : choices.departure === 'morning' ? '上午演示天气风险较低，需等候。' : '凌晨省去等候，出发前另需干粮。'];
    } else {
      conclusion = result.hazards ? '队伍走出草地，松软沼泽消耗了额外体力。' : '队伍走出草地，这条路没有踩到沼泽隐患。';
      reasons = [result.hazards ? '踩险 ' + result.hazards + ' 次，松软沼泽额外耗体力。' : '没有踩险，避开了额外体力损失。',
        '走了 ' + result.steps + ' 步，每步消耗体力和物资。', '补给减轻温差消耗，也占用物资。'];
    }
    if (!result.success) {
      conclusion = result.remaining.energy <= 0 ? '队伍体力耗尽，需要调整方案再出发。' : '物资不够支撑这次行进，需要调整方案。';
      reasons[2] = result.remaining.energy <= 0 ? '累计消耗超过了队伍的体力储备。' : '所需物资 ' + result.requiredSupplies + '，超过出发储备。';
    }
    return { conclusion: conclusion, reasons: reasons };
  }
  function preview(result) {
    return result ? '预计消耗：体力 ' + result.loss + ' · 物资 ' + result.requiredSupplies + ' · 用时 ' + result.delta.days + ' 天。' + (result.failure ? '资源不足，请调整方案。' : '') : '选齐方案，看看队伍需要多少补给。';
  }
  function outcome(host, result, retry, level, choices) {
    var body = ui.el('div'); body.appendChild(ui.badge('param'));
    var copy = resultCopy(result, level, choices);
    body.appendChild(ui.el('p', 'outcome-conclusion', copy.conclusion));
    var reasons = ui.el('ul', 'outcome-reasons'); copy.reasons.forEach(function (text) { reasons.appendChild(ui.el('li', '', text)); }); body.appendChild(reasons);
    body.appendChild(ui.stars(result.stars));
    body.appendChild(ui.el('p', 'delta', '体力 ' + result.delta.energy + ' · 物资 ' + result.delta.supplies + ' · 天数 +' + result.delta.days));
    body.appendChild(ui.resources(result.remaining));
    var calculations = ui.el('ul', 'explanations'); result.explanations.forEach(function (text) { calculations.appendChild(ui.el('li', '', text)); });
    body.appendChild(ui.details('查看计算过程', calculations));
    body.appendChild(ui.el('p', 'muted', result.success ? '侦察完成，继续解锁史料卡。' : '重试会恢复本关出发前的资源。'));
    if (!result.success) { body.appendChild(ui.button('重试本关', retry)); }
    var card = ui.card(result.success ? '行进结果' : '本关失败', body, { className: 'outcome-card' + (result.success ? '' : ' failure') });
    card.querySelector('h2').id = 'outcome-title'; host.appendChild(card);
  }
  function ruleTable(host, level) {
    var details = ui.el('details', 'rule-details'); details.appendChild(ui.el('summary', '', '展开游戏规则表')); details.appendChild(ui.badge('param'));
    function walk(value, prefix) {
      if (value && Object.prototype.hasOwnProperty.call(value, 'status')) {
        if (typeof value.value === 'number') { details.appendChild(ui.el('p', 'rule-row', (prefix ? prefix + ' · ' : '') + value.label + '：' + value.value + ' ' + value.unit)); }
      } else if (Array.isArray(value)) { value.forEach(function (item) { walk(item, item.label || item.title || prefix); }); }
      else if (value && typeof value === 'object') { Object.keys(value).forEach(function (key) { walk(value[key], prefix); }); }
    }
    walk(level.rules, '');
    details.appendChild(ui.el('p', 'science-note', '三关共享资源，不足即失败；重试只恢复本关起点。星级按本关消耗、用时或踩险与步数评估，不代表历史评价。')); host.appendChild(details);
  }
  function decision(host, level, run, changed, retry, options) {
    var body = ui.el('div'); body.appendChild(ui.badge('param')); body.appendChild(ui.el('p', '', '选好方案再出发，记得给后面的路留些补给。'));
    var form = ui.el('form', 'decision-form');
    if (options.before) { options.before(form); }
    var preview = ui.el('p', 'science-note'); preview.setAttribute('aria-live', 'polite');
    function update() { preview.textContent = options.preview(run.choices); }
    choices(form, options.dimensions, run.choices, run.outcome, update);
    var error = ui.el('p', 'form-message'); error.setAttribute('role', 'alert'); form.appendChild(preview); form.appendChild(error);
    var submit = ui.button('执行侦察方案 →', null, { disabled: Boolean(run.outcome) }); submit.type = 'submit'; form.appendChild(submit);
    form.addEventListener('submit', function (event) {
      event.preventDefault(); if (run.outcome) { return; }
      var result = options.evaluate(run.choices, run.entry);
      if (!result) { error.textContent = '请为每项决策选择一个方案。'; return; }
      run.outcome = result;
      if (result.success) { XZ.state.finish(level.id, result); run.completed = true; } else { XZ.state.fail(level.id, result); }
      changed('outcome-title');
    });
    body.appendChild(form); host.appendChild(ui.card(options.title, body)); update();
    if (run.outcome) { outcome(host, run.outcome, retry, level, run.choices); }
    ruleTable(host, level);
  }
  ui.slider = slider; ui.choices = choices; ui.outcome = outcome; ui.ruleTable = ruleTable; ui.decision = decision; ui.preview = preview;
}());

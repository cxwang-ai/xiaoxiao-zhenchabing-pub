(function () {
  'use strict';
  var XZ = window.XZ, ui = XZ.ui;
  function slider(id, title, min, max, value, unit, step) {
    var node = ui.el('div', 'slider-group'), label = ui.el('label', 'slider-label', title);
    label.htmlFor = id;
    var output = ui.el('output', 'slider-output', value + ' ' + (unit || '')); output.htmlFor = id; label.appendChild(output); node.appendChild(label);
    var input = ui.el('input'); input.type = 'range'; input.id = id; input.min = min; input.max = max; input.step = step || 1; input.value = value; node.appendChild(input);
    var limits = ui.el('div', 'slider-limits'); limits.appendChild(ui.el('span', '', min + ' ' + (unit || ''))); limits.appendChild(ui.el('span', '', max + ' ' + (unit || ''))); node.appendChild(limits);
    return { node: node, input: input, output: output };
  }
  function briefing(host, title, rule, body, mechanism, data) {
    body.insertBefore(ui.el('p', 'briefing-rule', rule), body.children[0] || null);
    body.appendChild(ui.el('p', 'briefing-mechanism', '这个规律会在游戏里起作用：' + mechanism));
    var card = ui.card(title, body, { className: 'scout-briefing' });
    // 折叠内容在 card 组装后加入，核验标签不会被提到卡片顶部。
    var sources = ui.el('div');
    data.forEach(function (datum) { sources.appendChild(ui.datum(datum)); });
    var seen = {};
    sources.querySelectorAll('.badge').forEach(function (mark) {
      if (seen[mark.textContent]) { mark.parentNode.removeChild(mark); } else { seen[mark.textContent] = true; }
    });
    card.appendChild(ui.details('资料与核验', sources)); host.appendChild(card);
  }
  ui.slider = slider; ui.briefing = briefing;
}());

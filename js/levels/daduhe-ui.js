(function () {
  'use strict';
  var XZ = window.XZ, ui = XZ.ui, engine = XZ.levels.daduhe;
  var level = XZ.data.levels.find(function (item) { return item.id === 'daduhe'; });
  function section(id) {
    var f = engine.ford(id), svg = XZ.charts.svgNode('svg', { viewBox: '0 0 560 240', role: 'img', class: 'chart-svg' });
    svg.appendChild(XZ.charts.svgNode('title', {}, 'V 形河谷横剖面示意，游戏参数，非实测比例'));
    svg.appendChild(XZ.charts.svgNode('path', { d: 'M25 30 L210 170 L280 210 L350 170 L535 30', class: 'chart-line' }));
    svg.appendChild(XZ.charts.svgNode('path', { d: 'M180 145 L380 145 L280 210 Z', fill: '#5B6B73', opacity: '.5' }));
    svg.appendChild(XZ.charts.svgNode('text', { x: 280, y: 125, 'text-anchor': 'middle', class: 'chart-label' }, '宽 ' + f.width.value + ' m · 平均水深 ' + f.depth.value + ' m'));
    svg.appendChild(XZ.charts.svgNode('text', { x: 280, y: 236, 'text-anchor': 'middle', class: 'chart-label' }, 'V 形峡谷示意 · 非实测比例'));
    return svg;
  }
  engine.renderExplore = function (host, run) {
    run.riverExplore = run.riverExplore || { month: 1, ford: 'wide' };
    var values = run.riverExplore, flow = engine.flowData();
    var body = ui.el('div'), flowInfo = ui.el('div'); flowInfo.appendChild(ui.datum(level.monthlyFlow));
    var warning = ui.el('p', 'notice demo-warning', flow === level.exploration.demoFlow ? '演示数据，非实测，待替换为水文资料' : '已填写水文资料，核验状态见标签与出处');
    body.appendChild(warning); body.appendChild(ui.badge(flow.status)); flowInfo.appendChild(ui.source(flow)); body.appendChild(ui.details('数据来源与核验状态', flowInfo));
    var month = ui.slider('flow-month', '模拟月份', 1, 12, values.month, '月'); body.appendChild(month.node);
    var bars = ui.el('div'); body.appendChild(bars); host.appendChild(ui.card('水文 · 月平均流量', body));
    var terrain = ui.el('div'); terrain.appendChild(ui.badge('param'));
    var form = ui.el('div', 'decision-form'); ui.choices(form, [{ id: 'ford', title: '比较断面', options: level.exploration.fords }], values, false, update); terrain.appendChild(form);
    var drawing = ui.el('div'); terrain.appendChild(drawing);
    terrain.appendChild(ui.el('p', 'science-note', '同样的流量，断面面积越大，平均流速越低。'));
    host.appendChild(ui.card('地形 · 河谷横剖面', terrain));
    var model = ui.el('div'); model.appendChild(ui.badge('model')); model.appendChild(ui.badge('param'));
    var reading = ui.el('p', 'risk-output'); reading.setAttribute('aria-live', 'polite'); model.appendChild(reading);
    model.appendChild(ui.el('p', 'science-note', '水流越急，渡河越费力。这里是模型推算，非实测流速。'));
    var calculation = ui.el('div'); calculation.appendChild(ui.datum(level.exploration.continuity));
    var formula = ui.el('p', 'formula'); calculation.appendChild(formula);
    calculation.appendChild(ui.el('p', 'muted', '断面面积 = 宽度 × 平均水深；平均水深已折算断面形状，不等于峡谷最深处。流量核验状态见水文卡，断面为游戏参数。'));
    model.appendChild(ui.details('查看模型与计算', calculation));
    host.appendChild(ui.card('简化模型 · 流速', model));
    function update() {
      values.month = Number(month.input.value); month.output.textContent = values.month + ' 月';
      bars.textContent = ''; bars.appendChild(XZ.charts.bars({ values: flow.value, selected: values.month, title: warning.textContent, yLabel: '流量 / m³/s' }));
      drawing.textContent = ''; drawing.appendChild(section(values.ford));
      var f = engine.ford(values.ford), area = f.width.value * f.depth.value;
      reading.textContent = '平均流速 ' + engine.velocity(values.month, values.ford).toFixed(2) + ' m/s';
      formula.textContent = '流量 ' + flow.value[values.month - 1] + ' m³/s ÷ 断面面积 ' + area + ' m² = 平均流速 ' + engine.velocity(values.month, values.ford).toFixed(2) + ' m/s（简化模型；断面为游戏参数）';
    }
    month.input.addEventListener('input', update); update();
  };
  engine.renderChallenge = function (host, run, changed, retry) {
    var arrival = engine.arrivalContext();
    var context = ui.el('div', 'notice');
    var arrivalInfo = ui.el('div'); arrivalInfo.appendChild(ui.datum(level.arrivalMonth));
    context.appendChild(ui.el('p', '', '你抵达时是 ' + arrival.month + ' 月，处于' + arrival.phase + '。选好渡口，决定是否多花时间侦察。'));
    arrivalInfo.appendChild(ui.el('p', 'muted', (engine.flowData() === level.exploration.demoFlow ? '演示流量' : '资料流量') + ' ' + arrival.flow + ' m³/s，全年由低到高排第 ' + arrival.rank + ' / 12；涨退水按相邻月趋势判断。'));
    context.appendChild(ui.badge(engine.flowData().status));
    arrivalInfo.appendChild(ui.el('p', 'science-note', '演示曲线非实测；闯关月份固定，探索滑块仅用于季节比较。'));
    context.appendChild(ui.details('抵达情景与资料', arrivalInfo));
    host.appendChild(context);
    var dimensions = [{ id: 'ford', title: '渡口类型', options: level.exploration.fords }].concat(level.rules.dimensions);
    ui.decision(host, level, run, changed, retry, { title: '安排渡河情景', dimensions: dimensions, evaluate: engine.evaluate,
      preview: preview });
    function preview(choices) { var result = engine.evaluate(choices, run.entry); return ui.preview(result); }
  };
}());

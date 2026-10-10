(function () {
  'use strict';
  var XZ = window.XZ, ui = XZ.ui, engine = XZ.levels.caodi;
  var level = XZ.data.levels.find(function (item) { return item.id === 'caodi'; });
  engine.renderExplore = function (host) {
    var body = ui.el('div'), diagram = ui.el('div', 'swamp-diagram');
    var svg = XZ.charts.svgNode('svg', { viewBox: '0 0 560 210', role: 'img', class: 'chart-svg' });
    svg.appendChild(XZ.charts.svgNode('title', {}, '点击草墩、积水、泥炭层了解落脚线索；非当地实测剖面'));
    svg.appendChild(XZ.charts.svgNode('rect', { x: 20, y: 95, width: 520, height: 95, fill: '#C9A66B' }));
    svg.appendChild(XZ.charts.svgNode('path', { d: 'M20 95 Q65 20 140 95 L190 95 Q240 125 300 95 L540 95 L540 130 L20 130 Z', fill: '#5B6B73', opacity: '.6' }));
    svg.appendChild(XZ.charts.svgNode('path', { d: 'M20 95 Q65 20 140 95 Z', fill: '#465344' }));
    diagram.appendChild(svg); body.appendChild(diagram);
    var description = ui.el('p', 'briefing-description'); description.setAttribute('aria-live', 'polite');
    var clues = level.exploration.clues;
    var parts = [['草墩', clues[0].explanation], ['积水', clues[2].explanation], ['泥炭层', level.exploration.formation.value]];
    parts.forEach(function (item, index) {
      var button = ui.button(item[0], function () { show(index); }, { secondary: true, className: 'swamp-spot' });
      button.style.left = [15, 44, 65][index] + '%'; button.style.top = [27, 43, 78][index] + '%'; button.dataset.part = String(index); diagram.appendChild(button);
    });
    function show(index) { description.textContent = parts[index][1]; diagram.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.part) === index)); }); }
    show(0); body.appendChild(description);
    var climate = ui.el('div', 'briefing-mini'), demo = engine.climateData() === level.exploration.demoTemperature;
    climate.appendChild(XZ.charts.line({ points: engine.climateData().value, title: '日内气温小图（来源与核验见折叠区）', notice: demo ? '演示数据 · 非实测' : '核验状态见资料', yLabel: '气温 / ℃', xLabel: '时间 / 时' })); body.appendChild(climate);
    var sources = [level.localWetland, level.exploration.formation, level.dailyTemperature, engine.climateData()];
    clues.forEach(function (clue) { sources.push(Object.assign({}, clue.probability, { label: clue.label + '的游戏隐患概率' })); });
    ui.briefing(host, '草地侦察 · 约 30 秒', '全程20排，向上（北）到任一出口即通关；不必收齐宝箱或全员到齐。', body,
      '只记三步：方向键走路；看不准先用空格或“探杆”探路；陷入后按住 Shift / X 或“救援”，救队友先走到相邻格。队友陷入或掉队后跟随安全箭头；干粮自动使用，宝箱可选；带出人数影响分数。草墩风险低、积水风险高，概率为游戏参数。', sources);
  };
}());

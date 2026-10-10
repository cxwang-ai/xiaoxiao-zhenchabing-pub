(function () {
  'use strict';
  var XZ = window.XZ, ui = XZ.ui, engine = XZ.levels.daduhe;
  var level = XZ.data.levels.find(function (item) { return item.id === 'daduhe'; });
  engine.renderExplore = function (host, run) {
    run.riverExplore = run.riverExplore || { ford: 'wide' };
    var body = ui.el('div'), selector = ui.el('div', 'briefing-options');
    selector.setAttribute('role', 'group'); selector.setAttribute('aria-label', '比较渡口断面');
    var reading = ui.el('p', 'risk-output'); reading.setAttribute('aria-live', 'polite');
    var chart = ui.el('div', 'briefing-chart');
    level.exploration.fords.forEach(function (f) {
      var button = ui.button(f.label, function () { run.riverExplore.ford = f.id; update(); }, { secondary: true });
      button.dataset.ford = f.id; selector.appendChild(button);
    });
    body.appendChild(selector); body.appendChild(reading); body.appendChild(chart);
    function update() {
      var f = engine.ford(run.riverExplore.ford), v = engine.velocity(level.arrivalMonth.value, f.id);
      selector.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.ford === f.id)); });
      reading.textContent = f.width.value + ' m × ' + f.depth.value + ' m → 平均流速 ' + v.toFixed(2) + ' m/s（演示）';
      var svg = XZ.charts.svgNode('svg', { viewBox: '0 0 560 210', role: 'img', class: 'chart-svg' });
      svg.appendChild(XZ.charts.svgNode('title', {}, '断面与速度合成示意，非实测比例'));
      svg.appendChild(XZ.charts.svgNode('path', { d: 'M15 25 L95 140 L175 25', class: 'chart-line' }));
      svg.appendChild(XZ.charts.svgNode('path', { d: 'M45 70 L145 70 L95 140 Z', fill: '#5B6B73', opacity: '.5' }));
      svg.appendChild(XZ.charts.svgNode('text', { x: 95, y: 170, 'text-anchor': 'middle', class: 'chart-label' }, '宽 × 平均水深'));
      var velocity = XZ.games.daduhe.compose(-0.35, level.arcade.difficulties.standard.rowSpeed.value, v), scale = 9;
      function arrow(x, y, dx, dy, color) {
        var a = Math.atan2(dy, dx), endX = x + dx, endY = y + dy;
        svg.appendChild(XZ.charts.svgNode('path', { d: 'M' + x + ' ' + y + ' l' + dx + ' ' + dy + ' M' + (endX - 8 * Math.cos(a - .5)) + ' ' + (endY - 8 * Math.sin(a - .5)) + ' L' + endX + ' ' + endY + ' L' + (endX - 8 * Math.cos(a + .5)) + ' ' + (endY - 8 * Math.sin(a + .5)), stroke: color, 'stroke-width': 3, fill: 'none' }));
      }
      var boatX = Math.sin(-0.35) * level.arcade.difficulties.standard.rowSpeed.value * scale;
      arrow(345, 148, boatX, -velocity.y * scale, '#1F1A17');
      arrow(345 + boatX, 148 - velocity.y * scale, v * scale, 0, '#5B6B73');
      arrow(345, 148, velocity.x * scale, -velocity.y * scale, '#B3261E');
      [['斜向上游划', 208, 107], ['水流 →', 350, 38], ['合成速度', 398, 119], ['中间快 · 岸边慢（模型）', 205, 193]].forEach(function (label) { svg.appendChild(XZ.charts.svgNode('text', { x: label[1], y: label[2], class: 'chart-label' }, label[0])); });
      chart.textContent = ''; chart.appendChild(svg);
    }
    update();
    var data = [level.arrivalMonth, level.monthlyFlow, engine.flowData(), level.exploration.continuity, level.arcade.flowProfile];
    level.exploration.fords.forEach(function (f) { data.push(f.width, f.depth); });
    ui.briefing(host, '激流侦察 · 约 30 秒', '同样流量下，断面越小流速越大；船的实际速度是划桨速度与水流速度的合成。', body,
      '准备时选断面和趟数：可选 1–3 趟，每趟 3 人，默认 1 趟，用趟数控制通关时间；河心水流更快，船头往左偏，抵消水流。船前点线按当前船头与最近节奏合成水流，显示预计落点；红线说明会错过登陆区。转向或节奏改变后预测随之更新，碰撞与漩涡会改变实际路线。首趟较缓；轻松可按住划桨。划桨要有节奏，按得太快会累、反而划不动。流量与宽深为演示参数，非实测。', data);
  };
}());

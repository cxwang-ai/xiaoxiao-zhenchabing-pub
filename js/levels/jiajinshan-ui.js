(function () {
  'use strict';
  var XZ = window.XZ, ui = XZ.ui, engine = XZ.levels.jiajinshan;
  var level = XZ.data.levels.find(function (item) { return item.id === 'jiajinshan'; }), c = level.exploration;
  engine.renderExplore = function (host, run) {
    run.exploration = run.exploration || { altitude: c.altitudeStart.value };
    var body = ui.el('div');
    var slider = ui.slider('altitude-slider', '拖动海拔', c.altitudeMin.value, c.altitudeMax.value, run.exploration.altitude, 'm', c.altitudeStep.value);
    body.appendChild(slider.node);
    var reading = ui.el('p', 'risk-output'); reading.setAttribute('aria-live', 'polite'); body.appendChild(reading);
    var chart = ui.el('div', 'briefing-chart'); body.appendChild(chart);
    body.appendChild(ui.el('p', 'briefing-legend', '朱红：推算气温 · 灰蓝：相对氧含量（气压比近似，非氧气体积分数）'));
    var points = [], oxygen = [];
    for (var h = c.altitudeMin.value; h <= c.altitudeMax.value; h += c.altitudeStep.value) { points.push({ x: h, y: engine.temperature(h) }); oxygen.push({ x: h, y: engine.oxygen(h) }); }
    function update() {
      var altitude = Number(slider.input.value); run.exploration.altitude = altitude; slider.output.textContent = altitude + ' m';
      reading.textContent = '推算气温 ' + engine.temperature(altitude).toFixed(1) + ' ℃ · 相对氧含量 ' + engine.oxygen(altitude).toFixed(1) + '%';
      chart.textContent = ''; chart.appendChild(XZ.charts.line({ points: points, secondaryPoints: oxygen, secondaryMin: 50, secondaryMax: 100, secondaryLabel: '气压比 / %', title: '海拔与气温、相对氧含量：双轴简化模型', description: '海拔升高，两条曲线均下降。气温读左轴，气压比读右轴；参考值为演示参数。冰沟前先喘气助跑，薄冰不停留；雪崩为游戏设定，史料未记载。', yLabel: '气温 / ℃', xLabel: '海拔 / m', marker: { x: altitude, y: engine.temperature(altitude), secondaryY: engine.oxygen(altitude) } }));
    }
    slider.input.addEventListener('input', update); update();
    var base = engine.reference();
    ui.briefing(host, '雪山侦察 · 约 30 秒', '海拔越高，通常越冷、空气越稀薄；推算气温与相对氧含量一同下降。', body,
      '攀到垭口时跳跃、冲刺更耗氧，走路恢复；低温加快体温下降，干粮与干辣椒按需自动使用（回温为游戏效果）。参考值为演示参数。冰沟前先喘气助跑，薄冰不停留；雪崩为游戏设定，史料未记载。',
      [engine.crossingAltitude(), level.baseTemperature, level.baseAltitude, base.temperature, base.altitude, c.lapseRate, c.altitudeInterval, c.pressureCoefficient, c.pressureExponent, c.percentageScale, level.provisions, level.weather]);
  };
}());

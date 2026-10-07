(function () {
  'use strict';
  var XZ = window.XZ, ui = XZ.ui, engine = XZ.levels.jiajinshan;
  var level = XZ.data.levels.find(function (item) { return item.id === 'jiajinshan'; });
  var config = level.exploration;
  var finiteDatum = engine.finiteDatum, reference = engine.reference;
  var temperature = engine.temperature, oxygen = engine.oxygen, risk = engine.risk;
  function slider(id, title, minimum, maximum, step, value) {
    var group = ui.el('div', 'slider-group');
    var label = ui.el('label', 'slider-label', title); label.htmlFor = id;
    var output = ui.el('output', 'slider-output'); output.htmlFor = id; output.textContent = value + ' ' + minimum.unit;
    label.appendChild(output); group.appendChild(label);
    var input = ui.el('input'); input.type = 'range'; input.id = id;
    input.min = minimum.value; input.max = maximum.value; input.step = step.value; input.value = value;
    group.appendChild(input);
    var limits = ui.el('div', 'slider-limits');
    limits.appendChild(ui.el('span', '', minimum.value + ' ' + minimum.unit));
    limits.appendChild(ui.el('span', '', maximum.value + ' ' + maximum.unit));
    group.appendChild(limits);
    return { node: group, input: input, output: output };
  }

  function renderExplore(host, run) {
    if (!run.exploration) { run.exploration = { altitude: config.altitudeStart.value, time: config.timeStart.value }; }
    var note = ui.el('div', 'notice');
    note.appendChild(ui.el('p', '', '往高处走，看看气温与空气怎样变化。地形与天气曲线均为演示。'));
    note.appendChild(ui.el('p', '', engine.crossingAltitudeLabel() + '；闯关使用此海拔，探索滑块用于比较其他高度。'));
    var facts = ui.el('div', 'fact-grid');
    facts.appendChild(ui.datum(level.baseTemperature)); facts.appendChild(ui.datum(level.baseAltitude));
    if (level.summitAltitude) { facts.appendChild(ui.datum(level.summitAltitude)); }
    if (engine.crossingAltitude() !== level.summitAltitude) { facts.appendChild(ui.datum(engine.crossingAltitude())); }
    var referencesInfo = ui.el('div'); referencesInfo.appendChild(facts);
    var base = reference();
    if (!finiteDatum(level.baseTemperature) || !finiteDatum(level.baseAltitude)) {
      referencesInfo.appendChild(ui.el('p', 'muted', '真实山脚数据尚未填写，暂用演示参考值；填写后自动使用新值。'));
      var references = ui.el('div', 'fact-grid');
      references.appendChild(ui.datum(base.temperature)); references.appendChild(ui.datum(base.altitude)); referencesInfo.appendChild(references);
    }
    var seenStatus = {};
    [level.baseTemperature, level.baseAltitude, level.summitAltitude, engine.crossingAltitude(), base.temperature, base.altitude].filter(Boolean).forEach(function (data) {
      if (!seenStatus[data.status]) { seenStatus[data.status] = true; note.appendChild(ui.badge(data.status)); }
    });
    note.appendChild(ui.details('参考数据与核验状态', referencesInfo)); host.appendChild(note);
    var altitudeBody = ui.el('div');
    var control = slider('altitude-slider', '探索海拔', config.altitudeMin, config.altitudeMax, config.altitudeStep, run.exploration.altitude);
    altitudeBody.appendChild(control.node);
    var readouts = ui.el('div', 'science-readouts'); readouts.setAttribute('aria-live', 'polite');
    var temp = ui.el('div', 'science-readout'); temp.appendChild(ui.el('span', '', '推算气温'));
    var tempValue = ui.el('strong'); temp.appendChild(tempValue); temp.appendChild(ui.badge('model'));
    if (base.temperature.status === 'param' || base.altitude.status === 'param') { temp.appendChild(ui.badge('param')); }
    if (base.temperature.status === 'pending' || base.altitude.status === 'pending') { temp.appendChild(ui.badge('pending')); }
    var oxy = ui.el('div', 'science-readout'); oxy.appendChild(ui.el('span', '', '相对氧含量（气压比近似）'));
    var oxyValue = ui.el('strong'); oxy.appendChild(oxyValue); oxy.appendChild(ui.badge('model'));
    readouts.appendChild(temp); readouts.appendChild(oxy); altitudeBody.appendChild(readouts);
    altitudeBody.appendChild(ui.el('p', 'science-note', '海拔越高，通常越冷，空气也越稀薄。拖动滑块，看两条曲线一起变化。'));
    var chartGrid = ui.el('div', 'chart-grid-layout');
    var tempChart = ui.el('div', 'chart-panel'); var oxyChart = ui.el('div', 'chart-panel');
    chartGrid.appendChild(tempChart); chartGrid.appendChild(oxyChart); altitudeBody.appendChild(chartGrid);
    var formulas = ui.el('details', 'rule-details'); formulas.appendChild(ui.el('summary', '', '查看科学公式与标签'));
    formulas.appendChild(ui.datum(config.lapseRate));
    formulas.appendChild(ui.el('p', 'muted', '相对氧含量用标准大气压比近似，不是氧气体积分数；模型未计入实际天气。'));
    formulas.appendChild(ui.el('p', 'formula', '气温 = 山脚温度 − ' + config.lapseRate.value + ' ×（海拔 − 山脚海拔）/' + config.altitudeInterval.value));
    formulas.appendChild(ui.el('p', 'formula', '相对氧含量 = (1 − ' + config.pressureCoefficient.value + ' × h)^' + config.pressureExponent.value + ' × ' + config.percentageScale.value + '%'));
    [config.pressureCoefficient, config.pressureExponent, config.percentageScale].forEach(function (data) { formulas.appendChild(ui.datum(data)); });
    altitudeBody.appendChild(formulas);
    host.appendChild(ui.card('海拔、气温与空气', altitudeBody));

    var terrainBody = ui.el('div'); terrainBody.appendChild(ui.badge(config.terrain.status));
    terrainBody.appendChild(ui.el('p', 'muted', '山体形状为游戏示意，最高点对齐' + engine.crossingAltitudeLabel() + '；横轴为示意路径，不表示实际距离。'));
    terrainBody.appendChild(XZ.charts.terrain({ points: engine.terrainPoints(), title: '地形剖面示意，游戏参数，非真实路线', xLabel: '示意路径（非距离）', yLabel: '示意高度 / m', yMin: config.altitudeMin.value, yMax: Math.max(config.altitudeMax.value, engine.crossingAltitude().value), hideXValues: true }));
    terrainBody.appendChild(ui.source(config.terrain)); host.appendChild(ui.card('读一幅地形剖面', terrainBody));

    var timeBody = ui.el('div'); timeBody.appendChild(ui.badge(level.weather.status));
    var weatherInfo = ui.el('div'); weatherInfo.appendChild(ui.datum(level.weather));
    timeBody.appendChild(ui.el('p', 'science-note', '换个出发时刻，看看风险如何变化。指数是游戏假设，非概率或实测天气。'));
    var timeControl = slider('time-slider', '模拟出发时刻', config.timeMin, config.timeMax, config.timeStep, run.exploration.time);
    timeBody.appendChild(timeControl.node);
    var riskOutput = ui.el('p', 'risk-output'); riskOutput.setAttribute('aria-live', 'polite');
    timeBody.appendChild(riskOutput); timeBody.appendChild(ui.badge(config.weatherCurve.status));
    var riskChart = ui.el('div', 'chart-panel'); timeBody.appendChild(riskChart);
    weatherInfo.appendChild(ui.source(config.weatherCurve));
    var riskFormula = ui.el('p', 'formula'); weatherInfo.appendChild(riskFormula);
    timeBody.appendChild(ui.details('天气资料与模型', weatherInfo)); host.appendChild(ui.card('一天中的风险示意', timeBody));

    function updateAltitude() {
      var altitude = Number(control.input.value); run.exploration.altitude = altitude;
      control.output.textContent = altitude + ' m';
      tempValue.textContent = temperature(altitude).toFixed(1) + ' °C'; oxyValue.textContent = oxygen(altitude).toFixed(1) + '%';
      var tempPoints = [], oxyPoints = [];
      for (var h = config.altitudeMin.value; h <= config.altitudeMax.value; h += config.altitudeStep.value) {
        tempPoints.push({ x: h, y: temperature(h) }); oxyPoints.push({ x: h, y: oxygen(h) });
      }
      tempChart.textContent = ''; oxyChart.textContent = '';
      tempChart.appendChild(XZ.charts.line({ points: tempPoints, title: '海拔与推算气温，简化模型', xLabel: '海拔 / m', yLabel: '气温 / °C', marker: { x: altitude, y: temperature(altitude) } }));
      oxyChart.appendChild(XZ.charts.line({ points: oxyPoints, title: '海拔与相对氧含量，标准大气简化模型', xLabel: '海拔 / m', yLabel: '相对氧含量 / %', marker: { x: altitude, y: oxygen(altitude) } }));
    }
    function updateTime() {
      var hour = Number(timeControl.input.value); run.exploration.time = hour;
      timeControl.output.textContent = hour + ' 时';
      riskOutput.textContent = '游戏风险指数 ' + risk(hour).toFixed(0) + ' / ' + config.riskMax.value;
      riskFormula.textContent = '对应闯关时段体力消耗：' + XZ.rules.round(risk(hour) * level.rules.riskCoefficient.value) + '（指数 × ' + level.rules.riskCoefficient.value + '，游戏参数）。';
      riskChart.textContent = '';
      riskChart.appendChild(XZ.charts.line({ points: config.weatherCurve.value, title: '时段风险曲线，游戏假设，非历史天气数据', xLabel: '时间 / 时', yLabel: '游戏风险指数', yMin: 0, yMax: config.riskMax.value, marker: { x: hour, y: risk(hour) } }));
    }
    control.input.addEventListener('input', updateAltitude); timeControl.input.addEventListener('input', updateTime);
    updateAltitude(); updateTime();
  }


  engine.renderExplore = renderExplore;
  engine.renderChallenge = function (host, run, changed, retry) {
    host.appendChild(ui.el('p', 'science-note', engine.crossingAltitudeLabel() + '；气温、气压是简化模型，体力与物资是游戏参数。'));
    ui.decision(host, level, run, changed, retry, { title: '你会怎样走过雪山？', dimensions: level.rules.dimensions, evaluate: engine.evaluate,
      preview: function (choices) { var result = engine.evaluate(choices, run.entry); return ui.preview(result); } });
  };
}());

(function () {
  'use strict';
  var XZ = window.XZ, shared = XZ.rules;
  var level = XZ.data.levels.find(function (item) { return item.id === 'jiajinshan'; });
  var rules = level.rules, config = level.exploration;
  function finiteDatum(data) { return Boolean(data && typeof data.value === 'number' && Number.isFinite(data.value)); }
  function reference() { return { temperature: finiteDatum(level.baseTemperature) ? level.baseTemperature : config.demoTemperature, altitude: finiteDatum(level.baseAltitude) ? level.baseAltitude : config.demoAltitude }; }
  function crossingAltitude() {
    var data = level.summitAltitude;
    return finiteDatum(data) && data.value >= 0 && 1 - config.pressureCoefficient.value * data.value > 0 ? data : config.demoSummitAltitude;
  }
  function crossingAltitudeLabel() {
    var data = crossingAltitude();
    var labels = { verified: '已核实', pending: '待核实', param: '游戏参数', model: '简化模型' };
    return '翻越点海拔 ' + data.value + ' m（' + (labels[data.status] || labels.pending) + '）';
  }
  function terrainPoints() {
    var peak = Math.max.apply(null, config.terrain.value.map(function (point) { return point.y; }));
    return config.terrain.value.map(function (point) { return { x: point.x, y: point.y / peak * crossingAltitude().value }; });
  }
  function temperature(altitude) { var base = reference(); return base.temperature.value - config.lapseRate.value * (altitude - base.altitude.value) / config.altitudeInterval.value; }
  function oxygen(altitude) { return Math.pow(1 - config.pressureCoefficient.value * altitude, config.pressureExponent.value) * config.percentageScale.value; }
  function risk(hour) { return shared.interpolate(config.weatherCurve.value, hour); }
  function evaluate(choices, resources) {
    var departure = shared.option(rules.dimensions, 'departure', choices.departure);
    var warmth = shared.option(rules.dimensions, 'warmth', choices.warmth);
    var pace = shared.option(rules.dimensions, 'pace', choices.pace);
    if (!departure || !warmth || !pace) { return null; }
    var h = crossingAltitude().value, t = temperature(h), o = oxygen(h);
    var weatherLoss = risk(departure.hour.value) * rules.riskCoefficient.value;
    var coldLoss = Math.max(0, rules.coldReference.value - t) * warmth.factor.value;
    var oxygenLoss = Math.max(0, config.percentageScale.value - o) * pace.factor.value;
    var loss = rules.baseLoss.value + weatherLoss + coldLoss + oxygenLoss;
    var waitDays = Math.ceil(Math.max(0, departure.hour.value - rules.earliestDeparture.value) / rules.hoursPerDay.value);
    var days = waitDays + pace.days.value;
    var stars = Math.round(loss) <= rules.highLoss.value && days <= rules.highDays.value ? 3 : Math.round(loss) <= rules.midLoss.value ? 2 : 1;
    return shared.outcome(resources, loss, warmth.cost.value + pace.cost.value + departure.cost.value, days, stars, [
      '时段消耗 = 探索风险指数 ' + risk(departure.hour.value) + ' × ' + rules.riskCoefficient.value + ' = ' + weatherLoss.toFixed(1) + '。',
      crossingAltitudeLabel() + '，同一气温模型得 ' + t.toFixed(1) + ' °C；低温消耗 = max(0, ' + rules.coldReference.value + ' − 气温) × 保暖系数 = ' + coldLoss.toFixed(1) + '。气温与消耗仍为模型推算和游戏参数。',
      '同一氧气模型得气压比 ' + o.toFixed(1) + '%；缺氧消耗 = (100 − 气压比) × 节奏系数 = ' + oxygenLoss.toFixed(1) + '。节奏越慢，缺氧消耗越小但用时越长。基础消耗 ' + rules.baseLoss.value + '。',
      '出发等候 = ceil((' + departure.hour.value + ' − ' + rules.earliestDeparture.value + ') ÷ ' + rules.hoursPerDay.value + ') = ' + waitDays + ' 天，另计行进 ' + pace.days.value + ' 天。凌晨省等候；日间可休整，出发前干粮需求降为 ' + departure.cost.value + '。这些是按整天计费的游戏假设，非真实行军记录。'
    ]);
  }
  XZ.levels = XZ.levels || {};
  XZ.levels.jiajinshan = { finiteDatum: finiteDatum, reference: reference, crossingAltitude: crossingAltitude, crossingAltitudeLabel: crossingAltitudeLabel, terrainPoints: terrainPoints, temperature: temperature, oxygen: oxygen, risk: risk, evaluate: evaluate };
}());

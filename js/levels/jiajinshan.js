(function () {
  'use strict';
  var XZ = window.XZ;
  var level = XZ.data.levels.find(function (item) { return item.id === 'jiajinshan'; });
  var config = level.exploration;
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
  function temperature(altitude) { var base = reference(); return base.temperature.value - config.lapseRate.value * (altitude - base.altitude.value) / config.altitudeInterval.value; }
  function oxygen(altitude) { return Math.pow(1 - config.pressureCoefficient.value * altitude, config.pressureExponent.value) * config.percentageScale.value; }
  XZ.levels = XZ.levels || {};
  XZ.levels.jiajinshan = { finiteDatum: finiteDatum, reference: reference, crossingAltitude: crossingAltitude, crossingAltitudeLabel: crossingAltitudeLabel, temperature: temperature, oxygen: oxygen };
}());

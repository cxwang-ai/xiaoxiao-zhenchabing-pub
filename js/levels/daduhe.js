(function () {
  'use strict';
  var XZ = window.XZ, shared = XZ.rules;
  var level = XZ.data.levels.find(function (item) { return item.id === 'daduhe'; });
  var rules = level.rules;
  function flowData() { return shared.series(level.monthlyFlow, level.exploration.demoFlow, function (values) { return values.length === 12 && values.every(function (n) { return Number.isFinite(n) && n >= 0; }); }); }
  function ford(id) { return level.exploration.fords.find(function (item) { return item.id === id; }); }
  function velocity(month, id) { var f = ford(id); return f && Number.isInteger(month) && month >= 1 && month <= 12 ? flowData().value[month - 1] / (f.width.value * f.depth.value) : null; }
  // 月均值之间的线性插值只是游戏趋势；不用于预测实际逐日水情。
  function waitingFlow(waitDays) {
    var position = level.arrivalMonth.value - 1 + waitDays / rules.monthDays.value;
    var month = Math.floor(position), fraction = position - month, values = flowData().value;
    return values[((month % 12) + 12) % 12] * (1 - fraction) + values[(((month + 1) % 12) + 12) % 12] * fraction;
  }
  function scoutingFactor(waitDays) {
    return 1 - rules.scoutReduction.value * (1 - Math.exp(-waitDays / rules.scoutTime.value));
  }
  function arrivalContext() {
    var month = level.arrivalMonth.value, values = flowData().value, q = values[month - 1];
    var next = values[month % 12], sorted = values.slice().sort(function (a, b) { return a - b; });
    return { month: month, flow: q, rank: sorted.indexOf(q) + 1,
      phase: next > q ? '涨水期' : next < q ? '退水期' : '相邻月持平期' };
  }
  function evaluate(choices, resources) {
    var f = ford(choices.ford);
    var wait = shared.option(rules.dimensions, 'wait', choices.wait), period = shared.option(rules.dimensions, 'period', choices.period), prep = shared.option(rules.dimensions, 'preparation', choices.preparation);
    if (!f || !wait || !period || !prep) { return null; }
    var q = waitingFlow(wait.value.value + period.days.value), v = q / (f.width.value * f.depth.value), scout = scoutingFactor(wait.value.value);
    var loss = rules.baseLoss.value + v * rules.velocityCoefficient.value * scout * period.factor.value * prep.factor.value;
    var days = wait.value.value + rules.crossingDays.value + period.days.value;
    var stars = Math.round(loss) <= rules.highLoss.value && days <= rules.highDays.value ? 3 : Math.round(loss) <= rules.midLoss.value ? 2 : 1;
    return shared.outcome(resources, loss, f.cost.value + prep.cost.value + wait.value.value * rules.waitSupplies.value + period.cost.value, days, stars, [
      '固定抵达 ' + level.arrivalMonth.value + ' 月（' + (level.arrivalMonth.status === 'pending' ? '待核实' : '核验状态见资料') + '），使用同一流量曲线。等待后流量 ' + q.toFixed(1) + ' ÷ (' + f.width.value + ' × ' + f.depth.value + ') = ' + v.toFixed(1) + ' m/s。断面较大可降低流速，但准备物资更多。',
      '体力消耗 = ' + rules.baseLoss.value + ' + 流速 × ' + rules.velocityCoefficient.value + ' × 侦察系数 ' + scout.toFixed(2) + ' × 时段系数 ' + period.factor.value + ' × 准备系数 ' + prep.factor.value + ' = ' + loss.toFixed(1) + '，结算四舍五入为 ' + Math.round(loss) + '。',
      '等待 ' + wait.value.value + ' 天侦察更多落脚点，另耗物资 ' + wait.value.value * rules.waitSupplies.value + '。侦察系数 = 1 − ' + rules.scoutReduction.value + ' × (1 − exp(−等待天数 ÷ ' + rules.scoutTime.value + '))；收益逐渐减弱。流量按每月 ' + rules.monthDays.value + ' 天在相邻月之间插值；涨水时等待过久会抵消收益。这是游戏趋势假设，非逐日水文预测。',
      '时段假设：抵达后的夜间窗口可直接行进，视野较差；选择白天需等候。当前时段另计 ' + period.days.value + ' 天、物资 ' + period.cost.value + '；行进 ' + rules.crossingDays.value + ' 天。准备越充分，体力风险越低，但占用更多物资。'
    ]);
  }
  XZ.levels = XZ.levels || {};
  XZ.levels.daduhe = { flowData: flowData, ford: ford, velocity: velocity, waitingFlow: waitingFlow, scoutingFactor: scoutingFactor, arrivalContext: arrivalContext, evaluate: evaluate };
}());

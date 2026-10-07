(function () {
  'use strict';
  var XZ = window.XZ, ui = XZ.ui, engine = XZ.levels.caodi;
  var level = XZ.data.levels.find(function (item) { return item.id === 'caodi'; }), rules = level.rules;
  engine.renderExplore = function (host) {
    var body = ui.el('div'); body.appendChild(ui.badge(level.localWetland.status)); body.appendChild(ui.badge(level.exploration.formation.status));
    var wetlandInfo = ui.el('div'); wetlandInfo.appendChild(ui.datum(level.localWetland)); wetlandInfo.appendChild(ui.datum(level.exploration.formation));
    var svg = XZ.charts.svgNode('svg', { viewBox: '0 0 560 210', role: 'img', class: 'chart-svg' });
    svg.appendChild(XZ.charts.svgNode('title', {}, '沼泽剖面示意：草墩、积水、泥炭层，不表示当地实测剖面'));
    svg.appendChild(XZ.charts.svgNode('rect', { x: 20, y: 95, width: 520, height: 95, fill: '#C9A66B' }));
    svg.appendChild(XZ.charts.svgNode('path', { d: 'M20 95 Q65 20 140 95 L190 95 Q240 125 300 95 L540 95 L540 130 L20 130 Z', fill: '#5B6B73', opacity: '.6' }));
    svg.appendChild(XZ.charts.svgNode('path', { d: 'M20 95 Q65 20 140 95 Z', fill: '#61724b' }));
    [['草墩', 78, 48], ['积水', 246, 88], ['泥炭层', 350, 168]].forEach(function (item) { svg.appendChild(XZ.charts.svgNode('text', { x: item[1], y: item[2], 'text-anchor': 'middle', class: 'chart-label' }, item[0])); });
    var diagram = ui.el('div', 'swamp-diagram'); diagram.appendChild(svg); body.appendChild(diagram); body.appendChild(ui.el('p', 'science-note', '点击剖面部位，找找可以落脚的线索。'));
    var description = ui.el('p', 'notice'); description.setAttribute('aria-live', 'polite');
    var spots = ui.el('div', 'swamp-spots');
    [
      ['草墩', '草墩高出积水，但根系不保证下方坚实。'], ['积水', '积水会遮住底层与深度，先试探再落脚。'],
      ['泥炭层', '长期积水使土壤缺氧，有机质慢慢积累为泥炭。'], ['颜色异常', '颜色只能提示植被或湿度差异，不能判断承载力。']
    ] .forEach(function (item, index) {
      var button = ui.button(item[0], function () { description.textContent = item[1]; }, { secondary: true, className: index < 3 ? 'swamp-spot' : '' });
      if (index < 3) { button.style.left = [15, 44, 65][index] + '%'; button.style.top = [27, 43, 78][index] + '%'; diagram.appendChild(button); } else { spots.appendChild(button); }
    });
    body.appendChild(spots); description.textContent = '长期积水使土壤缺氧，有机质慢慢积累为泥炭。'; body.appendChild(description);
    body.appendChild(ui.details('沼泽原理与资料来源', wetlandInfo));
    host.appendChild(ui.card('地貌 · 沼泽剖面', body));
    var clueBody = ui.el('div'); clueBody.appendChild(ui.badge('param'));
    clueBody.appendChild(ui.el('p', '', '浅草草墩风险较低，深草与反光要谨慎。线索提示风险，不能保证安全。'));
    var clues = ui.el('ul', 'clue-list'), clueInfo = ui.el('div');
    level.exploration.clues.forEach(function (clue) {
      clues.appendChild(ui.el('li', '', clue.label + ' · 隐患概率 ' + Math.round(clue.probability.value * 100) + '%'));
      clueInfo.appendChild(ui.el('p', 'rule-row', clue.label + '：' + clue.explanation));
    });
    clueBody.appendChild(clues);
    clueInfo.appendChild(ui.el('p', 'science-note', '概率为玩法假设，非当地调查；保底通道会降低实际总体隐患比例。'));
    clueBody.appendChild(ui.details('线索说明与概率假设', clueInfo));
    host.appendChild(ui.card('把线索用到寻路中', clueBody));
    var climate = ui.el('div'), data = engine.climateData(), demo = data === level.exploration.demoTemperature;
    climate.appendChild(ui.badge(level.dailyTemperature.status)); climate.appendChild(ui.badge(data.status));
    var climateInfo = ui.el('div'); climateInfo.appendChild(ui.datum(level.dailyTemperature)); climateInfo.appendChild(ui.source(data));
    var formula = ui.el('p', 'formula'); climateInfo.appendChild(formula);
    climate.appendChild(ui.details('气候资料与温差模型', climateInfo));
    climate.appendChild(ui.el('p', 'notice demo-warning', demo ? '演示数据，非实测，待替换为气候资料' : '气候资料已填写，核验状态见标签'));
    var slider = ui.slider('grass-hour', '观察日内时刻', 0, 24, 12, '时'); climate.appendChild(slider.node);
    var chart = ui.el('div'), reading = ui.el('p', 'risk-output'); reading.setAttribute('aria-live', 'polite'); climate.appendChild(chart); climate.appendChild(reading);
    function update() {
      var hour = Number(slider.input.value); slider.output.textContent = hour + ' 时';
      chart.textContent = ''; chart.appendChild(XZ.charts.line({ points: data.value, notice: demo ? '演示数据 · 非实测' : '核验状态见标签', title: demo ? '演示数据：日内气温，非实测' : '日内气温（核验状态见资料标签）', yLabel: '气温 / °C', xLabel: '时间 / 时', marker: { x: hour, y: engine.temperature(hour) } }));
      reading.textContent = '气温 ' + engine.temperature(hour).toFixed(1) + ' °C · 昼夜温差 ' + engine.temperatureRange() + ' °C';
      formula.textContent = '闯关温差消耗 = 昼夜温差 × 补给系数（' + (demo ? '演示游戏参数' : '按上方资料计算') + '）。';
    }
    slider.input.addEventListener('input', update); update(); host.appendChild(ui.card('气候 · 一天气温变化', climate));
  };
  engine.renderChallenge = function (host, run, changed, retry) {
    if (!run.grass) { run.grass = { map: engine.generate(run.seed || rules.defaultSeed.value), path: [0], probes: [], mode: 'move', preparation: null }; }
    var game = run.grass, map = game.map, at = game.path[game.path.length - 1];
    game.probes = game.probes || [];
    var view = engine.visibility(map, game.path, game.probes);
    var body = ui.el('div'); body.appendChild(ui.badge('param'));
    body.appendChild(ui.el('p', '', '观察相邻格，选择行进或试探。走到“终”，带队伍走出草地。'));
    body.appendChild(ui.el('p', 'science-note', '地图种子 ' + map.seed + ' · 每步物资 ' + rules.stepSupplies.value));
    if (!game.preparation) {
      var form = ui.el('form', 'decision-form'); var values = { preparation: run.choices.preparation };
      ui.choices(form, [{ id: 'preparation', title: '出发补给', options: rules.preparations }], values, false);
      var error = ui.el('p', 'form-message'); error.setAttribute('role', 'alert'); form.appendChild(error);
      var submit = ui.button('开始寻路 →'); submit.type = 'submit'; form.appendChild(submit);
      form.addEventListener('submit', function (event) {
        event.preventDefault(); if (!values.preparation) { error.textContent = '请选择补给。'; return; }
        game.preparation = values.preparation; run.choices.preparation = values.preparation;
        apply(engine.evaluate(map, game.path, game.preparation, run.entry, game.probes), 'grass-cell-0');
      }); body.appendChild(form);
    } else {
      var live = engine.evaluate(map, game.path, game.preparation, run.entry, game.probes); body.appendChild(ui.resources(live.remaining));
      var progress = ui.el('p', 'notice', '已走 ' + live.steps + ' 步 · 踩险 ' + live.hazards + ' 次');
      progress.setAttribute('role', 'status'); body.appendChild(progress);
    }
    var mode = ui.button(game.mode === 'probe' ? '切换为直接行进' : '切换为探杆试探', function () { game.mode = game.mode === 'probe' ? 'move' : 'probe'; changed('grass-mode'); }, { secondary: true, disabled: !game.preparation || Boolean(run.outcome) });
    mode.id = 'grass-mode'; mode.setAttribute('aria-pressed', game.mode === 'probe' ? 'true' : 'false'); body.appendChild(mode);
    body.appendChild(ui.el('p', 'science-note', '当前：' + (game.mode === 'probe' ? '探杆试探 · 每格物资 ' + rules.probeSupplies.value : '直接行进') + ' · 也可用方向键操作'));
    var instructions = ui.el('div');
    instructions.appendChild(ui.el('p', '', '仅当前格、相邻格与走过格显示线索，其余为“未侦察”。点击相邻格或用方向键按当前模式操作；Enter / 空格选择聚焦格。'));
    instructions.appendChild(ui.el('p', '', '试探相邻且未确认的格，每格物资 ' + rules.probeSupplies.value + '，不扣体力、不计步数；确认安全或隐患。重复试探、已走格不收费。'));
    instructions.appendChild(ui.el('p', '', '三星：不踩险且步数不超过 ' + rules.highSteps.value + '；二星：踩险不超过 ' + rules.midHazards.value + ' 次；成功须体力大于零且物资足够。'));
    body.appendChild(ui.details('操作提示与星级说明', instructions));
    var grid = ui.el('div', 'grass-grid'); grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', '草地寻路网格');
    map.cells.forEach(function (cell) {
      var visited = game.path.indexOf(cell.index) !== -1, adjacent = engine.neighbors(at, map.size).indexOf(cell.index) !== -1;
      var visible = view[cell.index], clue = level.exploration.clues.find(function (item) { return item.id === visible.clue; });
      var text = (cell.index === at ? '你 · ' : cell.index === map.end ? '终 · ' : '') + (clue ? clue.label : '未侦察');
      if (game.probes.indexOf(cell.index) !== -1) { text += visible.safety === 'safe' ? ' · 试探安全' : ' · 试探有隐患'; }
      if (visited && cell.hazard) { text += ' · 踩险'; }
      var button = ui.button(text, function () { move(cell.index); }, { secondary: true, disabled: !game.preparation || Boolean(run.outcome), className: 'grass-cell ' + (visible.visible ? 'clue-' + visible.clue : 'unscouted') + (visited ? ' visited' : '') + (cell.index === at ? ' current' : '') });
      button.id = 'grass-cell-' + cell.index; button.dataset.index = cell.index;
      button.tabIndex = cell.index === at || adjacent ? 0 : -1;
      button.setAttribute('aria-label', '第 ' + (Math.floor(cell.index / map.size) + 1) + ' 行第 ' + (cell.index % map.size + 1) + ' 列，' + text + (adjacent ? (game.mode === 'probe' ? '，可试探' : '，可移动') : ''));
      if (cell.index === at) { button.setAttribute('aria-current', 'location'); }
      grid.appendChild(button);
    });
    // 只为本次行进绘制位置过渡，不参与寻路或可见性判断。
    if (game.previousAt !== undefined && game.previousAt !== at) {
      var marker = ui.el('span', 'grass-traveller'); marker.setAttribute('aria-hidden', 'true');
      marker.setAttribute('style', '--col:' + (at % map.size) + ';--row:' + Math.floor(at / map.size) + ';--size:' + map.size + ';--move-x:' + (game.previousAt % map.size - at % map.size) + ';--move-y:' + (Math.floor(game.previousAt / map.size) - Math.floor(at / map.size)));
      grid.appendChild(marker);
      game.previousAt = undefined;
    }
    grid.addEventListener('keydown', function (event) {
      var offsets = { ArrowUp: -map.size, ArrowDown: map.size, ArrowLeft: -1, ArrowRight: 1 };
      if (Object.prototype.hasOwnProperty.call(offsets, event.key)) { event.preventDefault(); move(at + offsets[event.key]); }
    });
    var message = ui.el('p', 'form-message'); message.setAttribute('role', 'status'); body.appendChild(grid); body.appendChild(message);

    host.appendChild(ui.card('在草地中辨认下一步', body));
    if (run.outcome) { ui.outcome(host, run.outcome, retry, level, run.choices); } ui.ruleTable(host, level);
    function apply(result, focusId) {
      if (result.success || result.failure) {
        run.outcome = result;
        if (result.success) { XZ.state.finish(level.id, result); run.completed = true; } else { XZ.state.fail(level.id, result); }
        changed('outcome-title');
      } else { XZ.state.preview(level.id, result); changed(focusId); }
    }
    function move(next) {
      if (!game.preparation || run.outcome) { return; }
      if (game.mode === 'probe') {
        var probed = engine.probe(map, game.path, next, game.preparation, run.entry, game.probes);
        if (!probed) { message.textContent = '只能试探相邻且未确认的格子，并须有足够物资；未扣物资。'; return; }
        game.probes = probed.probes; apply(probed.result, 'grass-cell-' + next); return;
      }
      var result = engine.step(map, game.path, next, game.preparation, run.entry, game.probes);
      if (!result) { message.textContent = '只能走到当前位置上下左右相邻的格子。'; return; }
      game.previousAt = at; game.path.push(next); apply(result, 'grass-cell-' + next);
    }
  };
}());

(function () {
  'use strict';
  var XZ = window.XZ, ui = XZ.ui;
  // 将三关街机结果适配为共享资源结算对象，每次尝试至多结算一次。
  function settle(id, attempt, result) {
    if (attempt.settled) { return attempt.outcome; }
    var snapshot = XZ.state.get();
    if (!attempt.practice && (!snapshot.active || snapshot.active.id !== id || snapshot.progress[id].completed)) { return null; }
    var entry = attempt.practice ? attempt.entry : snapshot.active.entry;
    var delta = {};
    ['energy', 'supplies', 'days'].forEach(function (key) {
      if (!Number.isFinite(result.delta[key])) { throw new Error('小游戏返回无效资源变化：' + key); }
      delta[key] = Math.round(result.delta[key]);
    });
    delta.days = Math.max(0, delta.days);
    var max = XZ.data.game.maxResource.value;
    var remaining = { energy: Math.max(0, Math.min(max, entry.energy + delta.energy)),
      supplies: Math.max(0, Math.min(max, entry.supplies + delta.supplies)), days: entry.days + delta.days };
    var success = Boolean(result.success) && remaining.energy > 0 && entry.supplies + delta.supplies >= 0;
    var outcome = { success: success, stars: success ? Math.max(1, Math.min(XZ.data.game.starMax.value, Math.round(result.stars) || 1)) : 0,
      delta: { energy: remaining.energy - entry.energy, supplies: remaining.supplies - entry.supplies, days: delta.days },
      trips: result.trips,
      score: result.score || {total: 0, parts: []},
      record: result.score ? XZ.highscores.record(id, snapshot.difficulty, result.score.total, result.trips) : {best: 0, newRecord: false},
      remaining: remaining, notes: (result.notes || []).slice() };
    attempt.settled = true; attempt.outcome = outcome;
    if (!attempt.practice) {
      if (outcome.success) { XZ.state.finish(id, outcome); } else { XZ.state.fail(id, outcome); }
    }
    return outcome;
  }

  function mount(host, level, run, callbacks) {
    var testMode = /(?:^|[?&])test=1(?:&|$)/.test(window.location.search);
    var game = XZ.games[level.arcade.game], difficulty = XZ.state.get().difficulty, mountain = level.arcade.game === 'jiajinshan', river = level.arcade.game === 'daduhe', grass = level.arcade.game === 'caodi';
    var fullBriefing = mountain ? '冰沟前先喘气再助跑，薄冰不停留；雪崩段要交替冲刺与喘气。雪崩为游戏设定，史料未记载。' : river ? '每 0.45–0.75 秒按一下划桨；轻松也可按住。船头往左偏，抵消水流；点线显示预计落点，红线提示转向。首趟为教学趟。划桨要有节奏，按得太快会累、反而划不动。' : '草墩相对能落脚，积水反光处要当心，看不准就用探杆。';
    var briefing = mountain ? '冰沟先喘气再跳跃，雪崩段交替冲刺与喘气。' : river ? '船头左偏抵水流，按节奏划桨，红线提示转向。' : '向北到任一出口即通关；看不准先探杆，陷入按住救援。';
    if (!run.arcadeAttempt) {
      run.arcadeAttempt = { entry: Object.assign({}, run.entry), practice: Boolean(run.practice),
        state: game.createState({ difficulty: difficulty, resources: run.entry, level: level, ford: run.riverExplore && run.riverExplore.ford, trips: XZ.state.get().riverTrips, usedSupplement: run.usedSupplement, quizPreview: ui.quiz.isPreview() }),
        countdown: level.arcade.countdown.value, started: false, settled: false };
    }
    var attempt = run.arcadeAttempt, stopped = false, phase = 'ready', input, loop, view, stopQuiz = null;
    var area = ui.el('section', river ? 'arcade river' : grass ? 'arcade grassland' : 'arcade'); area.setAttribute('aria-label', mountain ? '夹金山雪山攀登，艺术演绎' : river ? '大渡河激流渡船，艺术演绎' : '草地沼泽行军，艺术演绎');
    var toolbar = ui.el('div', 'arcade-toolbar');
    toolbar.appendChild(ui.el('strong', '', (difficulty === 'easy' ? '轻松' : '标准') + ' · ' + (level.arcade.title || '障碍练习')));
    var pauseButton = ui.button('暂停', null, { secondary: true }); pauseButton.dataset.action = 'pause'; toolbar.appendChild(pauseButton);
    var replayButton = ui.button('重新游戏', callbacks.retry, { secondary: true }); toolbar.appendChild(replayButton);
    var toggle = ui.button('显示按键', function () {
      controls.hidden = !controls.hidden; toggle.textContent = controls.hidden ? '显示按键' : '隐藏按键';
      toggle.setAttribute('aria-pressed', String(!controls.hidden));
      fitGame();
    }, { secondary: true }); toolbar.appendChild(toggle); area.appendChild(toolbar);
    var screen = ui.el('div', 'arcade-screen'), canvas = ui.el('canvas', 'arcade-canvas'); canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', mountain ? '雪山攀登：越过王母寨垭口，下坡到达维；空格跳跃，Shift / X 按住冲刺，走路自动恢复氧气' : river ? '大渡河渡船：左右转船头，上或空格按一下划一桨，下倒划；轻松按住自动划桨，标准需点按' : '草地沼泽行军：向北走到任一出口即通关，空格探杆，陷入后按住 Shift 或 X 救援');
    canvas.textContent = grass ? '向北到达任一出口即通关，空格探杆，按住 Shift / X 救援。' : river ? '左右转向，上划桨，下倒划。' : '请使用方向键或屏幕按键向右移动，空格跳跃。'; screen.appendChild(canvas);
    var overlay = ui.el('div', 'arcade-overlay'); overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-label', '游戏提示'); screen.appendChild(overlay);
    var playfield = ui.el('div', 'arcade-playfield'), sidebar = ui.el('aside', 'arcade-sidebar');
    sidebar.setAttribute('aria-label', '状态与读数');
    playfield.appendChild(screen); area.appendChild(playfield); area.appendChild(sidebar);
    var notes = ui.el('details', 'arcade-notes');
    notes.appendChild(ui.el('summary', '', '说明与出处'));
    notes.appendChild(ui.el('p', 'muted', fullBriefing));
    // DOM 仪表在窄屏仍可清楚阅读，也向读屏和浏览器复验提供同一份模型结果。
    var lifeReadout = ui.el('div', 'life-readout');
    var grassGoal = null, grassProgress = null, grassGuidance = null;
    if (grass) {
      grassGoal = ui.el('p', 'grass-goal'); lifeReadout.appendChild(grassGoal);
      grassProgress = ui.el('progress', 'grass-progress'); grassProgress.setAttribute('max', '1'); grassProgress.setAttribute('aria-label', '向北行军进度'); lifeReadout.appendChild(grassProgress);
      grassGuidance = ui.el('p', 'grass-guidance'); grassGuidance.hidden = true; grassGuidance.setAttribute('role', 'alert'); lifeReadout.appendChild(grassGuidance);
    }
    var lifeSummary = ui.el('p', ''); lifeReadout.appendChild(lifeSummary); lifeReadout.setAttribute('role', 'status'); sidebar.appendChild(lifeReadout);
    var readouts = [], metrics = null, lastReadout = '', riverAssist = null, rowButton = null;
    if (mountain) {
      metrics = ui.el('div', 'mountain-hud'); metrics.setAttribute('aria-label', '雪山科学仪表');
      [['relativeOxygen', '相对氧含量']].forEach(function (item) {
        var cell = ui.el('div', 'mountain-datum'); cell.appendChild(ui.el('span', '', item[1]));
        var output = ui.el('output', ''); output.dataset.metric = item[0]; cell.appendChild(output);
        metrics.appendChild(cell); readouts.push(output);
      });
      notes.appendChild(ui.el('p', 'mountain-reference', '海拔：示意（垭口 ' + XZ.levels.jiajinshan.crossingAltitude().value + ' m 已核实）· 气温、氧含量：简化模型 · 其余为游戏参数 · 雪崩为游戏设定，史料未记载'));
      sidebar.appendChild(metrics);
    }
    if (river) {
      notes.appendChild(ui.el('p', 'mountain-reference', '5 月与安顺场：已核实（来源见连环画）· 流量、宽深：演示参数，非实测 · 流速及分布：简化模型 · 其余为游戏参数'));
      var riverQuote = XZ.data.quiz.find(function (q) { return q.id === 'dd-h3'; });
      notes.appendChild(ui.el('p', 'mountain-reference', '水位上涨为游戏设定；史料记载 1935 年 5 月大渡河河道陡峻、险滩密布、水流湍急。（引文' + (riverQuote.status === 'verified' ? '已核实' : '待核实') + '）'));
      notes.appendChild(ui.source(riverQuote));
      notes.appendChild(ui.el('p', 'river-route-note', '点线：保持当前船头与节奏的预计落点（不计障碍）；方向牌由上游指向下游。'));
      riverAssist = ui.el('p', 'river-assist'); lifeReadout.appendChild(riverAssist);
      metrics = ui.el('div', 'river-hud'); metrics.setAttribute('aria-label', '河流科学仪表');
      [['localFlow', '此处水流']].forEach(function (item) {
        var cell = ui.el('div', 'mountain-datum'); cell.appendChild(ui.el('span', '', item[1]));
        var output = ui.el('output', ''); output.dataset.metric = item[0]; cell.appendChild(output);
        metrics.appendChild(cell); readouts.push(output);
      });
      sidebar.appendChild(metrics);
    }
    var grassReference = null;
    if (grass) {
      grassReference = ui.el('p', 'mountain-reference', '地貌线索概率、气温曲线、天气、救援倒计时与耗时：游戏设定 / 参数 · 沼泽形成：简化模型 · 人物与路线：艺术演绎');
      notes.appendChild(grassReference);
      metrics = ui.el('div', 'grass-hud'); metrics.setAttribute('aria-label', '草地气候仪表');
      [['range', '昼夜温差']].forEach(function (item) {
        var cell = ui.el('div', 'mountain-datum'); cell.appendChild(ui.el('span', '', item[1]));
        var output = ui.el('output', ''); output.dataset.metric = item[0]; cell.appendChild(output);
        metrics.appendChild(cell); readouts.push(output);
      });
      sidebar.appendChild(metrics);
    }
    if (grass) {
      var legend = ui.el('section', 'ground-legend'); legend.setAttribute('aria-label', '地面线索');
      legend.appendChild(ui.el('h3', '', '地面线索'));
      legend.appendChild(ui.el('p', 'legend-notice', '概率为游戏参数'));
      var features = {hummock: ['草墩', '土黄底上的小草丘', '低'], dark: ['深草·颜色异常', '竖条纹', '中'], water: ['积水反光', '灰蓝色水洼', '高']};
      level.exploration.clues.forEach(function (clue) {
        var info = features[clue.id], entry = ui.el('div', 'ground-clue'); entry.dataset.clue = clue.id;
        var icon = ui.el('canvas', 'clue-icon'); icon.width = 88; icon.height = 88; icon.setAttribute('aria-hidden', 'true');
        var ctx = icon.getContext('2d'); ctx.scale(2, 2); ctx.fillStyle = '#C9A66B'; ctx.fillRect(0, 0, 44, 44);
        game.drawClue(ctx, clue.id, 22, 22); entry.appendChild(icon);
        var description = ui.el('div', 'clue-description');
        var name = ui.el('strong', 'clue-name');
        name.appendChild(ui.el('span', 'clue-full', info[0])); name.appendChild(ui.el('span', 'clue-short', {hummock: '草墩', dark: '深草', water: '积水'}[clue.id])); description.appendChild(name);
        description.appendChild(ui.el('span', 'clue-feature', info[1]));
        var probability = ui.el('span', 'clue-probability'), percent = Math.round(clue.probability.value * 100) + '%';
        probability.appendChild(ui.el('span', 'clue-full', info[2] + '（约 ' + percent + '）'));
        probability.appendChild(ui.el('span', 'clue-short', percent)); description.appendChild(probability);
        entry.appendChild(description); legend.appendChild(entry);
      });
      var marks = ui.el('p', 'ground-marks');
      marks.appendChild(ui.el('span', 'ground-safe', '安全：探杆确认安全'));
      marks.appendChild(ui.el('span', 'ground-danger', '危险：探杆确认隐患'));
      marks.appendChild(ui.el('span', '', '灰色剪影 = 掉队队友')); legend.appendChild(marks);
      sidebar.insertBefore(legend, lifeReadout);
    }
    var controls = ui.el('div', 'arcade-controls'); controls.setAttribute('role', 'group'); controls.setAttribute('aria-label', '虚拟游戏按键');
    // 不按视口宽度猜测：触屏笔记本也默认展示，鼠标窄窗口仍可手动切换。
    var touch = Boolean((window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0);
    controls.hidden = !touch; toggle.textContent = controls.hidden ? '显示按键' : '隐藏按键'; toggle.setAttribute('aria-pressed', String(!controls.hidden));
    var keys = river ? [['left', '← 转左'], ['up', '↑ 划桨'], ['right', '转右 →'], ['down', '↓ 倒划']] : mountain ? [['left', '← 左'], ['right', '右 →'], ['primary', '跳跃'], ['secondary', '冲刺']] :
      [['left', '← 西'], ['up', '↑ 北'], ['right', '东 →'], ['down', '↓ 南'], ['primary', '探杆'], ['secondary', '救援']];
    keys.forEach(function (item) {
      var button = ui.button(item[1], null, { secondary: item[0] !== 'primary', className: 'arcade-key key-' + item[0] });
      if (river && item[0] === 'up') { rowButton = button; }
      button.dataset.action = item[0]; button.setAttribute('aria-label', item[1]); controls.appendChild(button);
    });
    playfield.appendChild(controls);
    var metricStatus = ui.el('p', 'metric-status');
    notes.appendChild(metricStatus);
    var liveHint = riverAssist || ui.el('p', 'live-hint');
    if (!river) { lifeReadout.appendChild(liveHint); }
    notes.appendChild(ui.el('p', 'science-note', '基础行进补给 ' + attempt.state.travelSupplies + ' 物资已计入本关，余下物资用于道具；耐力与基础道具有保底；低资源降低得分。失败重试恢复出发资源，连续失败 3 次可补给后重试。'));
    notes.appendChild(ui.el('p', 'arcade-help', mountain ? '← → / A D 移动 · 空格短按小跳、长按高跳 · Shift / X 按住冲刺 · Esc / P 暂停。氧气低时松开冲刺，走路或站立即可恢复；携带干粮、干辣椒按需自动使用，路边拾取立即生效。' : river ? '← → / A D 转船头 · ↑ / W / 空格 点按划一桨（轻松按住每 0.7 秒自动划；标准按住不连划）· 最佳间隔 0.45–0.75 秒 · ↓ / S 倒划减速 · 松手随水漂流 · Esc / P 暂停。船头往左偏，抵消水流；红色点线表示预计落点越界，越界后有 1.5 秒回划；抢桨会疲劳，轻松自动桨不产生疲劳，体力耗尽只降低分数与回写资源；每趟到岸记录送达，未完成时自动返航；修船按耐久自动使用。' : '方向键 / WASD 按住连续走 · 空格试探面朝方向的一格 · Esc / P 暂停。目标是北侧整排出口，领队到达任一格即通关，无需收齐宝箱或全员到齐。队友陷入先走到相邻格，再按住救援（Shift / X）；领队可直接按住自救。连按方向 / 空格 / 救援五次仍可救出。轻松7秒 / 标准4秒倒计时，超时掉队或退回安全格并扣命。确认安全后可快步；低体力时自动使用携带的干粮。'));
    notes.appendChild(ui.el('p', 'muted', mountain ? '角色与路线为艺术演绎 · 检查点、天气、道具效果和资源变化为游戏参数；干辣椒回温仅为游戏效果。' : river ? '木船、人物与河道为艺术演绎 · 修船按需自动使用，实际使用才扣物资；划速与时间伸缩不表示真实渡河速度或历史用时。' : '草墩也可能藏有隐患；探杆扣物资，宝箱答对可补探杆或干粮。昼夜温差与雨雹减速直接影响行军。'));
    if (attempt.practice) { notes.appendChild(ui.el('p', 'notice', '本关已完成，重试为练习；存档中的星级与资源保留。')); }
    sidebar.appendChild(notes);
    host.appendChild(area);
    // 三关共用 4:3 视窗；游戏逻辑坐标与操作规则保持独立。
    view = XZ.engine.view(canvas, screen, {height: 360});
    function setPhase(value) { phase = value; area.dataset.phase = value; }
    function draw() {
      game.render(view.ctx, attempt.state, view);
      if (!(grass && attempt.state.guidance)) { XZ.engine.hud.challenge(view.ctx, attempt.state, view); }
      var ls = attempt.state;
      lifeSummary.textContent = '生命 ♥ ' + ls.lives + '/' + ls.livesMax + ' · 失误 ' + ls.mistakes + ' 次' + (ls.lifeNotice.remaining > 0 ? ' · ' + ls.lifeNotice.reason + (ls.over ? '' : (ls.lifeNotice.reason === '队友掉队' ? '，剪影留在原地' : '，已回检查点 · 短暂无敌')) : '');
      canvas.dataset.hudMode = view.compactHUD ? 'compact' : 'normal';
      if (river) {
        var riverHUD = attempt.state.hud;
        var rs = attempt.state, rhythm = rs.config.rhythm;
        var inBeat = rs.lastStroke === null || rs.strokeAge >= rhythm.min.value && rs.strokeAge <= rhythm.max.value;
        var riverHint = rs.hasteRemaining > 0 ? '太快了！放慢节奏' : rs.returnRemaining !== null ? '快回划！剩 ' + rs.returnRemaining.toFixed(1) + ' 秒' : rs.transition > 0 ? '已到岸 · 自动返航' : inBeat ? '现在划！' : '等节奏';
        riverAssist.textContent = riverHint + ' · 疲劳 ' + Math.round(rs.fatigue * 100) + '%' + (view.compactHUD ? ' · 上一桨消耗 ' + rs.lastStrokeCost.toFixed(2) : '');
        if (rs.feedback.remaining > 0) { riverAssist.textContent += ' · ' + rs.feedback.text; }
        if (rs.boost > 0) { riverAssist.textContent += ' · 额外划桨力 ' + Math.ceil(rs.boost) + ' s'; }
        if (rs.milestone.remaining > 0) { riverAssist.textContent += ' · ' + rs.milestone.text; }
        metricStatus.textContent = '用时 ' + Math.floor(rs.elapsed) + ' s · 修船 ' + (rs.repairs + rs.bonusRepairs) + ' · 体力 ' + Math.ceil(rs.energy) + '/' + rs.energyMax + ' · 耐久 ' + Math.ceil(rs.hull) + '/' + rs.config.hullMax.value;

        canvas.setAttribute('aria-label', '大渡河渡船 · 第 ' + rs.trip + '/' + rs.totalTrips + ' 趟 · 送达 ' + rs.delivered + '/' + rs.totalPeople + ' · 左右转向，上划桨，下倒划');
        rowButton.dataset.haste = String(rs.hasteRemaining > 0);
        rowButton.dataset.beat = String(rs.hasteRemaining <= 0 && (rs.lastStroke === null || rs.strokeAge >= rhythm.min.value && rs.strokeAge <= rhythm.max.value));
        readouts[0].textContent = riverHUD.localFlow.toFixed(1) + ' m/s';
      } else if (grass) {
        var gs = attempt.state;
        grassGoal.textContent = gs.success ? '已到达北侧出口 · 通关成功' : '↑ 北侧整排都是出口 · 还剩 ' + gs.player.y + ' 排';
        grassProgress.setAttribute('value', String(gs.hud.progress));
        grassGuidance.hidden = !gs.guidance || gs.over;
        grassGuidance.textContent = gs.guidance ? (gs.guidance.kind === 'rescue' ? '队友陷入！' : '队友掉队，扣 1 条生命。') + gs.guidance.text : '';
        controls.querySelectorAll('[data-action]').forEach(function (button) { button.dataset.guided = String(Boolean(gs.guidance && gs.guidance.direction === button.dataset.action && !gs.over)); });
        readouts[0].textContent = gs.hud.range.toFixed(1) + ' ℃';
        lifeSummary.textContent += ' · 队伍 ' + (4 - gs.stragglers) + '/4 · 掉队 ' + gs.stragglers + (gs.trapped ? ' · ' + (gs.trapped.actor ? '队友救援' : '领队自救') + ' ' + gs.trapped.remaining.toFixed(1) + ' 秒 · ' + (game.adjacent(gs) ? '按住救援 ' + Math.round(gs.trapped.progress * 100) + '%' : '走到相邻格') : '') + ' · 视野 ' + gs.vision + ' 格';
        metricStatus.textContent = '距北侧出口 ' + gs.player.y + ' 排 · 向北 ' + Math.round(gs.hud.progress * 100) + '% · 用时 ' + Math.floor(gs.elapsed) + ' s · 体力 ' + Math.ceil(gs.energy) + '/' + gs.energyMax + ' · 探杆 ' + (gs.probes + gs.bonusProbes) + ' · 干粮 ' + (gs.rations + gs.bonusRations) + (gs.feedback.remaining > 0 ? ' · ' + gs.feedback.text : '');
        liveHint.textContent = gs.guidance ? gs.guidance.text : gs.trapped ? (gs.trapped.actor ? '队友陷入，靠近后按住救援' : '领队陷入，按住救援自救') : gs.feedback.remaining > 0 ? gs.feedback.text : gs.weather ? gs.weather.kind + ' · 脚步暂时变慢' : gs.night ? '夜雾仅一格 · 寒冷耗体力更快' : '↑ 向北到出口 · 看不准先探杆';
        if (gs.milestone.remaining > 0) { liveHint.textContent += ' · ' + gs.milestone.text; }
        var m = gs.milestone;
        grassReference.textContent = m.remaining > 0 ? m.text + ' · ' + (m.status === 'verified' ? '已核实' : '待核实') + ' · ' + m.source :
          '地貌线索概率、气温曲线、天气、救援倒计时与耗时：游戏设定 / 参数 · 沼泽形成：简化模型 · 人物与路线：艺术演绎';
      } else if (metrics) {
        var ms = attempt.state;
        metricStatus.textContent = '体力 ' + Math.ceil(ms.energy) + '/' + ms.energyMax + ' · 氧气 ' + Math.ceil(ms.oxygen) + '/' + ms.oxygenMax + ' · 体温 ' + Math.ceil(ms.warmth) + '/' + ms.config.meterMax.value + ' · 干粮 ' + ms.carried.food + ' · 干辣椒 ' + ms.carried.chili + (ms.exhausted || ms.breathing > 0 ? ' · 喘口气，走路或站立即可恢复氧气' : ms.feedback.remaining > 0 ? ' · ' + ms.feedback.text : '') + (ms.avalanche.active ? ' · 雪崩追逐，交替冲刺与喘气' : '') + (ms.weather.warning > 0 || ms.weather.gust > 0 ? ' · 阵风' : '');
        liveHint.textContent = ms.exhausted || ms.breathing > 0 ? '喘口气，走路或站立即可恢复氧气' : ms.feedback.remaining > 0 ? ms.feedback.text : '方向键稳步走 · 空格跳跃 · Shift 冲刺';
        if (ms.avalanche.active) { liveHint.textContent += ms.avalanche.warning > 0 ? ' · 雪崩将至！助跑冲刺' : ' · 雪崩追逐 · 距离 ' + Math.max(0, Math.round(ms.player.x - ms.avalanche.x)); }
        if (ms.weather.warning > 0 || ms.weather.gust > 0) { liveHint.textContent += ' · ' + (ms.weather.direction > 0 ? '→' : '←') + (ms.weather.warning > 0 ? ' 阵风将至' : ' 阵风'); }
        if (ms.milestone.remaining > 0) { liveHint.textContent += ' · ' + ms.milestone.text; }
        var h = attempt.state.hud, value = h.relativeOxygen.toFixed(1);
        if (value !== lastReadout) {
          lastReadout = value; readouts[0].textContent = value + '%';
        }
      }
    }
    function fitGame() {
      if (!window.matchMedia || !screen.getBoundingClientRect) { return; }
      var wide = window.matchMedia('(min-width: 900px)').matches;
      // 选用同一分栏规则与空间预算，避免状态文案、按键数量改变画布大小。
      area.dataset.layout = wide ? (area.clientWidth - 276 < 720 ? 'full' : 'columns') : 'single';
      var keyHeight = controls.hidden ? 0 : Math.max(controls.getBoundingClientRect().height, wide ? 160 : 112);
      var reserve = wide && area.dataset.layout === 'full' ? 96 : 0;
      var available = Math.max(1, window.innerHeight - 16 - keyHeight - reserve);
      playfield.style.setProperty('--game-max-width', Math.min(960, available * 4 / 3) + 'px');
    }
    view.onResize = function () {
      fitGame();
      draw();
    };
    var layoutFrame = null;
    var layoutObserver = window.ResizeObserver ? new window.ResizeObserver(function () {
      if (layoutFrame !== null) { window.cancelAnimationFrame(layoutFrame); }
      layoutFrame = window.requestAnimationFrame(function () {
        layoutFrame = null; if (stopped) { return; } fitGame();
      });
    }) : null;
    if (layoutObserver) { layoutObserver.observe(controls); layoutObserver.observe(lifeReadout); }
    function focusOverlay() { var button = overlay.querySelector('button') || replayButton; button.focus({ preventScroll: true }); }
    function hideOverlay() { overlay.hidden = true; overlay.textContent = ''; canvas.focus({ preventScroll: true }); }
    function show(title) { overlay.hidden = false; overlay.textContent = ''; overlay.appendChild(ui.el('h3', '', title)); }
    function paused(reason) {
      if (stopped || phase === 'ended' || phase === 'ready' || phase === 'quiz') { return; }
      input.clear(); setPhase('paused'); show('已暂停');
      if (reason === 'hidden' || reason === 'blur') { overlay.appendChild(ui.el('p', '', '页面离开后已自动暂停，点击继续再出发。')); }
      overlay.appendChild(ui.button('继续', resume));
      focusOverlay();
    }
    function countdownLabel() {
      show('准备出发 · ' + Math.ceil(attempt.countdown));
      overlay.appendChild(ui.el('p', '', briefing));
      // 倒计时层透过键盘暂停；焦点仍在画布。
      canvas.focus({ preventScroll: true });
    }
    function resume() {
      if (stopped || attempt.settled || document.hidden) { return; }
      input.clear(); attempt.started = true;
      if (attempt.countdown > 0) { setPhase('countdown'); countdownLabel(); }
      else { setPhase('playing'); hideOverlay(); }
      loop.resume();
    }
    function end(outcome) {
      if (attempt.practice && !outcome.success && !attempt.countedFailure) { run.failures = (run.failures || 0) + 1; attempt.countedFailure = true; }
      setPhase('ended'); input.clear(); pauseButton.disabled = true;
      show(outcome.success ? '通关成功' : '本关失败');
      overlay.appendChild(ui.stars(outcome.stars));
      overlay.appendChild(ui.el('p', 'score-total', '本次分数 ' + outcome.score.total));
      var detail = ui.el('dl', 'score-parts');
      outcome.score.parts.forEach(function (part) { detail.appendChild(ui.el('dt', '', part.label)); detail.appendChild(ui.el('dd', '', String(part.value))); });
      overlay.appendChild(detail);
      overlay.appendChild(ui.el('p', 'highscore', '本机最高分 ' + outcome.record.best + (outcome.record.newRecord ? ' · 新纪录！' : '')));
      overlay.appendChild(ui.el('p', 'delta', '体力 ' + outcome.delta.energy + ' · 物资 ' + outcome.delta.supplies + ' · 天数 +' + outcome.delta.days));
      outcome.notes.forEach(function (note) { overlay.appendChild(ui.el('p', '', note)); });
      var failures = attempt.practice ? run.failures || 0 : XZ.state.get().progress[level.id].failures || 0;
      if (!outcome.success && failures >= XZ.data.game.challenge.supplementFailures.value) {
        overlay.appendChild(ui.button('补给后重试', function () { callbacks.retry(true); }));
        overlay.appendChild(ui.el('p', '', '恢复本关保底资源；本次分数标注“使用补给”。'));
      }
      focusOverlay();
    }
    input = XZ.engine.input(area, {
      enabled: function () { return phase === 'playing' || phase === 'countdown'; },
      onAction: function (action) {
        if (action !== 'pause' || phase === 'ready' || phase === 'ended' || phase === 'quiz') { return; }
        if (loop.isPaused()) { resume(); } else { loop.pause(); }
      }
    });
    function askChest() {
      var chest = attempt.state.activeChest;
      setPhase('quiz'); loop.pause('quiz'); input.clear(); draw();
      stopQuiz = ui.quiz.open(chest.question, {
        result: chest.result,
        onReward: function (correct) {
          var reward = game.reward(attempt.state, correct);
          chest.result = { correct: correct, reward: reward }; return reward;
        },
        onClose: function () {
          stopQuiz = null; chest.opened = true; attempt.state.activeChest = null;
          if (!stopped) { resume(); draw(); }
        }
      });
    }
    // RAF 与测试钩子经过同一宿主路径：倒计时、输入、问答、结算、字幕均不绕过。
    function advance(dt, drivenInput) {
      if (stopped || (phase !== 'playing' && phase !== 'countdown')) { return; }
      if (attempt.countdown > 0) {
        var old = Math.ceil(attempt.countdown); attempt.countdown = Math.max(0, attempt.countdown - dt);
        if (attempt.countdown <= 1e-8) { attempt.countdown = 0; setPhase('playing'); hideOverlay(); input.clear(); }
        else if (Math.ceil(attempt.countdown) !== old) { countdownLabel(); }
        return;
      }
      if (attempt.state.activeChest) { askChest(); return; }
      var controlsInput = drivenInput || input;
      if (!drivenInput) { input.beginFrame(); }
      game.update(attempt.state, controlsInput, dt);
      if (!drivenInput) { input.endFrame(); }
      if (game.isOver(attempt.state)) {
        var outcome = settle(level.id, attempt, game.result(attempt.state));
        if (outcome) { setPhase('ended'); loop.pause(); end(outcome); callbacks.result(outcome); }
      } else if (attempt.state.activeChest) { askChest(); }
    }
    loop = XZ.engine.loop({ manual: testMode, onPause: paused, render: draw, update: advance });
    var debugHook = null;
    if (testMode) {
      var previousTestActions = {};
      debugHook = {
        get state() { return attempt.state; },
        get phase() { return phase; },
        step: function (actions, render) {
          if (stopped || (phase !== 'playing' && phase !== 'countdown')) { return; }
          var testInput = actions === undefined ? null : {
            isDown: function (name) { return Boolean(actions[name]); },
            pressed: function (name) { return Boolean(actions[name]) && !previousTestActions[name]; }
          };
          advance(1 / 60, testInput);
          previousTestActions = Object.assign({}, actions || {});
          if (render !== false) { draw(); }
        },
        draw: draw
      };
      XZ.debug = XZ.debug || {}; XZ.debug.arcade = debugHook;
    }
    // 暂停和结算时在提示层与页面导航间切换焦点，返回总图只有一个入口。
    function trap(event) {
      if (overlay.hidden || (phase !== 'paused' && phase !== 'ended') || event.key !== 'Tab') { return; }
      var buttons = [replayButton].concat(Array.prototype.slice.call(overlay.querySelectorAll('button')));
      var navigation = host.parentNode.querySelector('.stage-navigation');
      if (navigation) { buttons = buttons.concat(Array.prototype.slice.call(navigation.querySelectorAll('button'))); }
      buttons = buttons.filter(function (button) { return !button.disabled; });
      if (!buttons.length) { return; }
      var index = buttons.indexOf(document.activeElement);
      if (index < 0 && event.shiftKey) { index = 0; }
      event.preventDefault();
      buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
    }
    var navigationHost = host.parentNode; navigationHost.addEventListener('keydown', trap);
    function fordPicker() {
      var picker = ui.el('div', 'ford-picker'); picker.appendChild(ui.el('strong', '', '选渡口')); picker.setAttribute('role', 'group'); picker.setAttribute('aria-label', '选择渡口');
      level.exploration.fords.forEach(function (ford) {
        var velocity = XZ.levels.daduhe.velocity(level.arrivalMonth.value, ford.id);
        var choice = ui.button(ford.label, function () {
          run.riverExplore = {ford: ford.id};
          attempt.state = game.createState({difficulty: difficulty, resources: attempt.entry, usedSupplement: run.usedSupplement, level: level, ford: ford.id, trips: attempt.state.totalTrips});
          picker.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.ford === ford.id)); }); draw();
        }, {secondary: true});
        choice.setAttribute('aria-label', ford.label + ' · ' + ford.width.value + ' m × ' + ford.depth.value + ' m · ' + velocity.toFixed(2) + ' m/s');
        notes.appendChild(ui.el('p', 'muted', ford.label + ' · ' + ford.width.value + ' m × ' + ford.depth.value + ' m · ' + velocity.toFixed(2) + ' m/s'));
        choice.dataset.ford = ford.id; choice.setAttribute('aria-pressed', String(attempt.state.ford === ford.id)); picker.appendChild(choice);
      });
      var choices = ui.el('div', 'river-preparation');
      choices.appendChild(picker);
      var tripPicker = ui.el('div', 'trip-picker'); tripPicker.setAttribute('role', 'group'); tripPicker.setAttribute('aria-label', '选择趟数');
      tripPicker.appendChild(ui.el('strong', '', '选趟数'));
      level.arcade.tripOptions.value.forEach(function (trips) {
        var choice = ui.button(trips + ' 趟 · ' + trips * level.arcade.peoplePerTrip.value + ' 人', function () {
          XZ.state.setRiverTrips(trips);
          attempt.state = game.createState({difficulty: difficulty, resources: attempt.entry, usedSupplement: run.usedSupplement, level: level, ford: attempt.state.ford, trips: trips});
          tripPicker.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.trips) === trips)); }); draw();
        }, {secondary: true});
        choice.setAttribute('aria-label', trips + ' 趟 · 送 ' + trips * level.arcade.peoplePerTrip.value + ' 人');
        choice.dataset.trips = String(trips); choice.setAttribute('aria-pressed', String(attempt.state.totalTrips === trips)); tripPicker.appendChild(choice);
      });
      choices.appendChild(tripPicker); overlay.appendChild(choices);
      notes.appendChild(ui.el('p', 'muted', '可选 1–3 趟，每趟 3 人，默认 1 趟。宽度 × 平均水深为面积；本趟流速 = 5 月流量 × 上涨系数 ÷ 面积。5 月已核实；流量、断面为演示参数，非实测；流速为模型。'));
    }
    fitGame();
    draw();
    if (attempt.settled) { end(attempt.outcome); }
    else if (attempt.started) { setPhase('paused'); show('已暂停'); overlay.appendChild(ui.button('继续', resume)); }
    else { show('准备出发'); overlay.appendChild(ui.el('p', '', briefing)); if (river) { fordPicker(); } overlay.appendChild(ui.button('开始练习', resume)); }
    area.dataset.phase = phase;
    return function () { stopped = true; if (layoutObserver) { layoutObserver.disconnect(); } if (layoutFrame !== null) { window.cancelAnimationFrame(layoutFrame); } if (debugHook && XZ.debug.arcade === debugHook) { delete XZ.debug.arcade; } if (stopQuiz) { stopQuiz(); stopQuiz = null; } loop.stop(); input.stop(); view.stop(); navigationHost.removeEventListener('keydown', trap); };
  }
  XZ.arcade = { mount: mount, settle: settle };
}());

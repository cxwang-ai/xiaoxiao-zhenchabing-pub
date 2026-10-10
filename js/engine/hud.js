(function () {
  'use strict';
  var XZ = window.XZ, paper = '#F3E9D2', ink = '#1F1A17', slate = '#5B6B73';
  // 浏览器从同一套 CSS 变量读取；无 DOM 的离线绘制测试使用相同默认值。
  var defaults = { xs: 12, sm: 14, md: 16, lg: 20, xl: 28,
    serif: '"Songti SC", "STSong", "SimSun", "Noto Serif CJK SC", serif',
    sans: '"PingFang SC", "Microsoft YaHei", sans-serif' };
  function scale(view) { return (view && view.cssWidth || view && view.width || 480) / (view && view.width || 480); }
  function typography() {
    var tokens = Object.assign({}, defaults);
    if (window.getComputedStyle && typeof document !== 'undefined' && document.documentElement) {
      var css = window.getComputedStyle(document.documentElement);
      ['xs', 'sm', 'md', 'lg', 'xl'].forEach(function (key) { tokens[key] = parseFloat(css.getPropertyValue('--fs-' + key)) || tokens[key]; });
      ['serif', 'sans'].forEach(function (key) { tokens[key] = css.getPropertyValue('--' + key).trim() || tokens[key]; });
    }
    return tokens;
  }
  function text(ctx, kind, value, x, y, view, options) {
    options = options || {};
    var tokens = view && view.typography || defaults, ratio = scale(view);
    var cssSize = kind === 'label' ? tokens.xs : kind === 'hint' ? tokens.sm : (view && view.cssWidth >= 600 ? tokens.lg : tokens.md);
    ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = (kind === 'value' ? '700 ' : '400 ') + cssSize / ratio + 'px ' + tokens[kind === 'value' ? 'serif' : 'sans'];
    ctx.fillStyle = options.color || (kind === 'label' ? slate : ink);
    value = String(value);
    function bounds(str) {
      var m = ctx.measureText(str);
      return { left: m.actualBoundingBoxLeft || 0, width: Math.max(m.width, (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || 0)),
        ascent: m.actualBoundingBoxAscent || cssSize / ratio, descent: m.actualBoundingBoxDescent || 0 };
    }
    var m = bounds(value);
    if (options.width !== undefined && m.width > options.width) {
      while (value && bounds(value + '…').width > options.width) { value = value.slice(0, -1); }
      value += '…'; m = bounds(value);
    }
    ctx.fillText(value, x + m.left, y);
    ctx.restore();
    return { text: value, x: x, y: y - m.ascent, w: m.width, h: m.ascent + m.descent, baseline: y, cssSize: cssSize };
  }
  function items(s, compact) {
    var river = s.config.game === 'daduhe', mountain = s.config.game === 'jiajinshan';
    function cell(label, value, extra) { return Object.assign({ label: label, value: value }, extra); }
    function meter(label, value, max) { return cell(label, '', { meter: { value: value, max: max } }); }
    if (river) {
      var first = [cell('趟数', s.trip + '/' + s.totalTrips), cell('水流', s.meanFlow.toFixed(2) + ' m/s'), cell('送达', s.delivered + '/' + s.totalPeople)];
      if (!compact) { first.push(cell('用时 · 修船', Math.floor(s.elapsed) + 's · ' + (s.repairs + s.bonusRepairs))); }
      return first.concat([meter('体力', s.energy, s.energyMax), meter('耐久', s.hull, s.config.hullMax.value)],
        compact ? [] : [cell('上一桨', s.lastStrokeCost.toFixed(2))],
        [cell('方向', compact ? '上游→下游' : '上游 → 下游', { kind: 'hint', direction: true })]);
    }
    if (mountain) {
      var head = [cell('海拔', Math.round(s.hud.altitude) + ' m'), cell('气温', XZ.games.jiajinshan.formatTemperature(s.hud.temperature))];
      return head.concat(compact ? [] : [cell('干粮 · 辣椒', s.carried.food + ' · ' + s.carried.chili)],
        [meter('氧气', s.oxygen, s.oxygenMax), meter('体温', s.warmth, s.config.meterMax.value)],
        compact ? [] : [meter('体力', s.energy, s.energyMax)]);
    }
    var hour = Math.floor(s.hour), minute = Math.floor((s.hour - hour) * 60);
    var head = [cell('时刻', ('0' + hour).slice(-2) + ':' + ('0' + minute).slice(-2)), cell('气温', s.temperature.toFixed(1) + ' ℃'), cell('距北侧出口', s.player.y + ' 排')];
    return head.concat(compact ? [] : [cell('用时', Math.floor(s.elapsed) + ' s')],
      [meter('体力', s.energy, s.energyMax), cell('探杆', s.probes + s.bonusProbes)],
      compact ? [] : [cell('干粮', s.rations + s.bonusRations)], [cell('队伍', (4 - s.stragglers) + '/4')]);
  }
  function layout(s, view) {
    var ratio = scale(view), compact = view.compactHUD;
    var columns = compact ? (s.config.game === 'jiajinshan' ? 2 : 3) : (s.config.game === 'jiajinshan' ? 3 : 4);
    var inset = 8 / ratio, gap = 8 / ratio, height = 44 / ratio;
    var width = (view.width - inset * 2 - gap * (columns - 1)) / columns;
    var cells = items(s, compact).map(function (item, i) {
      return Object.assign({}, item, { x: inset + i % columns * (width + gap), y: inset + Math.floor(i / columns) * (height + gap), w: width, h: height });
    });
    return { cells: cells, columns: columns, gap: gap, height: inset * 2 + height * 2 + gap, ratio: ratio };
  }
  function bar(ctx, options) {
    var fraction = Math.max(0, Math.min(1, options.value / (options.max || 1))), h = options.h || 12;
    ctx.save(); ctx.fillStyle = paper; ctx.fillRect(options.x, options.y, options.w, h);
    ctx.strokeStyle = ink; ctx.lineWidth = options.lineWidth || 1; ctx.strokeRect(options.x, options.y, options.w, h);
    ctx.fillStyle = '#B3261E'; ctx.fillRect(options.x + 2, options.y + 2, Math.max(0, options.w - 4) * fraction, Math.max(0, h - 4));
    ctx.restore();
  }
  function grid(ctx, s, view) {
    var geometry = layout(s, view), ratio = geometry.ratio;
    ctx.save(); ctx.fillStyle = paper; ctx.fillRect(0, 0, view.width, geometry.height);
    ctx.strokeStyle = ink; ctx.lineWidth = 1 / ratio;
    ctx.beginPath(); ctx.moveTo(0, geometry.height); ctx.lineTo(view.width, geometry.height); ctx.stroke();
    geometry.cells.forEach(function (cell) {
      text(ctx, 'label', cell.label, cell.x, cell.y + 12 / ratio, view, { width: cell.w });
      if (cell.meter) {
        bar(ctx, { x: cell.x, y: cell.y + 28 / ratio, w: cell.w, h: 12 / ratio, lineWidth: 1 / ratio, value: cell.meter.value, max: cell.meter.max });
      } else {
        if (cell.direction) { ctx.fillStyle = paper; ctx.fillRect(cell.x, cell.y + 20 / ratio, cell.w, 18 / ratio); }
        text(ctx, cell.kind || 'value', cell.value, cell.x, cell.y + 36 / ratio, view, { width: cell.w, color: ink });
      }
    });
    ctx.restore(); return geometry;
  }
  // 生命与节奏由画布下方的同一张 DOM 状态卡显示；失命即时提示保留在画布。
  function challenge(ctx, s, view) {
    if (s.lifeNotice.remaining <= 0) { return; }
    var ratio = scale(view), pad = 8 / ratio, h = 32 / ratio, y = view.height - h - pad;
    ctx.save(); ctx.fillStyle = paper; ctx.fillRect(pad, y, view.width - pad * 2, h);
    ctx.strokeStyle = ink; ctx.lineWidth = 1 / ratio; ctx.strokeRect(pad, y, view.width - pad * 2, h);
    text(ctx, 'hint', s.lifeNotice.reason + (s.over ? ' · 生命用尽' : s.lifeNotice.reason === '队友掉队' ? ' · 剪影留在原地' : ' · 回检查点'), pad * 2, y + 21 / ratio, view, { width: view.width - pad * 4, color: '#B3261E' });
    ctx.restore();
  }
  XZ.engine.hud = { text: text, typography: typography, defaults: defaults, layout: layout, grid: grid, compact: grid, bar: bar, challenge: challenge };
}());

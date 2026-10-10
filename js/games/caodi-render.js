(function () {
  'use strict';
  var XZ = window.XZ, game = XZ.games.caodi;
  var paper = '#F3E9D2', ink = '#1F1A17', blue = '#5B6B73', ochre = '#C9A66B', green = '#465344';
  function line(ctx, x, y, dx, dy) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx, y + dy); ctx.stroke(); }
  function person(ctx, x, y, facing, size, dropped) {
    ctx.save(); ctx.translate(x, y); ctx.rotate({up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2}[facing]);
    ctx.fillStyle = dropped ? '#888888' : ink; ctx.beginPath(); ctx.arc(0, -size * 0.25, size * 0.23, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-size * 0.25, 0, size * 0.5, size * 0.6);
    ctx.strokeStyle = dropped ? '#888888' : ink; ctx.lineWidth = size * 0.15;
    line(ctx, -size * 0.2, size * 0.1, -size * 0.35, size * 0.25); line(ctx, size * 0.2, size * 0.1, size * 0.35, size * 0.25);
    line(ctx, -size * 0.15, size * 0.5, -size * 0.05, size * 0.3); line(ctx, size * 0.15, size * 0.5, size * 0.05, size * 0.3);
    ctx.strokeStyle = ochre; ctx.lineWidth = 1; line(ctx, -size * 0.17, size * 0.1, size * 0.3, 0); ctx.restore();
  }
  // 画布和常驻图例共用同一个造型，不维护第二套图标。
  game.drawClue = function (ctx, clue, px, py) {
    ctx.save(); ctx.lineWidth = 1;
    if (clue === 'hummock') {
      ctx.fillStyle = green; ctx.beginPath(); ctx.ellipse(px, py + 3, 15, 10, -0.12, Math.PI, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = paper; line(ctx, px - 8, py, 5, -5); line(ctx, px + 2, py - 3, 5, -4);
    } else if (clue === 'water') {
      ctx.fillStyle = blue; ctx.beginPath(); ctx.moveTo(px - 18, py - 9); ctx.lineTo(px + 12, py - 12); ctx.lineTo(px + 18, py + 9); ctx.lineTo(px - 12, py + 13); ctx.fill();
      ctx.strokeStyle = paper; line(ctx, px - 11, py - 4, 17, -2); line(ctx, px - 4, py + 4, 15, -1);
    } else {
      ctx.fillStyle = '#53603e'; ctx.fillRect(px - 16, py - 13, 30, 25); ctx.strokeStyle = ink;
      for (var j = -12; j < 15; j += 6) { line(ctx, px + j, py + 8, 3, -19); }
    }
    ctx.restore();
  };
  game.render = function (ctx, s, view) {
    // 每帧隔离绘制属性；刻痕线宽、透明度等不能从上一帧泄漏。
    ctx.save();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth = 1; ctx.setLineDash([]);
    ctx.clearRect(0, 0, view.width, view.height);
    var ratio = (view.cssWidth || view.width) / view.width;
    var tile = 44, left = (view.width - tile * s.map.size) / 2;
    var hudHeight = XZ.engine.hud.layout(s, view).height;
    var goalY = Math.max(view.height - 154, hudHeight + tile / 2 + 4 / ratio);
    var goalCamera = (view.height - 220 - goalY) / tile;
    var playerY = s.previousActors[0].y + (s.player.y - s.previousActors[0].y) * (1 - s.tween / s.config.tweenSeconds.value);
    var camera = Math.max(goalCamera, Math.min(s.map.rows - 4, playerY + goalCamera));
    // 最后两排逐渐给出口牌让位，牌子与角色、仪表分别占用空间。
    camera -= Math.max(0, 1 - playerY / 2) * Math.max(0, hudHeight + tile / 2 + 22 / ratio - goalY) / tile;
    var rescueFocus = s.trapped && s.trapped.actor ? s.trapped : s.lifeNotice.reason === '队友掉队' && s.lifeNotice.remaining > 0 ? s.companions.filter(function (p) { return p.dropped; }).slice(-1)[0] : null;
    if (rescueFocus) { camera += Math.max(0, Math.min(8, rescueFocus.y - s.player.y)) / 2; }
    if (s.guidance) {
      var guideY = s.guidance.index === null ? s.player.y : s.guidance.y;
      var guideCenter = view.height - 220 + (guideY - camera) * tile;
      var guideMin = hudHeight + tile / 2 + 4 / ratio, guideMax = view.height - 60 / ratio - tile / 2 - 4 / ratio;
      camera += (guideCenter - Math.max(guideMin, Math.min(guideMax, guideCenter))) / tile;
    }
    function x(v) { return left + (v + 0.5) * tile; }
    // 将队伍锚定在视窗下半部，4:3 视窗中也完整保留身后的三名队友。
    function y(v) { return view.height - 220 + (v - camera) * tile; }
    ctx.fillStyle = green; ctx.fillRect(0, 0, view.width, view.height);
    var visible = game.observe(s);
    visible.forEach(function (cell) {
      var px = x(cell.x), py = y(cell.y);
      if (py < 55 - tile || py > view.height + tile) { return; }
      ctx.fillStyle = cell.visible ? ochre : '#687064'; ctx.fillRect(px - tile / 2, py - tile / 2, tile - 1, tile - 1);
      if (!cell.visible) {
        ctx.strokeStyle = '#7e8478'; line(ctx, px - 14, py, 26, -4); line(ctx, px - 8, py + 9, 20, -3); return;
      }
      game.drawClue(ctx, cell.clue, px, py);
      if (cell.safety) {
        ctx.fillStyle = paper; ctx.fillRect(px - 19, py + 10, (view.compactHUD ? 16 : 28) / ratio, 16 / ratio); ctx.fillStyle = cell.safety === 'hazard' ? '#B3261E' : green;
        XZ.engine.hud.text(ctx, 'label', cell.safety === 'hazard' ? (view.compactHUD ? '险' : '危险') : (view.compactHUD ? '安' : '安全'), px - 17, py + 22 / ratio, view, {color: ctx.fillStyle});
      }
    });
    s.chests.forEach(function (chest) {
      if (!visible[chest.index].visible) { return; }
      var px = x(chest.x), py = y(chest.y); ctx.globalAlpha = chest.opened ? 0.35 : 1;
      ctx.fillStyle = paper; ctx.fillRect(px - 10, py - 10, 20, 17); ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.strokeRect(px - 10, py - 10, 20, 17);
      ctx.fillStyle = ink; ctx.fillRect(px - 2, py - 6, 4, 6); XZ.engine.hud.text(ctx, 'label', '?', px - 3, py - 13, view, {color: ctx.fillStyle});
    }); ctx.globalAlpha = 1;
    var signY = y(0), exitWidth = tile * s.map.size;
    if (signY + tile / 2 >= hudHeight) {
      ctx.fillStyle = paper; ctx.fillRect(left, signY - tile / 2, exitWidth, tile);
      ctx.strokeStyle = '#B3261E'; ctx.lineWidth = 2 / ratio; ctx.strokeRect(left, signY - tile / 2, exitWidth, tile);
    }
    var actors = [s.player].concat(s.companions), blend = 1 - s.tween / s.config.tweenSeconds.value;
    // 队列沿真实脚印回放；领队陷入时停在隐患格，身后队友停下救援。
    [3, 2, 1, 0].forEach(function (i) {
      var at = actors[i], previous = s.previousActors[i], px = x(previous.x + (at.x - previous.x) * blend), py = y(previous.y + (at.y - previous.y) * blend);
      if (s.trapped && i === s.trapped.actor) {
        px = x(s.trapped.x); py = y(s.trapped.y); ctx.fillStyle = blue; ctx.beginPath(); ctx.ellipse(px, py + 6, 17, 8, 0, 0, Math.PI * 2); ctx.fill();
      }
      person(ctx, px, py, s.player.facing, i ? 15 : 20, at.dropped);
      if (at.dropped) { ctx.fillStyle = paper; XZ.engine.hud.text(ctx, 'label', '掉队', px - 12, py - 19, view, {color: ctx.fillStyle}); }
      if (s.trapped && i === s.trapped.actor) {
        var t = s.trapped;
        ctx.strokeStyle = paper; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(px, py - 26 / ratio, 13 / ratio, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#B3261E'; ctx.beginPath(); ctx.arc(px, py - 26 / ratio, 13 / ratio, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t.remaining / t.duration); ctx.stroke();
        ctx.fillStyle = paper; XZ.engine.hud.text(ctx, 'label', Math.ceil(t.remaining), px - 4 / ratio, py - 22 / ratio, view, {color: ctx.fillStyle});
      }
      if (i === 0) { ctx.strokeStyle = paper; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py + 3, 18, 0, Math.PI * 2); ctx.stroke(); }
    });
    if (s.weather) {
      ctx.strokeStyle = paper; ctx.fillStyle = paper; ctx.lineWidth = 1;
      for (var w = 0; w < 35; w += 1) {
        var wx = (w * 79 + s.elapsed * 45) % view.width, wy = (w * 53 + s.elapsed * 110) % view.height;
        if (s.weather.kind === '冰雹') { ctx.fillRect(wx, wy, 3, 3); } else { line(ctx, wx, wy, -4, 9); }
      }
    }
    if (s.night) {
      ctx.fillStyle = 'rgba(15,25,34,.38)'; ctx.fillRect(0, 55, view.width, view.height - 55);
      ctx.fillStyle = paper; for (var star = 0; star < 14; star += 1) { ctx.fillRect((star * 89 + 11) % view.width, 68 + (star * 19) % 40, 2, 2); }
    }
    if (s.guidance && !s.over) {
      var g = s.guidance, labels = {up: '↑', down: '↓', left: '←', right: '→'};
      if (g.index !== null) {
        var gx = x(g.x), gy = y(g.y);
        ctx.fillStyle = paper; ctx.fillRect(gx - tile / 2 + 1, gy - tile / 2 + 1, tile - 2, tile - 2);
        ctx.strokeStyle = green; ctx.lineWidth = 3 / ratio; ctx.strokeRect(gx - tile / 2 + 2, gy - tile / 2 + 2, tile - 4, tile - 4);
        XZ.engine.hud.text(ctx, 'value', labels[g.direction], gx - 8 / ratio, gy + 6 / ratio, view, {color: green});
      }
      var pad = 8 / ratio, bannerHeight = 52 / ratio, bannerY = view.height - bannerHeight - pad;
      ctx.fillStyle = paper; ctx.fillRect(pad, bannerY, view.width - pad * 2, bannerHeight);
      ctx.strokeStyle = '#B3261E'; ctx.lineWidth = 2 / ratio; ctx.strokeRect(pad, bannerY, view.width - pad * 2, bannerHeight);
      XZ.engine.hud.text(ctx, 'hint', g.kind === 'rescue' ? '队友陷入 · 跟随指引救援' : '队友掉队 · 扣 1 条生命', pad * 2, bannerY + 20 / ratio, view, {width: view.width - pad * 4, color: '#B3261E'});
      var nextText = g.index === null ? '已靠近队友 · 按住救援' : '下一步：' + labels[g.direction] + ' 到安全箭头格';
      XZ.engine.hud.text(ctx, 'hint', nextText, pad * 2, bannerY + 42 / ratio, view, {width: view.width - pad * 4, color: ink});
    }
    var labelTop = signY - tile / 2 - 22 / ratio;
    if (labelTop >= hudHeight - 0.01) {
      ctx.fillStyle = paper; ctx.fillRect(left, labelTop, exitWidth, 22 / ratio);
      XZ.engine.hud.text(ctx, 'hint', '↑ 北侧出口 · 任一格通关', left + 8 / ratio, labelTop + 17 / ratio, view, {color: '#B3261E', width: exitWidth - 16 / ratio});
    }
    XZ.engine.hud.grid(ctx, s, view);
    ctx.restore();
  };
}());

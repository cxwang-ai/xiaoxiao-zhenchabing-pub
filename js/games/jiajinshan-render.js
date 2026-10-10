(function () {
  'use strict';
  var XZ = window.XZ, game = XZ.games.jiajinshan;
  var paper = '#F3E9D2', ink = '#1F1A17', red = '#B3261E', ochre = '#C9A66B', blue = '#5B6B73';
  // 两层远山仅首次预绘；绘制缓存不进入纯逻辑状态和种子回放。
  var layers = null;
  function mountainLayer(color, offset, caps) {
    var canvas = document.createElement('canvas'); canvas.width = 960; canvas.height = 270;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, 270);
    for (var x = 0; x <= 960; x += 80) { ctx.lineTo(x, 105 + offset + (x / 80 % 3) * 30); }
    ctx.lineTo(960, 270); ctx.fill();
    if (caps) {
      ctx.fillStyle = paper;
      for (var peak = 0; peak < 960; peak += 240) {
        ctx.beginPath(); ctx.moveTo(peak, 105 + offset); ctx.lineTo(peak + 72, 132 + offset);
        ctx.lineTo(peak + 52, 146 + offset); ctx.lineTo(peak + 24, 139 + offset); ctx.lineTo(peak - 16, 155 + offset); ctx.fill();
      }
    }
    ctx.strokeStyle = paper; ctx.lineWidth = 2;
    for (x = 0; x < 960; x += 240) {
      ctx.beginPath(); ctx.moveTo(x, 105 + offset); ctx.lineTo(x + 18, 137 + offset); ctx.lineTo(x + 7, 147 + offset);
      ctx.moveTo(x + 12, 128 + offset); ctx.lineTo(x + 60, 163 + offset); ctx.stroke();
    }
    return canvas;
  }
  function sign(ctx, text, x, y, complete, view) {
    ctx.fillStyle = ink; ctx.fillRect(x, y - 54, 4, 54);
    ctx.fillStyle = complete ? red : ochre; ctx.fillRect(x - 18, y - 61, Math.max(76, (text.length * 12 + 12) * view.width / (view.cssWidth || view.width)), 24 * view.width / (view.cssWidth || view.width));
    ctx.strokeStyle = ink; ctx.strokeRect(x - 18, y - 61, Math.max(76, (text.length * 12 + 12) * view.width / (view.cssWidth || view.width)), 24 * view.width / (view.cssWidth || view.width));
    ctx.fillStyle = complete ? paper : ink; XZ.engine.hud.text(ctx, 'label', text, x - 12, y - 61 + 16 * view.width / (view.cssWidth || view.width), view, {color: ctx.fillStyle});
  }
  game.render = function (ctx, s, view) {
    // 每帧隔离绘制属性；刻痕线宽、透明度等不能从上一帧泄漏。
    ctx.save();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth = 1; ctx.setLineDash([]);
    ctx.clearRect(0, 0, view.width, view.height);
    if (!layers) { layers = [mountainLayer(ochre, -25), mountainLayer(blue, 8), mountainLayer(paper, 8, true)]; }
    var p = s.player, c = s.config;
    var cameraX = Math.max(0, Math.min(c.worldWidth.value - view.width, p.x - view.width / 3));
    // 随山坡爬升而移动，跳跃时保留人物在画面中的上下运动。
    var cameraY = game.groundAt(s, p.x) - Math.max(207, view.height - 63);
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (s.avalanche.active && !reduced) { cameraY += Math.sin(s.elapsed * 31) * c.shake.value; }
    ctx.fillStyle = paper; ctx.fillRect(0, 0, view.width, view.height);
    for (var layer = 0; layer < 2; layer += 1) {
      var shift = cameraX * (layer ? 0.18 : 0.07) % 960;
      ctx.globalAlpha = layer ? 0.8 : 0.6;
      ctx.drawImage(layers[layer], -shift, -cameraY * (layer ? 0.14 : 0.05));
      ctx.drawImage(layers[layer], 960 - shift, -cameraY * (layer ? 0.14 : 0.05));
    }
    var snowLine = Math.max(0, Math.min(1, (s.hud.altitude - s.baseAltitude) / (s.summitAltitude - s.baseAltitude || 1)));
    var snowyShift = cameraX * 0.18 % 960;
    ctx.globalAlpha = 0.08 + snowLine * 0.75;
    ctx.drawImage(layers[2], -snowyShift, -cameraY * 0.14);
    ctx.drawImage(layers[2], 960 - snowyShift, -cameraY * 0.14);
    ctx.globalAlpha = 1; ctx.save(); ctx.translate(-cameraX, -cameraY);
    // 仅画可见平台、道具和刻痕，工作量与整个关卡长度无关。
    for (var i = 0; i < s.platforms.length; i += 1) {
      var floor = s.platforms[i]; if (floor.collapsed || floor.x > cameraX + view.width || floor.x + floor.w < cameraX) { continue; }
      var rightY = game.topAt(floor, floor.x + floor.w), bottom = cameraY + view.height + 10;
      ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(floor.x, floor.y); ctx.lineTo(floor.x + floor.w + 0.5, rightY);
      ctx.lineTo(floor.x + floor.w + 0.5, bottom); ctx.lineTo(floor.x, bottom); ctx.fill();
      ctx.strokeStyle = floor.ice ? blue : paper; ctx.lineWidth = floor.ice ? 7 : 5;
      ctx.beginPath(); ctx.moveTo(floor.x, floor.y + 2); ctx.lineTo(floor.x + floor.w, rightY + 2); ctx.stroke();
      ctx.strokeStyle = floor.ice ? paper : ochre; ctx.lineWidth = 1; ctx.beginPath();
      for (var hatch = Math.max(floor.x, Math.floor(cameraX / 18) * 18); hatch < Math.min(floor.x + floor.w, cameraX + view.width); hatch += 18) {
        var hatchY = game.topAt(floor, hatch);
        ctx.moveTo(hatch, hatchY + 12); ctx.lineTo(hatch + 9, hatchY + 22); ctx.moveTo(hatch + 3, hatchY + 32); ctx.lineTo(hatch + 12, hatchY + 38);
      }
      ctx.stroke();
      if (floor.thin) {
        ctx.strokeStyle = floor.cracked ? red : blue; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(floor.x, floor.y - 4); ctx.lineTo(floor.x + floor.w, rightY - 4); ctx.stroke();
        ctx.fillStyle = red; XZ.engine.hud.text(ctx, 'label', floor.cracked ? '裂！' : '薄冰', floor.x, floor.y - 10, view, {color: ctx.fillStyle});
        if (floor.cracked) { ctx.beginPath(); ctx.moveTo(floor.x+4,floor.y);ctx.lineTo(floor.x+12,floor.y+10);ctx.lineTo(floor.x+7,floor.y+18);ctx.stroke(); }
      }
    }
    if (s.avalanche.active) {
      var ax = s.avalanche.x;
      ctx.fillStyle = blue; ctx.beginPath(); ctx.moveTo(ax, cameraY+85); ctx.lineTo(ax+18,cameraY+155);
      ctx.lineTo(ax,cameraY+view.height);ctx.lineTo(cameraX,cameraY+view.height);ctx.lineTo(cameraX,cameraY+85);ctx.fill();
      ctx.strokeStyle = paper;ctx.lineWidth = 5;ctx.beginPath();ctx.moveTo(ax-24,cameraY+115);ctx.lineTo(ax+5,cameraY+175);ctx.stroke();
    }
    for (i = 0; i < s.obstacles.length; i += 1) {
      var b = s.obstacles[i]; if (b.x > cameraX + view.width || b.x + b.w < cameraX) { continue; }
      ctx.fillStyle = blue; ctx.beginPath(); ctx.moveTo(b.x, b.y + b.h); ctx.lineTo(b.x + 4, b.y + 4);
      ctx.lineTo(b.x + b.w - 5, b.y); ctx.lineTo(b.x + b.w, b.y + b.h); ctx.fill();
      ctx.strokeStyle = paper; ctx.beginPath(); ctx.moveTo(b.x + 5, b.y + 5); ctx.lineTo(b.x + b.w - 5, b.y + 2); ctx.stroke();
    }
    for (i = 0; i < s.pickups.length; i += 1) {
      var item = s.pickups[i]; if (item.collected || item.x < cameraX - 22 || item.x > cameraX + view.width) { continue; }
      ctx.strokeStyle = ink; ctx.lineWidth = 2;
      ctx.fillStyle = item.kind === 'chili' ? red : ochre;
      if (item.kind === 'chili') {
        ctx.beginPath(); ctx.moveTo(item.x + 16, item.y + 3);
        ctx.bezierCurveTo(item.x + 28, item.y + 17, item.x + 9, item.y + 26, item.x, item.y + 22);
        ctx.bezierCurveTo(item.x + 12, item.y + 19, item.x + 9, item.y + 10, item.x + 16, item.y + 3); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(item.x + 16, item.y + 3); ctx.lineTo(item.x + 12, item.y - 4); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(item.x + 5, item.y + 2); ctx.lineTo(item.x + 17, item.y + 2);
        ctx.lineTo(item.x + 22, item.y + 18); ctx.lineTo(item.x + 18, item.y + 23);
        ctx.lineTo(item.x + 2, item.y + 23); ctx.lineTo(item.x, item.y + 18); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(item.x + 2, item.y + 7); ctx.lineTo(item.x + 20, item.y + 7); ctx.stroke();
      }
      ctx.fillStyle = ink; XZ.engine.hud.text(ctx, 'label', item.kind === 'chili' ? '干辣椒' : '干粮', item.x - 4, item.y - 5, view, {color: ctx.fillStyle});
    }
    for (i = 0; i < s.chests.length; i += 1) {
      var chest = s.chests[i]; if (chest.x < cameraX - 22 || chest.x > cameraX + view.width) { continue; }
      ctx.globalAlpha = chest.opened ? 0.4 : 1; ctx.fillStyle = ochre; ctx.fillRect(chest.x, chest.y, chest.w, chest.h);
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.strokeRect(chest.x, chest.y, chest.w, chest.h);
      ctx.fillStyle = ink; ctx.fillRect(chest.x + 9, chest.y + 7, 4, 8); XZ.engine.hud.text(ctx, 'label', chest.opened ? '已开' : '?', chest.x + 6, chest.y - 4, view, {color: ctx.fillStyle});
    }
    ctx.globalAlpha = 1;
    for (i = 0; i < s.checkpoints.length; i += 1) {
      var cp = s.checkpoints[i]; if (cp.x < cameraX - 60 || cp.x > cameraX + view.width) { continue; }
      sign(ctx, cp.label || Math.round(cp.altitude) + ' m', cp.x, cp.y + p.h, cp.visited, view);
    }
    var finish = c.finishX.value;
    if (finish < cameraX + view.width + 60) { sign(ctx, XZ.data.levels[1].destination.value, finish, game.surfaceAt(s, finish), false, view); }
    // 头部无五官；三种腿部姿态与背包形成木刻剪影。
    ctx.save(); ctx.translate(p.x + p.w / 2, p.y); ctx.scale(p.facing, 1); ctx.fillStyle = ink;
    ctx.beginPath(); ctx.arc(0, 6, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-6, 10, 12, 14); ctx.fillRect(-10, 12, 6, 12);
    var stride = !p.grounded ? 6 : Math.abs(p.vx) > 10 ? (Math.floor(s.elapsed * 9) % 2 ? 4 : -4) : 0;
    ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-3, 23); ctx.lineTo(-4 - stride, 31);
    ctx.moveTo(3, 23); ctx.lineTo(4 + stride, p.grounded ? 31 : 27); ctx.moveTo(5, 14); ctx.lineTo(10, p.grounded ? 24 : 11); ctx.stroke(); ctx.restore();
    ctx.fillStyle = paper;
    for (i = 0; i < s.weather.hail.length; i += 1) { var hail = s.weather.hail[i]; if (hail.active) { ctx.fillRect(hail.x, hail.y, hail.w, hail.h); } }
    ctx.restore();
    // 雪墙采用世界坐标投影；尚未入镜时左边缘仍有随距离增强的警示。
    if (s.avalanche.active) {
      var front = s.avalanche.x - cameraX, distance = Math.max(0, p.x - s.avalanche.x);
      var urgency = Math.max(0.15, 1 - distance / c.avalancheVisibleRange.value);
      ctx.fillStyle = red; ctx.globalAlpha = urgency;
      ctx.fillRect(0, 70, 4 + urgency * 10, view.height - 70); ctx.globalAlpha = 1;
      if (front > 0) {
        ctx.fillStyle = '#FFF9EB'; ctx.beginPath(); ctx.moveTo(0,70);
        for (var wallY = 70; wallY < view.height + 20; wallY += 18) {
          ctx.lineTo(front + Math.sin(wallY * 0.17 + s.elapsed * 2) * 9, wallY);
        }
        ctx.lineTo(0,view.height); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = blue; ctx.lineWidth = 2; ctx.beginPath();
        for (var cutY = 84; cutY < view.height; cutY += 15) {
          ctx.moveTo(Math.max(3,front-58),cutY);ctx.lineTo(front-12,cutY-9);
          ctx.moveTo(Math.max(3,front-85),cutY+5);ctx.lineTo(front-36,cutY-1);
        } ctx.stroke();
        ctx.globalAlpha = 0.35;ctx.fillStyle = paper;
        ctx.fillRect(front,74,14,view.height-74);ctx.globalAlpha = 1;
      }
    }
    // 定量粒子无对象分配；雪片稍遮视野，不遮住脚下轮廓。
    ctx.strokeStyle = paper; ctx.lineWidth = 1.5; ctx.globalAlpha = s.weather.snow;
    ctx.beginPath();
    for (i = 0; i < 32; i += 1) {
      var sx = ((i * 73 + s.elapsed * 18 * s.weather.direction - cameraX * 0.3) % view.width + view.width) % view.width;
      var sy = (i * 47 + s.elapsed * (26 + i % 4 * 9)) % view.height; ctx.moveTo(sx, sy); ctx.lineTo(sx - 3, sy + 5);
    }
    ctx.stroke(); ctx.globalAlpha = 1;
    if (s.exhausted) {
      ctx.fillStyle = 'rgba(31,26,23,0.13)'; ctx.fillRect(0, 70, 10, view.height - 70); ctx.fillRect(view.width - 10, 70, 10, view.height - 70);
    }
    XZ.engine.hud.grid(ctx, s, view);
    ctx.restore();
  };
}());

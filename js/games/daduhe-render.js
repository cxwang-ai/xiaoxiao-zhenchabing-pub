(function () {
  'use strict';
  var XZ = window.XZ, game = XZ.games.daduhe;
  var paper = '#F3E9D2', ink = '#1F1A17', blue = '#5B6B73', ochre = '#C9A66B', red = '#B3261E';
  function line(ctx, x, y, dx, dy) { ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+dx,y+dy); ctx.stroke(); }
  game.render = function (ctx, s, view) {
    // 每帧隔离绘制属性；刻痕线宽、透明度等不能从上一帧泄漏。
    ctx.save();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth = 1; ctx.setLineDash([]);
    ctx.clearRect(0, 0, view.width, view.height);
    // 留出共用 HUD 的实际高度，再投影河带；只改变绘图坐标，不改变河宽/航行积分。
    var grid = XZ.engine.hud.layout(s, view), ratio = grid.ratio;
    var bottom = view.height - 30, top = grid.height + 12 + 24 / ratio;
    var depth = bottom - top;
    var sx = 260 / s.width, sy = depth / s.width;
    function x(v) { return 230 + v * sx; }
    function y(v) { return bottom - v * sy; }
    ctx.fillStyle = paper; ctx.fillRect(0, 0, view.width, view.height);
    // 有木刻岸纹的登陆岸接住 HUD，去掉原先任意河深留下的纸色空带。
    ctx.fillStyle = ochre; ctx.fillRect(0, grid.height, view.width, top - grid.height);
    ctx.fillStyle = blue; ctx.fillRect(0, top, view.width, depth);
    // 灰蓝色河带与白色刻痕；河心线条更长、流动更快，不使用非确定性动画。
    ctx.strokeStyle = paper; ctx.lineWidth = 1;
    for (var row = 1; row < 13; row += 1) {
      var u = row / 13, flow = game.currentAt(s, u * s.width);
      for (var col = 0; col < 10; col += 1) {
        var wx = (col * 61 + row * 23 + s.elapsed * flow * 7) % (view.width + 50) - 25;
        var wy = y(u * s.width);
        line(ctx, wx, wy, 6 + flow * 3, -2); line(ctx, wx + 4, wy + 4, 4 + flow, -1);
      }
    }
    // 两岸山崖、锯齿木刻刀痕与空白登陆岸。
    [top, bottom].forEach(function (bank, index) {
      ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(0, bank);
      for (var i = 0; i <= 480; i += 24) { ctx.lineTo(i, bank + (index ? 1 : -1) * (i % 48 ? 8 : 2)); }
      ctx.lineTo(480, index ? bottom + 25 : top - 24); ctx.lineTo(0, index ? bottom + 25 : top - 24); ctx.fill();
      ctx.strokeStyle = ochre;
      for (i = 10; i < 480; i += 27) { line(ctx, i, bank + (index ? 14 : -14), 13, index ? 4 : -4); }
    });
    var landLeft = x(s.landing.min), landRight = x(s.landing.max);
    ctx.fillStyle = ochre; ctx.fillRect(landLeft, top - 12, landRight - landLeft, 17);
    ctx.strokeStyle = ink; ctx.lineWidth = 2;
    for (var plank = landLeft; plank < landRight; plank += 14) { line(ctx, plank, top-12, 0, 17); }
    // 木牌完整放在 HUD 与码头之间，底边高于木板顶边。
    var signY = grid.height + 2 / ratio;
    ctx.fillStyle = ink; ctx.fillRect(landLeft + 4, signY + 18 / ratio, 3, top - 12 - signY - 18 / ratio);
    ctx.fillStyle = paper; ctx.fillRect(landLeft - 2, signY, 48 / ratio, 18 / ratio);
    ctx.strokeStyle = ink; ctx.strokeRect(landLeft - 2, signY, 48 / ratio, 18 / ratio);
    ctx.fillStyle = ink; XZ.engine.hud.text(ctx, 'label', '登陆点', landLeft - 2 + 6 / ratio, signY + 13 / ratio, view, {color: ctx.fillStyle});
    ctx.strokeStyle = red; ctx.setLineDash([4, 4]); line(ctx,landRight,top,0,depth); ctx.setLineDash([]);
    s.vortices.forEach(function (v) {
      ctx.strokeStyle = paper; ctx.lineWidth = 1.5;
      for (var ring = 1; ring <= 3; ring += 1) {
        ctx.beginPath(); ctx.arc(x(v.x), y(v.y), ring * 5, s.elapsed * 0.8 + ring, s.elapsed * 0.8 + ring + 5); ctx.stroke();
      }
    });
    s.rocks.forEach(function (r) {
      var rx = x(r.x), ry = y(r.y), radius = Math.max(6,r.r*sx);
      ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(rx-radius,ry+radius/2); ctx.lineTo(rx-radius/3,ry-radius);
      ctx.lineTo(rx+radius/2,ry-radius*.7); ctx.lineTo(rx+radius,ry+radius/2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = paper; line(ctx,rx-radius/3,ry-radius*.6,radius*.7,2);
    });
    s.logs.forEach(function (l) {
      ctx.save(); ctx.translate(x(l.x),y(l.y)); ctx.rotate(-0.15); ctx.fillStyle = ochre; ctx.fillRect(-10,-3,20,6);
      ctx.strokeStyle = ink; ctx.strokeRect(-10,-3,20,6); line(ctx,-7,0,14,0); ctx.restore();
    });
    s.chests.forEach(function (chest) {
      ctx.globalAlpha = chest.opened ? 0.35 : 1; var cx = x(chest.x), cy = y(chest.y);
      ctx.fillStyle = ochre; ctx.fillRect(cx-7,cy-6,14,12); ctx.strokeStyle = ink; ctx.strokeRect(cx-7,cy-6,14,12);
      ctx.fillStyle = ink; ctx.fillRect(cx-1,cy-3,3,5); XZ.engine.hud.text(ctx, 'label', chest.opened ? '已开' : '?',cx-5,cy-9, view, {color: ctx.fillStyle});
    }); ctx.globalAlpha = 1;
    // 木刻点线：由同一个流速与冲量积分器生成，末端圈标出预计落点。
    var route = game.predictRoute(s);
    ctx.strokeStyle = route.safe ? ochre : red; ctx.lineWidth = 2.5; ctx.setLineDash([2, 5]);
    ctx.beginPath(); route.points.forEach(function (point, i) { if (i) { ctx.lineTo(x(point.x), y(point.y)); } else { ctx.moveTo(x(point.x), y(point.y)); } }); ctx.stroke();
    ctx.setLineDash([]); ctx.beginPath(); ctx.arc(x(route.x), y(route.y), 5, 0, Math.PI * 2); ctx.stroke();
    var p = s.player, px = x(p.x), py = y(p.y);
    ctx.save(); ctx.translate(px,py); ctx.rotate(p.heading);
    ctx.globalAlpha = s.invulnerable > 0 && Math.floor(s.elapsed*10)%2 ? 0.45 : 1;
    // 船内剪影按每趟虚构队员人数绘制，头部均无五官。
    ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(0,-23); ctx.bezierCurveTo(15,-12,16,15,0,24);
    ctx.bezierCurveTo(-16,15,-15,-12,0,-23); ctx.fill();
    ctx.fillStyle = ochre;ctx.fillRect(-8,-13,16,29);
    for (var person = 0; person < s.config.peoplePerTrip.value; person += 1) {
      var crewX = person % 2 ? 4 : -4, crewY = Math.floor(person/2)*14-7;
      ctx.fillStyle = ink;ctx.beginPath();ctx.arc(crewX,crewY,2.8,0,Math.PI*2);ctx.fill();
      ctx.fillRect(crewX-2.5,crewY+3,5,6);
    }
    var stroke = Math.max(0,1-s.strokeAge/.35)*10;
    ctx.strokeStyle = s.strokeAge < .2 ? red : ink; ctx.lineWidth = 2;
    line(ctx,-2,0,-18,stroke+6);line(ctx,2,3,18,-stroke+6);ctx.restore();
    // 合成速度箭头经过同一投影；屏幕 y 翻转，便于看出实际漂流方向。
    var dx = p.vx * sx, dy = -p.vy * sy, length = Math.hypot(dx,dy) || 1;
    dx = dx/length*23; dy = dy/length*23; ctx.strokeStyle = ochre; ctx.lineWidth = 2;
    line(ctx,px+14,py,dx,dy); var a = Math.atan2(dy,dx);
    line(ctx,px+14+dx,py+dy,-7*Math.cos(a-.5),-7*Math.sin(a-.5));
    line(ctx,px+14+dx,py+dy,-7*Math.cos(a+.5),-7*Math.sin(a+.5));
    XZ.engine.hud.grid(ctx, s, view);
    ctx.restore();
  };
}());

(function () {
  'use strict';
  var XZ = window.XZ;
  var NS = 'http://www.w3.org/2000/svg'; // SVG 命名空间标识，不会发出网络请求。
  var serial = 0;
  function svgNode(tag, attributes, text) {
    var node = document.createElementNS(NS, tag);
    Object.keys(attributes || {}).forEach(function (key) { node.setAttribute(key, attributes[key]); });
    if (text !== undefined) { node.textContent = text; }
    return node;
  }
  function draw(options) {
    var points = (options.points || []).filter(function (point) { return Number.isFinite(point.x) && Number.isFinite(point.y); });
    var svg = svgNode('svg', { viewBox: '0 0 560 260', width: '100%', role: 'img', class: 'chart-svg', preserveAspectRatio: 'xMidYMid meet' });
    var id = 'chart-title-' + (++serial);
    svg.setAttribute('aria-labelledby', id);
    svg.setAttribute('aria-describedby', id + '-desc');
    svg.appendChild(svgNode('title', { id: id }, options.title || '数据图表'));
    var description = options.description || (options.yLabel || '数值') + '随' + (options.xLabel || '横轴') + '变化。';
    if (options.marker) { description += '当前横轴 ' + options.marker.x + '，纵轴 ' + XZ.rules.round(options.marker.y) + '。'; }
    svg.appendChild(svgNode('desc', { id: id + '-desc' }, description));
    if (!points.length) { svg.appendChild(svgNode('text', { x: 280, y: 130, 'text-anchor': 'middle' }, '数据待填写')); return svg; }
    var left = 66, right = options.secondaryPoints ? 480 : 532, top = 25, bottom = 208;
    var xMin = options.xMin === undefined ? Math.min.apply(null, points.map(function (p) { return p.x; })) : options.xMin;
    var xMax = options.xMax === undefined ? Math.max.apply(null, points.map(function (p) { return p.x; })) : options.xMax;
    var yMin = options.yMin === undefined ? Math.min.apply(null, points.map(function (p) { return p.y; })) : options.yMin;
    var yMax = options.yMax === undefined ? Math.max.apply(null, points.map(function (p) { return p.y; })) : options.yMax;
    function px(x) { return left + (x - xMin) / (xMax - xMin || 1) * (right - left); }
    function py(y) { return bottom - (y - yMin) / (yMax - yMin || 1) * (bottom - top); }
    // 刻度与坐标只负责排版，科学数据由调用者传入。
    for (var tick = 0; tick <= 4; tick += 1) {
      var fraction = tick / 4;
      var y = bottom - fraction * (bottom - top);
      svg.appendChild(svgNode('line', { x1: left, x2: right, y1: y, y2: y, class: 'chart-grid' }));
      svg.appendChild(svgNode('text', { x: left - 10, y: y + 5, 'text-anchor': 'end', class: 'chart-label' }, String(Math.round((yMin + fraction * (yMax - yMin)) * 10) / 10)));
      var x = left + fraction * (right - left);
      svg.appendChild(svgNode('text', { x: x, y: bottom + 22, 'text-anchor': 'middle', class: 'chart-label' }, options.hideXValues ? '' : String(Math.round((xMin + fraction * (xMax - xMin)) * 10) / 10)));
    }
    if (options.secondaryPoints) {
      var extra = options.secondaryPoints, min = options.secondaryMin, max = options.secondaryMax;
      function sy(value) { return bottom - (value - min) / (max - min || 1) * (bottom - top); }
      for (var ot = 0; ot <= 4; ot += 1) {
        svg.appendChild(svgNode('text', { x: right + 12, y: bottom - ot / 4 * (bottom - top) + 5, class: 'chart-label' }, String(min + ot / 4 * (max - min))));
      }
      svg.appendChild(svgNode('text', { x: right, y: 16, 'text-anchor': 'end', class: 'chart-label' }, options.secondaryLabel));
      svg.appendChild(svgNode('path', { d: extra.map(function (p, i) { return (i ? 'L' : 'M') + px(p.x) + ',' + sy(p.y); }).join(' '), class: 'chart-line chart-secondary' }));
      if (options.marker) { svg.appendChild(svgNode('circle', { cx: px(options.marker.x), cy: sy(options.marker.secondaryY), r: 6, class: 'chart-secondary-marker' })); }
    }
    var path = points.map(function (point, index) { return (index ? 'L' : 'M') + px(point.x) + ',' + py(point.y); }).join(' ');
    svg.appendChild(svgNode('path', { d: path, class: 'chart-line' }));
    if (options.marker && Number.isFinite(options.marker.x) && Number.isFinite(options.marker.y)) {
      var marker = options.marker;
      svg.appendChild(svgNode('line', { x1: px(marker.x), x2: px(marker.x), y1: top, y2: bottom, class: 'chart-marker-line' }));
      svg.appendChild(svgNode('circle', { cx: px(marker.x), cy: py(marker.y), r: 6, class: 'chart-marker' }));
    }
    svg.appendChild(svgNode('text', { x: left, y: 16, class: 'chart-label' }, options.yLabel || ''));
    if (options.notice) { svg.appendChild(svgNode('text', { x: right, y: 16, 'text-anchor': 'end', class: 'chart-label demo-label' }, options.notice)); }
    svg.appendChild(svgNode('text', { x: (left + right) / 2, y: 253, 'text-anchor': 'middle', class: 'chart-label' }, options.xLabel || ''));
    return svg;
  }
  XZ.charts = {
    svgNode: svgNode,
    line: draw
  };
}());

(function () {
  'use strict';
  var XZ = window.XZ;
  var labels = { pending: '待核实', model: '简化模型', param: '游戏参数', verified: '已核实' };

  // 统一用 textContent 写文字，数据文件填写内容时不会被当作 HTML 执行。
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text !== undefined && text !== null) { node.textContent = text; }
    return node;
  }
  function badge(status) { return el('span', 'badge badge-' + (labels[status] ? status : 'pending'), labels[status] || labels.pending); }
  function source(data) { return el('p', 'source', '出处：' + (data.source || (data.status === 'param' ? '本游戏设计，非实测资料' : '待补充'))); }
  function datum(data, options) {
    options = options || {};
    var row = el('div', 'datum'); row.dataset.status = data.status; row.title = labels[data.status] || labels.pending;
    row.appendChild(el('span', 'datum-label', data.label));
    var value = data.value === null || data.value === undefined ? '待填写' : String(data.value) + (data.unit ? ' ' + data.unit : '');
    row.appendChild(el('strong', 'datum-value', value));
    row.appendChild(badge(data.status));
    if (options.source !== false) { row.appendChild(source(data)); }
    return row;
  }
  function button(text, action, options) {
    options = options || {};
    var node = el('button', 'button ' + (options.secondary ? 'button-secondary' : '') + (options.className ? ' ' + options.className : ''), text);
    node.type = 'button';
    node.disabled = Boolean(options.disabled);
    if (action) { node.addEventListener('click', action); }
    return node;
  }
  function card(title, content, options) {
    var node = el('section', 'card ' + ((options && options.className) || ''));
    if (title) { node.appendChild(el('h2', 'card-title', title)); }
    if (typeof content === 'string') { node.appendChild(el('p', '', content)); }
    else if (content) { node.appendChild(content); }
    // 每张卡片仅保留一枚同状态标签；数据行仍用颜色与 title 说明归属。
    var seen = {}, legend = el('div', 'card-status');
    Array.prototype.forEach.call(node.querySelectorAll('.badge'), function (mark) {
      var status = Object.keys(labels).find(function (key) { return mark.classList.contains('badge-' + key); }) || 'pending';
      var parent = mark.parentNode;
      if (!parent.dataset.status) { parent.dataset.status = status; }
      parent.title = (parent.title ? parent.title + '；' : '') + labels[status];
      if (!seen[status]) { seen[status] = true; legend.appendChild(badge(status)); }
      parent.removeChild(mark);
    });
    if (legend.children.length) { node.insertBefore(legend, node.children[1] || null); }
    return node;
  }
  function heading(app, eyebrow, title, description) {
    var node = el('div', 'screen-heading');
    node.appendChild(el('p', 'eyebrow', eyebrow));
    var titleNode = el('h1', '', title); titleNode.id = 'screen-title'; titleNode.tabIndex = -1;
    node.appendChild(titleNode);
    if (description) { node.appendChild(el('p', 'lead', description)); }
    app.appendChild(node);
    return node;
  }
  function stars(value) {
    var node = el('span', 'stars', '★'.repeat(value) + '☆'.repeat(Math.max(0, XZ.data.game.starMax.value - value)));
    node.setAttribute('aria-label', value + ' 星，星级属于游戏参数');
    return node;
  }
  function resources(values) {
    var bar = el('div', 'resource-bar');
    var names = { energy: '体力', supplies: '物资', days: '天数' };
    Object.keys(names).forEach(function (key) {
      var item = el('div', 'resource-item');
      item.appendChild(el('span', 'resource-name', names[key]));
      item.appendChild(el('strong', 'resource-value', values[key] + (key === 'days' ? ' 天' : '')));
      if (key !== 'days') {
        var meter = el('span', 'resource-meter');
        meter.setAttribute('aria-hidden', 'true');
        var fill = el('span', 'resource-fill');
        fill.style.width = (values[key] / XZ.data.game.maxResource.value * 100) + '%';
        meter.appendChild(fill); item.appendChild(meter);
      }
      bar.appendChild(item);
    });
    bar.title = '资源与天数均为游戏参数'; bar.setAttribute('aria-label', '队伍资源，均为游戏参数');
    return bar;
  }
  function history(data) {
    var content = el('div', 'history-body');
    content.appendChild(badge(data.status));
    content.appendChild(el('blockquote', '', data.text));
    content.appendChild(source(data));
    return card(data.title, content, { className: 'history-card' });
  }

  function details(title, content) {
    var node = el('details', 'rule-details');
    node.appendChild(el('summary', '', title));
    if (typeof content === 'string') { node.appendChild(el('p', '', content)); }
    else if (content) { node.appendChild(content); }
    return node;
  }
  // 插图是原创艺术演绎，独立于关卡数据和科学模型。
  function illustration(level, className) {
    var artwork = {
      daduhe: ['daduhe.svg', '朱红木刻峡谷与激流，非真实地形，艺术演绎'],
      jiajinshan: ['snow-mountain.svg', '朱红木刻雪山与虚构侦察兵背影，非真实地形，艺术演绎'],
      caodi: ['caodi.svg', '朱红木刻草墩、水洼与远山，非真实地形，艺术演绎']
    }[level.id];
    var image = el('img', className); image.src = 'assets/img/' + artwork[0]; image.alt = artwork[1];
    image.width = 800; image.height = 480;
    return image;
  }

  XZ.ui = { el: el, badge: badge, datum: datum, source: source, button: button, card: card, heading: heading, stars: stars, resources: resources, history: history, details: details, illustration: illustration };
}());

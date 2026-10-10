(function () {
  'use strict';
  var XZ = window.XZ, ui = XZ.ui;
  ui.comic = function (level) {
    var comic = ui.el('section', 'comic'); comic.setAttribute('aria-label', '开场连环画');
    level.comic.forEach(function (panel, index) {
      var figure = ui.el('figure', 'comic-panel');
      figure.style.setProperty('--panel-index', index);
      var number = ui.el('span', 'comic-number', ['壹', '贰', '叁'][index] || String(index + 1));
      number.setAttribute('aria-label', '第 ' + (index + 1) + ' 格');
      figure.appendChild(number);
      var art;
      if (panel.art) {
        art = ui.el('img', 'comic-art');
        art.src = panel.art; art.alt = panel.alt || level.name + ' · 木刻艺术演绎';
        art.setAttribute('width', '480'); art.setAttribute('height', '270');
      } else { art = ui.illustration(level, 'comic-art'); }
      figure.appendChild(art);
      var caption = ui.el('figcaption');
      caption.appendChild(ui.el('p', 'comic-caption', panel.caption.value));
      caption.appendChild(ui.badge(panel.caption.status));
      var sources = ui.el('div'); sources.appendChild(ui.source(panel.caption));
      if (panel.field) {
        var reference = panel.field.split('.').reduce(function (value, key) { return value && value[key]; }, level);
        if (reference) { sources.appendChild(ui.datum(reference)); }
      }
      caption.appendChild(ui.details('出处', sources));
      figure.appendChild(caption); comic.appendChild(figure);
    });
    comic.appendChild(ui.el('p', 'muted', '木刻剪影为艺术演绎；旁白复述所列出处原文，点开“出处”可查看。'));
    return comic;
  };
}());

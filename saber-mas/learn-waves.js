// Onda que nace en una esquina de la grilla y choca con cada tarjeta al alcanzarla.
(function () {
  var grid = document.querySelector('.learn-grid');
  if (!grid || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var waves = grid.querySelector('.learn-waves');
  var cards = grid.querySelectorAll('.learn-card');
  var P = 7;
  var lay = function () {
    var g = grid.getBoundingClientRect();
    var ox = -30, oy = -30;
    var R = Math.hypot(g.width - ox, g.height - oy) + 40;
    grid.style.setProperty('--P', P + 's');
    waves.style.setProperty('--ox', ox + 'px');
    waves.style.setProperty('--oy', oy + 'px');
    waves.style.setProperty('--R', R + 'px');
    cards.forEach(function (c) {
      var r = c.getBoundingClientRect();
      var x = r.left - g.left, y = r.top - g.top;
      var px = Math.max(x, Math.min(ox, x + r.width));
      var py = Math.max(y, Math.min(oy, y + r.height));
      var d = Math.hypot(px - ox, py - oy);
      var vx = x + r.width / 2 - ox, vy = y + r.height / 2 - oy, n = Math.hypot(vx, vy) || 1;
      c.style.setProperty('--hit', (d / R * 0.8 * P).toFixed(2) + 's');
      c.style.setProperty('--dx', (vx / n * 6).toFixed(1) + 'px');
      c.style.setProperty('--dy', (vy / n * 6).toFixed(1) + 'px');
      c.style.setProperty('--rot', (vx / n * 0.8).toFixed(2) + 'deg');
      c.style.setProperty('--hx', ((px - x) / r.width * 100).toFixed(0) + '%');
      c.style.setProperty('--hy', ((py - y) / r.height * 100).toFixed(0) + '%');
    });
    grid.classList.remove('is-waving');
    void grid.offsetWidth;
    grid.classList.add('is-waving');
  };
  var timer;
  lay();
  window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(lay, 200); });
})();

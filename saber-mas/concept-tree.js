// Árboles conceptuales: estrellitas que titilan en el borde de cada nodo y crecimiento al aparecer.
(function () {
  var trees = document.querySelectorAll('.concept-tree');
  if (!trees.length) return;
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Ubica una estrellita en un punto al azar del perímetro del nodo.
  function sparkle(node, k) {
    var star = document.createElement('span');
    star.className = 'ct-star';
    star.setAttribute('aria-hidden', 'true');
    var t = Math.random() * 4, side = Math.floor(t), f = (t - side) * 100;
    var x = side === 0 ? f : side === 1 ? 100 : side === 2 ? 100 - f : 0;
    var y = side === 0 ? 0 : side === 1 ? f : side === 2 ? 100 : 100 - f;
    star.style.left = x + '%';
    star.style.top = y + '%';
    star.style.setProperty('--s', (9 + Math.random() * 8).toFixed(1) + 'px');
    star.style.setProperty('--d', (2.4 + Math.random() * 2.2).toFixed(2) + 's');
    star.style.setProperty('--w', (k * 0.9 + Math.random() * 1.6).toFixed(2) + 's');
    node.appendChild(star);
  }

  trees.forEach(function (tree) {
    tree.querySelectorAll('.ct-node').forEach(function (node) {
      var count = node.classList.contains('ct-root') ? 5 : 3;
      for (var k = 0; k < count; k++) sparkle(node, k);
    });
    tree.querySelectorAll('.ct-branch').forEach(function (b, i) { b.style.setProperty('--i', i); });

    if (still || !('IntersectionObserver' in window)) return;
    tree.classList.add('ct-ready');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        tree.classList.add('ct-grown');
        io.disconnect();
      });
    }, { threshold: 0.2 });
    io.observe(tree);
  });
})();

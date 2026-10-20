// «¿Qué es la TMI-A?»: entradas animadas, línea del proceso, ciclo del esquema y tarjetas.
(function () {
  var root = document.querySelector('.tmia');
  if (!root) return;
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canObserve = 'IntersectionObserver' in window;

  // Entradas: sin JS o con movimiento reducido todo queda visible desde el inicio.
  if (!still && canObserve) {
    root.classList.add('tmia-js');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.18 });
    root.querySelectorAll('[data-anim], .tmia-ladder, .tmia-finale').forEach(function (el) { io.observe(el); });
  } else {
    root.querySelectorAll('.tmia-ladder, .tmia-finale, [data-anim]').forEach(function (el) { el.classList.add('is-in'); });
  }

  // Escalera: cada caja aparece en orden (1, 2, 3, A, B, C y al final 4D).
  root.querySelectorAll('.tmia-ladder [data-step]').forEach(function (el) {
    el.style.setProperty('--d', (Number(el.dataset.step) * 0.28).toFixed(2) + 's');
  });

  // Línea del proceso: crece con el scroll y enciende los pasos que ya alcanzó.
  var steps = root.querySelector('.tmia-steps');
  if (steps) {
    var items = steps.querySelectorAll('li');
    var update = function () {
      var r = steps.getBoundingClientRect();
      var p = Math.min(1, Math.max(0, (innerHeight * 0.7 - r.top) / r.height));
      steps.style.setProperty('--p', still ? 1 : p.toFixed(3));
      items.forEach(function (li) {
        li.classList.toggle('is-lit', still || li.getBoundingClientRect().top < innerHeight * 0.7);
      });
    };
    update();
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
  }

  // Ciclo del esquema: recorre los cinco momentos y muestra el ejemplo de cada uno.
  var cycle = root.querySelector('.tmia-cycle');
  if (cycle) {
    var nodes = cycle.querySelectorAll('.tmia-node');
    var panel = cycle.querySelector('.tmia-panel');
    var label = panel.querySelector('.eyebrow');
    var text = panel.querySelector('p:not(.eyebrow)');
    var modes = cycle.querySelectorAll('.tmia-toggle button');
    var current = 0, timer = null;
    var show = function (i) {
      current = i;
      nodes.forEach(function (n, k) { n.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
      var n = nodes[i];
      label.textContent = n.textContent;
      text.textContent = n.dataset[cycle.dataset.mode === 'otro' ? 'otro' : 'habitual'];
      panel.classList.remove('is-swap'); void panel.offsetWidth; panel.classList.add('is-swap');
    };
    var play = function () {
      if (still) return;
      clearInterval(timer);
      timer = setInterval(function () { show((current + 1) % nodes.length); }, 4200);
    };
    nodes.forEach(function (n, i) {
      n.addEventListener('click', function () { show(i); clearInterval(timer); });
    });
    modes.forEach(function (b) {
      b.addEventListener('click', function () {
        cycle.dataset.mode = b.dataset.mode;
        modes.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        show(0); play();
      });
    });
    show(0);
    if (canObserve) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) play(); else clearInterval(timer); });
      }, { threshold: 0.3 }).observe(cycle);
    }
  }

  // Tarjetas de conceptos: también giran con clic o teclado.
  root.querySelectorAll('.tmia-card').forEach(function (c) {
    c.addEventListener('click', function () {
      c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    });
  });

  // Glosario: flechas del carrusel.
  var deck = root.querySelector('#glosario .tmia-cards');
  var prev = root.querySelector('.tmia-prev'), next = root.querySelector('.tmia-next');
  if (deck && prev && next) {
    var ends = function () {
      prev.disabled = deck.scrollLeft < 4;
      next.disabled = deck.scrollLeft + deck.clientWidth > deck.scrollWidth - 4;
    };
    prev.addEventListener('click', function () { deck.scrollBy({ left: -deck.clientWidth, behavior: still ? 'auto' : 'smooth' }); });
    next.addEventListener('click', function () { deck.scrollBy({ left: deck.clientWidth, behavior: still ? 'auto' : 'smooth' }); });
    deck.addEventListener('scroll', ends, { passive: true });
    window.addEventListener('resize', ends);
    ends();
  }

  // Secuencias que se encienden en bucle mientras están en pantalla.
  var lightUp = function (selector, delay) {
    var box = root.querySelector(selector);
    if (!box || still) return;
    var parts = box.querySelectorAll('[data-lit]');
    var k = 0, t = null;
    var tick = function () {
      parts.forEach(function (p, j) { p.classList.toggle('is-lit', j === k); });
      k = (k + 1) % parts.length;
    };
    if (!canObserve) return;
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        clearInterval(t);
        if (e.isIntersecting) { tick(); t = setInterval(tick, delay); }
      });
    }, { threshold: 0.3 }).observe(box);
  };
  lightUp('.tmia-bond', 2400);
  lightUp('.tmia-loop', 1500);

  // Estrellitas que suben en el cierre.
  var finale = root.querySelector('.tmia-finale');
  if (finale && !still) {
    for (var s = 0; s < 14; s++) {
      var star = document.createElement('span');
      star.className = 'tmia-float';
      star.setAttribute('aria-hidden', 'true');
      star.style.left = (4 + Math.random() * 92).toFixed(1) + '%';
      star.style.setProperty('--d', (6 + Math.random() * 5).toFixed(1) + 's');
      star.style.setProperty('--w', (Math.random() * 7).toFixed(1) + 's');
      finale.appendChild(star);
    }
  }
})();

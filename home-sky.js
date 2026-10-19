// Portada, modo oscuro: cielo estrellado que gira muy lento alrededor de un polo fuera de pantalla,
// con estrellas que titilan y, de vez en cuando, una estrella fugaz. Solo existe en tema oscuro;
// con movimiento reducido el cielo queda quieto y sin estrellas fugaces.
(() => {
  const sky = document.querySelector('.home-sky');
  if (!sky) return;
  const root = document.documentElement;
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  sky.append(canvas);
  const ctx = canvas.getContext('2d');

  const TURN = Math.PI * 2 / 1100; // radianes por segundo: una vuelta completa en ~18 minutos
  const TINTS = ['255,255,255', '238,231,255', '226,236,255', '255,240,228', '250,226,244'];
  let width = 0, height = 0, pole = { x: 0, y: 0 }, stars = [], meteors = [];
  let running = false, last = 0, angle = 0, nextMeteor = 0, frame = 0;

  // Halo suave precalculado; se escala para cada estrella brillante.
  const glow = document.createElement('canvas');
  glow.width = glow.height = 32;
  const g = glow.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(.25, 'rgba(236,228,255,.45)');
  grad.addColorStop(1, 'rgba(236,228,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 32, 32);

  const resize = () => {
    const scale = Math.min(devicePixelRatio || 1, 2);
    const reseed = innerWidth !== width || Math.abs(innerHeight - height) > 160;
    width = innerWidth; height = innerHeight;
    canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    // En móviles la barra del navegador cambia el alto al hacer scroll: no se rehace el cielo por eso.
    if (!reseed) return;
    // El polo queda arriba a la derecha, fuera de la vista: el cielo deriva en un arco amplio.
    pole = { x: width * .82, y: -height * .45 };
    const reach = Math.hypot(Math.max(pole.x, width - pole.x), height - pole.y);
    const count = Math.min(3600, Math.round(Math.PI * reach * reach / 4300));
    stars = Array.from({ length: count }, () => {
      const r = reach * Math.sqrt(Math.random());
      const big = Math.random() < .035;
      return {
        r, a: Math.random() * Math.PI * 2,
        size: big ? 1.3 + Math.random() * 1.1 : .35 + Math.random() ** 2 * 1.1,
        alpha: big ? .75 + Math.random() * .25 : .25 + Math.random() * .55,
        speed: .4 + Math.random() * 1.6, phase: Math.random() * Math.PI * 2,
        tint: TINTS[Math.random() < .7 ? 0 : 1 + Math.floor(Math.random() * 4)], big
      };
    });
  };

  const spawnMeteor = () => {
    const fromLeft = Math.random() < .35;
    const dir = (fromLeft ? 25 : 155) + (Math.random() - .5) * 22; // grados, siempre hacia abajo
    const rad = dir * Math.PI / 180;
    meteors.push({
      x: width * (fromLeft ? .05 + Math.random() * .5 : .45 + Math.random() * .5),
      y: height * (.03 + Math.random() * .4),
      dx: Math.cos(rad), dy: Math.sin(rad),
      speed: 700 + Math.random() * 600, tail: 120 + Math.random() * 140,
      life: 0, span: .7 + Math.random() * .6
    });
  };

  const draw = (t, dt) => {
    ctx.clearRect(0, 0, width, height);
    const cos = Math.cos(angle), sin = Math.sin(angle);
    for (const s of stars) {
      const sx = Math.cos(s.a), sy = Math.sin(s.a);
      const x = pole.x + s.r * (sx * cos - sy * sin);
      const y = pole.y + s.r * (sx * sin + sy * cos);
      if (x < -8 || y < -8 || x > width + 8 || y > height + 8) continue;
      // Titileo suave; las estrellas se apagan un poco hacia el horizonte.
      const twinkle = still.matches ? 1 : .72 + .28 * Math.sin(t * s.speed + s.phase);
      const a = s.alpha * twinkle * (1 - .35 * y / height);
      if (s.big) {
        const d = s.size * 7;
        ctx.globalAlpha = a * .55;
        ctx.drawImage(glow, x - d / 2, y - d / 2, d, d);
      }
      ctx.globalAlpha = a;
      ctx.fillStyle = `rgb(${s.tint})`;
      ctx.beginPath(); ctx.arc(x, y, s.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    meteors = meteors.filter(m => (m.life += dt) < m.span);
    for (const m of meteors) {
      const p = m.life / m.span;
      const fade = Math.min(1, p * 5) * (1 - p) ** .6;
      const hx = m.x + m.dx * m.speed * m.life, hy = m.y + m.dy * m.speed * m.life;
      const len = m.tail * Math.min(1, p * 3);
      const tx = hx - m.dx * len, ty = hy - m.dy * len;
      const trail = ctx.createLinearGradient(hx, hy, tx, ty);
      trail.addColorStop(0, `rgba(255,250,255,${.95 * fade})`);
      trail.addColorStop(.3, `rgba(222,200,255,${.45 * fade})`);
      trail.addColorStop(1, 'rgba(200,180,255,0)');
      ctx.strokeStyle = trail; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.globalAlpha = fade * .8;
      ctx.drawImage(glow, hx - 7, hy - 7, 14, 14);
      ctx.globalAlpha = 1;
    }
  };

  const tick = now => {
    if (!running) return;
    const t = now / 1000;
    const dt = last ? Math.min(.05, t - last) : 0;
    last = t;
    angle += TURN * dt;
    if (t > nextMeteor) { spawnMeteor(); nextMeteor = t + 6 + Math.random() * 10; }
    draw(t, dt);
    frame = requestAnimationFrame(tick);
  };

  const active = () => root.dataset.theme === 'dark' && !document.hidden;
  const update = () => {
    cancelAnimationFrame(frame);
    running = false;
    if (!active()) return;
    if (still.matches) { meteors = []; draw(0, 0); return; }
    running = true; last = 0;
    nextMeteor = performance.now() / 1000 + 2 + Math.random() * 4;
    frame = requestAnimationFrame(tick);
  };

  resize();
  addEventListener('resize', () => { resize(); if (!running && active()) draw(0, 0); }, { passive: true });
  document.addEventListener('visibilitychange', update);
  still.addEventListener?.('change', update);
  new MutationObserver(update).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  update();
})();

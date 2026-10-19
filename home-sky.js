// Cielo vivo de la portada, uno por tema.
// Noche: cielo estrellado que gira muy lento alrededor de un polo fuera de pantalla, con estrellas que
// titilan y, de vez en cuando, una estrella fugaz.
// Día: nubes que derivan despacio, motas de luz que suben, aves solitarias que cruzan a su aire y, cada tanto, una bandada.
// Con movimiento reducido el cielo queda quieto: sin estrellas fugaces ni aves.
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
  let clouds = [], motes = [], flocks = [];
  let running = false, last = 0, angle = 0, nextMeteor = 0, nextFlock = 0, nextSolo = 0, frame = 0;

  // Halo suave precalculado; se escala para cada estrella brillante y para las motas de luz.
  const glow = document.createElement('canvas');
  glow.width = glow.height = 32;
  const g = glow.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(.25, 'rgba(236,228,255,.45)');
  grad.addColorStop(1, 'rgba(236,228,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 32, 32);

  // Nube: varios lóbulos blancos difusos, más anchos que altos, dibujados una vez en su propio lienzo.
  const makeCloud = w => {
    const h = Math.round(w * .5), c = document.createElement('canvas');
    c.width = w; c.height = h;
    const cg = c.getContext('2d');
    const lobes = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < lobes; i++) {
      const x = w * (.22 + .56 * (i + Math.random() * .6) / lobes);
      const y = h * (.55 + (Math.random() - .5) * .12);
      // Cada lóbulo se desvanece antes del borde de su lienzo, para que la nube no muestre cortes rectos.
      const r = Math.min(h * (.2 + Math.random() * .14), x, w - x, y, h - y) / 1.6;
      const lg = cg.createRadialGradient(x, y, 0, x, y, r * 1.6);
      lg.addColorStop(0, 'rgba(255,255,255,.85)');
      lg.addColorStop(.55, 'rgba(255,252,255,.45)');
      lg.addColorStop(1, 'rgba(255,250,255,0)');
      cg.fillStyle = lg;
      cg.fillRect(0, 0, w, h);
    }
    return c;
  };

  const seedNight = () => {
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

  const seedDay = () => {
    const count = Math.max(4, Math.min(9, Math.round(width / 240)));
    clouds = Array.from({ length: count }, (_, i) => {
      const w = Math.round(Math.min(width * .6, 240 + Math.random() * 280));
      // Las nubes grandes van más abajo y más rápido: da una leve profundidad.
      const depth = .4 + Math.random() * .6;
      return {
        img: makeCloud(w), w,
        x: (i + Math.random() * .8) / count * (width + w) - w,
        y: height * (.04 + Math.random() * .62),
        speed: 4 + depth * 9, alpha: .5 + depth * .45
      };
    });
    motes = Array.from({ length: Math.round(Math.min(40, width / 40)) }, () => ({
      x: Math.random() * width, y: Math.random() * height,
      size: .8 + Math.random() * 1.6, rise: 4 + Math.random() * 9,
      sway: 6 + Math.random() * 14, phase: Math.random() * Math.PI * 2,
      alpha: .25 + Math.random() * .35, warm: Math.random() < .6
    }));
  };

  const resize = () => {
    const scale = Math.min(devicePixelRatio || 1, 2);
    const reseed = innerWidth !== width || Math.abs(innerHeight - height) > 160;
    width = innerWidth; height = innerHeight;
    canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    // En móviles la barra del navegador cambia el alto al hacer scroll: no se rehace el cielo por eso.
    if (!reseed) return;
    seedNight(); seedDay(); flocks = [];
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

  // Bandada suelta en forma de V abierta, que cruza la pantalla de lado a lado subiendo o bajando apenas.
  const spawnFlock = () => {
    const dir = Math.random() < .6 ? 1 : -1;
    const size = 11 + Math.random() * 5;
    const n = 3 + Math.floor(Math.random() * 5);
    const members = Array.from({ length: n }, (_, i) => {
      const rank = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
      return {
        ox: -rank * (size * 3.2 + Math.random() * 6),
        oy: side * rank * (size * 1.9 + Math.random() * 5),
        phase: Math.random() * Math.PI * 2, rate: 7 + Math.random() * 2.5,
        size: size * (.8 + Math.random() * .35)
      };
    });
    flocks.push({
      dir, members, x: dir > 0 ? -80 : width + 80,
      y: height * (.1 + Math.random() * .45),
      speed: 70 + Math.random() * 40, drift: (Math.random() - .5) * 8, t: 0, wave: 0, waveRate: 0
    });
  };

  // Ave solitaria: cada una con su rumbo, altura, velocidad y un vuelo ondulante propio.
  const spawnSolo = () => {
    if (flocks.filter(f => f.solo).length >= 4) return;
    const dir = Math.random() < .5 ? 1 : -1;
    flocks.push({
      solo: true, dir, x: dir > 0 ? -40 : width + 40,
      y: height * (.06 + Math.random() * .7),
      speed: 60 + Math.random() * 70, drift: (Math.random() - .5) * 30, t: 0,
      wave: 8 + Math.random() * 26, waveRate: .4 + Math.random() * .7,
      members: [{
        ox: 0, oy: 0, phase: Math.random() * Math.PI * 2,
        rate: 6.5 + Math.random() * 3.5, size: 9 + Math.random() * 6
      }]
    });
  };

  const drawBird = (x, y, s, flap) => {
    const wing = -s * .65 * flap;
    ctx.beginPath();
    ctx.moveTo(x - s, y + wing);
    ctx.quadraticCurveTo(x - s * .45, y - s * .2 + wing * .35, x, y);
    ctx.quadraticCurveTo(x + s * .45, y - s * .2 + wing * .35, x + s, y + wing);
    ctx.stroke();
  };

  const drawNight = (t, dt) => {
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

  const drawDay = (t, dt) => {
    for (const c of clouds) {
      c.x += c.speed * dt;
      if (c.x > width + 20) c.x = -c.w - 20;
      ctx.globalAlpha = c.alpha;
      ctx.drawImage(c.img, c.x, c.y + Math.sin(t * .05 + c.speed) * 4);
    }

    for (const m of motes) {
      m.y -= m.rise * dt;
      if (m.y < -10) { m.y = height + 10; m.x = Math.random() * width; }
      const x = m.x + Math.sin(t * .4 + m.phase) * m.sway;
      ctx.globalAlpha = m.alpha * (still.matches ? 1 : .6 + .4 * Math.sin(t * 1.3 + m.phase));
      ctx.fillStyle = m.warm ? 'rgb(240,190,140)' : 'rgb(255,255,255)';
      ctx.beginPath(); ctx.arc(x, m.y, m.size, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha *= .5;
      ctx.drawImage(glow, x - m.size * 4, m.y - m.size * 4, m.size * 8, m.size * 8);
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = 'rgba(64,42,84,.9)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    flocks = flocks.filter(f => f.dir > 0 ? f.x < width + 160 : f.x > -160);
    for (const f of flocks) {
      f.t += dt;
      f.x += f.dir * f.speed * dt;
      f.y += f.drift * dt;
      const wave = Math.sin(f.t * f.waveRate) * f.wave;
      for (const b of f.members) {
        // Aleteo con pausas de planeo: la amplitud sube y baja lentamente.
        const glide = .35 + .65 * Math.max(0, Math.sin(f.t * .7 + b.phase));
        const flap = Math.sin(f.t * b.rate + b.phase) * glide;
        drawBird(f.x + f.dir * b.ox, f.y + wave + b.oy + Math.sin(f.t * 1.4 + b.phase) * 2, b.size, flap);
      }
    }
  };

  const night = () => root.dataset.theme === 'dark';
  const draw = (t, dt) => {
    ctx.clearRect(0, 0, width, height);
    if (night()) drawNight(t, dt); else drawDay(t, dt);
  };

  const tick = now => {
    if (!running) return;
    const t = now / 1000;
    const dt = last ? Math.min(.05, t - last) : 0;
    last = t;
    if (night()) {
      angle += TURN * dt;
      if (t > nextMeteor) { spawnMeteor(); nextMeteor = t + 6 + Math.random() * 10; }
    } else {
      if (t > nextFlock) { spawnFlock(); nextFlock = t + 9 + Math.random() * 9; }
      if (t > nextSolo) { spawnSolo(); nextSolo = t + 2.5 + Math.random() * 3.5; }
    }
    draw(t, dt);
    frame = requestAnimationFrame(tick);
  };

  const update = () => {
    cancelAnimationFrame(frame);
    running = false; meteors = []; flocks = [];
    if (document.hidden) return;
    if (still.matches) { draw(0, 0); return; }
    running = true; last = 0;
    const now = performance.now() / 1000;
    nextMeteor = now + 2 + Math.random() * 4;
    nextFlock = now + 3 + Math.random() * 3;
    nextSolo = now + .5 + Math.random();
    frame = requestAnimationFrame(tick);
  };

  resize();
  addEventListener('resize', () => { resize(); if (!running) draw(0, 0); }, { passive: true });
  document.addEventListener('visibilitychange', update);
  still.addEventListener?.('change', update);
  new MutationObserver(update).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  update();
})();

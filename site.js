const toggle = document.querySelector('.menu');
const nav = document.querySelector('#navegacion');

// Register essential navigation before optional theme and decorative features.
if (toggle && nav) {
  toggle.type = 'button';
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('open')) { closeMenu(); toggle.focus(); }
  });
}

// Theme button: a single round icon (sun in light mode, moon in dark mode) that switches
// between the two. Until it is pressed the site follows the system; a press is remembered.
(() => {
  if (!nav) return;
  const storageKey = 'psivanoda-theme';
  const systemTheme = matchMedia('(prefers-color-scheme: dark)');
  let preference = document.documentElement.dataset.themePreference || 'system';
  if (!['light', 'dark', 'system'].includes(preference)) preference = 'system';

  const resolve = value => value === 'system' ? (systemTheme.matches ? 'dark' : 'light') : value;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'theme-toggle';
  button.innerHTML = '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg>'
    + '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a7 7 0 0 0 10.7 10.7z"/></svg>'
    + '<span class="theme-toggle-text"></span>';

  const applyTheme = (value, persist = true) => {
    preference = value;
    const resolved = resolve(preference);
    const root = document.documentElement;
    root.dataset.theme = resolved;
    root.dataset.themePreference = preference;
    root.style.colorScheme = resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#0a0a1b' : '#e6e0f6');
    if (persist) {
      try { localStorage.setItem(storageKey, preference); } catch (_) {}
    }
    const current = resolved === 'dark' ? 'Tema oscuro' : 'Tema claro';
    const next = resolved === 'dark' ? 'cambiar a claro' : 'cambiar a oscuro';
    button.querySelector('.theme-toggle-text').textContent = current;
    button.setAttribute('aria-label', current + ': ' + next);
    button.title = current + ' (' + next + ')';
  };

  button.addEventListener('click', () => applyTheme(resolve(preference) === 'dark' ? 'light' : 'dark'));
  nav.insertBefore(button, nav.querySelector('.nav-contact'));
  systemTheme.addEventListener?.('change', () => { if (preference === 'system') applyTheme('system', false); });
  applyTheme(preference, false);
})();

function closeMenu(){
  if (!nav || !toggle) return;
  nav.classList.remove('open');
  toggle.setAttribute('aria-expanded','false');
}
const mailForm = document.querySelector('#quick-mail');
mailForm?.addEventListener('submit', event => {
  event.preventDefault();
  const name = mailForm.elements.nombre.value.trim();
  const message = mailForm.elements.mensaje.value.trim();
  if (!name || !message) {
    document.querySelector('#mail-status').textContent = 'Escribe tu nombre y tu consulta antes de abrir el correo.';
    return;
  }
  const subject = 'Consulta desde psivanoda.cl';
  const body = message + '\r\n\r\nNombre: ' + name;
  window.location.href = 'mailto:agenda@psivanoda.cl?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  document.querySelector('#mail-status').textContent = 'Completa el envío en tu aplicación de correo. Si no se abre, escribe a agenda@psivanoda.cl y copia tu mensaje; todavía no se ha enviado desde esta página.';
});

// Preserve links to the former home-page prices section.
if(location.hash==='#valores'&&!location.pathname.includes('/valores')) location.replace(new URL('valores/',location.href).href);


// Faint background (stars at nightfall in dark mode): a sparse, still dot mesh. In dark mode the stars nearest
// the cursor only brighten a touch, with no halo, links or movement. Calm by design; disabled on touch, reduced motion and on
// pages marked data-calm (the crisis page), where any extra movement is unwelcome.
// A calm page marked data-cursor-rays (the home page, which has its own night sky) keeps only the cursor rays.
(() => {
  const calm = document.body.hasAttribute('data-calm');
  const raysOnly = calm && document.body.hasAttribute('data-cursor-rays');
  if ((calm && !raysOnly) ||
      matchMedia('(prefers-reduced-motion: reduce), (hover: none)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'gesture-trail';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:1;pointer-events:none';
  if (!raysOnly) document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  const target = { x: -1000, y: -1000 };
  const glow = { x: -1000, y: -1000, alpha: 0 };
  let width = 0, height = 0, running = false, active = false, points = [];

  const resize = () => {
    const scale = Math.min(devicePixelRatio || 1, 2);
    width = innerWidth; height = innerHeight;
    canvas.width = width * scale; canvas.height = height * scale;
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const gap = Math.max(70, Math.min(110, width / 14));
    points = [];
    for (let y = gap / 2; y < height; y += gap)
      for (let x = gap / 2; x < width; x += gap) {
        const ox = x + (Math.random() - .5) * gap * .5, oy = y + (Math.random() - .5) * gap * .5;
        // Per-point size and brightness let the dark theme read as a starfield.
        points.push({ x: ox, y: oy, s: Math.random(), b: Math.random() ** 2 });
      }
  };

  const draw = () => {
    if (glow.x < -900) { glow.x = target.x; glow.y = target.y; }
    glow.x += (target.x - glow.x) * .1;
    glow.y += (target.y - glow.y) * .1;
    glow.alpha += ((active ? 1 : 0) - glow.alpha) * .05;

    const dark = document.documentElement.dataset.theme === 'dark';
    // Light: rose-lilac specks of morning light. Dark: pale starlight at nightfall.
    const color = dark ? '230, 224, 255' : '176, 80, 150';

    ctx.clearRect(0, 0, width, height);
    for (const p of points) {
      // Only the few stars within reach of the cursor wake up, and only slightly.
      const near = Math.max(0, 1 - Math.hypot(p.x - glow.x, p.y - glow.y) / 130) ** 2 * glow.alpha;
      // Stars vary in size and shine, and fade toward the glow on the horizon.
      const base = dark ? (.14 + .5 * p.b) * (1 - .65 * p.y / height) : .26;
      const size = dark ? .7 + 1.3 * p.s : 1.4;
      ctx.fillStyle = `rgba(${color}, ${base + .3 * near})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, size + .6 * near, 0, Math.PI * 2); ctx.fill();
    }

    const settled = Math.abs(target.x - glow.x) < .5 && Math.abs(target.y - glow.y) < .5 &&
      Math.abs((active ? 1 : 0) - glow.alpha) < .01;
    if (settled) { running = false; return; }
    requestAnimationFrame(draw);
  };
  const wake = () => { if (!running && !raysOnly) { running = true; requestAnimationFrame(draw); } };

  addEventListener('resize', () => { resize(); wake(); }, { passive: true });
  // Only in dark mode: in light mode the cursor leaves a fairy-dust trail instead (below).
  // Dark mode also gets a small burst of short rays that pulses around the cursor, above the content (CSS: #night-glow).
  // Two alternating sets of rays take turns, so the burst twinkles instead of blinking.
  const glowDot = document.createElement('div');
  glowDot.id = 'night-glow';
  glowDot.setAttribute('aria-hidden', 'true');
  const ray = (deg, from, to) => {
    const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return `<line x1="${(c * from).toFixed(1)}" y1="${(s * from).toFixed(1)}" x2="${(c * to).toFixed(1)}" y2="${(s * to).toFixed(1)}"/>`;
  };
  glowDot.innerHTML = '<svg viewBox="-30 -30 60 60">' +
    `<g>${ray(-80, 13, 19) + ray(10, 14, 22) + ray(100, 13, 20) + ray(190, 14, 21)}</g>` +
    `<g>${ray(-35, 15, 20) + ray(55, 14, 19) + ray(145, 15, 22) + ray(235, 13, 18)}</g></svg>`;
  document.body.append(glowDot);
  addEventListener('pointermove', e => {
    target.x = e.clientX; target.y = e.clientY; active = document.documentElement.dataset.theme === 'dark'; wake();
    glowDot.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    glowDot.classList.add('on');
  }, { passive: true });
  const leave = () => { active = false; wake(); glowDot.classList.remove('on'); };
  addEventListener('blur', leave);
  document.documentElement.addEventListener('pointerleave', leave);
  resize(); wake();
})();

// Scroll reveal: sections and cards fade up once as they enter the viewport.
// Skipped on the emergency page (no .header) and when the user prefers reduced motion.
(() => {
  if (!document.querySelector('body > .header') || !('IntersectionObserver' in window) ||
      matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const groups = [
    '.section-heading', '.about > *', '.pillars > article', '.support > *', '.topics > li',
    '.welcome-strip .wrap > *', '.contact-grid > *', '.quick-contact > *', '.approach-more',
    '.therapy-intro > *', '.therapy-opening > *', '.reflection-grid > article', '.process-title',
    '.process-list > li', '.purpose-grid > article', '.evidence-lead', '.evidence-grid > article',
    '.evidence-context', '.therapy-relationship > *', '.price-grid > article', '.relationship-prices > h2',
    '.extra-prices > details', '.rates-booking', '.learn-opening > *', '.learn-grid > *',
    '.article-heading > *', '.learn-article > *'
  ];
  const items = [];
  groups.forEach(selector => document.querySelectorAll(selector).forEach(el => {
    // Content already on screen at load is shown as is: hiding it only delays the first paint
    // of the main content (LCP) and adds motion nobody asked for.
    if (el.closest('.hero') || items.includes(el) || el.getBoundingClientRect().top < innerHeight) return;
    items.push(el);
  }));
  // Stagger siblings that share a parent so grids cascade instead of popping in together.
  const counters = new Map();
  items.forEach(el => {
    const i = counters.get(el.parentElement) || 0;
    counters.set(el.parentElement, i + 1);
    el.style.setProperty('--reveal-i', Math.min(i, 5));
    el.classList.add('reveal');
  });
  document.documentElement.classList.add('motion');
  const done = el => {
    el.classList.remove('reveal', 'is-visible');
    el.style.removeProperty('--reveal-i');
  };
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    observer.unobserve(el);
    el.classList.add('is-visible');
    setTimeout(() => done(el), 1000 + (parseInt(el.style.getPropertyValue('--reveal-i')) || 0) * 110);
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0 });
  items.forEach(el => observer.observe(el));
  // Printing shows everything, even what was never scrolled into view.
  addEventListener('beforeprint', () => items.forEach(done));
})();

// Light theme: fairy dust. The cursor leaves a trail of small four-pointed sparkles.
// Background drift (DRIFT) is off for now; set it to true to bring back the sparkles that float
// behind the content. Off in dark mode, on reduced motion and on data-calm pages.
(() => {
  if (document.body.hasAttribute('data-calm') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const DRIFT = false;

  const canvas = document.createElement('canvas');
  canvas.id = 'fairy-dust';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:-1;pointer-events:none';
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  // The cursor trail gets its own layer above the content, so it is not hidden behind the cards.
  const trailCanvas = document.createElement('canvas');
  trailCanvas.setAttribute('aria-hidden', 'true');
  trailCanvas.style.cssText = 'position:fixed;inset:0;z-index:2;pointer-events:none';
  document.body.prepend(trailCanvas);
  const tctx = trailCanvas.getContext('2d');
  // Muted dawn tones (dusty mauve, lavender, pale pink, champagne), drawn semi-transparent.
  const colors = ['170, 128, 160', '150, 132, 182', '204, 164, 194', '202, 178, 146'];
  let width = 0, height = 0, motes = [], trail = [], running = false, ready = false, last = 0, fade = 0, lastDrop = 0;

  const spawn = (anywhere) => {
    const size = 6 + Math.random() ** 1.5 * 13;
    return {
      x: Math.random() * width,
      y: anywhere ? Math.random() * height : height + 20,
      size, color: colors[Math.floor(Math.random() * colors.length)],
      vy: 8 + Math.random() * 16, vx: (Math.random() - .3) * 10,
      sway: 10 + Math.random() * 22, swayRate: .25 + Math.random() * .5, phase: Math.random() * 6.28,
      twinkle: .6 + Math.random() * 1.4, spin: (Math.random() - .5) * .6, angle: Math.random() * 6.28,
    };
  };

  const resize = () => {
    const scale = Math.min(devicePixelRatio || 1, 2);
    width = innerWidth; height = innerHeight;
    for (const [c, g] of [[canvas, ctx], [trailCanvas, tctx]]) {
      c.width = width * scale; c.height = height * scale;
      c.style.width = width + 'px'; c.style.height = height + 'px';
      g.setTransform(scale, 0, 0, scale, 0, 0);
    }
    const count = Math.round(Math.min(46, Math.max(18, width * height / 30000)));
    motes = DRIFT ? Array.from({ length: count }, () => spawn(true)) : [];
  };

  // A sparkle: a soft glow plus a thin four-pointed star with a bright core.
  const sparkle = (m, alpha, ctx) => {
    const r = m.size;
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.angle);
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.8);
    glow.addColorStop(0, `rgba(${m.color}, ${.16 * alpha})`);
    glow.addColorStop(1, `rgba(${m.color}, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(-r * 1.8, -r * 1.8, r * 3.6, r * 3.6);
    ctx.fillStyle = `rgba(${m.color}, ${.5 * alpha})`;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.lineTo(Math.cos(a + Math.PI / 4) * r * .3, Math.sin(a + Math.PI / 4) * r * .3);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `rgba(255, 252, 254, ${.55 * alpha})`;
    ctx.beginPath(); ctx.arc(0, 0, r * .16, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };

  const isLight = () => document.documentElement.dataset.theme !== 'dark';

  const frame = (now) => {
    if (!isLight() || document.hidden) { running = false; ctx.clearRect(0, 0, width, height); tctx.clearRect(0, 0, width, height); trail = []; return; }
    const dt = Math.min(.05, (now - (last || now)) / 1000);
    last = now;
    const t = now / 1000;
    fade = Math.min(1, fade + dt / 2);
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < motes.length; i++) {
      const m = motes[i];
      m.y -= m.vy * dt;
      m.x += m.vx * dt;
      m.angle += m.spin * dt;
      const x = m.x + Math.sin(t * m.swayRate + m.phase) * m.sway;
      if (m.y < -30 || x < -40 || x > width + 40) { motes[i] = spawn(false); continue; }
      const alpha = .35 + .65 * (.5 + .5 * Math.sin(t * m.twinkle + m.phase));
      sparkle({ ...m, x }, alpha * fade, ctx);
    }
    // Cursor trail: small sparkles that fall slowly, spin and fade out in about a second.
    tctx.clearRect(0, 0, width, height);
    trail = trail.filter(d => (d.life -= dt / d.span) > 0);
    for (const d of trail) {
      d.vy += 14 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.angle += d.spin * dt;
      sparkle(d, d.life * .9, tctx);
    }
    // Nothing left to draw: rest until the cursor moves again.
    if (!motes.length && !trail.length) { running = false; return; }
    requestAnimationFrame(frame);
  };
  const start = () => { if (!running && isLight() && !document.hidden) { running = true; last = 0; requestAnimationFrame(frame); } };

  if (matchMedia('(hover: hover)').matches) addEventListener('pointermove', e => {
    if (!ready || e.timeStamp - lastDrop < 35) return;
    lastDrop = e.timeStamp;
    trail.push({ x: e.clientX + (Math.random() - .5) * 8, y: e.clientY + (Math.random() - .5) * 8,
      size: 3 + Math.random() * 5, color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - .5) * 18, vy: 4 + Math.random() * 10, spin: (Math.random() - .5) * 3,
      angle: Math.random() * 6.28, life: 1, span: .9 + Math.random() * .6 });
    if (trail.length > 45) trail.shift();
    start();
  }, { passive: true });

  resize();
  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', start);
  new MutationObserver(start).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  // Starts after the page's entrance animations, and fades in over two seconds.
  const begin = () => setTimeout(() => { ready = true; start(); }, 1500);
  if (document.readyState === 'complete') begin(); else addEventListener('load', begin, { once: true });
})();

// "Cómo trabajamos" concept map: draws the arrows between nodes and grows the tree on scroll.
(() => {
  const map = document.querySelector('[data-process-map]');
  if (!map) return;
  const svg = map.querySelector('.process-edges');
  const NS = 'http://www.w3.org/2000/svg';
  const node = id => map.querySelector(`[data-node="${id}"]`);
  const narrow = matchMedia('(max-width: 720px)');
  const tree = {
    depth: { root: 0, p1: 1, p2: 2, p3: 2, p4: 2, p5: 3 },
    edges: [
      { from: 'root', to: 'p1', label: 'nos lleva a' },
      { from: 'p1', to: 'p2', label: '¿qué significa?' },
      { from: 'p1', to: 'p4', label: 'en la relación' },
      { from: 'p1', to: 'p3', label: '¿cómo responder?' },
      { from: 'p2', to: 'p4', side: true },
      { from: 'p3', to: 'p4', side: true },
      { from: 'p2', to: 'p5' },
      { from: 'p4', to: 'p5', label: 'hacia tu autonomía' },
      { from: 'p3', to: 'p5' },
      { from: 'p5', to: 'root', loop: true, label: 'revisamos juntos el proceso' }
    ]
  };
  const column = {
    depth: { root: 0, p1: 1, p2: 2, p3: 3, p4: 4, p5: 5 },
    edges: [
      { from: 'root', to: 'p1', label: 'nos lleva a' },
      { from: 'p1', to: 'p2', label: '¿qué significa?' },
      { from: 'p2', to: 'p3', label: '¿cómo responder?' },
      { from: 'p3', to: 'p4', label: 'en la relación' },
      { from: 'p4', to: 'p5', label: 'hacia tu autonomía' }
    ]
  };
  const STEP = .7;
  const tone = id => getComputedStyle(node(id)).getPropertyValue('--node-accent').trim() || null;
  const make = (tag, attrs) => {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  };

  const draw = () => {
    const layout = narrow.matches ? column : tree;
    // Offsets ignore transforms, so hover lifts and the growth animation don't skew the arrows.
    const rect = id => {
      const el = node(id), l = el.offsetLeft, t = el.offsetTop, w = el.offsetWidth, h = el.offsetHeight;
      return { l, r: l + w, t, b: t + h, cx: l + w / 2, cy: t + h / 2 };
    };
    svg.replaceChildren();
    map.querySelectorAll('.process-label').forEach(el => el.remove());
    const last = Math.max(...Object.values(layout.depth));
    Object.entries(layout.depth).forEach(([id, d]) => node(id).style.setProperty('--grow', `${d * STEP}s`));

    layout.edges.forEach(edge => {
      const a = rect(edge.from), b = rect(edge.to);
      let d, end, angle, mid, delay, vertical = false;
      if (edge.side) {
        // Two-way dashed link: step 04 runs alongside 02 and 03.
        const y = (Math.max(a.t, b.t) + Math.min(a.b, b.b)) / 2;
        const [x1, x2] = a.cx < b.cx ? [a.r + 8, b.l - 8] : [a.l - 8, b.r + 8];
        d = `M${x1} ${y}H${x2}`;
        end = [[x2, y, x2 > x1 ? 0 : 180], [x1, y, x2 > x1 ? 180 : 0]];
        delay = (layout.depth[edge.to] + .6) * STEP;
      } else if (edge.loop) {
        // Feedback loop back to the start, along the left margin.
        const x = 18, r = 22, y1 = a.cy, y2 = b.cy, x2 = b.l - 10;
        d = `M${a.l - 8} ${y1}H${x + r}Q${x} ${y1} ${x} ${y1 - r}V${y2 + r}Q${x} ${y2} ${x + r} ${y2}H${x2}`;
        end = [[x2, y2, 0]];
        mid = [x, (y1 + y2) / 2];
        vertical = true;
        delay = (last + .7) * STEP;
      } else {
        const x1 = a.cx, y1 = a.b + 6, x2 = b.cx, y2 = b.t - 6, k = (y2 - y1) * .55;
        d = `M${x1} ${y1}C${x1} ${y1 + k} ${x2} ${y2 - k} ${x2} ${y2}`;
        end = [[x2, y2, 90]];
        mid = [(x1 + x2) / 2, (y1 + y2) / 2];
        delay = (layout.depth[edge.from] + .45) * STEP;
      }
      const dashed = edge.side || edge.loop;
      const color = tone(edge.loop ? edge.from : edge.to);
      const g = make('g', { 'data-from': edge.from, 'data-to': edge.to });
      if (color) g.style.setProperty('--edge', color);
      const path = make('path', { d, class: 'process-edge' + (dashed ? ' is-dashed' : '') });
      if (!dashed) path.setAttribute('pathLength', 1);
      path.style.setProperty('--grow', `${delay}s`);
      g.append(path);
      end.forEach(([x, y, deg]) => {
        const head = make('path', { d: 'M0 0L-10 -5.5Q-7.5 0 -10 5.5Z', class: 'process-head',
          transform: `translate(${x} ${y}) rotate(${deg})` });
        head.style.setProperty('--grow', `${delay + .55}s`);
        g.append(head);
      });
      svg.append(g);
      if (edge.label && mid) {
        const label = document.createElement('span');
        label.className = 'process-label' + (vertical ? ' is-vertical' : '');
        label.textContent = edge.label;
        label.setAttribute('aria-hidden', 'true');
        label.dataset.from = edge.from;
        label.dataset.to = edge.to;
        label.style.left = `${mid[0]}px`;
        label.style.top = `${mid[1]}px`;
        label.style.setProperty('--grow', `${delay + .35}s`);
        if (color) label.style.setProperty('--edge', color);
        map.append(label);
      }
    });
  };

  // Hovering a step lights up the branches that touch it.
  const light = (id, on) => map.querySelectorAll(`[data-from="${id}"], [data-to="${id}"]`).forEach(el =>
    (el.matches('g') ? [...el.children] : [el]).forEach(part => part.classList.toggle('is-lit', on)));
  ['root', 'p1', 'p2', 'p3', 'p4', 'p5'].forEach(id => {
    node(id).addEventListener('pointerenter', () => light(id, true));
    node(id).addEventListener('pointerleave', () => light(id, false));
  });

  let frame;
  const redraw = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); };
  if ('ResizeObserver' in window) new ResizeObserver(redraw).observe(map); else addEventListener('resize', redraw);
  narrow.addEventListener?.('change', redraw);
  draw();

  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  map.classList.add('map-animate');
  const finish = () => map.classList.remove('map-animate', 'is-grown');
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    map.classList.add('is-grown');
    setTimeout(finish, (Math.max(...Object.values((narrow.matches ? column : tree).depth)) + 2.2) * STEP * 1000);
  }, { threshold: .18 });
  observer.observe(map);
  addEventListener('beforeprint', finish);
})();

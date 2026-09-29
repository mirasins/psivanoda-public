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


// Faint background (stars at nightfall in dark mode): a sparse dot mesh that gently parts around the cursor and
// eases back, plus a soft halo. Calm by design; disabled on touch, reduced motion and on
// pages marked data-calm (the crisis page), where any extra movement is unwelcome.
(() => {
  if (document.body.hasAttribute('data-calm') ||
      matchMedia('(prefers-reduced-motion: reduce), (hover: none)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'gesture-trail';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:1;pointer-events:none';
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  const target = { x: -1000, y: -1000 };
  const halo = { x: -1000, y: -1000, alpha: 0 };
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
        points.push({ x: ox, y: oy, ox, oy, s: Math.random(), b: Math.random() ** 2 });
      }
  };

  const draw = () => {
    if (halo.x < -900) { halo.x = target.x; halo.y = target.y; }
    halo.x += (target.x - halo.x) * .06;
    halo.y += (target.y - halo.y) * .06;
    halo.alpha += ((active ? 1 : 0) - halo.alpha) * .04;

    const dark = document.documentElement.dataset.theme === 'dark';
    // Light: rose-lilac specks of morning light. Dark: pale starlight at nightfall.
    const color = dark ? '230, 224, 255' : '176, 80, 150';
    const radius = 180;
    let moving = false;

    ctx.clearRect(0, 0, width, height);

    for (const p of points) {
      const dx = p.ox - halo.x, dy = p.oy - halo.y;
      const d = Math.hypot(dx, dy) || 1;
      const push = d < radius ? (1 - d / radius) ** 2 * 18 * halo.alpha : 0;
      const tx = p.ox + dx / d * push, ty = p.oy + dy / d * push;
      p.x += (tx - p.x) * .08; p.y += (ty - p.y) * .08;
      if (Math.abs(tx - p.x) > .05 || Math.abs(ty - p.y) > .05) moving = true;
    }

    // Faint links only between close neighbours near the cursor.
    ctx.lineWidth = 1;
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const na = Math.max(0, 1 - Math.hypot(a.x - halo.x, a.y - halo.y) / 240) * halo.alpha;
      if (na <= 0) continue;
      for (let j = i + 1; j < points.length; j++) {
        const b = points[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > 140) continue;
        ctx.strokeStyle = `rgba(${color}, ${(dark ? .32 : .34) * na * (1 - d / 140)})`;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }

    for (const p of points) {
      const near = Math.max(0, 1 - Math.hypot(p.x - halo.x, p.y - halo.y) / 240) * halo.alpha;
      // Stars vary in size and shine, and fade toward the glow on the horizon.
      const base = dark ? (.14 + .5 * p.b) * (1 - .65 * p.oy / height) : .26;
      const size = dark ? .7 + 1.3 * p.s : 1.4;
      ctx.fillStyle = `rgba(${color}, ${base + (dark ? .38 : .4) * near})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, size + near, 0, Math.PI * 2); ctx.fill();
    }

    if (halo.alpha > .01) {
      const g = ctx.createRadialGradient(halo.x, halo.y, 0, halo.x, halo.y, 240);
      g.addColorStop(0, `rgba(${color}, ${(dark ? .16 : .15) * halo.alpha})`);
      g.addColorStop(1, `rgba(${color}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(halo.x - 240, halo.y - 240, 480, 480);
    }

    const settled = !moving && Math.abs(target.x - halo.x) < .5 && Math.abs(target.y - halo.y) < .5 &&
      Math.abs((active ? 1 : 0) - halo.alpha) < .01;
    if (settled) { running = false; return; }
    requestAnimationFrame(draw);
  };
  const wake = () => { if (!running) { running = true; requestAnimationFrame(draw); } };

  addEventListener('resize', () => { resize(); wake(); }, { passive: true });
  // Only in dark mode: in light mode the cursor leaves a fairy-dust trail instead (below).
  addEventListener('pointermove', e => { target.x = e.clientX; target.y = e.clientY; active = document.documentElement.dataset.theme === 'dark'; wake(); }, { passive: true });
  const leave = () => { active = false; wake(); };
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

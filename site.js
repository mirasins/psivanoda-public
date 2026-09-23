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

// Theme selector: follows the system by default and remembers explicit choices.
(() => {
  if (!nav) return;
  const storageKey = 'psivanoda-theme';
  const systemTheme = matchMedia('(prefers-color-scheme: dark)');
  const validThemes = new Set(['light', 'dark', 'system']);
  const labels = { light: 'Claro', dark: 'Oscuro', system: 'Sistema' };
  const icons = { light: '☀', dark: '☾', system: '◐' };
  let preference = document.documentElement.dataset.themePreference || 'system';

  const resolveTheme = value => value === 'system' ? (systemTheme.matches ? 'dark' : 'light') : value;
  const applyTheme = (value, persist = true) => {
    preference = validThemes.has(value) ? value : 'system';
    const resolved = resolveTheme(preference);
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.style.colorScheme = resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#18131c' : '#392d42');
    if (persist) {
      try { localStorage.setItem(storageKey, preference); } catch (_) {}
    }
    document.querySelectorAll('[data-theme-option]').forEach(button => {
      const selected = button.dataset.themeOption === preference;
      button.setAttribute('aria-checked', String(selected));
      button.classList.toggle('selected', selected);
    });
    const current = document.querySelector('.theme-toggle-current');
    if (current) current.textContent = labels[preference];
    const icon = document.querySelector('.theme-toggle-icon');
    if (icon) icon.textContent = icons[preference];
  };

  const picker = document.createElement('div');
  picker.className = 'theme-picker';
  picker.innerHTML = `<button class="theme-toggle" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="theme-menu"><span class="theme-toggle-icon" aria-hidden="true">${icons[preference]}</span><span class="theme-toggle-label">Tema</span><span class="theme-toggle-current">${labels[preference]}</span><span class="theme-toggle-chevron" aria-hidden="true">⌄</span></button><div class="theme-menu" id="theme-menu" role="menu" hidden>${['light', 'dark', 'system'].map(value => `<button type="button" role="menuitemradio" aria-checked="false" data-theme-option="${value}"><span aria-hidden="true">${icons[value]}</span><span>${labels[value]}</span><span class="theme-check" aria-hidden="true">✓</span></button>`).join('')}</div>`;
  nav.insertBefore(picker, nav.querySelector('.nav-contact'));

  const pickerToggle = picker.querySelector('.theme-toggle');
  const pickerMenu = picker.querySelector('.theme-menu');
  const setOpen = open => {
    pickerToggle.setAttribute('aria-expanded', String(open));
    pickerMenu.hidden = !open;
    picker.classList.toggle('open', open);
    if (open) pickerMenu.querySelector('[aria-checked="true"]')?.focus();
  };
  pickerToggle.addEventListener('click', () => setOpen(pickerMenu.hidden));
  picker.querySelectorAll('[data-theme-option]').forEach(button => button.addEventListener('click', () => {
    applyTheme(button.dataset.themeOption);
    setOpen(false);
    pickerToggle.focus();
  }));
  picker.addEventListener('keydown', event => {
    if (event.key === 'Escape') { setOpen(false); pickerToggle.focus(); }
  });
  document.addEventListener('click', event => { if (!picker.contains(event.target)) setOpen(false); });
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

// Decorative particle mesh, cursor glow, woven ribbon trail and drifting sparks that react to the pointer.
// It is intentionally disabled for touch-first and reduced-motion devices.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce), (hover: none)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'gesture-trail';
  canvas.setAttribute('aria-hidden', 'true');
  // Positioned inline so the canvas never takes layout space, even if a page lacks the CSS rule.
  canvas.style.cssText = 'position:fixed;inset:0;z-index:30;pointer-events:none';
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  const pointer = { x: -500, y: -500, vx: 0, vy: 0 };
  const trail = [];
  const sparks = [];
  let particles = [];
  let width = 0, height = 0, lastX = -500, lastY = -500;

  // Site palette: rose, lilac, green, peach.
  const palettes = {
    light: [[146, 103, 126], [114, 81, 126], [101, 139, 124], [179, 124, 104]],
    dark: [[239, 179, 210], [211, 174, 223], [145, 197, 176], [216, 163, 142]]
  };
  const rgba = (c, a) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${Math.max(0, Math.min(1, a))})`;
  const mix = (a, b, t) => [0, 1, 2].map(k => Math.round(a[k] + (b[k] - a[k]) * t));

  const resize = () => {
    const scale = Math.min(devicePixelRatio || 1, 2);
    width = innerWidth; height = innerHeight;
    canvas.width = width * scale; canvas.height = height * scale;
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const gap = Math.max(80, Math.min(130, width / 11));
    particles = [];
    for (let y = gap * .5; y < height + gap; y += gap)
      for (let x = gap * .5; x < width + gap; x += gap) {
        // Jitter the nodes so the mesh reads as organic, not as a square grid.
        const jx = x + (Math.random() - .5) * gap * .8, jy = y + (Math.random() - .5) * gap * .8;
        particles.push({ x: jx, y: jy, ox: jx, oy: jy, vx: 0, vy: 0 });
      }
  };

  const move = event => {
    const x = event.clientX, y = event.clientY;
    pointer.vx = x - lastX; pointer.vy = y - lastY;
    pointer.x = x; pointer.y = y; lastX = x; lastY = y;
    const speed = Math.hypot(pointer.vx, pointer.vy);
    trail.push({ x, y, life: 1, size: Math.min(28, 8 + speed * .42) });
    if (trail.length > 34) trail.shift();
    const count = Math.min(5, 1 + Math.floor(speed / 10));
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2, v = .3 + Math.random() * 1.8;
      sparks.push({
        x, y,
        vx: Math.cos(angle) * v - pointer.vx * .06,
        vy: Math.sin(angle) * v - pointer.vy * .06,
        life: 1, decay: .01 + Math.random() * .018,
        size: 1.2 + Math.random() * 2.8, color: Math.floor(Math.random() * 4)
      });
    }
    if (sparks.length > 180) sparks.splice(0, sparks.length - 180);
  };
  const leave = () => { pointer.x = pointer.y = -500; };

  const drawRibbon = (colors, time) => {
    const n = trail.length;
    if (n < 3) return;
    const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    ctx.lineCap = 'round';
    // Pass 1: soft wide glow. Pass 2: colored core that thickens toward the cursor.
    for (const pass of [{ w: 2.6, a: .14 }, { w: 1, a: .5 }]) {
      for (let i = 1; i < n - 1; i++) {
        const t = i / (n - 1), p = trail[i];
        const start = mid(trail[i - 1], p), end = mid(p, trail[i + 1]);
        ctx.strokeStyle = rgba(mix(colors[1], colors[0], t), pass.a * p.life * (.25 + .75 * t));
        ctx.lineWidth = Math.max(.6, p.size * p.life * (.25 + .75 * t) * pass.w);
        ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.quadraticCurveTo(p.x, p.y, end.x, end.y); ctx.stroke();
      }
    }
    // Two thin threads weaving around the ribbon in opposite phase.
    for (const [colorIndex, phase] of [[2, 0], [3, Math.PI]]) {
      ctx.beginPath();
      for (let i = 1; i < n - 1; i++) {
        const prev = trail[i - 1], next = trail[i + 1], p = trail[i];
        let nx = -(next.y - prev.y), ny = next.x - prev.x;
        const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
        const t = i / (n - 1);
        const offset = Math.sin(t * 11 + time * .006 + phase) * p.size * p.life * .9;
        const x = p.x + nx * offset, y = p.y + ny * offset;
        if (i === 1) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(colors[colorIndex], .55 * trail[n - 2].life);
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  };

  const draw = time => {
    ctx.clearRect(0, 0, width, height);
    const darkTheme = document.documentElement.dataset.theme === 'dark';
    const colors = darkTheme ? palettes.dark : palettes.light;
    const active = pointer.x > -400;

    // Mesh physics: nodes are pushed by the pointer and spring back.
    for (const p of particles) {
      const dx = pointer.x - p.x, dy = pointer.y - p.y;
      const distance = Math.hypot(dx, dy) || 1;
      if (distance < 260) {
        const force = (1 - distance / 260) * 1.8;
        p.vx -= dx / distance * force + pointer.vx * .01;
        p.vy -= dy / distance * force + pointer.vy * .01;
      }
      p.vx += (p.ox - p.x) * .012; p.vy += (p.oy - p.y) * .012;
      p.vx *= .87; p.vy *= .87; p.x += p.vx; p.y += p.vy;
    }

    if (active) {
      const glow = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 170);
      glow.addColorStop(0, rgba(colors[0], darkTheme ? .28 : .2));
      glow.addColorStop(.5, rgba(colors[1], darkTheme ? .1 : .07));
      glow.addColorStop(1, rgba(colors[1], 0));
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 170, 0, Math.PI * 2); ctx.fill();
    }

    // Mesh lines, brighter and thicker near the pointer.
    const reach = 175;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d >= reach) continue;
        const fade = 1 - d / reach;
        const near = active ? Math.max(0, 1 - Math.hypot(pointer.x - (a.x + b.x) / 2, pointer.y - (a.y + b.y) / 2) / 280) : 0;
        ctx.strokeStyle = rgba(mix(colors[1], colors[0], near), fade * ((darkTheme ? .1 : .08) + .55 * near));
        ctx.lineWidth = 1 + near * 1.2;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }

    for (const p of particles) {
      const near = active ? Math.max(0, 1 - Math.hypot(pointer.x - p.x, pointer.y - p.y) / 260) : 0;
      ctx.fillStyle = rgba(mix(colors[1], colors[0], near), (darkTheme ? .14 : .12) + .6 * near);
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.8 + 3 * near, 0, Math.PI * 2); ctx.fill();
    }

    for (let i = trail.length - 1; i >= 0; i--) {
      trail[i].life -= .026;
      if (trail[i].life <= 0) trail.splice(i, 1);
    }
    drawRibbon(colors, time || 0);

    // Sparks drift, rise slightly and fade.
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx; s.y += s.vy; s.vx *= .96; s.vy = s.vy * .96 - .015; s.life -= s.decay;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      const c = colors[s.color];
      ctx.fillStyle = rgba(c, .18 * s.life);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size * 2.6 * s.life, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(c, .75 * s.life);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2); ctx.fill();
    }

    requestAnimationFrame(draw);
  };
  addEventListener('resize', resize, { passive: true });
  addEventListener('pointermove', move, { passive: true });
  addEventListener('blur', leave);
  document.documentElement.addEventListener('pointerleave', leave);
  resize(); requestAnimationFrame(draw);
})();

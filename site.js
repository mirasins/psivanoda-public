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


// Calm, slow-following halo behind the content. No grid, trails or particles,
// so it never competes with reading. Disabled on touch and reduced-motion devices.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce), (hover: none)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'gesture-trail';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:1;pointer-events:none';
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  const target = { x: -1000, y: -1000 };
  const halo = { x: -1000, y: -1000, alpha: 0 };
  let width = 0, height = 0, running = false, active = false;

  const resize = () => {
    const scale = Math.min(devicePixelRatio || 1, 2);
    width = innerWidth; height = innerHeight;
    canvas.width = width * scale; canvas.height = height * scale;
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  };

  const draw = () => {
    const visible = active;
    if (halo.x < -900) { halo.x = target.x; halo.y = target.y; }
    halo.x += (target.x - halo.x) * .06;
    halo.y += (target.y - halo.y) * .06;
    halo.alpha += ((visible ? 1 : 0) - halo.alpha) * .04;

    ctx.clearRect(0, 0, width, height);
    if (halo.alpha > .01) {
      const dark = document.documentElement.dataset.theme === 'dark';
      const color = dark ? '211, 174, 223' : '244, 160, 189';
      const peak = (dark ? .10 : .14) * halo.alpha;
      const g = ctx.createRadialGradient(halo.x, halo.y, 0, halo.x, halo.y, 240);
      g.addColorStop(0, `rgba(${color}, ${peak})`);
      g.addColorStop(1, `rgba(${color}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(halo.x - 240, halo.y - 240, 480, 480);
    }

    const settled = Math.abs(target.x - halo.x) < .5 && Math.abs(target.y - halo.y) < .5 &&
      Math.abs((visible ? 1 : 0) - halo.alpha) < .01;
    if (settled) { running = false; return; }
    requestAnimationFrame(draw);
  };
  const wake = () => { if (!running) { running = true; requestAnimationFrame(draw); } };

  addEventListener('resize', () => { resize(); wake(); }, { passive: true });
  addEventListener('pointermove', e => { target.x = e.clientX; target.y = e.clientY; active = true; wake(); }, { passive: true });
  const leave = () => { active = false; wake(); };
  addEventListener('blur', leave);
  document.documentElement.addEventListener('pointerleave', leave);
  resize();
})();

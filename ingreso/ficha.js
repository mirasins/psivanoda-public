// Fichas de ingreso: valida en el navegador y envía al servicio de ingreso (ingreso.psivanoda.cl),
// que registra al paciente en la ficha clínica. El sitio no guarda credenciales ni datos.
(() => {
  const form = document.querySelector('.intake-form');
  if (!form) return;
  const tipo = form.dataset.tipo;
  const status = form.querySelector('.intake-status');
  const button = form.querySelector('button[type=submit]');
  const authField = form.querySelector('[data-under16]');

  // RUT chileno: 7-8 dígitos, guion y dígito verificador calculado con módulo 11.
  // Deja el RUT como 12345678-5: solo dígitos y K final, con el guion antes del dígito verificador.
  const normRut = v => {
    const c = v.toUpperCase().replace(/[^\dK]/g, '');
    return c.length < 2 ? c : c.slice(0, -1).replace(/K/g, '').slice(0, 8) + '-' + c.slice(-1);
  };
  const validRut = value => {
    const m = /^(\d{7,8})-([\dK])$/.exec(normRut(value));
    if (!m) return false;
    let sum = 0, mul = 2;
    for (let i = m[1].length - 1; i >= 0; i--) { sum += +m[1][i] * mul; mul = mul === 7 ? 2 : mul + 1; }
    const dv = 11 - (sum % 11);
    return m[2] === (dv === 11 ? '0' : dv === 10 ? 'K' : String(dv));
  };
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
  const age = iso => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return NaN;
    const [by, bm, bd] = iso.split('-').map(Number), [ty, tm, td] = today.split('-').map(Number);
    return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
  };
  const inRange = a => (tipo === 'adolescente' ? a >= 14 && a < 18 : a >= 18 && a < 120);

  const rules = {
    rut: validRut,
    'tutor-rut': validRut,
    correo: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    'tutor-correo': v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    telefono: v => /^\+?[\d\s()-]{8,20}$/.test(v),
    'tutor-telefono': v => /^\+?[\d\s()-]{8,20}$/.test(v),
    nacimiento: v => inRange(age(v)),
  };

  // Se revisan los obligatorios y, si traen algo escrito, los opcionales con regla (como el teléfono del adolescente).
  const fields = () => [...form.querySelectorAll('input,textarea')].filter(el => (el.required || rules[el.name]) && !el.closest('[hidden]'));
  const check = el => {
    const value = el.value.trim();
    const ok = el.hasAttribute('data-birth-part') ? rules.nacimiento(form.elements.nacimiento.value) :
      el.type === 'checkbox' ? el.checked : value === '' ? !el.required : !rules[el.name] || rules[el.name](value);
    el.closest('.field').classList.toggle('invalid', !ok);
    el.setAttribute('aria-invalid', String(!ok));
    if (el.hasAttribute('data-birth-part')) birthParts.forEach(part => part.setAttribute('aria-invalid', String(!ok)));
    return ok;
  };

  const syncUnder16 = () => {
    if (!authField) return;
    const a = age(form.elements.nacimiento.value);
    authField.hidden = !(a >= 14 && a < 16);
  };

  const isRut = el => el.name === 'rut' || el.name === 'tutor-rut';
  const formatRut = el => {
    const atEnd = el.selectionStart === el.value.length;
    const formatted = normRut(el.value);
    if (formatted === el.value) return;
    el.value = formatted;
    if (atEnd) el.setSelectionRange(formatted.length, formatted.length);
  };

  // Adultos: tres casillas visibles, una sola fecha ISO para el servicio de ingreso.
  const birthParts = [...form.querySelectorAll('[data-birth-part]')];
  const syncBirthDate = () => {
    if (!birthParts.length) return;
    const [day, month, year] = birthParts.map(part => part.value.trim());
    const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const date = new Date(`${iso}T12:00:00Z`);
    const real = /^\d{1,2}$/.test(day) && /^\d{1,2}$/.test(month) && /^\d{4}$/.test(year) &&
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso;
    form.elements.nacimiento.value = real ? iso : '';
    birthParts.forEach(part => part.setCustomValidity(real && rules.nacimiento(iso) ? '' : 'Revisa la fecha de nacimiento.'));
  };
  syncBirthDate();
  form.addEventListener('reset', () => setTimeout(syncBirthDate, 0));

  // Destellos decorativos: no leen ni conservan el contenido de la ficha.
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  // Tres tamaños: «tecleo» (una chispa mínima mientras se escribe), «campo» (abanico al completar un campo)
  // y «seccion» (constelación junto al título cuando se completa todo un recuadro).
  const completed = new WeakSet();
  const doneSections = new WeakSet();
  let lastSpark = -Infinity;
  const STAR = 'M12 2.5c.5 4.6 2.4 6.8 7 7.5-4.6.7-6.5 2.9-7 9.5-.5-6.6-2.4-8.8-7-9.5 4.6-.7 6.5-2.9 7-7.5Z';
  const MOON = 'M19.8 15.1A8.5 8.5 0 0 1 8.9 4.2 8.5 8.5 0 1 0 19.8 15.1Z';
  const SIZES = {
    tecleo: { count: 1, size: [8, 11], reach: [14, 22], spread: [-100, -80], dur: 700 },
    campo: { count: 5, size: [13, 20], reach: [26, 46], spread: [-165, -15], dur: 1050 },
    seccion: { count: 7, size: [12, 21], reach: [30, 62], spread: [-180, 0], dur: 1300 },
  };
  const rand = ([min, max]) => min + Math.random() * (max - min);
  // Punto de origen dentro del recuadro que contiene al elemento: borde derecho del campo, junto a la
  // casilla de verificación, o al final del título de la sección.
  const origin = el => {
    if (el.matches('legend')) {
      const text = document.createRange();
      text.selectNodeContents(el);
      return { x: el.offsetLeft + text.getBoundingClientRect().width + 18, y: el.offsetTop + el.offsetHeight / 2 };
    }
    if (el.type === 'checkbox') return { x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 };
    const y = el.matches('textarea') ? el.offsetTop + 22 : el.offsetTop + el.offsetHeight / 2;
    return { x: el.offsetLeft + el.offsetWidth - 22, y };
  };
  const sparkle = (el, kind = 'tecleo') => {
    const box = el.matches('legend') ? el.closest('fieldset') : el.closest('.field');
    if (reducedMotion.matches || !box || el.closest('[hidden]') || form.hidden) return;
    const cfg = SIZES[kind];
    if (form.querySelectorAll('.intake-spark').length + cfg.count > 24) return;
    const layer = box.querySelector(':scope > .intake-sparkles') || (() => {
      const span = document.createElement('span');
      span.className = 'intake-sparkles';
      span.setAttribute('aria-hidden', 'true');
      box.append(span);
      return span;
    })();
    const { x, y } = origin(el);
    const teen = tipo === 'adolescente';
    for (let i = 0; i < cfg.count; i++) {
      // Ángulos repartidos en abanico (con algo de azar) para que no salgan amontonados.
      const [from, to] = cfg.spread;
      const angle = (from + (to - from) * (cfg.count === 1 ? .5 : i / (cfg.count - 1)) + rand([-9, 9])) * Math.PI / 180;
      const reach = rand(cfg.reach);
      const moon = !teen && kind !== 'tecleo' && i === Math.floor(cfg.count / 2);
      const spark = document.createElement('span');
      spark.className = 'intake-spark' + (moon ? ' intake-spark--moon' : '') + (kind === 'tecleo' ? ' intake-spark--soft' : '');
      spark.style.cssText = `left:${x}px;top:${y}px;--spark-x:${Math.cos(angle) * reach}px;--spark-y:${Math.sin(angle) * reach}px;` +
        `--spark-r:${rand([-40, 40])}deg;--spark-delay:${kind === 'tecleo' ? 0 : i * 45}ms;--spark-size:${rand(cfg.size)}px;--spark-dur:${cfg.dur}ms`;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      const path = document.createElementNS(svg.namespaceURI, 'path');
      path.setAttribute('d', moon ? MOON : STAR);
      svg.append(path);
      spark.append(svg);
      spark.dataset.tone = String(i % 3);
      layer.append(spark);
      const remove = () => { spark.remove(); if (!layer.childElementCount) layer.remove(); };
      spark.addEventListener('animationend', remove, { once: true });
      setTimeout(remove, cfg.dur + 600);
    }
  };
  // Un brillo breve en el borde del campo recién completado.
  const glow = el => {
    if (reducedMotion.matches || el.type === 'checkbox') return;
    el.classList.remove('intake-glow');
    void el.offsetWidth;
    el.classList.add('intake-glow');
    el.addEventListener('animationend', () => el.classList.remove('intake-glow'), { once: true });
  };
  const isComplete = el => {
    if (el.closest('[hidden]')) return true;
    const filled = el.type === 'checkbox' ? el.checked : !!el.value.trim();
    return filled && el.validity.valid && (!rules[el.name] || rules[el.name](el.value.trim()));
  };
  const completeSection = fieldset => {
    if (!fieldset || doneSections.has(fieldset)) return;
    const required = [...fieldset.querySelectorAll('input,textarea')].filter(el => el.required && el.type !== 'hidden');
    if (!required.length || !required.every(isComplete)) return;
    doneSections.add(fieldset);
    const legend = fieldset.querySelector('legend');
    if (legend) setTimeout(() => sparkle(legend, 'seccion'), 350);
  };
  const completeField = el => {
    if (!el.matches('input,textarea') || el.type === 'hidden' || !el.closest('.field') || completed.has(el) || !isComplete(el)) return;
    completed.add(el);
    glow(el);
    sparkle(el, 'campo');
    completeSection(el.closest('fieldset'));
  };
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) form.querySelectorAll('.intake-sparkles').forEach(layer => layer.remove());
  });

  form.addEventListener('focusout', e => {
    if (e.target.hasAttribute('data-birth-part') && e.relatedTarget?.hasAttribute('data-birth-part')) return;
    if (isRut(e.target)) e.target.value = normRut(e.target.value);
    if ((e.target.required || rules[e.target.name]) && e.target.type !== 'checkbox' && e.target.value) check(e.target);
    completeField(e.target);
  });
  form.addEventListener('input', e => {
    if (e.target.hasAttribute('data-birth-part')) syncBirthDate();
    // Mientras se escribe al final se corrige al tiro; si se edita al medio, al salir del campo, para no mover el cursor.
    if (isRut(e.target) && e.target.selectionStart === e.target.value.length) formatRut(e.target);
    if (e.target.closest('.invalid')) check(e.target);
    if (e.target.name === 'nacimiento') syncUnder16();
    completed.delete(e.target);
    // Al escribir, una chispa tenue y espaciada; nunca en el motivo de consulta, para no distraer ahí.
    if (e.target.matches('input:not([type=checkbox])') && e.target.value.trim() && !e.isComposing && performance.now() - lastSpark > 900) {
      lastSpark = performance.now();
      sparkle(e.target, 'tecleo');
    }
  });
  form.addEventListener('change', e => { if (e.target.hasAttribute('data-birth-part')) syncBirthDate(); if (e.target.type === 'checkbox' && e.target.required) check(e.target); if (e.target.name === 'nacimiento') syncUnder16(); });
  form.addEventListener('change', e => completeField(e.target));
  syncUnder16();

  // Verificación anti-spam de Cloudflare (solo si la página trae la clave pública).
  const sitekey = form.dataset.sitekey;
  let widget = null;
  if (sitekey) {
    window.onTurnstileLoad = () => { widget = window.turnstile.render(form.querySelector('.captcha'), { sitekey, language: 'es' }); };
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';
    s.async = true;
    document.head.appendChild(s);
  }

  const say = (text, isError) => { status.textContent = text; status.classList.toggle('is-error', !!isError); };
  const val = name => (form.elements[name] ? form.elements[name].value.trim() : '');
  const on = name => !!(form.elements[name] && form.elements[name].checked && !form.elements[name].closest('[hidden]'));

  // Ficha adolescente: el avión de papel hace su recorrido y, al llegar, revienta el confeti.
  const celebrate = done => {
    if (!done.classList.contains('thanks-play')) return;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    done.querySelectorAll('animateMotion').forEach(a => { if (still) a.setAttribute('dur', '0.01s'); a.beginElement(); });
    if (still) return;
    const box = done.querySelector('.thanks-confetti');
    const colors = ['var(--accent-sky)', 'var(--accent-peach)', 'var(--accent-lilac)'];
    for (let i = 0; i < 28; i++) {
      const s = document.createElement('span'), angle = Math.random() * Math.PI * 2, reach = 90 + Math.random() * 170;
      s.style.cssText = `--x:${Math.cos(angle) * reach}px;--y:${Math.sin(angle) * reach * .6 - 40}px;--r:${(Math.random() - .5) * 720}deg;` +
        `--c:${colors[i % 3]};--d:${(2 + Math.random() * .35).toFixed(2)}s`;
      box.append(s);
    }
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    syncBirthDate();
    const bad = fields().filter(el => !check(el));
    if (bad.length) { bad[0].focus(); say('Revisa los campos marcados.', true); return; }
    const turnstile = widget !== null ? window.turnstile.getResponse(widget) : '';
    if (sitekey && !turnstile) { say('Espera a que termine la verificación de seguridad e inténtalo de nuevo.', true); return; }

    const payload = {
      tipo, turnstile, sitio: val('sitio'),
      nombres: val('nombres'), apellidos: val('apellidos'), rut: normRut(val('rut')),
      nacimiento: val('nacimiento'), correo: val('correo'), telefono: val('telefono'), motivo: val('motivo'),
      condiciones: on('condiciones'), privacidad: on('privacidad'),
    };
    if (tipo === 'adolescente') {
      payload.tutor = {
        nombre: val('tutor-nombre'), rut: normRut(val('tutor-rut')), relacion: val('tutor-relacion'),
        correo: val('tutor-correo'), telefono: val('tutor-telefono'), autoriza: on('tutor-autoriza'),
      };
    }

    button.disabled = true;
    say('Enviando…');
    try {
      const res = await fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        const done = document.getElementById('ficha-enviada');
        form.hidden = true;
        done.hidden = false;
        done.focus();
        celebrate(done);
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (res.status === 422 && Array.isArray(body.fields)) {
        body.fields.forEach(n => { const el = form.elements[n]; if (el) { el.closest('.field').classList.add('invalid'); el.setAttribute('aria-invalid', 'true'); } });
        say('Revisa los campos marcados.', true);
      } else if (body.error === 'captcha') {
        say('No se pudo completar la verificación de seguridad. Inténtalo de nuevo.', true);
      } else {
        say('No se pudo enviar la ficha. Inténtalo de nuevo en unos minutos o escríbeme a agenda@psivanoda.cl.', true);
      }
    } catch {
      say('No se pudo conectar. Revisa tu conexión e inténtalo de nuevo, o escríbeme a agenda@psivanoda.cl.', true);
    }
    if (widget !== null) window.turnstile.reset(widget);
    button.disabled = false;
  });
})();

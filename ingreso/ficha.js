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
    const ok = el.type === 'checkbox' ? el.checked : value === '' ? !el.required : !rules[el.name] || rules[el.name](value);
    el.closest('.field').classList.toggle('invalid', !ok);
    el.setAttribute('aria-invalid', String(!ok));
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

  // Destellos decorativos: no leen ni conservan el contenido de la ficha.
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const completed = new WeakSet();
  let lastSpark = -Infinity;
  const sparkle = (el, count = 2) => {
    const field = el.closest('.field');
    if (reducedMotion.matches || !field || el.closest('[hidden]') || form.hidden) return;
    const layer = field.querySelector('.intake-sparkles') || (() => {
      const box = document.createElement('span');
      box.className = 'intake-sparkles';
      box.setAttribute('aria-hidden', 'true');
      field.append(box);
      return box;
    })();
    if (form.querySelectorAll('.intake-spark').length >= 18) return;
    const top = el.type === 'checkbox' ? 8 : el.offsetTop + 8;
    for (let i = 0; i < count; i++) {
      const spark = document.createElement('span');
      spark.className = 'intake-spark';
      spark.style.cssText = `top:${top}px;--spark-x:${-12 - Math.random() * 34}px;--spark-y:${-24 - Math.random() * 28}px;--spark-r:${Math.random() * 50 - 25}deg;--spark-delay:${i * 85}ms;--spark-size:${12 + Math.random() * 9}px`;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      const path = document.createElementNS(svg.namespaceURI, 'path');
      const moon = count > 2 ? i === 1 : Math.random() < .3;
      spark.classList.toggle('intake-spark--moon', moon);
      path.setAttribute('d', moon
        ? 'M19.8 15.1A8.5 8.5 0 0 1 8.9 4.2 8.5 8.5 0 1 0 19.8 15.1Z'
        : 'm12 2 2.8 6.2 6.7.8-5 4.6 1.4 6.6-5.9-3.4-5.9 3.4 1.4-6.6-5-4.6 6.7-.8Z');
      svg.append(path);
      spark.append(svg);
      layer.append(spark);
      const remove = () => { spark.remove(); if (!layer.childElementCount) layer.remove(); };
      spark.addEventListener('animationend', remove, { once: true });
      setTimeout(remove, 1600);
    }
  };
  const completeField = el => {
    if (!el.matches('input,textarea') || !el.closest('.field') || completed.has(el)) return;
    const filled = el.type === 'checkbox' ? el.checked : !!el.value.trim();
    if (!filled || !el.validity.valid || (rules[el.name] && !rules[el.name](el.value.trim()))) return;
    completed.add(el);
    sparkle(el, 3);
  };
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) form.querySelectorAll('.intake-sparkles').forEach(layer => layer.remove());
  });

  form.addEventListener('focusout', e => {
    if (isRut(e.target)) e.target.value = normRut(e.target.value);
    if ((e.target.required || rules[e.target.name]) && e.target.type !== 'checkbox' && e.target.value) check(e.target);
    completeField(e.target);
  });
  form.addEventListener('input', e => {
    // Mientras se escribe al final se corrige al tiro; si se edita al medio, al salir del campo, para no mover el cursor.
    if (isRut(e.target) && e.target.selectionStart === e.target.value.length) formatRut(e.target);
    if (e.target.closest('.invalid')) check(e.target);
    if (e.target.name === 'nacimiento') syncUnder16();
    completed.delete(e.target);
    if (e.target.matches('input:not([type=checkbox]),textarea') && e.target.value.trim() && !e.isComposing && performance.now() - lastSpark > 450) {
      lastSpark = performance.now();
      sparkle(e.target);
    }
  });
  form.addEventListener('change', e => { if (e.target.type === 'checkbox' && e.target.required) check(e.target); if (e.target.name === 'nacimiento') syncUnder16(); });
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

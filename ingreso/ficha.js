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

  form.addEventListener('focusout', e => {
    if (isRut(e.target)) e.target.value = normRut(e.target.value);
    if ((e.target.required || rules[e.target.name]) && e.target.type !== 'checkbox' && e.target.value) check(e.target);
  });
  form.addEventListener('input', e => {
    // Mientras se escribe al final se corrige al tiro; si se edita al medio, al salir del campo, para no mover el cursor.
    if (isRut(e.target) && e.target.selectionStart === e.target.value.length) formatRut(e.target);
    if (e.target.closest('.invalid')) check(e.target);
    if (e.target.name === 'nacimiento') syncUnder16();
  });
  form.addEventListener('change', e => { if (e.target.type === 'checkbox' && e.target.required) check(e.target); if (e.target.name === 'nacimiento') syncUnder16(); });
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

// Telesora site script. No trackers, no network calls.
(() => {
  const d = document, root = d.documentElement;
  root.classList.remove('no-js'); root.classList.add('js');
  // Every page opens at the top (no carried-over scroll position), unless the link points to a section.
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) { /* ignore */ }
  const toTop = () => { if (!location.hash) { root.style.scrollBehavior = 'auto'; window.scrollTo(0, 0); } };
  toTop(); addEventListener('pageshow', toTop); addEventListener('load', toTop);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const embedded = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  const KEY = 'telesora-lang';
  const store = { get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }, set(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* storage off */ } } };

  // ----- remembered language: arriving from outside on another language goes to the saved one -----
  const lang = d.body.dataset.lang, saved = store.get();
  const external = !d.referrer || (() => { try { return new URL(d.referrer).host !== location.host; } catch (e) { return true; } })();
  if (saved && saved !== lang && external && !sessionStorageFlag()) {
    const a = d.querySelector(`.lang__menu a[data-lang="${saved}"]`);
    if (a) { markFlag(); location.replace(a.href + location.search + location.hash); return; }
  }
  function sessionStorageFlag() { try { return sessionStorage.getItem('telesora-redirected') === '1'; } catch (e) { return true; } }
  function markFlag() { try { sessionStorage.setItem('telesora-redirected', '1'); } catch (e) { /* ignore */ } }

  // ----- generic dropdown closing -----
  const openers = new Set();
  function dropdown(btn, list, onOpen) {
    const api = {
      open() { list.hidden = false; btn.setAttribute('aria-expanded', 'true'); onOpen && onOpen(); },
      close(focus) { if (list.hidden) return; list.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (focus) btn.focus(); },
      toggle() { list.hidden ? api.open() : api.close(); },
      contains: (t) => btn.contains(t) || list.contains(t),
    };
    btn.addEventListener('click', (e) => { e.stopPropagation(); openers.forEach((o) => o !== api && o.close()); api.toggle(); });
    openers.add(api);
    return api;
  }
  d.addEventListener('click', (e) => openers.forEach((o) => { if (!o.contains(e.target)) o.close(); }));
  d.addEventListener('keydown', (e) => { if (e.key === 'Escape') openers.forEach((o) => { const wasOpen = o.contains(d.activeElement); o.close(wasOpen); }); });
  addEventListener('resize', () => openers.forEach((o) => o.close()));

  // ----- language menu -----
  d.querySelectorAll('[data-lang-menu]').forEach((m) => {
    const btn = m.querySelector('button'), list = m.querySelector('ul');
    const dd = dropdown(btn, list, () => { const cur = list.querySelector('[aria-current="true"]') || list.querySelector('a'); cur && cur.focus(); });
    list.addEventListener('keydown', (e) => {
      const items = [...list.querySelectorAll('a')], i = items.indexOf(d.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      if (e.key === 'Tab') dd.close();
    });
    list.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => { store.set(a.dataset.lang); markFlag(); dd.close(); }));
  });

  // ----- keep the active menu item in view on narrow screens -----
  const cur = d.querySelector('.nav [aria-current="page"]'), nav = d.querySelector('.nav');
  if (cur && nav && nav.scrollWidth > nav.clientWidth) nav.scrollLeft += cur.getBoundingClientRect().left - nav.getBoundingClientRect().left - (nav.clientWidth - cur.offsetWidth) / 2;

  // ----- copy helpers -----
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const t = d.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.className = 'visually-hidden'; d.body.append(t); t.select();
      let ok = false; try { ok = d.execCommand('copy'); } catch (e2) { ok = false; } t.remove(); return ok;
    }
  }
  const copiedWord = (d.querySelector('[data-i18n]') && JSON.parse(d.querySelector('[data-i18n]').textContent).copied) || 'Copied';
  d.querySelectorAll('[data-copy]').forEach((a) => a.addEventListener('click', async (e) => {
    if (!embedded) return; // a real browser tab opens the mail app
    e.preventDefault();
    await copy(a.dataset.copy);
    let tip = a.querySelector('.copytip');
    if (!tip) { tip = d.createElement('span'); tip.className = 'copytip'; tip.setAttribute('role', 'status'); a.append(tip); }
    tip.textContent = copiedWord; clearTimeout(a._t); a._t = setTimeout(() => tip.remove(), 1800);
  }));

  // ----- app preview: 4 seconds a scene, loops, steps stay in sync -----
  d.querySelectorAll('[data-demo]').forEach((box) => {
    const ph = box.querySelector('[data-phone]'); if (!ph) return;
    const scenes = [...ph.querySelectorAll('.scene')], bars = [...ph.querySelectorAll('.ph-bar span')], btns = [...box.querySelectorAll('[data-go]')];
    let i = 0, timer = null, visible = false;
    function show(n) {
      i = (n + scenes.length) % scenes.length;
      scenes.forEach((s, k) => { const on = k === i; s.classList.toggle('on', on); s.toggleAttribute('aria-hidden', !on); if (on) { s.removeAttribute('aria-hidden'); } else s.setAttribute('aria-hidden', 'true'); });
      bars.forEach((b, k) => { b.classList.toggle('done', k < i); b.classList.remove('now'); });
      if (!reduce) { void bars[i].offsetWidth; bars[i].classList.add('now'); } else bars[i].classList.add('done');
      btns.forEach((b, k) => { if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    }
    function run() { stop(); if (reduce || !visible || d.hidden) return; timer = setTimeout(() => { show(i + 1); run(); }, 4000); }
    function stop() { clearTimeout(timer); timer = null; }
    btns.forEach((b, k) => b.addEventListener('click', () => { show(k); run(); }));
    new IntersectionObserver((es) => es.forEach((e) => { visible = e.isIntersecting; if (visible) { show(i); run(); } else stop(); }), { threshold: 0.35 }).observe(ph);
    d.addEventListener('visibilitychange', () => (d.hidden ? stop() : run()));
    show(0);
  });

  // ----- role switcher (tabs) -----
  d.querySelectorAll('[data-switch]').forEach((sw) => {
    const tabs = [...sw.querySelectorAll('[role="tab"]')];
    const sel = (t, focus) => { tabs.forEach((x) => { const on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; d.getElementById(x.getAttribute('aria-controls')).hidden = !on; }); if (focus) t.focus(); };
    tabs.forEach((t, k) => {
      t.addEventListener('click', () => sel(t));
      t.addEventListener('keydown', (e) => {
        const n = { ArrowRight: k + 1, ArrowLeft: k - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (n !== undefined) { e.preventDefault(); sel(tabs[(n + tabs.length) % tabs.length], true); }
      });
    });
  });

  // ----- contact wizard -----
  const form = d.getElementById('wiz');
  if (form) {
    const T = JSON.parse(form.querySelector('[data-i18n]').textContent);
    const steps = [...form.querySelectorAll('[data-step]')], dots = [...form.querySelectorAll('.wiz__steps li')];
    const back = form.querySelector('[data-back]'), next = form.querySelector('[data-next]'), send = form.querySelector('[data-send]');
    const done = form.querySelector('[data-done]'), status = form.querySelector('[data-step-status]'), nav = form.querySelector('.wiz__nav');
    const $ = (id) => d.getElementById(id);
    let step = 0;

    // custom select
    const sbox = form.querySelector('[data-select]'), sbtn = sbox.querySelector('button'), slist = sbox.querySelector('[role="listbox"]'), sval = $('f-topic-val');
    const opts = [...slist.querySelectorAll('[role="option"]')];
    let active = -1;
    const sdd = dropdown(sbtn, slist, () => { const k = Math.max(0, opts.findIndex((o) => o.getAttribute('aria-selected') === 'true')); setActive(k); slist.focus(); });
    function setActive(k) { active = k; opts.forEach((o, j) => o.classList.toggle('active', j === k)); slist.setAttribute('aria-activedescendant', opts[k].id); opts[k].scrollIntoView({ block: 'nearest' }); }
    function choose(k) {
      opts.forEach((o, j) => o.setAttribute('aria-selected', j === k));
      sval.value = opts[k].dataset.value; sbtn.querySelector('span').textContent = opts[k].textContent; sbtn.querySelector('span').classList.remove('ph');
      sdd.close(true); clearErr('topic', sbtn);
    }
    opts.forEach((o, k) => o.addEventListener('click', (e) => { e.stopPropagation(); choose(k); }));
    sbtn.addEventListener('keydown', (e) => { if (['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); sdd.open(); } });
    slist.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(opts.length - 1, active + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(0, active - 1)); }
      else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
      else if (e.key === 'End') { e.preventDefault(); setActive(opts.length - 1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
      else if (e.key === 'Tab') sdd.close();
      else if (e.key.length === 1) { const k = opts.findIndex((o) => o.textContent.toLowerCase().startsWith(e.key.toLowerCase())); if (k > -1) setActive(k); }
    });
    const pre = new URLSearchParams(location.search).get('topic');
    if (pre) { const k = opts.findIndex((o) => o.dataset.value === pre); if (k > -1) { choose(k); sdd.close(); } }

    function setErr(key, el, msg) { $('e-' + key).textContent = msg; el.setAttribute('aria-invalid', 'true'); }
    function clearErr(key, el) { $('e-' + key).textContent = ''; el.removeAttribute('aria-invalid'); }
    const emailOk = (v) => /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(v);
    function validate(n) {
      let first = null;
      const need = (key, el, ok) => { if (!ok) { setErr(key, el, T.err[key]); first = first || el; } else clearErr(key, el); };
      if (n === 0) {
        need('name', $('f-name'), $('f-name').value.trim().length > 1);
        need('email', $('f-email'), emailOk($('f-email').value.trim()));
        need('country', $('f-country'), $('f-country').value.trim().length > 1);
      }
      if (n === 1) {
        need('topic', sbtn, !!sval.value);
        need('message', $('f-message'), $('f-message').value.trim().length > 2);
      }
      if (n === 2) need('consent', $('f-consent'), $('f-consent').checked);
      if (first) first.focus();
      return !first;
    }
    ['name', 'email', 'country', 'message'].forEach((k) => $('f-' + k).addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid')) validate(step); }));
    $('f-consent').addEventListener('change', () => { if ($('f-consent').checked) clearErr('consent', $('f-consent')); });

    function topicText() { const o = opts.find((x) => x.getAttribute('aria-selected') === 'true'); return o ? o.textContent : ''; }
    function values() { return { name: $('f-name').value.trim(), email: $('f-email').value.trim(), country: $('f-country').value.trim(), topic: topicText(), message: $('f-message').value.trim() }; }
    function renderReview() {
      const v = values(), dl = form.querySelector('[data-review]'); dl.textContent = '';
      Object.keys(T.labels).forEach((k) => { const r = d.createElement('div'), dt = d.createElement('dt'), dd = d.createElement('dd'); dt.textContent = T.labels[k]; dd.textContent = v[k]; r.append(dt, dd); dl.append(r); });
    }
    function go(n, focus = true) {
      step = n;
      steps.forEach((s, k) => (s.hidden = k !== n));
      dots.forEach((li, k) => { li.classList.toggle('on', k === n); li.classList.toggle('done', k < n); });
      back.hidden = n === 0; next.hidden = n === 2; send.hidden = n !== 2;
      status.textContent = T.steps[n];
      if (n === 2) renderReview();
      if (focus) { const f = steps[n].querySelector('input:not([type=hidden]), button, textarea'); f && f.focus(); }
    }
    next.addEventListener('click', () => { if (validate(step)) go(step + 1); });
    back.addEventListener('click', () => go(step - 1));
    form.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') { e.preventDefault(); next.hidden ? send.click() : next.click(); } });

    function mailText(v) {
      return `${T.mail.name}: ${v.name}\n${T.mail.email}: ${v.email}\n${T.mail.country}: ${v.country}\n${T.mail.topic}: ${v.topic}\n\n${T.mail.message}:\n${v.message}\n\n${T.mail.consent}`;
    }
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validate(2)) return;
      const v = values(), body = mailText(v), subject = `${form.dataset.subject}: ${v.topic}`;
      const href = `mailto:${form.dataset.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      form.querySelector('[data-mailtext]').textContent = `${subject}\n\n${body}`;
      const open = form.querySelector('[data-open]'); open.href = href;
      steps.forEach((s) => (s.hidden = true)); nav.hidden = true; form.querySelector('.wiz__steps').hidden = true; done.hidden = false; done.focus();
      if (!embedded) { try { location.href = href; } catch (err) { /* the panel stays */ } }
    });
    form.querySelector('[data-copytext]').addEventListener('click', async (e) => {
      const b = e.currentTarget, old = b.textContent;
      const ok = await copy(form.querySelector('[data-mailtext]').textContent);
      if (ok) { b.textContent = b.dataset.copied; setTimeout(() => (b.textContent = old), 1800); }
    });
    form.querySelector('[data-open]').addEventListener('click', async (e) => {
      if (!embedded) return;
      e.preventDefault(); await copy(form.querySelector('[data-mailtext]').textContent);
      const b = e.currentTarget, html = b.innerHTML; b.textContent = T.copied; setTimeout(() => (b.innerHTML = html), 1800);
    });
    form.querySelector('[data-edit]').addEventListener('click', () => { done.hidden = true; nav.hidden = false; form.querySelector('.wiz__steps').hidden = false; go(1); });
    go(0, false);
  }
})();

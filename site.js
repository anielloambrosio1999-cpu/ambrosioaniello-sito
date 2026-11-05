
(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  /* animations always on: many office PCs have Windows animations switched off, which would freeze the site */
  const reduce = false;
  document.documentElement.classList.add(reduce ? 'no-anim' : 'anim');
  const LAUNCH = new Date('2027-01-31T00:00:00+01:00');
  const toLaunch = () => Math.max(0, Math.ceil((LAUNCH - Date.now()) / 864e5));
  $$('[data-count="zeppo"]').forEach(el => el.textContent = toLaunch());
  const go = sel => { const t = $(sel); if (t) t.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block:'start'}); };

  /* ---------- language ---------- */
  let lang = 'it';
  try { if (localStorage.getItem('aa-lang') === 'en') lang = 'en'; } catch (_) {}
  const T = (it, en) => lang === 'en' ? en : it;
  function applyLang(){
    document.documentElement.lang = lang;
    $$('[data-en]').forEach(el => {
      if (el.dataset.it === undefined) el.dataset.it = el.innerHTML;
      el.innerHTML = lang === 'en' ? el.dataset.en : el.dataset.it;
    });
    $$('[data-en-ph]').forEach(el => { if (el.dataset.itPh === undefined) el.dataset.itPh = el.placeholder; el.placeholder = lang === 'en' ? el.dataset.enPh : el.dataset.itPh; });
    $$('[data-en-alt]').forEach(el => { if (el.dataset.itAlt === undefined) el.dataset.itAlt = el.alt; el.alt = lang === 'en' ? el.dataset.enAlt : el.dataset.itAlt; });
    $$('[data-en-title]').forEach(el => { if (el.dataset.itTitle === undefined) el.dataset.itTitle = el.title; el.title = lang === 'en' ? el.dataset.enTitle : el.dataset.itTitle; });
    $$('[data-en-aria]').forEach(el => { if (el.dataset.itAria === undefined) el.dataset.itAria = el.getAttribute('aria-label'); el.setAttribute('aria-label', lang === 'en' ? el.dataset.enAria : el.dataset.itAria); });
    if (calReady) renderCal();
    const b = $('#lang'); b.textContent = lang === 'en' ? 'IT' : 'EN'; b.setAttribute('aria-label', lang === 'en' ? 'Leggi in italiano' : 'Read in English');
    document.title = T(...TITLES[view]);
    fixLinks();
    splitWords();
    try { localStorage.setItem('aa-lang', lang); } catch (_) {}
  }
  $('#lang').addEventListener('click', () => { lang = lang === 'en' ? 'it' : 'en'; applyLang(); requestAnimationFrame(onScroll); });

  /* ---------- router ----------
     Prototype: one page, views in the hash (#gj, #zeppo, #privacy).
     Real site: each view has its own address, given by window.AA_ROUTES in the Webflow code,
     e.g. {home:'/', gj:'/giorgia-e-johns', zeppo:'/zeppo', privacy:'/privacy'}. Old "#gj" links still work.
     The Webflow 404 page also sets window.AA_VIEW = 'nf'. */
  const views = ['home','gj','zeppo','privacy','nf'];
  const R = window.AA_ROUTES || null;
  const clean = p => (p || '/').replace(/\/+$/, '') || '/';
  const TITLES = {
    home: ['Aniello Ambrosio — Aziende vere. Numeri veri. Errori veri.', 'Aniello Ambrosio — Real companies. Real numbers. Real mistakes.'],
    gj: ['Giorgia & Johns — Aniello Ambrosio', 'Giorgia & Johns — Aniello Ambrosio'],
    zeppo: ['Zeppo, pasticceria senza glutine — Aniello Ambrosio', 'Zeppo, gluten-free pastry — Aniello Ambrosio'],
    privacy: ['Privacy e cookie — Aniello Ambrosio', 'Privacy and cookies — Aniello Ambrosio'],
    nf: ['Pagina non trovata — Aniello Ambrosio', 'Page not found — Aniello Ambrosio']
  };
  let view = 'home';
  const urlFor = (v, anchor) => R ? (R[v] || R.home) + (anchor ? '#' + anchor : '') : '#' + (anchor || v);
  // a "#..." link means a view (#gj), a section inside a view (#gj-b2b) or a section of a view (#work)
  function parseHash(h){
    h = (h || '').replace(/^#/, '');
    if (!h) return null;
    const v = h.split('-')[0];
    if (views.includes(v)) return {v, anchor: h.includes('-') ? h : ''};
    const el = document.getElementById(h), host = el && el.closest('.view');
    return {v: host ? host.dataset.view : null, anchor: el ? h : ''};
  }
  function current(){
    const p = parseHash(location.hash);
    if (!R) return {v: (p && p.v) || 'home', anchor: p ? p.anchor : ''};
    const path = clean(location.pathname);
    // the 404 page sets window.AA_VIEW = 'nf': any address that is not one of ours shows it
    let v = views.find(k => R[k] && clean(R[k]) === path) || window.AA_VIEW || 'home';
    if (p && p.v && p.v !== v) { v = p.v; history.replaceState(null, '', urlFor(v, p.anchor)); }
    return {v, anchor: p ? p.anchor : ''};
  }
  function show(){
    const c = current(); view = c.v;
    $$('.view').forEach(el => el.hidden = el.dataset.view !== view);
    $$('.nav .links a').forEach(a => { if (a.dataset.v === view) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
    document.title = T(...TITLES[view]);
    const target = c.anchor && document.getElementById(c.anchor);
    if (target) requestAnimationFrame(() => target.scrollIntoView({block:'start'})); else window.scrollTo(0, 0);
    requestAnimationFrame(onScroll);
  }
  function fixLinks(){
    if (!R) return;
    $$('a[href^="#"]').forEach(a => { const p = parseHash(a.getAttribute('href')); if (p && p.v) a.setAttribute('href', urlFor(p.v, p.anchor)); });
  }
  if (R) {
    document.addEventListener('click', e => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || !views.some(k => R[k] && clean(R[k]) === clean(u.pathname))) return;
      e.preventDefault();
      if (u.pathname + u.hash !== location.pathname + location.hash) history.pushState(null, '', u.pathname + u.hash);
      show();
    });
    addEventListener('popstate', show);
  }
  addEventListener('hashchange', show);

  /* ---------- reveal + videos ---------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), {threshold:.12});
    $$('.rv').forEach(el => io.observe(el));
    const vio = new IntersectionObserver(es => es.forEach(e => { const v = e.target; if (e.isIntersecting && !reduce) v.play().catch(() => {}); else v.pause(); }), {threshold:.2});
    $$('video').forEach(v => vio.observe(v));
  } else { $$('.rv').forEach(el => el.classList.add('in')); }

  /* ---------- photo strip: moves on its own, and can be swiped or dragged ---------- */
  const box = $('#marqbox'), mq = $('#marq');
  const n = mq.children.length;
  const copy = mq.innerHTML.replace(/alt="[^"]*"/g, 'alt="" aria-hidden="true"');
  mq.innerHTML += copy + copy;                       /* three identical copies, so the loop never shows a seam */
  const imgs = $$('img', mq);
  const W = () => imgs[n].offsetLeft - imgs[0].offsetLeft;   /* width of one copy, gap included */
  const SPEED = 90;                                  /* pixels per second at full speed */
  const RAMP = 1600;                                 /* ms to ease back to full speed after a swipe */
  let acc = 0, last = 0, resumeAt = 0, holding = false, dragging = false, sx = 0, sl = 0, started = false;
  const wrap = () => { const w = W(); if (!w) return; if (box.scrollLeft >= 1.5 * w) box.scrollLeft -= w; else if (box.scrollLeft < 0.5 * w) box.scrollLeft += w; };
  const hold = () => { holding = true; };
  const release = ms => { holding = false; resumeAt = performance.now() + ms; };
  function tick(t){
    if (!started && W()) { box.scrollLeft = W(); started = true; }
    const dt = last ? Math.min(.05, (t - last) / 1000) : 0; last = t;
    const now = performance.now();
    const visible = !box.closest('.view').hidden;
    if (!reduce && visible && started && !holding && !dragging && now > resumeAt) {
      const f = Math.min(1, (now - resumeAt) / RAMP), ease = f * f * (3 - 2 * f);   /* starts slow, then back to normal */
      acc += SPEED * ease * dt;
      const step = Math.floor(acc);
      if (step >= 1) { box.scrollLeft += step; acc -= step; }
    }
    if (started) wrap();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  /* finger: stop while touching, wait for the flick to settle, then ease back in */
  box.addEventListener('touchstart', hold, {passive:true});
  box.addEventListener('touchend', () => release(900), {passive:true});
  box.addEventListener('touchcancel', () => release(900), {passive:true});
  box.addEventListener('wheel', () => { resumeAt = performance.now() + 1200; }, {passive:true});
  box.addEventListener('keydown', () => { resumeAt = performance.now() + 2000; });
  /* mouse: drag like a finger */
  box.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse') return;
    dragging = true; sx = e.clientX; sl = box.scrollLeft; box.classList.add('drag'); box.setPointerCapture(e.pointerId);
  });
  box.addEventListener('pointermove', e => { if (!dragging) return; box.scrollLeft = sl - (e.clientX - sx); wrap(); if (Math.abs(e.clientX - sx) > 3) { sl = box.scrollLeft; sx = e.clientX; } });
  const endDrag = () => { if (!dragging) return; dragging = false; box.classList.remove('drag'); release(900); };
  box.addEventListener('pointerup', endDrag); box.addEventListener('pointercancel', endDrag);
  /* while the flick is still gliding, keep the strip waiting */
  box.addEventListener('scroll', () => {
    if (!dragging) wrap();
    const now = performance.now();
    if (holding || now < resumeAt) resumeAt = Math.max(resumeAt, now + 500);
  }, {passive:true});

  /* ---------- manifesto + nav colour ---------- */
  const say = $('#say'), sayP = $('#manifesto');
  let spans = [];
  function splitWords(){
    const words = (lang === 'en' ? sayP.dataset.en : sayP.dataset.it || sayP.textContent).replace(/<[^>]+>/g, '').trim().split(/\s+/);
    sayP.textContent = '';
    words.forEach((w, i) => { const s = document.createElement('span'); s.textContent = w + (i < words.length - 1 ? ' ' : ''); sayP.appendChild(s); });
    spans = $$('span', sayP);
  }
  const nav = $('#nav');
  function onScroll(){
    const vh = innerHeight;
    if (!reduce && !say.closest('.view').hidden) {
      const r = say.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (-r.top + vh * .2) / (r.height - vh * .8)));
      const lit = Math.round(p * spans.length);
      spans.forEach((s, i) => s.classList.toggle('lit', i < lit));
    }
    const y = nav.offsetHeight / 2;
    const under = $$('[data-theme]').filter(el => el !== nav && !el.closest('.view[hidden]')).find(el => { const b = el.getBoundingClientRect(); return b.top <= y && b.bottom > y; });
    nav.dataset.theme = under ? under.dataset.theme : 'light';
    nav.classList.toggle('scrolled', scrollY > 40);
  }
  addEventListener('scroll', onScroll, {passive:true}); addEventListener('resize', onScroll);

  $$('[data-scroll]').forEach(b => b.addEventListener('click', () => go(b.dataset.scroll)));

  /* ---------- book a call: the calendar opens in place of the photos (prototype stand-in for Calendly) ---------- */
  const calBox = $('#cal'), collage = $('#work .collage');
  const cal = { motive: null, min: 30, day: null, time: null };
  const SLOTS = ['10:00','11:00','12:00','15:00','16:00','17:00','18:00'];
  const calDays = () => { const out = []; const d = new Date(); d.setHours(12,0,0,0); while (out.length < 6) { d.setDate(d.getDate() + 1); const w = d.getDay(); if (w && w < 6) out.push(new Date(d)); } return out; };
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  const fmt = (d, o) => new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'it-IT', o).format(d);
  function renderCal(){
    if (!cal.motive) return;
    $('#cal-motive').textContent = lang === 'en' ? cal.motive.dataset.calEn : cal.motive.dataset.cal;
    $$('.cal-dur button').forEach(b => b.setAttribute('aria-checked', String(+b.dataset.min === cal.min)));
    const days = calDays(); if (!cal.day) cal.day = days[0].toDateString();
    $('#cal-days').replaceChildren(...days.map(d => { const b = document.createElement('button'); b.type = 'button'; b.className = 'cal-day'; b.setAttribute('aria-pressed', String(d.toDateString() === cal.day)); b.innerHTML = '<small>' + fmt(d, {weekday:'short'}) + '</small><b>' + d.getDate() + '</b><small>' + fmt(d, {month:'short'}) + '</small>'; b.onclick = () => { cal.day = d.toDateString(); renderCal(); }; return b; }));
    const seed = new Date(cal.day).getDate();
    const free = SLOTS.filter((t, i) => (i + seed) % 3 !== 0);
    $('#cal-times').replaceChildren(...free.map(t => { const b = document.createElement('button'); b.type = 'button'; b.className = 'cal-time'; b.textContent = t; b.onclick = () => { cal.time = t; step(2); }; return b; }));
    if (cal.time) $('#cal-when').textContent = cap(fmt(new Date(cal.day), {weekday:'long', day:'numeric', month:'long'}) + ', ' + cal.time + ' \u00b7 ' + cal.min + ' min');
  }
  function step(n){
    ['#cal-s1','#cal-s2','#cal-s3'].forEach((id, i) => $(id).hidden = i !== n - 1);
    $('.cal-dur').hidden = n === 3;
    renderCal();
  }
  /* On the real site (Webflow) the box holds the Calendly calendar instead of the stand-in. */
  const LIVE = /(^|\.)ambrosioaniello\.com$|\.webflow\.io$/.test(location.hostname);
  const CAL_URL = 'https://calendly.com/aniello-ambrosio-1999/30min';
  function liveCal(motive){
    ['#cal-s1','#cal-s2','#cal-s3'].forEach(id => $(id).hidden = true);
    $('.cal-dur').hidden = true; $('.cal-note').hidden = true;
    const box = $('#cal-live'); box.hidden = false; box.replaceChildren();
    const url = CAL_URL + '?hide_gdpr_banner=1&a1=' + encodeURIComponent(motive) + (lang === 'en' ? '&locale=en' : '');
    let tries = 0;
    const init = () => { if (window.Calendly && Calendly.initInlineWidget) Calendly.initInlineWidget({url, parentElement: box}); else if (tries++ < 50) setTimeout(init, 200); };
    init();
  }
  $$('[data-cal]').forEach(btn => btn.addEventListener('click', () => {
    cal.motive = btn; cal.time = null;
    collage.hidden = true; calBox.hidden = false;
    $('#cal-motive').textContent = lang === 'en' ? btn.dataset.calEn : btn.dataset.cal;
    if (LIVE) liveCal(lang === 'en' ? btn.dataset.calEn : btn.dataset.cal); else step(1);
    $$('[data-cal]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    calBox.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block:'center'});
  }));
  $$('.cal-dur button').forEach(b => b.addEventListener('click', () => { cal.min = +b.dataset.min; renderCal(); }));
  $('#cal-back').addEventListener('click', () => step(1));
  $('#cal-x').addEventListener('click', () => { calBox.hidden = true; collage.hidden = false; $$('[data-cal]').forEach(b => b.removeAttribute('aria-pressed')); });
  var calReady = true;
  $('#cal-s2').addEventListener('submit', e => { e.preventDefault(); $('#cal-done-t').textContent = T('Call prenotata: ', 'Call booked: ') + $('#cal-when').textContent.replace(/^./, m => m.toLowerCase()) + '.'; step(3); });

  /* ---------- cookie bar (prototype: the choice stays in this browser) ---------- */
  const ck = $('#cookie');
  let ckChoice = null; try { ckChoice = localStorage.getItem('aa-cookie'); } catch (_) {}
  if (!ckChoice) ck.hidden = false;
  $$('[data-ck]').forEach(b => b.addEventListener('click', () => { try { localStorage.setItem('aa-cookie', b.dataset.ck); } catch (_) {} ck.hidden = true; }));

  /* ---------- forms: in the prototype nothing is sent; on the real site they go through the hidden Webflow form "Contatti sito" ---------- */
  const note = (box, cls, it, en) => { const p = document.createElement('p'); p.className = cls; p.setAttribute('role','status'); p.textContent = T(it, en); return p; };
  $$('[data-form]').forEach(box => {
    const f = $('form', box);
    f.addEventListener('submit', e => {
      e.preventDefault();
      const nat = document.querySelector('[data-aa-native] form');
      if (!(LIVE && nat && window.jQuery)) {
        box.replaceChildren(note(box, 'ok', 'Fatto. Nel prototipo non viene inviato niente: nel sito vero la richiesta arriva al team giusto.', 'Done. In the prototype nothing is sent: on the real site the request reaches the right team.'));
        return;
      }
      const wrap = nat.closest('[data-aa-native]'), done = wrap.querySelector('.w-form-done'), fail = wrap.querySelector('.w-form-fail');
      const put = (k, v) => { const el = nat.querySelector('#aa-' + k); if (el) el.value = v || ''; };
      ['tipo','nome','email','negozio','citta','contatto','preferenza','showroom','lingua','consenso','sezione'].forEach(k => put(k, ''));
      const vals = $$('input:not([type=checkbox]), select', f).map(el => el.value.trim());
      (box.dataset.keys || '').split(',').forEach((k, i) => put(k, vals[i]));
      put('tipo', box.dataset.tipo); put('lingua', lang.toUpperCase()); put('sezione', view);
      put('consenso', 'Sì, ' + new Date().toLocaleString('it-IT'));
      nat.style.display = ''; done.style.display = 'none'; fail.style.display = 'none';
      const btn = $('[type=submit]', f); if (btn) btn.disabled = true;
      jQuery(nat).trigger('submit');
      let n = 0;
      const poll = setInterval(() => {
        const ok = getComputedStyle(done).display !== 'none' && done.style.display === 'block', ko = fail.style.display === 'block';
        if (!ok && !ko && ++n < 80) return;
        clearInterval(poll); if (btn) btn.disabled = false;
        if (ok) box.replaceChildren(note(box, 'ok', 'Fatto, ricevuto. Ti rispondiamo presto.', 'Done, received. We will get back to you soon.'));
        else { const old = $('.ko', box); if (old) old.remove(); f.appendChild(note(box, 'ko', 'Non è partito. Riprova tra un attimo.', 'It did not go through. Please try again in a moment.')); }
      }, 250);
    });
  });

  /* ---------- chat ---------- */
  const FACTS = `Sei l'assistente del sito di Aniello Ambrosio e rispondi in prima persona come se fossi lui, con tono diretto e semplice, massimo 70 parole. Usa SOLO questi fatti. Se la domanda chiede qualcosa che non è qui, dillo con onestà e invita a scrivergli su Instagram. Non inventare numeri, nomi, date o risultati. Niente consigli finanziari o di investimento. Non parlare di vita privata, famiglia oltre a quanto scritto, immobili o soldi personali.

FATTI:
- Mi chiamo Aniello Ambrosio, sono di Napoli.
- Next Gen di Giorgia & Johns: l'azienda di moda donna della mia famiglia ("Contemporary avantgarde fashion brand"), con 17 negozi (il numero cambia tra aperture e chiusure), un e-commerce (giorgiaejohns.it) e una rete vendita B2B, online e negli showroom di Nola, Roma, Bologna, Catania e Milano. Da febbraio 2026 guido la sua trasformazione digitale: negozi online collegati al gestionale, clienti, dati e automazione con l'AI. Sul sito c'è una pagina G&J per chi ha un negozio e vuole vendere G&J; chi compra per sé va su giorgiaejohns.it. Tutti i negozi G&J sono diretti: non si aprono negozi in affiliazione o franchising.
- Co-Founder di Zeppo (società RAGA S.r.l., fondata ad aprile 2026 con i miei soci): pasticceria senza glutine e senza lattosio dal nostro laboratorio, per bar, ristoranti, hotel e per casa. Seguo marketing, brand ed e-commerce. A ottobre 2026 abbiamo firmato il laboratorio. L'apertura è prevista nel 2027: non dare date più precise. Instagram: @hey.zeppo. Motto: di sapore, non di glutine. Sulla pagina Zeppo i locali possono chiedere un assaggio dei prodotti e i privati lasciare la mail per sapere quando apriamo.
- Founder di AmbrosioAniello.com: racconto come si costruiscono aziende da dentro, con il lavoro, i numeri e gli errori. Video su Instagram, YouTube, TikTok e LinkedIn; ogni lunedì il riassunto della settimana via mail.
- Storia: a 16 anni sognavo di fare l'imprenditore. A 17 i primi investimenti: ho perso tutto. Economia all'Università Cattolica. Un brand di abbigliamento, City Hall Supply, che ho messo in pausa. Sei mesi in un fondo di M&A a Milano (2024).
- I miei pilastri: lavoro duro, tentare l'impossibile, imparare in prima persona, corpo e mente (allenamento, Hyrox, alimentazione, lettura).
- Lavorare insieme: oggi faccio consulenza solo alle mie due aziende, più avanti aprirò qualche posto. Intanto si può prenotare una videochiamata di 30 minuti (mai di più): "Parliamo di lavoro" oppure "Raccontami qualcosa".
- Firma: Remember why you started.

ALLA FINE della risposta, su una riga a parte, scrivi esattamente una di queste etichette, la più utile per chi chiede: [PORTA:seguimi] [PORTA:gj] [PORTA:zeppo] [PORTA:lavoriamo] [PORTA:nessuna]`;
  const DOORS = {
    seguimi: [['Seguimi su Instagram', 'Follow me on Instagram'], 'https://instagram.com/anielloambrosio'],
    gj: [['Vai alla pagina G&J', 'Go to the G&J page'], '#gj'],
    zeppo: [['Vai alla pagina Zeppo', 'Go to the Zeppo page'], '#zeppo'],
    lavoriamo: [['Prenota una call', 'Book a call'], 'go:#work']
  };
  const FALLBACK = {
    build: [['Due aziende e un racconto. La trasformazione digitale di Giorgia & Johns, l\'azienda di moda della mia famiglia. Zeppo, la pasticceria senza glutine e senza lattosio che apriamo nel 2027. E questo sito, dove ti mostro tutto mentre succede.', 'Two companies and a story. The digital transformation of Giorgia & Johns, my family\'s fashion company. Zeppo, the gluten-free and lactose-free pastry brand opening in 2027. And this site, where I show you everything as it happens.'], 'seguimi'],
    who: [['Sono Aniello, di Napoli. A 17 anni ho fatto i primi investimenti e ho perso tutto. Da allora ci riprovo: oggi lavoro in Giorgia & Johns, ho fondato Zeppo con i miei soci e racconto tutto qui.', 'I\'m Aniello, from Naples. At 17 I made my first investments and lost everything. I\'ve kept trying ever since: today I work at Giorgia & Johns, I co-founded Zeppo with my partners and I share it all here.'], 'seguimi'],
    gj: [['È l\'azienda di moda donna della mia famiglia: 17 negozi, un e-commerce e una rete vendita B2B, online e negli showroom. Da febbraio 2026 ne guido la trasformazione digitale. Se hai un negozio, nella pagina G&J trovi come diventare rivenditore.', 'It\'s my family\'s womenswear company: 17 stores, an e-commerce and a B2B sales network, online and in showrooms. Since February 2026 I\'ve been leading its digital transformation. If you have a store, the G&J page shows you how to become a retailer.'], 'gj'],
    zeppo: [['Una pasticceria senza glutine e senza lattosio, per bar, ristoranti, hotel e per casa. L\'abbiamo fondata ad aprile 2026, a ottobre abbiamo firmato il laboratorio e apriamo nel 2027. Di sapore, non di glutine.', 'A gluten-free and lactose-free pastry brand for bars, restaurants, hotels and homes. We founded it in April 2026, signed the lab in October and open in 2027. Full of flavour, free of gluten.'], 'zeppo'],
    work: [['Oggi faccio consulenza solo alle mie due aziende, più avanti aprirò qualche posto. Intanto prenota una call di 30 minuti: puoi scegliere se parlare di lavoro o semplicemente raccontarmi qualcosa.', 'Today I only consult for my two companies; later on I\'ll open a few spots. Meanwhile, book a 30-minute call: you can choose to talk business or simply tell me something.'], 'lavoriamo']
  };
  const CHAT_URL = 'https://chiedimi.aniello-ambrosio-1999.workers.dev'; // Worker Cloudflare "chiedimi"
  let samplePromise = null;
  const getSample = () => samplePromise ||= (window.claude && claude.use ? claude.use('sample').catch(() => null) : Promise.resolve(null));
  const splitDoor = t => { const m = t.match(/\[PORTA:(\w+)\]/); return [t.replace(/\s*\[PORTA:\w+\]\s*/g, '').trim(), m ? m[1] : 'nessuna']; };
  const root = $('[data-chat]'), log = $('.log', root), form = $('form', root), input = $('input', root), btn = $('button[type="submit"]', root);
  const turns = []; let busy = false;
  const bubble = (cls, text) => { const d = document.createElement('div'); d.className = 'msg ' + cls; d.textContent = text; log.appendChild(d); d.scrollIntoView({block:'nearest', behavior: reduce ? 'auto' : 'smooth'}); return d; };
  const addDoor = (el, key) => {
    const d = DOORS[key]; if (!d) return;
    const w = document.createElement('div'); w.className = 'door';
    const a = document.createElement('a'); a.textContent = T(d[0][0], d[0][1]);
    if (d[1].startsWith('go:')) { a.href = '#home'; a.addEventListener('click', e => { e.preventDefault(); go(d[1].slice(3)); }); } else a.href = d[1];
    w.appendChild(a); el.appendChild(w);
  };
  async function ask(q, key){
    q = (q || '').trim(); if (!q || busy) return;
    busy = true; btn.disabled = true; input.value = '';
    bubble('me', q);
    const out = bubble('ai wait', T('Ci penso…', 'Thinking…'));
    turns.push({role:'user', content:q});
    const finish = (t, door) => { out.classList.remove('wait'); out.textContent = t; addDoor(out, door); turns.push({role:'assistant', content:t}); };
    const fb = key && FALLBACK[key];
    if (LIVE && CHAT_URL) {
      try {
        const r = await fetch(CHAT_URL, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({lang, messages: turns.slice(-8)})});
        if (!r.ok || !r.body) throw {code: r.status === 429 ? 'rate_limited' : 'http_' + r.status};
        const rd = r.body.getReader(), dec = new TextDecoder(); let acc = '';
        for (;;) { const {value, done} = await rd.read(); if (done) break; acc += dec.decode(value, {stream:true}); out.classList.remove('wait'); out.textContent = splitDoor(acc)[0]; }
        if (!acc.trim()) throw {code:'empty'};
        const [clean, door] = splitDoor(acc); finish(clean, door);
      } catch (e) {
        if (fb) finish(T(fb[0][0], fb[0][1]), fb[1]);
        else { out.classList.remove('wait'); out.textContent = e && e.code === 'rate_limited' ? T('Troppe domande tutte insieme. Riprova tra un minuto.', 'Too many questions at once. Try again in a minute.') : T('Qualcosa non è andato. Riprova tra poco.', 'Something went wrong. Try again shortly.'); }
      } finally { busy = false; btn.disabled = false; }
      return;
    }
    const sample = await getSample();
    if (!sample) {
      if (fb) finish(T(fb[0][0], fb[0][1]), fb[1]);
      else finish(T('In questa anteprima l\'AI non è attiva, quindi rispondo solo alle domande suggerite. Nel sito vero risponde a tutto.', 'The AI is off in this preview, so I only answer the suggested questions. On the real site it answers everything.'), 'nessuna');
      busy = false; btn.disabled = false; return;
    }
    try {
      const rules = FACTS + (lang === 'en' ? '\n\nRispondi in inglese.' : '\n\nRispondi in italiano.');
      const {text} = await sample([{role:'user', content:rules}, ...turns.slice(-8)], {
        modelTier:'quick', cache:false, signal:new AbortController().signal,
        onText: ({text}) => { out.classList.remove('wait'); out.textContent = splitDoor(text)[0]; }
      });
      const [clean, door] = splitDoor(text); finish(clean, door);
    } catch (e) {
      if (fb) finish(T(fb[0][0], fb[0][1]), fb[1]);
      else { out.classList.remove('wait'); out.textContent = e && e.code === 'rate_limited' ? T('Troppe domande tutte insieme. Riprova tra un minuto.', 'Too many questions at once. Try again in a minute.') : e && e.code === 'not_granted' ? T('L\'AI non è attiva qui. Prova una delle domande suggerite.', 'The AI is off here. Try one of the suggested questions.') : (e && e.text) || T('Qualcosa non è andato. Riprova.', 'Something went wrong. Try again.'); }
    } finally { busy = false; btn.disabled = false; }
  }
  form.addEventListener('submit', e => { e.preventDefault(); ask(input.value); });
  $$('.chip', root).forEach(c => c.addEventListener('click', () => ask(c.textContent, c.dataset.k)));

  if (window.jQuery) document.body.addEventListener('click', e => { if (e.target.closest && e.target.closest('a[href^="#"]')) e.stopPropagation(); });

  sayP.dataset.it = sayP.textContent;
  applyLang();
  show();
})();

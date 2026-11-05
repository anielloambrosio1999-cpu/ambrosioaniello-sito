// Contatti — ambrosioaniello.com
// Cloudflare Worker: riceve le richieste dei moduli del sito (G&J rivenditore, Zeppo locale, Zeppo privato)
// e le manda per mail ad Aniello. Sostituisce il modulo nascosto di Webflow.
// Binding richiesto: SEND_EMAIL (Email Service, send_email) con destinazione verificata in Email Routing.

const ALLOWED = [
  'https://ambrosioaniello.com',
  'https://www.ambrosioaniello.com',
  'https://anielloambrosio-com.webflow.io'
];
const PREVIEW = /^https:\/\/([a-z0-9-]+\.)?ambrosioaniello\.pages\.dev$/; // indirizzo di prova di Cloudflare Pages
const TO = 'aniello.ambrosio.1999@gmail.com';
const FROM = 'sito@ambrosioaniello.com';
const TIPI = ['G&J rivenditore', 'Zeppo locale', 'Zeppo privato (apertura)'];
const CAMPI = { negozio: 'Negozio / locale', citta: 'Città', contatto: 'Contatto', preferenza: 'Preferenza', showroom: 'Showroom', email: 'Mail', nome: 'Nome', lingua: 'Lingua', sezione: 'Pagina', consenso: 'Consenso' };
const PER_MINUTE = 5;
const hits = new Map();

const okOrigin = o => ALLOWED.includes(o) || PREVIEW.test(o);
const json = (obj, status, headers) => new Response(JSON.stringify(obj), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
const clean = v => String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').trim().slice(0, 300);

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': okOrigin(origin) ? origin : ALLOWED[1],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin'
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return json({ ok: true, service: 'contatti' }, 200, cors);
    if (!okOrigin(origin)) return json({ error: 'forbidden' }, 403, cors);
    if (!env.SEND_EMAIL) return json({ error: 'missing_binding' }, 500, cors);

    const ip = req.headers.get('CF-Connecting-IP') || 'anon';
    const now = Date.now();
    const list = (hits.get(ip) || []).filter(t => now - t < 60000);
    if (list.length >= PER_MINUTE) return json({ error: 'rate_limited' }, 429, cors);
    list.push(now); hits.set(ip, list);

    let body;
    try { body = await req.json(); } catch (e) { return json({ error: 'bad_request' }, 400, cors); }
    const tipo = clean(body && body.tipo);
    if (!TIPI.includes(tipo)) return json({ error: 'bad_request' }, 400, cors);
    const righe = Object.keys(CAMPI).filter(k => clean(body[k])).map(k => `${CAMPI[k]}: ${clean(body[k])}`);
    if (!righe.some(r => /^(Contatto|Mail|Negozio)/.test(r))) return json({ error: 'bad_request' }, 400, cors);

    const subject = `Sito: nuova richiesta ${tipo}`;
    const text = `Nuova richiesta dal sito ambrosioaniello.com\n\nTipo: ${tipo}\n${righe.join('\n')}\n\nRicevuta il ${new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}`;
    try {
      await env.SEND_EMAIL.send({ from: { email: FROM, name: 'Sito Aniello Ambrosio' }, to: TO, subject, text });
    } catch (e) {
      try {
        const { EmailMessage } = await import('cloudflare:email');
        const raw = [
          `From: Sito Aniello Ambrosio <${FROM}>`, `To: ${TO}`, `Subject: =?UTF-8?B?${b64(subject)}?=`,
          `Message-ID: <${crypto.randomUUID()}@ambrosioaniello.com>`, `Date: ${new Date().toUTCString()}`,
          'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', b64(text)
        ].join('\r\n');
        await env.SEND_EMAIL.send(new EmailMessage(FROM, TO, raw));
      } catch (e2) {
        return json({ error: 'send_failed' }, 502, cors);
      }
    }
    return json({ ok: true }, 200, cors);
  }
};

function b64(s) {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

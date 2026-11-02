// Chiedimi — ambrosioaniello.com
// Cloudflare Worker: riceve le domande dal sito, chiede a Claude (Anthropic API) e rimanda la risposta un pezzo alla volta.
// Segreto richiesto: ANTHROPIC_API_KEY (lo inserisce Aniello in Settings > Variables and Secrets).

const ALLOWED = [
  'https://ambrosioaniello.com',
  'https://www.ambrosioaniello.com',
  'https://anielloambrosio-com.webflow.io'
];
const MODEL = 'claude-haiku-5-5';
const MAX_TURNS = 8;        // ultimi messaggi mandati a Claude
const MAX_CHARS = 800;      // lunghezza massima di un messaggio
const PER_MINUTE = 8;       // domande al minuto per visitatore

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

const hits = new Map(); // limite semplice per visitatore (per istanza)

export default {
  async fetch(req, env, ctx) {
    const origin = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED.includes(origin) ? origin : ALLOWED[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin'
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return json({ ok: true, service: 'chiedimi' }, 200, cors);
    if (!ALLOWED.includes(origin)) return json({ error: 'forbidden' }, 403, cors);
    if (!env.ANTHROPIC_API_KEY) return json({ error: 'missing_key' }, 500, cors);

    // limite di domande per visitatore
    const ip = req.headers.get('CF-Connecting-IP') || 'anon';
    const now = Date.now();
    const list = (hits.get(ip) || []).filter(t => now - t < 60000);
    if (list.length >= PER_MINUTE) return json({ error: 'rate_limited' }, 429, cors);
    list.push(now); hits.set(ip, list);
    if (env.LIMITER) {
      try { const r = await env.LIMITER.limit({ key: ip }); if (!r.success) return json({ error: 'rate_limited' }, 429, cors); } catch (e) {}
    }

    let body;
    try { body = await req.json(); } catch (e) { return json({ error: 'bad_request' }, 400, cors); }
    const lang = body && body.lang === 'en' ? 'en' : 'it';
    let msgs = Array.isArray(body && body.messages) ? body.messages.slice(-MAX_TURNS) : [];
    msgs = msgs
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
    while (msgs.length && msgs[0].role !== 'user') msgs.shift();
    const clean = [];
    for (const m of msgs) {
      const last = clean[clean.length - 1];
      if (last && last.role === m.role) last.content += '\n' + m.content; else clean.push({ ...m });
    }
    if (!clean.length || clean[clean.length - 1].role !== 'user') return json({ error: 'bad_request' }, 400, cors);

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: env.MODEL || MODEL,
        max_tokens: 400,
        stream: true,
        system: FACTS + (lang === 'en' ? '\n\nRispondi in inglese.' : '\n\nRispondi in italiano.'),
        messages: clean
      })
    });
    if (!upstream.ok || !upstream.body) {
      let detail = '';
      try { detail = (await upstream.text()).slice(0, 300); } catch (e) {}
      console.log('anthropic error', upstream.status, detail);
      return json({ error: 'upstream', status: upstream.status }, 502, cors);
    }
    const { readable, writable } = new TransformStream();
    ctx.waitUntil(pipeText(upstream.body, writable));
    return new Response(readable, {
      headers: { ...cors, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }
};

// trasforma lo stream di Anthropic (SSE) in solo testo
async function pipeText(src, writable) {
  const w = writable.getWriter();
  const enc = new TextEncoder(), dec = new TextDecoder();
  const reader = src.getReader();
  let buf = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const evt = buf.slice(0, i); buf = buf.slice(i + 2);
        const line = evt.split('\n').find(l => l.startsWith('data: '));
        if (!line) continue;
        try {
          const d = JSON.parse(line.slice(6));
          if (d.type === 'content_block_delta' && d.delta && d.delta.type === 'text_delta') await w.write(enc.encode(d.delta.text));
        } catch (e) {}
      }
    }
  } catch (e) {
    console.log('stream error', String(e));
  } finally {
    try { await w.close(); } catch (e) {}
  }
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

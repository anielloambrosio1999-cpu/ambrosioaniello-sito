# Record DNS del sito su Webflow (prima dello spostamento su Cloudflare Pages, 6 novembre 2026)

Per tornare su Webflow basta rimettere questi due record (tutti e due "DNS only", TTL Auto):

| Nome | Tipo | Contenuto |
|---|---|---|
| ambrosioaniello.com | A | 198.202.211.1 |
| www.ambrosioaniello.com | CNAME | cdn.webflow.com |

Record da non toccare (mail Brevo, Email Routing, verifiche): MX route1/2/3.mx.cloudflare.net, TXT SPF, TXT brevo-code, DKIM brevo1/brevo2, img/r (Brevo), cf2024-1._domainkey, _dmarc, _webflow (TXT verifica).

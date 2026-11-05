#!/usr/bin/env python3
"""Build the static version of ambrosioaniello.com for Cloudflare Pages (no Webflow).

Usage: python3 tools/build_static.py [output folder, default dist]
Output: one full HTML file per page (index, giorgia-e-johns, zeppo, privacy, 404), the shared
site.css / site.js / fonts / icons, plus _redirects and _headers for Cloudflare Pages.
Photos and videos keep loading from jsDelivr as in body.html.
"""
import html, pathlib, shutil, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / 'dist').resolve()
SITE = 'https://www.ambrosioaniello.com'
OG_IMAGE = 'https://cdn.jsdelivr.net/gh/anielloambrosio1999-cpu/ambrosioaniello-sito@542e81a4ad7b2600a8ba7758e913eb42b8d22c16/og/anteprima.jpg'
FORM_URL = 'https://contatti.aniello-ambrosio-1999.workers.dev'
ROUTES = "{home:'/',gj:'/giorgia-e-johns',zeppo:'/zeppo',privacy:'/privacy'}"

PAGES = [
    # file, path, title, description, extra js
    ('index.html', '/', 'Aniello Ambrosio — Aziende vere. Numeri veri. Errori veri.',
     'Imprenditore. Sto trasformando Giorgia & Johns e costruendo Zeppo, davanti a tutti.', ''),
    ('giorgia-e-johns.html', '/giorgia-e-johns', 'Giorgia & Johns — Aniello Ambrosio',
     "Giorgia & Johns, l'azienda di moda donna della mia famiglia: 17 negozi, un e-commerce e showroom da Milano a Catania. Per i negozi che vogliono rivenderla.", ''),
    ('zeppo.html', '/zeppo', 'Zeppo, pasticceria senza glutine — Aniello Ambrosio',
     'Zeppo: pasticceria senza glutine e senza lattosio per bar, ristoranti, hotel e per casa. Il laboratorio apre nel 2027. Di sapore, non di glutine.', ''),
    ('privacy.html', '/privacy', 'Privacy e cookie — Aniello Ambrosio',
     'Informativa privacy e cookie di AmbrosioAniello.com: quali dati raccogliamo, perché e come puoi chiederne la cancellazione.', ''),
    ('404.html', None, 'Pagina non trovata — Aniello Ambrosio',
     'Pagina non trovata.', "window.AA_VIEW='nf';"),
]

# old Webflow addresses that now go somewhere useful (they were JS redirects on the Webflow 404 page)
REDIRECTS = """/consulenzamarketing /#work 301
/consulenzamarketing/ /#work 301
/mente-fixed* / 301
/mente-growth* / 301
/grazie* / 301
/contact* / 301
/cityhallsupply* / 301
/nuovo* / 301
/blog* / 301
/works* / 301
/post* / 301
/consulenza* / 301
/checkout* / 301
/paypal-checkout* / 301
/order-confirmation* / 301
/product/* / 301
/category/* / 301
/index.html / 301
"""

HEADERS = """/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
/fonts/*
  Cache-Control: public, max-age=31536000, immutable
/icons/*
  Cache-Control: public, max-age=604800
"""


def page(file, path, title, desc, extra, body):
    e = lambda s: html.escape(s, quote=True)
    canonical = f'<link rel="canonical" href="{SITE}{"" if path == "/" else path}">' if path else '<meta name="robots" content="noindex, nofollow">'
    return f"""<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:image" content="{OG_IMAGE}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(desc)}">
<meta name="twitter:image" content="{OG_IMAGE}">
{canonical}
<link rel="icon" href="/icons/favicon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="/icons/favicon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="preload" as="font" type="font/woff2" crossorigin href="/fonts/bricolage-grotesque-latin-standard-normal.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin href="/fonts/Geist-Variable.woff2">
<link rel="stylesheet" href="/site.css">
<style>*{{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}}</style>
</head>
<body>
<script>window.AA_ROUTES={ROUTES};window.AA_FORM_URL='{FORM_URL}';{extra}</script>
{body}
<script src="https://assets.calendly.com/assets/external/widget.js" async></script>
<script src="/site.js"></script>
</body>
</html>
"""


def main():
    body = (ROOT / 'body.html').read_text(encoding='utf-8')
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    for file, path, title, desc, extra in PAGES:
        (OUT / file).write_text(page(file, path, title, desc, extra, body), encoding='utf-8')
    shutil.copy(ROOT / 'site.css', OUT / 'site.css')
    shutil.copy(ROOT / 'site.js', OUT / 'site.js')
    shutil.copytree(ROOT / 'fonts', OUT / 'fonts')
    shutil.copytree(ROOT / 'icons', OUT / 'icons')
    shutil.copy(ROOT / 'icons' / 'favicon.ico', OUT / 'favicon.ico')
    (OUT / '_redirects').write_text(REDIRECTS, encoding='utf-8')
    (OUT / '_headers').write_text(HEADERS, encoding='utf-8')
    (OUT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {SITE}/sitemap.xml\n', encoding='utf-8')
    urls = ''.join(f'  <url><loc>{SITE}{"" if p == "/" else p}</loc></url>\n' for _, p, *_ in PAGES if p)
    (OUT / 'sitemap.xml').write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}</urlset>\n', encoding='utf-8')
    print('built', OUT, sorted(p.name for p in OUT.iterdir()))


if __name__ == '__main__':
    main()

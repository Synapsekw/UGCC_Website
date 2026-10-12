# UGCC Static Site

Static replica of the UGCC website (originally built with Hostinger Website Builder at
`stornoway-builder-vkeizur5ysotnsh3.hostingersite.com`), converted to plain HTML/CSS/JS
so it can be hosted on any regular web hosting (Hostinger shared hosting, etc.).

## Deploying to Hostinger

Upload **everything in this folder** (including the hidden `.htaccess`) into `public_html/`.
No build step, no database, no PHP required. Total size is ~758 MB (mostly images).

Tip: zip the folder, upload the zip via Hostinger File Manager, and extract it there —
much faster than uploading 1,000+ files individually.

## Structure

- `index.html` — home page
- `<page-slug>/index.html` — the other 63 pages (incl. project detail and listing pages) (clean URLs, e.g. `/contact-us/`)
- `assets/css/main.css` — the original builder stylesheet (localized)
- `assets/css/fonts.css` + `assets/fonts/` — self-hosted Google Fonts (Hammersmith One, Open Sans, Carlito, Poppins)
- `assets/css/custom.css`, `assets/js/main.js` — small replacement for the builder's JavaScript:
  mobile burger menu, home-page slideshow (3 s autoplay, arrows, dots), appear-on-scroll animations
- `assets/img/` — all site images, downloaded and self-hosted (all responsive srcset variants preserved)

## Things that still point at external services (intentional)

- **Chat widget**: `https://synapsekw.github.io/ugcc_widget/widget.js` with its n8n
  webhook — your own infrastructure, left untouched.
- **Google Maps embed** on the contact page.
- Social links (Facebook, Instagram, LinkedIn) and `ugcc.com` links.

## After attaching the real domain

Canonical/OG URLs were rewritten to root-relative paths. For best SEO, search for
`og:url` and the JSON-LD `"url"` fields in each `index.html` and set them to the
final absolute domain. Optionally add a `sitemap.xml`.

## Source-material folders (do NOT upload to hosting)

These live under `assets/img/` for convenience but are working material,
not part of the live site — exclude them when uploading to Hostinger:

- `assets/img/Original Assets/` — local reference copy of all runtime images
  (gitignored; the runtime copies the site actually uses sit directly in
  `assets/img/`, so this folder can be deleted without breaking anything)
- `assets/img/GalleryPicturesHighQualitytobeUsed/`
- `assets/img/KP3_GallerytobeUpdated/`
- `assets/img/MEW-6085-2024_2025_GalleryTobeupdated/`

## V2.0 (this branch)

Modernization layer on top of the pixel-perfect replica, in `assets/css/v2.css`
and `assets/js/v2.js` (injected into every page, no other changes):

- Sticky header gains a translucent navy + blur + shadow state once scrolled
- Nav links: brand-red underline animates in from the left; active page underlined
- Buttons lift with a soft shadow on hover, press down on click
- Linked images zoom 5% with a slight brightness lift on hover
- Hero slideshow: slower crossfade + Ken Burns drift; dots become animated pills
- Scroll reveals cascade with staggered delays and an exponential ease
- Red selection color, red focus rings, smooth anchor scrolling
- `prefers-reduced-motion` fully respected

To ship V1 instead, `git checkout master`.

## Website chatbot (UGCC Assistant)

- Widget: `assets/js/chat-widget.js` → `POST /api/chat` → Netlify function `netlify/functions/chat.mjs`.
- Model: OpenAI Responses API, `gpt-4o-mini` by default (override with the `CHAT_MODEL` env var in Netlify).
  Needs `OPENAI_API_KEY` set in Netlify. Set a monthly usage limit on that key in the OpenAI dashboard.
- Knowledge: the whole website is compiled into `netlify/functions/knowledge.mjs` (company pages, a
  structured index of every project page, and the company-profile PDF) and sent with every question.
  The old OpenAI vector store (`OPENAI_VECTOR_STORE_ID`) is no longer used.
- **After any content change, rebuild the knowledge and commit it:**
  `pip install -r tools/knowledge/requirements.txt && python3 tools/knowledge/build_context.py`
- Answers link projects/pages to their site pages; the widget only turns links to this site into
  clickable links (everything else is shown as plain text).
- The conversation is kept per browser tab (sessionStorage) while visitors move between pages; only the
  last 6 turns are sent to the server, so this does not add cost. "New chat" clears it.
- **Spend controls** (Netlify Blobs, store `chat-usage`): `CHAT_LIMIT_PER_VISITOR_DAY` (default 30) and
  `CHAT_LIMIT_SITE_DAY` (default 300) env vars, plus 12 requests/minute per session. ~47k input tokens per
  question ≈ $0.004–0.007 with gpt-4o-mini, so the default site cap bounds spend at about $2/day.
- Safeguards live in `RULES` in `chat.mjs`: answers only from the knowledge base; declines politics,
  religion, other companies, legal/financial/medical advice and off-topic requests.

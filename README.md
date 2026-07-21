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

## V3.0 (this branch)

Modernization layer on top of the pixel-perfect replica, in `assets/css/v3.css`
and `assets/js/v3.js` (injected into every page, no other changes):

- Sticky header gains a translucent navy + blur + shadow state once scrolled
- Nav links: brand-red underline animates in from the left; active page underlined
- Buttons lift with a soft shadow on hover, press down on click
- Linked images zoom 5% with a slight brightness lift on hover
- Hero slideshow: slower crossfade + Ken Burns drift; dots become animated pills
- Scroll reveals cascade with staggered delays and an exponential ease
- Red selection color, red focus rings, smooth anchor scrolling
- `prefers-reduced-motion` fully respected

To ship V1 instead, `git checkout master`.

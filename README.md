# UGCC Static Site

Static replica of the UGCC website (originally built with Hostinger Website Builder at
`stornoway-builder-vkeizur5ysotnsh3.hostingersite.com`), converted to plain HTML/CSS/JS
so it can be hosted on any regular web hosting (Hostinger shared hosting, etc.).

## Deploying to Hostinger

Upload **everything in this folder** (including the hidden `.htaccess`) into `public_html/`.
No build step, no database, no PHP required. Total size is ~243 MB (mostly images).

Tip: zip the folder, upload the zip via Hostinger File Manager, and extract it there —
much faster than uploading 1,000+ files individually.

## Structure

- `index.html` — home page
- `<page-slug>/index.html` — the other 13 pages (clean URLs, e.g. `/contact-us/`)
- `assets/css/main.css` — the original builder stylesheet (localized)
- `assets/css/fonts.css` + `assets/fonts/` — self-hosted Google Fonts (Hammersmith One, Open Sans, Carlito, Poppins)
- `assets/css/custom.css`, `assets/js/main.js` — small replacement for the builder's JavaScript:
  mobile burger menu, home-page slideshow (3 s autoplay, arrows, dots), appear-on-scroll animations
- `assets/img/` — all site images, downloaded and self-hosted (all responsive srcset variants preserved)

## Things that still point at external services (intentional)

- **Background videos** on some sections stream from `videos.pexels.com` (same as the
  original site). They total ~315 MB, which is why they are not bundled. To self-host
  them, download each URL found via `grep -r videos.pexels.com`, put the files in
  `assets/video/`, and update the `<video src=...>` references.
- **Chat widget**: `https://synapsekw.github.io/ugcc_widget/widget.js` with its n8n
  webhook — your own infrastructure, left untouched.
- **Google Maps embed** on the contact page.
- Social links (Facebook, Instagram, LinkedIn) and `ugcc.com` links.

## After attaching the real domain

Canonical/OG URLs were rewritten to root-relative paths. For best SEO, search for
`og:url` and the JSON-LD `"url"` fields in each `index.html` and set them to the
final absolute domain. Optionally add a `sitemap.xml`.

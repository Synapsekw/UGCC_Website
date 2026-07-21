# UGCC Static Site

Static site for United Gulf Construction Company. Originally exported from Hostinger
Website Builder and converted to plain HTML/CSS/JS, then rebuilt as the V3 design layer.
51 pages, no build step, no database, no PHP.

## Deploying

**The site deploys on Netlify**, from `netlify.toml`: `publish = "."`, no build command —
the repo root is served as-is. It runs on a temporary Netlify domain until the client
hands over `ugcc.com`.

`.htaccess` is retained for the Apache/Hostinger fallback path but is **not** the tuning
surface; cache headers live in `netlify.toml`.

### Launch checklist — at domain handover

1. **Remove the site-wide `X-Robots-Tag: noindex, nofollow` block from `netlify.toml`.**
   It is deliberate: free Netlify has no password protection, so the header is what keeps
   the client preview out of search results. Nothing will rank until it goes.
2. Verify the absolute `ugcc.com` canonical, `og:url` and JSON-LD URLs already baked into
   every page resolve against the live domain.
3. Re-run `python3 tools/gen-sitemap.py` if any URL changed, and submit `sitemap.xml`.

## Build tooling

No build runs at deploy time — these are run by hand and their output is committed.

| Command | What it does |
| --- | --- |
| `npm test` | The full checker suite (vitest). CI runs this on every push. |
| `npm run check:images` | Per-page image budgets and `<picture>` invariants. |
| `npm run check:orphans` | Lists assets no HTML/CSS/JS/build script references. |
| `npm run build:images` | Regenerates the responsive image pipeline end to end. |

`npm run build:images` chains four steps, and order matters:
`tools/responsive-manifest.py` decides which images need derivatives and at which widths →
`tools/make-responsive-images.py` encodes AVIF + JPEG into `assets/img/v3/resp/` →
`tools/rewrite-picture-markup.py` rewrites `<img>` into `<picture>` →
`tools/add-lcp-preload.py` adds each page's LCP preload. All four are idempotent.

`tools/css-subset.py` regenerates `assets/css/main.subset.css` from `main.css`. Re-run it
after adding markup that uses a class the subset has never seen, or that class will be
unstyled. `tools/orphan-keep.txt` protects unreferenced files that must survive.

## Structure

- `index.html` — home page
- `<page-slug>/index.html` — the other 50 pages (clean URLs, e.g. `/contact-us/`)
- `assets/css/main.subset.css` — what the pages load: `main.css` reduced by
  `tools/css-subset.py` to the rules anything on the site can match (350KB -> 139KB).
  `assets/css/main.css` is kept as the source it is generated from.
- `assets/css/fonts.css` + `assets/fonts/` — self-hosted Google Fonts (Hammersmith One,
  Open Sans, Carlito, Poppins), latin and latin-ext subsets only
- `assets/img/v3/resp/` — generated AVIF + JPEG derivatives; do not edit by hand
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

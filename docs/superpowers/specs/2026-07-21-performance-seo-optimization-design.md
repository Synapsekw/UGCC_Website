# Performance, SEO and codebase-health pass — design

Date: 2026-07-21
Branch: V2 (the live site; `master` is the backup and is not modified)

## Problem

V2 is feature-complete. It has never had a performance pass. Measured on the
V2 working tree (51 pages, all numbers from files on disk, not estimates):

| Symptom | Measurement |
| --- | --- |
| Referenced image+video payload | 512 files, 169.6 MB |
| JPEG share of that | 345 files, 97.6 MB (avg 283 KB each) |
| Modern formats in use | 58 AVIF + 55 WebP out of 512 referenced files |
| Responsive images | zero `<picture>`/`srcset` outside the projects hub |
| Homepage | 12.6 MB images + 9.6 MB video; 1.07 MB loads eagerly |
| Heaviest pages | `ra-259` 10.5 MB, `construction-projects-kuwait` 8.9 MB, `careers` 6.6 MB |
| `about-contractor-kuwait` | 17.1 MB of video |
| `<img>` without `width`/`height` | 104 of 656 (layout shift) |
| `preload` / `fetchpriority` | zero site-wide — the LCP image is never prioritised |
| Render-blocking CSS (homepage) | 11 stylesheets, 476 KB raw |
| `main.css` dead weight | 1,193 of 1,254 class selectors unused on any page |
| `@font-face` declarations | 55, none preloaded, incl. Devanagari/Cyrillic/math subsets |
| Unreferenced images tracked in git | 2,616 files, 297 MB |
| `<img>` with empty or missing `alt` | ~380 |

Two correctness defects surfaced during the audit:

1. **The About page's Expertise row renders a blank Construction column.**
   V2 references `about-engineering.jpg` and `about-procurement.jpg` but has
   zero references to `about-construction.jpg`, which sits on disk at 198 KB.
   `master`'s commit `4634868` fixes exactly this against the v2 photo set,
   but V2's About page has changed since (the two-column reading-sections
   work landed after), so the fix needs porting rather than cherry-picking.
2. **CI never runs the tests.** `.github/workflows/push-log.yml` only writes a
   push summary. The 82 tests in `tests/` pass today but nothing enforces it.

## Constraints

- **Deploy target is Hostinger shared hosting** (Apache, `.htaccess`). Netlify
  is a client preview only. No image CDN, no edge transforms, no build step on
  the server. Every optimisation must be a build-time artefact committed to
  the repo.
- **Customer content freeze.** Existing copy and existing imagery must not
  change. Re-encoding an image to fewer bytes at identical dimensions and crop
  is explicitly in scope (confirmed 2026-07-21); recropping, recolouring or
  substituting an image is not.
- **No new system dependencies.** `ffmpeg`, ImageMagick, `cwebp` and `avifenc`
  are all absent from this machine. Available: `sips`, Python 3.9.6 with
  Pillow 11.3.0 (WebP **and** AVIF encode confirmed working), Node 24.
- **House style for tooling**: zero-dependency Node checkers in `tools/`,
  invoked from `tests/*.test.mjs` so `npx vitest run` gates on them. The
  projects hub already ships AVIF derivatives with byte budgets enforced this
  way — this work extends that pattern site-wide rather than inventing one.
- `sips` crop is silently broken in this environment; the pipeline must not
  depend on it for cropping.

## Encoder benchmark

16 representative referenced images (3840x5905 down to 440x275), resized to
1600px wide, encoded with Pillow:

| Encoder | Sample total | Saving | Fidelity (mean channel diff /255) |
| --- | --- | --- | --- |
| Source | 15.10 MB | — | — |
| AVIF q60 | 2.22 MB | **85%** | 1.86 – 3.54 |
| WebP q80 | 2.68 MB | 82% | comparable |
| JPEG q82 progressive | 3.87 MB | 74% | comparable |

Encode cost: 4.3 s for 16 images at one width, so ~850 encodes (283 images x
3 widths) lands around 4 minutes. A diff of 2–3.5/255 is visually
indistinguishable, which satisfies the content freeze.

## Approach

Six phases, each a separate commit on V2, each independently revertable. The
ordering puts the correctness fix and the zero-risk cleanup first so the
expensive image work happens on an already-clean tree.

### Phase 1 — Correctness and repo hygiene

- Port `master`'s About Construction fix onto V2's current About markup:
  remap the three Expertise slots onto the v2 photo set, drop the dangling
  `srcset`/`sizes` that reference pre-v2 assets, correct the panned slot's
  `width`/`height` to the panorama's 1920x728 aspect.
- Delete the 6 branches that are 0 commits ahead of V2 and therefore fully
  absorbed: `projects-hub-tweaks`, `projects-redesign`, `hero-recompose`,
  `claude/ecstatic-sutherland-1dd1dd`, `claude/elated-lumiere-80daf9`,
  `claude/competent-mendel-e55c1f`. Remove the 4 stale worktrees under
  `.claude/worktrees/`. **`master` is left untouched as the backup.**
- Delete the 2,616 unreferenced images (297 MB) from the working tree. Git
  history retains every one. Cuts the Hostinger upload from ~450 MB to ~150 MB
  before Phase 2 shrinks it further.

Verification: `npx vitest run` stays green (82 tests); the About page renders
three filled Expertise columns at 1280px; a re-run of the reference scan
reports zero orphans and no newly-broken references.

### Phase 2 — Responsive image pipeline

New `tools/make-responsive-images.py` (Pillow, idempotent, no external deps),
following the existing `tools/make-*.sh` conventions:

- For each of the 283 referenced root images, emit AVIF + WebP derivatives at
  the widths that page actually renders (capped at the source width — never
  upscale), into `assets/img/v2/resp/<stem>-<width>.{avif,webp}`.
- Rewrite the `<img>` tags to `<picture>` with an AVIF `<source>`, a WebP
  `<source>`, and the untouched original as the `<img>` fallback. Old browsers
  and any bot that ignores `<source>` still get a working image.
- Add `width`/`height` to all 656 `<img>` tags so every slot reserves layout
  space (fixes the 104 that shift).
- `fetchpriority="high"` plus a `<link rel="preload" as="image">` on each
  page's LCP image; `loading="lazy"` and `decoding="async"` on everything
  below the fold.

Target: homepage image payload 12.6 MB → under 2 MB; the heavy project pages
from 4–10 MB into the same range.

Verification: a new `tools/image-budget-check.js` asserts per-page referenced
image weight against a budget, every `<picture>` has a real file behind each
`<source>`, and no `<img>` lacks dimensions. Wired into `tests/` so vitest
gates on it.

### Phase 3 — Critical rendering path

- Subset `main.css`: keep only the 61 class selectors actually used, drop the
  1,193 dead ones. 358 KB → roughly 20 KB. The file is Hostinger builder
  output and is referenced unversioned by all 51 pages, so the subset ships
  under a new versioned filename and the pages are repointed together.
- Prune unused font subsets. An English-only site does not need the
  Devanagari, Cyrillic-ext or math faces; the 55 `@font-face` rules collapse
  to the handful actually exercised.
- `<link rel="preload" as="font" crossorigin>` for the 2–3 fonts used above
  the fold. `font-display: swap` is already set on all 55 and stays.
- `.htaccess`: extend `mod_deflate` coverage, lengthen immutable-asset expiry,
  enable Keep-Alive.

Verification: computed styles on a sample of pages match pre-change values;
vitest green; no 404s in the preview network log.

### Phase 4 — Video (reduced scope)

`ffmpeg` is unavailable, so re-encoding the three MP4s (26.7 MB) is **out of
scope for this pass**. What is achievable without it:

- `preload="none"` plus a `poster` still on every `<video>`, so the 17.1 MB on
  the About page and 9.6 MB on the homepage stop competing with the LCP.
- Poster frames are sourced from existing site imagery rather than extracted
  from the video, since frame extraction needs ffmpeg.

Re-encoding is recorded as follow-up work requiring an ffmpeg install.

### Phase 5 — SEO basics

The audit found the metadata layer already in good shape: all 51 pages carry
title, meta description, canonical, OG, Twitter card, JSON-LD, a single `h1`
and `lang`. No duplicate titles or descriptions. `sitemap.xml` covers all 51
URLs with `lastmod` and `priority`; `robots.txt` is correct. So this phase is
narrow:

- Write `alt` text for the ~380 images missing it, derived from project name,
  business line and surrounding page context. Factual and descriptive, no
  marketing claims. `alt` is invisible to sighted visitors, so the content
  freeze is not touched.
- Trim the 6 meta descriptions over 165 characters to avoid SERP truncation.
- Fill the empty `og:image:alt` and `twitter:image:alt`.
- Document the `netlify.toml` `X-Robots-Tag: noindex` on `/*`. It is correct
  for the preview and Apache ignores the file, so production is unaffected —
  but it is an unflagged hazard if the config is ever reused, and the
  launch checklist should name it.

A full keyword and content SEO pass is explicitly deferred to a separate
session; this phase only closes mechanical gaps.

### Phase 6 — Guardrails

- Add `package.json` pinning vitest so `npm test` works and the toolchain
  stops depending on the npx cache. `vitest.config.mjs`'s comment about the
  absent package.json is updated to match reality.
- Extend `.github/workflows/` to run `npm test` on push, so the 82 tests and
  the new budget checks actually gate.
- `tools/image-budget-check.js` from Phase 2 becomes the regression guard: a
  future oversized image fails CI rather than silently landing.

## Out of scope

- Video re-encoding (needs ffmpeg).
- Keyword research, content strategy, copy rewriting — separate SEO session.
- Any change to `master`.
- Any change to visible copy or to the visual content of existing imagery.

## Risks

| Risk | Mitigation |
| --- | --- |
| `<picture>` rewrite breaks a layout | Original `<img>` retained as fallback; budget checker asserts every `<source>` resolves; visual check per page family |
| CSS subset drops a selector used only in a JS-injected class | Scan `assets/js/*.js` for class-name string literals, not just HTML, when computing the keep-set |
| Deleting 297 MB removes something a future page wants | Git history retains all of it; deletion is a working-tree change only |
| Alt-text wording drifts from customer voice | Wording derives strictly from on-page facts (project name, business line, page heading); no marketing claims invented. Landed as its own commit so it can be reverted independently |
| Font pruning breaks a glyph on a non-English string | Verify against actual page text before removing a subset |

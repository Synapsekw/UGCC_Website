# Projects hub redesign — "Unified portfolio grid" (Variant B)

Date: 2026-07-21 · Branch: `projects-redesign` · Status: awaiting user approval
Scope: the main Projects page at `/construction-projects-kuwait` only. Listing
pages, discipline listings, and the 30 project detail pages are later phases.

## 1. Decision

Danijel reviewed three full-page mockups (committed under `mockups/`, ea869bf)
and selected **Variant B — one flat, filterable gallery of all 30 projects**
("nicely structured and easy to filter through"). The mockup at
`mockups/projects-hub-b/index.html` is the visual contract; this spec turns it
into the production page plus the performance work that ships with it.

## 2. Page structure (top → bottom)

1. **Builder header** — byte-intact, as on every redesigned page.
2. **`.as-cover`** — `v2/hero-projects` frame, eyebrow "Our work", H1
   `PROJECTS`, lede = the frozen hero subtitle. `fetchpriority="high"`, no
   lazy. Carries the four load-bearing classes + `data-v-3ffce944`.
3. **`.v2-subnav`** — tabs: **All** (`/construction-projects-kuwait`,
   `is-active`, the page itself) · **Current** (`/all-project-current`) ·
   **Completed** (`/all-projects-completed`). Phase 2 decides whether those
   two listing pages become redirects into filtered hub states.
4. **Intro section** (light) — `.as-head` (eyebrow "Portfolio", H2 "The full
   record") + `.as-stats`: `30` projects on record · `14` currently under
   execution · `7` business lines. All derived, no monetary figures.
5. **Filter bar + grid** (tint, one section) — two labelled chip rows
   (Status: All/Current/Completed · Business line: All lines + 7 disciplines)
   as real `<button>`s with `aria-pressed`, plus an `aria-live` count line.
   Grid: all 30 projects as `.as-card--tile` cards (kit 4/3 shot boxes), each
   carrying `data-status` + `data-lines`, whole tile one link, status pill +
   discipline tag line per card.
6. **`.as-band`** — full-bleed `v2/hero-current` frame, direct body child.
7. **Closing navy CTA** → `/contact-us` (strings byte-copied from the
   approved business-line CTA). Only navy section on the page.
8. **Builder footer `#FUdf9w9dXZ`** — byte-intact.

Grounds: photo → navy subnav → light → tint → photo → navy. Breakpoints: 920px
(stack) + 600px grid-collapse only. Page must render complete with JS
disabled.

### Filter behaviour
- Vanilla inline JS (~30 lines): chips toggle `[hidden]` on cards by
  status/discipline intersection and update the count line. No initial DOM
  mutation; no-JS state shows all 30 cards with "All" chips pre-pressed.
- **Deep links**: on load, `#current` / `#completed` (and `#roads` …
  `#oil-and-gas` for disciplines) preselect the matching chip. Lets the
  subnav, business-line pages, and phase-2 redirects target filtered states.

## 3. Content freeze compliance

- **Frozen, byte-verbatim (extracted programmatically, never retyped):** the
  hero subtitle; all 30 project titles taken from each detail page's `<h1>`
  (entities preserved). The listing pages' title paragraphs are NOT used as a
  source: their DOM order mis-associates titles with neighbouring cards
  (verified: ra268's nearest paragraph is mer-r-419's title).
- **New text (allowed classes only):** nav labels, generic headings/eyebrows
  ("Portfolio", "The full record", "Browse", "All projects"), button/chip
  labels, status pills, discipline tag lines, count line, derived stats.
- **Images:** only photographs already used on the projects pages; each card
  uses the same frame as its card on `/all-projects-new` (largest real file
  from that card's own srcset), preferring the curated
  `v2/proj/<slug>-880.jpg` for the 6 slugs that have one. Re-encode/resize of
  the same frame is allowed by the freeze; no new photography.
- **Repairs inherent in the design** (documented-repair class): the two
  micro-tunneling projects link to the local `/owwsct2459831` and
  `/owwsct2460879` pages instead of the old `ugcc.com/project/…` URLs; the
  5a-haya-eo24 card shows its own approved detail-page title instead of the
  neighbouring card's title it shows today.
- **Copy removal — flagged, and RESOLVED 2026-07-21 (Danijel's decision).**
  Variant B keeps the hero subtitle and all 30 project titles, but ~20 unique
  approved texts from the old hub would otherwise disappear from the site:
  the 5 distinct discipline intro paragraphs (7 slots, 2 were verbatim
  duplicates) and ~15 per-project featured-card blurbs. (An earlier claim
  that the intros "live on the business-line pages" was wrong — those pages
  carry different approved copy. Corrected by final review.)

  **Decision:** the discipline intros are approved for removal; the
  per-project blurbs are **re-homed onto their own project detail pages**
  rather than deleted. Re-homing happens ON THIS BRANCH BEFORE MERGE, so no
  approved sentence is ever absent from the live site. Mechanics:
  - `tools/projects-blurb-map.tsv` records blurb → slug with a confidence
    grade, built by CONTENT matching (contract numbers, place names) and
    verified against each detail page's `<h1>`/`<h2>`. Position-based
    association is forbidden: the old hub's DOM order demonstrably
    mis-attributes blurbs to neighbouring cards.
  - Blurbs are inserted byte-exact (tags stripped only; typos, entities and
    spacing preserved — including the "Al-Mutlaa Residentia City" variant).
  - Checker check 16 asserts every mapped blurb is present on its detail
    page, so the guarantee is machine-enforced and cannot silently regress.
  - **Documented repair (approved by Danijel 2026-07-21):** the blurb
    re-homed to `ra-259` named "the RA-200 development" while that page is
    RA-259 (RA-200 is `ra200`, which carries its own Cairo Street blurb).
    Corrected to "RA-259" on the page and in the map — single-token repair,
    same class as the previously approved fixes. All other typos, entities
    and spacings in relocated text remain verbatim, including the
    "Al-Mutlaa Residentia City" variant.

## 4. Performance work (ships with the page, not after it)

Measured baseline: the current hub transfers **~6.0 MB** of images; the
Variant B mockup on today's JPEGs ~3.3 MB full-scroll. Verified on this
machine: `sips` (sips-316) encodes AVIF natively; `kp3cns301-880.jpg` 187 KB →
**84 KB** AVIF q60 (880px) and **29 KB** at 440px, visually clean.

1. **Derivative pipeline** — `tools/make-projects-hub-images.sh` (extends the
   existing `make-project-images.sh` convention): for each of the 30 slugs,
   produce `assets/img/v2/proj/<slug>-440.jpg` + `.avif`, plus an `-880`
   pair only when the source frame is ≥880px wide (never upscale; many
   Hostinger exports cap at ~840px — for those, the larger candidate is the
   source's native width). Resample only; CSS crops in the 4/3 box — `sips`
   crop is silently broken on this machine and must not be used. Hero and
   band frames get 960/1440/1920 JPEG + AVIF. Idempotent, committed outputs.
2. **Markup** — every content image becomes
   `<picture><source type="image/avif" srcset="…440.avif 440w, …880.avif 880w" sizes="…"><img src="…880.jpg" srcset="… 440w, … 880w" sizes="…" width height loading="lazy" decoding="async"></picture>`.
   `sizes` matches the real grid tracks; only widths that physically exist
   appear in srcset (no fictional 2880w candidates). Cover keeps
   `fetchpriority="high"`, gains a `<link rel="preload" as="image">` with
   `imagesrcset` for the AVIF.
3. **Caching** — add to `netlify.toml`: `Cache-Control: public,
   max-age=31536000, immutable` for `/assets/img/*` (content-hashed exports;
   repo rule: curated v2/ images are only ever added under new names, never
   edited in place), and `public, max-age=604800` for `/assets/css/*` and
   `/assets/js/*` (main.css/custom.css/fonts.css/main.js are referenced
   unversioned site-wide, so a year-long immutable would be unsafe; amended
   from the original immutable plan by final review). No other header
   changes (the global `X-Robots-Tag: noindex` stays as-is).
4. **Budget (acceptance numbers)** — first-viewport image transfer ≤ 400 KB
   (AVIF path); full-scroll total ≤ 1.5 MB; zero CLS (aspect boxes + numeric
   width/height); LCP element = cover image with preload + high priority.
5. **Out of scope, logged as follow-ups:** repo-wide dedup of the 629
   byte-identical exports (58 MB), and re-encoding the other pages' images —
   both belong to the section-wide rollout phases, not this page.

## 5. Testing

- `tools/projects-hub-check.js` (node, same convention as
  `business-lines-check.js`): asserts byte-exact frozen strings against their
  source pages; all 30 slugs present exactly once; 14/16 status split matches
  the listing pages; every card's `data-lines` matches the discipline-listing
  membership; zero `ugcc.com/project` hrefs; every referenced image file
  exists on disk; every srcset candidate exists; numeric width/height on all
  imgs; no `hidden` attribute in the shipped HTML (no-JS completeness).
- Worktree vitest run under `tests/` per `vitest.config.mjs` convention
  (plain-object config, no `vitest/config` import).
- Browser verification: console clean, overflow 0 at 375/920/1440, filter
  round-trip (Completed → 16, reset → 30), hash deep-link preselect, black-
  screenshot gotchas worked around per the established headless-Chrome recipe.

## 6. Rollout plan (phases after this spec)

1. **Phase 1 (this spec):** replace the body of
   `construction-projects-kuwait/index.html` in place with the production
   Variant B page + pipeline + headers + checks.
2. **Phase 2:** listing pages (`all-projects-new`, `all-project-current`,
   `all-projects-completed`, 13 discipline listings) — likely thin redirects
   into hub filter states or grid reskins; decided with Danijel then.
3. **Phase 3:** the 30 project detail pages (template redesign, galleries —
   the big image-weight win).
4. Mockups (`mockups/`) are deleted from the branch before merge.

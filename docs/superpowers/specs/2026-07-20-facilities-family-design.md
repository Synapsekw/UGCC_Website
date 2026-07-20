# Facilities family — recompose on the about-suite kit

Date: 2026-07-20. Branch: `V2`.
Approved by the client's reviewer from browsable mockups (`_mockups/facilities-a`,
`plants-a`, `laboratories-a`, `equipment-a` — Option A "The Directory" of three
presented directions, plus two rounds of gallery feedback).

Pages:

| URL | Role |
|---|---|
| `/facilities-overview-construction-equipment-kuwait` | hub — routes to the three subpages |
| `/plants` | subpage |
| `/laboratories` | subpage |
| `/equipment` | subpage |

---

## 1. Constraints — read first

1. **Copy is locked.** Every visible string on the four pages is
   customer-approved and must be carried over byte-for-byte, including the
   rough edges: "Middle Eas" (truncated), "reputation for excellence" without
   "an", the duplicated Concrete/Asphalt Works Equipment table row, the
   hub table's "Asphalt Plants: 3" though `/plants` lists four. Do not fix any
   of it. New *navigational* microcopy is limited to labels that already exist
   on the site: "Explore More", the four family labels, "Previous"/"Next".
2. **Photography is locked.** Only images already referenced by these four
   pages may be used (§6). No new photographs, no crops saved as new files
   (CSS `object-fit` cropping is fine).
3. Everything in `2026-07-20-v2-design-system.md` §7 applies: builder shells
   kept and emptied, buildless, progressive enhancement, `?v=` cache-busters,
   920px breakpoint, the two reds, explicit Hammersmith on every heading.

## 2. Scope

In: the four pages' `<body>` content between header and footer; one new
stylesheet; extending no kit files. Out: header, footer, chat widget, meta
titles/descriptions (kept verbatim), URL changes, a Workshops page (Workshops
remains a non-linked entry — it has no page), the builder's other 60 pages.

## 3. Files

| File | Action |
|---|---|
| `assets/css/pages/facilities.css` | **new**, namespace `fx-`, linked by all four pages with `?v=1` |
| `facilities-overview-…-kuwait/index.html` | recompose body |
| `plants/index.html` | recompose body |
| `laboratories/index.html` | recompose body |
| `equipment/index.html` | recompose body |
| `tools/facilities-check.js` | **new** console harness |

Head order on each page (the about-suite convention):

```html
<link rel="stylesheet" href="/assets/css/v2.css?v=4">
<link rel="stylesheet" href="/assets/css/about-suite.css?v=3">
<link rel="stylesheet" href="/assets/css/pages/facilities.css?v=1">
```

Scripts: add `about-suite.js?v=2` (reveal driver) after `v2.js`, exactly as the
five suite pages do. No other JS — tiles, galleries, tables and the subnav are
CSS-only.

One family sheet rather than four page sheets because every component below
appears on at least two of the pages; the per-page-sheet convention exists to
keep sessions out of each other's files, and this is one session's family.

## 4. Shared anatomy

Every page is: **cover → family subnav → content sections → navy close →
builder footer (untouched)**. Grounds alternate light/tint per the kit's rules
(never two navy adjacent; navy only for the close).

### 4.1 Cover — kit `as-cover`, verbatim template

Copy the contract from the about-suite kit §1 including
`data-v-3ffce944`, the four section classes, intrinsic `width`/`height`,
`fetchpriority="high"`, descriptive `alt`. Eyebrow `Facilities` on all four
(the kit allows one eyebrow per suite; this is its own family and the eyebrow
is what binds it). H1s stay the builder's short caps — they are approved copy:

| Page | `{{IMG}}` | `{{H1}}` | `{{LEDE}}` (verbatim from page) |
|---|---|---|---|
| hub | `/assets/img/v2/facilities-banner.jpg` | `FACILITIES` | United Gulf Construction Company (UGCC) has an unparalleled reputation for excellence in Kuwait |
| plants | `/assets/img/v2/hero-plants.jpg` | `PLANTS` | United Gulf Construction Company (UGCC) invests considerably in owning and maintaining plants and fabrication facilities |
| laboratories | `/assets/img/v2/labs-overview.jpg` | `LABORATORIES` | UGCC has a total of seven laboratories, including the Central Testing Laboratory- a leading facility in the asphalt industry testing and analysis. |
| equipment | `/assets/img/v2/hero-equipment.jpg` | `EQUIPMENT` | United Gulf Construction Company (UGCC) has an unparalleled reputation for excellence in Kuwait |

All four images are already referenced by their pages today.

### 4.2 The family strip — reuse the shipped `.v2-subnav`

**Discovery at planning time:** all four pages already carry the shipped
navy `.v2-subnav` (`v2.css:306`) with exactly the four family links and
`.is-active` on the current page — the same component the about-suite pages
use. It is kept **unchanged in place** directly under the new cover; no
`fx-subnav` is built. The mockups' white strip is superseded by this shipped
component (same links, same position; navy ground).

One a11y addition: the `.is-active` link also gets `aria-current="page"`
(class stays — the stylesheet keys off it).

### 4.3 `fx-next` — family continue-nav

Inside each subpage's closing navy section, under the quote: two link cards in
a `1fr 1fr` grid (stack at ≤600px). Card: `border: 1px solid
rgba(255,255,255,.16)`, radius 4px, padding `22px 24px`; hover/focus-visible →
`background rgba(255,255,255,.08)`, border `rgba(255,255,255,.4)`.
Direction line 11px/700 `.18em` uppercase `--v2-red-text`; page name
Hammersmith 22px white. Sequence: Plants ⇄ Laboratories ⇄ Equipment, with the
outer cards returning to the hub. The hub itself has no `fx-next` — its whole
directory is the navigation.

### 4.4 `fx-gallery` — the approved slide sets

Replaces the builder crossfade slideshows. A `<ul>` grid on the content column
inside its own `as-section`; `role="group"` + `aria-label` naming the set.

- Base: 3 columns, `gap: 24px`. Modifiers `--2` (2 col) and `--4`
  (4 col, `gap: 20px`).
- Card: `<li>` owns `overflow: hidden; border-radius: 4px; background: #0b2233`
  (the projects-card placeholder navy — reserves the box, CLS 0).
- Image: `width: 100%; aspect-ratio: 3/2; object-fit: cover`, hover/focus zoom
  `scale(1.05) brightness(1.06) saturate(1.05)` `.5s var(--v2-ease-out-quart)`,
  gated `prefers-reduced-motion: no-preference`.
- ≤920px: all variants 2 columns, `gap: 16px`. ≤600px: 1 column.
- Images `loading="lazy" decoding="async"` with `width`/`height` attributes.
- **No autoplay, no JS.** The homepage rail earns its motion with a pause
  control; a static grid needs neither (WCAG 2.2.2 satisfied by construction).
- **No photo appears twice on one page.** Where a slide also serves as the
  Overview figure (labs, bannerslide2), it is dropped from the gallery.

### 4.5 Other shared components — from the kit, unchanged

`as-section` (+`--light`/`--tint`/`--navy`), `as-head` (title + rule; lede
only where approved copy provides one), `as-prose`, `as-figure`, `as-quote`,
and `v2-table-scroll`/`v2-table` for all tables. `fx-cols` is the only new
layout primitive: `grid-template-columns: minmax(0,1.05fr) minmax(0,.95fr);
gap: 56px; align-items: start`, single column at ≤920px.

`fx-types` — the numbered capability list (replaces the old ">" fragments):
`<ul>`, rows `grid-template-columns: 28px 1fr; gap: 18px`, `.5px` hairlines
top and bottom of the run, number 12px/700 `--v2-red`, name Hammersmith 18px
navy, optional note (`Includes recycling facilities`) 13.5px `rgba(0,42,65,.62)`.
Non-linked — these categories have no destination pages.

## 5. Page structures

### 5.1 Hub

1. Cover.
2. Subnav.
3. `as-section--light`: `as-head` — title "UGCC has unparalleled reputation
   for excellence in Kuwait" (the page's statement, verbatim incl. the missing
   article), lede = the "To accomplish these…" paragraph. Then `fx-tiles`:
   2×2 grid (`gap: 28px 24px`, 1 col ≤920px) of tiles. Tile = 16:9 shot
   (radius 4px, navy placeholder, hover zoom) + label row (red index `01`–`04`
   + Hammersmith 21px name) + verbatim blurb (15px, `rgba(0,42,65,.72)`,
   max 54ch) + "Explore More" exit link (12px/700 `.1em` uppercase navy,
   2px red underline). Tiles 01–03 are single `<a>` cards to
   `/plants`, `/laboratories`, `/equipment` with `aria-label` beginning with
   the visible name. Tile 04 WORKSHOPS is a `<li>` with no link and no
   "Explore More" — it must not read as clickable.
4. `as-section--tint`: `as-head` "Facilities" + the FACILITY/DETAILS/NOS table
   verbatim (`v2-table`).
5. `as-section--navy`: `as-quote` with the closing statement
   ("UGCC invests considerably in owning and maintaining its facilities -
   plants and fabrication facilities. fleet of heavy vehicles and equipment,
   and workshops" — verbatim, punctuation as-is). No cite.

Tile imagery (hub's own slides; the hub gets no separate gallery — these ARE
its slideshow):

| Tile | Image (largest repo copy of the approved photo — see §6) |
|---|---|
| 01 PLANTS | `a375c78c-bannerslide1-AMqDLlRxzXInk443.jpg` 1024×683 (asphalt plant) |
| 02 LABORATORIES | `12503e0b-bannerslide5-fdkqtCNKUhxe7XZ7.jpg` 1024×708 (technician) |
| 03 EQUIPMENT | `7cd93d95-bannerslide14-YewugA06yhf9oVJA.jpg` 2800×1575 (excavators) |
| 04 WORKSHOPS | `a7ab7cdc-bannerslide2-bHbn5ovp26CWQnkK.jpg` 1440×1406 (test bench) |

`b7916ad6-mainbanner_overview…jpg` is the one hub slide left unused; it may be
dropped from the page (an image not rendered is not removed photography).

### 5.2 Plants

1. Cover. 2. Subnav.
3. `--light`: head "Overview"; `fx-cols` = three verbatim paragraphs in
   `as-prose as-prose--wide` beside `as-figure` `v2/plants-overview.jpg`;
   then `fx-types` (01 Asphalt Plants + note "Includes recycling facilities",
   02 Concrete Batching Plants, 03 Crushing and Screening Plants),
   `margin-top: 48px`.
4. `--tint`: head "Plant Locations and Capacities" + PLANT/LOCATION/CAPACITY
   table, 6 rows verbatim. `CAPACITY` cells get `font-variant-numeric:
   tabular-nums`.
5. `--light`: `fx-gallery fx-gallery--2` — slides (largest copies, §6):
   `1b6ba9ff-bannerslide2-d95Zw7k3ePTgXN6l.jpg` 1024×683,
   `2e32cc34-bannerslide5-YX4jJa313ohyLXRn.jpg` 1024×684,
   `1f7b5437-bannerslide6-A0xv71ReJ4Sb4e4N.jpg` 1024×683,
   `56fc8feb-bannerslide8-mk34pqb8OyfVX0pO.jpg` 1024×606.
6. `--navy`: `as-quote` (the closing repeat of the overview line) + `fx-next`
   (← FACILITIES / LABORATORIES →).

### 5.3 Laboratories

1. Cover. 2. Subnav.
3. `--light`: head "Overview"; `fx-cols` = first four verbatim paragraphs
   beside `as-figure` `a7ab7cdc-bannerslide2-bHbn5ovp26CWQnkK.jpg` 1440×1406
   (the AMPT tester; largest copy, §6).
4. `--tint`: head — eyebrow "Asphalt · Bitumen", title "Analysis and Testing"
   (both existing page words); `fx-cols` of two `as-prose` columns: left the
   bitumen + SuperPave paragraphs, right the aggregate paragraph + the
   four-item test list (`<ul>`: Quality Test of Aggregates / of Polymer
   Modified Bitumen (PMB) / of Hot Mix Asphalt (HMA) / Compaction Test).
5. `--light`: head "Tests and Analysis Details" + the TEST AND
   ANALYSIS/AGGREGATES table, 7 rows verbatim (including the repeated
   Moisture Evaluation row).
6. `--tint`: `fx-gallery` (3-col) — slides (largest copies, §6):
   `6fd5fe2f-bannerslide1-5plCBZWEwdyB3l2D.jpg` 1440×957,
   `750c616d-bannerslide3-8FKHjAkdbSiDfJ9N.jpg` 2800×1591,
   `12503e0b-bannerslide5-fdkqtCNKUhxe7XZ7.jpg` 1024×708,
   `1af51961-bannerslide6-8zTmuWUEZvCliFN8.jpg` 1024×604,
   `0fc729e2-bannerslide7-KeDi4Y9GQWyA9qea.jpg` 1024×683.
   bannerslide2 is excluded — it is the §3 figure. bannerslide5 also serves
   as the hub's LABORATORIES tile; cross-page repetition is fine (the rule is
   per-page only).
7. `--navy`: `as-quote` ("The UGCC Central Testing Laboratory is a leading
   facility in the asphalt industry testing and analysis") + `fx-next`
   (← PLANTS / EQUIPMENT →).

### 5.4 Equipment

1. Cover. 2. Subnav.
3. `--light`: head "Overview"; `fx-cols` = three verbatim paragraphs (incl.
   "Middle Eas") beside `fx-types` of the seven fleet categories 01–07.
4. `--tint`: head "Equipment Details" + EQUIPMENT TYPE/DETAILS table, 7 rows
   verbatim.
5. `--light`: `fx-gallery fx-gallery--4` — the twelve slides (largest
   copies, §6; ten are square 768×768 exports, cropped 3:2 by the grid):
   `f52f4a4b-bannerslide1-kxomI3O2BG0kODWb.jpg`,
   `b0f172f8-bannerslide2-pOxpZ0UwQkf7zgmB.jpg`,
   `ea330e3d-bannerslide4-QRaqZAbHjDkEH2qY.jpg`,
   `f995e6ee-bannerslide5-lYx2kDYILzvtu06m.jpg`,
   `38013849-bannerslide7-bnn8lIXgg9jkfpdW.jpg`,
   `094397a5-bannerslide8-gbcVdxokP8e4Jbkl.jpg`,
   `203820af-bannerslide9-tckM6gALWSyO2pJ2.jpg`,
   `8b7ea221-bannerslide11-FEXuXJL9O4Ss1mtq.jpg`,
   `46b1701a-bannerslide12-x1WIOUlKly76caXd.jpg`,
   `a27581d9-bannerslide13-A6njwNEdUiObYJZn.jpg`,
   `7cd93d95-bannerslide14-YewugA06yhf9oVJA.jpg` 2800×1575,
   `dea701e5-mainbanner-lbuG6SZifrV436Oj.jpg` 768×768.
6. `--navy`: no closing statement exists on this page, so no quote —
   `fx-next` only (← LABORATORIES / FACILITIES →).

## 6. Imagery rules

- Every rendered photograph already appears on its page today; the only *new
  placements* are covers reusing the staged `v2/` files their pages already
  load.
- The builder exports each photograph at several sizes under different hash
  prefixes; the **content suffix** (e.g. `-fdkqtCNKUhxe7XZ7`) identifies the
  photo. **Always use the largest copy in `assets/img` for that suffix**
  (measured at planning time; the chosen filenames are in §5). Same approved
  photo, best available pixels — mobile 375px copies must not ship in
  600px-wide slots.
- The builder's duplicated copies collapse to one `<img>` per photo.
- Descriptive `alt` on every content image (new alt text is required a11y
  metadata, not copy). Cover alts describe the photograph, not the page.
- `width`/`height` attributes from each file's intrinsic pixels — measure at
  implementation time, do not guess.

## 7. Meta, SEO, structured data

`<title>`, meta description, OG/canonical: **kept verbatim** on all four
pages. JSON-LD: if a page's `WebPage` `image` points at a file no longer
rendered on the page, repoint it to that page's cover (the business-lines
precedent); change nothing else. H1s are unchanged strings, so heading
topicality is untouched.

## 8. Motion and reveals

`about-suite.js` drives reveals on the same contract as the suite pages
(observer, `.is-in`, `--i` stagger, 4s fail-safe, nothing hidden without the
gate classes). Opt in: `as-head`, `as-prose`, `as-card`-equivalent `fx-tile`,
`fx-type` rows, `fx-gallery` items, `as-quote` (kit rules already cover the
`as-*` ones; `facilities.css` adds entrance rules for `fx-` elements under the
same `.hero-motion.v2-reveal` double gate). Covers never reveal. All hover
motion inside `prefers-reduced-motion: no-preference`; colour feedback stays
outside the gate.

## 9. Accessibility

- One `<h1>` per page (cover). Section titles `<h2>`; `<h3>` only for tile
  names on the hub. No skipped levels.
- Hub tile anchors: whole-card anchors would otherwise announce image alt +
  blurb as one long accname, so each carries an `aria-label` that begins with
  the visible tile name (SC 2.5.3) and stops there — e.g. `"PLANTS"`.
- `.v2-subnav`: `aria-current="page"` added beside `.is-active`; the shipped
  component already scrolls rather than wraps at narrow widths.
- Galleries: `role="group"` + `aria-label`; images carry real `alt`.
- Hover states duplicated on `:focus-visible` in the same rule, kit-style.
- Tables keep `<thead>`/`<tbody>` and header cells as `<th>`.
- Workshops tile exposes no link semantics.

## 10. Verification — `tools/facilities-check.js`

Console IIFE, per-page assertions (auto-detects which of the four pages it is
on):

1. Cover contract: `data-v-3ffce944` present, `alt` non-empty, rendered
   height 524.
2. Subnav: the shipped `.v2-subnav` present with four links in family order;
   exactly one link carries both `.is-active` and `aria-current="page"`, and
   it matches the page URL.
3. Hub: exactly 3 tile anchors + 1 non-anchor tile; every anchor `aria-label`
   starts with its visible `<h3>` text; tile 04 contains no `<a>`.
4. Galleries: expected card count per page (plants 4, labs 5, equipment 12);
   no `src` appears twice anywhere on the page; every `<img>` has
   width+height.
5. Eyebrow colours: `--v2-red` on light grounds, `--v2-red-text` on navy/dark.
6. No element computes `opacity: 0` without the reveal gate classes
   (progressive-enhancement guard).
7. Copy freeze: SHA of the concatenated `textContent` of prose, tables and
   blurbs matches a recorded constant per page — any accidental copy edit
   fails loudly.
8. Tables: row counts (hub 5, plants 6, labs 7, equipment 7).

Manual pass: 1280 / 920 / 600 widths, reduced-motion, keyboard walk of hub
tiles + subnav + fx-next.

## 11. Risks

- **Cover offset regression** — the `data-v-3ffce944` hazard (kit §1). The
  harness asserts it; do not trust visual inspection.
- **Copy drift while re-flowing markup** — mitigated by check #7's hash and
  by building each page's text nodes by copy-paste from the live builder DOM,
  never retyped.
- **Slideshow removal orphans builder CSS/JS hooks** — the emptied shells
  drop `--block-padding` etc.; set `padding: 0` on each recomposed section
  (design-system hazard #3).
- **`labs-overview.jpg` as a 524px-wide-crop cover** — the file is
  1024×708; at very wide viewports upscaling may soften. Acceptable for now;
  flagged in case the client supplies a wider lab photograph later.
- `_mockups/` is throwaway and must not ship — delete the directory when the
  real pages land.

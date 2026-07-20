# Business Lines hub — recompose on the about-suite kit

Date: 2026-07-20. Branch: `claude/business-lines-mosaic`, cut from `V2` at `cf2532b`.
Worktree: `.claude/worktrees/business-lines` (port 8759).

Supersedes the Hostinger-builder output at
`business-lines-construction-services-kuwait/index.html`.

Read `2026-07-20-v2-design-system.md` and `2026-07-20-about-suite-kit.md` first.
This document assumes both and does not restate their conventions.

---

## 1. Why

The hub is the **only** doorway to the seven business lines. The header has no
dropdown — every nav item carries `aria-haspopup="false"` and an empty submenu
slot — so a visitor who wants "roads and bridges" can reach it from exactly one
page. That makes the hub a directory, and its single job is to route.

It does not currently do that job:

- The hero is a full-bleed photograph with **no headline in the viewport** and an
  `alt` of "brown and black car wheel".
- The seven cards below repeat, near-verbatim, the seven rows already on the
  landing page (`#u7vIc0iRh`, "Who are we"). The hub is a duplicate of a section
  the visitor has just scrolled past.
- Card DOM order is inconsistent (the Roads paragraph precedes its card;
  Micro-Tunneling's heading precedes its image), and the page intro is re-emitted
  a second time as a stray `<h6>` between cards 04 and 05.

### Decisions taken

| Decision | Value | Rationale |
|---|---|---|
| Hub's job | **Fast directory** | The homepage already argues breadth; the hub should route, not re-argue. |
| Layout | **Weighted mosaic** (Option A) | Tile size encodes where the firm's weight sits — meaning, not decoration. |
| Lead tiles | **Roads and Bridges**, **Civil Infrastructure** | Matches the established 01/02 ordering; civil carries the most completed contracts. |
| Sub-page template | One strict spine, all seven | §9 — recorded here, implemented separately. |
| Copy | Drafted here, client-approved before ship | Five of seven sub-pages carry another discipline's copy. |
| Scope | **Hub only** | Sub-pages are separate work against the spine in §9. |

---

## 2. Scope

**In scope.** `business-lines-construction-services-kuwait/index.html`; a new
`assets/css/pages/business-lines.css`; derived tile imagery; a
`tools/business-lines-check.js` harness.

**Out of scope.** The seven sub-pages. The header nav (adding a Business Lines
dropdown is a site-wide, 67-page change and is its own decision). The
`*-current` / `*-completed` listing pages themselves. Any edit to `v2.css`,
`about-suite.css`, or the landing page.

**Non-goals.** Do not "DRY up" the duplicated homepage content by making the hub
`@import` anything from `sections.css` — that file is index-only by design.

---

## 3. Files

Added to `<head>`, after the existing kit sheets and in this order:

```html
<link rel="stylesheet" href="/assets/css/fonts.css">
<link rel="stylesheet" href="/assets/css/main.css">
<link rel="stylesheet" href="/assets/css/custom.css">
<link rel="stylesheet" href="/assets/css/v2.css?v=4">
<link rel="stylesheet" href="/assets/css/about-suite.css?v=3">
<link rel="stylesheet" href="/assets/css/pages/business-lines.css?v=1">
```

Scripts at end of `<body>`, all deferred:

```html
<script src="/assets/js/chat-widget.js?v=1" defer></script>
<script src="/assets/js/main.js" defer></script>
<script src="/assets/js/v2.js?v=3" defer></script>
<script src="/assets/js/about-suite.js?v=1" defer></script>
```

`about-suite.js` is what reveals `.as-head`; the mosaic opts into the same
contract in §6.4. **No new JavaScript is written for this page.**

New files:

- `assets/css/pages/business-lines.css` — the mosaic only.
- `tools/business-lines-check.js` — dependency-free console IIFE.
- `assets/img/v2/bl/*.webp` — derived tile imagery (§7).

`about-suite.css` is **not** edited. If the mosaic turns out to be reusable on
another page, promoting it into the kit is a later decision with its own review.

---

## 4. Page structure

Three builder `<section class="block" id="…">` shells are kept and their
contents replaced. Grounds run cover → light → navy, which is the About page's
own rhythm minus the bands.

| # | Shell | Component | Ground |
|---|---|---|---|
| 1 | existing hero block | `as-cover` | photo + scrim |
| 2 | existing cards block | `as-section as-section--light` | `#fff` |
| 3 | existing CTA block | `as-section as-section--navy` | `--v2-navy` |
| 4 | `#FUdf9w9dXZ` | untouched builder footer | black |

The stray duplicate `<h6>` between cards 04 and 05 is deleted.

### 4.1 Cover

```html
<section class="block block--desktop-first-visible block--mobile-first-visible as-cover">
  <img class="as-cover__media" src="/assets/img/v2/hero-bizlines.jpg"
       alt="Aerial view of a completed UGCC road network and roundabout in Kuwait"
       width="1920" height="1080" fetchpriority="high" decoding="async">
  <div class="as-cover__scrim" aria-hidden="true"></div>
  <div class="as-cover__inner">
    <p class="as-cover__eyebrow">Business lines</p>
    <h1 class="as-cover__title">Construction services across seven disciplines</h1>
    <p class="as-cover__lede">One Grade-I contractor covering transport, civil
      infrastructure, buildings, energy and water — from motorway interchanges to
      shaft sinking thirty metres below a live city.</p>
  </div>
</section>
```

**The h1 changes** from `BUSINESS LINES` to the above. "Business lines" is a
navigation label, not a topic signal; it moves to the eyebrow, where the visitor
still gets the orientation cue. This continues the intent of `cf2532b`
("topical h1s"). `as-cover__title` is uppercased in CSS, so the sentence-case
source string renders as caps without being shouted in the markup.

The existing `/assets/img/v2/hero-bizlines.jpg` (1920×1080, 413 KB) is kept.
Only its `alt` changes.

**Cover title sizing.** `.as-cover__title` is `clamp(40px, 5.2vw, 68px)` and
`text-transform: uppercase` — tuned for the suite's one-word titles ("ABOUT",
"QUALITY"). A 44-character sentence set in caps at 68px will run to three or
four lines and overflow the 524px cover. This page therefore declares a local
cap in `business-lines.css`:

```css
.as-cover__title { font-size: clamp(30px, 3.4vw, 46px); max-width: 18ch; }
```

Scoped to this page's stylesheet, which loads after `about-suite.css`, so no
suite page is affected. The `18ch` measure is what breaks the line after
"services" at desktop; verify against the rendered page and adjust with a
comment recording the measurement, per the "comment the why" rule.

### 4.2 Directory

```html
<section class="block as-section as-section--light">
  <div class="as-section__inner">
    <header class="as-head">
      <p class="as-head__eyebrow">What we do</p>
      <h2 class="as-head__title">Multidisciplinary contracting</h2>
      <span class="as-head__rule" aria-hidden="true"></span>
      <p class="as-head__lede">Each line carries its own capabilities, plant and
        client base. Every page links through to that discipline's live and
        completed contracts.</p>
    </header>
    <ul class="bl-mosaic">…8 items…</ul>
  </div>
</section>
```

### 4.3 Contact

Reuses the existing CTA content on a navy ground, with `as-btn as-btn--on-dark`
to `/contact-us`. The current CTA background photograph
(`4bca753a-cover_high-…jpg`, alt "low angle photography of gray tower crane") is
dropped: three photographic bands in a row — cover, seven tiles, CTA — is one
too many, and a flat navy close hands off to the black footer cleanly.

---

## 5. Content

Contract counts are **derived from the existing listing pages** and are real.
They are the count of distinct project pages linked from that line's
`-current` and `-completed` pages.

| # | Name | Cur | Comp | Count | Scope line |
|---|---|---|---|---|---|
| 01 | Roads and Bridges | 6 | 8 | **14** | Highways, interchanges, flyovers, bridge erection, asphalt paving and stormwater drainage. |
| 02 | Civil Infrastructure | 4 | 13 | **17** | Water networks, sewerage and drainage, pumping stations, utility corridors, foundations and earthworks. |
| 03 | Building Construction | 2 | 5 | **7** | Structural and reinforced concrete, facades, steel roof systems, fit-out and turnkey delivery. |
| 04 | Oil and Gas | 0 | 4 | **4** | Gathering centres, heavy civil foundations, pipe racks, tank farms and blast-resistant shelters. |
| 05 | Water and Wastewater | 3 | 3 | **6** | Treatment plants, pumping stations, reservoirs, distribution mains and trunk sewers. |
| 06 | Electro-Mechanical | 7 | 11 | **18** | Street lighting, fire fighting systems, HVAC, instrumentation and pipeline works. |
| 07 | Micro-Tunnelling | 3 | 2 | **5** | Guided boring 250–2400 mm diameter, shaft sinking to 30 m, without surface disruption. |

Counts are **per-line and overlapping** — a project may sit under several
disciplines, so they do not sum to the site total. The distinct project count is
**30**, which is the figure the landing page already uses ("six of thirty
contracts on record"). The fill tile uses 30; nothing on the page sums the seven.

### 5.1 Naming — resolved

One line currently has three spellings. Canonical forms, to be used here and
carried into the sub-pages:

| Use | Do not use |
|---|---|
| **Micro-Tunnelling** (double L) | Micro-Tunneling |
| **Water and Wastewater** | Water and waste water · Water & Waste Water · Water and Wastewater management |

The double-L spelling is chosen because the discipline page's own `<h1>` already
uses it and it is the standard British-English form used across GCC tendering.
Renaming the `micro-tunneling-kuwait` **directory** is out of scope — the URL
stays as-is; only display text changes.

### 5.2 Meta

`<title>` and description are already good and are kept verbatim. The
`WebPage` JSON-LD keeps its keywords; its `image` is repointed from
`7d61e989-credentials1-…png` (which does not appear on the page) to the cover.

### 5.3 The fill tile

Seven tiles in a six-column grid leaves one empty cell in the last row. It is
filled with a link to `/construction-projects-kuwait` carrying the figure 30 and
the label "contracts on record". This is a real destination, not a spacer.

---

## 6. The mosaic

`assets/css/pages/business-lines.css`. Namespace `bl-`. Everything else on the
page is kit.

### 6.1 Markup

```html
<ul class="bl-mosaic">
  <li class="bl-tile bl-tile--lead">
    <a class="bl-tile__link" href="/roads-and-bridges-contractor-kuwait">
      <span class="bl-tile__shot">
        <img src="/assets/img/v2/bl/roads.webp"
             alt="Multi-lane motorway interchange built by UGCC in Kuwait"
             width="1220" height="763" loading="lazy" decoding="async">
      </span>
      <span class="bl-tile__body">
        <span class="bl-tile__name">Roads and Bridges</span>
        <span class="bl-tile__desc">Highways, interchanges, flyovers…</span>
        <span class="bl-tile__meta">
          <b class="bl-tile__count">14</b> contracts
          <span class="bl-tile__sep" aria-hidden="true">·</span> PAI · PAHW · MPW
        </span>
      </span>
    </a>
  </li>
  …
</ul>
```

`<ul>`/`<li>` because it is a list of seven-plus-one destinations, and it gives
screen readers a count. **One anchor per tile** — one tab stop, matching the
project-card rule.

### 6.2 Grid

```css
.bl-mosaic {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 28px 24px;                 /* matches .v2-proj__grid */
  margin: 0; padding: 0; list-style: none;
}
.bl-tile { min-width: 0; display: flex; }   /* grid-blowout guard */
.bl-tile--lead { grid-column: span 3; }
.bl-tile:not(.bl-tile--lead) { grid-column: span 2; }
.bl-tile__link { display: flex; flex-direction: column; flex: 1; text-decoration: none; }
```

`minmax(0, 1fr)` on the tracks and `min-width: 0` on the item are both required —
this is hazard 11 in the design system, and `overflow-wrap: break-word` will not
substitute.

Aspect ratios differ by rank, which is what makes the weighting read as
deliberate rather than as a rendering accident:

```css
.bl-tile__shot { display: block; overflow: hidden; border-radius: 4px;
                 background: #0b2233; }        /* reserves the box → CLS 0 */
.bl-tile--lead .bl-tile__shot { aspect-ratio: 16 / 9; }
.bl-tile:not(.bl-tile--lead) .bl-tile__shot { aspect-ratio: 16 / 10; }
.bl-tile__shot img { width: 100%; height: 100%; object-fit: cover; }
```

### 6.3 Type and hover

Name is Hammersmith One 400 — declared explicitly, family **and** weight
(hazard 4). Lead 21px, standard 16px. Description 13px/1.6 `--as-muted-light`.
Meta 10.5px/600, `.12em`, uppercase, `--as-meta-light`, with the count in
`--v2-red` and `font-variant-numeric: tabular-nums`.

Hover and focus share **one rule** so they cannot drift:

```css
.bl-tile__link:hover .bl-tile__shot img,
.bl-tile__link:focus-visible .bl-tile__shot img { transform: scale(1.05);
  filter: brightness(1.06) saturate(1.05); }
.bl-tile__link:hover .bl-tile__name,
.bl-tile__link:focus-visible .bl-tile__name { color: var(--v2-red); }
```

The zoom lives inside `@media (prefers-reduced-motion: no-preference)`; the
colour change does **not**, so a reduced-motion visitor still gets feedback.
`.bl-tile__link:focus-visible` takes `outline-offset: 5px; border-radius: 4px`
so the ring wraps the whole tile, matching `.v2-proj__card`.

### 6.4 Reveal

The mosaic opts into the existing contract rather than adding script:
`.bl-tile` is added to the `about-suite.js` selector list, gets an inline `--i`,
and animates with `as-fade-up .8s var(--v2-ease-out-expo) both` at
`calc(var(--i,0) * 60ms)`, double-gated on `.hero-motion.v2-reveal`.

> This is the **one** edit to a shared file: appending `, .bl-tile` to the
> selector string in `assets/js/about-suite.js`, and bumping it to `?v=2` on the
> five About-suite pages plus this one. It is additive and cannot change those
> pages' behaviour, because none of them contains a `.bl-tile`. If that
> six-file bump is judged too invasive at review, the fallback is to drop the
> reveal entirely — the page must render fully without it regardless.

### 6.5 Responsive

Breakpoint **920px** — the builder's own, per the design system. There is no
768px breakpoint and none is added.

```css
@media (max-width: 920px) {
  .bl-mosaic { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px 16px; }
  .bl-tile--lead, .bl-tile:not(.bl-tile--lead) { grid-column: span 1; }
  .bl-tile--lead .bl-tile__shot { aspect-ratio: 16 / 10; }   /* ranks converge */
  .bl-tile--lead .bl-tile__name { font-size: 16px; }
}
@media (max-width: 600px) {
  .bl-mosaic { grid-template-columns: minmax(0, 1fr); gap: 20px; }
}
```

The weighting is **deliberately desktop-only**. At two columns a double-width
lead cannot exist, and unequal heights at one column would read as inconsistency
rather than as hierarchy.

---

## 7. Imagery

Sources exist at 1920px for all seven lines — the 768px variants currently used
on the hub are downscaled copies and are **not** to be used, because a lead tile
is ~605 CSS px and therefore 1210 px at 2×.

**These seven images are client-specified and are not to be substituted.** Each
is the image already used for that line on the current site. Selection is the
client's call, not a design decision available to this work.

| Line | Source (`assets/img/`) | Source px |
|---|---|---|
| Roads | `639d396c-cairo-street-hd-final-v2_edit…-LzpQRTTKD9Mfji4x.jpg` | 1920×1080 |
| Civil | `0af4cdfb-civil-infrastructure-1-bDchTHDP9wFTCaIk.png` | 2800 |
| Building | `90e581cf-banner1-P9DJjSgxMdgIWaSl.jpg` | 1920×1080 |
| Oil and gas | `785ed39d-picture2-1-pzwOGcrJcMDwEAmw.jpg` | 1920×1267 |
| Water | `264cfb29-banner1-1-d2fLiHtRPfmiLPjc.jpg` | 1920×1254 |
| Electro-mechanical | `7ed8b27e-banner1-2-7nJH1ii5XmyAwgxe.jpg` | 1920×1080 |
| Micro-tunnelling | `84b54fc2-banner2-nepTLLbb7J94Brvx.png` | 1920×1440 |

All seven are at least 1920px, so every one has ample headroom for both the
1220px lead and the 680px standard derivation. Resolution is not a constraint
anywhere in this set.

### 7.0 Handling notes

Two frames need care in the crop, because their subject does not sit centre:

- **Civil** (`0af4cdfb-…png`) is a wide plaza with the subject — the barrier
  line and gate structures — running across the lower two-thirds. A centre crop
  to 16:9 keeps it; do not crop from the top, which is empty sky.
- **Water** (`264cfb29-…jpg`) is a pump hall shot with the pump line along the
  lower half. Crop from the bottom of the frame, not the centre.

Verify both crops visually at tile size before committing, rather than trusting
the default centre crop.

Derive into `assets/img/v2/bl/` as WebP, quality 82:

- leads (`roads`, `civil`) at **1220×686** (16:9)
- the other five at **680×425** (16:10)

Two sources are PNGs carrying photographic content — civil at 3.0 MB and
micro-tunnelling at 541 KB. Both must be re-encoded; shipping a 3 MB PNG into a
605px tile is the single largest performance defect available here. Re-encoding
changes the file that is *served*, not the photograph the client chose.

**Budget: under 800 KiB for all seven combined, at JPEG quality no lower than
70.** Delivered at 783 KiB.

The budget was originally written as 400 KB, which was wrong: it assumed a
modern JPEG encoder. `sips` is the only encoder available here and is markedly
less efficient — hitting 400 KB required quality 40, which visibly degrades a
1220px lead tile. Quality is the hard floor and the byte budget yields to it.

Verify compression damage on a **native-resolution crop** of the derived file,
never on a downscaled copy — downscaling averages artifacts away and will pass
an image that is actually broken:

```bash
sips --cropOffset 180 380 -c 300 440 roads.jpg --out /tmp/zoom.jpg
```

Look for blocking in flat areas (sky, asphalt, concrete), mosquito noise around
high-contrast edges (lane markings, barrier stripes), and colour banding.

`width` and `height` attributes are mandatory on every `<img>` and must match
the derived asset, so the aspect-ratio box and the intrinsic size agree.

### 7.1 Alt text

Every image gets descriptive alt — these photographs carry the section's
meaning, so empty `alt` is wrong. Alt describes **what is in the frame**, not
the discipline name (which is already the adjacent visible text, and repeating
it makes the tile announce twice).

Not: `alt="Roads and Bridges"`. Instead: `alt="Multi-lane motorway interchange
built by UGCC in Kuwait"`. Final strings are written against the actual
photographs during implementation, and every one is reviewed — the current page
demonstrates what happens when they are not.

---

## 8. Accessibility

- One `<h1>` (the cover). The directory's title is the page's single `<h2>`.
  The tile names are `<span>`, **not** headings — they are link labels inside a
  list, and eight `<h3>`s would imply eight subsections that do not exist.
- The mosaic is `<ul aria-label="Business lines">`.
- Contract counts are read as part of the link text, so each tile announces
  "Roads and Bridges, highways interchanges…, 14 contracts". Verify the accname
  begins with the visible name (SC 2.5.3, Label in Name).
- The `·` separators are `aria-hidden="true"`.
- Focus ring is the global `v2.css` rule; only offset and radius are overridden.
- `forced-colors` and `prefers-contrast: more` blocks restore a real outline.
- Contrast is measured against the **rendered** ground, not assumed. Reused
  kit tokens (`--as-muted-light` 5.95:1, `--as-meta-light` 4.76:1) are already
  measured; do not lighten either.

---

## 9. The sub-page spine (recorded, not implemented)

Agreed order for all seven discipline pages, to be built as separate work:

1. `as-cover` — discipline name, one-line scope, eyebrow "Business lines"
2. **`v2-subnav` — seven tabs across the disciplines** *(new)*
3. Overview — `as-prose`
4. Capabilities — `as-pills`, with real specifications as `as-pill--key`
5. At a glance — `as-stats`, three tiles
6. `as-band` — one full-bleed photograph
7. Key projects — four named contracts linking to existing project pages
8. **Current and completed projects for this line** *(new)*
9. Clients — per-line logos with real alt
10. Contact — navy band

Items 2 and 8 are the substantive additions. The `*-current` / `*-completed`
pages exist and are populated, and **nothing on the site links to them** from a
business line; today the only route between two disciplines is back through the
hub.

### 9.1 Content repairs owed at that time

Recorded here so they are not lost:

- Building Construction's intro is verbatim the Civil Infrastructure intro — it
  reads "UGCC's Civil Infrastructure division" on the building page.
- Five pages share one "Key Projects" lead, all of it written about civil
  infrastructure.
- Typos in live copy: "GCC has tremendous expertise" (missing U); "stream flood"
  for steam flood; "sever network"; "tankge upgradation"; "Duqum"/"Duqm".
- An electro-mechanical card labelled "PAHW-C-1151-2009-2010" links to
  `/pahw1533` and describes a Mutlaa street-lighting contract.
- The orphaned "USD 358M / COMPLETED PROJECTS" stat on electro-mechanical only.
- No `oil-and-gas-current` page exists, so that tab is absent from every
  current-projects filter row. Either create it or make the rail's tab set
  status-aware.
- Every image ships twice as separate desktop and mobile assets.

---

## 10. Verification

`tools/business-lines-check.js`, a dependency-free console IIFE in the
established style, asserting the decisions that a screenshot cannot show:

1. Exactly one `<h1>`, and it is the cover title.
2. Exactly eight `.bl-tile`, of which two carry `--lead`.
3. Every `.bl-tile__shot img` has non-empty `alt`, and `width`/`height` matching
   its natural aspect ratio (CLS guard).
4. No `alt` equals its adjacent `.bl-tile__name` text.
5. No descendant of `.bl-mosaic` computes to `opacity: 0` after load — the page
   must never depend on JS to become visible.
6. The head carries exactly one rule element.
7. `.as-head__eyebrow` computes to `--v2-red` (light ground), not `--v2-red-text`.
8. Each tile anchor's accessible name begins with its visible name.
9. At 1280 px the grid resolves to three rows; at 900 px to two columns.

### Manual checks

- Render with JavaScript disabled: the full page must be present and legible.
- `prefers-reduced-motion: reduce`: no zoom, but the name still recolours.
- Keyboard: eight tab stops in visual order, ring wrapping the whole tile.
- Lighthouse on the built page — the derived-image budget in §7 is the point.

---

## 11. Risks

| Risk | Handling |
|---|---|
| Weak or repetitive photography exposed at lead-tile size | Audit all seven before building; if a lead image is poor, swap which lines lead rather than shipping it. |
| The `about-suite.js` selector edit touches five reviewed pages | Additive and inert there (§6.4); fallback is to drop the reveal. |
| Concurrent sessions on `V2` | Worktree isolation; only one shared file is touched, and it is append-only. |
| Contract counts drift as listings change | They are visible, checkable numbers on the page. Note in the handover that they are derived from the listing pages. |
| Copy not yet client-approved | Structure ships independent of wording; every string in §5 is replaceable without touching CSS. |

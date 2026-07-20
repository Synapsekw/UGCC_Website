# Business-line sub-pages — the §9 spine across all seven disciplines

Date: 2026-07-20. Branch: `claude/business-line-pages`, cut from `V2` at `f667b00`.
Worktree: `.claude/worktrees/business-line-pages`.

Implements §9 of `2026-07-20-business-lines-hub-design.md` — the agreed sub-page
spine — and the §9.1 content repairs. Read that spec, the design system
(`2026-07-20-v2-design-system.md`) and the kit contract
(`2026-07-20-about-suite-kit.md`) first; this document assumes all three.

User decisions taken 2026-07-20 (recorded, all four accepted as recommended):

| Question | Decision |
|---|---|
| Stat tiles | Contracts on record / USD completed-contract value / largest single contract — one template, all seven pages |
| Sub-nav | `v2-subnav`, 8 tabs: **All** → hub, then the seven disciplines, canonical names |
| Oil & Gas current | Status-aware links; do **not** create `oil-and-gas-current` |
| Clients | Derived per line from actual project owners; UGCC's own logo dropped; clients with no logo asset omitted |
| Template overall | Approved as presented ("Approved — write the spec") |

**Customer constraint, added 2026-07-20 after plan approval (supersedes §7 as
first written):** existing text and images must not be changed.
Interpretation confirmed with the user:

| Question | Decision |
|---|---|
| Body copy | **Freeze + agreed repairs only** — every existing sentence is reused verbatim; only the documented §9.1 error repairs apply (wrong-discipline intro dropped, missing-U fix, canonical names, the shared civil "Key Projects" boilerplate dropped from the five pages where it is wrong-discipline text). No newly drafted marketing copy, no new claims. |
| New UI text | **Navigation labels and stats allowed** — sub-nav tabs, listing buttons, generic section headings, and the three derived stat figures may be added. |
| Images | **Same photos, optimize allowed** — only photographs already on each page (or its hub tile) may appear; re-encoding/resizing the same frame is permitted. Pages with no distinct second photograph get no band. |

Consequences threaded through this spec: overview prose is the page's own
existing paragraphs (§7); section heads use generic labels or the page's
existing headings, with no drafted titles or ledes (§4.3–§4.10); capability
pills are the page's existing capability list verbatim (§4.4); the
value-claim key pills are dropped — only Micro-Tunnelling keeps one, from its
existing specification text (§6.5); bands are re-derived from on-page
photographs (§4.6). Alt text, `aria-label`s and meta fixes are accessibility
and metadata, not customer-visible copy, and proceed as specified.

---

## 1. Why

The seven discipline pages are the original Hostinger-builder output and carry
the section's worst defects: five of seven open with another discipline's copy
(Building Construction's intro is verbatim the Civil Infrastructure intro);
five share one "Key Projects" lead written about civil infrastructure; there is
essentially no alt text; every image ships twice as desktop and mobile assets;
one project card links to the wrong contract; and the only stat on any page
("USD 358M / COMPLETED PROJECTS", electro-mechanical) is provably the sum of
the three **water** projects, not of electro-mechanical work.

Structurally, the pages are dead ends. Nothing links from a discipline to its
`-current` / `-completed` listing pages, and the only route between two
disciplines is back through the hub. Items 2 (sub-nav) and 8 (listing links)
of the spine fix exactly that.

## 2. Scope

**In scope.** The seven page files:

| # | Directory | Display name (canonical) |
|---|---|---|
| 01 | `roads-and-bridges-contractor-kuwait` | Roads and Bridges |
| 02 | `civil-infrastructure-kuwait` | Civil Infrastructure |
| 03 | `building-construction-kuwait` | Building Construction |
| 04 | `oil-and-gas-construction-kuwait` | Oil and Gas |
| 05 | `water-treatment-plant-kuwait` | Water and Wastewater |
| 06 | `electro-mechanical-contractor-kuwait` | Electro-Mechanical |
| 07 | `micro-tunneling-kuwait` | Micro-Tunnelling |

Plus: one new shared stylesheet `assets/css/pages/business-line.css`
(singular — the hub keeps `business-lines.css`); derived cover/band imagery in
`assets/img/v2/blp/`; a harness `tools/business-line-check.js`; static tests in
`tests/`; and a vitest config exclusion for `.claude/worktrees/**`.

**The `micro-tunneling-kuwait` URL keeps its single-L spelling.** Only display
text uses Micro-Tunnelling. This is deliberate; do not "fix" the directory.

**Out of scope.** The hub. The header nav (no dropdown — the sub-nav is the
answer, decided at brainstorm). The 15 listing pages, including their rails'
missing Oil and Gas tab on the current set and their non-canonical tab labels
("Micro-Tunneling", "Water & Waste Water") — recorded as follow-ups in §11.
The 30 project pages, including `qstsh15`'s internally inconsistent value
("10,040,000 USD (31,900,000 KWD)" — the KWD implies ~104M USD). No edit to
`v2.css`, `about-suite.css`, `about-suite.js`, or any other shared file.

**Non-goals.** No reveal-selector additions: the kit script already observes
`.as-head`, `.as-prose`, `.as-stat`; the page-scoped `blp-` components simply
do not reveal. No new JavaScript anywhere.

## 3. Files per page

Head, after `custom.css` (identical order to the hub):

```html
<link rel="stylesheet" href="/assets/css/v2.css?v=4">
<link rel="stylesheet" href="/assets/css/about-suite.css?v=3">
<link rel="stylesheet" href="/assets/css/pages/business-line.css?v=1">
```

Scripts at end of `<body>`, all deferred:

```html
<script src="/assets/js/chat-widget.js?v=2" defer></script>
<script src="/assets/js/main.js" defer></script>
<script src="/assets/js/v2.js?v=3" defer></script>
<script src="/assets/js/about-suite.js?v=2" defer></script>
```

`about-suite.js` is referenced at its **current** version (`?v=2`); the file is
not edited, so no bump and no other page is touched.

Body structure follows the **About-suite precedent, not the hub's
shell-keeping**: everything between the builder header and the footer block
`#FUdf9w9dXZ` is replaced wholesale with hand-authored, readable markup. The
cover keeps the load-bearing four classes plus `data-v-3ffce944`
(`<section class="block block--desktop-first-visible block--mobile-first-visible
as-cover" data-v-3ffce944>`); every other section is a plain
`<section class="as-section as-section--…">` with no builder ID and no inline
style; `as-band` figures sit between sections as direct children of the body.
The five builder content shells per page (and their inline custom properties)
are deleted, as they were on all five About-suite pages. Header and footer are
untouched.

## 4. The template — ten sections, one order, all seven pages

Grounds: photo → navy rail → light → tint → navy → photo → light → tint →
light → navy → (black builder footer). Exactly two navy sections, never
adjacent, satisfying the kit's alternation rules.

| # | Section | Component | Ground |
|---|---|---|---|
| 1 | Cover | `as-cover` | photo + scrim |
| 2 | Sub-nav | `v2-subnav` | navy |
| 3 | Overview | `as-head` + `as-prose` | light |
| 4 | Capabilities | `as-head` + `as-pills` | tint |
| 5 | At a glance | `as-head` + `as-stats` | **navy** |
| 6 | Band | `as-band` | photo |
| 7 | Key projects | `as-head` + `blp-proj` rows | light |
| 8 | All projects | `as-head` + `as-btn`(s) | tint |
| 9 | Clients | `as-head` + `blp-clients` | light |
| 10 | Contact | `as-head` + `as-btn--on-dark` | **navy** |

### 4.1 Cover

Kit §1 verbatim, with the optional eyebrow (the kit's "at most one page" rule
governs the five About pages; on this seven-page family the eyebrow is part of
the family template, mirroring the hub's own cover):

```html
<p class="as-cover__eyebrow">Business lines</p>
<h1 class="as-cover__title">{{Display name}}</h1>
<p class="as-cover__lede">{{Scope line}}</p>
```

The H1 is the canonical display name; CSS uppercases it. The longest is
"BUILDING CONSTRUCTION" (21ch): at the kit's `clamp(40px, 5.2vw, 68px)` it may
run two lines inside the 524px cover, which is acceptable — but verify all
seven at 1280 and 390 during the reference build, and if any overflows, add
one measured override in `business-line.css` with a comment recording the
measurement (the hub's 18ch precedent).

The lede is the hub tile's scope line for that discipline (spec §5 table),
verbatim — cover and hub tile must keep saying the same thing.

Cover images are the client-specified sources from hub spec §7 (not to be
substituted), derived to `assets/img/v2/blp/{{slug}}-cover.jpg` at 1920px wide,
JPEG, **quality no lower than 70** (the hub's hard floor; byte budget yields to
it). `width`/`height` match the derived file. The civil and water crop hazards
from hub §7.0 apply to the cover crops too. `fetchpriority="high"`,
descriptive alt describing what is in the frame, never the discipline name.

### 4.2 Sub-nav

Directly after the cover, per the kit ("what goes immediately after the
cover"). Existing component, existing markup shape, one addition —
`aria-current="page"` on the active link (invisible, additive, costs nothing;
the listing rails can adopt it later):

```html
<section class="v2-subnav"><div class="v2-subnav__inner"><a
  href="/business-lines-construction-services-kuwait">All</a><a
  href="/roads-and-bridges-contractor-kuwait" class="is-active"
  aria-current="page">Roads and Bridges</a><a
  href="/civil-infrastructure-kuwait">Civil Infrastructure</a><a
  href="/building-construction-kuwait">Building Construction</a><a
  href="/oil-and-gas-construction-kuwait">Oil and Gas</a><a
  href="/water-treatment-plant-kuwait">Water and Wastewater</a><a
  href="/electro-mechanical-contractor-kuwait">Electro-Mechanical</a><a
  href="/micro-tunneling-kuwait">Micro-Tunnelling</a></div></section>
```

Same eight tabs in the same order on all seven pages; only `is-active` +
`aria-current` move. Labels are the canonical display names — this rail is the
first place the canonical spellings appear at full width, so the harness
asserts them literally. The component's `overflow-x: auto` absorbs the width
on mobile; no CSS is added.

### 4.3 Overview

`as-section--light`, default 1224px inner. Head: title `Overview` (generic
label — no eyebrow, no lede; drafted titles are out under the customer
constraint), rule. Body: `as-prose` holding the page's **existing paragraphs
verbatim** (§7), including the page's existing `<h3>` sub-headings ("Quality,
Safety & Sustainability", "Relevant experience", "Project references",
"Reference projects") and their content where present.

### 4.4 Capabilities

`as-section--tint`. Head: title `Capabilities` (the page's own existing
heading), rule. One `as-pills` group holding the page's **existing capability
list items verbatim** (4–7 pills). No value-claim key pills: only
Micro-Tunnelling carries one `as-pill--key`, its existing specification pill
(§6.5). At most one `--key` per group, per the kit.

### 4.5 At a glance

`as-section--navy` (first of the two navy sections). Head: title
`At a glance` (generic label). Then `as-stats` with
exactly three tiles, figures from the frozen table in §6 — every figure is
derived from the project pages and re-checkable there. Units:

1. `{{count}}` / `Contracts on record`
2. `{{value}}` / `Completed contract value`
3. `{{largest}}` / `Largest single contract`

Format: values ≥ 1B as `USD n.nnB`, below as `USD nnnM` (whole millions).
`font-variant-numeric: tabular-nums` comes with the kit component.

This corrects the electro-mechanical "USD 358M" orphan: 358M is the **water**
completed sum (152.0 + 151.1 + 55.0) and moves to the Water page, where it is
true; Electro-Mechanical shows its real USD 2.03B.

### 4.6 Band

Kit §9 full-bleed `as-band`, between sections 5 and 7, direct child of the
page body. One photograph per page, **sourced only from that page's own
existing content photographs** (customer constraint — the `div-*.jpg` set is
NOT eligible: those frames appear on other pages, not these), **different
from the cover photograph**, derived to
`assets/img/v2/blp/{{slug}}-band.jpg` at up to 1920px, quality ≥ 70. Real
alt. Band choice is verified visually during the build; if a page has no
distinct usable second photograph, the page ships without a band.

### 4.7 Key projects

`as-section--light`. Head: title `Key Projects` (the page's own existing
heading). Lede: **only** where the page's existing key-projects paragraph is
discipline-correct (Roads and Civil), reused verbatim; the shared
civil-infrastructure boilerplate on the other five pages is dropped, not
rewritten (§9.1 repair — no replacement copy is drafted). Then the one new
component with real structure — `blp-proj`, four text-first contract rows,
their names taken from the project pages' own titles (existing site text).
No card imagery: the cover and band carry the page's photography, and
seventeen more derived images would spend weight on what is a routing
element.

```html
<ul class="blp-proj">
  <li class="blp-proj__item">
    <a class="blp-proj__row" href="/ra-259"
       aria-label="6th Ring Road to Interchange 82, Salmi Road — Ministry of Public Works, USD 487.2M, completed 2022">
      <span class="blp-proj__name">6th Ring Road to Interchange 82, Salmi Road</span>
      <span class="blp-proj__client">Ministry of Public Works</span>
      <span class="blp-proj__value">USD 487.2M</span>
      <span class="blp-proj__status">Completed 2022</span>
      <span class="blp-proj__arrow" aria-hidden="true">&rarr;</span>
    </a>
  </li>
  …
</ul>
```

- One anchor per row, one tab stop. The `aria-label` **begins with the visible
  name** (SC 2.5.3; hub defect 3) and appends client, value, status.
- Desktop: a grid row `minmax(0,1fr) 200px 110px 130px 24px`, baseline-aligned,
  modeled on `.wr-row` — hairline bottom border, hover/focus-visible on one
  rule: background tint `rgba(0,42,65,.07)` + `inset 3px 0 0 var(--v2-red)`
  (a zero-width inset shadow at rest, never a border), arrow slides −4px → 0
  inside its own column. Track widths are provisional; measure against the
  longest real strings during the build and record the measurement.
- Name: Hammersmith One 400 (family and weight declared — hazard 4), 17px.
  Client/status: Open Sans 13px muted. Value: 13px, `tabular-nums`,
  `--v2-navy`.
- ≤920px: `grid-template-columns: minmax(0,1fr) auto`; name and client stack
  in column 1, value and status in column 2; arrow hidden.
- Rows and their values are frozen in §6. Selection is the four largest
  contracts linked from that line's listing pages (Oil and Gas has exactly
  four). Values and statuses are quoted from the project pages.

### 4.8 All projects

`as-section--tint`. Head: title `All Projects` (generic label; no drafted
lede — the counts live in the button labels). Then the listing links as
buttons:

```html
<a class="as-btn as-btn--on-light" href="/{{line}}-current">Current projects ({{n}})</a>
<a class="as-btn as-btn--on-light" href="/{{line}}-completed">Completed projects ({{n}})</a>
```

Two buttons in a row (page CSS may add a small flex-gap wrapper rule), each
full-width at ≤920px per the kit. **Oil and Gas renders one button only**
(`/oil-and-gas-completed`, "Completed projects (4)") and its lede says all
four contracts are complete — status-aware by omission, no empty listing page
is created.

Listing slugs are irregular and are frozen in §6 (`water-current`, not
`water-and-wastewater-current`; `civil-current`, not
`civil-infrastructure-current`).

### 4.9 Clients

`as-section--light`. Head: title `Our Clients` (the page's own existing
heading), rule, no lede. Then `blp-clients`: a `<ul>` of logo tiles.

```html
<ul class="blp-clients">
  <li class="blp-clients__item">
    <img src="/assets/img/0a508900-mpw-logo-AMqDBbG2P4SaEr7y.jpg"
         alt="Ministry of Public Works, Kuwait" width="…" height="…"
         loading="lazy" decoding="async">
  </li>
  …
</ul>
```

- Grid of tiles, hairline border `var(--as-hair-light)`, radius 4px, logo
  `object-fit: contain` in a fixed-height box (~64px logo in ~110px tile),
  white ground. Not links. 2–6 tiles per page; single row that wraps.
- Logo files are the **existing** assets already used by the homepage rail and
  the current strips — no re-derivation, one asset per client sitewide.
- Alt is the client's full name (the logo *is* the content here, so the name
  is the right alt — unlike photographs).
- Sets are frozen in §6, derived from the project pages' "Project Owner"
  fields for that line's contracts. UGCC's own logo appears on no strip.
  Owners with no logo asset in the repo (Haya Water, PAAET, SEZAD) are
  omitted, per the user decision. For the joint owner "KNPC – KIPIC": the
  Oil and Gas page shows both KNPC and KIPIC (both are named and both logos
  exist); other lines touched only by that one contract show KIPIC alone
  rather than padding their strip with two logos for one job.

### 4.10 Contact

`as-section--navy` (second navy). Byte-identical on all seven pages to the
hub's shipped CTA — head (eyebrow `Get in touch`, title `Talk to us about
your project`, rule, lede "Tell us what you are building and we will point
you at the team that has done it before.") plus one `as-btn as-btn--on-dark`
to `/contact-us`. This wording already exists on the live hub; no per-line
variation (that would be new copy).

## 5. Meta, JSON-LD, share cards

- `<title>` and meta description: kept where accurate; wrong-discipline or
  non-canonical wording corrected (the micro page's title says
  "Micro-Tunneling" — display text canonicalises to Micro-Tunnelling; the URL
  inside it does not change).
- JSON-LD `WebPage.image` repointed to the page's derived cover.
- `og:image` / `twitter:image` likewise, with non-empty `og:image:alt` /
  `twitter:image:alt` equal to the cover alt (hub defect 4).
- "Duqm" is the canonical spelling wherever the port is named.

## 6. Frozen per-page data

Derived 2026-07-20 from the listing pages (counts, membership) and project
pages (owners, values, dates). Counts match the hub's tile counts exactly.
If a listing page changes, these tables are re-derived, not patched.

### 6.1 Stats

| Page | Contracts | Completed value | Largest single contract |
|---|---|---|---|
| Roads and Bridges | 14 | USD 1.36B | USD 487M (RA-259) |
| Civil Infrastructure | 17 | USD 2.20B | USD 509M (KP3-CNS-301) |
| Building Construction | 7 | USD 942M | USD 509M (KP3-CNS-301) |
| Oil and Gas | 4 | USD 291M | USD 114M (ZOR-EPC-0059) |
| Water and Wastewater | 6 | USD 358M | USD 152M (SE-19) |
| Electro-Mechanical | 18 | USD 2.03B | USD 487M (RA-259) |
| Micro-Tunnelling | 5 | USD 303M | USD 168M (RA-268) |

Completed-value sums use the USD figures printed on the project pages; the
current side is never summed (two Oman contracts are priced in OMR only, and
`qstsh15`'s USD figure is suspect). "Largest" spans both statuses; the two
OMR-only contracts convert to ≈ USD 27M / 55M, below every line's largest, so
they cannot displace one.

### 6.2 Key projects (four rows, descending value)

| Page | Rows (dir · value · status) |
|---|---|
| Roads and Bridges | `ra-259` 487.2M Completed 2022 · `ra200` 360.0M In progress · `ra245` 357.9M In progress · `ra-223` 316.0M Completed |
| Civil Infrastructure | `kp3cns301` 509.0M In progress · `ra-259` 487.2M Completed 2022 · `pahwc1151` 422.2M Completed 2014 · `ra245` 357.9M In progress |
| Building Construction | `kp3cns301` 509.0M In progress · `pahwc1151` 422.2M Completed 2014 · `c502015-infrastructure-works-for-the-commercial-berth-at-duqm-port-ip3-oman` 200.6M Completed 2020 · `paafa77` 132.6M Completed |
| Oil and Gas | `zorepc0059` 114.2M Completed · `gc32` 72.5M Completed 2022 · `josc151lsp06` 72.0M Completed · `koc36081` 32.1M Completed |
| Water and Wastewater | `se19` 152.0M Completed · `5a-haya-eo24` 151.1M Completed · `se97` 55.0M Completed · `mew6085` 27.3M In progress |
| Electro-Mechanical | `ra-259` 487.2M Completed 2022 · `ra245` 357.9M In progress · `ra-223` 316.0M Completed · `pai18pa` 315.0M In progress |
| Micro-Tunnelling | `ra268` 167.8M In progress · `se19` 152.0M Completed · `5a-haya-eo24` 151.1M Completed · `owwsct2460879` OMR 21.0M In progress |

Row names are the project pages' own titles (shortened for one line where
needed, but always the leading words, so the accname prefix rule holds).
Clients per row come from the project page's "Project Owner". The
electro-mechanical card mislabel (`PAHW-C-1151-2009-2010` → `/pahw1533`) is
gone by construction: labels and hrefs are drawn from the same source row.

### 6.3 Listing links

| Page | Current | Completed |
|---|---|---|
| Roads and Bridges | `/roads-and-bridges-current` (6) | `/roads-and-bridges-completed` (8) |
| Civil Infrastructure | `/civil-current` (4) | `/civil-completed` (13) |
| Building Construction | `/building-construction-current` (2) | `/building-construction-completed` (5) |
| Oil and Gas | — (page does not exist; no button) | `/oil-and-gas-completed` (4) |
| Water and Wastewater | `/water-current` (3) | `/water-completed` (3) |
| Electro-Mechanical | `/electro-mechanical-current` (7) | `/electro-mechanical-completed` (11) |
| Micro-Tunnelling | `/micro-tunneling-current` (3) | `/micro-tunneling-completed` (2) |

### 6.4 Clients

Logo assets referenced by their existing `assets/img/` files (canonical copy:
the one the homepage rail uses, where present).

| Page | Clients shown |
|---|---|
| Roads and Bridges | MPW · PART · KOC · KIPIC |
| Civil Infrastructure | MPW · PART · PAI · PAHW · KOC · KIPIC · Joint Operations |
| Building Construction | MPW · PAHW · Joint Operations · KIPIC · Jeeran Al-Khaleej |
| Oil and Gas | KOC · KNPC · KIPIC · Joint Operations |
| Water and Wastewater | MPW · MEW · Nama Water |
| Electro-Mechanical | MPW · PART · MEW · PAHW · PAI · Nama Water |
| Micro-Tunnelling | MPW · Nama Water |

Alt strings are the full names: Ministry of Public Works (MPW); Public
Authority for Roads and Transportation (PART); Kuwait Oil Company (KOC);
Kuwait Integrated Petroleum Industries Company (KIPIC); Kuwait National
Petroleum Company (KNPC); Joint Operations, Saudi Arabian Chevron; Public
Authority for Housing Welfare (PAHW); Public Authority for Industry (PAI);
Ministry of Electricity and Water (MEW); Nama Water Services, Oman; Jeeran
Al-Khaleej Real Estate.

### 6.5 Cover sources and specification pills

Cover sources are the hub spec §7 client-specified files (verbatim table
there); each is also the page's own current hero background, so the covers
comply with the image freeze by construction.

Key pills (superseding the first version of this table, which drafted new
value claims — dropped under the customer constraint): **only
Micro-Tunnelling carries `as-pill--key`**, on its existing specification pill
"Pipelines range - 250mm dia. to 2400mm dia." (with "Depth - up to 30m" as a
plain pill beside it). All other pages have zero key pills; their pill sets
are the existing capability lists verbatim.

## 7. Copy

**Customer constraint: existing text is frozen.** Rules (superseding the
first version of this section, which drafted new prose):

1. Overview prose is the page's **existing paragraphs, verbatim**, in their
   existing order, including existing `<h3>` sub-headings and their content
   (quality/sustainability paragraphs, "Relevant experience" / "Project
   references" lists). Nothing is drafted, nothing is reworded.
2. The only permitted deviations are the documented §9.1 error repairs:
   - Building Construction **drops** its first paragraph (it is the Civil
     Infrastructure intro verbatim) and leads with its own, correct,
     existing division paragraph. No replacement sentence is written.
   - The shared civil-infrastructure "Key Projects" paragraph is **dropped**
     from the five pages where it is wrong-discipline text (building, oil,
     water, electro-mechanical, micro-tunnelling). It is kept, verbatim, on
     Roads and Civil where it is correct for the page.
   - "GCC has tremendous expertise" → "UGCC has tremendous expertise"
     (water page, missing letter).
   - Broken/wrong H1 display text is set to the canonical display names
     (water: "Water and waste / water management" → "Water and Wastewater";
     electro: "Electro Mechanical" → "Electro-Mechanical"; micro keeps its
     existing "Micro-Tunnelling").
   - Micro's capability pill "Micro-tunneling" takes the canonical double-L
     display spelling; the micro `<title>` likewise.
   - The typo strings "stream flood", "sever network", "tankge upgradation"
     and "Duqum" live only in the old project-card captions, which are
     replaced by the `blp-proj` rows (whose names come from the project
     pages' own titles) — they disappear by construction, not by rewriting
     retained sentences.
3. New text is limited to: sub-nav tab labels, generic section-head labels
   ("Overview", "At a glance", "All Projects"), listing-button labels with
   counts, the three stat figures and their units, alt text, and
   `aria-label`s. Nothing else.
4. Every retained string remains replaceable without touching CSS; nothing
   here is client-approved beyond the freeze itself.

## 8. The page stylesheet

`assets/css/pages/business-line.css`, namespace `blp-`, loaded last with
`?v=1`. Contents: `.blp-proj*` (§4.7), `.blp-clients*` (§4.9), a button-row
wrapper for §4.8, and — only if measurement demands it — a cover-title cap
(§4.1). Nothing else; if anything more wants writing, the kit is wrong and
that is a kit amendment.

All hover states also fire on `:focus-visible`, declared in the same rule.
Colour feedback sits outside the reduced-motion gate; only transforms sit
inside `@media (prefers-reduced-motion: no-preference)`. Forced-colors and
prefers-contrast blocks restore a real outline on `.blp-proj__row`. 920px and
600px are the only breakpoints.

## 9. Accessibility

- Exactly one `<h1>` per page: the cover title. Section titles are `<h2>`;
  `<h3>` only inside prose.
- Sub-nav: `is-active` + `aria-current="page"`.
- `blp-proj` rows: one anchor, `aria-label` beginning with the visible name.
- Stat figures are read with their units (figure + unit in one `<li>`).
- The band and cover carry descriptive alt; client logos carry the client's
  full name as alt; every decorative element (`as-head__rule`, the row arrow)
  is `aria-hidden="true"`.
- Contrast: kit tokens only on kit grounds; `blp-` text colours reuse
  measured values from the system (`rgba(0,42,65,.72)` floor on light,
  `--as-muted-light` etc.). Nothing lightened without re-measuring.
- Pages render completely with JavaScript disabled; nothing starts at
  `opacity: 0`.

## 10. Verification

### 10.1 Harness — `tools/business-line-check.js`

One dependency-free console IIFE, table-driven: it detects which of the seven
pages it is on (from `location.pathname`) and asserts against an embedded copy
of the §6 tables. Assertions:

1. Exactly one `<h1>`; it is `.as-cover__title`; text equals the canonical
   display name.
2. Cover img: non-empty alt not equal to the H1 text; `width`/`height` match
   `naturalWidth/Height` (decode-gated assertions **count and report skips**
   — a skip is not a pass; hub defect 7).
3. Sub-nav: exactly 8 anchors, hrefs in the frozen order, labels canonical
   (literal "Micro-Tunnelling", "Water and Wastewater"), exactly one
   `.is-active`, it matches the page, and it carries `aria-current="page"`.
4. Exactly 3 `.as-stat` tiles; figures equal the §6.1 strings for this page.
5. Exactly 4 `.blp-proj__row`; each `aria-label` begins with its visible
   `.blp-proj__name` text; hrefs equal the §6.2 set.
6. All-projects buttons: hrefs and counts equal §6.3; on Oil and Gas,
   asserts the current-side button is **absent**.
7. Every client logo has non-empty alt; count equals §6.4.
8. No descendant of any `as-section` computes to `opacity: 0` after load.
9. `as-pill--key` count equals the page's frozen value: 1 on
   Micro-Tunnelling, 0 everywhere else.
10. No horizontal overflow at the current viewport.

**Negative-testing is part of done** (the standing lesson: three hub
assertions passed while the thing they named was broken). For each of
assertions 3, 5 and 6, doctor a copy of the page (wrong tab active, aria-label
not prefixing, oil current button present) and confirm the harness fails.

### 10.2 Static tests — `tests/`

Node-side checks runnable without a browser, added to the existing suite:
for each of the seven files, parse the (minified) HTML and assert the head
link order, script set, single-asset images (no `image-wrapper--mobile`
duplicates remain), the frozen sub-nav markup, and the absence of the five
known typo strings anywhere in the file. Run with
`npx --no-install vitest run --dir tests`.

Plus the environment fix the hub asked for: exclude `.claude/worktrees/**`
in a vitest config so the root run stops globbing other sessions' suites.

### 10.3 Manual

- JS disabled: full page present and legible.
- Reduced motion: no transforms, colour feedback intact.
- Keyboard: tab order cover-link-free until the sub-nav (8 stops), then rows
  and buttons in visual order; ring visible on every stop.
- 1280×2100 and 390-wide screenshots per page (tall viewport — pane
  screenshots break after scrolling).
- Reveal wiring is verified by **reading** the CSS gate against
  `about-suite.js`'s selector list, not by watching the pane
  (IntersectionObserver is unreliable there and masks gate bugs).

## 11. Follow-ups recorded, not done here

- Listing-page rails: missing Oil and Gas tab on the current set (0 current
  contracts — needs either a status-aware rail or an honest empty page),
  non-canonical labels, asymmetric "All" slugs (`all-project-current` vs
  `all-projects-completed`).
- `qstsh15` value inconsistency (10.04M USD vs 31.9M KWD).
- The old builder duplicate assets orphaned by these rebuilds (unreferenced
  after ship) can be garbage-collected later.
- Merged worktree `.claude/worktrees/business-lines` and branch
  `claude/business-lines-mosaic` are safe to delete.

## 12. Risks

| Risk | Handling |
|---|---|
| Copy frozen to existing text (customer requirement) | Only §9.1 repairs applied, per the constraint table above; retained strings extracted verbatim from the source pages at build time. |
| Stat figures drift as listings change | Figures are visible, re-derivable numbers; harness embeds them so drift fails loudly. |
| Cover H1 overflow on long names | Measured during reference build; one commented override if needed. |
| Band photograph weak or duplicating the cover | Verified visually per page; raised, not shipped, if unusable. |
| Concurrent sessions on V2 | Worktree isolation; zero shared-file edits. |
| Seven-page template drift during rollout | Reference page (Roads and Bridges) reviewed first; the other six are mechanical instantiations of the approved template; harness runs on all seven. |

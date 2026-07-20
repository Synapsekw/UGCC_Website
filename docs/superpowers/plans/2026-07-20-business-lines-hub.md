# Business Lines hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Business Lines hub page with a weighted-mosaic directory built on the `about-suite` kit, so the site's only doorway to the seven disciplines actually routes visitors.

**Architecture:** The page keeps its three builder `<section class="block" id="…">` shells and replaces their contents with hand-authored markup. Cover, section grounds, head, and buttons all come from `about-suite.css`. The only new component is the mosaic grid, which lives in a page-scoped stylesheet so no shared file is restyled. No new JavaScript.

**Tech Stack:** Static HTML (no build step, no package.json, no framework), hand-authored CSS, `sips` for image derivation, a dependency-free console IIFE for verification.

**Spec:** `docs/superpowers/specs/2026-07-20-business-lines-hub-design.md`. Read it before Task 1.

**Worktree:** `.claude/worktrees/business-lines`, branch `claude/business-lines-mosaic`. All paths below are relative to that worktree root. Preview server: `preview_start` with name `ugcc-business-lines` (port 8759).

---

## Orientation — read this before Task 1

This repo is a **static export from the Hostinger website builder**. There is no
test runner, no linter, and no build. "Tests" here are:

1. `tools/*-check.js` — console IIFEs pasted into DevTools, asserting decisions
   that a screenshot cannot show.
2. Direct DOM measurement via the browser tools.

Four rules from the design system that this plan depends on, restated so you do
not have to go and find them:

- **Cache busters.** Every V2 asset is linked with `?v=N`. When you change a
  file, bump `N` in **every** HTML file that links it. Forgetting this is the
  most common way a fix appears not to work.
- **Headings lose their font outside `.text-box`.** Every hand-authored heading
  must declare `font-family: var(--font-primary, 'Hammersmith One', sans-serif)`
  **and** `font-weight: 400`. Hammersmith One ships one weight; 400 is the only
  correct value.
- **Two reds, not interchangeable.** `--v2-red` `#d41c22` for fills and for text
  on **light** grounds. `--v2-red-text` `#e8635e` for text on **dark** grounds.
  Getting this backwards is invisible in a screenshot and fails WCAG.
- **Never hide in CSS and reveal in JS.** A script failure must degrade to
  visible content, not a blank section.

---

## File Structure

| Path | Status | Responsibility |
|---|---|---|
| `business-lines-construction-services-kuwait/index.html` | Modify | The page. Three block shells re-filled; head links and JSON-LD updated. |
| `assets/css/pages/business-lines.css` | Create | The mosaic component and the one cover-title override. Nothing else. |
| `assets/js/about-suite.js` | Modify (1 line) | Append `.bl-tile` to the reveal selector list. |
| `assets/img/v2/bl/*.webp` | Create (7) | Derived tile imagery at exactly the two sizes used. |
| `tools/business-lines-check.js` | Create | Console harness asserting the invisible decisions. |

Five About-suite pages get a one-character `?v=` bump only (Task 7).

---

## Task 1: Derive the tile imagery

Do this first. Everything else references these files, and the derived sizes are
what the `width`/`height` attributes must match.

**Files:**
- Create: `assets/img/v2/bl/roads.webp` … and six siblings

- [ ] **Step 1: Create the output directory**

```bash
cd .claude/worktrees/business-lines
mkdir -p assets/img/v2/bl
```

- [ ] **Step 2: Derive the two lead images at 1220×686**

`sips` cannot crop-to-fill in one call, so resize on the long edge then crop to
the exact box. `-c` takes **height then width**.

```bash
cd assets/img
sips -Z 1220 "639d396c-cairo-street-hd-final-v2_edit.mp4_20260404_151225.212-copy-LzpQRTTKD9Mfji4x.jpg" \
     --out /tmp/bl-roads.png >/dev/null
sips -c 686 1220 /tmp/bl-roads.png --out /tmp/bl-roads-c.png >/dev/null
sips -s format jpeg -s formatOptions 82 /tmp/bl-roads-c.png --out v2/bl/roads.jpg >/dev/null

sips -Z 1220 "1fcfa266-kp3-cns-301-6-Svi5dqP6cfg8u3aB.webp" \
     --out /tmp/bl-civil.png >/dev/null
sips -c 686 1220 /tmp/bl-civil.png --out /tmp/bl-civil-c.png >/dev/null
sips -s format jpeg -s formatOptions 82 /tmp/bl-civil-c.png --out v2/bl/civil.jpg >/dev/null
```

Note the output extension is `.jpg`, not `.webp`: `sips` on macOS cannot
reliably **write** WebP. JPEG at quality 82 meets the budget. If the combined
budget in Step 5 fails, revisit — do not chase WebP with a new dependency.

- [ ] **Step 3: Derive the five standard images at 680×425**

```bash
cd assets/img
derive() {  # $1 = source, $2 = output name
  sips -Z 680 "$1" --out /tmp/bl-src.png >/dev/null
  sips -c 425 680 /tmp/bl-src.png --out /tmp/bl-crop.png >/dev/null
  sips -s format jpeg -s formatOptions 82 /tmp/bl-crop.png --out "v2/bl/$2.jpg" >/dev/null
}
derive "90e581cf-banner1-P9DJjSgxMdgIWaSl.jpg"        building
derive "785ed39d-picture2-1-pzwOGcrJcMDwEAmw.jpg"     oilgas
derive "823b1d5d-banner2-soD4LfkN9VD8kTHo.jpg"        water
derive "7ed8b27e-banner1-2-7nJH1ii5XmyAwgxe.jpg"      electro
derive "84b54fc2-banner2-nepTLLbb7J94Brvx.png"        tunnel
```

- [ ] **Step 4: Verify every derived file has the exact expected dimensions**

```bash
cd assets/img/v2/bl
for f in *.jpg; do
  printf "%-14s %s\n" "$f" "$(sips -g pixelWidth -g pixelHeight "$f" | awk '/pixel/{printf "%s ", $2}')"
done
```

Expected, exactly:

```
building.jpg   680 425
civil.jpg      1220 686
electro.jpg    680 425
oilgas.jpg     680 425
roads.jpg      1220 686
tunnel.jpg     680 425
water.jpg      680 425
```

If any row differs, the crop step failed for that file — re-run it. These
numbers become the `width`/`height` attributes in Task 3 and must match.

- [ ] **Step 5: Verify the combined budget**

```bash
du -ch assets/img/v2/bl/*.jpg | tail -1
```

Expected: **under 400K total**. If it exceeds, drop `formatOptions` to 75 and
re-run Steps 2–3; do not reduce pixel dimensions.

- [ ] **Step 6: Commit**

```bash
git add assets/img/v2/bl
git commit -m "assets(business-lines): derive tile imagery at 1220x686 and 680x425"
```

---

## Task 2: The mosaic stylesheet

**Files:**
- Create: `assets/css/pages/business-lines.css`

- [ ] **Step 1: Write the stylesheet**

Create `assets/css/pages/business-lines.css` with exactly this content:

```css
/* Business Lines hub — the weighted mosaic.
   Loads after about-suite.css. Everything else on the page is kit.
   Spec: docs/superpowers/specs/2026-07-20-business-lines-hub-design.md */

/* ---- 1. Cover title override -------------------------------------------
   .as-cover__title is clamp(40px, 5.2vw, 68px) + uppercase, tuned for the
   suite's one-word titles ("ABOUT"). This page's h1 is 44 characters; in
   caps at 68px it runs four lines and overflows the 524px cover. 18ch is
   the measure that breaks the line after "services" at desktop. */
.as-cover__title {
  font-size: clamp(30px, 3.4vw, 46px);
  max-width: 18ch;
}

/* ---- 2. Grid ------------------------------------------------------------ */
.bl-mosaic {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 28px 24px;            /* matches .v2-proj__grid on the landing page */
  margin: 0;
  padding: 0;
  list-style: none;
}

/* min-width:0 is the grid-blowout guard; overflow-wrap does not substitute */
.bl-tile {
  min-width: 0;
  display: flex;
}

.bl-tile--lead { grid-column: span 3; }
.bl-tile:not(.bl-tile--lead) { grid-column: span 2; }

.bl-tile__link {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 10px;
  text-decoration: none;
  color: inherit;
}

/* ---- 3. Shot ------------------------------------------------------------ */
.bl-tile__shot {
  display: block;
  overflow: hidden;          /* required for the zoom to clip */
  border-radius: 4px;
  background: #0b2233;       /* reserves the box while loading -> CLS 0 */
}

.bl-tile--lead .bl-tile__shot { aspect-ratio: 16 / 9; }
.bl-tile:not(.bl-tile--lead) .bl-tile__shot { aspect-ratio: 16 / 10; }

.bl-tile__shot img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ---- 4. Body ------------------------------------------------------------ */
.bl-tile__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Hammersmith One ships one weight; family AND weight declared explicitly
   because this markup is outside .text-box and would otherwise silently
   fall back to Open Sans Bold. */
.bl-tile__name {
  font-family: var(--font-primary, 'Hammersmith One', sans-serif);
  font-weight: 400;
  font-size: 16px;
  line-height: 1.25;
  color: var(--v2-navy);
  text-wrap: balance;
  transition: color .25s var(--v2-ease-out-quart);
}

.bl-tile--lead .bl-tile__name { font-size: 21px; }

.bl-tile__desc {
  font-size: 13px;
  line-height: 1.6;
  color: var(--as-muted-light);
}

.bl-tile__meta {
  margin-top: 2px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--as-meta-light);
}

.bl-tile__count {
  font-weight: 600;
  color: var(--v2-red);      /* light ground -> --v2-red, never --v2-red-text */
  font-variant-numeric: tabular-nums;
}

/* ---- 5. Fill tile ------------------------------------------------------- */
.bl-tile--all .bl-tile__plate {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  aspect-ratio: 16 / 10;
  padding: 0 20px;
  background: var(--as-tint);
  border: 1px solid var(--as-hair-light);
  border-radius: 4px;
}

.bl-tile__figure {
  font-family: var(--font-primary, 'Hammersmith One', sans-serif);
  font-weight: 400;
  font-size: 38px;
  line-height: 1;
  color: var(--v2-navy);
  font-variant-numeric: tabular-nums;
}

.bl-tile__go {
  margin-top: 12px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--v2-red);
}

/* ---- 6. Hover and focus -------------------------------------------------
   One rule carries both states so they cannot drift apart in a later edit. */
.bl-tile__link:hover .bl-tile__name,
.bl-tile__link:focus-visible .bl-tile__name {
  color: var(--v2-red);      /* outside the motion gate: reduced-motion
                                visitors still get feedback */
}

.bl-tile__link:focus-visible {
  outline-offset: 5px;
  border-radius: 4px;        /* ring wraps the whole tile, as .v2-proj__card */
}

@media (prefers-reduced-motion: no-preference) {
  .bl-tile__shot img {
    transition: transform .5s var(--v2-ease-out-quart),
                filter .5s var(--v2-ease-out-quart);
  }
  .bl-tile__link:hover .bl-tile__shot img,
  .bl-tile__link:focus-visible .bl-tile__shot img {
    transform: scale(1.05);
    filter: brightness(1.06) saturate(1.05);
  }
}

/* ---- 7. Reveal ----------------------------------------------------------
   Opts into the existing about-suite.js contract. Double-gated, so a script
   failure leaves every tile visible. */
.hero-motion.v2-reveal .bl-tile { opacity: 0; }
.hero-motion.v2-reveal .bl-tile.is-in {
  animation: as-fade-up .8s var(--v2-ease-out-expo) both;
  animation-delay: calc(var(--i, 0) * 60ms);
}

/* ---- 8. Responsive ------------------------------------------------------
   920px is the builder's own breakpoint, where the header swaps to mobile.
   There is no 768px breakpoint anywhere in this codebase; do not add one. */
@media (max-width: 920px) {
  .bl-mosaic {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px 16px;
  }
  .bl-tile--lead,
  .bl-tile:not(.bl-tile--lead) { grid-column: span 1; }
  /* ranks converge: a double-width lead cannot exist at two columns, and
     unequal heights here would read as inconsistency, not hierarchy */
  .bl-tile--lead .bl-tile__shot { aspect-ratio: 16 / 10; }
  .bl-tile--lead .bl-tile__name { font-size: 16px; }
}

@media (max-width: 600px) {
  .bl-mosaic { grid-template-columns: minmax(0, 1fr); gap: 20px; }
}

@media (prefers-reduced-motion: reduce) {
  .hero-motion.v2-reveal .bl-tile { opacity: 1; }
}
```

- [ ] **Step 2: Verify the file parses as CSS**

There is no linter in this repo, so check brace balance:

```bash
node -e "const s=require('fs').readFileSync('assets/css/pages/business-lines.css','utf8');
const o=(s.match(/{/g)||[]).length, c=(s.match(/}/g)||[]).length;
console.log('open',o,'close',c, o===c?'BALANCED':'MISMATCH'); process.exit(o===c?0:1)"
```

Expected: `BALANCED`.

- [ ] **Step 3: Commit**

```bash
git add assets/css/pages/business-lines.css
git commit -m "feat(business-lines): add the mosaic stylesheet"
```

---

## Task 3: Rebuild the page markup

**Files:**
- Modify: `business-lines-construction-services-kuwait/index.html`

The file is minified to one line. Do not attempt to hand-edit it as text — use
the browser to locate the three block IDs first.

- [ ] **Step 1: Record the three block shell IDs**

```bash
grep -o 'class="block[^"]*" id="[^"]*"' business-lines-construction-services-kuwait/index.html | head -8
grep -o 'id="[^"]*" class="block[^"]*"' business-lines-construction-services-kuwait/index.html | head -8
```

Write the IDs down. You will keep each `<section class="block" id="…">` opening
tag and closing `</section>` exactly as they are, and replace only what sits
between them. The footer block `#FUdf9w9dXZ` is not touched.

- [ ] **Step 2: Replace the stylesheet links in `<head>`**

Find the existing `<link rel="stylesheet" …>` run and make it read exactly:

```html
<link rel="stylesheet" href="/assets/css/fonts.css">
<link rel="stylesheet" href="/assets/css/main.css">
<link rel="stylesheet" href="/assets/css/custom.css">
<link rel="stylesheet" href="/assets/css/v2.css?v=4">
<link rel="stylesheet" href="/assets/css/about-suite.css?v=3">
<link rel="stylesheet" href="/assets/css/pages/business-lines.css?v=1">
```

Order is the cascade. `business-lines.css` must come last or the cover-title
override loses to `about-suite.css`.

- [ ] **Step 3: Replace the script tags at the end of `<body>`**

```html
<script src="/assets/js/chat-widget.js?v=1" defer></script>
<script src="/assets/js/main.js" defer></script>
<script src="/assets/js/v2.js?v=3" defer></script>
<script src="/assets/js/about-suite.js?v=2" defer></script>
```

`about-suite.js` is bumped to `?v=2` because Task 5 edits it.

- [ ] **Step 4: Replace the cover block contents**

```html
<img class="as-cover__media" src="/assets/img/v2/hero-bizlines.jpg"
     alt="Aerial view of a completed UGCC road network and roundabout in Kuwait"
     width="1920" height="1080" fetchpriority="high" decoding="async">
<div class="as-cover__scrim" aria-hidden="true"></div>
<div class="as-cover__inner">
  <p class="as-cover__eyebrow">Business lines</p>
  <h1 class="as-cover__title">Construction services across seven disciplines</h1>
  <p class="as-cover__lede">One Grade-I contractor covering transport, civil infrastructure, buildings, energy and water &mdash; from motorway interchanges to shaft sinking thirty metres below a live city.</p>
</div>
```

Add `as-cover` to the section's existing class list. Keep
`block--desktop-first-visible block--mobile-first-visible`.

- [ ] **Step 5: Replace the cards block contents**

Set `class="block as-section as-section--light"` on the section, then:

```html
<div class="as-section__inner">
  <header class="as-head">
    <p class="as-head__eyebrow">Seven disciplines</p>
    <h2 class="as-head__title">Choose a discipline</h2>
    <span class="as-head__rule" aria-hidden="true"></span>
    <p class="as-head__lede">Each line carries its own capabilities, plant and client base. Every page links through to that discipline's live and completed contracts.</p>
  </header>
  <ul class="bl-mosaic" aria-label="Business lines">

    <li class="bl-tile bl-tile--lead">
      <a class="bl-tile__link" href="/roads-and-bridges-contractor-kuwait">
        <span class="bl-tile__shot"><img src="/assets/img/v2/bl/roads.jpg" alt="Multi-level motorway interchange carrying traffic at dusk in Kuwait City" width="1220" height="686" loading="lazy" decoding="async"></span>
        <span class="bl-tile__body">
          <span class="bl-tile__name">Roads and Bridges</span>
          <span class="bl-tile__desc">Highways, interchanges, flyovers, bridge erection, asphalt paving and stormwater drainage.</span>
          <span class="bl-tile__meta"><b class="bl-tile__count">14</b> contracts</span>
        </span>
      </a>
    </li>

    <li class="bl-tile bl-tile--lead">
      <a class="bl-tile__link" href="/civil-infrastructure-kuwait">
        <span class="bl-tile__shot"><img src="/assets/img/v2/bl/civil.jpg" alt="Aerial view of reinforcement and formwork laid out across the Mishref pump station site" width="1220" height="686" loading="lazy" decoding="async"></span>
        <span class="bl-tile__body">
          <span class="bl-tile__name">Civil Infrastructure</span>
          <span class="bl-tile__desc">Water networks, sewerage and drainage, pumping stations, utility corridors, foundations and earthworks.</span>
          <span class="bl-tile__meta"><b class="bl-tile__count">16</b> contracts</span>
        </span>
      </a>
    </li>

    <li class="bl-tile">
      <a class="bl-tile__link" href="/building-construction-kuwait">
        <span class="bl-tile__shot"><img src="/assets/img/v2/bl/building.jpg" alt="Completed institutional building with arched entrance under clear sky" width="680" height="425" loading="lazy" decoding="async"></span>
        <span class="bl-tile__body">
          <span class="bl-tile__name">Building Construction</span>
          <span class="bl-tile__desc">Structural and reinforced concrete, facades, steel roof systems, fit-out and turnkey delivery.</span>
          <span class="bl-tile__meta"><b class="bl-tile__count">7</b> contracts</span>
        </span>
      </a>
    </li>

    <li class="bl-tile">
      <a class="bl-tile__link" href="/oil-and-gas-construction-kuwait">
        <span class="bl-tile__shot"><img src="/assets/img/v2/bl/oilgas.jpg" alt="Process vessels and pipe rack under construction at a Kuwaiti gathering centre" width="680" height="425" loading="lazy" decoding="async"></span>
        <span class="bl-tile__body">
          <span class="bl-tile__name">Oil and Gas</span>
          <span class="bl-tile__desc">Gathering centres, heavy civil foundations, pipe racks, tank farms and blast-resistant shelters.</span>
          <span class="bl-tile__meta"><b class="bl-tile__count">4</b> contracts</span>
        </span>
      </a>
    </li>

    <li class="bl-tile">
      <a class="bl-tile__link" href="/water-treatment-plant-kuwait">
        <span class="bl-tile__shot"><img src="/assets/img/v2/bl/water.jpg" alt="Pump hall interior with blue distribution pipework and valves" width="680" height="425" loading="lazy" decoding="async"></span>
        <span class="bl-tile__body">
          <span class="bl-tile__name">Water and Wastewater</span>
          <span class="bl-tile__desc">Treatment plants, pumping stations, reservoirs, distribution mains and trunk sewers.</span>
          <span class="bl-tile__meta"><b class="bl-tile__count">6</b> contracts</span>
        </span>
      </a>
    </li>

    <li class="bl-tile">
      <a class="bl-tile__link" href="/electro-mechanical-contractor-kuwait">
        <span class="bl-tile__shot"><img src="/assets/img/v2/bl/electro.jpg" alt="Plant room with insulated pipework, valves and pump sets" width="680" height="425" loading="lazy" decoding="async"></span>
        <span class="bl-tile__body">
          <span class="bl-tile__name">Electro-Mechanical</span>
          <span class="bl-tile__desc">Street lighting, fire fighting systems, HVAC, instrumentation and pipeline works.</span>
          <span class="bl-tile__meta"><b class="bl-tile__count">18</b> contracts</span>
        </span>
      </a>
    </li>

    <li class="bl-tile">
      <a class="bl-tile__link" href="/micro-tunneling-kuwait">
        <span class="bl-tile__shot"><img src="/assets/img/v2/bl/tunnel.jpg" alt="Crew lowering a micro-tunnelling machine into a lined shaft" width="680" height="425" loading="lazy" decoding="async"></span>
        <span class="bl-tile__body">
          <span class="bl-tile__name">Micro-Tunnelling</span>
          <span class="bl-tile__desc">Guided boring 250&ndash;2400 mm diameter, shaft sinking to 30 m, without surface disruption.</span>
          <span class="bl-tile__meta"><b class="bl-tile__count">5</b> contracts</span>
        </span>
      </a>
    </li>

    <li class="bl-tile bl-tile--all">
      <a class="bl-tile__link" href="/construction-projects-kuwait">
        <span class="bl-tile__plate">
          <span class="bl-tile__figure">30</span>
          <span class="bl-tile__meta">contracts on record</span>
          <span class="bl-tile__go">All projects &rarr;</span>
        </span>
      </a>
    </li>

  </ul>
</div>
```

Note `/micro-tunneling-kuwait` keeps its single-L **URL** while the display text
uses the double-L spelling. That is deliberate; do not "fix" the href.

- [ ] **Step 6: Replace the CTA block contents**

Set `class="block as-section as-section--navy"` on the section and remove its
`.block-background` child entirely (the tower-crane photo is dropped).

```html
<div class="as-section__inner">
  <header class="as-head">
    <p class="as-head__eyebrow">Get in touch</p>
    <h2 class="as-head__title">Talk to us about your project</h2>
    <span class="as-head__rule" aria-hidden="true"></span>
    <p class="as-head__lede">Tell us what you are building and we will point you at the team that has done it before.</p>
  </header>
  <a class="as-btn as-btn--on-dark" href="/contact-us">Contact us</a>
</div>
```

The eyebrow sits on navy, so `about-suite.css` will resolve it to
`--v2-red-text` automatically via `.as-section--navy`. Do not set it by hand.

- [ ] **Step 7: Delete the stray duplicate heading**

Between the old cards 04 and 05 the page re-emits its intro sentence as an
`<h6>`. It has no place in the new markup; confirm it is gone:

```bash
grep -c "delivers outstanding work results" business-lines-construction-services-kuwait/index.html
```

Expected: `0`.

- [ ] **Step 8: Repoint the JSON-LD image**

Find `"image":"https://ugcc.com/assets/img/7d61e989-credentials1-Yan0oklJ5MsZjQ3n.png"`
and change it to `"image":"https://ugcc.com/assets/img/v2/hero-bizlines.jpg"`.
Leave `<title>`, the meta description, keywords and breadcrumb untouched.

- [ ] **Step 9: Commit**

```bash
git add business-lines-construction-services-kuwait/index.html
git commit -m "feat(business-lines): recompose the hub as a weighted mosaic directory"
```

---

## Task 4: Verify it renders

**Files:** none changed.

- [ ] **Step 1: Start the preview server**

Use `preview_start` with name `ugcc-business-lines` (port 8759). Do not run a
server via Bash.

- [ ] **Step 2: Load the page and confirm no console errors**

Navigate to `http://localhost:8759/business-lines-construction-services-kuwait/`,
then `read_console_messages` with `onlyErrors: true`.

Expected: no errors. A 404 for any `/assets/img/v2/bl/*.jpg` means Task 1's
filenames and Task 3's `src` attributes disagree — fix the markup, not the
images.

- [ ] **Step 3: Measure the grid at desktop**

`resize_window` to 1280×900, then run via `javascript_tool`:

```js
(()=>{const q=e=>{const b=e.getBoundingClientRect();return Math.round(b.width)+'x'+Math.round(b.height)};
const t=[...document.querySelectorAll('.bl-tile')];
return JSON.stringify({
  tiles:t.length,
  leads:document.querySelectorAll('.bl-tile--lead').length,
  rows:[...new Set(t.map(e=>Math.round(e.getBoundingClientRect().top)))].length,
  sizes:t.map(q),
  overflowX:document.documentElement.scrollWidth>window.innerWidth
})})()
```

Expected: `tiles:8`, `leads:2`, `rows:3`, `overflowX:false`. The first two
sizes are equal and roughly twice the width of the rest.

- [ ] **Step 4: Confirm the cover title fits**

```js
(()=>{const h=document.querySelector('.as-cover__title'),c=document.querySelector('.as-cover');
return JSON.stringify({titleBottom:Math.round(h.getBoundingClientRect().bottom),
  coverBottom:Math.round(c.getBoundingClientRect().bottom),
  lines:Math.round(h.getBoundingClientRect().height/parseFloat(getComputedStyle(h).lineHeight))})})()
```

Expected: `titleBottom` less than `coverBottom`, and `lines` of 2 or 3. If the
title overflows, reduce the `18ch` in `business-lines.css` and **write the new
measurement into the comment** — every non-obvious number in this codebase
carries the measurement that produced it.

- [ ] **Step 5: Check the two-column and one-column layouts**

`resize_window` to 900×900, re-run Step 3's snippet. Expected: `rows:4`,
`overflowX:false`, all eight sizes equal.

Then 560×900. Expected: `rows:8`, all sizes equal, `overflowX:false`.

- [ ] **Step 6: Screenshot the desktop layout for review**

`resize_window` back to 1280×900 and take a screenshot. If the pane returns a
blank image after scrolling, that is a known capture bug — re-navigate to reset
it rather than assuming the page is broken.

- [ ] **Step 7: Commit any fixes**

```bash
git add -A
git commit -m "fix(business-lines): <what was actually wrong>"
```

Skip if nothing needed fixing.

---

## Task 5: Wire the reveal

Do this **after** Task 4 proves the page renders, so that if the reveal breaks
anything you know the baseline was good.

**Files:**
- Modify: `assets/js/about-suite.js`

- [ ] **Step 1: Find the selector list**

```bash
grep -n "as-head" assets/js/about-suite.js
```

You are looking for the string listing the reveal targets:
`.as-head, .as-prose, .as-card, .as-ledger__row, .as-acc, .as-stat, .as-quote`.

- [ ] **Step 2: Append the tile selector**

Change that string to end with `, .bl-tile`:

```js
'.as-head, .as-prose, .as-card, .as-ledger__row, .as-acc, .as-stat, .as-quote, .bl-tile'
```

This is the **only** edit to a shared file in this plan. It is additive and
inert on the five About-suite pages, none of which contains a `.bl-tile`.

- [ ] **Step 3: Verify the tiles reveal, and that nothing is left hidden**

Reload the page, then:

```js
(()=>{const t=[...document.querySelectorAll('.bl-tile')];
return JSON.stringify({
  htmlClasses:document.documentElement.className,
  hidden:t.filter(e=>getComputedStyle(e).opacity==='0').length,
  staggerSet:t.filter(e=>e.style.getPropertyValue('--i')!=='').length
})})()
```

Expected after scrolling the mosaic into view: `hidden:0`. `htmlClasses`
contains `hero-motion` and `v2-reveal`. `staggerSet:8`.

- [ ] **Step 4: Verify it degrades**

In DevTools, disable JavaScript and reload. Every tile must be fully visible.
If any tile is invisible, the CSS gate in Task 2 §7 is wrong — the rules must be
double-gated on `.hero-motion.v2-reveal`, both of which are set by script.

- [ ] **Step 5: Verify the five About-suite pages still reveal**

Load `http://localhost:8759/about-contractor-kuwait/` and confirm content is
visible and `.as-head` still animates in. Repeat for `/credentials/`.

- [ ] **Step 6: Commit**

```bash
git add assets/js/about-suite.js
git commit -m "feat(business-lines): opt the mosaic into the about-suite reveal"
```

---

## Task 6: The verification harness

**Files:**
- Create: `tools/business-lines-check.js`

- [ ] **Step 1: Write the harness**

Create `tools/business-lines-check.js`:

```js
(function () {
  'use strict';
  var pass = 0, fail = 0;
  function ok(name, cond, detail) {
    if (cond) { pass++; console.log('%c PASS ', 'background:#0a0;color:#fff', name); }
    else { fail++; console.error('FAIL', name, detail === undefined ? '' : detail); }
  }

  var tiles = document.querySelectorAll('.bl-tile');
  var leads = document.querySelectorAll('.bl-tile--lead');
  var h1s = document.querySelectorAll('h1');

  ok('exactly one h1', h1s.length === 1, h1s.length);
  ok('h1 is the cover title',
     h1s[0] && h1s[0].classList.contains('as-cover__title'));
  ok('eight tiles', tiles.length === 8, tiles.length);
  ok('two lead tiles', leads.length === 2, leads.length);

  var imgs = document.querySelectorAll('.bl-tile__shot img');
  ok('seven tile images', imgs.length === 7, imgs.length);

  Array.prototype.forEach.call(imgs, function (img, i) {
    ok('image ' + i + ' has alt', !!img.getAttribute('alt'));
    ok('image ' + i + ' has width and height',
       !!img.getAttribute('width') && !!img.getAttribute('height'));
    var tile = img.closest('.bl-tile');
    var name = tile.querySelector('.bl-tile__name');
    ok('image ' + i + ' alt is not the line name',
       !name || img.getAttribute('alt').trim().toLowerCase()
                  !== name.textContent.trim().toLowerCase());
  });

  Array.prototype.forEach.call(tiles, function (tile, i) {
    ok('tile ' + i + ' is not hidden',
       getComputedStyle(tile).opacity !== '0');
    ok('tile ' + i + ' has exactly one anchor',
       tile.querySelectorAll('a').length === 1);
  });

  var heads = document.querySelectorAll('.as-head');
  Array.prototype.forEach.call(heads, function (h, i) {
    ok('head ' + i + ' has exactly one rule',
       h.querySelectorAll('.as-head__rule').length === 1);
  });

  // Light ground -> --v2-red (#d41c22). --v2-red-text (#e8635e) fails AA here.
  var lightEyebrow = document.querySelector('.as-section--light .as-head__eyebrow');
  ok('light-ground eyebrow uses --v2-red',
     !lightEyebrow || getComputedStyle(lightEyebrow).color === 'rgb(212, 28, 34)',
     lightEyebrow && getComputedStyle(lightEyebrow).color);

  var darkEyebrow = document.querySelector('.as-section--navy .as-head__eyebrow');
  ok('navy-ground eyebrow uses --v2-red-text',
     !darkEyebrow || getComputedStyle(darkEyebrow).color === 'rgb(232, 99, 94)',
     darkEyebrow && getComputedStyle(darkEyebrow).color);

  ok('no horizontal overflow',
     document.documentElement.scrollWidth <= window.innerWidth,
     document.documentElement.scrollWidth + ' vs ' + window.innerWidth);

  var names = document.querySelectorAll('.bl-tile__name');
  Array.prototype.forEach.call(names, function (n, i) {
    ok('name ' + i + ' is Hammersmith One',
       /Hammersmith/.test(getComputedStyle(n).fontFamily),
       getComputedStyle(n).fontFamily);
    ok('name ' + i + ' is weight 400',
       getComputedStyle(n).fontWeight === '400');
  });

  console.log('%c ' + pass + ' passed, ' + fail + ' failed ',
    'background:' + (fail ? '#a00' : '#0a0') + ';color:#fff');
  return { pass: pass, fail: fail };
})();
```

- [ ] **Step 2: Run it**

Paste the file's contents into the DevTools console on
`http://localhost:8759/business-lines-construction-services-kuwait/` at
1280×900.

Expected: `0 failed`. Investigate every failure — each one encodes a decision
from the spec, and a failure means the page disagrees with the spec, not that
the assertion is wrong.

- [ ] **Step 3: Commit**

```bash
git add tools/business-lines-check.js
git commit -m "test(business-lines): add the hub verification harness"
```

---

## Task 7: Bump the About-suite cache busters

`about-suite.js` changed in Task 5, so every page that links it must bump.

**Files:**
- Modify: `about-contractor-kuwait/index.html`
- Modify: `credentials/index.html`
- Modify: `hse/index.html`
- Modify: `quality/index.html`
- Modify: `csr/index.html`

- [ ] **Step 1: Confirm which pages link it**

```bash
grep -rl "about-suite.js" --include=index.html . | sort
```

Expected: the five pages above plus the business lines hub (already at `?v=2`
from Task 3).

- [ ] **Step 2: Bump all five**

```bash
for p in about-contractor-kuwait credentials hse quality csr; do
  sed -i '' 's|about-suite\.js?v=1|about-suite.js?v=2|g' "$p/index.html"
done
```

- [ ] **Step 3: Verify no page is left on v=1**

```bash
grep -rn "about-suite.js?v=1" --include=index.html . || echo "none left on v=1"
```

Expected: `none left on v=1`.

- [ ] **Step 4: Confirm the five pages still work**

Load each of `/about-contractor-kuwait/`, `/credentials/`, `/hse/`, `/quality/`,
`/csr/` and check `read_console_messages` with `onlyErrors: true` for each.

Expected: no errors, content visible on all five.

- [ ] **Step 5: Commit**

```bash
git add about-contractor-kuwait/index.html credentials/index.html hse/index.html quality/index.html csr/index.html
git commit -m "chore(about-suite): bump about-suite.js cache buster to v=2"
```

---

## Task 8: Accessibility and degradation pass

**Files:** none changed unless a check fails.

- [ ] **Step 1: Check accessible names**

```js
(()=>{return JSON.stringify([...document.querySelectorAll('.bl-tile__link')].map(a=>
  a.textContent.replace(/\s+/g,' ').trim().slice(0,60)))})()
```

Each string must **begin with the visible line name** (WCAG SC 2.5.3, Label in
Name). If a name does not lead, the DOM order inside `.bl-tile__body` is wrong.

- [ ] **Step 2: Check keyboard order and the focus ring**

Tab through the mosaic. Expected: exactly eight stops, in visual order, with the
ring wrapping the whole tile rather than just the image.

- [ ] **Step 3: Check reduced motion**

`resize_window` cannot set this; use DevTools Rendering → "Emulate CSS
prefers-reduced-motion: reduce". Reload.

Expected: no zoom on hover, but the name still turns red. Every tile visible.

- [ ] **Step 4: Check with JavaScript disabled**

Disable JS in DevTools, reload. Expected: the whole page renders — cover, head,
all eight tiles, CTA. Nothing at `opacity: 0`.

- [ ] **Step 5: Re-run the harness at 900px**

`resize_window` to 900×900 and re-run `tools/business-lines-check.js`.

Expected: `0 failed`. In particular `no horizontal overflow` must still pass.

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix(business-lines): <what was actually wrong>"
```

Skip if nothing needed fixing.

---

## Task 9: Compare against the live page and hand over

- [ ] **Step 1: Bring up both versions**

`preview_start` `ugcc-business-lines` (8759, this worktree). The main checkout's
`ugcc-static` on 8747 serves `V2` — the current live page — for comparison.

- [ ] **Step 2: Screenshot both at 1280×900**

Capture `http://localhost:8747/business-lines-construction-services-kuwait/`
and `http://localhost:8759/business-lines-construction-services-kuwait/`.

- [ ] **Step 3: Confirm the spec's claims hold**

Walk the spec's §1 "Why" list and confirm each complaint is resolved: the
headline is now in the viewport; the hero alt is real; the page no longer
duplicates the landing page's seven rows; DOM order is consistent; the stray
`<h6>` is gone.

- [ ] **Step 4: Write the handover note**

Append to the plan file a short section recording: the final combined image
weight from Task 1 Step 5, the harness pass count, and anything deferred.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "docs(business-lines): record handover state"
```

- [ ] **Step 6: Report to the user**

Do **not** merge to `V2`. Report the branch name, the comparison screenshots,
the harness result, and let the user decide on merge. Copy is drafted and not
yet client-approved — say so explicitly.

---

## Self-review

**Spec coverage.** §3 files → Tasks 2, 3, 5, 6. §4 structure → Task 3 Steps
4–6. §5 content and counts → Task 3 Step 5. §5.1 naming → Task 3 Step 5 (display
text double-L, URL unchanged). §5.2 meta → Task 3 Step 8. §5.3 fill tile → Task
3 Step 5. §6 mosaic → Task 2. §6.4 reveal → Task 5. §6.5 responsive → Task 2 §8,
verified Task 4 Step 5. §7 imagery → Task 1. §7.1 alt → Task 3 Step 5, asserted
Task 6. §8 a11y → Task 8. §10 verification → Tasks 4, 6, 8.

**Deliberately not covered:** §9, the sub-page spine, is explicitly separate
work and out of this plan's scope.

**Naming consistency:** `.bl-tile__meta` is reused by the fill tile for its
"contracts on record" label — intentional, same type treatment, one rule. The
fill tile uses `.bl-tile__plate` (not `__shot`) because it holds no image and
must not inherit `overflow: hidden` or the zoom transition.

**One risk carried forward:** the water image is 768px and derives to 680px with
almost no headroom. It is correct at standard tile size and must not be promoted
to a lead tile without re-sourcing. Recorded in spec §7.0.

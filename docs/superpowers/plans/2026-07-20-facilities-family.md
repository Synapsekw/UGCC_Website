# Facilities Family Recompose — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recompose the four facilities pages (hub, Plants, Laboratories, Equipment) on the about-suite kit, per the approved spec `docs/superpowers/specs/2026-07-20-facilities-family-design.md`.

**Architecture:** Each page becomes cover → shipped `.v2-subnav` (kept) → kit `as-section` bands → navy close → untouched builder footer, following the HSSE page's structural convention (plain kit sections, no builder shells except the footer). One new family stylesheet (`fx-` namespace) supplies the five components the kit lacks; the shipped `v2-table` blocks are carried over verbatim; `about-suite.js` gains the `fx-` reveal targets.

**Tech Stack:** Static HTML, hand-authored CSS (no build step), ES5 IIFE JS. Dev server: `preview_start` name `ugcc-static` (python http.server, port 8747).

## Global Constraints

- **Copy locked.** Every visible string is carried over byte-for-byte from the current pages, including: "Middle Eas", "has unparalleled reputation" (no "an"), "Laboratory- a leading", the duplicated Concrete/Asphalt Works Equipment table row, "Facilities" table saying Asphalt Plants: 3. Never retype — copy strings out of the existing HTML source.
- **Photography locked.** Only files named in this plan may be rendered. Each is the largest repo copy of a photo already approved on these pages (content-suffix rule, spec §6).
- Branch `V2`. No new dependencies, no build step, ES5 only.
- Breakpoints: 920px (and 600px where the plan says so). Never 768px.
- Reds: `--v2-red` on light grounds / fills; `--v2-red-text` for small text on dark.
- Every hand-authored heading declares `font-family: var(--font-primary, 'Hammersmith One', sans-serif); font-weight: 400;`.
- Cache-busters: editing `about-suite.js` requires bumping `?v=2`→`?v=3` in **every** page that links it, same commit.
- Nothing may be hidden in CSS unless the `.hero-motion.v2-reveal` double gate plus a reduced-motion `opacity: 1` fallback exist (copy the `.bl-tile` pattern, `assets/css/pages/business-lines.css:169-197`).
- Builder footer `<section id="FUdf9w9dXZ">` and the header markup above the first content section are untouched on all four pages.
- The `_mockups/` directory is reference material for visual intent only; never link or ship it.

## File Structure

| File | Responsibility |
|---|---|
| `tools/facilities-check.js` | new — console harness, all four pages, written first (the failing test) |
| `assets/css/pages/facilities.css` | new — `fx-cols`, `fx-tiles`, `fx-types`, `fx-gallery`, `fx-next`, their reveal rules |
| `assets/js/about-suite.js` | modify — add `fx-` selectors to the reveal target list |
| `about-contractor-kuwait/`, `credentials/`, `csr/`, `hse/`, `quality/`, `business-lines-construction-services-kuwait/` `index.html` | modify — `about-suite.js?v=2`→`?v=3` only |
| `facilities-overview-construction-equipment-kuwait/index.html` | recompose body; head gains kit + family CSS and `about-suite.js?v=3` |
| `plants/index.html`, `laboratories/index.html`, `equipment/index.html` | same |

Current page anatomy (identical pattern on all four): builder head/header … first `<section id="…" class="block block--desktop-first-visible …">` (hero slideshow) → `<section class="v2-subnav">` → one or more builder `<section class="block">` content blocks and a `<section class="v2-tblock">` (`id`s: hub `KNtFW8fZh`/`zoZkDz`/`zWZLSH`; plants `plants`/`zubH7v`/`znLdB4`/`zRmdm8`; labs `z-GSWN`/`zYPj2o`/`zkCwVW`/`zjul5j`; equipment `equipment`/`z9xdeW`/`zZ2fT6`) → `<section id="FUdf9w9dXZ">` footer. The recompose replaces everything from the hero section up to (not including) the footer section, except the `.v2-subnav` which is kept in place.

---

### Task 1: Verification harness (the failing test)

**Files:**
- Create: `tools/facilities-check.js`

**Interfaces:**
- Produces: a console IIFE that logs `facilities-check: N passed, M failed` plus one line per failure, and `window.__facilitiesCheck = {passes, failures}` for tool-driven runs. Tasks 4–7 run it after each page edit; Task 8 fills its `COPY` constants.
- Consumes: nothing.

- [ ] **Step 1: Write the harness**

```js
/* UGCC facilities-family check. Dependency-free console IIFE, ES5.
   Run on any of the four facilities pages:
     fetch('/tools/facilities-check.js').then(function(r){return r.text()}).then(eval)
   Asserts the invisible decisions of
   docs/superpowers/specs/2026-07-20-facilities-family-design.md. */
(function () {
  'use strict';

  var path = location.pathname;
  var PAGE =
    path.indexOf('facilities-overview') !== -1 ? 'hub' :
    path.indexOf('/plants') === 0 ? 'plants' :
    path.indexOf('/laboratories') === 0 ? 'labs' :
    path.indexOf('/equipment') === 0 ? 'equipment' : null;
  if (!PAGE) { console.error('facilities-check: not a facilities page'); return; }

  /* djb2 of the page's locked copy, recorded after the pages were built and
     visually signed off. null = not recorded yet (harness warns instead of
     failing, so the harness can be written before the pages). */
  var COPY = { hub: null, plants: null, labs: null, equipment: null };

  var failures = [], passes = 0;
  function ok(name, cond, detail) {
    if (cond) { passes += 1; }
    else { failures.push(name + (detail ? ' — ' + detail : '')); }
  }

  /* 1 — cover contract (kit §1; the data-v attribute is what makes main.css
     reserve the header row — its absence is invisible in a screenshot) */
  var cover = document.querySelector('.as-cover');
  ok('cover: present', !!cover);
  if (cover) {
    ok('cover: data-v-3ffce944', cover.hasAttribute('data-v-3ffce944'));
    ok('cover: height 524', Math.round(cover.getBoundingClientRect().height) === 524,
       'got ' + Math.round(cover.getBoundingClientRect().height));
    var media = cover.querySelector('.as-cover__media');
    ok('cover: media alt non-empty', !!(media && (media.getAttribute('alt') || '').length));
    ok('cover: media width+height attrs',
       !!(media && media.getAttribute('width') && media.getAttribute('height')));
  }
  ok('one h1 per page', document.querySelectorAll('h1').length === 1,
     'got ' + document.querySelectorAll('h1').length);

  /* 2 — the shipped subnav, kept, with the a11y addition */
  var subLinks = document.querySelectorAll('.v2-subnav a');
  ok('subnav: 4 links', subLinks.length === 4, 'got ' + subLinks.length);
  var LABELS = ['Facilities', 'Plants', 'Laboratories', 'Equipment'];
  Array.prototype.forEach.call(subLinks, function (a, i) {
    ok('subnav: label ' + (i + 1) + ' = ' + LABELS[i],
       a.textContent.replace(/\s+/g, ' ').trim() === LABELS[i],
       'got "' + a.textContent.trim() + '"');
  });
  var actives = document.querySelectorAll('.v2-subnav a.is-active');
  ok('subnav: exactly one .is-active', actives.length === 1);
  ok('subnav: .is-active carries aria-current="page"',
     actives.length === 1 && actives[0].getAttribute('aria-current') === 'page');

  /* 3 — hub directory */
  if (PAGE === 'hub') {
    var tiles = document.querySelectorAll('.fx-tile');
    ok('hub: 4 tiles', tiles.length === 4, 'got ' + tiles.length);
    var anchors = document.querySelectorAll('.fx-tile > a');
    ok('hub: exactly 3 tile anchors', anchors.length === 3, 'got ' + anchors.length);
    Array.prototype.forEach.call(anchors, function (a) {
      var label = a.querySelector('.fx-tile__label');
      var num = label && label.querySelector('.fx-tile__num');
      var visible = label
        ? label.textContent.replace(num ? num.textContent : '', '').replace(/\s+/g, ' ').trim()
        : '';
      var acc = a.getAttribute('aria-label') || '';
      ok('hub: aria-label starts with visible name (' + visible + ')',
         acc.indexOf(visible) === 0, 'aria-label "' + acc + '"');
      ok('hub: tile number aria-hidden (' + visible + ')',
         !num || num.getAttribute('aria-hidden') === 'true');
    });
    if (tiles.length === 4) {
      ok('hub: WORKSHOPS tile has no link', !tiles[3].querySelector('a'));
    }
  }

  /* 4 — galleries: count, intrinsic sizes, and the per-page no-repeat rule */
  var GAL = { hub: 0, plants: 4, labs: 5, equipment: 12 };
  var cards = document.querySelectorAll('.fx-gallery > li');
  ok('gallery: ' + GAL[PAGE] + ' cards', cards.length === GAL[PAGE], 'got ' + cards.length);
  Array.prototype.forEach.call(cards, function (li, i) {
    var img = li.querySelector('img');
    ok('gallery: card ' + (i + 1) + ' img with width+height+alt',
       !!(img && img.getAttribute('width') && img.getAttribute('height') &&
          (img.getAttribute('alt') || '').length));
  });
  var seen = {}, dup = null;
  Array.prototype.forEach.call(document.querySelectorAll('img'), function (img) {
    var src = img.getAttribute('src');
    if (seen[src]) dup = src; else seen[src] = true;
  });
  ok('no photo rendered twice on the page', !dup, dup || '');

  /* 5 — the two reds: eyebrows on light grounds use --v2-red (#d41c22).
     Getting this backwards is invisible in a screenshot. */
  Array.prototype.forEach.call(
    document.querySelectorAll('.as-section--light .as-head__eyebrow, .as-section--tint .as-head__eyebrow'),
    function (el) {
      ok('eyebrow on light ground is --v2-red',
         getComputedStyle(el).color === 'rgb(212, 28, 34)',
         getComputedStyle(el).color);
    });

  /* 6 — progressive enhancement: without both gate classes on <html>,
     nothing may compute to opacity 0 (a failed script must degrade to a
     visible page, never a blank one) */
  var root = document.documentElement;
  var gated = root.classList.contains('hero-motion') && root.classList.contains('v2-reveal');
  if (!gated) {
    var hiddenEl = null;
    Array.prototype.forEach.call(
      document.querySelectorAll('.as-head, .as-prose, .as-quote, .fx-tile, .fx-type, .fx-gallery li'),
      function (el) {
        if (getComputedStyle(el).opacity === '0') hiddenEl = el.className;
      });
    ok('nothing hidden without the reveal gate', !hiddenEl, hiddenEl || '');
  }

  /* 7 — copy freeze. djb2 over the locked regions' normalised text. */
  function djb2(s) {
    var h = 5381, i;
    for (i = 0; i < s.length; i++) { h = (((h << 5) + h) + s.charCodeAt(i)) >>> 0; }
    return h.toString(16);
  }
  var lockSel = ['.as-cover__title', '.as-cover__lede', '.as-head__title',
    '.as-head__lede', '.as-head__eyebrow', '.as-prose', '.fx-tile__desc',
    '.fx-type', '.v2-table', '.as-quote__text'].join(',');
  var parts = [];
  Array.prototype.forEach.call(document.querySelectorAll(lockSel), function (el) {
    parts.push(el.textContent.replace(/\s+/g, ' ').trim());
  });
  var hash = djb2(parts.join('|'));
  if (COPY[PAGE]) {
    ok('copy freeze', hash === COPY[PAGE], 'got ' + hash + ', want ' + COPY[PAGE]);
  } else {
    console.warn('facilities-check: copy hash for ' + PAGE + ' is ' + hash +
      ' — record it in COPY once the page is signed off.');
  }

  /* 8 — tables survived verbatim (row counts; content is covered by #7) */
  var ROWS = { hub: 5, plants: 6, labs: 7, equipment: 7 };
  var rows = document.querySelectorAll('.v2-table tbody tr');
  ok('table: ' + ROWS[PAGE] + ' body rows', rows.length === ROWS[PAGE], 'got ' + rows.length);

  var summary = 'facilities-check [' + PAGE + ']: ' + passes + ' passed, ' +
    failures.length + ' failed';
  if (failures.length) {
    console.error(summary);
    failures.forEach(function (f) { console.error('  FAIL ' + f); });
  } else {
    console.log(summary);
  }
  window.__facilitiesCheck = { page: PAGE, passes: passes, failures: failures };
}());
```

- [ ] **Step 2: Run it against the current (old) pages to verify it fails**

Start the dev server (`preview_start` name `ugcc-static`), open
`http://localhost:8747/plants/`, and run in the console (or via the browser
`javascript_tool`):

```js
fetch('/tools/facilities-check.js').then(function(r){return r.text()}).then(eval)
```

Expected: `facilities-check [plants]: … failed` with FAILs for at least
`cover: present`, `gallery: 4 cards`, `subnav: .is-active carries aria-current` —
the old page has none of the new anatomy. (The subnav-labels and table-rows
checks pass already; that is correct.)

- [ ] **Step 3: Commit**

```bash
git add tools/facilities-check.js
git commit -m "test(facilities): add the family verification harness"
```

---

### Task 2: The family stylesheet

**Files:**
- Create: `assets/css/pages/facilities.css`

**Interfaces:**
- Consumes: tokens from `v2.css` (`--v2-*`), keyframe `as-fade-up` and the
  `.as-*` components from `about-suite.css`, `var(--font-primary)`/`--font-secondary`.
- Produces: classes `fx-cols`, `fx-tiles`, `fx-tile`(+`__link`,`__shot`,`__label`,`__num`,`__desc`,`__more`), `fx-types`(+`fx-type`,`__num`,`__name`,`__note`), `fx-gallery`(+`--2`,`--4`), `fx-next`(+`__dir`,`__name`), used verbatim by Tasks 4–7.

- [ ] **Step 1: Write the stylesheet**

```css
/* UGCC facilities family — hub tiles, overview split, type lists, gallery
   grids, continue-nav. Linked by the four facilities pages only, after
   about-suite.css. Spec: docs/superpowers/specs/2026-07-20-facilities-family-design.md
   Everything else on these pages is the about-suite kit or v2.css. */

/* ---- fx-cols: the overview split (prose beside figure or type list).
   1.05/.95 rather than 1/1 so the reading column keeps a slightly longer
   measure than the media column at 1224px. */
.fx-cols {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr);
  gap: 56px;
  align-items: start;
}
.fx-cols .as-figure { margin: 0; }

/* ---- fx-tiles: the hub directory, 2x2. Gap matches the projects grid
   (28px row / 24px column) so the two grids read as one family. */
.fx-tiles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 28px 24px;
  margin: 40px 0 0;
  padding: 0;
  list-style: none;
}
.fx-tile { min-width: 0; }
.fx-tile__link { display: block; text-decoration: none; }
.fx-tile__shot {
  display: block;
  aspect-ratio: 16 / 9;
  overflow: hidden;              /* required for the zoom */
  border-radius: 4px;            /* projects-card radius */
  background: #0b2233;           /* reserves the box before decode — CLS 0 */
}
.fx-tile__shot img {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
}
@media (prefers-reduced-motion: no-preference) {
  .fx-tile__shot img {
    transition: transform .5s var(--v2-ease-out-quart), filter .5s var(--v2-ease-out-quart);
  }
  .fx-tile__link:hover .fx-tile__shot img,
  .fx-tile__link:focus-visible .fx-tile__shot img {
    transform: scale(1.05);
    filter: brightness(1.06) saturate(1.05);
  }
}
.fx-tile__label {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin: 18px 0 0;
  /* V2 markup replaces .text-box, so the builder's heading scale never
     reaches this h3 — declare the family or it falls back to Open Sans. */
  font-family: var(--font-primary, 'Hammersmith One', sans-serif);
  font-weight: 400;
  font-size: 21px;               /* the offices country-h3 size */
  letter-spacing: .04em;
  color: var(--v2-navy);
  transition: color .25s var(--v2-ease-out-quart);
}
.fx-tile__num {
  font-family: var(--font-secondary, 'Open Sans', sans-serif);
  font-size: 12px; font-weight: 700;
  letter-spacing: .06em;
  color: var(--v2-red);          /* red index on light ground */
}
.fx-tile__link:hover .fx-tile__label,
.fx-tile__link:focus-visible .fx-tile__label { color: var(--v2-red); }
.fx-tile__desc {
  margin: 8px 0 0;
  font-size: 15px; line-height: 1.7;
  color: rgba(0, 42, 65, .72);   /* the .wr-desc floor that clears 4.5:1 */
  max-width: 54ch;
}
.fx-tile__more {
  display: inline-block;
  margin-top: 14px;
  padding-bottom: 4px;
  font-size: 12px; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase;
  color: var(--v2-navy);
  border-bottom: 2px solid var(--v2-red);   /* the .v2-proj__all affordance */
  transition: color .25s var(--v2-ease-out-quart);
}
.fx-tile__link:hover .fx-tile__more,
.fx-tile__link:focus-visible .fx-tile__more { color: var(--v2-red); }

/* ---- fx-types: numbered capability rows (no destination pages, so no
   links and no arrows — this is a register, not a nav) */
.fx-types { margin: 0; padding: 0; list-style: none; }
.fx-type {
  display: grid;
  grid-template-columns: 28px 1fr;   /* the wr-row number gutter */
  gap: 18px;
  align-items: baseline;
  padding: 15px 0;
  border-bottom: .5px solid rgba(0, 42, 65, .16);
}
.fx-types > .fx-type:first-child { border-top: .5px solid rgba(0, 42, 65, .16); }
.fx-type__num {
  font-size: 12px; font-weight: 700;
  letter-spacing: .06em;
  color: var(--v2-red);
}
.fx-type__name {
  font-family: var(--font-primary, 'Hammersmith One', sans-serif);
  font-weight: 400;
  font-size: 18px;
  letter-spacing: .02em;
  color: var(--v2-navy);
}
.fx-type__note {
  display: block;
  margin-top: 2px;
  font-family: var(--font-secondary, 'Open Sans', sans-serif);
  font-size: 13.5px;
  color: rgba(0, 42, 65, .62);
}

/* ---- fx-gallery: the approved slide sets as a contained grid. Cards are
   uniform 3:2 crops; the li owns overflow+radius so the zoom stays clipped. */
.fx-gallery {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.fx-gallery--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.fx-gallery--4 { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; }
.fx-gallery > li {
  min-width: 0;
  overflow: hidden;
  border-radius: 4px;
  background: #0b2233;
}
.fx-gallery img {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 2;
  object-fit: cover;
}
@media (prefers-reduced-motion: no-preference) {
  .fx-gallery img { transition: transform .5s var(--v2-ease-out-quart), filter .5s var(--v2-ease-out-quart); }
  .fx-gallery > li:hover img { transform: scale(1.05); filter: brightness(1.06) saturate(1.05); }
}

/* ---- fx-next: continue through the family, inside the closing navy
   section. Hairline cards, red-text direction line (dark ground). */
.fx-next {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-top: 40px;
}
.fx-next a {
  display: block;
  padding: 22px 24px;
  text-decoration: none;
  border: 1px solid rgba(255, 255, 255, .16);
  border-radius: 4px;
  transition: background-color .25s var(--v2-ease-out-quart), border-color .25s var(--v2-ease-out-quart);
}
.fx-next a:hover,
.fx-next a:focus-visible {
  background: rgba(255, 255, 255, .08);
  border-color: rgba(255, 255, 255, .4);
}
.fx-next a:last-child { text-align: right; }
.fx-next__dir {
  display: block;
  font-size: 11px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase;
  color: var(--v2-red-text);     /* small red text on navy — never --v2-red */
}
.fx-next__name {
  display: block;
  margin-top: 8px;
  font-family: var(--font-primary, 'Hammersmith One', sans-serif);
  font-weight: 400;
  font-size: 22px;
  letter-spacing: .03em;
  color: #fff;
}

/* ---- reveals: the .bl-tile pattern exactly (business-lines.css:169).
   Inert unless about-suite.js adds BOTH gate classes; the reduced-motion
   block guarantees visibility even if the UA flips preference mid-session. */
.hero-motion.v2-reveal .fx-tile,
.hero-motion.v2-reveal .fx-type,
.hero-motion.v2-reveal .fx-gallery > li { opacity: 0; }
.hero-motion.v2-reveal .fx-tile.is-in,
.hero-motion.v2-reveal .fx-type.is-in,
.hero-motion.v2-reveal .fx-gallery > li.is-in {
  animation: as-fade-up .8s var(--v2-ease-out-expo) both;
  animation-delay: calc(var(--i, 0) * 60ms);
}
@media (prefers-reduced-motion: reduce) {
  .hero-motion.v2-reveal .fx-tile,
  .hero-motion.v2-reveal .fx-type,
  .hero-motion.v2-reveal .fx-gallery > li { opacity: 1; }
}

/* ---- responsive. 920 is the builder's own header breakpoint; 768 would
   leave a dead 769-920 band (design-system rule). */
@media (max-width: 920px) {
  .fx-cols { grid-template-columns: 1fr; gap: 32px; }
  .fx-tiles { grid-template-columns: 1fr; gap: 32px; }
  .fx-gallery,
  .fx-gallery--4 { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
}
@media (max-width: 600px) {
  .fx-gallery,
  .fx-gallery--2,
  .fx-gallery--4 { grid-template-columns: 1fr; }
  .fx-next { grid-template-columns: 1fr; }
  .fx-next a:last-child { text-align: left; }
}
```

- [ ] **Step 2: Commit**

```bash
git add assets/css/pages/facilities.css
git commit -m "feat(facilities): family stylesheet — tiles, types, gallery grids, continue-nav"
```

---

### Task 3: Opt the fx- components into the reveal driver

**Files:**
- Modify: `assets/js/about-suite.js` (the `SELECTOR` array, ~line 48)
- Modify: `about-contractor-kuwait/index.html`, `credentials/index.html`, `csr/index.html`, `hse/index.html`, `quality/index.html`, `business-lines-construction-services-kuwait/index.html` — cache-buster only

**Interfaces:**
- Consumes: the reveal rules Task 2 wrote (selectors must match exactly).
- Produces: `about-suite.js?v=3` — the version the four facilities pages link in Tasks 4–7.

- [ ] **Step 1: Extend the selector list**

In `assets/js/about-suite.js`, replace the `SELECTOR` array:

```js
  var SELECTOR = [
    '.as-head',
    '.as-prose',
    '.as-card',
    '.as-ledger__row',
    '.as-acc',
    '.as-stat',
    '.as-quote',
    '.bl-tile',
    '.fx-tile',
    '.fx-type',
    '.fx-gallery > li'
  ].join(',');
```

And extend the comment above it: the last three live in
`pages/facilities.css` and are inert on every other page.

- [ ] **Step 2: Bump the cache-buster on the six existing pages**

```bash
grep -rl 'about-suite.js?v=2' --include=index.html . 
# expect exactly the six pages listed above
sed -i 's|about-suite.js?v=2|about-suite.js?v=3|' \
  about-contractor-kuwait/index.html credentials/index.html csr/index.html \
  hse/index.html quality/index.html business-lines-construction-services-kuwait/index.html
grep -rl 'about-suite.js?v=2' --include=index.html .   # expect: no output
```

- [ ] **Step 3: Regression-check one suite page**

Open `http://localhost:8747/hse/` — page renders fully, no console errors,
sections reveal on scroll (or are simply visible under reduced motion).

- [ ] **Step 4: Commit**

```bash
git add assets/js/about-suite.js about-contractor-kuwait/index.html \
  credentials/index.html csr/index.html hse/index.html quality/index.html \
  business-lines-construction-services-kuwait/index.html
git commit -m "feat(facilities): opt fx- components into the about-suite reveal (js v3)"
```

---

### Task 4: Hub page

**Files:**
- Modify: `facilities-overview-construction-equipment-kuwait/index.html`

**Interfaces:**
- Consumes: `fx-tiles`/`fx-tile*` (Task 2), `about-suite.js?v=3` (Task 3), kit classes from `about-suite.css?v=3`.
- Produces: the hub the three subpages' `fx-next` cards link back to.

- [ ] **Step 1: Head — add the two stylesheet links**

Immediately after the existing `<link rel="stylesheet" href="/assets/css/v2.css?v=4">`:

```html
<link rel="stylesheet" href="/assets/css/about-suite.css?v=3">
<link rel="stylesheet" href="/assets/css/pages/facilities.css?v=1">
```

- [ ] **Step 2: Scripts — add the reveal driver**

After the existing `<script src="/assets/js/v2.js?v=3" defer></script>`:

```html
<script src="/assets/js/about-suite.js?v=3" defer></script>
```

- [ ] **Step 3: Replace the body content**

Replace everything from the opening of the hero section
(`<section id="TzdoN7fWv_" class="block block--desktop-first-visible …">`)
up to but **not** including `<section id="FUdf9w9dXZ"` with the markup below —
**except**: keep the existing `<section class="v2-subnav">…</section>` element
exactly where it sits (immediately after the cover), adding
`aria-current="page"` to its `is-active` link.

Copy verbatim strings (statement, lede paragraph, blurbs, quote) out of the
old markup, not from this plan — the plan shows intent; the source is the
authority. The table block is the existing `v2-table-scroll` div, moved whole.

```html
<section class="block block--desktop-first-visible block--mobile-first-visible as-cover" data-v-3ffce944>
  <img class="as-cover__media" src="/assets/img/v2/facilities-banner.jpg"
       alt="UGCC asphalt plant against a clear desert sky in Kuwait"
       width="1024" height="683" fetchpriority="high" decoding="async">
  <div class="as-cover__scrim" aria-hidden="true"></div>
  <div class="as-cover__inner">
    <p class="as-cover__eyebrow">Facilities</p>
    <h1 class="as-cover__title">FACILITIES</h1>
    <p class="as-cover__lede">United Gulf Construction Company (UGCC) has an unparalleled reputation for excellence in Kuwait</p>
  </div>
</section>

<!-- keep the existing v2-subnav section HERE, adding aria-current="page"
     to <a href="/facilities-overview-construction-equipment-kuwait" class="is-active"> -->

<section class="as-section as-section--light">
  <div class="as-section__inner">
    <header class="as-head">
      <h2 class="as-head__title">UGCC has unparalleled reputation <br>for excellence in Kuwait</h2>
      <span class="as-head__rule" aria-hidden="true"></span>
      <p class="as-head__lede">To accomplish these and future initiatives, the company has established strategically placed plants and fabrication facilities. In addition, UGCC owns the largest fleet of construction equipment and vehicles in Kuwait. UGCC&rsquo;s fleet is constantly upgraded and kept to the highest technological and mechanical standards by management personnel and top engineers.</p>
    </header>
    <ul class="fx-tiles">
      <li class="fx-tile">
        <a class="fx-tile__link" href="/plants" aria-label="PLANTS">
          <span class="fx-tile__shot"><img src="/assets/img/a375c78c-bannerslide1-AMqDLlRxzXInk443.jpg" alt="UGCC asphalt plant tower and pipework in Kuwait" width="1024" height="683" loading="lazy" decoding="async"></span>
          <h3 class="fx-tile__label"><span class="fx-tile__num" aria-hidden="true">01</span>PLANTS</h3>
          <p class="fx-tile__desc">UGCC invests considerably in owning and maintaining plants and fabrication facilities</p>
          <span class="fx-tile__more">Explore More</span>
        </a>
      </li>
      <li class="fx-tile">
        <a class="fx-tile__link" href="/laboratories" aria-label="LABORATORIES">
          <span class="fx-tile__shot"><img src="/assets/img/12503e0b-bannerslide5-fdkqtCNKUhxe7XZ7.jpg" alt="UGCC technician operating an asphalt testing machine" width="1024" height="708" loading="lazy" decoding="async"></span>
          <h3 class="fx-tile__label"><span class="fx-tile__num" aria-hidden="true">02</span>LABORATORIES</h3>
          <p class="fx-tile__desc">UGCC has a total of seven laboratories, including the Central Testing Laboratory- a leading facility in the asphalt industry testing and analysis.</p>
          <span class="fx-tile__more">Explore More</span>
        </a>
      </li>
      <li class="fx-tile">
        <a class="fx-tile__link" href="/equipment" aria-label="EQUIPMENT">
          <span class="fx-tile__shot"><img src="/assets/img/7cd93d95-bannerslide14-YewugA06yhf9oVJA.jpg" alt="Row of UGCC excavators lined up in a Kuwait yard" width="2800" height="1575" loading="lazy" decoding="async"></span>
          <h3 class="fx-tile__label"><span class="fx-tile__num" aria-hidden="true">03</span>EQUIPMENT</h3>
          <p class="fx-tile__desc">In addition to stationary plants and fabrication facilities, UGCC invests considerably in owning and maintaining one of the largest heavy equipment fleets in the Middle East</p>
          <span class="fx-tile__more">Explore More</span>
        </a>
      </li>
      <li class="fx-tile">
        <span class="fx-tile__shot"><img src="/assets/img/a7ab7cdc-bannerslide2-bHbn5ovp26CWQnkK.jpg" alt="Asphalt mixture performance tester on a UGCC bench" width="1440" height="1406" loading="lazy" decoding="async"></span>
        <h3 class="fx-tile__label"><span class="fx-tile__num" aria-hidden="true">04</span>WORKSHOPS</h3>
        <p class="fx-tile__desc">UGCC maintains quality workshop facilities with the latest equipment, and the workshops are run by trained and qualified managers, technical engineers and skilled workers.</p>
      </li>
    </ul>
  </div>
</section>

<section class="as-section as-section--tint">
  <div class="as-section__inner">
    <header class="as-head">
      <h2 class="as-head__title">Facilities</h2>
      <span class="as-head__rule" aria-hidden="true"></span>
    </header>
    <!-- the existing v2-table-scroll block from the old page, moved whole,
         byte-identical (Facility / Details / Nos, 5 rows) -->
  </div>
</section>

<section class="as-section as-section--navy">
  <div class="as-section__inner">
    <blockquote class="as-quote">
      <p class="as-quote__text">UGCC invests considerably in owning and maintaining its facilities - plants and fabrication facilities. fleet of heavy vehicles and equipment, and workshops</p>
    </blockquote>
  </div>
</section>
```

Note on the hub statement: the old page renders it across two lines
("UGCC has unparalleled reputation / for excellence in Kuwait"); check the old
markup for an existing `<br>` and reproduce exactly what is there — if the
source has no `<br>`, do not add one.

- [ ] **Step 4: Run the harness**

Open `http://localhost:8747/facilities-overview-construction-equipment-kuwait/`,
run the fetch/eval snippet from Task 1. Expected: `0 failed` plus the
copy-hash warning (constants not yet recorded).

- [ ] **Step 5: Visual check**

Reload; confirm: cover photo under the transparent header with no white gap
(the `data-v-3ffce944` reservation), navy subnav under the cover, four tiles
with photos, table on tinted ground, navy quote, black footer. Check
`read_console_messages` for errors.

- [ ] **Step 6: Commit**

```bash
git add facilities-overview-construction-equipment-kuwait/index.html
git commit -m "feat(facilities): recompose the hub as a kit directory"
```

---

### Task 5: Plants page

**Files:**
- Modify: `plants/index.html`

**Interfaces:**
- Consumes: `fx-cols`, `fx-types`, `fx-gallery--2`, `fx-next` (Task 2); harness (Task 1).
- Produces: nothing downstream.

- [ ] **Step 1: Head + scripts** — same two `<link>`s and one `<script>` as Task 4 Steps 1–2.

- [ ] **Step 2: Replace the body content**

Replace from `<section id="z-p5mA" …>` (hero) up to `<section id="FUdf9w9dXZ"`,
keeping the `.v2-subnav` (add `aria-current="page"` to its `/plants` link).
Verbatim strings from the old markup; table block moved whole.

```html
<section class="block block--desktop-first-visible block--mobile-first-visible as-cover" data-v-3ffce944>
  <img class="as-cover__media" src="/assets/img/v2/hero-plants.jpg"
       alt="UGCC Marini asphalt plant at dusk, Kuwait"
       width="1286" height="863" fetchpriority="high" decoding="async">
  <div class="as-cover__scrim" aria-hidden="true"></div>
  <div class="as-cover__inner">
    <p class="as-cover__eyebrow">Facilities</p>
    <h1 class="as-cover__title">PLANTS</h1>
    <p class="as-cover__lede">United Gulf Construction Company (UGCC) invests considerably in owning and maintaining plants and fabrication facilities</p>
  </div>
</section>

<!-- keep the existing v2-subnav here; is-active is the /plants link -->

<section class="as-section as-section--light">
  <div class="as-section__inner">
    <header class="as-head">
      <h2 class="as-head__title">Overview</h2>
      <span class="as-head__rule" aria-hidden="true"></span>
    </header>
    <div class="fx-cols">
      <div class="as-prose as-prose--wide">
        <p>UGCC invests considerably in owning and maintaining plants and fabrication facilities and has established strategically placed plants and fabrication facilities</p>
        <p>Plants are managed, operated and maintained by a well-trained, experienced team of engineers and staff, ensuring rapid deployment and continuous support for the company&rsquo;s projects, both locally and internationally.</p>
        <p>The facilities includes asphalt plants with recycling facilities, concrete batching plants, crushing and screening plants.</p>
      </div>
      <figure class="as-figure">
        <img src="/assets/img/v2/plants-overview.jpg"
             alt="UGCC crushing and screening plant with graded aggregate bins"
             width="1920" height="1282" loading="lazy" decoding="async">
      </figure>
    </div>
    <ul class="fx-types" style="margin-top:48px;">
      <li class="fx-type">
        <span class="fx-type__num" aria-hidden="true">01</span>
        <span class="fx-type__name">Asphalt Plants
          <span class="fx-type__note">Includes recycling facilities</span>
        </span>
      </li>
      <li class="fx-type">
        <span class="fx-type__num" aria-hidden="true">02</span>
        <span class="fx-type__name">Concrete Batching Plants</span>
      </li>
      <li class="fx-type">
        <span class="fx-type__num" aria-hidden="true">03</span>
        <span class="fx-type__name">Crushing and Screening Plants</span>
      </li>
    </ul>
  </div>
</section>

<section class="as-section as-section--tint">
  <div class="as-section__inner">
    <header class="as-head">
      <h2 class="as-head__title">Plant Locations and Capacities</h2>
      <span class="as-head__rule" aria-hidden="true"></span>
    </header>
    <!-- existing v2-table-scroll block, moved whole (Plant/Location/Capacity, 6 rows) -->
  </div>
</section>

<section class="as-section as-section--light">
  <div class="as-section__inner">
    <ul class="fx-gallery fx-gallery--2" role="group" aria-label="Photographs of UGCC plants">
      <li><img src="/assets/img/1b6ba9ff-bannerslide2-d95Zw7k3ePTgXN6l.jpg" alt="UGCC concrete batching plant" width="1024" height="683" loading="lazy" decoding="async"></li>
      <li><img src="/assets/img/2e32cc34-bannerslide5-YX4jJa313ohyLXRn.jpg" alt="UGCC plant facility" width="1024" height="684" loading="lazy" decoding="async"></li>
      <li><img src="/assets/img/1f7b5437-bannerslide6-A0xv71ReJ4Sb4e4N.jpg" alt="UGCC plant facility" width="1024" height="683" loading="lazy" decoding="async"></li>
      <li><img src="/assets/img/56fc8feb-bannerslide8-mk34pqb8OyfVX0pO.jpg" alt="UGCC plant facility" width="1024" height="606" loading="lazy" decoding="async"></li>
    </ul>
  </div>
</section>

<section class="as-section as-section--navy">
  <div class="as-section__inner">
    <blockquote class="as-quote">
      <p class="as-quote__text">UGCC invests considerably in owning and maintaining plants and fabrication facilities and has established strategically placed plants and fabrication facilities</p>
    </blockquote>
    <nav class="fx-next" aria-label="More facilities">
      <a href="/facilities-overview-construction-equipment-kuwait">
        <span class="fx-next__dir">&larr; Facilities</span>
        <span class="fx-next__name">FACILITIES</span>
      </a>
      <a href="/laboratories">
        <span class="fx-next__dir">Next &rarr;</span>
        <span class="fx-next__name">LABORATORIES</span>
      </a>
    </nav>
  </div>
</section>
```

Gallery alts: before writing each `alt`, open the image file and describe what
it actually shows (the mockups' generic "UGCC plant facility" is a
placeholder; the plan's first slide is known to be a batching plant — verify
the rest the same way).

- [ ] **Step 3: Run the harness** — expect `0 failed` + hash warning.

- [ ] **Step 4: Visual check** — as Task 4 Step 5, plus: the 2×2 gallery sits
  on the content column, table numerals align (`Capacity` column).

- [ ] **Step 5: Commit**

```bash
git add plants/index.html
git commit -m "feat(facilities): recompose Plants on the family template"
```

---

### Task 6: Laboratories page

**Files:**
- Modify: `laboratories/index.html`

**Interfaces:**
- Consumes: `fx-cols`, `fx-gallery` (3-col), `fx-next` (Task 2); harness (Task 1).
- Produces: nothing downstream.

- [ ] **Step 1: Head + scripts** — same as Task 4 Steps 1–2.

- [ ] **Step 2: Replace the body content**

Replace from `<section id="zcONz9" …>` up to the footer, keeping `.v2-subnav`
(`aria-current` on `/laboratories`). Sections:

1. Cover — `src="/assets/img/v2/labs-overview.jpg"`,
   `alt="UGCC laboratory technician operating an asphalt testing machine"`,
   `width="1024" height="708"`, eyebrow `Facilities`, H1 `LABORATORIES`, lede
   verbatim ("UGCC has a total of seven laboratories, including the Central
   Testing Laboratory- a leading facility in the asphalt industry testing and
   analysis.").
2. `as-section--light` "Overview": `fx-cols` with `as-prose as-prose--wide`
   holding the first four verbatim paragraphs (staffed by / ISO 17025:2017 /
   HMA suite / — copy from old markup), beside:

```html
<figure class="as-figure">
  <img src="/assets/img/a7ab7cdc-bannerslide2-bHbn5ovp26CWQnkK.jpg"
       alt="Asphalt mixture performance tester in the UGCC Central Testing Laboratory"
       width="1440" height="1406" loading="lazy" decoding="async">
</figure>
```

3. `as-section--tint` "Analysis and Testing":

```html
<header class="as-head">
  <p class="as-head__eyebrow">Asphalt &middot; Bitumen</p>
  <h2 class="as-head__title">Analysis and Testing</h2>
  <span class="as-head__rule" aria-hidden="true"></span>
</header>
<div class="fx-cols">
  <div class="as-prose as-prose--wide">
    <!-- verbatim: the bitumen/ASTM/AASHTO paragraph, then the SuperPave paragraph -->
  </div>
  <div class="as-prose as-prose--wide">
    <!-- verbatim: the aggregate-tests paragraph, then: -->
    <ul>
      <li>Quality Test of Aggregates</li>
      <li>Quality Test of Polymer Modified Bitumen (PMB)</li>
      <li>Quality Test of Hot Mix Asphalt (HMA)</li>
      <li>Compaction Test</li>
    </ul>
  </div>
</div>
```

4. `as-section--light` "Tests and Analysis Details": head + the existing
   `v2-table-scroll` block moved whole (Test and Analysis/Aggregates, 7 rows).
5. `as-section--tint` gallery (five slides; bannerslide2 excluded — it is the
   figure in section 2):

```html
<ul class="fx-gallery" role="group" aria-label="Photographs of UGCC laboratories">
  <li><img src="/assets/img/6fd5fe2f-bannerslide1-5plCBZWEwdyB3l2D.jpg" alt="" width="1440" height="957" loading="lazy" decoding="async"></li>
  <li><img src="/assets/img/750c616d-bannerslide3-8FKHjAkdbSiDfJ9N.jpg" alt="" width="2800" height="1591" loading="lazy" decoding="async"></li>
  <li><img src="/assets/img/12503e0b-bannerslide5-fdkqtCNKUhxe7XZ7.jpg" alt="" width="1024" height="708" loading="lazy" decoding="async"></li>
  <li><img src="/assets/img/1af51961-bannerslide6-8zTmuWUEZvCliFN8.jpg" alt="" width="1024" height="604" loading="lazy" decoding="async"></li>
  <li><img src="/assets/img/0fc729e2-bannerslide7-KeDi4Y9GQWyA9qea.jpg" alt="" width="1024" height="683" loading="lazy" decoding="async"></li>
</ul>
```

   Fill each `alt=""` by opening the file and describing it (harness fails on
   empty gallery alts — that is intended pressure).

6. `as-section--navy`: `as-quote` ("The UGCC Central Testing Laboratory is a
   leading facility in the asphalt industry testing and analysis") +
   `fx-next`: `← Previous / PLANTS` → `/plants`, `Next → / EQUIPMENT` →
   `/equipment` (same card markup as Task 5).

- [ ] **Step 3: Run the harness** — expect `0 failed` + hash warning.

- [ ] **Step 4: Visual check** — two prose columns balance at 1280; the
  five-card gallery's ragged last row sits left-aligned; tint/light
  alternation reads cleanly.

- [ ] **Step 5: Commit**

```bash
git add laboratories/index.html
git commit -m "feat(facilities): recompose Laboratories on the family template"
```

---

### Task 7: Equipment page

**Files:**
- Modify: `equipment/index.html`

**Interfaces:**
- Consumes: `fx-cols`, `fx-types`, `fx-gallery--4`, `fx-next` (Task 2); harness (Task 1).
- Produces: nothing downstream.

- [ ] **Step 1: Head + scripts** — same as Task 4 Steps 1–2.

- [ ] **Step 2: Replace the body content**

Replace from `<section id="zg-WMw" …>` up to the footer, keeping `.v2-subnav`
(`aria-current` on `/equipment`). Sections:

1. Cover — `src="/assets/img/v2/hero-equipment.jpg"`,
   `alt="Row of UGCC CAT excavators lined up in a Kuwait yard"`,
   `width="1920" height="1080"`, eyebrow `Facilities`, H1 `EQUIPMENT`, lede
   verbatim ("United Gulf Construction Company (UGCC) has an unparalleled
   reputation for excellence in Kuwait").
2. `as-section--light` "Overview": `fx-cols` — left `as-prose as-prose--wide`
   with the three verbatim paragraphs (including "Middle Eas" exactly as the
   source has it); right the seven-row `fx-types` list, names verbatim:
   01 Tower Cranes and Heavy-duty Cranes · 02 Heavy-duty Bulldozers ·
   03 Excavators and Loaders · 04 Dumpsters and Trailers · 05 Graders ·
   06 Road Pavers and Milling Machines · 07 Road Rollers (same `fx-type`
   markup as Task 5 Step 2, no notes).
3. `as-section--tint` "Equipment Details": head + existing `v2-table-scroll`
   block moved whole (Equipment Type/Details, 7 rows).
4. `as-section--light` gallery, twelve slides:

```html
<ul class="fx-gallery fx-gallery--4" role="group" aria-label="Photographs of the UGCC equipment fleet">
  <li><img src="/assets/img/f52f4a4b-bannerslide1-kxomI3O2BG0kODWb.jpg" alt="" width="768" height="768" loading="lazy" decoding="async"></li>
  <li><img src="/assets/img/b0f172f8-bannerslide2-pOxpZ0UwQkf7zgmB.jpg" alt="" width="768" height="768" loading="lazy" decoding="async"></li>
  <li><img src="/assets/img/ea330e3d-bannerslide4-QRaqZAbHjDkEH2qY.jpg" alt="" width="768" height="768" loading="lazy" decoding="async"></li>
  <li><img src="/assets/img/f995e6ee-bannerslide5-lYx2kDYILzvtu06m.jpg" alt="" width="768" height="768" loading="lazy" decoding="async"></li>
  <li><img src="/assets/img/38013849-bannerslide7-bnn8lIXgg9jkfpdW.jpg" alt="" width="768" height="768" loading="lazy" decoding="async"></li>
  <li><img src="/assets/img/094397a5-bannerslide8-gbcVdxokP8e4Jbkl.jpg" alt="" width="768" height="768" loading="lazy" decoding="async"></li>
  <li><img src="/assets/img/203820af-bannerslide9-tckM6gALWSyO2pJ2.jpg" alt="" width="768" height="768" loading="lazy" decoding="async"></li>
  <li><img src="/assets/img/8b7ea221-bannerslide11-FEXuXJL9O4Ss1mtq.jpg" alt="" width="768" height="768" loading="lazy" decoding="async"></li>
  <li><img src="/assets/img/46b1701a-bannerslide12-x1WIOUlKly76caXd.jpg" alt="" width="768" height="768" loading="lazy" decoding="async"></li>
  <li><img src="/assets/img/a27581d9-bannerslide13-A6njwNEdUiObYJZn.jpg" alt="" width="768" height="768" loading="lazy" decoding="async"></li>
  <li><img src="/assets/img/7cd93d95-bannerslide14-YewugA06yhf9oVJA.jpg" alt="" width="2800" height="1575" loading="lazy" decoding="async"></li>
  <li><img src="/assets/img/dea701e5-mainbanner-lbuG6SZifrV436Oj.jpg" alt="" width="768" height="768" loading="lazy" decoding="async"></li>
</ul>
```

   Fill the `alt`s from the files, as in Task 6.
5. `as-section--navy`: **no quote** (the old page has no closing statement) —
   `fx-next` only: `← Previous / LABORATORIES` → `/laboratories`,
   `Back to → / FACILITIES` → `/facilities-overview-construction-equipment-kuwait`.

- [ ] **Step 3: Run the harness** — expect `0 failed` + hash warning.

- [ ] **Step 4: Visual check** — 4-col gallery at 1280, 2-col at 920, 1-col
  at 600; square slides crop to 3:2 without letterboxing.

- [ ] **Step 5: Commit**

```bash
git add equipment/index.html
git commit -m "feat(facilities): recompose Equipment on the family template"
```

---

### Task 8: Freeze, sweep, clean up

**Files:**
- Modify: `tools/facilities-check.js` (the `COPY` constants)
- Modify: possibly the four pages' JSON-LD blocks
- Delete: `_mockups/` (untracked — remove from disk)

**Interfaces:**
- Consumes: the four finished pages, the harness.
- Produces: the shipped state.

- [ ] **Step 1: Record the copy-freeze hashes**

Visit each of the four pages, run the harness, collect the four warned hashes,
and write them into `COPY` in `tools/facilities-check.js`:

```js
  var COPY = { hub: '<hash>', plants: '<hash>', labs: '<hash>', equipment: '<hash>' };
```

Re-run the harness on all four pages. Expected: `0 failed`, no warnings.

- [ ] **Step 2: JSON-LD image check**

For each page, inspect the `<script type="application/ld+json">` block:

```bash
grep -o '"image":"[^"]*"' facilities-overview-construction-equipment-kuwait/index.html plants/index.html laboratories/index.html equipment/index.html
```

If a page's `image` names a file that no longer renders on that page, repoint
it to that page's cover file (the business-lines precedent). Change nothing
else in the block. Titles and meta descriptions: verify unchanged
(`git diff` on the four files must show no `<title>` or `name="description"`
lines).

- [ ] **Step 3: Family sweep**

At 1280, 920 and 600 wide, on all four pages: no horizontal overflow
(`document.documentElement.scrollWidth <= window.innerWidth`), cover 524px,
subnav scrolls at 600. With reduced motion emulated: everything visible, no
animation. Keyboard: tab through hub tiles → subnav → (subpages) fx-next;
every stop shows a visible focus state. Console: zero errors on all four.

- [ ] **Step 4: Delete the mockups**

```bash
rm -rf _mockups
```

(Untracked — no git change. This is spec §11's "must not ship" item.)

- [ ] **Step 5: Commit**

```bash
git add tools/facilities-check.js <any pages whose JSON-LD changed>
git commit -m "chore(facilities): freeze copy hashes, JSON-LD covers, family sweep"
```

---

## Self-review notes

- Spec coverage: §4.1 covers → Tasks 4–7 Step 2; §4.2 subnav → kept + aria-current in each page task; §4.3 fx-next → Tasks 5–7; §4.4 galleries → Tasks 5–7 + CSS Task 2; §4.5/`fx-types`/`fx-cols` → Task 2; §5 structures → Tasks 4–7; §6 imagery → filenames pinned per task, largest-copy rule in constraints; §7 meta → Task 8 Step 2; §8 reveals → Tasks 2–3; §9 a11y → markup in Tasks 4–7 + harness; §10 harness → Task 1 (+Task 8 freeze); §11 mockup deletion → Task 8 Step 4.
- The harness intentionally ships before the pages (Task 1) and fails on the old pages — that is the TDD cycle for a static site.
- Gallery `alt=""` placeholders in Tasks 6–7 are deliberate work orders backed by a harness check that fails on empty alts; the executor must look at each image.

# About and Who-are-we Recomposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recompose the two homepage blocks below the hero — About into a 600px full-bleed statement, Who-are-we into a seven-row editorial index — on a shared button component extracted from the hero.

**Architecture:** Purely additive layers on a buildless static site, following the pattern established by the hero recomposition. Both blocks' builder-generated `.block-layout` subtrees are replaced wholesale with clean semantic markup; the `<section>` elements and their `.block-background` children are untouched. New styles go in `assets/css/sections.css`, new behaviour in `assets/js/sections.js`, both loaded by `index.html` only. The hero's button rules move out of `hero.css` into `sections.css` so there is one definition of the treatment.

**Tech Stack:** Plain HTML, CSS, vanilla ES5-compatible JS. No build step, no bundler, no dependencies. Verification via a dependency-free browser-console assertion script.

**Spec:** `docs/superpowers/specs/2026-07-19-about-whoarewe-design.md`

**Branch:** `hero-recompose`. Do not push. Do not merge to `master`.

---

## Why there are no unit tests

Same reasoning as the hero plan. This repo has no frontend test infrastructure and no `package.json` at the root. Its only automated tests are `tests/chat.test.mjs` (vitest, chatbot netlify function) and `tools/knowledge/test_extract.py`. Adding Playwright would introduce `node_modules` to a site whose deployment model is copying files onto shared hosting.

Task 1 builds `tools/home-check.js`: a dependency-free script asserting the spec's verification list against the live DOM. It is written first, must fail first, and must pass at the end. That is the TDD loop for this work.

`tools/hero-check.js` must also continue to pass unchanged throughout — Task 2 moves the hero's button rules to a different file, and that script is the regression net for it.

---

## Running the checks

The dev server already runs on port 8747 (`.claude/launch.json`, config name `ugcc-static`). Open `http://localhost:8747/index.html`, size the viewport to exactly 1280×720, and evaluate the contents of the check script in the console. Both scripts return `{passed, failed, results}` and log a `PASS`/`FAIL` line per assertion.

---

## File structure

| File | Responsibility |
|---|---|
| `tools/home-check.js` | New. About + Who-are-we invariant assertions. Zero dependencies. |
| `assets/css/sections.css` | New. `.v2-btn` component, About layout, Who-are-we layout, reveal states. Homepage only. |
| `assets/js/sections.js` | New. Scroll-reveal observer, gated on `.hero-motion`. Homepage only. |
| `assets/css/hero.css` | Modify. Delete the button and shine blocks; they move to `sections.css`. |
| `index.html` | Modify. Replace two `.block-layout` subtrees; add one `<link>` and one `<script>`. |

---

## Task 1: Assertion harness

**Files:**
- Create: `tools/home-check.js`

- [ ] **Step 1: Write the assertion script**

Create `tools/home-check.js`:

```js
/* UGCC homepage About + Who-are-we layout checks. Dependency-free.
   Usage: paste into the browser console on the homepage, or evaluate via
   automation. Returns {passed, failed, results}. Resize to 1280x720 first.

   Companion to tools/hero-check.js, which covers the hero and the header.
   Both must pass.

   NOT covered by this script (manual verification required):
     - 375px layout for both sections
     - contrast of .wr-desc against the white-wall background image
     - the chat widget overlapping the Explore More button or the last row */
(function () {
  'use strict';

  var ABOUT = '#BCClZ9bf3';
  var WHO = '#u7vIc0iRh';

  /* Numeral, accessible name, and href for all seven rows, in DOM order.
     The hrefs are the ones the builder markup already used - they are
     load-bearing and must survive the rewrite verbatim. */
  var SERVICES = [
    ['01', 'ROADS AND BRIDGES', '/roads-and-bridges-contractor-kuwait'],
    ['02', 'CIVIL INFRASTRUCTURE', '/civil-infrastructure-kuwait'],
    ['03', 'BUILDING CONSTRUCTION', '/building-construction-kuwait'],
    ['04', 'OIL AND GAS', '/oil-and-gas-construction-kuwait'],
    ['05', 'WATER MANAGEMENT', '/water-treatment-plant-kuwait'],
    ['06', 'ELECTRO-MECHANICAL', '/electro-mechanical-contractor-kuwait'],
    ['07', 'MICRO-TUNNELING', '/micro-tunneling-kuwait']
  ];

  var results = [];
  function check(name, fn) {
    var ok = false, detail = '';
    try {
      var r = fn();
      if (r === true) { ok = true; }
      else if (r && typeof r === 'object') { ok = !!r.ok; detail = r.detail || ''; }
    } catch (e) { detail = 'threw: ' + e.message; }
    results.push({ name: name, ok: ok, detail: detail });
  }

  /* Precondition. Every height assertion below is calibrated to this
     viewport; at any other size they are meaningless rather than wrong,
     which is worse. */
  check('viewport is exactly 1280x720', function () {
    return {
      ok: window.innerWidth === 1280 && window.innerHeight === 720,
      detail: window.innerWidth + 'x' + window.innerHeight
    };
  });

  check('seven services in order, correct names and hrefs', function () {
    var rows = document.querySelectorAll(WHO + ' .wr-row');
    if (rows.length !== 7) return { ok: false, detail: 'found ' + rows.length + ' .wr-row' };
    var bad = [];
    SERVICES.forEach(function (s, i) {
      var row = rows[i];
      var num = row.querySelector('.wr-num');
      var name = row.querySelector('.wr-name');
      var href = row.getAttribute('href');
      if (!num || num.textContent.trim() !== s[0]) {
        bad.push('row' + i + ' num=' + (num ? num.textContent.trim() : 'MISSING'));
      }
      if (!name || name.textContent.trim() !== s[1]) {
        bad.push('row' + i + ' name=' + (name ? name.textContent.trim() : 'MISSING'));
      }
      if (href !== s[2]) bad.push('row' + i + ' href=' + href);
    });
    return { ok: bad.length === 0, detail: bad.join('; ') || '7/7 correct' };
  });

  check('every service row carries a description', function () {
    var rows = document.querySelectorAll(WHO + ' .wr-row');
    var empty = 0;
    Array.prototype.forEach.call(rows, function (r) {
      var d = r.querySelector('.wr-desc');
      if (!d || !d.textContent.trim()) empty++;
    });
    return {
      ok: rows.length === 7 && empty === 0,
      detail: 'rows=' + rows.length + '; empty descriptions=' + empty
    };
  });

  check('About fits in 600px', function () {
    var s = document.querySelector(ABOUT);
    if (!s) return { ok: false, detail: 'section not found' };
    return { ok: s.offsetHeight <= 600, detail: s.offsetHeight + 'px (was 726px)' };
  });

  check('Who-are-we is under 1000px', function () {
    var s = document.querySelector(WHO);
    if (!s) return { ok: false, detail: 'section not found' };
    return { ok: s.offsetHeight < 1000, detail: s.offsetHeight + 'px (was 1394px)' };
  });

  check('one h1, and both new sections use h2', function () {
    var h1 = document.querySelectorAll('h1').length;
    var a = document.querySelector(ABOUT + ' .about-statement');
    var w = document.querySelector(WHO + ' .wr-title');
    var aTag = a ? a.tagName : 'MISSING';
    var wTag = w ? w.tagName : 'MISSING';
    return {
      ok: h1 === 1 && aTag === 'H2' && wTag === 'H2',
      detail: 'h1 count=' + h1 + '; about=' + aTag + '; who=' + wTag
    };
  });

  check('section buttons match the hero button', function () {
    var hero = document.querySelector('#aCqA2TkE7 .hero-btn--primary');
    if (!hero) return { ok: false, detail: 'hero primary button not found' };
    var btns = document.querySelectorAll('.v2-btn');
    if (btns.length !== 2) {
      return { ok: false, detail: 'expected 2 .v2-btn, found ' + btns.length };
    }
    var h = getComputedStyle(hero);
    var props = ['borderTopLeftRadius', 'paddingTop', 'paddingLeft', 'fontSize', 'fontWeight'];
    var bad = [];
    Array.prototype.forEach.call(btns, function (b, i) {
      var s = getComputedStyle(b);
      props.forEach(function (p) {
        if (s[p] !== h[p]) bad.push('btn' + i + '.' + p + '=' + s[p] + ' vs hero ' + h[p]);
      });
    });
    return { ok: bad.length === 0, detail: bad.join('; ') || 'geometry matches on both' };
  });

  /* The keyboard state must be the designed state, not a browser default.
     Asserting the two computed styles match is impossible - you cannot force
     :focus-visible from script reliably - so assert instead that one single
     CSS rule carries both selectors, which is what makes divergence
     impossible in the first place. */
  check('row hover and focus-visible are one rule', function () {
    var found = null;
    var sheets = document.styleSheets;
    for (var i = 0; i < sheets.length && !found; i++) {
      var rules;
      try { rules = sheets[i].cssRules; } catch (e) { continue; }
      if (!rules) continue;
      for (var j = 0; j < rules.length; j++) {
        var sel = rules[j].selectorText;
        if (!sel) continue;
        if (sel.indexOf('.wr-row:hover') !== -1 &&
            sel.indexOf('.wr-row:focus-visible') !== -1) {
          found = rules[j];
          break;
        }
      }
    }
    if (!found) {
      return { ok: false, detail: 'no single rule matches both .wr-row:hover and .wr-row:focus-visible' };
    }
    var bs = found.style.getPropertyValue('box-shadow');
    var bg = found.style.getPropertyValue('background-color');
    return {
      ok: bs.indexOf('inset') !== -1 && bg !== '',
      detail: 'box-shadow=' + bs + '; background-color=' + bg
    };
  });

  /* The reveal must be opt-IN. sections.js adds .v2-reveal before the hiding
     rules bite, so a failure to load the script leaves the content visible
     rather than permanently invisible. Removing the class must therefore
     leave every row fully opaque. */
  check('reveal is opt-in, not opt-out', function () {
    var root = document.documentElement;
    var had = root.classList.contains('v2-reveal');
    root.classList.remove('v2-reveal');
    var rows = document.querySelectorAll(WHO + ' .wr-row');
    var hidden = 0;
    Array.prototype.forEach.call(rows, function (r) {
      if (parseFloat(getComputedStyle(r).opacity) < 1) hidden++;
    });
    if (had) root.classList.add('v2-reveal');
    return {
      ok: rows.length === 7 && hidden === 0,
      detail: 'rows=' + rows.length + '; hidden without .v2-reveal=' + hidden
    };
  });

  /* --v2-red-text (#e8635e) is a lightened salmon chosen for legibility on
     dark video. On this section's near-white ground it falls to roughly
     2.9:1. --v2-red (#d41c22) clears 5.3:1. Getting these two backwards is
     invisible in a screenshot and fails accessibility. */
  check('who-are-we uses the light-ground red', function () {
    var eyebrow = document.querySelector(WHO + ' .wr-eyebrow');
    if (!eyebrow) return { ok: false, detail: '.wr-eyebrow not found' };
    var c = getComputedStyle(eyebrow).color.replace(/\s/g, '');
    return { ok: c === 'rgb(212,28,34)', detail: c + ' (want rgb(212,28,34) = #d41c22)' };
  });

  var passed = results.filter(function (r) { return r.ok; }).length;
  var failed = results.length - passed;

  results.forEach(function (r) {
    console.log((r.ok ? 'PASS  ' : 'FAIL  ') + r.name + (r.detail ? '  [' + r.detail + ']' : ''));
  });
  console.log('\n' + passed + ' passed, ' + failed + ' failed');

  return { passed: passed, failed: failed, results: results };
})();
```

- [ ] **Step 2: Run it to verify it fails**

Serve the site, open `http://localhost:8747/index.html`, size the viewport to 1280×720, evaluate the script.

Expected: `1 passed, 9 failed`. Only `viewport is exactly 1280x720` passes. Every other check reports a missing element or an out-of-range height (About 726px, Who-are-we 1394px).

If more than one check passes at this point, stop — something in the page already matches and the check is not testing what it claims to.

- [ ] **Step 3: Commit**

```bash
git add tools/home-check.js
git commit -m "test: assertion harness for the About and Who-are-we recomposition

Ten checks against the live DOM covering row count, order, hrefs and
descriptions, both section heights, heading levels, button geometry parity
with the hero, hover/focus-visible rule unity, opt-in reveal, and the
light-ground red token. Fails 9/10 against the current builder markup."
```

---

## Task 2: Extract the button component

**Files:**
- Create: `assets/css/sections.css`
- Modify: `assets/css/hero.css` (delete two blocks)
- Modify: `index.html` (one `<link>` tag)

The hero's button rules become the shared component. They are *moved*, not copied — `hero.css` ends up with no button rules at all, and `sections.css` lists the hero's own selectors alongside `.v2-btn`. The hero's rendered output must not change; `tools/hero-check.js` is the proof.

- [ ] **Step 1: Create `assets/css/sections.css` with the button component**

```css
/* ==========================================================================
   UGCC homepage — shared button, About, Who-are-we.
   Loaded only by index.html, after hero.css.
   ========================================================================== */

/* ---------- button ----------
   One definition for all three homepage sections. The hero's own selectors
   are listed here rather than left in hero.css so the treatment has a single
   source; the hero markup keeps its .hero-btn class names, so
   tools/hero-check.js and any external references are unaffected. */
.v2-btn,
#aCqA2TkE7 .hero-btn {
  display: inline-block;
  padding: 15px 32px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  border: 1px solid transparent;
  transition:
    transform .25s var(--v2-ease-out-quart),
    background-color .25s var(--v2-ease-out-quart),
    box-shadow .25s var(--v2-ease-out-quart),
    color .25s var(--v2-ease-out-quart);
}

/* White pill — for dark grounds (hero video, About navy). */
.v2-btn--primary,
#aCqA2TkE7 .hero-btn--primary {
  background: #fff;
  color: #101010;
}

/* Navy pill — for light grounds (Who-are-we). */
.v2-btn--dark {
  background: var(--v2-navy);
  color: #fff;
}

.v2-btn--dark:hover {
  background: #063a56;
}

/* Outlined — for dark grounds only; the border colour is white. */
.v2-btn--ghost,
#aCqA2TkE7 .hero-btn--secondary {
  border-color: rgba(255, 255, 255, .5);
  color: #fff;
}

.v2-btn--ghost:hover,
#aCqA2TkE7 .hero-btn--secondary:hover {
  background: rgba(255, 255, 255, .12);
  border-color: #fff;
}

.v2-btn:hover,
#aCqA2TkE7 .hero-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--v2-shadow-lift);
}

.v2-btn:active,
#aCqA2TkE7 .hero-btn:active {
  transform: translateY(0);
}

/* Shine sweep. Moved here from hero.css with the rest of the button, and
   renamed from hero-shine since it is no longer hero-specific. */
.v2-btn--primary,
.v2-btn--dark,
#aCqA2TkE7 .hero-btn--primary {
  position: relative;
  overflow: hidden;
}

.v2-btn--primary::after,
.v2-btn--dark::after,
#aCqA2TkE7 .hero-btn--primary::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -60%;
  width: 40%;
  background: linear-gradient(
    100deg,
    transparent 0%,
    rgba(255, 255, 255, .85) 50%,
    transparent 100%
  );
  transform: skewX(-18deg);
  pointer-events: none;
}

@media (prefers-reduced-motion: no-preference) {
  .v2-btn--primary:hover::after,
  .v2-btn--dark:hover::after,
  #aCqA2TkE7 .hero-btn--primary:hover::after {
    animation: v2-shine .8s var(--v2-ease-out-quart);
  }
}

@keyframes v2-shine {
  from { left: -60%; }
  to   { left: 120%; }
}
```

- [ ] **Step 2: Delete the moved blocks from `assets/css/hero.css`**

Delete these two regions, and nothing else:

1. The `/* ---------- CTAs ---------- */` block — from that comment through `#aCqA2TkE7 .hero-btn:active { transform: translateY(0); }` inclusive. This is `.hero-cta`, `.hero-btn`, `.hero-btn--primary`, `.hero-btn--secondary`, `.hero-btn--secondary:hover`, `.hero-btn:hover`, `.hero-btn:active`.

   **Keep `#aCqA2TkE7 .hero-cta`.** It is layout, not button treatment, and stays in `hero.css`. Only the seven `.hero-btn*` rules move.

2. The `/* Shine sweep on the primary CTA. */` block at the end of the file — `#aCqA2TkE7 .hero-btn--primary { position: relative; overflow: hidden; }`, its `::after`, the `@media (prefers-reduced-motion: no-preference)` wrapper around `:hover::after`, and `@keyframes hero-shine`.

Everything else in `hero.css` stays, including `@keyframes hero-fade-up`, which `sections.css` reuses in Task 7.

- [ ] **Step 3: Load the new stylesheet**

In `index.html`, find:

```html
<link rel="stylesheet" href="/assets/css/hero.css?v=1">
```

Replace with:

```html
<link rel="stylesheet" href="/assets/css/hero.css?v=2"><link rel="stylesheet" href="/assets/css/sections.css?v=1">
```

The `hero.css` cache-buster goes to `v=2` because its contents changed.

- [ ] **Step 4: Amend the spec's alias line**

The spec describes `hero.css` gaining "one alias block" that resolves `.hero-btn` to the same declarations. Implemented that way there are still two selectors in two files claiming the same treatment, and an ID-specificity selector in `hero.css` would silently win over anything `sections.css` later added to `.v2-btn`. Moving the rules and listing the hero's selectors alongside `.v2-btn` gives one source with no specificity race.

In `docs/superpowers/specs/2026-07-19-about-whoarewe-design.md`, replace:

```
The hero keeps its markup. `hero.css` gains one alias block so
`#aCqA2TkE7 .hero-btn` resolves to the same declarations rather than duplicating
them; `.hero-btn--primary` maps to `--primary` and `.hero-btn--secondary` to
`--ghost`. The hero's computed styles must be byte-identical before and after.
```

with:

```
The hero keeps its markup. Its button rules **move out of** `hero.css` into
`sections.css`, where `#aCqA2TkE7 .hero-btn` is listed as an additional selector
on each `.v2-btn` rule — `.hero-btn--primary` alongside `--primary`,
`.hero-btn--secondary` alongside `--ghost`. One source, no cross-file
specificity race. `#aCqA2TkE7 .hero-cta` is layout, not button treatment, and
stays in `hero.css`. The hero's computed styles must be identical before and
after, proven by `tools/hero-check.js`.
```

- [ ] **Step 5: Verify the hero is unchanged**

Reload at 1280×720 and evaluate `tools/hero-check.js`.

Expected: identical results to before this task — all checks passing. Visually confirm the two hero buttons still render as a white pill and an outlined pill, both lifting on hover, and the white one still sweeping.

If any hero check regresses, the move was incomplete. Do not proceed.

- [ ] **Step 6: Run `tools/home-check.js`**

Expected: still `1 passed, 9 failed`. `section buttons match the hero button` reports `expected 2 .v2-btn, found 0` — the component exists but has no call sites yet.

- [ ] **Step 7: Commit**

```bash
git add assets/css/sections.css assets/css/hero.css index.html docs/superpowers/specs/2026-07-19-about-whoarewe-design.md
git commit -m "refactor(css): extract the hero button into a shared .v2-btn

Moves the seven .hero-btn rules and the shine sweep out of hero.css into
sections.css, listing the hero's own selectors alongside .v2-btn so the
treatment has one source and the hero's computed styles are unchanged.
Adds a --dark variant for light grounds, which About and Who-are-we need.
hero-check.js passes unchanged.

Amends the spec, which called for an alias block in hero.css - that leaves
an ID-specificity selector able to silently beat anything later added to
.v2-btn."
```

---

## Task 3: About markup

**Files:**
- Modify: `index.html` (replace the `.block-layout` subtree of `#BCClZ9bf3`)

The three existing `.layout-element` wrappers carry inline `--grid-row` / `--grid-column` positioning on a 7-row grid and are replaced wholesale. The `<section id="BCClZ9bf3">` and its `.block-background` (flat `rgb(0, 42, 65)`) are **not** touched.

- [ ] **Step 1: Replace the layout subtree**

Inside `<section id="BCClZ9bf3">`, replace the entire `<div class="block-layout block-layout--layout" style="...">` element — opening tag, all three `.layout-element` children, closing tag — with:

```html
<div class="block-layout block-layout--layout about-layout"><div class="about-stack"><p class="about-eyebrow"><span class="about-rule"></span>ABOUT UGCC</p><h2 class="about-statement">A multidisciplinary contractor delivering engineering projects across the Middle East.</h2><p class="about-sub">Quality control, planning and project management held to one standard &mdash; in Kuwait, the GCC and internationally.</p><a class="v2-btn v2-btn--primary" href="/about-contractor-kuwait">Read More</a></div></div>
```

Notes:
- The builder content IDs (`UhPwLW1iU`, `P1oDhoQzR`, `DnAaSQBPM`) are dropped. Nothing in the repo references them — verified by grep across `*.css`, `*.js` and `*.mjs`.
- The heading becomes an `<h2>`; it was an `<h3>` with an inline `color: rgb(255,255,255)` and inline font-size custom properties. CSS now owns colour and size.
- The `Read More` href `/about-contractor-kuwait` is preserved verbatim.
- The statement is new copy, approved during brainstorming. The old heading was the literal label `ABOUT / UNITED GULF CONSTRUCTION COMPANY`.

- [ ] **Step 2: Verify the page still parses**

Reload. Expect the About content stacked and unstyled inside a still-726px navy section — correct at this stage; Task 4 adds the layout.

Run `tools/home-check.js`. Expected now passing: nothing new yet, because `one h1, and both new sections use h2` also requires `.wr-title`, which does not exist until Task 5. `About fits in 600px` still fails at 726px.

Confirm in the console that `document.querySelector('#BCClZ9bf3 .about-statement').tagName` returns `'H2'`.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat(about): clean markup, statement heading in place of the label

Replaces three builder layout wrappers with an eyebrow, an h2 statement, a
supporting line and a .v2-btn. The old heading was the literal string
'ABOUT / UNITED GULF CONSTRUCTION COMPANY', which is a label rather than a
statement, and it was an h3 on a page with no h2 at all."
```

---

## Task 4: About layout

**Files:**
- Modify: `assets/css/sections.css` (append)

- [ ] **Step 1: Append the About layout**

Add to the end of `assets/css/sections.css`:

```css
/* ==========================================================================
   About — #BCClZ9bf3
   ========================================================================== */

#BCClZ9bf3 {
  min-height: clamp(480px, 62svh, 600px);
  display: flex;
  padding: 0 !important;
}

/* The builder sets display:grid plus an inline --block-min-height of 726px
   on .block-layout. Both have to go, or the section cannot shrink. */
#BCClZ9bf3 .about-layout {
  display: flex !important;
  align-items: center;
  min-height: 0 !important;
  width: min(1224px, 100% - 64px);
  margin-inline: auto;
}

#BCClZ9bf3 .about-stack {
  max-width: 720px;
}

/* Deliberately the same treatment as .hero-eyebrow, so the two sections
   rhyme. --v2-red-text is the lightened salmon: correct here because the
   ground is navy. */
#BCClZ9bf3 .about-eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 20px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .16em;
  color: var(--v2-red-text);
}

#BCClZ9bf3 .about-rule {
  flex: none;
  width: 26px;
  height: 1px;
  background: var(--v2-red-text);
}

#BCClZ9bf3 .about-statement {
  margin: 0;
  font-size: clamp(28px, 3.4vw, 46px);
  line-height: 1.15;
  color: #fff;
}

#BCClZ9bf3 .about-sub {
  margin: 20px 0 0;
  max-width: 46ch;
  font-size: 16px;
  line-height: 1.7;
  color: rgba(255, 255, 255, .66);
}

#BCClZ9bf3 .v2-btn {
  margin-top: 30px;
}

/* 920px, not 768px: the builder's own breakpoint, and where the header swaps
   to its mobile layout. Matching it avoids a dead band. */
@media (max-width: 920px) {
  #BCClZ9bf3 {
    min-height: clamp(400px, 70svh, 520px);
  }

  #BCClZ9bf3 .about-layout {
    width: calc(100% - 32px);
  }

  #BCClZ9bf3 .about-statement {
    font-size: clamp(26px, 7vw, 34px);
  }

  #BCClZ9bf3 .about-sub {
    font-size: 15px;
  }

  #BCClZ9bf3 .v2-btn {
    display: block;
    text-align: center;
  }
}
```

- [ ] **Step 2: Run `tools/home-check.js`**

Expected now passing: `viewport is exactly 1280x720`, `About fits in 600px`.

If `About fits in 600px` still fails, read the reported height. A value near 726 means the inline `--block-min-height` is still winning — confirm `min-height: 0 !important` is on `.about-layout`, not on the section.

- [ ] **Step 3: Visual check**

Reload and look at the section. Expected: statement left-aligned, its left edge flush with the left edge of the hero's `ROADS AND BRIDGES` column above it. Red rule and eyebrow above the statement, supporting line and white pill below.

- [ ] **Step 4: Commit**

```bash
git add assets/css/sections.css
git commit -m "feat(about): full-bleed statement layout, 726px down to 600px

Left-aligned in the same min(1224px, 100% - 64px) column as the hero, so the
statement's left edge lines up with the hero service strip directly above it.
Overrides the builder's inline --block-min-height of 726px, which otherwise
pins the section open regardless of content."
```

---

## Task 5: Who-are-we markup

**Files:**
- Modify: `index.html` (replace the `.block-layout` subtree of `#u7vIc0iRh`)

This is the 46-row grid. Its `.layout-element` children are positioned by inline `--grid-row` and their DOM order does not match their visual order — the intro paragraph is first in the DOM but appears mid-section, `WHO ARE WE` is ninth, and `Explore More` sits between services 03 and 04. The whole subtree is replaced. The `<section id="u7vIc0iRh">` and its fixed `.block-background` image are **not** touched.

- [ ] **Step 1: Replace the layout subtree**

Inside `<section id="u7vIc0iRh">`, replace the entire `<div class="block-layout block-layout--layout" style="...">` element — opening tag, all children, closing tag — with:

```html
<div class="block-layout block-layout--layout wr-layout"><header class="wr-head"><div class="wr-head__text"><p class="wr-eyebrow"><span class="wr-rule"></span>WHO ARE WE</p><h2 class="wr-title">Seven disciplines, one contractor</h2><p class="wr-intro">Technical excellence and innovative solutions across complex infrastructure and building projects.</p></div><a class="v2-btn v2-btn--dark" href="/business-lines-construction-services-kuwait">Explore More</a></header><nav class="wr-list" aria-label="Business lines"><a class="wr-row" href="/roads-and-bridges-contractor-kuwait"><span class="wr-num">01</span><span class="wr-name">ROADS AND BRIDGES</span><span class="wr-desc">Highways, complex bridges, viaducts, tunnels and related infrastructure</span><span class="wr-arrow" aria-hidden="true">&rarr;</span></a><a class="wr-row" href="/civil-infrastructure-kuwait"><span class="wr-num">02</span><span class="wr-name">CIVIL INFRASTRUCTURE</span><span class="wr-desc">Design and delivery of large-scale civil infrastructure projects</span><span class="wr-arrow" aria-hidden="true">&rarr;</span></a><a class="wr-row" href="/building-construction-kuwait"><span class="wr-num">03</span><span class="wr-name">BUILDING CONSTRUCTION</span><span class="wr-desc">Housing, schools, universities, warehouses and residential complexes</span><span class="wr-arrow" aria-hidden="true">&rarr;</span></a><a class="wr-row" href="/oil-and-gas-construction-kuwait"><span class="wr-num">04</span><span class="wr-name">OIL AND GAS</span><span class="wr-desc">Plants, pipelines and facilities for the oil and gas industry</span><span class="wr-arrow" aria-hidden="true">&rarr;</span></a><a class="wr-row" href="/water-treatment-plant-kuwait"><span class="wr-num">05</span><span class="wr-name">WATER MANAGEMENT</span><span class="wr-desc">Water and wastewater treatment and management projects</span><span class="wr-arrow" aria-hidden="true">&rarr;</span></a><a class="wr-row" href="/electro-mechanical-contractor-kuwait"><span class="wr-num">06</span><span class="wr-name">ELECTRO-MECHANICAL</span><span class="wr-desc">Electro-mechanical works across industrial and building projects</span><span class="wr-arrow" aria-hidden="true">&rarr;</span></a><a class="wr-row" href="/micro-tunneling-kuwait"><span class="wr-num">07</span><span class="wr-name">MICRO-TUNNELING</span><span class="wr-desc">Trenchless pipeline installation, delivered internationally</span><span class="wr-arrow" aria-hidden="true">&rarr;</span></a></nav></div>
```

Notes:
- All seven hrefs are the originals, verbatim. They are the only thing in this subtree that must not be improvised.
- Each row is a single `<a>`, so its accessible name reads "01 ROADS AND BRIDGES Highways, complex bridges…". No `aria-label` needed. The arrow is `aria-hidden` so it does not add "right arrow" to that name.
- Descriptions are the approved rewrites. Three of the originals opened with "United Gulf Construction Company", which reads badly when seven are stacked.
- Builder content IDs are dropped; nothing references them.

- [ ] **Step 2: Verify the page still parses**

Reload. Expect seven unstyled links stacked vertically — correct at this stage.

Run `tools/home-check.js`. Expected now passing: `viewport`, `About fits in 600px`, `seven services in order, correct names and hrefs`, `every service row carries a description`, `one h1, and both new sections use h2`, `section buttons match the hero button`.

Still failing: `Who-are-we is under 1000px` (no layout yet), `row hover and focus-visible are one rule`, `reveal is opt-in`, `who-are-we uses the light-ground red`.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat(who-are-we): seven services as a semantic index

Replaces a 46-row hand-tuned builder grid whose DOM order did not match its
visual order - the intro paragraph was first in the DOM but appeared
mid-section, WHO ARE WE was ninth, and Explore More sat between services 03
and 04. Screen readers got that order, not the visual one.

Each row is now one anchor wrapping numeral, name and description, so the
whole row is the target and the accessible name is complete. All seven
original hrefs preserved. Descriptions rewritten: three of them opened with
the full company name, which reads badly stacked seven deep."
```

---

## Task 6: Who-are-we layout

**Files:**
- Modify: `assets/css/sections.css` (append)
- Modify: `docs/superpowers/specs/2026-07-19-about-whoarewe-design.md` (one line)

- [ ] **Step 1: Append the Who-are-we layout**

Add to the end of `assets/css/sections.css`:

```css
/* ==========================================================================
   Who are we — #u7vIc0iRh
   ========================================================================== */

#u7vIc0iRh {
  padding: 0 !important;
}

#u7vIc0iRh .wr-layout {
  display: block !important;
  min-height: 0 !important;
  width: min(1224px, 100% - 64px);
  margin-inline: auto;
  padding-block: 88px;
}

#u7vIc0iRh .wr-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 40px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(0, 42, 65, .22);
}

#u7vIc0iRh .wr-head__text {
  max-width: 520px;
}

/* --v2-red, NOT --v2-red-text. The salmon variant used by the hero and
   About is tuned for dark video; on this near-white ground it computes to
   roughly 2.9:1 and fails. See home-check.js. */
#u7vIc0iRh .wr-eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .16em;
  color: var(--v2-red);
}

#u7vIc0iRh .wr-rule {
  flex: none;
  width: 26px;
  height: 1px;
  background: var(--v2-red);
}

#u7vIc0iRh .wr-title {
  margin: 14px 0 0;
  font-size: clamp(22px, 2.2vw, 32px);
  line-height: 1.25;
  color: var(--v2-navy);
}

#u7vIc0iRh .wr-intro {
  margin: 12px 0 0;
  font-size: 15px;
  line-height: 1.7;
  color: rgba(0, 42, 65, .68);
}

#u7vIc0iRh .wr-row {
  display: grid;
  grid-template-columns: 28px 200px 1fr 24px;
  align-items: baseline;
  gap: 24px;
  padding: 18px 0;
  border-bottom: .5px solid rgba(0, 42, 65, .16);
  text-decoration: none;
  /* Declared at zero width so the hover state transitions rather than
     snapping, and so the red edge never affects layout. A border-left
     would shift every row by 2px on hover. */
  box-shadow: inset 0 0 0 var(--v2-red);
  transition:
    background-color .2s var(--v2-ease-out-quart),
    box-shadow .2s var(--v2-ease-out-quart);
}

#u7vIc0iRh .wr-num {
  font-size: 13px;
  color: rgba(0, 42, 65, .35);
  transition: color .2s var(--v2-ease-out-quart);
}

#u7vIc0iRh .wr-name {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: .04em;
  color: var(--v2-navy);
}

#u7vIc0iRh .wr-desc {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(0, 42, 65, .62);
}

#u7vIc0iRh .wr-arrow {
  justify-self: end;
  font-size: 15px;
  color: rgba(0, 42, 65, .28);
  transition:
    color .2s var(--v2-ease-out-quart),
    transform .2s var(--v2-ease-out-quart);
}

/* One rule, both states. Keyboard users get exactly what mouse users get,
   and the two cannot drift apart in a later edit. home-check.js asserts
   that this rule exists with both selectors on it. */
#u7vIc0iRh .wr-row:hover,
#u7vIc0iRh .wr-row:focus-visible {
  background-color: rgba(0, 42, 65, .045);
  box-shadow: inset 2px 0 0 var(--v2-red);
  outline: none;
}

#u7vIc0iRh .wr-row:hover .wr-num,
#u7vIc0iRh .wr-row:focus-visible .wr-num,
#u7vIc0iRh .wr-row:hover .wr-arrow,
#u7vIc0iRh .wr-row:focus-visible .wr-arrow {
  color: var(--v2-red);
}

#u7vIc0iRh .wr-row:hover .wr-arrow,
#u7vIc0iRh .wr-row:focus-visible .wr-arrow {
  transform: translateX(4px);
}

/* The designed focus state is a tint plus a red edge, both of which forced
   colours discard. Put the outline back when that is the case. */
@media (forced-colors: active) {
  #u7vIc0iRh .wr-row:focus-visible {
    outline: 2px solid CanvasText;
  }
}

@media (max-width: 920px) {
  #u7vIc0iRh .wr-layout {
    width: calc(100% - 32px);
    padding-block: 64px;
  }

  #u7vIc0iRh .wr-head {
    display: block;
  }

  #u7vIc0iRh .wr-head .v2-btn {
    display: block;
    margin-top: 24px;
    text-align: center;
  }

  /* Two columns: numeral, then name and description stacked beside it.
     Both need an explicit column or the description drops under the
     numeral. Descriptions stay visible - unlike the hero strip, which
     hides them, this section exists to carry them. */
  #u7vIc0iRh .wr-row {
    grid-template-columns: 28px 1fr;
    gap: 6px 16px;
  }

  #u7vIc0iRh .wr-name { grid-column: 2; }
  #u7vIc0iRh .wr-desc { grid-column: 2; }
  #u7vIc0iRh .wr-arrow { display: none; }
}
```

- [ ] **Step 2: Amend the spec's hover-bleed line**

The spec says the hover tint bleeds "to the full column width via negative inline margin + matching padding". Implemented that way, the row dividers extend 20px wider on each side than the header rule above them, which reads as a misalignment bug rather than a design. The implementation tints the row box exactly instead, keeping every horizontal rule in the section on the same two edges.

In `docs/superpowers/specs/2026-07-19-about-whoarewe-design.md`, replace:

```
- ground tints to `rgba(0, 42, 65, .045)`, bleeding to the full column width via
  negative inline margin + matching padding
```

with:

```
- ground tints to `rgba(0, 42, 65, .045)` across the row box. It does not bleed
  past the column: the row dividers and the header rule must share the same two
  edges, or the section reads as misaligned.
```

- [ ] **Step 3: Run `tools/home-check.js`**

Expected now passing: everything except `reveal is opt-in, not opt-out`, which needs Task 7. That is `9 passed, 1 failed`.

The `reveal` check may pass vacuously here — there are no hiding rules yet, so nothing is hidden. That is fine; Task 7 is what makes it meaningful.

- [ ] **Step 4: Visual and keyboard check**

Reload. Confirm:
- Section height is well under 1000px (the check reports it).
- Hovering a row tints it, turns the numeral and arrow red, shows a red left edge, and nudges the arrow right. Nothing shifts horizontally.
- Tab into the list. Each row shows the *same* state on focus. Focus does not skip any row.

- [ ] **Step 5: Commit**

```bash
git add assets/css/sections.css docs/superpowers/specs/2026-07-19-about-whoarewe-design.md
git commit -m "feat(who-are-we): editorial index layout, 1394px down to ~860px

Seven rows on hairline dividers with the whole row as the target. Hover and
focus-visible are one rule, so the keyboard state is the designed state
rather than a browser default, and a forced-colors fallback restores an
outline where the tint and red edge are discarded.

The red here is --v2-red, not the --v2-red-text used by the hero and About:
that salmon is tuned for dark video and computes to about 2.9:1 on this
near-white ground.

Amends the spec's hover-bleed line - bleeding the tint past the column left
the row dividers misaligned with the header rule."
```

---

## Task 7: Scroll reveal

**Files:**
- Create: `assets/js/sections.js`
- Modify: `assets/css/sections.css` (append)
- Modify: `index.html` (one `<script>` tag)

- [ ] **Step 1: Create `assets/js/sections.js`**

```js
/* UGCC homepage section reveals. Dependency-free, ES5.

   Gated on .hero-motion, which hero.js adds to <html> only when the user has
   NOT requested reduced motion. So the reduced-motion path is static by
   construction rather than by override.

   This file also adds .v2-reveal, and the hiding rules in sections.css are
   scoped to it. That makes the reveal opt-IN: if this script fails to load,
   or IntersectionObserver is unavailable, nothing is ever set to opacity 0
   and the content is simply visible. The alternative - hiding in CSS and
   revealing in JS - fails to a blank page. */
(function () {
  'use strict';

  var root = document.documentElement;
  if (!root.classList.contains('hero-motion')) return;
  if (!('IntersectionObserver' in window)) return;

  var targets = [];

  var about = document.querySelector('#BCClZ9bf3 .about-stack');
  if (about) targets.push(about);

  var head = document.querySelector('#u7vIc0iRh .wr-head');
  if (head) targets.push(head);

  var rows = document.querySelectorAll('#u7vIc0iRh .wr-row');
  Array.prototype.forEach.call(rows, function (row, i) {
    /* Read by the animation-delay rule in sections.css. Set inline rather
       than in CSS because the stagger index is positional. */
    row.style.setProperty('--i', i);
    targets.push(row);
  });

  if (!targets.length) return;

  root.classList.add('v2-reveal');

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.2 });

  targets.forEach(function (t) { io.observe(t); });
}());
```

- [ ] **Step 2: Append the reveal rules to `assets/css/sections.css`**

```css
/* ==========================================================================
   Reveal — both sections.
   Doubly gated: .hero-motion (set by hero.js when reduced motion is NOT
   requested) AND .v2-reveal (set by sections.js once it has targets). If
   either is missing nothing is hidden, so a script failure degrades to
   static content rather than a blank section.
   hero-fade-up is defined in hero.css; both files always load together.
   ========================================================================== */

.hero-motion.v2-reveal #BCClZ9bf3 .about-stack,
.hero-motion.v2-reveal #u7vIc0iRh .wr-head,
.hero-motion.v2-reveal #u7vIc0iRh .wr-row {
  opacity: 0;
}

.hero-motion.v2-reveal #BCClZ9bf3 .about-stack.is-in,
.hero-motion.v2-reveal #u7vIc0iRh .wr-head.is-in,
.hero-motion.v2-reveal #u7vIc0iRh .wr-row.is-in {
  animation: hero-fade-up .8s var(--v2-ease-out-expo) both;
}

.hero-motion.v2-reveal #u7vIc0iRh .wr-row.is-in {
  animation-delay: calc(var(--i, 0) * 60ms);
}
```

- [ ] **Step 3: Load the script**

In `index.html`, find:

```html
<script defer src="/assets/js/hero.js?v=1"></script>
```

Replace with:

```html
<script defer src="/assets/js/hero.js?v=1"></script><script defer src="/assets/js/sections.js?v=1"></script>
```

Order matters: both are `defer`, so they execute in document order, and `sections.js` reads the `.hero-motion` class that `hero.js` sets.

Bump the stylesheet cache-buster in the same edit — `sections.css?v=1` becomes `sections.css?v=2`.

- [ ] **Step 4: Amend the spec's motion section**

The spec gates the reveal on `.hero-motion` alone, and its verification item 9 asserts opacity against that class. That gating hides content in CSS and reveals it in JS, so a `sections.js` that fails to load leaves two sections permanently invisible. The second `.v2-reveal` gate inverts the failure mode.

In `docs/superpowers/specs/2026-07-19-about-whoarewe-design.md`, replace:

```
If `.hero-motion` is absent, `sections.js` does not observe at all and every
element is at its final state from first paint.
```

with:

```
The hiding rules are gated on `.hero-motion` **and** `.v2-reveal`, the latter set
by `sections.js` itself once it has targets to observe. So the reveal is opt-in:
if `.hero-motion` is absent, or `sections.js` fails to load, or
`IntersectionObserver` is missing, nothing is ever set to `opacity: 0` and every
element is at its final state from first paint. Hiding in CSS and revealing in JS
would fail to a blank section instead.
```

And in the Verification list, replace item 9:

```
9. With `.hero-motion` absent, every `.wr-row` computes `opacity: 1`.
```

with:

```
9. With `.v2-reveal` removed from `<html>`, every `.wr-row` computes
   `opacity: 1` — the reveal must be opt-in.
```

- [ ] **Step 5: Run `tools/home-check.js`**

Expected: `10 passed, 0 failed`.

If `reveal is opt-in, not opt-out` fails, the hiding rules are not scoped to `.v2-reveal` — check for a stray `.hero-motion #…` selector without it.

- [ ] **Step 6: Verify both motion branches**

With normal motion settings: reload and scroll. About's stack fades up as it enters; the Who-are-we header fades, then the seven rows stagger 60ms apart.

Then enable reduced motion (macOS: System Settings → Accessibility → Display → Reduce motion) and reload. Expected: everything visible at final position on first paint, no animation. In the console, `document.documentElement.classList.contains('v2-reveal')` returns `false`.

Also run `tools/hero-check.js` under reduced motion — its `reduced motion disables hero animation` check exercises the same gate.

- [ ] **Step 7: Commit**

```bash
git add assets/js/sections.js assets/css/sections.css index.html docs/superpowers/specs/2026-07-19-about-whoarewe-design.md
git commit -m "feat(sections): scroll reveal for About and the service index

Reuses the hero's .hero-motion gate, so reduced motion is static by
construction. The hiding rules are additionally scoped to .v2-reveal, which
sections.js sets - making the reveal opt-in, so a script that fails to load
degrades to visible content rather than a blank section.

Amends the spec, which gated on .hero-motion alone and so failed to a blank
section rather than a static one."
```

---

## Task 8: Full verification sweep

**Files:**
- Modify: whatever Steps 1-7 surface

- [ ] **Step 1: Both check scripts at 1280×720**

Run `tools/home-check.js` — expect `10 passed, 0 failed`.
Run `tools/hero-check.js` — expect the same result it gave before this branch's work started. The button extraction in Task 2 is the only thing that could have moved it.

- [ ] **Step 2: 375px**

Resize to 375×812. Confirm:
- About: statement wraps without overflow, button is full-width and centred, section does not exceed the viewport height awkwardly.
- Who-are-we: each row is numeral on the left with name and description stacked beside it, arrow hidden, descriptions present and readable.
- No horizontal scrollbar on the page at any point.

- [ ] **Step 3: Contrast of `.wr-desc`**

`.wr-desc` is `rgba(0, 42, 65, .62)` over the section's fixed white-wall background image. Sample the lightest region of that image behind the list and confirm the composited text clears 4.5:1. If it does not, raise the alpha to `.72` and re-check; do not change the hue.

- [ ] **Step 4: Chat widget collision**

`#glass-ai-widget-host` is fixed bottom-right at `z-index: 2147483647`. Scroll so the Who-are-we `Explore More` button and then the last row (`07 MICRO-TUNNELING`) sit in the bottom-right corner. Confirm neither is covered. The hero needed a 76px reservation below 1400px for exactly this reason; if this section needs one too, add it in `sections.css` with the same rationale in a comment.

- [ ] **Step 5: Keyboard**

Tab from the hero through both new sections. Confirm: About's `Read More` shows a focus ring; all seven rows show the designed focus state; `Explore More` shows a focus ring; focus order matches visual order.

- [ ] **Step 6: Console**

Reload with the console open. Expected: no JS errors, no 404s for `sections.css` or `sections.js`.

- [ ] **Step 7: Commit any fixes**

If Steps 1-6 surface defects, fix and commit each individually with a message naming the defect. If everything passes, no commit is needed.

- [ ] **Step 8: Report to the user**

Summarise: what changed, what both check scripts report, the measured heights of both sections before and after, and anything deferred or amended. Do **not** push and do **not** merge to `master`.

---

## Deferred

Recorded in the spec, out of scope here:

- Adopting `.v2-btn` on the remaining 66 pages; their builder `.grid-button` elements are untouched.
- Option C from brainstorming: a sticky image panel beside the index that swaps to the hovered service. Needs a seventh division photo — `assets/img/v2/` has `div-roads`, `div-civil`, `div-building`, `div-electro`, `div-micro` and `div-water`, but no oil and gas image. The row markup is designed so this can be layered on without restructuring it.

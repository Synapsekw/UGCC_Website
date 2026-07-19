# Hero Recomposition and Nav Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recompose the UGCC homepage hero so the whole composition fits one viewport with the three service columns above the fold, and modernize the site-wide header with a condensing frosted-glass scrolled state.

**Architecture:** Purely additive layers on a buildless static site. Nav changes go into the existing `assets/css/v2.css` (loaded by all 67 pages). Hero changes go into new `assets/css/hero.css` and `assets/js/hero.js`, loaded only by `index.html`. The hero's builder-generated layout children are replaced wholesale with clean markup rather than patched, because they carry overlapping inline `--grid-row` positioning that is hostile to incremental edits.

**Tech Stack:** Plain HTML, CSS, vanilla ES5-compatible JS. No build step, no bundler, no dependencies. Verification via a dependency-free browser-console assertion script.

**Spec:** `docs/superpowers/specs/2026-07-19-hero-recompose-design.md`

**Branch:** `hero-recompose`. Do not push. Do not merge to `master`.

---

## Why there are no unit tests

This repo has no frontend test infrastructure and no `package.json`. Its only tests are `tests/chat.test.mjs` (chatbot) and `tools/knowledge/test_extract.py` (corpus extraction). Adding Playwright would introduce `node_modules` to a site whose entire deployment model is copying files onto shared hosting.

Instead, Task 1 builds `tools/hero-check.js`: a dependency-free script that asserts the spec's verification list against the live DOM. It runs in any browser console or via automation. It is written first, must fail first, and must pass at the end. That is the TDD loop for this work.

---

## File structure

| File | Responsibility |
|---|---|
| `tools/hero-check.js` | New. Layout invariant assertions. Zero dependencies. |
| `assets/css/v2.css` | Modify. Red token correction; nav resting + scrolled states. Affects all 67 pages. |
| `assets/css/hero.css` | New. Hero layout, scrim, stack, service strip, buttons. Homepage only. |
| `assets/js/hero.js` | New. Split Text and Blur Text ports, reveal sequencing. Homepage only. |
| `index.html` | Modify. Replace hero layout children; add two `<link>`/`<script>` tags. |

---

## Task 1: Layout assertion harness

**Files:**
- Create: `tools/hero-check.js`

> **Amended after code review.** The script below is the original draft. Code
> quality review found several false-pass paths in it — no scroll/viewport
> precondition, zero-size rects counting as above-the-fold, only one of the
> `<h1>`'s two inline colours detected, and `textContent` asserted where the
> accessible name was meant. These were fixed in a follow-up commit before any
> other task ran. **The committed `tools/hero-check.js` is the source of truth,
> not this block.** Read the file, not the plan, when reasoning about what is
> verified.

- [ ] **Step 1: Write the assertion script**

Create `tools/hero-check.js`:

```js
/* UGCC hero layout checks. Dependency-free.
   Usage: paste into the browser console on the homepage, or evaluate via
   automation. Returns {passed, failed, results}. Resize to 1280x720 first. */
(function () {
  'use strict';

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

  var SERVICE_IDS = ['z5y7PA', 'zGp0a1', 'zBf9dg'];
  var vh = window.innerHeight;

  check('all three service headings are above the fold', function () {
    var bad = [];
    SERVICE_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) { bad.push(id + ' missing'); return; }
      var b = el.getBoundingClientRect().bottom;
      if (b > vh) bad.push(id + ' bottom=' + Math.round(b) + ' > vh=' + vh);
    });
    return { ok: bad.length === 0, detail: bad.join('; ') };
  });

  check('hero fits the viewport', function () {
    var hero = document.getElementById('aCqA2TkE7');
    var h = hero.getBoundingClientRect().height;
    return { ok: h <= vh + 1, detail: 'hero height=' + Math.round(h) + ' vh=' + vh };
  });

  check('h1 accessible name is exactly WE BUILD BETTER', function () {
    var h1 = document.querySelector('#aCqA2TkE7 h1');
    if (!h1) return { ok: false, detail: 'no h1 in hero' };
    var name = (h1.textContent || '').replace(/\s+/g, ' ').trim();
    return { ok: name === 'WE BUILD BETTER', detail: 'got "' + name + '"' };
  });

  check('eyebrow exists and is not pure red', function () {
    var el = document.querySelector('#aCqA2TkE7 .hero-eyebrow');
    if (!el) return { ok: false, detail: 'no .hero-eyebrow' };
    var c = getComputedStyle(el).color;
    return { ok: c !== 'rgb(255, 0, 0)', detail: 'color=' + c };
  });

  check('supporting line exists', function () {
    var el = document.querySelector('#aCqA2TkE7 .hero-sub');
    return { ok: !!el && el.textContent.trim().length > 20,
             detail: el ? 'len=' + el.textContent.trim().length : 'missing' };
  });

  check('two hero CTAs, second points at projects', function () {
    var btns = document.querySelectorAll('#aCqA2TkE7 .hero-cta a');
    if (btns.length !== 2) return { ok: false, detail: 'found ' + btns.length };
    var second = btns[1].getAttribute('href');
    return { ok: second === '/construction-projects-kuwait',
             detail: 'second href=' + second };
  });

  check('headline has no hardcoded inline colour', function () {
    var span = document.querySelector('#aCqA2TkE7 h1 span[style*="color"]');
    return { ok: !span, detail: span ? 'inline colour still present' : '' };
  });

  check('header condenses on scroll without content jump', function () {
    var header = document.querySelector('header.block-header');
    var hero = document.getElementById('aCqA2TkE7');
    var y0 = window.scrollY;
    document.documentElement.style.scrollBehavior = 'auto';

    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.classList.remove('v2-scrolled');
    var restH = header.getBoundingClientRect().height;
    var heroTop0 = hero.getBoundingClientRect().top;

    document.documentElement.classList.add('v2-scrolled');
    var condH = header.getBoundingClientRect().height;
    var heroTop1 = hero.getBoundingClientRect().top;

    document.documentElement.classList.remove('v2-scrolled');
    window.scrollTo({ top: y0, behavior: 'instant' });

    var shrank = condH < restH - 20;
    var jump = Math.abs(heroTop1 - heroTop0);
    return { ok: shrank && jump < 2,
             detail: 'rest=' + Math.round(restH) + ' condensed=' + Math.round(condH) +
                     ' heroJump=' + Math.round(jump) + 'px' };
  });

  check('contact link is a pill, not a plain link', function () {
    var last = document.querySelector(
      '.block-header-layout-desktop .block-header-item:last-child .item-content');
    if (!last) return { ok: false, detail: 'last nav item not found' };
    var r = parseFloat(getComputedStyle(last).borderTopLeftRadius);
    return { ok: r >= 12, detail: 'border-radius=' + r + 'px' };
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

- [ ] **Step 2: Run it against the current site to verify it fails**

Start the server if not running, then evaluate the script on `http://localhost:8747` at a 1280x720 viewport.

Expected: **FAIL** on at least these six —
`all three service headings are above the fold` (bottom≈923 > vh=720),
`hero fits the viewport` (height≈1073),
`eyebrow exists`, `supporting line exists`, `two hero CTAs`,
`headline has no hardcoded inline colour`, `contact link is a pill`,
`header condenses on scroll`.

If any of those PASS at this point, stop — the script is not measuring what it claims.

- [ ] **Step 3: Commit**

```bash
git add tools/hero-check.js
git commit -m "test: add dependency-free hero layout assertion script

Encodes the spec's verification list as browser-console assertions.
Currently fails on 8 of 9 checks against the existing hero."
```

---

## Task 2: Colour token correction

**Files:**
- Modify: `assets/css/v2.css:8-17` (the `:root` block)

- [ ] **Step 1: Update the token block**

In `assets/css/v2.css`, replace the `--v2-red` line and add a second stop. The `:root` block becomes:

```css
:root {
  --v2-navy: rgb(0, 42, 65);
  --v2-navy-92: rgba(0, 42, 65, .92);
  --v2-navy-70: rgba(0, 42, 65, .70);
  --v2-red: #d41c22;
  --v2-red-text: #e8635e;
  --v2-shadow-header: 0 10px 30px -12px rgba(0, 21, 33, .45);
  --v2-shadow-lift: 0 14px 28px -12px rgba(0, 21, 33, .35);
  --v2-ease-out-quart: cubic-bezier(.25, 1, .5, 1);
  --v2-ease-out-quint: cubic-bezier(.22, 1, .36, 1);
  --v2-ease-out-expo: cubic-bezier(.16, 1, .3, 1);
}
```

`--v2-red` is the logo's decoded core fill. `--v2-red-text` is the same hue lightened to clear AA for small text on dark (4.94:1 vs the scrim). Never use `--v2-red` for small text on dark.

Also update the header comment on line 5 from `signal red #d31225` to `signal red #d41c22 (logo-matched)`.

- [ ] **Step 2: Verify nothing regressed**

Reload `http://localhost:8747`. The active-nav underline and selection colour should look fractionally deeper. No layout change.

- [ ] **Step 3: Commit**

```bash
git add assets/css/v2.css
git commit -m "style: align accent red to the logo's actual #d41c22

Decoded from the logo PNG palette: hue 358, sat 0.77. Adds --v2-red-text
(#e8635e) because #d41c22 as small text on the hero scrim is 3.09:1 and
fails AA."
```

---

## Task 3: Nav resting state

**Files:**
- Modify: `assets/css/v2.css` (append a nav section)

Pure CSS. No markup edits, so this lands on all 67 pages at once.

- [ ] **Step 1: Append the nav resting styles**

Append to `assets/css/v2.css`:

```css
/* ==========================================================================
   Nav — resting state
   ========================================================================== */

/* !important is mandatory throughout this section. The builder sets --padding
   and friends as INLINE custom properties on the <header> element, and inline
   declarations beat external stylesheets. Without !important these rules parse
   fine, apply nothing, and the failure is silent.

   CORRECTION, found during implementation: --logo-width is a DEAD token in
   this export. main.css sizes the logo from per-build hashed properties baked
   inline on the element:
     .block-header-logo{width:var(--v6f401cb2);height:var(--v5ef47fbb)}
     @media screen and (width<=920px){...width:var(--v66b767ed)...}
   Nothing downstream reads --logo-width, so overriding it — with or without
   !important — changes nothing. Override the resolved properties instead.
   The hashed values are identical across all 67 pages, but we deliberately
   do not reference the hashed names. Source logo is 342x47, so 210px wide
   keeps the ratio at ~29px tall. Mobile keeps the builder's own size. */
@media (min-width: 921px) {
  .block-header .block-header-logo {
    width: 210px !important;
    height: 29px !important;
  }
}

.block-header-logo__image {
  transition: width .35s var(--v2-ease-out-quart);
}

/* Animated underline, wiping in from the left. */
.block-header .item-content::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -6px;
  height: 2px;
  background: var(--v2-red);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform .3s var(--v2-ease-out-quart);
}

.block-header .item-content:hover::after,
.block-header .item-content:focus-visible::after,
.block-header .item-content-wrapper--active .item-content::after {
  transform: scaleX(1);
}

/* Last nav item ("Contact us") promoted to an outlined pill.
   Targeted structurally so it needs no markup change on any page. */
.block-header .block-header-item:last-child .item-content {
  border: 1px solid rgba(255, 255, 255, .45);
  border-radius: 999px;
  padding: 9px 20px;
  transition:
    background-color .3s var(--v2-ease-out-quart),
    border-color .3s var(--v2-ease-out-quart),
    color .3s var(--v2-ease-out-quart);
}

.block-header .block-header-item:last-child .item-content:hover {
  background: #fff;
  border-color: #fff;
  color: var(--v2-navy);
}

/* The pill carries its own affordance; suppress the underline on it. */
.block-header .block-header-item:last-child .item-content::after {
  display: none;
}
```

- [ ] **Step 2: Verify on the homepage and two inner pages**

Reload and check `http://localhost:8747`, then `http://localhost:8747/about-contractor-kuwait/` and `http://localhost:8747/contact-us/`.

Expected: logo visibly smaller; underline wipes in on hover; "Contact us" is an outlined pill on every page. On `/contact-us/` the pill is also the active item — confirm it still reads as a pill and is not double-decorated.

Run `tools/hero-check.js`. Expected: `contact link is a pill` now PASSES. Everything else unchanged.

- [ ] **Step 3: Commit**

```bash
git add assets/css/v2.css
git commit -m "style(nav): smaller logo, wipe-in underline, contact pill

Contact pill targets .block-header-item:last-child so it applies to all 67
pages with no markup change."
```

---

## Task 4: Nav condensing frosted scrolled state

**Files:**
- Modify: `assets/css/v2.css:42-47` (the `.v2-scrolled .block-header` block) and append

**This is the task with known risk.** The builder uses `--header-height: 123px` in layout math. If condensing causes content to jump, fall back as described in Step 4 and report it — do not fight it.

- [ ] **Step 1: Replace the scrolled-state block**

Replace the existing `.v2-scrolled .block-header` rule in `assets/css/v2.css` with:

```css
.block-header {
  transition:
    background-color .35s var(--v2-ease-out-quart),
    box-shadow .35s var(--v2-ease-out-quart),
    padding .35s var(--v2-ease-out-quart),
    backdrop-filter .35s var(--v2-ease-out-quart);
}

.v2-scrolled .block-header {
  background-color: var(--v2-navy-70);
  -webkit-backdrop-filter: blur(22px) saturate(1.4);
  backdrop-filter: blur(22px) saturate(1.4);
  box-shadow: var(--v2-shadow-header);
  border-bottom: .5px solid rgba(255, 255, 255, .14);
}

/* Condense: 123px -> ~75px.
   Verified mechanism: .block-header-layout-desktop has
   `padding: var(--padding, 24px 0)` in main.css, and --padding is set as an
   INLINE custom property on <header> (38px 16px). Custom properties inherit,
   so overriding --padding on .block-header with !important cascades down and
   actually changes the height. Resting height is 38 + 47(logo) + 38 = 123px,
   which matches the measured value exactly.
   With the logo at 29px (see Task 3's direct override) and padding at 23px:
   23 + 29 + 23 = 75px. The harness requires condH < restH - 20, i.e. < 103.
   The logo deliberately does NOT shrink further here - one moving dimension
   reads as intentional, two reads as jitter.
   Breakpoint is 921px because that is the builder's own switch
   (`@media screen and (width<=920px)` in main.css), not the 768px this plan
   originally and wrongly assumed. */
@media (min-width: 921px) {
  .v2-scrolled .block-header {
    --padding-top: 23px !important;
    --padding-bottom: 23px !important;
    --padding: 23px 16px 23px 16px !important;
  }
}

/* Mobile (<=920px) keeps its 95px height. Shrinking it degrades the tap
   target. No rule needed - we simply do not override anything below 921px.
   Do NOT reintroduce a --logo-width override here: that token is inert for
   sizing in this export (see Task 3). */
```

The bottom hairline is load-bearing: at 70% opacity the header would otherwise dissolve into the light backgrounds used on inner pages.

- [ ] **Step 2: Verify the frosted effect and the condense**

Reload the homepage, scroll past 24px. Expected: header shrinks, logo scales down, footage visibly moves underneath rather than sitting behind a flat slab.

- [ ] **Step 3: Run the jump check**

Run `tools/hero-check.js`.

Expected: `header condenses on scroll without content jump` PASSES, reporting roughly `rest=123 condensed=76 heroJump=0px`.

- [ ] **Step 4: If the jump check fails, fall back**

If `heroJump` is 2px or more, the builder's layout math is coupled to header height. Remove the two `@media` blocks from Step 1, keeping only the frosted-glass changes (option 2 in the spec). Then:

```bash
git add assets/css/v2.css
git commit -m "style(nav): true frosted glass on scroll

Condensing was attempted and reverted: the builder couples layout to
--header-height and content jumped by Npx. Frost-only per the spec's
documented fallback."
```

Report the fallback to the user and skip Step 5.

- [ ] **Step 5: Commit**

```bash
git add assets/css/v2.css
git commit -m "style(nav): condensing frosted-glass header on scroll

123px -> 76px past 24px of scroll, navy at 70% with blur(22px) saturate(1.4).
The previous 92% opacity left nothing to blur through. Mobile height unchanged."
```

---

## Task 5: Hero scrim

**Files:**
- Create: `assets/css/hero.css`
- Modify: `index.html` (one `<link>` in `<head>`)

- [ ] **Step 1: Create the stylesheet with the scrim**

Create `assets/css/hero.css`:

```css
/* ==========================================================================
   UGCC homepage hero — recomposed.
   Loaded only by index.html, after v2.css.
   ========================================================================== */

/* Gradient scrim replaces the flat 70% black, which flattened the aerial
   footage into grey. Heavy at the edges, light through the middle. */
#aCqA2TkE7 .block-background__overlay {
  opacity: 1 !important;
  background: linear-gradient(
    to bottom,
    rgba(0, 17, 28, .82) 0%,
    rgba(0, 17, 28, .38) 30%,
    rgba(0, 17, 28, .32) 56%,
    rgba(0, 17, 28, .88) 100%
  ) !important;
}
```

- [ ] **Step 2: Link it from index.html**

In `index.html`, find the existing head link:

```html
<link rel="stylesheet" href="/assets/css/v2.css?v=4">
```

Insert immediately after it:

```html
<link rel="stylesheet" href="/assets/css/hero.css?v=1">
```

- [ ] **Step 3: Verify**

Reload. The interchange should be clearly legible through the middle of the frame while the top and bottom stay dark enough for text. The hero should read brighter than before, not darker.

- [ ] **Step 4: Commit**

```bash
git add assets/css/hero.css index.html
git commit -m "style(hero): gradient scrim in place of flat 70% black

The flat overlay flattened the aerial footage into grey. The gradient keeps
text legible at the edges while letting the middle of the frame breathe."
```

---

## Task 6: Hero markup

**Files:**
- Modify: `index.html` (replace the children of the hero's `.block-layout`)

The hero's eight existing children are builder wrappers carrying overlapping inline `--grid-row` values (`6/8` and `7/10` collide). They are replaced wholesale with clean markup. The `<section>`, the `.block-background` video, and the overlay are **not** touched.

- [ ] **Step 1: Replace the layout children**

Inside `<section id="aCqA2TkE7">`, replace the entire `<div class="block-layout block-layout--layout" ...>` element — opening tag, all eight children, closing tag — with:

```html
<div class="block-layout block-layout--layout hero-layout"><div class="hero-stack"><p class="hero-eyebrow">GRADE-I CONTRACTOR &middot; KUWAIT &amp; THE GCC</p><h1 class="hero-title">WE BUILD BETTER</h1><p class="hero-sub">Major infrastructure, buildings, roads, and oil and gas projects &mdash; 60+ delivered across Kuwait and the Gulf.</p><div class="hero-cta"><a class="hero-btn hero-btn--primary" href="/contact-us">Get in Touch</a><a class="hero-btn hero-btn--secondary" href="/construction-projects-kuwait">View Projects</a></div></div><div class="hero-services"><div class="hero-service"><p class="hero-service__name" id="z5y7PA">ROADS AND BRIDGES</p><p class="hero-service__desc" id="zEZmIA">Bridges, Highways and Roads Construction, Landscaping Services, and Roads Maintenance</p></div><div class="hero-service"><p class="hero-service__name" id="zGp0a1">CIVIL INFRASTRUCTURE</p><p class="hero-service__desc" id="zGqZ-o">Design and implementation of civil infrastructure.</p></div><div class="hero-service"><p class="hero-service__name" id="zBf9dg">BUILDING CONSTRUCTION</p><p class="hero-service__desc" id="zwB5a2">Residential Housing, Schools, Industrial Buildings, Warehouses and Commercial Complexes.</p></div></div></div>
```

Notes:
- The six original content IDs are preserved (`z5y7PA`, `zGp0a1`, `zBf9dg`, `zEZmIA`, `zGqZ-o`, `zwB5a2`) so `hero-check.js` and any external anchors keep working.
- The `<h1>` no longer wraps its text in a `<span style="color: rgb(255,255,255)">`, so CSS owns the colour.
- Copy is unchanged from the original for all six service strings.
- The supporting line makes only claims present in existing page metadata. It asserts nothing about company age.

- [ ] **Step 2: Verify the page still parses**

Reload. Expect unstyled-looking hero content stacked vertically — that is correct at this stage; Task 7 adds the layout.

Run `tools/hero-check.js`. Expected now PASSING: `h1 accessible name is exactly WE BUILD BETTER`, `supporting line exists`, `two hero CTAs, second points at projects`, `headline has no hardcoded inline colour`. Still failing: the two layout checks and `eyebrow exists and is not pure red` (no colour applied yet).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat(hero): clean hero markup with eyebrow, sub-line and second CTA

Replaces eight builder wrappers whose inline --grid-row values overlapped
(6/8 against 7/10). Content IDs preserved. Adds a View Projects secondary
CTA so the hero has a lower-commitment exit than the contact page."
```

---

## Task 7: Hero layout

**Files:**
- Modify: `assets/css/hero.css`

- [ ] **Step 1: Append the layout**

Append to `assets/css/hero.css`:

```css
/* ---------- section shell ---------- */
#aCqA2TkE7 {
  min-height: clamp(640px, 100svh, 860px);
  display: flex;
  padding: 0 !important;
}

#aCqA2TkE7 .hero-layout {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) !important;
  grid-template-rows: 1fr auto !important;
  gap: 0 !important;
  width: min(1224px, 100% - 64px);
  margin-inline: auto;
  padding-top: var(--header-height, 123px);
}

/* ---------- centred stack ---------- */
#aCqA2TkE7 .hero-stack {
  align-self: center;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-block: 40px;
}

#aCqA2TkE7 .hero-eyebrow {
  margin: 0 0 18px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .16em;
  color: var(--v2-red-text);
}

#aCqA2TkE7 .hero-title {
  margin: 0;
  color: #fff;
  line-height: 1.02;
}

#aCqA2TkE7 .hero-sub {
  margin: 20px 0 0;
  max-width: 540px;
  font-size: 17px;
  line-height: 1.6;
  color: rgba(255, 255, 255, .72);
}

/* ---------- CTAs ---------- */
#aCqA2TkE7 .hero-cta {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 14px;
  margin-top: 30px;
}

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

#aCqA2TkE7 .hero-btn--primary {
  background: #fff;
  color: #101010;
}

#aCqA2TkE7 .hero-btn--secondary {
  border-color: rgba(255, 255, 255, .5);
  color: #fff;
}

#aCqA2TkE7 .hero-btn--secondary:hover {
  background: rgba(255, 255, 255, .12);
  border-color: #fff;
}

#aCqA2TkE7 .hero-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--v2-shadow-lift);
}

#aCqA2TkE7 .hero-btn:active {
  transform: translateY(0);
}

/* ---------- service strip, pinned to the hero's bottom edge ---------- */
#aCqA2TkE7 .hero-services {
  align-self: end;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid rgba(255, 255, 255, .18);
  margin-bottom: 40px;
}

#aCqA2TkE7 .hero-service {
  padding: 20px 24px 0;
  border-right: 1px solid rgba(255, 255, 255, .14);
}

#aCqA2TkE7 .hero-service:first-child { padding-left: 0; }
#aCqA2TkE7 .hero-service:last-child { border-right: 0; padding-right: 0; }

#aCqA2TkE7 .hero-service__name {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: .04em;
  color: #fff;
}

#aCqA2TkE7 .hero-service__desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: rgba(255, 255, 255, .66);
}

/* ---------- mobile ----------
   920px, not 768px: this is the builder's own breakpoint
   (`@media screen and (width<=920px)` in main.css), and it is where the
   header swaps from its desktop layout to its mobile one. Using a different
   number here would leave a dead band where the header is mobile but the
   hero is still desktop. */
@media (max-width: 920px) {
  #aCqA2TkE7 {
    min-height: clamp(560px, 100svh, 900px);
  }

  #aCqA2TkE7 .hero-layout {
    width: calc(100% - 32px);
    padding-top: var(--header-height-mobile, 95px);
  }

  #aCqA2TkE7 .hero-sub { font-size: 15px; }

  #aCqA2TkE7 .hero-cta { flex-direction: column; align-self: stretch; }
  #aCqA2TkE7 .hero-btn { text-align: center; }

  #aCqA2TkE7 .hero-services {
    grid-template-columns: minmax(0, 1fr);
    margin-bottom: 28px;
  }

  #aCqA2TkE7 .hero-service {
    padding: 14px 0;
    border-right: 0;
    border-bottom: 1px solid rgba(255, 255, 255, .14);
  }

  #aCqA2TkE7 .hero-service:last-child { border-bottom: 0; }

  /* Descriptions were hidden on mobile in the original layout. Keep that. */
  #aCqA2TkE7 .hero-service__desc { display: none; }
}
```

`clamp(640px, 100svh, 860px)` uses `svh` so mobile browser chrome cannot push the service strip off-screen. The floor stops the composition crushing on short laptop windows; the ceiling stops it stretching absurdly on tall monitors.

- [ ] **Step 2: Run the full check**

Run `tools/hero-check.js` at 1280x720.

Expected: **9 passed, 0 failed.** In particular `all three service headings are above the fold` and `hero fits the viewport` now pass.

- [ ] **Step 3: Commit**

```bash
git add assets/css/hero.css
git commit -m "feat(hero): recomposed layout, service strip above the fold

Hero drops from 1073px to clamp(640px, 100svh, 860px). The three service
columns move from y=814 - never visible on a 720px viewport - into a divided
strip pinned to the hero's bottom edge."
```

---

## Task 8: Motion

**Files:**
- Create: `assets/js/hero.js`
- Modify: `index.html` (one `<script>` before `</body>`)
- Modify: `assets/css/hero.css` (append motion styles)

- [ ] **Step 1: Append the motion CSS**

Append to `assets/css/hero.css`:

```css
/* ==========================================================================
   Motion. Everything is opt-in via .hero-motion, which hero.js only adds
   when the user has not asked for reduced motion. Without that class the
   hero renders fully visible and static.
   ========================================================================== */

.hero-motion #aCqA2TkE7 .hero-eyebrow,
.hero-motion #aCqA2TkE7 .hero-sub,
.hero-motion #aCqA2TkE7 .hero-cta,
.hero-motion #aCqA2TkE7 .hero-service {
  opacity: 0;
}

.hero-motion #aCqA2TkE7 .hero-title .hero-word {
  display: inline-block;
  opacity: 0;
  transform: translateY(.5em);
}

.hero-motion #aCqA2TkE7 .hero-word.is-in {
  animation: hero-word-in .75s var(--v2-ease-out-expo) forwards;
}

.hero-motion #aCqA2TkE7 .hero-eyebrow.is-in {
  animation: hero-blur-in .7s var(--v2-ease-out-quart) forwards;
}

.hero-motion #aCqA2TkE7 .hero-sub.is-in,
.hero-motion #aCqA2TkE7 .hero-cta.is-in,
.hero-motion #aCqA2TkE7 .hero-service.is-in {
  animation: hero-fade-up .8s var(--v2-ease-out-expo) forwards;
}

@keyframes hero-word-in {
  from { opacity: 0; transform: translateY(.5em); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes hero-blur-in {
  from { opacity: 0; filter: blur(9px); }
  to   { opacity: 1; filter: blur(0); }
}

@keyframes hero-fade-up {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Shine sweep on the primary CTA. */
#aCqA2TkE7 .hero-btn--primary {
  position: relative;
  overflow: hidden;
}

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
  #aCqA2TkE7 .hero-btn--primary:hover::after {
    animation: hero-shine .8s var(--v2-ease-out-quart);
  }
}

@keyframes hero-shine {
  from { left: -60%; }
  to   { left: 120%; }
}
```

- [ ] **Step 2: Create the motion script**

Create `assets/js/hero.js`:

```js
/* UGCC hero motion — vanilla ports of the React Bits effects used in the
   spec (Split Text, Blur Text). No dependencies. Runs after v2.js. */
(function () {
  'use strict';

  var hero = document.getElementById('aCqA2TkE7');
  if (!hero) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.documentElement.classList.add('hero-motion');

  /* ---------- Split Text: wrap words, preserving the text node ----------
     Words, not characters. Character-level splitting on a headline this
     size reads as busy and costs more in screen-reader terms than it
     returns. The <h1> keeps its exact accessible name because we only
     wrap the existing words in spans, adding no new text. */
  var title = hero.querySelector('.hero-title');
  var words = [];
  if (title) {
    var source = title.textContent;
    var parts = source.split(/(\s+)/);
    title.textContent = '';
    parts.forEach(function (part) {
      if (/^\s+$/.test(part)) {
        title.appendChild(document.createTextNode(part));
        return;
      }
      var span = document.createElement('span');
      span.className = 'hero-word';
      span.textContent = part;
      title.appendChild(span);
      words.push(span);
    });
  }

  function reveal(el, delay) {
    if (!el) return;
    setTimeout(function () { el.classList.add('is-in'); }, delay);
  }

  /* Eyebrow first, then headline words on a 60ms stagger, then the
     supporting line and CTAs. */
  reveal(hero.querySelector('.hero-eyebrow'), 80);

  words.forEach(function (w, i) {
    reveal(w, 260 + i * 60);
  });

  var afterWords = 260 + words.length * 60;
  reveal(hero.querySelector('.hero-sub'), afterWords + 60);
  reveal(hero.querySelector('.hero-cta'), afterWords + 180);

  /* Service strip reveals on scroll into view, or immediately if it is
     already visible on load — which, after Task 7, it will be. */
  var services = [].slice.call(hero.querySelectorAll('.hero-service'));

  function revealServices() {
    services.forEach(function (s, i) { reveal(s, i * 110); });
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.disconnect();
        revealServices();
      });
    }, { threshold: .25 });
    if (services.length) io.observe(services[0]);
  } else {
    revealServices();
  }
})();
```

- [ ] **Step 3: Link the script from index.html**

In `index.html`, find:

```html
<script defer src="/assets/js/v2.js?v=3"></script>
```

Insert immediately after it:

```html
<script defer src="/assets/js/hero.js?v=1"></script>
```

- [ ] **Step 4: Verify motion, then verify reduced motion**

Reload. Expected: eyebrow blurs in, headline rises word by word, supporting line and buttons follow, service strip staggers in. Hover the primary CTA for the shine sweep.

Then emulate `prefers-reduced-motion: reduce` and hard-reload. Expected: **everything fully visible and correctly positioned, no animation.** The `hero-motion` class must be absent from `<html>`.

Run `tools/hero-check.js` in both states. Expected **9 passed, 0 failed** in both — particularly `h1 accessible name is exactly WE BUILD BETTER`, which proves the word-splitting did not corrupt the heading.

- [ ] **Step 5: Commit**

```bash
git add assets/js/hero.js assets/css/hero.css index.html
git commit -m "feat(hero): split-text and blur-in motion, vanilla React Bits ports

Words rather than characters, so the h1 accessible name survives intact.
All motion is gated behind .hero-motion, which is only added when the user
has not requested reduced motion - so the reduced-motion path is static by
construction rather than by override."
```

---

## Task 9: Full verification sweep

**Files:** none modified unless a defect is found.

- [ ] **Step 1: Desktop, 1280x720**

Run `tools/hero-check.js`. Expected: 9 passed, 0 failed.

Confirm by eye that the eyebrow, headline, supporting line, both CTAs, and all three service headings are visible without scrolling.

- [ ] **Step 2: Short window, 1280x640**

Resize to 1280x640 and re-run. Expected: 9 passed. This exercises the `clamp()` floor.

- [ ] **Step 3: Tall window, 1440x1000**

Resize and re-run. Expected: 9 passed, hero capped at 860px rather than stretching.

- [ ] **Step 4: Mobile, 375x812**

Resize. Expected: header still 95px; CTAs stack full-width; service names stack with dividers; service descriptions hidden, matching the original mobile behaviour.

- [ ] **Step 5: Inner pages**

Visit `/about-contractor-kuwait/`, `/contact-us/`, `/construction-projects-kuwait/`.

Expected on each: smaller logo, underline on hover, contact pill, condensing frosted header on scroll. Confirm the bottom hairline keeps the header distinct against these pages' light backgrounds. Confirm no hero styles leaked — `hero.css` is only linked from `index.html`.

**Content jump — this is the one that cannot be automated.** On the homepage the header overlays the hero, so nothing below it can move and any automated no-jump assertion passes by construction. Inner pages are where the header is in flow and a jump can actually happen. On each of the three pages above: note the vertical position of the first content element below the header, scroll past 24px to trigger the condense, and confirm it does not shift. If it moves, the fallback in Task 4 applies — revert the condensing and keep frost only.

`tools/hero-check.js` deliberately does NOT assert this. Four items are documented in that file as manual-only and all four are covered by this task: inner-page nav appearance, 375px mobile, keyboard focus visibility, and this content-jump check.

- [ ] **Step 6: Keyboard**

Tab through the page. Expected: visible focus ring on every nav link and both hero CTAs. The contact pill must show a focus ring distinct from its hover state.

- [ ] **Step 7: Console**

Check for JS errors on the homepage and one inner page. Expected: none.

- [ ] **Step 8: Commit any fixes**

If Steps 1-7 surface defects, fix and commit individually with a message naming the defect. If everything passes, no commit is needed.

- [ ] **Step 9: Report to the user**

Summarise: what changed, what the check script reports, whether the header condensed or fell back to frost-only, and anything deferred. Do **not** push and do **not** merge to `master`.

---

## Deferred

Recorded in the spec, out of scope here:

- Pure `rgb(255, 0, 0)` still present in the slideshow's inline `--navigationDotsColor` and `--navigationArrowsColor`.
- The slideshow section itself (`#zOl98u`).
- Absolute `og:url` and JSON-LD URLs, pending the real domain.

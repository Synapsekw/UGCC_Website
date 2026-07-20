# About-suite kit — usage contract for the five page rebuilds

Date: 2026-07-20. Branch: `V2`.
Stylesheet: `assets/css/about-suite.css` (sole owner: the kit session; page
agents write **markup only**).

Pages: `/about-contractor-kuwait`, `/credentials`, `/hse`, `/quality`, `/csr`.

This document is the complete markup contract. Every component below is
copy-pasteable. If you find yourself wanting to write CSS, stop — either a
variant already exists here, or the kit is wrong and needs an amendment, and
the kit session owns that file.

---

## 0. The `<link>` tag

Add **one** line to each of the five `<head>`s, immediately after the existing
`v2.css` link and **after nothing else**:

```html
<link rel="stylesheet" href="/assets/css/about-suite.css?v=3">
```

Resulting head order on all five pages:

```html
<link rel="stylesheet" href="/assets/css/fonts.css">
<link rel="stylesheet" href="/assets/css/main.css">
<link rel="stylesheet" href="/assets/css/custom.css">
<link rel="stylesheet" href="/assets/css/v2.css?v=4">
<link rel="stylesheet" href="/assets/css/about-suite.css?v=3">
<link rel="stylesheet" href="/assets/css/pages/<page>.css?v=1">
```

Each page also carries its own `assets/css/pages/<page>.css`, last. That file is
for rules with no kit equivalent only — if it restyles a kit component, the kit
is wrong and should be amended instead. Two of the five are comment-only, which
is the correct outcome, not a gap to fill.

**Order is load-bearing.** The accordion rules deliberately match the
specificity of the `.v2-acc*` rules they supersede and win on load order alone.
`about-suite.css` before `v2.css` gives you a working but visually wrong
accordion.

Cache-buster: currently `?v=2` (now v3: v2 added .as-btn, v3 fixed its specificity against .as-prose). If the kit session edits the stylesheet, the version is
bumped and **every one of the five pages must be updated in the same commit**.

### Scripts

```html
<script src="/assets/js/chat-widget.js?v=1" defer></script>
<script src="/assets/js/main.js" defer></script>
<script src="/assets/js/v2.js?v=3" defer></script>
<script src="/assets/js/about-suite.js?v=1" defer></script>
```

`v2.js` already drives the accordion — the kit restyles its class contract
rather than shipping a second script for it (§ accordion).

`about-suite.js` is the reveal driver, and **the reveal rules in §12 are inert
without it**. An earlier draft of this document said "no script changes"; that
was written before the file existed and was wrong. The reason a new file was
needed: `sections.js` queries two hardcoded homepage block ids and returns on
any other page, and it is gated on `.hero-motion`, which only `hero.js` adds —
and `hero.js` returns on its first line off the homepage. So neither gate class
could ever be set here. `about-suite.js` adds both against the same contract,
so no CSS changed.

Still do **not** add `hero.js` or `sections.js` to these pages.

The reveal is opt-in by construction: nothing is hidden until the script has
decided to observe, and a fail-safe drops the gate if the observer has not
delivered within 4s — so a page can never end up permanently blank.

---

## 1. `.as-cover` — the page cover

**This block is byte-identical on all five pages apart from three values.**
Copy it verbatim and substitute only `{{IMG}}`, `{{ALT}}`, `{{H1}}` and
optionally `{{LEDE}}`. Do not change the classes, the element order, the
attributes, or the nesting. Do not add an inline `style`.

```html
<section class="block block--desktop-first-visible block--mobile-first-visible as-cover" data-v-3ffce944>
  <img class="as-cover__media"
       src="{{IMG}}"
       alt="{{ALT}}"
       width="{{INTRINSIC_W}}" height="{{INTRINSIC_H}}"
       fetchpriority="high" decoding="async">
  <div class="as-cover__scrim" aria-hidden="true"></div>
  <div class="as-cover__inner">
    <h1 class="as-cover__title">{{H1}}</h1>
    <p class="as-cover__lede">{{LEDE}}</p>
  </div>
</section>
```

**`data-v-3ffce944` is load-bearing and was missing from the first version of
this template.** `main.css` reserves the header row with an *attribute*
selector:

```css
.block--desktop-first-visible[data-v-3ffce944],
.block[data-v-3ffce944]:first-child {
  padding-top: var(--header-height, 0);
  margin-top: calc(-1 * var(--header-height, 0));
}
```

Without the attribute that rule never matches, so `.as-cover`'s
`--header-height: 118px` override feeds nothing: the cover drops to `top:123px`
below a blank strip, total chrome+cover becomes 642px instead of 524px, and the
header's white nav text lands on white. Measured with the attribute present:
`padding-top: 118px`, `margin-top: -118px`, cover `top: 0`, height `524`.

`width`/`height` take **each image's own intrinsic pixel size**, not a fixed
`1920x1080` — the five heroes genuinely differ (about `1920x728`, credentials
`1920x1097`, hsse `1672x941`, quality `1920x1080`, csr `1920x1536`). A wrong
ratio here causes layout shift. This is the one attribute pair that legitimately
varies between the five covers; everything else is identical, and the *rendered*
box is 524px on all five at every breakpoint regardless.

### Required attributes

| Attribute | Rule |
|---|---|
| `class` on `<section>` | exactly the four classes shown. The two `block--*-first-visible` classes are half of what makes `main.css` reserve the header row. |
| `data-v-3ffce944` on `<section>` | required — the other half. `main.css`'s reservation rule is an attribute selector; without it the classes alone match nothing. See above. |
| `alt` on the image | **descriptive, never empty.** The cover photograph carries the page's subject. This fixes flag F-11 (all five heroes currently have no `alt` at all). |
| `width` / `height` | present, matching the file's intrinsic ratio, so nothing reflows before decode. |
| `fetchpriority="high"` | it is the LCP element on every page. |
| `aria-hidden="true"` on the scrim | it is decoration. |

### Per-page values

H1s are **short and upper-case** — one or two words, never a sentence. The
cover's box is fixed, so a long H1 only eats the scrim. As built:

| Page | `{{IMG}}` | `{{H1}}` | `{{LEDE}}` |
|---|---|---|---|
| `/about-contractor-kuwait` | `/assets/img/v2/hero-about.jpg` | `ABOUT` | A Kuwaiti contractor building transport, infrastructure, oil and gas, and water projects. |
| `/credentials` | `/assets/img/v2/hero-credentials.jpg` | `CREDENTIALS` | ISO certified for quality, environment and safety, and a Grade I contractor in Kuwait. |
| `/hse` | `/assets/img/v2/hero-hsse.jpg` | `HSSE` | Health, Safety, Security and Environment. |
| `/quality` | `/assets/img/v2/hero-quality.jpg` | `QUALITY` | ISO 9001 since 2004, and a testing laboratory certified to ISO 17025. |
| `/csr` | `/assets/img/v2/hero-csr.jpg` | `CSR` | The values, ethics and conduct that govern how UGCC does business. |

An earlier draft of this table gave title-case H1s and long sentence ledes;
the pages as built use the upper-case short form above, and that is the style
to keep.

> `/assets/img/v2/hero-about.jpg` already exists in the repo and is currently
> unused (flag F-14). Adopting it here is what finally aligns all five covers;
> About must **not** stay on the builder PNG + srcset.

The lede is optional. If a page has none, **delete the whole `<p>`** — do not
leave it empty. The cover's height does not change either way.

### Optional eyebrow

If a page needs a kicker above the H1:

```html
<div class="as-cover__inner">
  <p class="as-cover__eyebrow">Corporate governance</p>
  <h1 class="as-cover__title">{{H1}}</h1>
  <p class="as-cover__lede">{{LEDE}}</p>
</div>
```

Use it on at most one of the five, or the covers stop matching.

### The height contract

`height: 524px`, fixed, on every page and at every breakpoint.

- 524px is the figure all five builder heroes already declare as
  `--block-min-height`, so desktop is a zero-pixel change.
- The builder's `--t-block-min-height: 742px` is **not** carried forward: it is
  the sum of a five-row tablet grid whose first 224px row only existed to push
  text below the tablet header. This kit reserves the header explicitly, so
  742px would be 218px of empty scrim.
- The mobile `auto` resolved to roughly 810px on a 390px phone. 524px is a
  deliberate reduction.
- The header reservation (118px desktop / 95.5px mobile) is **inside** that
  524px, exactly as `--block-min-height` behaved, because `box-sizing` is
  `border-box` from `main.css`.
- It is `height`, not `min-height`, so a one-word H1 and a four-word H1 produce
  an identical box. Do not add copy long enough to test that: two H1 lines plus
  a three-line lede uses 167px of a 380px content area at the tightest
  breakpoint.

**Do not** put anything else inside `.as-cover__inner`. No buttons, no
breadcrumbs, no sub-nav.

### What goes immediately after the cover

The existing `<section class="v2-subnav">` block, unchanged, with the current
page's link carrying `is-active`. Do not restyle it and do not move it into the
cover.

---

## 2. `.as-section` — surfaces

Every band of content is one of these. The section owns the ground and the
vertical rhythm; nothing inside it sets its own outer margin.

```html
<section class="as-section as-section--light">
  <div class="as-section__inner">
    <!-- head, then components -->
  </div>
</section>
```

Variants (choose exactly one ground class):

| Class | Ground | Use for |
|---|---|---|
| `as-section--light` | `#fff` | default; all reading sections |
| `as-section--tint` | `#f2f5f6` | to separate two adjacent light sections without going dark |
| `as-section--navy` | `rgb(0,42,65)` | punctuation: a pull-quote, a stats band, one register |

Inner width modifier:

```html
<div class="as-section__inner as-section__inner--narrow">   <!-- 880px -->
```

Use `--narrow` for prose-only sections (`/hse`, `/quality`, `/csr` bodies).
Use the default 1224px for anything with a grid, a ledger or stats.

Extra modifier:

- `as-section--flush` — removes the section's top padding. Only for a section
  that opens with an `.as-band`.

### Alternation rhythm

These five pages are text-led, so the landing page's dark-dominant rhythm
inverts: **light is the default, navy is the punctuation.** Rules:

1. Never place two `--navy` sections adjacent.
2. At most **two** `--navy` sections per page.
3. Two adjacent `--light` sections get a hairline automatically — you do not
   add one.
4. `--tint` is a substitute for a hairline when the two sections are long; do
   not alternate light/tint/light/tint down a whole page.

Recommended per page:

| Page | Rhythm |
|---|---|
| about | light → band → light → **navy** (stats) → light → band → tint |
| credentials | light → **navy** (ledger) → light → tint |
| hse | light → tint → light → **navy** (quote) |
| quality | light → tint → light |
| csr | light → tint (accordion) |

---

## 3. `.as-head` — the section head

Dialect C: eyebrow → h2 → rule → lede. One per section, always in this order.

```html
<header class="as-head">
  <p class="as-head__eyebrow">Certifications</p>
  <h2 class="as-head__title">ISO certified, continuously maintained</h2>
  <span class="as-head__rule" aria-hidden="true"></span>
  <p class="as-head__lede">UGCC holds four ISO certifications and the highest
    contractor grade in Kuwait, all maintained without lapse.</p>
</header>
```

Rules:

- The eyebrow is a `<p>`. **Never a heading.**
- The title is the section's single `<h2>`. Exactly one `<h1>` per page and it
  is the cover's.
- The rule is a `<span aria-hidden="true">`. **Never an `<hr>`.**
- The lede is optional; delete the `<p>` if unused.
- The eyebrow is optional; delete the `<p>` if unused. Order stays the same.
- **Do not add a second rule.** The unit uses the short red mark; it never also
  takes a full-width hairline.
- On navy, colours invert automatically. Change nothing in the markup.

---

## 4. `.as-prose` — the body column

Wrap running text once. Inside it write plain HTML — **no classes at all** on
headings, paragraphs, lists, links.

```html
<div class="as-prose">
  <p>UGCC achieved international recognition for its health and safety
    programme by completing certification in Occupational Health &amp; Safety,
    today maintained to the ISO 45001 standard.</p>

  <h3>Zero Accidents</h3>
  <p>Our personnel continuously inspect changing workplace conditions to
    address hazards and minimise any potential risks.</p>

  <ul>
    <li>Act honestly, fairly, and transparently in all business dealings.</li>
    <li>Avoid any conflicts of interest, or the appearance thereof.
      <ul>
        <li>Declare any related-party transaction before it is entered into.</li>
      </ul>
    </li>
  </ul>

  <ol>
    <li>Obtain necessary permits before starting any construction work.</li>
  </ol>
</div>
```

Supported inside: `<h3>`, `<h4>`, `<p>`, `<ul>`, `<ol>`, `<li>` (one level of
nesting), `<strong>`, `<a>`.

Variant: `class="as-prose as-prose--wide"` removes the 68ch measure. Use only
when the prose sits beside a grid or a figure, never for a standalone reading
column.

Heading levels: the section's `<h2>` is in `.as-head`; `<h3>` is a sub-topic
inside it; `<h4>` only inside an accordion panel. Never skip a level and never
pick a tag for its size.

---

## 5. `.as-cards` — the card grid

Two call sites: `/quality`'s ISO cards and `/about`'s expertise tiles.

### Text cards (`/quality`)

```html
<ul class="as-cards as-cards--2">
  <li class="as-card">
    <h3 class="as-card__title">ISO 9001</h3>
    <p>In 2004, UGCC first achieved the ISO 9001:2000 certification for its
      Quality Management System and currently maintains ISO 9001:2015
      certification.</p>
  </li>
  <li class="as-card">
    <h3 class="as-card__title">ISO 17025</h3>
    <p>In 2019, UGCC achieved ISO 17025:2017 certification for the competence
      of the UGCC Central Testing Laboratory for testing and calibration.</p>
  </li>
</ul>
```

### Image tiles (`/about` expertise)

```html
<ul class="as-cards as-cards--3">
  <li class="as-card as-card--tile">
    <span class="as-card__shot">
      <img src="/assets/img/v2/about-engineering.jpg"
           alt="UGCC engineers reviewing drawings on a highway site"
           width="800" height="600" loading="lazy" decoding="async">
    </span>
    <h3 class="as-card__title">Engineering</h3>
  </li>
  <!-- Construction, Procurement -->
</ul>
```

Rules:

- The grid is a `<ul>`; each card is an `<li>`. It is a list of peers.
- Pick `--2` or `--3` to match the item count. Never both.
- `as-card--tile` **must not** be combined with a `<p>` body — a tile is an
  image plus a caption. If you need body text, use a plain `.as-card`.
- Tile `alt` text must describe the photograph. Fixing flag F-12 is the page
  agent's job: verify the file actually shows the subject its caption names
  before you write the `alt`. Today `about-engineering.jpg` /
  `about-construction.jpg` / `about-procurement.jpg` are cross-wired between
  the desktop and mobile sources — pick one correct file per caption and use it
  at both widths (there are no separate mobile images in this kit).

---

## 6. `.as-ledger` — the credential register (`/credentials`)

Replaces the builder certification grid. The `<div class="as-ledger__row">`
wrapper is **mandatory** — it is what makes the heading/body pair a single grid
item so the two can never separate at narrow widths (flag F-02).

```html
<dl class="as-ledger">
  <div class="as-ledger__row">
    <dt class="as-ledger__term">
      <time class="as-ledger__year" datetime="2004">2004</time>
      <span class="as-ledger__name">ISO 9001</span>
    </dt>
    <dd class="as-ledger__desc">
      First achieved for the UGCC Quality Management System; maintained
      continuously since.
      <span class="as-ledger__status">Maintained</span>
    </dd>
  </div>

  <div class="as-ledger__row">
    <dt class="as-ledger__term">
      <time class="as-ledger__year" datetime="2007">2007</time>
      <span class="as-ledger__name">ISO 45001</span>
    </dt>
    <dd class="as-ledger__desc">First achieved as OHSAS 18001 in Occupational
      Health &amp; Safety; transitioned to and maintained as ISO 45001.</dd>
  </div>

  <div class="as-ledger__row">
    <dt class="as-ledger__term">
      <span class="as-ledger__year" aria-hidden="true">&mdash;</span>
      <span class="as-ledger__name">Grade I</span>
    </dt>
    <dd class="as-ledger__desc">Recognised as a Grade I contractor for roads,
      infrastructure and building construction, and holding the highest grade
      of qualification for electrical works.</dd>
  </div>
</dl>
```

Rules:

- Every row is `div > (dt + dd)`. Never a bare `dt`/`dd` pair.
- Years use `<time datetime="YYYY">`. A row with no year uses
  `<span class="as-ledger__year" aria-hidden="true">&mdash;</span>` — an
  em-dash standing in for a missing value is decoration, not content.
- `.as-ledger__status` is optional, sits **inside** the `<dd>`, and takes one
  or two words.
- Use "Grade I" (roman) everywhere, in both the name and the description. The
  current page mixes `Grade 1` and `“Grade I”` (flag F-16).
- Rows must be in ascending year order; the undated row goes last.

Do **not** use `.as-cards` for this content and do not use `.as-ledger` for
`/quality`'s two ISO cards — the register is a dated list, the cards are a
comparison.

---

## 7. `.as-accordion` — `/csr`'s CSR Code

**No new JavaScript is required.** `assets/js/v2.js` already binds
`.v2-acc__btn` → toggles `.is-open` on the closest `.v2-acc` and flips
`aria-expanded`. Option A below carries both class families so that script
drives the kit's styling untouched.

### Option A — JS-driven (preferred; matches the rest of the site)

```html
<div class="as-accordion">
  <div class="as-acc v2-acc">
    <button class="as-acc__btn v2-acc__btn" type="button" aria-expanded="false">
      1. Introduction
    </button>
    <div class="as-acc__panel v2-acc__panel">
      <div class="as-acc__content v2-acc__content">
        <div class="as-acc__content-pad v2-acc__content-pad">
          <div class="as-prose">
            <p>This CSR Code establishes a framework for corporate social
              responsibility, ethical behavior and professional conduct for
              United Gulf Construction Company (UGCC).</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- items 2-6 -->
</div>
```

Every element carries **both** classes. Omitting the `v2-` class breaks the
JS; omitting the `as-` class gives you the old v2 styling.

`type="button"` and `aria-expanded="false"` are mandatory on every button.

The panel is collapsed with `grid-template-rows: 0fr` + `overflow: hidden`, not
`display: none`, so the text stays in the DOM and in the accessibility tree for
find-in-page and for crawlers.

### Option B — zero-JS (`<details>`)

Use only if a reviewer requires the content readable with scripting off.

```html
<div class="as-accordion">
  <details class="as-acc" open>
    <summary class="as-acc__btn">1. Introduction</summary>
    <div class="as-acc__panel">
      <div class="as-acc__content">
        <div class="as-acc__content-pad">
          <div class="as-prose"><p>…</p></div>
        </div>
      </div>
    </div>
  </details>
</div>
```

**Never mix A and B on one page**, and never put the `v2-acc` classes on a
`<details>` — `v2.js` would find no `.v2-acc__btn` and the `<summary>` would
double-toggle.

Inside a panel, headings start at `<h4>` if the button text is acting as the
heading, or `<h3>` if the panel restates a topic. `/csr`'s `2.1 Integrity`
style sub-headings are `<h3>`.

---

## 8. `.as-pills` — HSSE tag groups

```html
<ul class="as-pills">
  <li class="as-pill">Employee Well-being</li>
  <li class="as-pill">Prevention of Accidents</li>
  <li class="as-pill as-pill--key">Zero Accidents</li>
</ul>
```

- A `<ul>` of `<li>`, so the group announces as a list of three.
- Pills are **not** links and have no hover lift. Do not wrap them in `<a>`.
- `--key` marks the one policy statement in a group. At most one per group.
- Sits directly after the prose it qualifies; the 28px top margin is built in.

---

## 9. `.as-figure` and `.as-band`

### In-column captioned figure

```html
<figure class="as-figure">
  <img src="/assets/img/v2/…jpg" alt="…" width="1200" height="750"
       loading="lazy" decoding="async">
  <figcaption class="as-figure__cap">The UGCC Central Testing Laboratory,
    Al-Ardiya.</figcaption>
</figure>
```

Variant `as-figure--ratio` forces 16:10 and crops — use when several figures
sit in a row and must line up.

### Full-bleed band

Goes **between** sections, as a direct child of the page body — **not** inside
`.as-section__inner`.

```html
<figure class="as-band">
  <img src="/assets/img/v2/…jpg"
       alt="Aerial view of the 6th Ring Road interchange under construction"
       width="2400" height="1000" loading="lazy" decoding="async">
</figure>
```

Variant `as-band--wash` adds a navy wash; use only when the band sits between
two navy sections.

The band replaces the builder's two text-free 800px/827px image blocks (flag
F-22). Bands are `clamp(240px, 34vw, 420px)` tall — roughly half the old
height, which is what a decorative break between two reading sections is worth.

Bands need real `alt` text. They are content photographs, not decoration.

---

## 10. `.as-stats` — the figure trio

```html
<ul class="as-stats">
  <li class="as-stat">
    <span class="as-stat__figure">1975</span>
    <span class="as-stat__unit">Founded in Kuwait</span>
  </li>
  <li class="as-stat">
    <span class="as-stat__figure">6</span>
    <span class="as-stat__unit">Countries of operation</span>
  </li>
  <li class="as-stat">
    <span class="as-stat__figure">30</span>
    <span class="as-stat__unit">Contracts on record</span>
  </li>
</ul>
```

- Figure first, unit second. The unit is what makes the figure mean anything —
  never ship a figure without one.
- Three or four items. Two looks accidental, five wraps badly.
- Only claim numbers the site can substantiate. The About page's meta
  description claims "6 countries" while the body says only "Middle East, India
  and Africa" (flag F-20) — reconcile before publishing a `6`.

---

## 11. `.as-quote` — the pull-quote banner

```html
<section class="as-section as-section--navy">
  <div class="as-section__inner">
    <blockquote class="as-quote">
      <p class="as-quote__text">We don't fill positions. We build the teams that
        deliver Kuwait's infrastructure.</p>
      <cite class="as-quote__cite">UGCC</cite>
    </blockquote>
  </div>
</section>
```

- It is a `<blockquote>`. The red rule above the text is drawn by CSS — do not
  add a `<span>` for it.
- `.as-quote__cite` is optional.
- One per page, maximum.
- Supersedes `.v2-banner`. Do not use `.v2-banner` on these five pages.

---

## 12. Reveals

Opt in per element by adding `v2-reveal` targets — but **note that no script on
these pages currently adds the `.hero-motion` / `.v2-reveal` gate classes to
`<html>`**, so today all reveal rules are inert and everything renders visible.
That is correct and intended.

If a reveal script is added later it must follow the existing contract exactly:

- `IntersectionObserver`, `{ threshold: 0.2 }`, `unobserve` after first hit.
- Adds `.is-in` to the element itself.
- Sets an inline integer `--i` on repeated items for a 60ms stagger.
- Adds `.v2-reveal` to `<html>` only after it has found targets.

Elements the kit already has entrance rules for: `.as-head`, `.as-prose`,
`.as-card`, `.as-ledger__row`, `.as-acc`, `.as-stat`, `.as-quote`.

**Nothing may be hidden in CSS that JS has to un-hide.** Do not add
`style="opacity:0"` to anything. Do not use the builder's `.transition`
classes — they start at `opacity: 0` and depend on `main.js`.

The cover never reveals. Do not add reveal classes to it.

---

## 13. Classes that must never be combined

| Never together | Why |
|---|---|
| `as-section--navy` + `as-section--light` / `--tint` | pick exactly one ground |
| `as-cards--2` + `as-cards--3` | contradictory track minimums |
| `as-card--tile` + a `<p>` body | a tile is image + caption only |
| `as-ledger` + `as-cards` for the same content | a dated register is not a comparison grid |
| `<details class="as-acc">` + `v2-acc` classes | `v2.js` would double-toggle the `<summary>` |
| option A and option B accordions on one page | two behaviours, one component |
| `as-band` inside `.as-section__inner` | the full-bleed escape needs the document width |
| `as-quote` + `v2-banner` | `.as-quote` supersedes it |
| `as-prose--wide` on a standalone reading column | the 68ch measure exists for a reason |
| a second rule element inside `.as-head` | one rule per head, always |
| `as-cover` + any inline `style` | the height contract is the deliverable |

---

## 14. Breakpoints

**920px is the only breakpoint in this kit. 768px is banned.** It is the
builder's own breakpoint and where the header swaps to its mobile layout;
choosing 768 leaves a dead 769–920 band with a mobile header and a desktop
section. If a page needs a different width, that is a kit amendment, not a page
override.

At ≤920px, automatically: the container goes to `calc(100% - 32px)`, section
padding drops 88→64px, card and ledger grids go single-column, the cover keeps
its 524px height and only its type and gutter change.

---

## 15. Checklist before you hand a page over

- [ ] `about-suite.css?v=1` linked after `v2.css`, scripts unchanged.
- [ ] Exactly one `<h1>`, and it is `.as-cover__title`.
- [ ] The `.as-cover` block is byte-identical to §1 apart from image/H1/lede.
- [ ] The cover image has descriptive `alt`; every body image has descriptive
      `alt`; nothing meaningful has `alt=""`.
- [ ] No heading level skipped.
- [ ] No `<hr>` anywhere; rules are `<span aria-hidden="true">`.
- [ ] No inline `style` attributes on any V2 markup.
- [ ] No element starts at `opacity: 0`.
- [ ] Page renders complete with JavaScript disabled.
- [ ] Sub-nav present, current page `is-active`.
- [ ] `<section class="v2-subnav">` unchanged, and the builder footer block
      `#FUdf9w9dXZ` left exactly as it is.

---

## Buttons — `.as-btn`

Added after the first build round. Two pages needed a button, found no kit
component, and solved it two different ways — `/about` restated the design
system's values under a page-local class, `/credentials` fell back to a plain
inline link. One job, two treatments, which is the exact inconsistency this
suite exists to remove. Both now use this component.

```html
<a class="as-btn as-btn--on-light" href="{{HREF}}">{{LABEL}}</a>
```

| Variant | Ground | Colours |
|---|---|---|
| `--on-light` | light / tint sections | navy pill, white label (12.9:1); hover lifts to `#063a56` |
| `--on-dark` | navy sections, photography | white pill, `#101010` label (18.9:1) |
| `--ghost` | dark grounds **only** | transparent with a white border and label |

Geometry, type and transition are `.v2-btn`'s values copied verbatim from
`sections.css`, and the ground variants keep their homepage names and exact
colours — a button here and a button on the landing page are the same object.

Do **not** link `sections.css` to borrow `.v2-btn`: that file is loaded by
`index.html` only and says so in its own header, and linking it would pull the
whole homepage About/Who-are-we block onto an inner page. Do **not** use the
builder's `.grid-button--primary` either — it is only painted by rules scoped
to `[data-v-297de5e8]`, so on hand-authored markup it renders as bare text.

At ≤920px every `.as-btn` goes full-width and centres its label, matching the
homepage convention. Do not re-declare that per page.

---

## House style: ISO designations

Settled after the first build round, when `/quality` came back versioned and
`/credentials` unversioned.

- **Headings, card titles and register terms: unversioned** — `ISO 9001`,
  `ISO 14001`, `ISO 45001`, `ISO 17025`. This is what four of the five pages
  already used, including every `<title>`, meta description and JSON-LD block.
  It is also the only form the source substantiates across all four: revisions
  are documented for 9001 and 17025 only, so a versioned house style would
  force inventing revision numbers for 14001 and 45001.
- **Running prose: keep whatever revision the source states.** `/quality`'s
  "achieved ISO 9001:2000 … currently maintains ISO 9001:2015" is real history
  and must survive verbatim; it is not a style choice.

`OHSAS 18001` is a different standard, not a version of 45001 — keep it where
the source has it. Classifications use the roman `Grade I`, never `Grade 1`.

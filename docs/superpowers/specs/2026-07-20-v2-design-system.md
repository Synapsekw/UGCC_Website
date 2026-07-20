# UGCC V2 design system — the landing page as the gold standard

Date: 2026-07-20. Branch: `V2`.

This document describes, exactly, how the V2 landing page (`index.html`) is
built. Every other page on the site is to be brought up to this. It is written
so that an agent who **cannot read `index.html`** can still reproduce its
conventions from this file alone: all values below are copied verbatim from
source, with the source file named.

The site is a static export from the Hostinger website builder (67 HTML pages,
no build step, no `package.json`, no framework). The V2 work is a hand-authored
layer *on top of* that export. Understanding that split is the single most
important thing in this document — see §7.

---

## 0. File map and load order

`index.html` `<head>`, in this exact order (the order is the cascade):

```html
<link rel="stylesheet" href="/assets/css/fonts.css">
<link rel="stylesheet" href="/assets/css/main.css">
<link rel="stylesheet" href="/assets/css/custom.css">
<link rel="stylesheet" href="/assets/css/v2.css?v=4">
<link rel="stylesheet" href="/assets/css/hero.css?v=2">
<link rel="stylesheet" href="/assets/css/sections.css?v=2">
<link rel="stylesheet" href="/assets/css/rail.css?v=1">
<link rel="stylesheet" href="/assets/css/projects.css?v=1">
<link rel="stylesheet" href="/assets/css/careers.css?v=1">
<link rel="stylesheet" href="/assets/css/credentials.css?v=1">
<link rel="stylesheet" href="/assets/css/offices.css?v=3">
```

Scripts, at the end of `<body>`, all deferred:

```html
<script src="/assets/js/chat-widget.js?v=1" defer></script>
<script src="/assets/js/main.js" defer></script>
<script src="/assets/js/v2.js?v=3" defer></script>
<script defer src="/assets/js/hero.js?v=2"></script>
<script defer src="/assets/js/sections.js?v=1"></script>
<script defer src="/assets/js/rail.js?v=1"></script>
```

| File | Scope | Owns |
|---|---|---|
| `main.css` (358 KB) | builder export, **all 67 pages** | `.block`, `.block-layout`, `.block-background`, `.text-box`, `.grid-button--*`, header/footer |
| `custom.css` | all pages | replaces builder hydration (slideshow fade, map pin) |
| `v2.css` | **all pages** | the `--v2-*` tokens, focus ring, header scroll state, nav, generic `.v2-*` components (tables, prose, cards, accordion, pills, banner) |
| `hero.css` | index only | `#aCqA2TkE7` hero, hero motion keyframes, client logo rail |
| `sections.css` | index only | **`.v2-btn` (the shared button)**, About `#BCClZ9bf3`, Who-are-we `#u7vIc0iRh`, the scroll-reveal rules |
| `rail.css` | index only | `.v2-rail*` gallery rail (`#zOl98u`) |
| `projects.css` | index only | `.v2-proj*` project cards (`#zd_fdi`) |
| `careers.css` | index only | `.v2-careers*` band (`#Jways5TtQ`) + `.v2-btn--red` |
| `credentials.css` | index only | `.cred*` (`#zZFMdo`) |
| `offices.css` | index only | `.off*` + map (`#zrby1M`) |

**Cache-buster convention: every V2 asset is linked with a `?v=N` query string,
and `N` is incremented by hand whenever that file changes.** `fonts.css`,
`main.css`, `custom.css` and `main.js` (builder files) carry no `?v=`. When you
edit `assets/css/offices.css` you must also bump `offices.css?v=3` → `?v=4` in
every HTML file that links it. Forgetting this is the most common way a fix
appears not to work.

**Per-section stylesheet convention.** New blocks get their own file linked once
from the page that uses them, rather than growing `v2.css`. Precedent set by
`rail.css` and stated explicitly in the projects spec: *"`v2.css` and `v2.js` are
not edited."* This keeps concurrent sessions out of each other's files.

Verification harnesses live in `tools/` — dependency-free console IIFEs, one per
block: `hero-check.js`, `home-check.js`, `rail-check.js`, `projects-check.js`,
`credentials-check.js`, `careers-check.js`, `offices-check.js`. Some assert
design decisions that are invisible in a screenshot (e.g. `home-check.js`
asserts the eyebrow uses `--v2-red` and not `--v2-red-text`).

---

## 1. Design tokens

### 1.1 Custom properties — `assets/css/v2.css`, `:root`

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

**The two reds are not interchangeable.** `#d41c22` was decoded from the logo
PNG (hue 358°, S 0.77, L 0.47). Contrast, measured against the hero scrim
`#0D2231`:

| Token | Use | Contrast |
|---|---|---|
| `--v2-red` `#d41c22` | fills, rules, underlines, borders, solid buttons, focus outline | white on it 5.26:1 (AA) |
| `--v2-red-text` `#e8635e` | small red **text on dark grounds** (eyebrows on navy/photo) | 4.94:1 on scrim (AA) |

`--v2-red` as small text on dark is 3.09:1 and **fails AA** — that is why the
second stop exists. Conversely `--v2-red-text` on a near-white ground computes
~2.9:1 and fails; on light grounds small red text must use `--v2-red`
(sections.css:249 argues this at length for `.wr-eyebrow`). Rule of thumb:

> Eyebrow on light ground → `--v2-red`. Eyebrow on dark ground →
> `--v2-red-text`. Any solid red fill, anywhere → `--v2-red`.

Selection colour is red: `::selection { background: var(--v2-red); color: #fff; }`.

### 1.2 Literal colours in use (no token yet)

| Value | Where | Meaning |
|---|---|---|
| `#fff` | light section grounds, all text on dark | |
| `#101010` | `.v2-btn--on-dark` label | |
| `#063a56` | `.v2-btn--on-light:hover` | navy lifted ~8% toward white |
| `#b8161c` | `.v2-btn--red:hover` | |
| `#33424e` | `.v2-prose p`, `.v2-card p` body copy on white | |
| `#5a6570` | `.cred__lede`, `.cred__desc` | |
| `#6b747c` | `.cred__unit`, `.cred__year` | 4.76:1 on white — do not lighten; `#8a929a` was tried and fails at 3.15:1 |
| `#22313d` | `.v2-table` body text | |
| `#e6e8ea` | `.cred__ledger` / `.cred__row` hairlines | |
| `#0b2233` | image placeholder behind rail/project cards | |
| `#001b2a` / `#13597c` / `#4c9fc9` | offices map sea / context land / operations land | tuned for dichromat contrast; see offices.css comments before touching |
| `rgba(0,42,65,.06 / .12 / .14 / .16 / .22)` | hairlines and chip fills on light | |
| `rgba(255,255,255,.14 / .16 / .28 / .45 / .5 / .66 / .68 / .75 / .82 / .9)` | hairlines and secondary text on navy | |

Offices declares three **block-local** tokens on `#zrby1M`, so the block's
contrast is a one-line edit:

```css
--off-hair: rgba(255, 255, 255, .16);
--off-dim:  rgba(255, 255, 255, .45);
--off-body: rgba(255, 255, 255, .82);
```

### 1.3 Easing

Three curves only. `--v2-ease-out-quart` is the default for state changes
(hover, colour, background, transform on interaction). `--v2-ease-out-quint` is
for things that *grow* (nav underline scaleX, accordion rows, dot pills).
`--v2-ease-out-expo` is reserved for **entrances** (`hero-word-in`,
`hero-fade-up`). Linear is used only for the two continuous marquees (client
logo rail, gallery drift) — a continuous loop must not ease.

### 1.4 Shadows

```
--v2-shadow-header : 0 10px 30px -12px rgba(0, 21, 33, .45)   scrolled header
--v2-shadow-lift   : 0 14px 28px -12px rgba(0, 21, 33, .35)   every hover lift
0 4px 10px -6px rgba(0, 21, 33, .4)                            button :active
0 18px 38px -20px rgba(0, 21, 33, .4)                          .v2-card:hover
0 14px 34px -22px rgba(0, 21, 33, .35)                         .v2-table-scroll
0 14px 30px -22px rgba(0, 21, 33, .4)                          .v2-acc.is-open
0 0 0 7px #fff                                                 the focus halo
```

All shadows are tinted `rgba(0, 21, 33, …)` — a darker navy than the brand navy,
never neutral black.

### 1.5 Fonts

Two families, from the builder's inline custom properties on `<main>`:

```
--font-primary:   'Hammersmith One', sans-serif    display / headings
--font-secondary: 'Open Sans', sans-serif          body, labels, UI
```

Loaded by `assets/css/fonts.css`. **Hammersmith One ships one weight only, so
`font-weight: 400` is always correct and always the only option on a heading.**

The builder's inline type scale (still on `<main>`, still authoritative for
anything inside `.text-box`): `--h1-font-size:104px / lh 1.3 / mobile 60px`,
`--h2: 88px / 1.5 / 52px`, `--h3: 72px / 1.2 / 44px`, `--h4: 64px`,
`--h5: 48px`, `--h6: 30px`, `--body: 18px / 1.5`, `--body-large: 24px`,
`--body-small: 16px`, `--nav-link: 16px / 600`. All heading families resolve to
`var(--font-primary)`, weight 400, letter-spacing `0em`, transform `none`.

**Hand-authored V2 headings do not inherit that scale and must declare it
themselves.** The builder applies it via `.text-box h1 { font-family:
var(--h1-font-family) }` etc.; V2 markup replaces `.text-box`, so an undeclared
`<h2>` silently falls back to Open Sans Bold. This bug shipped once and the
client noticed. Every V2 heading rule therefore carries, explicitly:

```css
font-family: var(--font-primary, 'Hammersmith One', sans-serif);
font-weight: 400;
```

(`hero.css:132`, `sections.css:177` and `:280`, `credentials.css:37`,
`offices.css:71`, `careers.css:111`, `projects.css:62` all repeat this, each
with the same comment. Do not "DRY it up" by reintroducing a `.text-box`
wrapper.)

#### Actual type used on the landing page

| Role | Family | Size | Weight | Line-height | Other | Source |
|---|---|---|---|---|---|---|
| Hero h1 | Hammersmith One | `clamp(56px, 4.6vw + 45px, 132px)` | 400 | 1.02 | `letter-spacing:0`, `text-transform:none` | hero.css |
| About h2 (statement) | Hammersmith One | `clamp(26px, 3.4vw, 46px)`; ≤920px `clamp(26px, 7vw, 31.3px)` | 400 | 1.15 | white | sections.css |
| Who-are-we h2 | Hammersmith One | `clamp(22px, 2.2vw, 32px)` | 400 | 1.25 | `--v2-navy` | sections.css |
| Rail h2 | Hammersmith One | 38px; 1024px→31px; 600px→25px | 400 | 1.2 | white | rail.css |
| Projects h2 | Hammersmith One | 32px; 1024px→26px; 600px→22px | 400 | 1.2 | white | projects.css |
| Credentials h2 | Hammersmith One | `clamp(30px, 3.2vw, 44px)` | 400 | 1.12 | `letter-spacing:.01em`, `text-transform:uppercase` | credentials.css |
| Offices h2 | Hammersmith One | `clamp(28px, 3.4vw, 40px)` | 400 | 1.15 | `letter-spacing:-.005em`, `text-wrap:balance` | offices.css |
| Careers h2 | Hammersmith One | `clamp(42px, 5.6vw, 76px)` | 400 | 1.02 | `letter-spacing:-.02em` | careers.css |
| Project card h3 | Hammersmith One | 17px | 400 | 1.3 | `text-wrap:balance` | projects.css |
| Office country h3 | Hammersmith One | 21px | 400 | — | `letter-spacing:.01em` | offices.css |
| Stat figure | Hammersmith One | 38px (≤920px 30px) | 400 | 1 | | credentials.css |
| **Eyebrow (light ground)** | Open Sans | 12px | 600 | — | `letter-spacing:.16em`, colour `--v2-red` | sections.css `.wr-eyebrow` |
| **Eyebrow (dark, rail/projects)** | Open Sans | 11px | 700 | — | `.18em`, uppercase, `--v2-red-text` | rail.css / projects.css |
| **Eyebrow (offices)** | Open Sans | 11px | 700 | — | `.2em`, uppercase, `--v2-red-text` | offices.css |
| **Eyebrow (careers, photo)** | Open Sans | 12px | 600 | 1 | `.24em`, uppercase, `rgba(255,255,255,.6)` | careers.css |
| Lede / intro | Open Sans | 15px (About 16px, Careers 16px) | 400 | 1.6–1.8 | `max-width: 46ch` (About sub, offices lede) or `54ch` (projects intro) | all |
| Body prose | Open Sans | 17px | 400 | 1.75 | `#33424e` | v2.css `.v2-prose p` |
| Meta / label | Open Sans | 10.5–13px | 700 | — | `letter-spacing:.09em–.16em`, uppercase | offices, credentials, projects |
| Tabular numerals | Open Sans | — | — | — | `font-variant-numeric: tabular-nums` on years, phone numbers, project values | |

### 1.6 Container

**`1224px` is the content column everywhere.** Two spellings are in use; the
`min()` form is the correct one for new work:

```css
/* preferred — used by #BCClZ9bf3, #u7vIc0iRh, .cred, .off, hero */
width: min(1224px, 100% - 64px);
margin-inline: auto;
/* ≤920px: width: calc(100% - 32px)  (offices writes min(1224px, 100% - 32px)) */

/* alternative — used by .v2-rail__head, .v2-proj, .v2-careers__layout */
max-width: 1224px;
margin: 0 auto;
padding: 0 24px;      /* 16px at ≤600px */
```

`credentials.css:18` explains why `min()` is preferred: `box-sizing: border-box`
comes from `main.css`'s `*` reset, so viewport-proportional padding on a
capped-width box **eats the cap** — the column peaks near 1115px and then
*shrinks* as the viewport grows (1054px at 1920, 997px at 2560). Use `min()`
unless you are matching an adjacent block that already uses the other form.

Full-bleed escapes (`.hero-clients`, the rail track) use
`left: calc(50% - 50vw); right: calc(50% - 50vw)` — **not** `width: 100vw`,
which overflows by the scrollbar width.

### 1.7 Spacing rhythm

- **Section vertical padding, light/standard blocks: `padding-block: 88px`,
  dropping to `64px` (or `56px`) at ≤920px.** This is the canonical figure —
  `#u7vIc0iRh .wr-layout`, `.cred`, `.off` all use exactly `88px` → `64px`/`56px`.
- Navy "band" blocks are tighter and asymmetric: rail `52px 0 57px`
  (→ `39px 0 44px` at ≤600px), projects `48px 0 56px` (→ `34px 0 38px`).
- Careers, being a photographic hero-band, is `112px 24px 96px`
  (→ `88px 16px 72px` at ≤900px) with `min-height: 560px`.
- Grid gaps: `24px` column / `28px` row (projects), `64px` (credentials
  two-column), `56px` (offices two-column), `32px`/`36px` when collapsed.
- Header-group internals: title `margin-top: 6px–14px` from the eyebrow, lede
  `margin-top: 10px–12px` from the title, rule `padding-bottom: 20px–24px` then
  `margin-bottom: 28px–30px` below the divider.
- The 8px rhythm is respected where it matters and deliberately broken where a
  measurement demanded it (e.g. `grid-template-columns: 28px 224px 1fr 24px` —
  224 rather than the measured 211 minimum, for webfont headroom).

### 1.8 Radii

```
999px / 100px   pills: .v2-btn, .v2-pill, the header "Contact us" item
50%             circular: .v2-rail__toggle (42×42), map bullets
14px            large surfaces: .v2-card, .v2-table-scroll
12px            .v2-acc
5px             .v2-rail__card
4px             .v2-proj__shot, .v2-proj__card focus ring
2px             :focus-visible default
0               tags, badges, key swatches, section grounds — deliberately square
```

---

## 2. Section anatomy

### 2.1 The wrapper pattern

Every landing-page block is still a builder `<section class="block" id="…">`
with a builder-generated ID. Two shapes exist:

**(a) Builder shell kept, contents replaced** — used where the section needs the
builder's `.block-background` (video, photo, or a colour plate):

```html
<section id="zd_fdi" class="block v2-proj-block" data-v-3ffce944>
  <div class="block-background block-background--fixed" data-v-3ffce944
       style="--v4cfc8878:rgb(0, 42, 65); …"></div>
  <div class="v2-proj"> …hand-authored markup… </div>
</section>
```

**(b) Builder shell emptied entirely** — where the block draws its own ground:

```html
<section id="zZFMdo" class="block" style="--block-padding:16px 0 16px 0; …">
  <div class="cred"> …hand-authored markup… </div>
</section>
```

The builder's `.block-layout` wrapper is sometimes kept (hero, About,
Who-are-we, careers keep it and add a second class: `class="block-layout
block-layout--layout wr-layout"`), and sometimes dropped (rail, projects,
credentials, offices).

> **Hazard — the `z-index: 14` trap.** `main.css` renders `.block-background` at
> `z-index: 13` as an *opaque plate over the whole section*, and lifts content
> above it with `.block-layout { z-index: 14 }`. **If you drop `.block-layout`,
> you must supply `position: relative; z-index: 14` yourself or your content
> renders behind the background.** Documented in `projects.css:18` and
> `hero.css`. `.v2-proj` carries exactly that pair.

> **Hazard — orphaned custom properties.** The builder sizes blocks from inline
> custom properties (`--grid-template-rows`, `--block-min-height`,
> `--block-padding`, `--cols`, `--rows`) that lived on the wrapper you just
> replaced. Once gone, `main.css`'s `padding: var(--block-padding)` becomes an
> *invalid declaration* — the result is browser-dependent, not zero. Set
> `padding: 0` explicitly on the section and let your own wrapper own spacing
> (`offices.css:22` does this). Likewise `display: grid` from `.block-layout`
> survives while its track sizing does not, which is why
> `#BCClZ9bf3 .about-layout` re-declares `display: flex`.

### 2.2 BEM convention

Two naming schemes coexist, both strict BEM-ish, both fine:

1. **Prefixed global blocks** — `v2-` prefix, full BEM:
   `.v2-rail`, `.v2-rail__head`, `.v2-rail__eyebrow`, `.v2-rail__title`,
   `.v2-rail__viewport`, `.v2-rail__track`, `.v2-rail__item`, `.v2-rail__card`,
   `.v2-rail__tag`, `.v2-rail__toggle`, `.v2-rail__icon--play`.
   Same for `.v2-proj__*`, `.v2-careers__*`, `.v2-btn--*`.
2. **ID-scoped short blocks** — `#BCClZ9bf3 .about-stack`, `#u7vIc0iRh .wr-row`,
   `.cred__row`, `.off__line`. These rely on the section ID for uniqueness
   (`sections.css` scopes every rule under the ID; `credentials.css` and
   `offices.css` scope only the section's own ground rule and let the
   `cred__`/`off__` prefix do the rest).

State is carried by **classes** (`.is-in`, `.is-open`, `.is-active`) or by
**data attributes the stylesheet keys off** (`[data-paused="true"]`,
`[data-manual="true"]`). Modifiers are `--` suffixed and **named for the ground
they sit on, not by importance**: `--on-dark` / `--on-light`, never
`--primary` / `--secondary`. That decision is recorded in the About spec: an
earlier `--primary`/`--dark` pair mixed two axes, so anyone building on a light
ground reached for "primary" and got a white pill on white.

### 2.3 The "head" pattern — the key reusable unit

Every block below the hero opens with the same four-part header group:
**eyebrow → title → lede → rule**. It appears in four dialects; reproduce the
one whose situation matches.

#### Dialect A — inline rule mark in the eyebrow (Who-are-we, Careers)

The red rule is a `<span>` *inside* the eyebrow paragraph, laid out with flex:

```html
<header class="wr-head">
  <div class="wr-head__text">
    <p class="wr-eyebrow"><span class="wr-rule"></span>WHO ARE WE</p>
    <h2 class="wr-title">Seven disciplines, one contractor</h2>
    <p class="wr-intro">Technical excellence and innovative solutions across
       complex infrastructure and building projects.</p>
  </div>
  <a class="v2-btn v2-btn--on-light" href="/business-lines-…">Explore More</a>
</header>
```

```css
#u7vIc0iRh .wr-head {
  display: flex; justify-content: space-between; align-items: flex-end;
  gap: 40px; padding-bottom: 24px;
  border-bottom: 1px solid rgba(0, 42, 65, .22);
}
#u7vIc0iRh .wr-head__text { max-width: 520px; }
#u7vIc0iRh .wr-eyebrow {
  display: flex; align-items: center; gap: 10px; margin: 0;
  font-size: 12px; font-weight: 600; letter-spacing: .16em;
  color: var(--v2-red);
}
#u7vIc0iRh .wr-rule { flex: none; width: 26px; height: 1px; background: var(--v2-red); }
#u7vIc0iRh .wr-title { margin: 14px 0 0; /* + explicit Hammersmith 400 */ }
#u7vIc0iRh .wr-intro { margin: 12px 0 0; font-size: 15px; line-height: 1.7;
                       color: rgba(0, 42, 65, .72); }
```

Careers repeats this construction in white-on-photo, deliberately as its own
rule rather than a shared class (the rule element there is navy and would
vanish): `.v2-careers__eyebrow` is `gap:14px; margin:0 0 24px; 12px/600/lh 1;
letter-spacing:.24em; uppercase; rgba(255,255,255,.6)` with
`.v2-careers__rule-mark { width:36px; height:2px; background: var(--v2-red) }`.

#### Dialect B — eyebrow spans the row, exit link on the right (Rail, Projects)

No rule mark; the **hairline under the whole head** is the rule.

```html
<div class="v2-proj__head">
  <p class="v2-proj__eyebrow">Selected projects</p>
  <h2 class="v2-proj__title">Named contracts, from the 6th Ring Road to Duqm Port</h2>
  <p class="v2-proj__intro">Six of thirty contracts on record, spanning roads,
     buildings, industrial infrastructure and oil and gas.</p>
  <a class="v2-proj__all" href="/construction-projects-kuwait">All projects</a>
</div>
```

```css
.v2-proj__head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    "eyebrow eyebrow"
    "title   all"
    "intro   all";
  align-items: end; column-gap: 32px;
  padding-bottom: 20px; margin-bottom: 28px;
  border-bottom: 1px solid rgba(255, 255, 255, .16);
}
```

Grid areas rather than a wrapper `<div>` — **the markup stays flat**. The rail's
head is the flex variant of the same idea: `.v2-rail__head { max-width:1224px;
margin: 0 auto 30px; padding: 0 24px; display:flex; flex-wrap:wrap;
align-items:flex-end; gap:20px }` with `.v2-rail__eyebrow { flex: 0 0 100% }`
forcing the title onto the next line, and the pause toggle taking the right slot.

The exit link `.v2-proj__all` is the reusable "go to the index" affordance:
12px/700, `letter-spacing:.1em`, uppercase, white, `padding-bottom: 4px`,
`border-bottom: 2px solid var(--v2-red)`, hover → `--v2-red-text`.

#### Dialect C — standalone rule element under the title (Credentials, About)

The rule is a decorative `<span aria-hidden="true">` placed *between* title and
lede (Credentials) or *above* the statement (About). **It is a `<span>`, never
an `<hr>`** — an `<hr>` announces a thematic break that is not there.

```html
<h2 class="cred__title">The Power <br>of Experience</h2>
<span class="cred__rule" aria-hidden="true"></span>
<p class="cred__lede">…</p>
```
```css
.cred__rule { display:block; width:34px; height:2px; margin:20px 0;
              background: var(--v2-red); }
/* About: 48×2, margin 0 0 24px, background var(--v2-red-text) — navy ground */
```

About's variant is `48px × 2px` rather than `26×1`, because "it stands alone
rather than sitting beside eyebrow text, so it needs the extra weight to
register" (sections.css:158).

#### Dialect D — plain stacked head, no rule (Offices)

```html
<p class="off__eyebrow">Our locations</p>
<h2 class="off__title">Offices &amp; branches</h2>
<p class="off__lede">Three permanent offices across the Gulf, with project
   operations in three more countries.</p>
```
`.off__eyebrow { margin: 0 0 12px }`, `.off__title { margin: 0 }`,
`.off__lede { margin: 12px 0 0; max-width: 46ch }`.

#### Composing a new head — the rules that always hold

1. Eyebrow is a `<p>`, never a heading. Uppercase, 11–12px, 600–700,
   `letter-spacing` between `.16em` and `.24em`.
2. Eyebrow colour: `--v2-red` on light, `--v2-red-text` on dark, or
   `rgba(255,255,255,.6)` when red would fight a photograph.
3. Title is the block's single `<h2>`. Hammersmith One 400, declared explicitly.
4. Lede is a `<p>` capped at `46ch`–`54ch`.
5. **One horizontal rule per head, and only one**: either a short red mark
   (26×1 / 34×2 / 36×2 / 48×2) *or* a full-width 1px hairline under the head
   (`rgba(0,42,65,.22)` on light, `rgba(255,255,255,.16)` on dark). Never both.
6. If the block has an index page, its link sits bottom-right of the head,
   baseline-aligned with `align-items: end`.

### 2.4 Block-by-block anatomy

Source order on the landing page, with surface:

| # | ID | Block | Surface | Vertical padding |
|---|---|---|---|---|
| 1 | `aCqA2TkE7` | Hero | video over `#000` + gradient scrim | none — `height: max(640px, 100svh)` |
| 2 | `BCClZ9bf3` | About | **navy** `rgb(0,42,65)` | `min-height: clamp(480px, 62svh, 600px)` |
| 3 | `u7vIc0iRh` | Who are we | **light** (white-wall photo) | `padding-block: 88px` → `64px` |
| 4 | `zOl98u` | Gallery rail | **navy** | `52px 0 57px` → `39px 0 44px` |
| 5 | `zd_fdi` | Projects | **navy** (gradient plate) | `48px 0 56px` → `34px 0 38px` |
| 6 | `zZFMdo` | Credentials | **white** `#fff` | `padding-block: 88px` → `56px` |
| 7 | `zrby1M` | Offices | **navy** | `padding-block: 88px` → `64px` |
| 8 | `Jways5TtQ` | Careers | photo + navy scrim | `112px 24px 96px` → `88px 16px 72px` |
| 9 | `FUdf9w9dXZ` | Footer band | black (builder) | builder |

**Alternation rule.** Dark → dark → light → dark → dark → light → dark → dark.
The page is predominantly navy; light sections are the punctuation, and they
always carry the densest information (the seven business lines; the credentials
ledger). Two navy blocks may sit adjacent (rail + projects) only when they read
as one family — which is why `projects.css` deliberately copies rail's container
metrics and breakpoints, and reuses its red 2px caption bar.

---

**1. Hero — `#aCqA2TkE7`** (`hero.css`)

```html
<section id="aCqA2TkE7" class="block block--desktop-first-visible …">
  <div class="block-background block-background--fixed">
    <video class="block-background__video--fixed block-background__image"
           src="/assets/video/MulticutVideoforHomePage.mp4"
           poster="/assets/img/v2/hero-poster.jpg"
           autoplay muted loop playsinline …></video>
    <div class="block-background__overlay--fixed block-background__overlay"></div>
  </div>
  <div class="block-layout block-layout--layout hero-layout">
    <div class="hero-stack">
      <h1 class="hero-title">WE BUILD BETTER</h1>
      <div class="hero-cta">
        <a class="hero-btn hero-btn--primary" href="/contact-us">Get in Touch</a>
        <a class="hero-btn hero-btn--secondary" href="/construction-projects-kuwait">View Projects</a>
      </div>
    </div>
    <div class="hero-clients" aria-label="Selected clients">
      <div class="hero-clients__track">
        <div class="hero-clients__set">…9 logos, real alt…</div>
        <div class="hero-clients__set" aria-hidden="true">…same 9, alt=""…</div>
      </div>
    </div>
  </div>
</section>
```

- Section: `height: max(640px, 100svh)` (≤920px `max(560px, 100svh)`),
  `padding: 0 !important`, `position: relative`. No upper cap — the hero tracks
  the viewport at any height.
- Darkening is two-layer: video at `opacity: .82` over
  `background-color: #000 !important`, plus a black gradient scrim
  `linear-gradient(to bottom, rgba(0,0,0,.76) 0%, rgba(0,0,0,.34) 30%,
  rgba(0,0,0,.28) 56%, rgba(0,0,0,.84) 100%)`. Compositing *down* onto black
  pulls highlights without hazing the shadows.
- `.hero-layout` is `position:absolute; inset:0; width: min(1224px, 100% - 64px)`.
- `.hero-stack` is dead-centred with `top:50%; left:50%;
  transform: translate(-50%,-50%)`, plus a localised radial scrim
  `radial-gradient(ellipse 68% 62% at 50% 50%, rgba(0,0,0,.42) 0%,
  rgba(0,0,0,.26) 48%, rgba(0,0,0,0) 74%)` behind the text only.
- `.hero-cta { display:flex; flex-wrap:wrap; justify-content:center; gap:14px;
  margin-top:40px }`; at ≤920px it becomes `flex-direction: column; align-self:
  stretch`.
- **Client logo rail**: full-bleed `left/right: calc(50% - 50vw)`,
  `bottom: 34px; height: 44px; overflow: hidden`, both ends masked with
  `mask-image: linear-gradient(to right, transparent 0, #000 7%, #000 93%,
  transparent 100%)`. Logos `height: 34px; opacity: .62;
  filter: url(#ugcc-whiten)` — an inline SVG filter at the top of `<body>`
  (`feColorMatrix` alpha = 1 − luminance, RGB forced white, then
  `feComposite operator="in"`), because six of nine source logos have solid
  white backgrounds and a plain `invert()` would render them as white blocks.
  Two identical sets, translate `-50%`, 48s linear infinite.
- `--header-height` is force-overridden to `118px !important` /
  `--header-height-mobile: 95.5px !important` as a static fallback, and `hero.js`
  measures the real header and rewrites it (see §3.4).

**2. About — `#BCClZ9bf3`** (`sections.css`)

```html
<div class="block-layout block-layout--layout about-layout">
  <div class="about-stack">
    <span class="about-rule" aria-hidden="true"></span>
    <h2 class="about-statement">A multidisciplinary contractor delivering
       engineering projects across the Middle East.</h2>
    <p class="about-sub">Quality control, planning and project management held
       to one standard — in Kuwait, the GCC and internationally.</p>
    <a class="v2-btn v2-btn--on-dark" href="/about-contractor-kuwait">Read More</a>
  </div>
</div>
```

`#BCClZ9bf3 { min-height: clamp(480px, 62svh, 600px); display: flex }`;
`.about-layout { display:flex; align-items:center; width: min(1224px, 100% - 64px);
margin-inline:auto }`; `.about-stack { max-width: 720px }`;
`.about-sub { margin: 20px 0 0; max-width: 46ch; font-size:16px; line-height:1.7;
color: rgba(255,255,255,.66) }`; `.v2-btn { margin-top: 30px }`.
**Deliberately has no eyebrow** — the client had the hero's eyebrow removed, so
labelling the next section down would undo that.

**3. Who are we — `#u7vIc0iRh`** (`sections.css`)

Head as Dialect A, then an editorial index — seven full-width rows, no images,
no JS. Markup is `<nav class="wr-list" aria-label="Business lines">` containing
seven `<a class="wr-row">`, each holding four spans: `.wr-num` (`01`…`07`),
`.wr-name`, `.wr-desc`, `.wr-arrow` (`&rarr;`, `aria-hidden`).

```css
#u7vIc0iRh .wr-row {
  display: grid;
  grid-template-columns: 28px 224px 1fr 24px;
  align-items: baseline; gap: 24px; padding: 18px 0;
  overflow: hidden;
  border-bottom: .5px solid rgba(0, 42, 65, .16);
  text-decoration: none;
  box-shadow: inset 0 0 0 var(--v2-red);   /* zero-width at rest, so it transitions */
  transition: background-color .2s var(--v2-ease-out-quart),
              box-shadow .2s var(--v2-ease-out-quart);
}
#u7vIc0iRh .wr-row:hover,
#u7vIc0iRh .wr-row:focus-visible {         /* ONE rule, both states, by design */
  background-color: rgba(0, 42, 65, .07);
  box-shadow: inset 3px 0 0 var(--v2-red);
  outline: none;
}
```

The red edge is an **inset box-shadow declared at zero width**, not a
`border-left` — a border would shift every row 2px on hover. The arrow rests at
`translateX(-4px)` and travels *to* 0, so the motion happens inside the column
and the glyph is never clipped. `#u7vIc0iRh .wr-desc` uses
`rgba(0,42,65,.72)`: `.72` is the floor that clears 4.5:1 against the darkest
pixel of the background photograph (the wall runs 203–255, not pure white).

**4. Gallery rail — `#zOl98u`** (`rail.css`, `rail.js`)

`<section id="zOl98u" class="block v2-rail-block">` → `.v2-rail` → head
(Dialect B, flex) + `<div class="v2-rail__viewport" tabindex="0" role="group"
aria-label="Gallery of completed UGCC projects, scrollable">` →
`<ul class="v2-rail__track">` → 30 `<li class="v2-rail__item">` (two identical
sets of 15) → `<a class="v2-rail__card">` → `<img>` + `<span class="v2-rail__tag">`.

- Card `458 × 302` desktop, `390 × 258` at ≤1024px, `300 × 198` at ≤600px,
  `border-radius: 5px`.
- **The track carries no horizontal padding and no flex `gap`; every item owns a
  `margin-right: 16px` instead.** This is load-bearing: with `gap` + padding the
  track's border box was 10956px while the true period was 5460px, so
  `translateX(-50%)` jumped 18px every cycle. With a trailing margin, 30 items
  span exactly two periods and `-50%` is exact at every breakpoint.
- The lead-in inset lives on the **viewport** (`padding-left: 24px;
  scroll-padding-left: 24px`), where it shifts content without contributing to
  track width.
- `overflow-x: auto` in every state; `overscroll-behavior-x: contain` (without
  it, an overshooting swipe on iOS triggers back-navigation);
  `scrollbar-width: none` + `::-webkit-scrollbar { display: none }`.
- Caption `.v2-rail__tag`: absolutely positioned bottom band,
  `padding: 40px 14px 13px`, 11px `letter-spacing:.15em` uppercase white on
  `linear-gradient(to top, rgba(0,20,32,.92), rgba(0,20,32,0))`, prefixed by a
  `::before` 2×11px `var(--v2-red)` bar.
- **Do not add `scroll-snap` after handover.** It was tried: snap activates in
  the same tick `rail.js` writes the equivalent `scrollLeft`, so the browser
  quantises that write to the nearest card boundary and the rail visibly jumps
  (measured 173px at 1280). Snap is active *only* under
  `prefers-reduced-motion: reduce`.

**5. Projects — `#zd_fdi`** (`projects.css`, no JS)

Head Dialect B, then `<ul class="v2-proj__grid">` of six
`<li class="v2-proj__item">` → one `<a class="v2-proj__card">` per project
holding `<span class="v2-proj__shot">` (image + `.v2-proj__tag`),
`<h3 class="v2-proj__name">`, and `<dl class="v2-proj__meta">` of four
`<div><dt>…</dt><dd>…</dd></div>` pairs (Client / Value / Status / Contract).

```css
.v2-proj__grid { display:grid; grid-template-columns: repeat(3, minmax(0,1fr));
                 gap: 28px 24px; margin:0; padding:0; list-style:none; }
.v2-proj__item { min-width: 0; display: flex; }     /* grid-blowout guard */
.v2-proj__card { display:flex; flex-direction:column; flex:1; }
.v2-proj__shot { aspect-ratio: 16 / 10; overflow:hidden; border-radius:4px;
                 background:#0b2233; }              /* reserves the box → CLS 0 */
.v2-proj__meta { margin-top: auto; padding-top: 11px;
                 border-top: 1px solid rgba(255,255,255,.14); display:grid; gap:5px; }
```

`margin-top: auto` on the meta list pins the hairline to the card's bottom edge
so the rule aligns across a row regardless of title wrapping. `<dd>` uses
`font-variant-numeric: tabular-nums` and `overflow-wrap: anywhere` (`break-word`
does not reduce a flex item's min-content contribution).

**6. Credentials — `#zZFMdo`** (`credentials.css`, no JS)

Two columns: a claim and a ledger.

```css
.cred { width: min(1224px, 100% - 64px); margin-inline: auto; padding-block: 88px;
        display: grid; grid-template-columns: minmax(0,.85fr) minmax(0,1.15fr);
        gap: 64px; align-items: start; }
```

Left: `.cred__title` (uppercase, `<br>`-broken), `.cred__rule`, `.cred__lede`,
`<ul class="cred__stats">` of `<li>` each `<span class="cred__figure">` +
`<span class="cred__unit">`, then `.v2-btn.v2-btn--on-light` at
`margin-top: 36px`.
Right: `<dl class="cred__ledger">` of `.cred__row` = `<dt class="cred__code">`
(`<time class="cred__year" datetime="2004">` + `<span class="cred__name">`) and
`<dd class="cred__desc">`. **Two nested grids, not one** — a single three-column
grid would need `<time>` to be a sibling of `<dt>`, which is invalid inside a
`<dl>`. Fixed track widths (`168px` outer / `52px` inner, `34px` at ≤920px) keep
years and codes aligned; `auto auto` would rag the em-dash row.

**7. Offices — `#zrby1M`** (`offices.css`, no JS)

```css
.off { width: min(1224px, 100% - 64px); margin-inline: auto; padding-block: 88px;
       display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1.2fr);
       gap: 56px; align-items: stretch;
       font-family: var(--font-secondary, 'Open Sans', sans-serif); }
```

Left column `.off__col--register`: head (Dialect D), `<ol class="off__list">` of
`<li class="off__office">` each containing `<h3 class="off__country">` (+ optional
`<span class="off__hq">Head office</span>` red badge), `<address class="off__addr">`
and one or two `<p class="off__line">` label/value rows; then `.off__presence`.

`.off__office` declares `grid-template-columns: max-content minmax(0,1fr)` and
each `.off__line` **adopts those shared tracks with `subgrid`** inside an
`@supports (grid-template-columns: subgrid)` block, with a
`display:flex; min-width:76px` label fallback. A per-line `max-content 1fr`
would *not* align anything — each line is its own formatting context.

Right column `.off__col--map`: an inline `<svg class="off__map"
viewBox="0 0 100 113.4" role="img" aria-labelledby="off-map-title">` with
`<title>`, three tier groups (`.off__map-ctx`, `.off__map-op`, `.off__map-hq`),
pins, labels; below it `<ul class="off__key">` with colour swatches. The column
is `display:flex; flex-direction:column` and the map is `flex: 1 1 0;
min-height: 0` so the grid row is sized by the register alone.

**8. Careers — `#Jways5TtQ`** (`careers.css`)

```html
<section id="Jways5TtQ" class="block v2-careers">
  <div class="block-background">
    <img class="block-background__image" …>
    <div class="v2-careers__scrim"></div>
    <div class="v2-careers__rule" aria-hidden="true"></div>
  </div>
  <div class="block-layout v2-careers__layout">
    <div class="v2-careers__head">
      <div>
        <p class="v2-careers__eyebrow"><span class="v2-careers__rule-mark"></span>CAREERS AT UGCC</p>
        <h2 class="v2-careers__title">We don't fill positions. <br>We recruit <em>partners</em> <br>in construction.</h2>
      </div>
      <div>
        <p class="v2-careers__intro">…</p>
        <div class="v2-careers__cta">
          <a class="v2-btn v2-btn--red" href="/careers">Apply Here</a>
          <a class="v2-btn v2-btn--ghost" href="mailto:careers@ugcc.com">careers@ugcc.com</a>
        </div>
      </div>
    </div>
  </div>
</section>
```

`.v2-careers { position:relative; display:flex; align-items:flex-end;
overflow:hidden; min-height:560px; background: var(--v2-navy) }`.
Photo is `object-fit: cover; filter: saturate(.85)` so the red CTA stays the
warmest thing in frame. Scrim is
`linear-gradient(180deg, rgba(0,42,65,.55) 0%, rgba(0,42,65,.72) 45%,
rgba(0,21,33,.94) 100%)` — vertical, because the aerial is brightest at its top
edge and the block hands off to the black footer at its bottom.
`.v2-careers__rule` draws twelve decorative hairlines with
`background-image: linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px);
background-size: calc(100% / 12) 100%` — texture, not a grid; nothing is placed
against it.
`.v2-careers__head { display:grid; grid-template-columns: minmax(0,7fr) minmax(0,5fr);
gap: clamp(32px, 6vw, 80px); align-items: end }`.
`.v2-careers__title em { font-style: normal; color: var(--v2-red) }` — **the only
place signal red appears in running type anywhere on the homepage.**

---

## 3. Motion

### 3.1 Scroll reveal — `assets/js/sections.js` + `sections.css`

Currently applied to the About and Who-are-we blocks only. It is **opt-in by
construction**: nothing is hidden unless the script has run and found targets.

```js
var root = document.documentElement;
if (!root.classList.contains('hero-motion')) return;   // reduced motion → no-op
if (!('IntersectionObserver' in window)) return;

var targets = [];
var about = document.querySelector('#BCClZ9bf3 .about-stack');  if (about) targets.push(about);
var head  = document.querySelector('#u7vIc0iRh .wr-head');      if (head)  targets.push(head);
var rows  = document.querySelectorAll('#u7vIc0iRh .wr-row');
Array.prototype.forEach.call(rows, function (row, i) {
  row.style.setProperty('--i', i);      // positional stagger index, set inline
  targets.push(row);
});
if (!targets.length) return;

root.classList.add('v2-reveal');

var io = new IntersectionObserver(function (entries) {
  entries.forEach(function (e) {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    io.unobserve(e.target);            // fires once, then stops observing
  });
}, { threshold: 0.2 });
targets.forEach(function (t) { io.observe(t); });
```

The CSS half is **doubly gated on `.hero-motion` AND `.v2-reveal`**, both on
`<html>`:

```css
.hero-motion.v2-reveal #BCClZ9bf3 .about-stack,
.hero-motion.v2-reveal #u7vIc0iRh .wr-head,
.hero-motion.v2-reveal #u7vIc0iRh .wr-row { opacity: 0; }

.hero-motion.v2-reveal #BCClZ9bf3 .about-stack.is-in,
.hero-motion.v2-reveal #u7vIc0iRh .wr-head.is-in,
.hero-motion.v2-reveal #u7vIc0iRh .wr-row.is-in {
  animation: hero-fade-up .8s var(--v2-ease-out-expo) both;
}
.hero-motion.v2-reveal #u7vIc0iRh .wr-row.is-in {
  animation-delay: calc(var(--i, 0) * 60ms);
}
```

Summary of the contract, which **any new block must follow**:

- Selector for the mechanism: `IntersectionObserver`, `{ threshold: 0.2 }`,
  `unobserve` after first intersection.
- State class: `.is-in` on the element itself.
- Stagger: inline `--i` (integer, positional) × `60ms`.
- Entrance animation: `hero-fade-up .8s var(--v2-ease-out-expo) both`
  (`from { opacity:0; transform: translateY(18px) } to { opacity:1;
  transform: translateY(0) }`, defined in `hero.css`).
- **Never hide in CSS and reveal in JS.** A script failure must degrade to
  visible content, not a blank section. `credentials.css`, `offices.css` and
  `projects.css` explicitly refuse the builder's `.transition` classes for this
  reason (`offices-check.js` asserts no descendant computes to `opacity: 0`).

### 3.2 Hover / lift conventions

| Element | Effect |
|---|---|
| Any button (`.v2-btn`, `.grid-button--*`) | `translateY(-2px)` + `var(--v2-shadow-lift)`; `:active` → `translateY(0)` (builder buttons also `scale(.98)` with `transition-duration: .1s`) |
| `.v2-card` | `translateY(-4px)` + `0 18px 38px -20px rgba(0,21,33,.4)`, `.3s` |
| `.v2-pill` | `translateY(-2px)`, fill flips to navy/white |
| Any linked photo (`.image-wrapper`, `.v2-rail__card`, `.v2-proj__shot`) | `transform: scale(1.05); filter: brightness(1.06) saturate(1.05)` — `.5s` on the V2 cards, `.7s` on builder images |
| `.wr-row` | background tint `rgba(0,42,65,.07)` + `inset 3px 0 0 var(--v2-red)` + arrow slides `-4px → 0`, `.2s` |
| `.v2-proj__name` | colour → `--v2-red-text` (**outside** the reduced-motion gate, so a reduced-motion visitor still gets feedback) |
| `.off__link` | colour and `border-bottom-color` → `--v2-red-text`, `.25s` |
| `.social-icons__link` | `translateY(-3px)`, `opacity: .85` |
| Nav link | red 2px underline `transform: scaleX(0 → 1)` from `transform-origin: left center`, `.3s var(--v2-ease-out-quint)` |
| `.v2-rail__toggle` | background + border → `var(--v2-red)` |
| Slideshow arrows | right `translateX(4px)`; left `rotate(180deg) translateX(4px)` |

**Every hover state must also fire on `:focus-visible`.** `sections.css` puts
both selectors on **one rule** so they cannot drift apart in a later edit, and
`home-check.js` asserts that a single rule carries both.

Zoom-on-hover requires the parent to have `overflow: hidden` (`v2.css` sets it
on `.image-wrapper` globally).

### 3.3 Exact transitions in use

```
buttons                transform, background-color, box-shadow, color
                       .25s var(--v2-ease-out-quart)          [sections.css]
builder buttons        transform, box-shadow, background-color, color, border-color
                       .22s var(--v2-ease-out-quart)          [v2.css]
header frost           background-color, box-shadow, backdrop-filter, border-color
                       .35s var(--v2-ease-out-quart)          [v2.css]
nav underline          transform .3s var(--v2-ease-out-quint)
image zoom (V2)        transform, filter .5s var(--v2-ease-out-quart)
image zoom (builder)   transform, filter .7s var(--v2-ease-out-quart)
row hover              background-color, box-shadow .2s var(--v2-ease-out-quart)
link colour            color, border-color .25s var(--v2-ease-out-quart)
accordion              grid-template-rows .4s var(--v2-ease-out-quint)
table cell             background-color .22s var(--v2-ease-out-quart)
slideshow crossfade    opacity 1.15s var(--v2-ease-out-quart)
builder reveals        duration .8s, timing var(--v2-ease-out-quint)
```

Keyframes, all of them:

```
hero-word-in       .75s expo   opacity 0 → 1, translateY(.5em) → 0   (per word)
hero-fade-up       .8s  expo   opacity 0 → 1, translateY(18px) → 0
v2-shine           .8s  quart  left -60% → 120%                      (button sweep)
v2-kenburns        8s   quart  scale(1.02) → scale(1.09)             (hero slideshow)
hero-clients-roll  48s  linear translate3d(0,0,0) → translate3d(-50%,0,0)
v2-rail-drift      90s  linear translateX(0) → translateX(-50%)
```

Both marquees rely on **exactly two identical sets in the DOM** so `-50%` lands
copy 2 where copy 1 started and the loop has no seam. `will-change: transform`
is set on the drifting track and on lifting buttons, and cleared
(`will-change: auto`) once a rail is handed over.

### 3.4 Scripts

**`v2.js`** (all pages): toggles `.v2-scrolled` on `<html>` when
`window.scrollY > 24`, rAF-throttled, `{ passive: true }`; pauses
`video.block-background__image` under reduced motion; wires `.v2-acc__btn`
accordions (`.is-open` + `aria-expanded`); gives builder `.transition` siblings
an incremental `--user-animation-delay` of `Math.min(60 + i * 90, 510)` ms.

**`hero.js`** (index): measures the real header with
`getBoundingClientRect().height` and writes it to `--header-height` (or
`--header-height-mobile` below 920px) on the hero, on init, on `load`, at 600ms,
at 1800ms, and 120ms after any resize — because the builder bakes a stale
`123px` inline and the real header is ~118px. **This runs before the
reduced-motion guard on purpose: it is layout correctness, not motion.** Then,
only if reduced motion is *not* requested, it splits the `<h1>` into
`<span class="hero-word">` per word (preserving whitespace text nodes so the
accessible name is unchanged), sets `animationDelay` of `80 + i * 60`ms per
word, `afterWords + 120` for `.hero-cta`, `afterWords + 240` for
`.hero-clients`, and finally adds `.hero-motion` to `<html>`.

> **Do not reintroduce a `syncRailToWidget()`.** A previous version measured the
> rail (document coordinates) against the chat widget (viewport coordinates) and
> wrote the scroll offset into `bottom`, tearing the rail out of the hero. If the
> widget's offset changes, change `bottom: 34px` in `hero.css`.
> `tools/hero-check.js` asserts that nothing writes an inline `bottom`.

**`rail.js`** (index): does only two things CSS cannot — the pause toggle
(`data-paused` + `aria-pressed` + `aria-label` swap) and **handover**. Handover
reads the live `translateX` off `getComputedStyle().transform` (index 4 for
`matrix`, 12 for `matrix3d`), then, *in this order*: sets
`data-manual="true"` (stylesheet drops the animation) → `track.style.transform =
'none'` → `vp.scrollLeft = -dx`. Any other order renders one frame with neither
applied, which reads as a jump back to card 1. Triggers: `pointerdown`,
`touchstart`, `focusin`, and `wheel` only when `|deltaX| > |deltaY|`. Returns
immediately under reduced motion.

### 3.5 Reduced motion

Three independent layers, in order of preference:

1. **By construction** — `hero.js` never adds `.hero-motion`, so no animation
   property is ever applied to the hero or the reveals. `rail.js` returns before
   attaching anything.
2. **Gated at the source** — the marquees, the button shine and the card zooms
   live inside `@media (prefers-reduced-motion: no-preference)`, so they are
   never declared rather than being overridden.
3. **Global backstop** — `v2.css`:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: .01ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: .01ms !important;
     }
   }
   ```
   Also `html { scroll-behavior: smooth }` is itself inside
   `@media (prefers-reduced-motion: no-preference)`.

Reduced motion adds affordances rather than only removing them: the rail gains
`scroll-snap-type: x proximity` + `scroll-snap-align: start` and hides its now
meaningless pause toggle.

---

## 4. Buttons

Defined once in `assets/css/sections.css`. `#aCqA2TkE7 .hero-btn` is listed as
an additional selector on each rule so hero and page share one source with no
cross-file specificity race. The hero keeps its own class names
(`.hero-btn--primary` ≡ `--on-dark`, `.hero-btn--secondary` ≡ `--ghost`) so
`tools/hero-check.js` continues to pass.

```css
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

.v2-btn--on-dark,  #aCqA2TkE7 .hero-btn--primary   { background: #fff; color: #101010; }
.v2-btn--on-light                                  { background: var(--v2-navy); color: #fff; }
.v2-btn--on-light:hover                            { background: #063a56; }
.v2-btn--ghost, #aCqA2TkE7 .hero-btn--secondary    { border-color: rgba(255,255,255,.5); color: #fff; }
.v2-btn--ghost:hover, #aCqA2TkE7 .hero-btn--secondary:hover {
                                                     background: rgba(255,255,255,.12);
                                                     border-color: #fff; }

.v2-btn:hover,  #aCqA2TkE7 .hero-btn:hover  { transform: translateY(-2px);
                                              box-shadow: var(--v2-shadow-lift); }
.v2-btn:active, #aCqA2TkE7 .hero-btn:active { transform: translateY(0); }
```

Plus, in `assets/css/careers.css`:

```css
.v2-btn--red       { background: var(--v2-red); color: #fff; }
.v2-btn--red:hover { background: #b8161c; }
```

Shine sweep — `.v2-btn--on-dark` only:

```css
.v2-btn--on-dark, #aCqA2TkE7 .hero-btn--primary { position: relative; overflow: hidden; }
.v2-btn--on-dark::after, #aCqA2TkE7 .hero-btn--primary::after {
  content: ''; position: absolute; top: 0; bottom: 0; left: -60%; width: 40%;
  background: linear-gradient(100deg, transparent 0%, rgba(255,255,255,.85) 50%, transparent 100%);
  transform: skewX(-18deg); pointer-events: none;
}
@media (prefers-reduced-motion: no-preference) {
  .v2-btn--on-dark:hover::after,
  #aCqA2TkE7 .hero-btn--primary:hover::after { animation: v2-shine .8s var(--v2-ease-out-quart); }
}
@keyframes v2-shine { from { left: -60%; } to { left: 120%; } }
```

**Variant selection — modifiers name the ground, not the importance:**

| Variant | Ground it sits on | Landing-page call sites |
|---|---|---|
| `--on-dark` | dark (video, navy) — white pill | hero "Get in Touch"; About "Read More" |
| `--on-light` | light (white, near-white photo) — navy pill | Who-are-we "Explore More"; Credentials "View Credentials" |
| `--ghost` | **dark grounds only** (its border is white) | hero "View Projects"; Careers `careers@ugcc.com` |
| `--red` | a navy scrim where neither of the above reads as a call | Careers "Apply Here" |

Two known, accepted quirks, documented so nobody "fixes" them: the shine
gradient is white, so on the white `--on-dark` button it renders nothing at all
(it has never been visible on the hero either — left as-is because the hero is
client-reviewed); and it is deliberately not applied to `--on-light`, where a
white sweep over navy would be a pronounced effect nothing asked for.

**Mobile convention: at the narrow breakpoint every homepage CTA becomes
full-width** — `display: block; text-align: center` (About at ≤920px,
Who-are-we's head button at ≤920px, `.cred__claim .v2-btn` at ≤920px, and the
hero's `.hero-cta` switching to `flex-direction: column; align-self: stretch`).

The builder's own `.grid-button--primary` / `--secondary` on the other 66 pages
get lift/press from `v2.css` only. Those rules need `!important` on `box-shadow`
because the builder's scoped `[data-v-*]:hover` rules set it via custom
properties at higher specificity — and the `:focus-visible` rule must come
**after** the `:hover` rule or a focused-and-hovered button loses its ring.

---

## 5. Responsive

Four breakpoints exist across the V2 layer. **There is no 768px breakpoint and
none should be added.**

| Breakpoint | Files | Why |
|---|---|---|
| `min-width: 921px` | `v2.css` | desktop-only nav rework (logo sizing, absolute logo/pill, centred link group, `--link-spacing`) |
| `max-width: 1024px` | `rail.css`, `projects.css` | the two adjacent navy blocks reflow together |
| `max-width: 920px` | `hero.css`, `sections.css`, `credentials.css`, `offices.css` | **the builder's own breakpoint**, where the header swaps to its mobile layout |
| `max-width: 900px` | `careers.css` | the width where the 7/5 head split pushes the headline to four lines |
| `max-width: 640px` | `v2.css` | `.v2-tblock`, `.v2-table`, `.v2-prose`, `.v2-banner` |
| `max-width: 600px` | `rail.css`, `projects.css` | phone card sizing |

> **920 not 768.** Stated four separate times in the source
> (`hero.css:152`, `sections.css:193`, `credentials.css:152`,
> `offices.css:409`). Choosing 768 leaves a dead 769–920 band where the header
> has gone mobile but the section is still desktop. Match 920 unless you have a
> measured reason, and write the reason in a comment.

### What changes at each

**≥921px (`v2.css`)** — logo forced to `210px × 29px !important` (the builder
sizes it from per-build hashed properties, `--logo-width` is inert);
`.block-header-layout-desktop` becomes `position: relative; grid-template-columns: 1fr`;
logo and the last nav item are pulled out of flow and pinned to
`var(--padding-left)` / `var(--padding-right)` at `top: 50%; translateY(-50%)`;
`.block-header__nav-links` gets `align-items: center; justify-content: center;
min-height: 41px` (the min-height restores the row height the pill used to
supply — without it the header shrinks ~20px and every inner page's content
shifts up); `--link-spacing: clamp(12px, 10vw - 79px, 46px)` so the centred
links never collide with the logo at the narrow end.

**≤1024px** — rail item `458 → 390px`, card `302 → 258px`, rail title
`38 → 31px`; projects grid `3 → 2` columns, title `32 → 26px`.

**≤920px** — hero `height: max(560px, 100svh)`, `.hero-layout` width
`calc(100% - 32px)`, CTAs stack full-width, client logos `34 → 24px` and the
rail `bottom: 34 → 26px, height: 44 → 34px`. About `min-height:
clamp(400px, 70svh, 520px)`, statement `clamp(26px, 7vw, 31.3px)` (capped at
exactly 31.3px = 3.4vw at 920px so the size is *continuous* across the
breakpoint rather than stepping down as the window widens), sub `15px`.
Who-are-we: layout `calc(100% - 32px)`, `padding-block: 64px`, head becomes
`display: block` with a full-width button, rows become
`grid-template-columns: 28px 1fr` with name and description both on column 2 and
the arrow `display: none` (descriptions stay — this section exists to carry
them). Credentials: one column, `padding-block: 56px`, `gap: 36px`, figure
`38 → 30px`, ledger rows single-column with the year track narrowed to `34px`.
Offices: one column, `gap: 32px`, `padding-block: 64px`, `width: min(1224px,
100% - 32px)`, the map column takes `order: -1` (source order keeps the heading
first for screen readers; only the visual order changes) with
`max-width: 600px`, `.off__map { flex: none; height: auto }`, and
`.off__map-label { display: none }` (illegible below ~2px rendered).

**≤900px** — careers `min-height: 0`, layout padding `88px 16px 72px`, head
collapses to one column with `gap: 32px`.

**≤640px** — `.v2-tblock` padding `24px 12px 64px`, table `15px` with
`12px 16px` cells and wrapping first column; `.v2-prose` `48px 12px 16px`,
its h2 `26px`; `.v2-banner p` `20px`.

**≤600px** — rail block `39px 0 44px`, item `300px`, card `198px`, title `25px`,
head `padding: 0 16px`, viewport `padding-left/scroll-padding-left: 16px`.
Projects block `34px 0 38px`, container `padding: 0 16px`, grid single column
with `gap: 24px`, title `22px`, head collapses to a four-row single-column
`grid-template-areas` with `row-gap: 14px` and the exit link `justify-self: start`.

`svh` is used (not `vh`) wherever a section tracks the viewport, so mobile
URL-bar collapse does not resize the block.

---

## 6. Accessibility conventions

**Focus ring.** One global rule, in `v2.css`, with its rationale in the file:

```css
/* Red alone is only 2.76:1 on the navy surface (WCAG 2.2 SC 1.4.11 needs 3:1),
   so pair it with a white ring that sits both inside and outside it. On navy the
   white ring carries the contrast (14.9:1); on light surfaces the white ring
   vanishes and the red outline carries it (5.4:1 on white). */
:focus-visible {
  outline: 2px solid var(--v2-red);
  outline-offset: 3px;
  border-radius: 2px;
  box-shadow: 0 0 0 7px #fff;
}
```

Blocks inherit this. Two deliberate local overrides: `.v2-proj__card:focus-visible`
uses `outline-offset: 5px; border-radius: 4px` so the ring wraps the *whole card
box*, not just the image; and `.wr-row:focus-visible` replaces the ring with the
designed tint + red edge, then **restores a real outline** where the platform
asks for one:

```css
@media (forced-colors: active) { #u7vIc0iRh .wr-row:focus-visible { outline: 2px solid CanvasText; } }
@media (prefers-contrast: more) { #u7vIc0iRh .wr-row:focus-visible { outline: 2px solid var(--v2-navy); outline-offset: -2px; } }
```

**Heading levels.** Exactly one `<h1>` per page (`.hero-title`). Every block's
own title is an `<h2>`. `<h3>` is reserved for repeated items *inside* a block —
project card names, office country names. Never skip a level, and never pick a
tag for its size (the size is always declared in CSS anyway).

**ARIA actually in use on the landing page:**

- `aria-hidden="true"` on every decorative element: rules/marks
  (`.about-rule`, `.cred__rule`, `.v2-careers__rule`), the `.wr-arrow` glyph, the
  duplicate marquee sets (so the page announces 9 clients and 15 projects, not 18
  and 30), the em-dash standing in for a missing year, and all SVG icons
  (`aria-hidden="true" focusable="false"`).
- `aria-label` on landmarks and regions: `<div class="hero-clients"
  aria-label="Selected clients">`, `<nav class="wr-list" aria-label="Business
  lines">`, `<div class="v2-rail__viewport" tabindex="0" role="group"
  aria-label="Gallery of completed UGCC projects, scrollable">`.
- **`aria-label` on every project card anchor**, holding title + sector + value +
  status, e.g. `"6th Ring Road to Interchange 82, Salmi Road — Roads and Bridges,
  487.2M USD, completed 2022"`. Without it the accname algorithm concatenates the
  image alt first and every card announces a ~30-word name. The label **must
  begin with the visible heading text** so SC 2.5.3 (Label in Name) holds;
  `projects-check.js` asserts that prefix.
- `aria-pressed` + a swapped `aria-label` on the rail's pause toggle.
- `role="img"` + `aria-labelledby` → `<title>` on the offices map SVG.
- `aria-expanded` on `.v2-acc__btn`, toggled by `v2.js`.

**Other established rules:**

- **WCAG 2.2.2** — content that moves for more than five seconds needs a pause
  mechanism available to *every* user. Hover/focus pausing does not satisfy it
  for touch. The rail's visible toggle is the reason its autoplay is shippable.
  A control that no longer does anything is `display: none`, not disabled, so it
  is not reachable.
- One anchor per card → one tab stop. Focusing a rail card triggers handover so
  a keyboard user is never chasing a moving target.
- Status and tier meaning are carried by **words and a legend**, never colour
  alone.
- Descriptive `alt` on every content photograph (they carry the section's
  meaning; empty `alt` is wrong here). Decorative wrappers carry none.
- `<address>` wraps postal addresses; `tel:` links use E.164
  (`tel:+96522054250`) while displaying the spaced form; `<time datetime="2004">`
  for years.
- Contrast is *computed against the actual background*, including the darkest
  pixel of a background photograph — see `.wr-desc` at `rgba(0,42,65,.72)` and
  `.cred__unit` at `#6b747c`. Do not lighten secondary text without re-measuring.
- Never hide content in CSS and reveal it in JS (§3.1).

---

## 7. Conventions and hazards

### 7.1 Builder markup: replace, do not modify

The rule that governs everything:

> **Do not edit builder markup in place. Either leave a builder block completely
> alone, or replace its contents wholesale with hand-authored V2 markup inside
> the original `<section class="block" id="…">` shell.**

Reasons, all evidenced in the repo:

- The builder bakes **per-build hashed custom properties** onto elements
  (`--v4cfc8878`, `--v6f401cb2`, `--v79d8fbfe`). They are meaningless names that
  can change on any re-export. `v2.css` deliberately overrides the *resolved*
  properties (e.g. the logo's `width`/`height`) rather than referencing a hashed
  name.
- Layout depends on inline custom properties on the wrapper you would delete.
  Removing the wrapper turns `padding: var(--block-padding)` into an invalid
  declaration whose result is browser-dependent (see §2.1).
- Structural CSS selectors let one rule reach all 67 pages with **no HTML edit at
  all** — the "Contact us" pill is
  `.block-header .block-header-item:last-child .item-content`. Prefer this for
  anything site-wide.
- Anything you *do* change site-wide changes 66 pages that have no review and no
  test coverage. The About spec lists "restyling the builder's `.grid-button` on
  the other 66 pages" as an explicit non-goal.

### 7.2 Buildless, and staying that way

67 static HTML pages, no `package.json`, no bundler, no React. React Bits
components were requested and were **ported to vanilla JS/CSS instead** — the
effects are 30–60 lines of transform and opacity work; the React is a wrapper.
All V2 JS is ES5 IIFEs with no dependencies. Revisit only for genuinely stateful
UI (a filtered gallery, a multi-step form). Animated text does not justify a
build step.

### 7.3 Progressive enhancement is mandatory

Every V2 block must render completely with its JavaScript deleted:

- The rail still drifts (CSS keyframes), still pauses on hover, still scrolls.
- The hero renders static and fully visible.
- The reveals never hide anything.
- Credentials, projects and offices ship **no JavaScript at all** and explicitly
  refuse the builder's `.transition` reveal classes, which start at `opacity: 0`
  and depend on `main.js`.

### 7.4 Hazards list

1. **`?v=` cache-busters.** Bump on every edit, in every HTML file that links
   the asset (§0).
2. **`z-index: 14`.** Drop `.block-layout` and your content disappears behind
   `.block-background` (§2.1).
3. **Orphaned `--block-padding` etc.** Set `padding: 0` explicitly when you
   strip a builder wrapper (§2.1).
4. **Headings outside `.text-box` lose their font.** Declare
   `font-family` + `font-weight: 400` on every V2 heading (§1.5).
5. **The two reds are not interchangeable** (§1.1). `home-check.js` asserts
   this because getting it backwards is invisible in a screenshot.
6. **`max-width` + `vw` padding shrinks the container as the viewport grows.**
   Use `width: min(1224px, 100% - 64px)` (§1.6).
7. **Marquee period arithmetic.** No `gap` and no track padding — trailing
   `margin-right` on each item, or `-50%` drifts out of sync (§2.4, rail).
8. **`scroll-snap` after rail handover jumps up to a full card.** Snap only
   under reduced motion (§2.4, rail).
9. **Header height is measured, not hardcoded.** `hero.js` owns it; the CSS
   value is a fallback only. Touching the nav changes it (§3.4).
10. **Never measure a live page and write the reading back into layout.** The
    deleted `syncRailToWidget()` compared document coordinates against viewport
    coordinates and wrote the scroll offset into `bottom` (§3.4).
11. **`overflow-wrap: break-word` does not fix flex blowout**; `anywhere` does
    (`projects.css:216`).
12. **The offices map's colours and stroke widths are tuned for dichromat
    contrast and against anti-aliasing seams.** Never exceed `stroke-width: .3`;
    never restore a contrasting stroke on the context tier; re-plot the whole
    luminance curve before re-tuning `#4c9fc9` (`offices.css:291–353`).
13. **`#zrby1M` must never be hidden at any width.** It previously carried
    `block--mobile-hidden`; nothing may reintroduce a rule that hides it.
14. **Header condensing on scroll was tried and reverted.** Shrinking the
    header's padding shifted `.page__blocks` up by 30px on every inner page.
    Frost-only. The `border-bottom` is reserved as `transparent` at rest so
    toggling `.v2-scrolled` only ever changes its colour, never the box height.
15. **`rgb(255, 0, 0)`** survives in builder inline styles on the slideshow dots
    and arrows (`--navigationDotsColor`, `--navigationArrowsColor`). It is not
    the brand red and is a known outstanding item.
16. **Comment the *why*, not the *what*.** Every non-obvious number in these
    stylesheets carries a comment naming the measurement that produced it
    (`224px` not `211px`; `76px` not `68px`; `.72` not `.62`; `300px` not
    `338px`; `stroke-width: .2`). Preserve those comments; add one whenever you
    pick a number that looks arbitrary. Several read "do not re-add", "do not
    fix this", "non-negotiable" — treat them as binding.

### 7.5 When adding a block to another page

1. Write a per-section stylesheet in `assets/css/`, link it after the existing
   V2 sheets with `?v=1`.
2. Keep the builder `<section class="block" id="…">` shell; replace its contents.
3. Set `padding: 0` on the section; own spacing from your own wrapper at
   `width: min(1224px, 100% - 64px); padding-block: 88px`.
4. If you dropped `.block-layout`, add `position: relative; z-index: 14`.
5. Open with the head pattern (§2.3) using the eyebrow colour that matches your
   ground.
6. Use `.v2-btn` + the variant named for your ground; make it full-width at
   ≤920px.
7. Breakpoint at 920px (or 1024/600 if you are matching the rail/projects
   family).
8. Ship it working with JS disabled; add reveals only via the `.hero-motion` +
   `.v2-reveal` + `.is-in` contract.
9. Add a `tools/<block>-check.js` console harness asserting the invisible
   decisions.

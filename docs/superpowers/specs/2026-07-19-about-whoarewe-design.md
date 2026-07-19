# About and Who-are-we recomposition — design

Branch: `hero-recompose` (continues the above-the-fold work)
Scope: the two homepage blocks directly below the hero — `#BCClZ9bf3` (About) and
`#u7vIc0iRh` (Who are we) — plus extracting the hero's button into a shared
component.

## Problem

Both blocks were laid out by the site builder and neither has been composed.

Measured on a 1280x720 viewport with the site served locally:

- **About (`#BCClZ9bf3`) is 726px tall and holds 43 words.** Three centred
  elements — a heading, a paragraph, a button — floating in a navy field with no
  hierarchy between them. The heading is the literal string
  `ABOUT / UNITED GULF CONSTRUCTION COMPANY`, which is a label, not a statement.
  The section reads as an unfinished placeholder.
- **Who-are-we (`#u7vIc0iRh`) is 1394px tall on a 46-row hand-tuned grid.** Every
  numeral, service name and description is a separately positioned
  `.layout-element` with explicit `--grid-row` / `--grid-column`. DOM order does
  not match visual order: the intro paragraph is first in the DOM but appears
  mid-section, `WHO ARE WE` is the ninth element, and `Explore More` sits between
  services 03 and 04. It is unmaintainable and its reading order is wrong for
  screen readers.
- **The hero now duplicates Who-are-we.** The recomposed hero strip shows ROADS
  AND BRIDGES, CIVIL INFRASTRUCTURE and BUILDING CONSTRUCTION. Who-are-we
  re-lists those same three as 01–03 in a near-identical flat treatment, then
  adds four more. Two adjacent sections saying the same thing the same way.
- **Neither section's button matches the hero.** Both are builder
  `.grid-button--primary` elements: a black pill with `--border-radius: 31px`
  driven by fifteen inline custom properties, no lift, no shine, no transition
  beyond a background swap. Directly below the hero's white pill CTAs, they read
  as belonging to a different site.
- **Three of the seven service descriptions open with "United Gulf Construction
  Company".** Fine in isolation, repetitive when the seven are read as a list.

## Goals

1. Give About a real composition — one statement carrying the section, with
   supporting copy demoted beneath it.
2. Make Who-are-we the page's authoritative business-lines moment: all seven
   services, in DOM order, each one linked.
3. Differentiate Who-are-we from the hero strip by treatment, so the repeated
   three names read as continuity rather than duplication.
4. Extract one button component shared by hero, About and Who-are-we.
5. Cut Who-are-we's height roughly in half while showing more information.
6. Keep the site buildless — no React, no bundler, no new runtime dependencies.

## Non-goals

- Restyling the builder's `.grid-button` on the other 66 pages. Those pages have
  no review and no test coverage; a global override would change them silently.
- New photography. The design uses no images beyond the existing
  `.block-background` on each section.
- Touching the hero's rendered output. `.hero-btn` keeps its exact computed
  styles so `tools/hero-check.js` continues to pass unchanged.

## Decisions taken during brainstorming

| Question | Decision |
| --- | --- |
| Hero strip vs Who-are-we overlap | Who-are-we owns all seven; hero strip stays a teaser of three |
| About's purpose | Stays a positioning statement, not a stats block |
| About height | Full-bleed, ~600px, earning the height with display type |
| About background | Flat `var(--v2-navy)`, as now |
| Who-are-we layout | Editorial index — seven full-width rows, no images, no JS |
| Button scope | Shared `.v2-btn` across the three homepage sections only |
| Copy | Rewrites accepted for both the About statement and all seven descriptions |

## Button component

New in `assets/css/sections.css`, lifted from the hero's existing `.hero-btn`
rules:

```
.v2-btn                pill, 15px/600, 15px 32px, 1px transparent border,
                       transitions transform / background-color / box-shadow /
                       color at .25s var(--v2-ease-out-quart)
.v2-btn:hover          translateY(-2px) + var(--v2-shadow-lift)
.v2-btn:active         translateY(0)
.v2-btn--on-dark       #fff ground, #101010 text — sits ON a dark ground
.v2-btn--on-light      var(--v2-navy) ground, #fff text — sits ON a light ground
.v2-btn--ghost         transparent, 1px rgba(255,255,255,.5) border, #fff text
```

The variants are named for the ground they sit on, not by importance. An
earlier draft used `--primary` / `--dark`, which mixed two axes for two things
that are not opposites: `--primary` was the white button and `--dark` the navy
one, so anyone building on the near-white Who-are-we ground would reach for
"primary" and get a white pill on white.

Only `.v2-btn--on-dark` carries the shine sweep (`::after`, `v2-shine`
keyframes — renamed from `hero-shine` when it moved out of `hero.css`), gated
behind `@media (prefers-reduced-motion: no-preference)`. It is deliberately not
on `--on-light`: the gradient is white, so over navy it would be a pronounced
sweep nothing in the design asked for. Note that over the white `--on-dark`
button it is white-on-white and renders nothing — the hero's shine has never
actually been visible. Left as-is rather than corrected, because the hero is
finished and client-reviewed.

The hero keeps its markup. Its button rules **move out of** `hero.css` into
`sections.css`, where `#aCqA2TkE7 .hero-btn` is listed as an additional selector
on each `.v2-btn` rule — `.hero-btn--primary` alongside `--on-dark`,
`.hero-btn--secondary` alongside `--ghost`. The hero's own class names are
unchanged; only the shared variants are renamed. One source, no cross-file
specificity race. `#aCqA2TkE7 .hero-cta` is layout, not button treatment, and
stays in `hero.css`. The hero's computed styles must be identical before and
after, proven by `tools/hero-check.js`.

Call sites: hero `Get in Touch` + `View Projects`, About `Read More`,
Who-are-we `Explore More`.

## About — `#BCClZ9bf3`

Replace the `.block-layout` subtree. The `<section>`, its inline custom
properties and its `.block-background` (flat `rgb(0, 42, 65)`) are untouched.

```html
<div class="block-layout block-layout--layout about-layout">
  <div class="about-stack">
    <span class="about-rule" aria-hidden="true"></span>
    <h2 class="about-statement">A multidisciplinary contractor delivering
      engineering projects across the Middle East.</h2>
    <p class="about-sub">Quality control, planning and project management held to
      one standard — in Kuwait, the GCC and internationally.</p>
    <a class="v2-btn v2-btn--on-dark" href="/about-contractor-kuwait">Read More</a>
  </div>
</div>
```

Layout:

- Section `min-height: clamp(480px, 62svh, 600px)`, `display: flex`,
  `padding: 0`.
- `.about-layout` is `width: min(1224px, 100% - 64px); margin-inline: auto;`
  `display: flex; align-items: center;` — the same column the hero uses, so the
  left edge of the statement aligns with the left edge of the hero's service
  strip.
- `.about-stack` `max-width: 720px`, left-aligned.
- `.about-rule` — a bare 48px × 2px bar in `--v2-red-text`, 24px above the
  statement. **No eyebrow text.** An earlier draft opened this section with a
  letterspaced `ABOUT UGCC` label mirroring `.hero-eyebrow`; the client
  subsequently had the hero's eyebrow and supporting line removed
  (commit `44db460`, headline-only composition), so reintroducing one section
  lower would undo that call. The rule alone marks the section start and
  carries the brand colour. It is `aria-hidden` — it is decoration, and the
  `<h2>` is the section's real name.
- `.about-statement` — `clamp(28px, 3.4vw, 46px)`, `line-height: 1.15`,
  `color: #fff`, `max-width: 16ch` per line target. It is an `<h2>`: the page
  currently jumps from the hero `<h1>` to `<h3>`, which this fixes.
- `.about-sub` — 16px, `line-height: 1.7`, `rgba(255,255,255,.66)`,
  `max-width: 46ch`, `margin-top: 20px`.
- Button `margin-top: 30px`.

No corner mark, no graphic element. The height is carried by the statement and
the negative space around it.

Mobile (≤920px): `min-height: clamp(400px, 70svh, 520px)`, column width
`calc(100% - 32px)`, statement floor 26px, button full-width and centred to match
the hero's mobile CTA treatment.

## Who-are-we — `#u7vIc0iRh`

Replace the entire 46-row `.block-layout` subtree. The `<section>` and its fixed
`.block-background` image (`stock-…-photo-1566041510639` — the white wall) stay.

```html
<div class="block-layout block-layout--layout wr-layout">
  <header class="wr-head">
    <div class="wr-head__text">
      <p class="wr-eyebrow"><span class="wr-rule"></span>WHO ARE WE</p>
      <h2 class="wr-title">Seven disciplines, one contractor</h2>
      <p class="wr-intro">Technical excellence and innovative solutions across
        complex infrastructure and building projects.</p>
    </div>
    <a class="v2-btn v2-btn--on-light" href="/business-lines-construction-services-kuwait">Explore More</a>
  </header>
  <nav class="wr-list" aria-label="Business lines">
    <a class="wr-row" href="…"><span class="wr-num">01</span><span class="wr-name">ROADS AND BRIDGES</span><span class="wr-desc">…</span><span class="wr-arrow" aria-hidden="true">→</span></a>
    … ×7 …
  </nav>
</div>
```

The seven rows, in order, with their existing hrefs preserved verbatim:

| # | Name | href | Description (rewritten) |
| --- | --- | --- | --- |
| 01 | ROADS AND BRIDGES | `/roads-and-bridges-contractor-kuwait` | Highways, complex bridges, viaducts, tunnels and related infrastructure |
| 02 | CIVIL INFRASTRUCTURE | `/civil-infrastructure-kuwait` | Design and delivery of large-scale civil infrastructure projects |
| 03 | BUILDING CONSTRUCTION | `/building-construction-kuwait` | Housing, schools, universities, warehouses and residential complexes |
| 04 | OIL AND GAS | `/oil-and-gas-construction-kuwait` | Plants, pipelines and facilities for the oil and gas industry |
| 05 | WATER MANAGEMENT | `/water-treatment-plant-kuwait` | Water and wastewater treatment and management projects |
| 06 | ELECTRO-MECHANICAL | `/electro-mechanical-contractor-kuwait` | Electro-mechanical works across industrial and building projects |
| 07 | MICRO-TUNNELING | `/micro-tunneling-kuwait` | Trenchless pipeline installation, delivered internationally |

Layout:

- `.wr-layout` — same `min(1224px, 100% - 64px)` column, `padding-block: 88px`.
- `.wr-head` — `display: flex; justify-content: space-between; align-items:
  flex-end; gap: 40px;` with a `border-bottom: 1px solid rgba(0, 42, 65,.22)` and
  `padding-bottom: 24px`. `.wr-head__text` `max-width: 520px`.
- `.wr-title` — `clamp(22px, 2.2vw, 32px)`, `color: var(--v2-navy)`. Also an `<h2>`.
- `.wr-row` — `display: grid; grid-template-columns: 28px 200px 1fr 24px;`
  `align-items: baseline; gap: 24px; padding: 18px 0;`
  `border-bottom: .5px solid rgba(0, 42, 65,.16)`, `text-decoration: none`.
  Last row keeps its border so the list closes.
- `.wr-num` — 13px, `rgba(0, 42, 65,.35)`.
- `.wr-name` — 15px, weight 700, `letter-spacing: .04em`, `var(--v2-navy)`.
- `.wr-desc` — 14px, `line-height: 1.6`, `rgba(0, 42, 65,.62)`.
- `.wr-arrow` — 15px, `rgba(0, 42, 65,.28)`, `transition: transform`.

Hover and `:focus-visible` share one rule — the keyboard state must be visually
identical to the mouse state, not a browser default outline:

- ground tints to `rgba(0, 42, 65,.045)`, bleeding to the full column width via
  negative inline margin + matching padding
- `box-shadow: inset 2px 0 0 var(--v2-red)` for the left edge, so no layout
  shift (a `border-left` would move every row 2px)
- `.wr-num` and `.wr-arrow` go to `var(--v2-red)`

The red on this section is `--v2-red` (`#d41c22`), **not** the `--v2-red-text`
(`#e8635e`) the hero and About use. `--v2-red-text` is a lightened salmon chosen
for legibility on dark video; on a near-white ground it falls to roughly 2.9:1
and fails. `--v2-red` clears 5.3:1 on white. Same rule applies to `.wr-eyebrow`
and `.wr-rule`.
- `.wr-arrow` `transform: translateX(4px)`
- transitions at `.2s var(--v2-ease-out-quart)`

Because `.wr-row` is one anchor wrapping all four spans, each row has a single
accessible name that reads "01 ROADS AND BRIDGES Highways, complex bridges…" —
which is correct and needs no `aria-label`.

Mobile (≤920px): `padding-block: 64px`; `.wr-head` stacks with the button
full-width below the intro; `.wr-row` becomes
`grid-template-columns: 28px 1fr` with `.wr-desc` spanning column 2 on a second
line and `.wr-arrow` hidden. Descriptions stay visible — unlike the hero strip,
which hides them on mobile, this section exists to carry them.

Expected height at 1280px: ~860px, down from 1394px, while showing seven
descriptions instead of seven names.

## Motion

Reuse the hero's gate. `assets/js/hero.js` already adds `.hero-motion` to
`<html>` only when the user has not requested reduced motion; the new rules hang
off the same class, so the reduced-motion path is static by construction.

A single `IntersectionObserver` in a new `assets/js/sections.js` adds
`.is-in` to `.about-stack` and to each `.wr-row` as they cross 20% of the
viewport, with the seven rows staggered by 60ms via an inline
`--i` custom property. Animation is the existing `hero-fade-up` keyframe —
declared once in `hero.css`, referenced from `sections.css`.

If `.hero-motion` is absent, `sections.js` does not observe at all and every
element is at its final state from first paint.

## Files

| File | Change |
| --- | --- |
| `index.html` | Replace the `.block-layout` subtree of `#BCClZ9bf3` and `#u7vIc0iRh`; add `sections.css` and `sections.js` |
| `assets/css/sections.css` | New — `.v2-btn`, About, Who-are-we |
| `assets/css/hero.css` | `.hero-btn` becomes an alias of `.v2-btn`; no computed-style change |
| `assets/js/sections.js` | New — scroll-reveal observer, gated on `.hero-motion` |
| `tools/home-check.js` | New — extends the `hero-check.js` pattern to both sections |

## Verification

`tools/home-check.js`, dependency-free and run at 1280×720 like its predecessor:

1. All seven `.wr-row` elements exist, in DOM order 01–07.
2. Each row's `href` matches the table above exactly.
3. Each row has a non-empty `.wr-desc`.
4. `#BCClZ9bf3` `offsetHeight` ≤ 600.
5. `#u7vIc0iRh` `offsetHeight` < 1000 (was 1394).
6. Exactly one `<h1>` on the page, and both new sections use `<h2>`.
7. Every `.v2-btn` computes the same `border-radius`, `padding` and
   `font-weight` as `#aCqA2TkE7 .hero-btn`.
8. `.wr-row:focus-visible` computes the same `box-shadow` as `.wr-row:hover`.
9. With `.hero-motion` absent, every `.wr-row` computes `opacity: 1`.
10. `.wr-eyebrow` and the hovered `.wr-num` compute `--v2-red` (`#d41c22`), not
    `--v2-red-text` — the light-ground section must not inherit the hero's
    dark-ground salmon.

Manual, not covered by the script:

- 375px layout for both sections.
- Contrast of `.wr-desc` at `rgba(0, 42, 65,.62)` on the white-wall background
  image — must clear 4.5:1 against the lightest pixel of that image.
- The chat widget (`#glass-ai-widget-host`, fixed bottom-right) against the
  Who-are-we `Explore More` button and the last row.

## Deferred

- Adopting `.v2-btn` on the remaining 66 pages.
- Option C from brainstorming: a sticky image panel beside the index that swaps
  to the hovered service. Needs a seventh division photo (`div-oil` does not
  exist) and JS; the index is designed so this can be layered on without
  restructuring the rows.

# Hero recomposition and nav modernization — design

Branch: `hero-recompose`
Scope: the homepage hero (`index.html`) and the site-wide header.

## Problem

The homepage hero has a composition problem, not a styling problem.

Measured on a 1280x720 viewport with the site served locally:

- The hero section (`#aCqA2TkE7`) is **1073px tall**. The viewport is 720px.
- The three service columns — ROADS AND BRIDGES, CIVIL INFRASTRUCTURE, BUILDING
  CONSTRUCTION, with their descriptions — sit at **y=814–923**. They are never
  visible on load. Nobody on a laptop sees them without scrolling, and by then
  the next section is competing for attention.
- The headline is unsupported. "WE BUILD BETTER" has no subheading. The strongest
  facts the company has — Grade-I contractor, ISO certified, 60+ completed
  projects across the GCC — appear in the meta description and nowhere on screen.
- The background overlay is a flat 70% black (`--v3f9ca25a: 0.70` on
  `.block-background__overlay--fixed`), which flattens a dramatic aerial shot
  into gray mud.
- The only exit from the hero is `/contact-us`, which asks for commitment before
  showing any evidence of capability.
- The header is 123px tall — 17% of a 720px viewport — and does not change on
  scroll beyond a barely-perceptible tint.

Adding animation to this hero without fixing the composition would be polish on a
cracked surface: the service columns stay invisible whether or not they fade in
nicely.

## Goals

1. Fit the entire hero composition inside a 720px viewport.
2. Bring the three service columns above the fold.
3. Give the headline supporting context and a second, lower-commitment CTA.
4. Modernize the nav, including a condensing frosted-glass scrolled state.
5. Keep the site buildless — no React, no bundler, no new runtime dependencies.

## Non-goals

- The slideshow section further down the homepage (`#zOl98u`).
- Any other page's body content.
- The chat widget, the footer, or the Google Maps embed.
- Introducing React or a build step. See "React Bits" below.

## React Bits

The user asked about using React Bits components. React Bits ships React
`.jsx` components depending on framer-motion or GSAP. This site is 67 static
HTML pages with no `package.json`, no build step, and no React. A React Bits
component cannot be dropped in.

Decision: **port the effects to vanilla JS and CSS.** The components we want
(Split Text, Blur Text, animated underline, shine-sweep button) are each 30–60
lines of transform and opacity work. The React is a wrapper; the effect is not.
This keeps the site deployable by copying files onto shared hosting, which is
its current deployment model.

Revisit only if genuinely stateful UI is needed later — a filtered project
gallery, a multi-step contact form. Animated text does not justify a build step.

## Color

The logo PNG's palette was decoded directly. Its core red fill is **`#D41C22`**
(hue 358 degrees, saturation 0.77, lightness 0.47). The CSS `rgb(255, 0, 0)`
found in builder inline styles was never a match — it is hotter and more
saturated than the mark it sits beside.

`assets/css/v2.css` already defines `--v2-red: #d31225`, within two points of
the logo red. This is a correction to align with the logo, not a rebrand.

Contrast ratios computed against the hero scrim (`#0D2231`):

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--v2-red` | `#D41C22` | Fills, underlines, borders, solid buttons | White on it: 5.26:1 — passes AA |
| `--v2-red-text` | `#E8635E` | Small red text on dark (the eyebrow) | 4.94:1 on scrim — passes AA |

`#D41C22` as small text on the scrim is only 3.09:1 and fails AA, which is why
the second stop exists. Do not use `--v2-red` for small text on dark.

Pure `rgb(255, 0, 0)` survives in builder inline styles on the slideshow dots
and arrows (`--navigationDotsColor`, `--navigationArrowsColor`). Out of scope
here; note it for a later pass.

## Nav

Chosen scrolled-state treatment: **condensed frosted glass** (option 3 of three
presented).

### Resting state

- Logo width reduced from 342px to 210px via the existing `--logo-width`
  custom property. No markup change.
- Nav links keep their current spacing. Hover draws a `#D41C22` underline that
  wipes in from the left. The active page keeps a persistent underline.
- "Contact us" is promoted to an outlined pill by targeting
  `.block-header-item:last-child .item-content`. **No HTML edit** — this works
  across all 67 pages from CSS alone.

### Scrolled state (past 24px)

- Header height animates 123px to 76px; logo scales down proportionally.
- Background goes from the current `rgba(0, 42, 65, 0.92)` to
  `rgba(0, 42, 65, 0.70)`.
- `backdrop-filter: blur(22px) saturate(1.4)` — up from `blur(14px)
  saturate(1.15)`. At 92% opacity there was nothing left to blur through; the
  effect was already implemented but smothered.
- A `0.5px solid rgba(255, 255, 255, 0.14)` bottom hairline. This is load-bearing:
  it prevents the header dissolving into light backgrounds on inner pages.
- Mobile keeps its current 95px height. 95px is already tight on a phone and
  shrinking it further degrades the tap target.

The `.v2-scrolled` class and its 24px threshold already exist in `v2.js`. Only
the CSS attached to it changes.

### Risk

The builder uses `--header-height: 123px` in layout calculations. Animating the
header height may cause page content to jump when the transition fires. This
must be verified on both the homepage and at least two inner pages. If the
coupling proves tangled, fall back to frosted-glass-without-condensing (option 2)
and report that rather than fighting it.

## Hero

Chosen composition: **centered statement** (option B of three presented), which
is closest to the current approved design. Top to bottom:

1. **Eyebrow** — new. `GRADE-I CONTRACTOR · KUWAIT & THE GCC`, 12px, letterspaced
   0.16em, `--v2-red-text`.
2. **Headline** — `WE BUILD BETTER` unchanged in size and weight. The hardcoded
   inline `color: rgb(255, 255, 255)` on its nested `<span>` is removed so CSS
   can own the color.
3. **Supporting line** — new. White at 72% opacity, max-width 540px for a
   readable measure. Proposed copy:

   > Major infrastructure, buildings, roads, and oil and gas projects — 60+
   > delivered across Kuwait and the Gulf.

   Every claim here is drawn from the existing page metadata (Grade-I, ISO
   certified, 60+ completed projects, Kuwait and GCC). **No claim about company
   age or founding year appears anywhere in the repo**, so none is made. If
   marketing wants a "sixty years of..." style line, they must supply and verify
   the number.
4. **Buttons** — `Get in touch` stays primary (solid white, `/contact-us`).
   `View projects` is added as an outlined secondary pointing at
   `/construction-projects-kuwait`.
5. **Service strip** — the three existing columns move from y=814 into a divided
   strip at the hero's bottom edge, above the fold. Content is unchanged; only
   grid placement moves.

Hero height is reduced from 1073px to `100svh` with a `min-height: 640px` floor
and a `max-height: 860px` ceiling. The header overlays the hero rather than
displacing it, so the hero occupies the full viewport and the composition is
laid out within it — eyebrow through buttons centered in the free space, service
strip pinned to the bottom edge.

`svh` rather than `vh` so mobile browser chrome does not push the service strip
off-screen. The floor prevents the composition crushing on short laptop windows;
the ceiling prevents absurd stretching on tall monitors.

### Overlay

The flat 70% black is replaced with a gradient scrim: heavier at the top and
bottom edges, lighter through the middle where the footage is most legible.
Net result is a brighter, sharper hero than today's, not a darker one.

## Motion

Vanilla ports of React Bits effects. All wrapped in
`@media (prefers-reduced-motion: no-preference)`.

| Element | Effect | Detail |
|---|---|---|
| Eyebrow | Blur Text | Blur-to-sharp, fires first |
| Headline | Split Text | Per-word rise and fade, 60ms stagger |
| Supporting line, buttons | Fade up | Follows the headline |
| Primary button | Shine sweep | Slow diagonal highlight on hover, plus lift and press |
| Service strip | Staggered fade-up | Reuses the `--user-animation-delay` mechanism already in `v2.js` |

Split Text wraps words, not characters. Character-level splitting on a headline
this large produces a busy, cheap-looking cascade and harms screen readers more
for less payoff.

Text must be split in a way that preserves the accessible name of the `<h1>`.
Wrap words in spans within the existing element rather than replacing its
contents with per-word nodes that lose the original text node semantics.

## Files

| File | Change |
|---|---|
| `assets/css/v2.css` | Extend — nav resting and scrolled states, red token correction. Applies to all 67 pages. |
| `assets/css/hero.css` | New — hero layout, scrim, eyebrow, buttons, service strip. |
| `assets/js/hero.js` | New — Split Text and Blur Text ports, reveal sequencing. |
| `index.html` | Edit — eyebrow, supporting line, second button, grid placement, remove inline color on headline span. Homepage only. |

Nothing is deleted. Every change is additive and revertible.

`hero.css` and `hero.js` are loaded only by `index.html`, which keeps the hero
work off the other 66 pages. The nav work is deliberately site-wide.

## Verification

1. Homepage at 1280x720: the entire hero composition, including all three
   service columns, is visible without scrolling.
2. Header condenses on scroll with no content jump — checked on the homepage and
   at least two inner pages.
3. Nav renders correctly on inner pages, which have light backgrounds. The
   bottom hairline must keep the header distinct.
4. `prefers-reduced-motion: reduce` disables all hero motion; content is still
   fully visible and correctly laid out.
5. The `<h1>` accessible name is still exactly "WE BUILD BETTER" after splitting.
6. Mobile at 375px: header height unchanged, hero content stacks, service
   descriptions follow their existing mobile-hidden behavior.
7. Keyboard focus is visible on both hero buttons and every nav link.

## Deferred

- Pure red in slideshow dot and arrow inline styles.
- The slideshow section itself.
- Absolute `og:url` and JSON-LD URLs, still root-relative pending the real domain
  (noted in README).

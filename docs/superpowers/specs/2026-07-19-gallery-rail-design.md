# Homepage gallery → captioned scroll-linked rail — design

Branch: `hero-recompose`
Scope: the homepage slideshow section (`#zOl98u` in `index.html`), the block
directly below WHO ARE WE.

This is the section the hero-recompose spec explicitly listed as a non-goal.
It is now in scope on its own terms.

## Problem

The section is a full-bleed slideshow: 15 aerial JPEGs stacked absolutely,
crossfading on a timer, with 15 dots and two arrows.

Measured on a 1280x720 viewport with the site served locally:

- The section is **1029px tall** — more than a full viewport — and carries no
  text of any kind. A whole screen of scroll communicates nothing.
- Slides advance on a ~4s timer, so a full cycle takes about a minute.
  A visitor who lingers 8 seconds sees two photos out of fifteen, chosen by
  where the timer happened to be. **Thirteen of the fifteen are never seen.**
- No photo is labelled. These are UGCC's own drone shots of delivered assets —
  interchanges, a wastewater treatment plant, a residential city, a KOC
  gathering centre. Unlabelled and unlinked, they are indistinguishable from
  stock photography.
- It reads as a second hero. Full-bleed imagery immediately after the hero
  video stalls the page rather than advancing the argument.
- It duplicates the block below. `#zd_fdi` (PROJECTS) already shows project
  imagery, with names attached.
- All 15 images are 1920w JPEGs (~7 MB) and all load eagerly, for a section
  most visitors scroll past.

The section's problem is not styling. It is that it spends the site's most
expensive resource — a full screen of attention — on content that is
simultaneously unreadable, mostly invisible, and redundant with its neighbour.

## Goals

1. Put every photo in front of a visitor who scrolls the page normally, and
   keep all fifteen reachable on demand — instead of two of fifteen, at random.
2. Attach meaning to each photo, so the imagery reads as evidence of delivery.
3. Give the section an exit — send interested visitors toward actual projects.
4. Cut the section's vertical cost by more than half.
5. Cut its image payload by roughly an order of magnitude.
6. Keep the site buildless — no React, no bundler, no new runtime dependency.

## Non-goals

- The KP3 and MEW-6085 galleries on project detail pages.
- The PROJECTS block (`#zd_fdi`) below, beyond sharing its background colour.
- Replacing the photographs themselves.
- Per-project names and deep links. See "Deferred" below.

## Approach

A full-bleed horizontal rail of captioned, clickable cards that advances as the
visitor scrolls the page past it, and can also be dragged or swiped at any time.

Chosen over three alternatives considered:

- **Editorial mosaic** (6 captioned photos in an asymmetric static grid) —
  clearer, but strands 9 of the 15 photos.
- **Proof band** (stats column beside a 2x2 image cluster) — strongest sales
  argument, weakest use of the photography, and it overlaps the credentials
  block (`#zZFMdo`) further down the page.
- **Deletion** — reclaims the most scroll, discards the client's own asset
  library.

### Why scroll-linked and not constant drift

Constant autonomous drift was chosen first, on the reasoning that it is the only
variant guaranteeing a passive visitor sees several photos, and nothing else on
the page moved on its own.

**That second premise stopped being true.** Concurrent work on this branch
(`44db460`, `9d4dd43`) replaces the hero's service columns with a rolling
client-logo rail — an autonomously animating marquee, above the fold, roughly
one screen above this section. Two self-animating horizontal marquees within a
screen of each other read as a page that will not sit still, and the hero rail
has the stronger claim on that behaviour: it is above the fold, its logos are
interchangeable, and it has nothing to gain from user pacing.

So this rail takes the motion the hero rail is not using. Scroll-linked motion
also removes two pieces of machinery that constant drift required:

- **No duplicated track.** A seamless infinite loop needed the 15 items emitted
  twice with the second set hidden from assistive technology. Scroll-linked
  motion has a start and an end, so 15 items is 15 items.
- **No pause control.** WCAG 2.2.2 governs content that moves *automatically*.
  Motion the user causes by scrolling is not automatic, so the toggle — and its
  JavaScript, its icon states and its focus handling — all disappear.

The cost is honest and worth stating: a visitor who scrolls past very fast sees
fewer photos than a constant drift would have shown them. That is mitigated by
the rail remaining a genuinely scrollable region, so anyone who wants the rest
can drag, swipe or trackpad-scroll it without waiting for a timer.

## Structure

`<section id="zOl98u">` is retained so block order and ids are untouched. Its
contents are replaced entirely.

```html
<section id="zOl98u" class="block v2-rail-block">
  <div class="v2-rail">
    <div class="v2-rail__head">
      <p class="v2-rail__eyebrow">Delivered</p>
      <h3 class="v2-rail__title">Built across Kuwait and the Gulf</h3>
    </div>
    <div class="v2-rail__viewport">
      <ul class="v2-rail__track">
        <li class="v2-rail__item">
          <a class="v2-rail__card" href="/roads-and-bridges-completed">
            <img src="/assets/img/v2/rail/slide-13-480.jpg"
                 srcset="/assets/img/v2/rail/slide-13-480.jpg 480w,
                         /assets/img/v2/rail/slide-13-960.jpg 960w"
                 sizes="(max-width: 600px) 260px, (max-width: 1024px) 300px, 352px"
                 loading="lazy" width="480" height="316"
                 alt="Aerial view of a completed UGCC road interchange in Kuwait City">
            <span class="v2-rail__tag">Roads &amp; Bridges</span>
          </a>
        </li>
        <!-- 15 items, once -->
      </ul>
    </div>
  </div>
</section>
```

Fifteen items, emitted once. No duplicate set and no `aria-hidden` bookkeeping:
the rail has a beginning and an end rather than looping.

`class="slideshow"` was verified to appear on `index.html` only. Removing it
from this page leaves the builder slideshow CSS in `main.css`/`custom.css` and
the init loop at `assets/js/main.js:74` inert for this page and unchanged for
every other page. That dead CSS is left in place; removing it is not in scope.

## Sector → listing map

Five sectors span the 15 photographs. Every target directory below was
confirmed present in the repository.

| Sector | Target | Slides |
|---|---|---|
| Roads & Bridges | `/roads-and-bridges-completed` | 05, 08, 10, 11, 12, 13, 14 |
| Civil Infrastructure | `/civil-completed` | 02, 09, 15 |
| Oil & Gas | `/oil-and-gas-completed` | 01, 07 |
| Building Construction | `/building-construction-completed` | 04, 06 |
| Water Management | `/water-completed` | 03 |

Per-slide subjects, as read off the photographs:

| Slide | Subject |
|---|---|
| 01 | Oil & gas gathering centre — pipe racks and process skids |
| 02 | Serviced land subdivision — road grid and roundabouts in desert |
| 03 | Wastewater treatment plant — clarifiers and aeration basins |
| 04 | Campus buildings with tensile canopy — school or university |
| 05 | Multi-level desert interchange |
| 06 | Residential city — low-rise housing blocks |
| 07 | Industrial process plant under construction — structural steel |
| 08 | Interchange ramps and viaduct |
| 09 | Serviced land subdivision — plot grid and roundabouts |
| 10 | Multi-level desert interchange, symmetrical view |
| 11 | Urban road corridor with underpass, Kuwait City skyline |
| 12 | Urban interchange with underpass, waterfront skyline |
| 13 | Coastal interchange, Kuwait City skyline |
| 14 | Interchange from directly overhead |
| 15 | Roundabout and serviced plots — infrastructure development |

These assignments are **inferred from the imagery**, not from client metadata.
The source folder the slides came from (`assets/img/GalleryPicturesHighQuality
tobeUsed/`) is gitignored and no longer on disk, so no authoritative mapping
exists in the repository. The assignments are legible enough to ship — an
interchange is not a treatment plant — but they should be confirmed with the
client before the site goes live.

`/oil-and-gas-current` does not exist; `/oil-and-gas-completed` does. All five
targets use the `-completed` listing deliberately: this section is about
delivered work.

## Motion

The rail is a **natively scrollable region** whose `scrollLeft` is driven by the
page's vertical scroll position. Driving `scrollLeft` rather than a `transform`
is the load-bearing decision: it means page-driven motion and user-driven
dragging are the same mechanism acting on the same value, so they compose
instead of fighting. A transform-based rail would have to choose one or the
other.

`.v2-rail__viewport` is `overflow-x: auto` at all times. On scroll:

```
p         = (windowHeight - sectionTop) / (windowHeight + sectionHeight)   clamped 0..1
scrollLeft = p * (track.scrollWidth - viewport.clientWidth)
```

So the rail sits at its first card as the section enters the viewport from
below, and reaches its last card as the section leaves at the top. A visitor
who scrolls the section through at a normal reading pace passes the whole
fifteen.

Implementation constraints:

- The scroll handler is `passive: true` and does nothing but read a rect and
  write `scrollLeft`. The write is coalesced into a `requestAnimationFrame` so
  a fast scroll cannot queue more work than one frame can absorb.
- **User override.** Any user-initiated horizontal interaction on the viewport
  (`pointerdown`, `wheel` with horizontal delta, `touchstart`, or focusing a
  card) sets a flag that stops page-scroll driving for that visit. Once a
  visitor takes hold of the rail, the page must not yank it back.
- No `scroll-behavior: smooth` on the viewport — it would fight per-frame
  writes. The site-wide smooth scrolling in `v2.css` applies to `html` only.
- `scroll-snap-type: x proximity` so manual dragging settles on card
  boundaries, with `proximity` rather than `mandatory` so programmatic writes
  are not snapped mid-scroll.

**Settled after measurement: the ratio is 0.75.** Full-track travel was the
starting point and proved too fast — one screenful of page scroll pushed 8–10
cards past, all fifteen in about 1.5 screenfuls, quick enough that no individual
photograph registered. At 0.75 roughly twelve of the fifteen transit on page
scroll alone at a legible pace, and the remaining three are one drag away, which
costs nothing because the rail is a real scrollable region.

The driver publishes the value as `data-travel-ratio` on `.v2-rail` so the
verification harness asserts against it rather than duplicating the constant.

One consequence worth recording, because it is not obvious: `scroll-snap`
quantizes where the rail comes to **rest**, so the settled `scrollLeft` is the
nearest card boundary to what the driver wrote — off by up to half a card pitch
in either direction. Motion during the scroll stays smooth; only the resting
position is snapped. Any assertion about the end position must tolerate that,
and making the driver write snap-aligned values instead would trade smooth
motion for a visibly stepped rail.

## Accessibility

**WCAG 2.2.2 (Pause, Stop, Hide) does not apply.** It governs content that moves
automatically. Here nothing moves unless the visitor scrolls, and stopping the
motion is exactly as easy as stopping scrolling. This is the single largest
simplification scroll-linking buys: no pause toggle, no `aria-pressed` state, no
icon swap, no focus-handling around an animation that might restart.

- Under `prefers-reduced-motion: reduce`, the scroll driver does not attach at
  all. The rail is already `overflow-x: auto`, so it degrades to an ordinary
  horizontally scrollable region with all 15 cards reachable by drag, swipe,
  trackpad and keyboard. Nothing is lost but the automatic advance.
- Every `<img>` gets a descriptive `alt` naming the structure and its setting.
  Empty `alt` is wrong here: the photographs carry the section's meaning.
- The `<a>` cards are keyboard reachable in source order, and `:focus-visible`
  inherits the existing site-wide red outline from `v2.css`.
- Focusing a card sets the user-override flag, so tabbing through the rail
  cannot be fought by a concurrent page scroll.
- The viewport carries `tabindex="0"` and an `aria-label`, so a keyboard user
  can scroll the region with arrow keys without tabbing through all 15 links —
  the standard affordance for a scrollable region.

## Dimensions and surface

- Card **352 × 232** desktop (landscape). The photographs are all 16:9 or
  wider aerials; on this content the horizontal sweep is the information, and a
  portrait crop discards it.
- Tablet 300 × 198, mobile 260 × 172. Same scroll-linking at all sizes; the
  travel distance recomputes from the measured track width, so no per-breakpoint
  constants are needed.
- Background: `var(--v2-navy)`. The block above (`#u7vIc0iRh`) is transparent
  on white and the block below (`#zd_fdi`) is already `rgb(0, 42, 65)`. Navy
  merges the rail downward into one intentional dark region rather than
  introducing a third band.
- Heading row sits inside the 1224px content width, matching the page's other
  blocks. The track runs full-bleed, so cards bleed off both edges and signal
  that there is more to see.
- Caption: sector name in a small uppercase tag over a bottom-anchored scrim,
  with a `--v2-red` rule on its leading edge, matching the site's existing
  accent treatment.
- Resulting section height **~375px**, down from 1029px.

## Performance

- Downscaled derivatives are generated into `assets/img/v2/rail/` at 480w and
  960w using `sips` (already used elsewhere in this project; no new tooling).
  The originals stay untouched in `assets/img/v2/` — other pages reference them.
- Cards render at 352px CSS width, so 480w covers 1x and 960w covers 2x/3x.
- `loading="lazy"` plus explicit `width`/`height` on every `<img>`. Layout space
  is reserved, so the rail cannot contribute to CLS.
- Measured on two aspect-ratio extremes (slide-01 at 1920x1043, slide-09 at
  1920x1438), the 480w derivative lands at 45–60 KB.

**Measured after implementation**, at 1x on a 1280x720 viewport: **725 KB** total
for the section, all of it `-480.jpg` — no `-960.jpg` is ever requested at 1x.
Down from ~7 MB.

Of that, **394 KB (8 of 15 images) loads at rest, before the section is scrolled
into view.** An earlier draft of this spec claimed the at-rest figure would be
near zero; that was wrong and is corrected here. `loading="lazy"` is present on
every image and is working, but Chromium's viewport-distance threshold is larger
than this section's distance below the fold, so the vertical axis defers nothing.
What actually defers cards 9–15 is their **horizontal** distance inside the
rail's own scroll container. Lazy loading therefore saves about 47% at rest, not
100%.

## Verification

Extend the dependency-free console-harness pattern of `tools/hero-check.js`
with `tools/rail-check.js`:

1. `#zOl98u` height is under 500px at 1280x720.
2. No element matching `.slide` or `.slideshow` remains in the document.
3. The track contains exactly 15 `<li>`, and no element in the rail carries
   `aria-hidden` — the duplicated-track machinery must be genuinely gone, not
   merely unused.
4. The 15 cards produce exactly 5 distinct `href` values, and each resolves to
   a directory that exists (checked by `fetch` returning ok).
5. `document.body.scrollWidth <= window.innerWidth` at 375, 768 and 1280 — the
   full-bleed track must not create horizontal page overflow.
6. Every `<img>` in the rail has a non-empty `alt`, and `width`/`height` set.
7. The viewport is horizontally scrollable: `scrollWidth > clientWidth` and
   computed `overflow-x` is `auto`. This must hold in **both** media states —
   it is the reduced-motion fallback and the manual affordance at once.
8. Scrolling the page from before the section to past it changes the viewport's
   `scrollLeft` from 0 to its maximum, under `no-preference`; and leaves it at
   0 under `reduce`. Asserted by scripted scrolling, not by eye.
9. After a synthetic `pointerdown` on the viewport, a further page scroll does
   **not** change `scrollLeft` — the user-override flag holds.

Checks 1–9 are automatable in the harness. Manual verification still required:
whether the scroll-to-travel ratio feels right, caption legibility over each
individual photograph, and touch drag behaviour on a real device.

## Deferred

- **Per-project names and deep links.** The strongest version of this section
  names each delivered asset and links to its own project page. It is blocked
  on a list from the client that does not exist in the repository. The card
  markup is designed so a name is added as a second `<span>` inside the
  existing tag block and the `href` is retargeted — no layout change.
- **Removing the now-dead builder slideshow CSS** from `main.css` and
  `custom.css`.

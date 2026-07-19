# Homepage gallery → captioned drifting rail — design

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

1. Put every photo in front of a visitor who simply stays on the page, and keep
   all fifteen reachable on demand — instead of two of fifteen, at random.
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

A full-bleed horizontal rail of captioned, clickable cards that drifts
continuously at a slow constant speed, pauses on hover, and hands over to
ordinary scrolling the moment the visitor touches it.

Chosen over three alternatives considered:

- **Editorial mosaic** (6 captioned photos in an asymmetric static grid) —
  clearer, but strands 9 of the 15 photos.
- **Proof band** (stats column beside a 2x2 image cluster) — strongest sales
  argument, weakest use of the photography, and it overlaps the credentials
  block (`#zZFMdo`) further down the page.
- **Deletion** — reclaims the most scroll, discards the client's own asset
  library.

### Motion: drift, then scroll-linked, then drift again

This decision was made three times. The reasoning is recorded because the
reversals were driven by evidence, not by taste drifting about.

**Round 1 — constant drift.** Chosen because it is the only variant that
guarantees a passive visitor sees several photographs, and because nothing else
on the page moved on its own.

**Round 2 — scroll-linked.** That second premise stopped being true. Concurrent
work on this branch (`44db460`, `9d4dd43`) replaced the hero's service columns
with a rolling client-logo marquee, above the fold, roughly one screen above
this section. Two self-animating horizontal marquees that close together read as
a page that will not sit still, and the hero rail had the stronger claim on the
behaviour. So this rail took the motion the hero was not using.

**Round 3 — back to constant drift, and this is what shipped.** Seen on the real
page, scroll-linked motion looked juddery. The reason is structural rather than
a tuning failure: scroll-linked motion is only ever as smooth as the visitor's
scroll wheel, so it inherits every notch, flick and trackpad stutter. A rail
whose purpose is to make photography feel considered cannot be animated by an
input device.

The two-marquee concern that motivated round 2 was re-examined directly rather
than assumed. It does not hold up: the hero marquee is 44px tall, logos at ~62%
opacity on a 48s loop — ambient texture — while this rail is 335px of full-colour
photography. They never share a viewport, sitting roughly a thousand pixels
apart. One is wallpaper, the other is content, and they read as two applications
of one page-wide band language rather than two competing widgets.

What round 3 costs, honestly: the duplicated track and the pause control both
come back. A seamless loop needs the 15 items emitted twice, and WCAG 2.2.2
applies again the moment motion becomes automatic — hover-pausing is no use to a
touch user. Both were in the round-1 design and both return unchanged.

What it keeps from round 2: the rail is still a genuine `overflow-x: auto`
region, so dragging, swiping, trackpad and keyboard all still work, and the
reduced-motion path is still a plain scrollable list rather than a frozen one.
Handover is what joins the two halves — see Motion below.

## Structure

`<section id="zOl98u">` is retained so block order and ids are untouched. Its
contents are replaced entirely.

```html
<section id="zOl98u" class="block v2-rail-block">
  <div class="v2-rail">
    <div class="v2-rail__head">
      <p class="v2-rail__eyebrow">Delivered</p>
      <h3 class="v2-rail__title">Built across Kuwait and the Gulf</h3>
      <button class="v2-rail__toggle" type="button"
              aria-pressed="false" aria-label="Pause the moving gallery">…</button>
    </div>
    <div class="v2-rail__viewport" tabindex="0" role="group"
         aria-label="Gallery of completed UGCC projects, scrollable">
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
        <!-- the 15 items, then the same 15 again -->
      </ul>
    </div>
  </div>
</section>
```

The 15 items are emitted **twice**. The animation translates the track by exactly
`-50%`, so the second set arrives where the first began and the loop has no seam.
The duplicate set carries `aria-hidden="true"` on each `<li>` and `tabindex="-1"`
on each `<a>`, so assistive technology and keyboard tabbing encounter each
project once.

**The `-50%` is only exact if the track's width is exactly two repeat periods.**
That is why the track carries no horizontal padding and no flex `gap`, and each
item owns a `margin-right` instead. With `gap` plus `padding: 0 24px` the track
measured 10956px against a true period of 5460px — 29 gaps between 30 items plus
48px of end padding — and the loop jumped 18px every cycle. With a trailing
margin the identity holds at every breakpoint with no constant to keep in sync.
The 24px lead-in lives on the viewport's `padding-left`, which does not
contribute to the track's width.

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

The drift is a **pure CSS keyframe on the compositor** — no `requestAnimationFrame`,
no scroll listener, no per-frame JavaScript:

```css
.v2-rail__track { animation: v2-rail-drift 70s linear infinite; }
@keyframes v2-rail-drift { to { transform: translateX(-50%); } }
```

One set is `15 x (352 + 12) = 5460px`, so 70s is ~78px/s. It pauses on `:hover`,
on `:focus-within`, and on `[data-paused="true"]` from the toggle.

### Handover

`.v2-rail__viewport` is `overflow-x: auto` at all times, so the rail is a real
scrollable region even while drifting. On the visitor's first `pointerdown`,
`touchstart`, `focusin` or horizontal `wheel`, `rail.js` converts one positioning
mechanism into the other:

```
dx = current translateX of the track      (read from the live computed matrix)
set data-manual="true"                    -> stylesheet drops the animation
clear the inline transform
scrollLeft = -dx                          -> same pixel position, natively scrolled
```

The transform positions the track during drift; `scrollLeft` positions it
afterwards, and the two cannot both be in charge. Reading the live matrix rather
than the keyframe endpoint is what makes the swap invisible.

**This conversion must be lossless, and getting it wrong is the worst failure
this design has.** An early version set `data-manual` before writing
`scrollLeft`, which activated `scroll-snap` in the same tick and let the browser
quantize the write to a card boundary — the rail jumped up to 173px, and all the
way back to the first card whenever the drift was under half a card in. That is
strictly worse than the judder the drift exists to remove.

The fix is that **`scroll-snap` applies only under reduced motion**, never after
handover. Snapping was a nicety; losing the visitor's place is not. Measured
worst case across 24 trials spanning the drift cycle at three viewports: 0.50px,
which is integer `scrollLeft` rounding a fractional transform and cannot be
driven lower without sub-pixel scroll positioning.

Handover is one-way for the life of the page. Once the visitor has taken hold,
the rail never starts drifting again.

## Accessibility

The rail moves automatically for longer than five seconds, so **WCAG 2.2.2
(Pause, Stop, Hide) applies** and requires a pause mechanism available to every
user. Hover and focus pausing do not satisfy it on their own — they are useless
to a touch user who is not trying to tap a card.

So the design includes a **visible pause/resume toggle** in the heading row. It
is not decoration and it is not optional; it is the reason automatic motion is
defensible here.

- The toggle sets `aria-pressed` and flips a `data-paused` attribute the
  stylesheet keys off. It is one of only two things `rail.js` does.
- It hides itself once the visitor has handed over, and under reduced motion.
  In both states nothing is drifting, so a pause control would be a button that
  does nothing — hidden outright rather than disabled, so it is not reachable.
- Under `prefers-reduced-motion: reduce` the animation never starts and
  `rail.js` returns before attaching anything. The rail is already
  `overflow-x: auto`, so it degrades to an ordinary horizontally scrollable
  region with all 15 cards reachable by drag, swipe, trackpad and keyboard.
  `scroll-snap` is active here, and only here.
- Every `<img>` gets a descriptive `alt` naming the structure and its setting.
  Empty `alt` is wrong: the photographs carry the section's meaning.
- The `<a>` cards are keyboard reachable in source order, and `:focus-visible`
  inherits the site-wide red outline from `v2.css`. Focusing a card triggers
  handover, so a keyboard user is never chasing a moving target.
- The viewport carries `tabindex="0"` and an `aria-label`, so a keyboard user
  can scroll the region with arrow keys without tabbing through all 15 links.
- The duplicate set is `aria-hidden` with `tabindex="-1"`, so the page announces
  fifteen projects rather than thirty.

**The rail is fully usable with `rail.js` deleted.** It still drifts, still
pauses on hover, and is still scrollable — verified by blocking the script at the
network layer. What is lost without it is the touch-accessible pause and the
clean handover, not access to the content.

## Dimensions and surface

- Card **352 × 232** desktop (landscape). The photographs are all 16:9 or
  wider aerials; on this content the horizontal sweep is the information, and a
  portrait crop discards it.
- Tablet 300 × 198, mobile 260 × 172. Same drift at all sizes: because each item
  carries its own trailing margin, `translateX(-50%)` equals exactly one repeat
  period at every breakpoint, so no per-breakpoint constant exists to fall out of
  sync. A card crosses its own width in ~4.5s at all three.
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

`tools/rail-check.js` follows the dependency-free console-harness pattern of
`tools/hero-check.js`. 14 checks, all passing at 1280x720, 768x1024, 375x812 and
under emulated `prefers-reduced-motion: reduce`.

Structure and content: section under 500px; no legacy `.slideshow` nodes; exactly
30 items of which 15 are `aria-hidden` duplicates carrying `tabindex="-1"`; every
card has non-empty `alt`, explicit `width`/`height` and `loading="lazy"`; no
horizontal page overflow; exactly 5 distinct hrefs, each resolving.

Behaviour, which is where the care went:

- **The rail actually drifts.** Samples the track's live transform twice over
  400ms and requires leftward movement. "An animation is declared" and "the thing
  is moving" are different claims — the first passes on a track whose animation is
  paused, zero-duration, or overridden later in the cascade.
- **The pause toggle actually stops it.** Waits two animation frames before
  sampling, because reading synchronously after the click catches ~1.3px of
  already-committed drift and measures our own timing rather than the product.
- **Handover is lossless**, measured as a card's real `getBoundingClientRect()`
  before and after. An earlier version compared `scrollLeft` to `-translateX`,
  which only proves two numbers we chose agree — it passed or failed depending on
  where the drift happened to be. The rect is what the visitor actually sees.

Three negative controls establish the harness has teeth, and are worth re-running
after any change here:

1. Block `rail.js` — handover must fail; drift and hover-pause must still pass.
2. Force `animation: none` — "the rail actually drifts" must fail.
3. Re-inject the `scroll-snap` rule on the manual state — handover must fail.
   This one is the important one: it reproduces the original snap-back bug, and
   it failed 6 times out of 6. Without it there is no evidence the handover check
   protects anything.

Still requiring a human: whether the drift speed feels right, caption legibility
over each individual photograph, and touch drag and handover on real hardware.
Playwright cannot emulate finger-panning of an `overflow: auto` container, so
that last one is genuinely unverified.

## Deferred

- **Per-project names and deep links.** The strongest version of this section
  names each delivered asset and links to its own project page. It is blocked
  on a list from the client that does not exist in the repository. The card
  markup is designed so a name is added as a second `<span>` inside the
  existing tag block and the `href` is retargeted — no layout change.
- **Removing the now-dead builder slideshow CSS** from `main.css` and
  `custom.css`.

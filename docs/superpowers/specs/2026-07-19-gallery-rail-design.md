# Homepage gallery → captioned drift rail — design

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

1. Make every photo visible to every visitor, not two of fifteen.
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
continuously at a slow constant speed.

Chosen over three alternatives considered:

- **Editorial mosaic** (6 captioned photos in an asymmetric static grid) —
  clearer, but strands 9 of the 15 photos.
- **Proof band** (stats column beside a 2x2 image cluster) — strongest sales
  argument, weakest use of the photography, and it overlaps the credentials
  block (`#zZFMdo`) further down the page.
- **Deletion** — reclaims the most scroll, discards the client's own asset
  library.

Constant drift was chosen over scroll-linked and manual-only motion because it
is the only variant that guarantees a passive visitor sees several photos.
That choice is what makes the pause control in "Accessibility" mandatory rather
than optional.

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
              aria-pressed="false" aria-label="Pause the moving gallery">
        <svg aria-hidden="true">…pause / play glyph…</svg>
      </button>
    </div>
    <div class="v2-rail__viewport">
      <ul class="v2-rail__track">
        <li class="v2-rail__item">
          <a class="v2-rail__card" href="/roads-and-bridges-completed">
            <img src="/assets/img/v2/rail/slide-13-480.jpg"
                 srcset="/assets/img/v2/rail/slide-13-480.jpg 480w,
                         /assets/img/v2/rail/slide-13-960.jpg 960w"
                 sizes="(max-width: 600px) 260px, (max-width: 1024px) 300px, 352px"
                 loading="lazy" width="480" height="317"
                 alt="Aerial view of a completed UGCC road interchange in Kuwait City">
            <span class="v2-rail__tag">Roads &amp; Bridges</span>
          </a>
        </li>
        <!-- 15 items, then the same 15 repeated -->
      </ul>
    </div>
  </div>
</section>
```

The 15 items are emitted **twice**. The animation translates the track by
exactly `-50%`, so the second set arrives at the position the first set
started from and the loop has no visible seam. The duplicate set carries
`aria-hidden="true"` on each `<li>` and `tabindex="-1"` on each `<a>`, so
assistive technology and keyboard tabbing encounter each project once.

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

Pure CSS. No JavaScript in the animation path — no `requestAnimationFrame`, no
scroll listener, no resize observer.

```css
.v2-rail__track { animation: v2-rail-drift 70s linear infinite; }
@keyframes v2-rail-drift { to { transform: translateX(-50%); } }
```

One set is `15 × (352 + 12) = 5460px`, so 70s gives ~78px/s. A card takes ~4.5s
to cross its own width; a visitor lingering 8 seconds sees roughly two new
cards arrive. The duration is a single CSS value and is expected to be tuned
by eye during implementation.

`will-change: transform` is set on the track only, and only inside the
`prefers-reduced-motion: no-preference` block, so it costs nothing on the
reduced-motion path.

Motion pauses on `:hover` and on `:focus-within` via
`animation-play-state: paused`.

## Accessibility

The rail is auto-moving content that starts automatically and runs longer than
five seconds, so WCAG 2.2.2 (Pause, Stop, Hide) requires a pause mechanism
available to every user. Hover and focus pausing do not satisfy this on their
own — they are unavailable to a touch user who is not trying to tap a card.

Therefore the design includes a **visible pause/resume toggle** in the section
heading row. It is not decoration and it is not optional; it is the reason the
constant-drift option is shippable.

- The toggle sets `aria-pressed` and adds a class that pauses the animation.
  It is the only JavaScript this feature needs.
- Under `prefers-reduced-motion: reduce`, the animation is dropped entirely and
  `.v2-rail__viewport` becomes `overflow-x: auto` so all 15 cards stay
  reachable by scroll, drag and keyboard. The toggle is hidden in this state —
  there is nothing to pause.
- Every `<img>` gets a descriptive `alt` naming the structure and its setting.
  Empty `alt` is wrong here: the photographs carry the section's meaning.
- The `<a>` cards are keyboard reachable in source order, and `:focus-visible`
  inherits the existing site-wide red outline from `v2.css`.
- Focusing a card pauses the rail, so a keyboard user is never chasing a moving
  target.

## Dimensions and surface

- Card **352 × 232** desktop (landscape). The photographs are all 16:9 or
  wider aerials; on this content the horizontal sweep is the information, and a
  portrait crop discards it.
- Tablet 300 × 198, mobile 260 × 172. Same drift at all sizes.
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
  1920x1438), the 480w derivative lands at 45–60 KB. Expected payload for this
  section on a 1x display: from ~7 MB eager to **~750 KB** lazy. The duplicated
  DOM set references identical URLs, so it costs no additional bytes.

## Verification

Extend the dependency-free console-harness pattern of `tools/hero-check.js`
with `tools/rail-check.js`:

1. `#zOl98u` height is under 500px at 1280x720.
2. No element matching `.slide` or `.slideshow` remains in the document.
3. The track contains exactly 30 `<li>`, of which 15 have `aria-hidden="true"`.
4. The 15 visible cards produce exactly 5 distinct `href` values, and each
   resolves to a directory that exists (checked by `fetch` returning ok).
5. `document.body.scrollWidth <= window.innerWidth` at 375, 768 and 1280 — the
   full-bleed track must not create horizontal page overflow.
6. Every `<img>` in the rail has a non-empty `alt`, and `width`/`height` set.
7. With `prefers-reduced-motion: reduce` emulated, the track's computed
   `animation-name` is `none` and the viewport's `overflow-x` is `auto`.
8. Activating the toggle sets `aria-pressed="true"` and the track's computed
   `animation-play-state` to `paused`.

Checks 1–8 are automatable in the harness. Manual verification still required:
the drift speed feeling right, the caption legibility over each individual
photograph, and touch drag behaviour on a real device.

## Deferred

- **Per-project names and deep links.** The strongest version of this section
  names each delivered asset and links to its own project page. It is blocked
  on a list from the client that does not exist in the repository. The card
  markup is designed so a name is added as a second `<span>` inside the
  existing tag block and the `href` is retargeted — no layout change.
- **Removing the now-dead builder slideshow CSS** from `main.css` and
  `custom.css`.

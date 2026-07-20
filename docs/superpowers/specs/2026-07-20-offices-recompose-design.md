# Our offices and Branches → map field — design

Branch: `hero-recompose`
Scope: the homepage offices section (`#zrby1M` in `index.html`), the block
directly below the credentials block (`#zZFMdo`) and directly above
`#Jways5TtQ`.

The credentials spec cites this block as the *source* for its "6 countries"
stat, noting the number "restates what the same page already claims 2,000px
lower. Not a new assertion." That makes `#zrby1M` the page's authority for a
claim another block now repeats — so it had better make the claim well. Today
its own map omits one of the six.

## Problem

Measured on a 1280x720 viewport with the site served locally on 2026-07-20.

- **The section does not exist on mobile.** The `<section>` carries
  `block--mobile-hidden`, which `main.css` resolves to `display: none` at
  `width <= 920px`. There is no mobile substitute. Every phone visitor since
  launch has seen nothing here, and the only location data they can reach is
  the footer's Kuwait address.
- **The heading is baked into a photograph.** The background is a screenshot of
  a map with `OUR LOCATIONS` and `Our Offices And Branches` rendered as pixels
  in its top-left corner — duplicating the live `<h3>` sitting on top of it.
  The pixel version cannot be translated, re-flowed, selected, or read aloud.
  The `<img>` has no `alt` attribute at all.
- **The map contradicts the content.** The screenshot outlines Kuwait, Iraq,
  Saudi Arabia, Oman/UAE and India. Malawi — one of the six countries the block
  names — is not in frame. The one graphic in the section disagrees with the
  list beside it.
- **Nothing is a link.** The section contains **zero** `<a>` elements. The phone
  numbers and the email address are plain text, so on the mobile devices that
  cannot see the block anyway, they would not have been tappable.
- **Nothing is grouped.** 23 `.layout-element` divs, 22 of them a `.text-box`,
  positioned by inline `--grid-row` / `--grid-column` custom properties on a
  22-column, 32-row track list. "OMAN", "ADRESS", the Oman street address and
  "+968 245 486 60" are four unrelated siblings that appear related only
  because of their grid coordinates. No `<address>`, no `<ul>`, no `<dl>`.
- **The content is asymmetric with no acknowledgement.** Kuwait, KSA and Oman
  carry an address and a phone. Iraq, Malawi and India carry a country name and
  nothing else. Rendered identically, the three empty ones read as broken.
- **It depends on JavaScript to be visible.** Every child carries
  `transition transition--slide`, which starts at `opacity: 0` and is cleared by
  an IntersectionObserver in `main.js`. If that script fails, the block renders
  blank.
- `ADRESS` is misspelled, three times. `Riyad` is missing its `h`.

The section is 624px tall, fixed by `--block-min-height`, which is 8.1% of the
7,685px homepage. That cost is defensible. What is not defensible is that the
block spends it on a picture that argues with its own text, for an audience that
excludes everyone on a phone.

## Goals

1. Render on every viewport, including phones.
2. Make the graphic agree with the content — show all six countries, correctly.
3. Make the heading live text.
4. Make every phone number and email address actionable.
5. Group each office into one semantic unit.
6. Make the office/presence asymmetry deliberate and legible instead of broken.
7. Keep the site buildless, and add no runtime JavaScript.

## Non-goals

- The `/contact-us` page and its Google Maps embed.
- The footer's duplicate Kuwait address. Out of scope; revisit separately.
- Sourcing addresses for Iraq, Malawi and India. See "Content" below.
- Deleting the old screenshot files. See "Old assets" below.

## Approach

A two-column block on the existing navy ground: the **office register** on the
left, a **vector map** on the right.

Chosen over two alternatives, both drawn at full scale and compared before
deciding (see the published comparison artifact):

- **The Register** — map dropped entirely, three offices as hairline-divided
  columns on flat navy. Cheapest and least breakable, no image dependency at
  all. Rejected because the section's job on a contractor's homepage is to show
  geographic reach, and a list of three addresses does not show it. Retained as
  the fallback if the map underdelivers: the office markup is identical, so the
  switch costs only the map column.
- **Contact Strip** — three panels with phone and email as prominent tap
  targets, reframing the block from "how far we reach" to "how to reach us".
  Rejected as duplicative: the footer already carries the Kuwait contact
  details and `/contact-us` exists one click away. Reconsider only if analytics
  show this block driving enquiries.

Map Field was chosen because it is the only one of the three that *shows* the
six-country claim rather than restating it, and because rebuilding the map as
vector geometry fixes the baked-in-text and missing-Malawi defects as a side
effect rather than as extra work.

## The map

An inline `<svg>` built from **Natural Earth** vector data.

**Licence.** Natural Earth is public domain. Its `LICENSE.md` states: "All
versions of Natural Earth raster + vector map data found on this website are in
the public domain… The primary authors, Tom Patterson and Nathaniel Vaughn
Kelso, and all other contributors renounce all financial claim to the maps and
invites you to use them for personal, educational, and commercial purposes."
Commercial use on this site is explicitly covered. Attribution is not required;
the generator script will name the source anyway.

**Window.** Equirectangular, longitude 26°E–95°E, latitude 41°N–19°S. Emitted
as `viewBox="0 0 100 87"`.

**Three tiers, all real country geometry:**

| Tier | Countries | Treatment |
| --- | --- | --- |
| Offices | Kuwait, Saudi Arabia, Oman | Brand red fill, navy hairline stroke between them |
| Operations | Iraq, India, Malawi | Lighter blue fill |
| Context | Every other country in frame | Muted plate fill, no internal borders |

Plus three white pins at the true coordinates of Kuwait City (47.98, 29.37),
Riyadh (46.72, 24.69) and Muscat (58.41, 23.59), each with an `<text>` label
naming the city. The labels are `<text>`, not paths, so they stay selectable and
translatable — the property the baked-in screenshot text could never have.

The navy hairline between the three office countries is not decoration: filled
solid without it, Kuwait, Saudi Arabia and Oman merge into a single red mass and
the block appears to claim one country, not three. Verified visually during the
spike.

**The context tier draws no internal borders.** Its 48 countries render as one
continuous landmass — land against sea, nothing more. This is an editorial
decision by the site owner, taken once the generated map was inspected: Natural
Earth's default boundaries put Israel, Palestine, N. Cyprus and Somaliland in
frame as distinct outlined entities, and a Kuwaiti contractor's homepage is not
the place to take a position on any of them. The background exists for
orientation; country lines in it carried no information this block needed.

Implementation is in CSS, not the generator: the paths stay separate (the
harness asserts more than 20 of them) but take a stroke matching their own fill,
which closes the anti-aliasing seams between adjacent polygons. See the comment
on `.off__map-ctx path` in `assets/css/offices.css`.

This does **not** neutralise India's own outline, which is drawn in the
operations tier and therefore keeps Natural Earth's treatment of the Kashmir
boundary. India is a country UGCC operates in, so it has to be individually
outlined; there is no version of this map that shows India without taking
some line on its borders.

**India is drawn on de-facto control, deliberately.** Determined from the
generated coordinates rather than assumed: India's outline reaches 35.50°N, not
the ~37°N claim line. Gilgit-Baltistan renders as Pakistan, Aksai Chin and the
Shaksgam tract as China; the Kashmir Valley and Arunachal Pradesh render as
India. There is no dashed line-of-control anywhere in the file — the generator
emits only closed filled paths. This is Natural Earth's standard treatment and
is neither the Indian, Pakistani nor Chinese claim line.

The site owner chose this over showing India's full claim line. It is the
neutral cartographic convention and defensible to anyone who asks. The cost is
recorded honestly: a viewer in India may notice the outline stops short of the
claim line, and maps published *in* India are legally required to show it.
Revisit if the site is ever marketed there.

**Resolution is deliberately mixed.** The six UGCC countries are built from
Natural Earth 1:50m; every context country from 1:110m. At 110m Kuwait
simplifies to a 9-point smudge — unacceptable for the head office — and at 50m
it is 67 points and correctly shaped. The bytes are spent only where the eye
goes.

**Generation.** `tools/make-office-map.py`, checked in. It downloads the two
Natural Earth GeoJSON files, projects to the window, clips polygons to the frame
with Sutherland–Hodgman, simplifies with Douglas–Peucker (ε 0.035 for the six,
0.22 for context), drops rings below a minimum area, rounds coordinates to 2 and
1 decimal places respectively, and emits the SVG. Checked in so the map is
reproducible and re-tintable rather than an opaque blob. It is a build-time
script only — nothing runs at page load, and the site stays buildless for
visitors.

**Cost.** 23.6 KB of inline SVG, 9.1 KB gzipped.

Compare honestly against what it replaces: the six screenshot variants total
0.73 MB **on disk**, but a visitor downloads exactly one of them — 119 KB at
1440px CSS width, 314 KB on a 2x display at that width. So the per-visitor
saving is roughly **110–305 KB**, not the whole 0.73 MB. Inline SVG additionally
costs zero requests and inherits the brand tokens, which the PNG could not.

**Why inline and not an external file.** At 23.6 KB it is smaller than the
request overhead is worth, and it must read `--v2-red` and the navy from CSS to
stay in step with the rest of the site. An `<img src="map.svg">` can do neither.

## Content

Two tiers, matching the map:

**Offices** — full detail, in this order:

| Country | Address | Phone | Email |
| --- | --- | --- | --- |
| Kuwait (head office) | United Gulf Construction Company, Al-Ardiya, Block 1, Plot 264 | +965 220 542 50 | ugcc@ugcc.com |
| Saudi Arabia | Building No. 3909, Hisham Ibn Abdul Malik Ibn Marwan Street, King Fahd District, Riyadh | +966 112 611 688 | — |
| Oman | Building No. 9933, Way No. 3941, Al Khoudh, P.O. Box 2971, P.C. 111, Muscat | +968 245 486 60 | — |

**Operations** — name only: Iraq, India, Malawi. Introduced by the label
"Also operating in", so the absence of an address reads as a different category
rather than missing data.

Copy corrections carried in this change: `ADRESS` → `Address` (three
occurrences), `Riyad` → `Riyadh`, `KSA` → `Saudi Arabia`. Kuwait takes a
`HEAD OFFICE` badge; it is the only office with a published email, and that
asymmetry is left as-is rather than inventing addresses.

## Structure

Follows the convention set by the hero and rail blocks: keep the builder's
`<section>` wrapper, replace its contents with semantic markup, style from a
dedicated file.

The wrapper is kept for block order and for consistency with the other rebuilt
sections, not to satisfy an existing test — grep confirms no harness in `tools/`
references `#zrby1M` or its 624px height. The only mentions are prose in
`docs/superpowers/plans/2026-07-19-projects-block.md`, which records the height
as context. Nothing breaks when it changes; nothing catches it either, which is
why `offices-check.js` is part of this change.

- **`index.html` §zrby1M** — remove `block--mobile-hidden` from the section's
  class list, leaving `class="block v2-offices-block"`; strip the section's
  inline builder style variables, as the rail block did, so the 22-column /
  32-row track list and `--block-min-height: 624px` stop governing a layout
  that no longer uses them; delete the `.block-background--fixed` div and its
  `<img>`; delete all 23 `.layout-element` children and the `.grid-shape`
  divider. Height becomes content-driven, set by padding in `offices.css`.
  Replace with
  an `.off__*` tree: `<h2>` and lede, an `<ol class="off__list">` of three
  offices each wrapping an `<address>` and `tel:` / `mailto:` links, the inline
  map `<svg>`, a `<ul class="off__presence">`, and a legend keying the three map
  tiers.
- **`assets/css/offices.css`** — new, linked in `<head>` after `rail.css` as
  `?v=1`.
- **`tools/make-office-map.py`** — new, build-time map generator.
- **`tools/offices-check.js`** — new console harness.

**No JavaScript at runtime, and none of the builder's `.transition` classes.**
Those start at `opacity: 0` and depend on `main.js`; a script failure would
blank the section, which is the exact defect being removed. Same reasoning
`credentials.css` documents for itself.

Heading level is `<h2>`, matching the other rebuilt blocks. Headings outside
`.text-box` must declare `font-family` explicitly at weight 400 — see the note
in `sections.css`.

## Responsive

One breakpoint, **920px** — the builder's own, the same one the header uses, and
the same one whose media query currently hides this block. Not 768px.

- **Above 920px** — two columns, register left, map right.
- **At or below 920px** — single column. The map moves above the register and
  drops its three city labels, which are illegible at that width; the tier fills
  and the three pins remain, so it still reads as a locator. The office list
  stacks. The presence row wraps.

Nothing is hidden at any width. That is the point of the change.

## Accessibility

- The `<svg>` takes `role="img"` and an `aria-labelledby` pointing at a
  `<title>` naming all six countries and which tier each belongs to. The map is
  decorative-adjacent but carries the only visual statement of reach, so it is
  described rather than hidden.
- Tier meaning is carried by the visible legend as well as by colour, so the
  office/operations distinction survives for a colour-blind reader.
- Phone links use `tel:` with the E.164 form (`tel:+96522054250`) while
  displaying the spaced form.
- `:focus-visible` is inherited from `v2.css` (2px `--v2-red` outline). Links on
  the navy ground must show a visible focus ring against navy — verify, do not
  assume.
- The `<address>` element wraps each office's postal address, which is what it
  is for.

## Old assets

The six PNG variants stay on disk, unreferenced. Deleting them is a separate,
reversible decision better made once this block is live and settled; leaving
them costs visitors nothing, because an unreferenced image is never requested.
Note for whoever revisits it: they are referenced **only** by `index.html`
(confirmed by grep across the repo), so removal is safe whenever wanted.

## Verification

`tools/offices-check.js`, a dependency-free console IIFE matching the shape of
`rail-check.js` and `credentials-check.js`. Like `rail-check.js`, it states its
viewport precondition in a header comment rather than resizing itself: the
width-dependent checks (1, 9) are run once at each of 375px, 920px and 1280px,
and the harness reports the width it observed so a run at the wrong size is
obvious rather than silently passing.

1. Section `#zrby1M` computes to a non-zero height and `display` other than
   `none` — the regression guard for the mobile-hidden defect. Run at 375px.
2. The section's class list does not contain `block--mobile-hidden`.
3. Exactly three `a[href^="tel:"]`, with hrefs `+96522054250`, `+966112611688`,
   `+96824548660`.
4. Exactly one `a[href^="mailto:"]`, `ugcc@ugcc.com`.
5. Each of the three offices contains a non-empty `<address>`.
6. The heading text "Offices" appears in the DOM as text, and the section
   contains no `<img>`.
7. The SVG contains exactly 3 paths in the office-tier group, 3 in the
   operations group, and 3 pins; and its `<title>` names all six countries.
   One `<path>` per country — a country's islands and exclaves are separate
   `M…Z` subpaths inside that one `d`, not separate elements, so India's
   Andaman and Nicobar groups must not inflate the count.
8. No descendant of the section computes to `opacity: 0` after load — the guard
   against reintroducing a JS-dependent reveal.
9. No descendant's `scrollWidth` exceeds the viewport width. Run at all three
   widths.
10. The string `ADRESS` does not appear in the section.

Manual verification required, not covered by the harness:

- Whether the map's composition reads well against the blocks above and below.
- Whether the red/blue/plate tiers hold up on a low-quality external monitor.
- Focus ring visibility on the navy ground on a real device.

## Known trade-offs

- **Malawi drags the frame south.** Including it means roughly 40% of the map is
  Indian Ocean and southern Africa with nothing plotted on it. Accepted: the
  alternative is cropping to the Gulf and India and listing Malawi in text only,
  which would reintroduce the exact defect — a map that disagrees with the list
  beside it — that this change exists to fix.
- **Kuwait is genuinely small at this zoom.** The pin carries it; the red fill
  alone would not. Accepted as a fact of geography.
- **Natural Earth 1:50m borders are a cartographic generalisation.** They are
  not an authoritative statement of any boundary, and the block makes no
  boundary claim. Worth remembering if anyone asks.

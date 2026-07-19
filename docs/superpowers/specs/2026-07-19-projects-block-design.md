# Homepage PROJECTS block → named contract cards — design

Branch: `hero-recompose`
Scope: the homepage PROJECTS block (`#zd_fdi` in `index.html`), the block directly
below the gallery rail.

This is the block the gallery-rail spec listed as a non-goal ("The PROJECTS block
(`#zd_fdi`) below, beyond sharing its background colour"). It is now in scope on
its own terms.

## Problem

The block is a builder-generated 46-row grid holding a heading, a paragraph, a
button and an eight-image square gallery.

Measured on a 1280x720 viewport with the site served locally:

- **The block is 3026px tall.** That is 31% of the 9773px homepage, taller than
  the hero (720), About (726) and Who-are-we (1394) combined, and more than
  seven times the newly rebuilt gallery rail directly above it (419).
- **It contains exactly one link** — the `All Projects` button. Four full screens
  of scroll resolve to a single click target.
- **None of the eight photographs is captioned or linked.** They are UGCC's own
  covers for real contracts, but unlabelled they are indistinguishable from stock
  photography — the same defect the gallery rail was just rebuilt to fix.
- **It now repeats the rail above it, worse.** The rail shows captioned,
  sector-tagged, clickable cards in 419px. This block shows anonymous imagery at
  seven times the height and with strictly less information.
- **The site already holds the answer.** Thirty project pages carry names,
  contract numbers, owners, consultants, commencement and completion dates and
  contract values up to 509,000,000 USD. None of it reaches the homepage.
- **Square crops fight the subject.** Interchanges, aprons and pipe racks are
  horizontal; each photo is forced into a 604x604 box.
- **The `srcset` is broken.** Every gallery entry declares the same file at both
  `172w` and `344w`, so a viewport that resolves to either fetches a 172px-wide
  file for a half-screen slot.
- **All eight images are `loading="eager"`** for a block that begins 3259px down
  the page.

The block's problem is not styling. It is that the homepage's single largest
allocation of attention carries no information and one destination, while the
information that would justify it sits one directory away.

## Goals

1. Put a name, a client, a value and a destination on every image in the block.
2. Cut the block's height by roughly two thirds while increasing what it says.
3. Differentiate it from the gallery rail above by altitude: the rail is
   sector-level and anonymous, this block is contract-level and specific.
4. Send visitors into the project pages that currently receive no homepage links.
5. Retire the broken `srcset` and stop eagerly loading four screens ahead.
6. Keep the site buildless — no React, no bundler, no new runtime dependency.
7. Touch nothing owned by the two concurrent sessions working on the blocks above.

## Non-goals

- The project detail pages themselves, and the `/construction-projects-kuwait`
  listing page. Both are linked, neither is changed.
- The gallery rail (`#zOl98u`), About (`#BCClZ9bf3`) or Who-are-we (`#u7vIc0iRh`).
- The block's navy `.block-background` div, which is retained unchanged so the
  block keeps its colour and its fixed-attachment treatment.
- Re-photographing anything. Every image is an existing asset.
- The duplicate `<title>` across all 30 project pages. Real, out of scope, noted
  under Deferred.

## Approach

**Six flagship contracts as deep-linked cards**, each carrying its photograph,
sector, name, client, contract value, status and contract number.

Chosen over two alternatives, both mocked up in full before the decision:

- **The ledger** — a figures column (30 contracts, Grade I, 6 countries), one
  large photograph, and a dense eight-row contract list. It is the strongest
  procurement argument of the three and reaches nine links, but it discards
  UGCC's photography on the one block where a contractor is expected to show its
  work, and its figures column overlaps the Credentials block (`#zZFMdo`) further
  down the page. Measured at 1130px, it is also not shorter than the chosen
  direction. **One idea is taken from it:** the count of contracts on record,
  which moves into this block's header.
- **Sector switch** — six business-line chips filtering eighteen contracts, three
  at a time. Shortest of the three at ~700px and the most contracts reachable,
  but it is a smaller copy of `/construction-projects-kuwait` one click away, it
  shows three projects instead of six in the only view most visitors will ever
  see, and it would be the third interactive behaviour within four blocks after
  the hero logo rail and the scroll-linked gallery. Deferred, not rejected: if
  the homepage should later carry a real index, this is the version to build.

### Why cards and not a second rail

The rail directly above already owns horizontal, scroll-linked motion. A second
horizontal strip one block later would read as the same gesture twice. A static
grid is also the honest form for six items that a visitor should be able to
compare side by side — a rail is for a set too large to show at once, which is
exactly why the rail holds fifteen photographs and this block holds six.

## Structure

`<section id="zd_fdi">` and its `.block-background` div are retained so block
order, ids and background treatment are untouched. The `.block-layout` grid and
its four `.layout-element` children are replaced entirely.

```html
<section id="zd_fdi" class="block v2-proj-block">
  <div class="block-background block-background--fixed"><!-- unchanged --></div>

  <div class="v2-proj">
    <div class="v2-proj__head">
      <p class="v2-proj__eyebrow">Selected projects</p>
      <h3 class="v2-proj__title">Named contracts, from the 6th Ring Road to Duqm Port</h3>
      <p class="v2-proj__intro">Six of thirty contracts on record, spanning roads,
         buildings, industrial infrastructure and oil and gas.</p>
      <a class="v2-proj__all" href="/construction-projects-kuwait">All projects</a>
    </div>

    <ul class="v2-proj__grid">
      <li class="v2-proj__item">
        <a class="v2-proj__card" href="/ra-259"
           aria-label="6th Ring Road to Interchange 82, Salmi Road — Roads and Bridges, 487.2M USD, completed 2022">
          <span class="v2-proj__shot">
            <img src="/assets/img/v2/proj/ra-259-440.jpg"
                 srcset="/assets/img/v2/proj/ra-259-440.jpg 440w,
                         /assets/img/v2/proj/ra-259-880.jpg 880w"
                 sizes="(max-width: 600px) calc(100vw - 32px),
                        (max-width: 1024px) calc(50vw - 36px), 376px"
                 loading="lazy" width="440" height="275"
                 alt="Stacked flyover ramps of a completed desert interchange seen from the air">
            <span class="v2-proj__tag">Roads &amp; Bridges</span>
          </span>
          <h4 class="v2-proj__name">6th Ring Road to Interchange 82, Salmi Road</h4>
          <dl class="v2-proj__meta">
            <div><dt>Client</dt><dd>Ministry of Public Works</dd></div>
            <div><dt>Value</dt><dd>487.2M USD</dd></div>
            <div><dt>Status</dt><dd>Completed 2022</dd></div>
            <div><dt>Contract</dt><dd>RA-259</dd></div>
          </dl>
        </a>
      </li>
      <!-- 6 items -->
    </ul>
  </div>
</section>
```

`<h3>` matches the gallery rail's own heading level and the sibling section
headings (`THE POWER OF EXPERIENCE`, `Our offices and Branches`), so the page's
heading order is unchanged. Card titles are `<h4>`, one level below the block's
own `<h3>`.

The original rationale here — that `<h4>` "is also the level Who-are-we uses for
its numbered services" — went stale during implementation: the concurrent
Who-are-we work replaced its seven `<h4>` service headings with a single `<h2>`,
so that block now contributes no `<h4>` at all. The chosen level is still correct
on its own terms, and the shipped outline was verified to introduce no skip.

Each card is a **single anchor** wrapping image, title and metadata, so there is
one tab stop per project — not four. The `<dl>` is used for what it actually is:
four label/value pairs.

The anchor carries an explicit `aria-label`; see Accessibility for what it holds
and why it is not simply the title.

## The six projects

Chosen by contract value, weighted toward recognisable Kuwaiti landmarks, and
spanning four sectors and both statuses. Every field below was read from the
project page named in the `href`.

| Contract | Name | Client | Value | Status | Sector |
|---|---|---|---|---|---|
| `/kp3cns301` | Apron and taxiways, new passenger terminal, Kuwait Airport | Ministry of Public Works | 509.0M USD | In progress | Building Construction |
| `/ra-259` | 6th Ring Road to Interchange 82, Salmi Road | Ministry of Public Works | 487.2M USD | Completed 2022 | Roads & Bridges |
| `/pahwc1151` | Sabah Al Ahmad Residential City | Public Authority for Housing Welfare | 422.2M USD | Completed 2014 | Building Construction |
| `/pai18pa` | Al Shadadiya Industrial Zone infrastructure | Public Authority for Industry | 315.0M USD | In progress | Civil Infrastructure |
| `/c502015-...-oman` | Commercial berth infrastructure, Duqm Port | SEZAD, Oman | 200.6M USD | Completed 2020 | Civil Infrastructure |
| `/zorepc0059` | Civil and tankage works, Al-Zour Refinery | KNPC / KIPIC | 114.2M USD | Completed | Oil & Gas |

Status is taken from listing membership: `/all-project-current` for in-progress,
`/all-projects-completed` for completed. Both were verified to contain the slugs
claimed above. The Duqm entry's full slug is
`c502015-infrastructure-works-for-the-commercial-berth-at-duqm-port-ip3-oman`.

Two of the eight current photographs (`jLtgwliLjDapM1V1`,
`jdVvD2U9INnHP656`) appear only on the homepage and have no project page behind
them. They are dropped.

**Client confirmation required before launch:** publishing contract values on the
homepage is a commercial decision, and the selection of six from thirty may have
commercial reasons to differ. Every figure here is already public on UGCC's own
project pages, but the homepage is a louder surface. The cards are built so that
removing the Value pair is a one-line change to each of six list items, with no
CSS change — the `<dl>` reflows.

## Copy

`PROJECTS` is a label, not a statement. It becomes *"Named contracts, from the
6th Ring Road to Duqm Port"* — naming two of the six in the heading itself, and
staying accurate about a selection that is not entirely Kuwaiti.

The existing 90-word paragraph — decades of excellence, precision, quality and
innovation, enduring landmarks — is replaced by 25 words that say what the block
is showing. The removed claims are asserted far better by six named contracts
with clients and values attached than by adjectives.

The `All Projects` button becomes a plain text link reading `All projects`.

It was first written as `All 30 projects`, so the exit would state its own size.
That was dropped: thirty is a correct count of project detail directories, but
`/construction-projects-kuwait` — the page the link goes to, and the right
destination — links only 18 of them directly, with the rest behind sector
sub-pages. The only page that lists all thirty is `/all-projects-new`, whose
`<title>` is literally "All Projects New": an unfinished builder page, not
somewhere to send a visitor. A number in the link text would have promised a
count the destination does not deliver, and would need maintaining as pages are
added. `All projects` promises only what is there.

## Images

`tools/make-project-images.sh`, modelled directly on the existing
`tools/make-rail-images.sh`: `sips` only, no external dependencies, idempotent,
resample along whichever axis leaves both dimensions at or above the target and
then centre-crop, so cropping never letterboxes.

Output: `assets/img/v2/proj/<slug>-{440,880}.jpg`, cropped to an exact 440x275
and 880x550 (16:10) so every card reserves identical layout space and no card
shifts as images arrive.

Sources, all verified present on disk, all landscape and at least 1024px wide so
the 880w derivative is always a downscale:

| Slug | Source | Source size |
|---|---|---|
| `ra-259` | `assets/img/c253e1af-60-mnl4x5okE6sxOWwl.png` | 1024x683 |
| `kp3cns301` | `assets/img/v2/card-kp3.jpg` | 1920x1080 |
| `pahwc1151` | `assets/img/37063398-cover-mxB26lNQqxfoZnna.jpg` | 1440x723 |
| `pai18pa` | `assets/img/d09f536f-cover-AzGMBZ95W8tqw0VQ.JPG` | 1024x683 |
| `c502015` | `assets/img/c98236de-c50-2015-cover-dZsizRULbSONi57t.webp` | 2800x1607 |
| `zorepc0059` | `assets/img/2310a664-zor-epc-cover-YBgjQp23yeipGgMV.jpg` | 1024x683 |

The Slug column is the derivative filename stem, not the URL path. It matches the
project directory in every case except Duqm, which is shortened to `c502015` so
the derivative is not named after a 74-character directory.

`376px` in `sizes` is the three-column card width, derived from the rail's own
container: `max-width: 1224px` with `padding: 0 24px` gives a 1176px content box,
less two 24px grid gaps, divided by three.

All six images are `loading="lazy"` with explicit `width`/`height`. This replaces
eight eager 1208w-capable images with six lazy ones and retires the broken
`172w`/`344w` `srcset` in the process.

Alt text describes the photograph, not the project — the project name is already
the link text, and repeating it would make every card announce itself twice:

| Slug | Alt |
|---|---|
| `ra-259` | Stacked flyover ramps of a completed desert interchange seen from the air |
| `kp3cns301` | Aerial view of the new Kuwait airport terminal, its wing-shaped roof under construction |
| `pahwc1151` | Rows of completed low-rise villas and surfaced streets in a desert housing city |
| `pai18pa` | Graded industrial plots and a new road grid laid out across open desert |
| `c502015` | Port gate canopy and marked vehicle lanes at a newly built commercial berth |
| `zorepc0059` | Refinery pipe racks and a blue-clad process building seen from above |

## Layout and responsive behaviour

- **> 1024px** — three columns.
- **601-1024px** — two columns.
- **<= 600px** — one column.

Breakpoints are the rail's own (`1024px` and `600px`) rather than new ones, so
the two blocks reflow at the same widths.

Cards keep their 16:10 crop at every width. The block's own vertical padding was
taken from the gallery rail's so the two would read as a pair rather than as two
unrelated treatments sharing a colour. They are close but no longer identical:
later rail commits moved the rail on, so `projects.css` is at `48px 0 56px` /
`34px 0 38px` against `rail.css`'s `52px 0 57px` / `39px 0 44px`. The difference
is four to six pixels and is not visible as a seam; matching them exactly would
mean chasing a file another session owns.

## Accessibility

- One anchor per card, so one tab stop per project.
- **Each anchor carries an explicit `aria-label` holding title, sector, value and
  status** — e.g. `6th Ring Road to Interchange 82, Salmi Road — Roads and
  Bridges, 487.2M USD, completed 2022`. This is a deliberate change from the
  original "accessible name equal to the project title". Without an explicit
  label the accname algorithm concatenates the image's alt text first, so every
  card announces a ~30-word name that only disambiguates halfway through. But a
  name of *just* the title is also wrong: in a screen reader's links list the
  cards lose the sector and value that make them scannable sighted, and the
  links list is exactly where that comparison happens. The label opens with the
  visible `<h4>` text, so SC 2.5.3 Label in Name still holds — and the harness
  asserts that prefix, which is the half that silently rots when someone renames
  a project without touching the label.
- Status is carried by words (`Completed 2022`, `In progress`), never by colour
  alone. If a status dot is used it is decorative and additional.
- `alt` describes the photograph; decorative wrappers carry no alt text.
- Focus styling inherits the `:focus-visible` red ring already defined in
  `v2.css`; the card must show it on the whole card box, not just the image.
- Hover lift and image zoom are wrapped in
  `@media (prefers-reduced-motion: no-preference)`, matching the rest of the v2
  layer.

## Isolation from concurrent work

Two other sessions are working on this branch, on the blocks above this one. The
touch points are deliberately disjoint:

| File | Change |
|---|---|
| `index.html` | The contents of `#zd_fdi` only — one contiguous range. Plus one new `<link>` line in `<head>`. |
| `assets/css/projects.css` | New file. |
| `tools/make-project-images.sh` | New file. |
| `tools/projects-check.js` | New file. |
| `assets/img/v2/proj/*` | New files. |

**`v2.css` and `v2.js` are not edited.** The gallery rail set the precedent of a
per-section stylesheet (`assets/css/rail.css`, linked once from the homepage)
rather than growing the shared layer, and following it keeps this work out of
every file the other two sessions are likely to be in. `hero.css`,
`sections.css` and `rail.css` are already linked this way.

The new stylesheet link is appended after `rail.css`:

```html
<link rel="stylesheet" href="/assets/css/projects.css?v=1">
```

Direction A needs no JavaScript, so `assets/js/` is untouched entirely.

## Verification

`tools/projects-check.js`, following the shape of `tools/rail-check.js`:
dependency-free, pasted into the console against the locally served homepage,
returns `{passed, failed, results}`.

Checks:

1. `#zd_fdi` height is under 1300px at 1280x720 (from 3026px).
2. The block contains exactly seven links: six cards plus `All projects`.
3. All seven `href`s return HTTP 200.
4. Each card exposes exactly one anchor — no nested or sibling links inside a card.
5. Every image has `loading="lazy"`, a non-empty `alt`, and explicit
   `width`/`height` attributes.
6. Every image's `naturalWidth` is greater than zero once scrolled into view, so
   a missing derivative fails loudly rather than rendering an empty box.
7. No image resolves to a source narrower than its rendered CSS width.
8. Three columns at 1280, two at 800, one at 375 — matching the rail's 1024px
   and 600px breakpoints.
9. No horizontal document overflow at 375px.
10. Cumulative layout shift contributed by the block is zero after images load.
    Two checks, because one of them alone would be a claim rather than a
    measurement:
    - `image frames reserve a 16:10 box` asserts the **mechanism** — every
      `.v2-proj__shot` computes to `aspect-ratio: 16/10`. Cheap and it names the
      cause, but `getComputedStyle` reports a declared value even where it has
      no effect, so on its own it would stay green under a later rule that
      overrode the frame's sizing.
    - `the block reserves image space before the images arrive` measures the
      **outcome**: blank all six images' `src`/`srcset`, measure `#zd_fdi`,
      restore them, measure again, and require the two heights to agree within
      1px. The measured pair is reported in the detail string, so the check
      shows its working rather than just a colour. Every blanked attribute is
      restored before the next check runs.

The check must be written to fail when the block is absent or empty, rather than
passing vacuously — the same defect that was fixed for the rail check in
`4498392`.

Not covered, manual verification required:

- Whether each 16:10 centre crop keeps its subject legible. A centre crop is
  correct for an interchange and can decapitate a water tower.
- Whether the six chosen projects are the six the client wants to lead with.
- Whether publishing contract values on the homepage is acceptable.

## Deferred

- **Sector switch (Direction C).** If the homepage should later carry a real
  filterable index, that mockup is the version to build. It should not be built
  while `/construction-projects-kuwait` remains one click away.
- **Duplicate `<title>` across project pages.** All 30 project detail pages share
  the title `Micro-Tunneling Kuwait | Underground Infrastructure | UGCC`,
  regardless of subject. This is a real SEO defect affecting every project page
  this block now links to, but it is a content fix across 30 files and does not
  belong in a homepage block redesign.
- **The other two homepage photographs.** `jLtgwliLjDapM1V1` and
  `jdVvD2U9INnHP656` have no project page. If pages are created for them they
  become card candidates.

## Expected result

| | Before | After |
|---|---|---|
| Block height | 3026px | 1049px (target was ~1100px) |
| Share of homepage | 31% | ~19% |
| Links | 1 | 7 |
| Images | 8, eager | 6, lazy |
| Named projects | 0 | 6 |
| Contract values shown | 0 | 6 |

The share figure is the one line here that is not this block's to hit. `~13%` was
predicted against the 9773px homepage measured when this spec was written; the
five concurrent sessions have since cut the page to roughly 5600px, so the same
block against a smaller denominator reads as ~19% (1053px of 5603px measured at
1280). The block beat its own absolute target — 1049px against ~1100px — and
then the page shrank underneath it. Read the height row, not the share row, when
judging whether this block did its job.

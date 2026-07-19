# THE POWER OF EXPERIENCE → claim and ledger — design

Branch: `hero-recompose`
Scope: the homepage credentials section (`#zZFMdo` in `index.html`), the block
directly below PROJECTS (`#zd_fdi`) and directly above the offices block
(`#zrby1M`).

This is the block the gallery-rail spec named as the reason it rejected its
"proof band" alternative. It is now in scope on its own terms.

## Problem

Measured on a 1280x720 viewport with the site served locally, before the three
concurrent sessions on this branch had landed their work. The section's own
1,779px is fixed by its `--block-min-height`; the page total it is compared
against is moving as those sessions land, so treat the percentage as indicative
and the absolute height as exact.

- The section is **1,779px tall** on desktop (1,173px tablet) — 18% of the
  9,853px homepage — and carries a kicker line, a heading, and five sentences.
  Nothing else. No image, no link, no number.
- The form is a **timeline that is not chronological**. A dashed vertical rule
  runs down the middle with five dots on it and labels zig-zagging left and
  right. The DOM order is ISO 9001 (2004), Grade 1, ISO 14001 (2012),
  ISO 45001 (2007), ISO 17025 (2019) — so the one visual metaphor the block
  commits to is contradicted by its own content. Grade 1 has no year at all.
- The heading promises **experience**; the content delivers **paperwork**.
  UGCC's actual claim to experience — operating since 1975, across six
  countries, in seven sectors — appears elsewhere on the site and is absent
  from the block named after it.
- It is a **dead end**. `/credentials/` carries all five certifications in
  full, and the section does not link to it.
- The decoration is six stretched SVGs. Each circle is a 90x90 `<circle>` with
  `preserveAspectRatio="none"` squashed into a 36px box; the dashed rule is a
  100x100 `<line>` stretched to 1,122px. They encode nothing.

The section's problem is not that it is ugly. It is that it spends 18% of the
page asserting a claim it never supports, in a diagram that argues against
itself, with no way out.

## Goals

1. Make the block support the claim in its own heading, using facts already
   published elsewhere on this site.
2. Present the five credentials in a form that matches what they are — a
   register — instead of a chronology they do not form.
3. Give the section an exit to `/credentials/`.
4. Cut its vertical cost by roughly two thirds.
5. Keep the site buildless, and add no JavaScript.
6. Land without colliding with the three concurrent sessions on this branch.

## Non-goals

- The `/credentials/` page itself.
- The PROJECTS block above (`#zd_fdi`) or the offices block below (`#zrby1M`).
- Certificate scans or issuer logos. None exist in `assets/img/`; sourcing them
  is client work, not design work.
- A project count. The site exposes 33 project detail pages, which is the
  featured subset and not a total. See "Numbers" below.

## Approach

A two-column block on a white ground: the **claim** on the left, the
**ledger** of evidence on the right.

Chosen over two alternatives, both drawn and compared before deciding:

- **Proof band** (numbers row above five equal credential columns, ~520px) —
  tightest of the three, but five equal columns flatten Grade 1, which is the
  one credential a Kuwaiti client actually procures against.
- **Chronological spine** (a real 1975–2019 axis with the certifications
  plotted at their true years, ~440px) — shortest, and the idea the current
  design is reaching for. Drawing it is what killed it: **29 of the 44 years
  on the axis are empty**, and Grade 1 has no year in any source, so it has to
  sit outside the timeline it is supposed to belong to. The data does not
  support the metaphor. This is the finding that justifies the chosen approach.

The certifications are not a story. They are a register. The design stops
pretending otherwise: the left column makes the experience argument, the right
column is the register backing it, and the two are not conflated.

### Why white and not navy

Navy was drawn first and rejected on a dependency. The rail above
(`rail.css`) is navy; PROJECTS between the rail and this block is currently
light. A navy credentials block alternates correctly today, but the concurrent
PROJECTS session may turn that block navy, which would put two navy surfaces in
contact. White has no such dependency and is correct regardless of what the
neighbouring sessions land.

### Numbers

Only facts already published on this site are used, and each is rendered in the
form least likely to go stale:

| Shown | Source | Note |
|---|---|---|
| `1975` | `/about-contractor-kuwait/`, company profile: "Since 1975" | Rendered as a **year**, not as a computed span. "50 years" would need editing every January; the company profile's own "48 years" was already stale when scraped. |
| `6` countries | The homepage offices block (`#zrby1M`): Kuwait, KSA, Oman, Iraq, Malawi, India | Restates what the same page already claims 2,000px lower. Not a new assertion. |
| `7` sectors | The homepage's own 01–07 list in `#zOl98u` | Same. |

No number is invented, and none requires client sign-off, because the homepage
already makes all three claims.

## Structure

`<section id="zZFMdo">` is retained with its id so block order and any external
anchors are untouched. Its contents are replaced by:

```
section#zZFMdo
  .cred
    .cred__claim
      h2.cred__title      THE POWER OF EXPERIENCE
      .cred__rule         34x2px, --v2-red
      p.cred__lede        the existing kicker sentence, verbatim
      ul.cred__stats      1975 / SINCE · 6 / COUNTRIES · 7 / SECTORS
      a.v2-btn.v2-btn--dark  href="/credentials/"  View credentials
    dl.cred__ledger
      div.cred__row x5
        dt.cred__code     ISO 9001 … GRADE 1
        time.cred__year   datetime="2004" … (absent for Grade 1)
        dd.cred__desc     one line
```

Decisions inside that structure:

- **`<dl>`, not a list of divs.** Five terms and their definitions is the
  definition of a definition list.
- **`<time datetime="…">` on four rows, and nothing on Grade 1.** Grade 1 has
  no year in any source. It gets an em-dash in the year column rather than an
  invented date. This is the same honesty the chronological-spine option could
  not achieve structurally.
- **`<h2>`, promoted from `<h3>`.** The block currently opens at `<h3>` with no
  `<h2>` above it anywhere in its subtree — a genuine outline gap that costs
  nothing to close.
- **Ledger order is chronological** — 2004, 2007, 2012, 2019, then Grade 1
  last as the undated row. The current DOM order is none of the possible
  orders.
- **All six decorative SVGs are deleted.**

### Content

The lede is the existing kicker sentence, verbatim. The `dd` descriptions are
rewritten: moving the year into its own column makes "In 2012, UGCC first
achieved…" redundant with the cell beside it, so each `dd` states what the
certification governs instead. No claim is added or strengthened in the
rewrite — Grade 1's line is the only one that keeps its full original scope,
because that scope is the point of it.

| Year | Code | Description |
|---|---|---|
| 2004 | ISO 9001 | Quality management system |
| 2007 | ISO 45001 | Occupational health and safety, first certified as OHSAS 18001 |
| 2012 | ISO 14001 | Environmental management system |
| 2019 | ISO 17025 | Central testing laboratory competence |
| — | GRADE 1 | Highest Kuwaiti classification for roads, infrastructure and building construction, plus electrical works |

## Behaviour

**No JavaScript.** The block deliberately does not use the builder's
`.transition transition--slide` reveal classes that every neighbouring block
carries. Those elements start at `opacity: 0` and are revealed by
`assets/js/main.js`; if that script fails, the block renders blank. This far
down the page a scroll reveal buys very little, and being unconditionally
readable buys more. The cost is stated plainly: this block will not cascade in
like its neighbours.

**Colour and contrast.** Navy `#002a41` (`--v2-navy`) for the heading, the
credential codes and the stat figures. Body and descriptions `#5a6570` on
white — 5.8:1, above AA. Red (`--v2-red`) appears only as the 34x2px rule under
the heading and never as text, since `--v2-red` on white is 5.3:1 and the
codebase already reserves `--v2-red-text` for the cases where red must be read.

**Responsive.** Two columns above 768px. Below it, one column in the same
source order, with each row's year moving up onto the same line as its code so
the description keeps full width.

**The CTA reuses `.v2-btn.v2-btn--dark`** from `sections.css` exactly as-is.
This block adds no button CSS.

## Files

| File | Change |
|---|---|
| `assets/css/credentials.css` | new |
| `index.html` | one `<link>` before `</head>`; one replacement inside `#zZFMdo` |
| `tools/credentials-check.js` | new |

Nothing else. `sections.css`, `v2.css`, `main.css`, `hero.css` and `rail.css`
are not touched.

## Concurrency

Three other sessions are working on this branch in the same working tree, on
the three blocks above this one (About / WHO ARE WE, the gallery rail, and
PROJECTS). All three live earlier in `index.html` than `#zZFMdo`.

This was not theoretical: during design, `index.html` changed from 135,695 to
132,288 bytes and `#zZFMdo` moved from byte 74,607 to 71,200 while another
session landed its `rail.css` link.

The rules that follow from that:

1. **Never `Write` `index.html`.** Only exact-string `Edit` calls. A whole-file
   write would silently clobber whatever landed since the last read.
2. **Anchor on unique strings, never on byte offsets or line numbers.** Offsets
   are invalidated by any edit above; `id="zZFMdo"` is not.
3. **The `<link>` is anchored on `</head>`**, the convention commit `980946e`
   established for the rail, so two sessions adding a stylesheet do not fight
   over the same anchor text.
4. **Do not reformat `index.html`.** No prettifying, no re-indentation. The
   file is single-line minified output; reflowing it would conflict with every
   other session at once.
5. **Touch no shared CSS file.** All new rules go in `credentials.css`.

A failed `Edit` (anchor not found) is the desired outcome of a race — it fails
loudly instead of landing in the wrong place. Re-read and retry.

## Verification

`tools/credentials-check.js`, following the shape of `tools/rail-check.js`,
written failing first and asserting against the served page at 1280px wide:

1. `#zZFMdo` height is under 700px (from 1,779px).
2. All five codes are present: ISO 9001, ISO 45001, ISO 14001, ISO 17025,
   GRADE 1.
3. The `dl` contains exactly five `dt`/`dd` pairs.
4. Exactly four `<time>` elements, with `datetime` 2004, 2007, 2012, 2019 in
   that DOM order — this is what stops the ordering bug from returning.
5. The section contains exactly one `<a>`, and its href is `/credentials/`.
6. The section contains zero `<svg>` elements.
7. The three stat figures read 1975, 6, 7.

Guard the assertions against passing vacuously — the failure mode fixed in
`4498392` — by asserting the queried collections are non-empty before
asserting over them.

The browser preview pane in the authoring session renders a different surface
than the one its scripts drive, so screenshots could not be captured.
Verification is by check script and DOM measurement, not by a claimed visual
pass.

## Deferred

- Certificate scans or issuer marks, once the client supplies them.
- Per-certification deep links into `/credentials/`, which would need anchor
  ids added to that page — out of scope here.

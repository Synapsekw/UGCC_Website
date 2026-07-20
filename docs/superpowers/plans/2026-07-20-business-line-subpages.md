# Business-Line Sub-Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the seven business-line discipline pages on the about-suite
kit, implementing the §9 spine (spec:
`docs/superpowers/specs/2026-07-20-business-line-subpages-design.md`) with the
content repairs of §9.1.

**Architecture:** Each page's body between the builder header and the footer
block `#FUdf9w9dXZ` is replaced wholesale with hand-authored kit markup
(About-suite precedent). One shared page stylesheet
(`assets/css/pages/business-line.css`, namespace `blp-`) adds the three
components the kit lacks. No shared file is edited. A table-driven console
harness plus node-side static tests verify every frozen decision.

**Tech Stack:** Static HTML, hand-authored CSS (no build step), `sips` for
image derivation, vitest for static tests, dependency-free console IIFE
harness.

**Working directory:** the worktree
`.claude/worktrees/business-line-pages` (branch `claude/business-line-pages`,
cut from `V2` at `f667b00`). All commands below run from the worktree root.

**Read first:** the spec above; the design-system hazards
(`docs/superpowers/specs/2026-07-20-v2-design-system.md` §7); the kit contract
(`docs/superpowers/specs/2026-07-20-about-suite-kit.md`).

**Environment reminders (they cost hours on the hub):**
- These HTML files are minified to one line. `grep -c` always returns 1; count
  in python. Do not reformat the builder header/footer; the hand-authored body
  you insert is readable HTML (like `hse/index.html`).
- IntersectionObserver is unreliable in the preview pane; verify reveal wiring
  by reading CSS gates against the JS selector list, never by watching.
- Preview screenshots break after scrolling — use a tall viewport (1280×2100).
- Run tests as `npx --no-install vitest run --dir tests` (never bare
  `npx vitest run` at the root until Task 3's config lands).

---

## File map

| File | Task | Action |
|---|---|---|
| `assets/img/v2/blp/*.jpg` (14 files) | 1 | Create — derived covers and bands |
| `assets/css/pages/business-line.css` | 2 | Create |
| `vitest.config.mjs` | 3 | Create |
| `tests/business-line.test.mjs` | 3 | Create |
| `tools/business-line-check.js` | 4 | Create |
| `roads-and-bridges-contractor-kuwait/index.html` | 5–6 | Rebuild body + head |
| `civil-infrastructure-kuwait/index.html` | 7 | Rebuild body + head |
| `building-construction-kuwait/index.html` | 8 | Rebuild body + head |
| `oil-and-gas-construction-kuwait/index.html` | 9 | Rebuild body + head |
| `water-treatment-plant-kuwait/index.html` | 10 | Rebuild body + head |
| `electro-mechanical-contractor-kuwait/index.html` | 11 | Rebuild body + head |
| `micro-tunneling-kuwait/index.html` | 12 | Rebuild body + head |
| `docs/superpowers/plans/2026-07-20-business-line-subpages.md` | 14 | Append handover |

Scratch bodies are written to the session scratchpad
(`$SCRATCH/bodies/<slug>.html`), never committed.

---

## Task 1: Derive cover and band imagery

**Files:**
- Create: `assets/img/v2/blp/` — 14 files, `<slug>-cover.jpg` + `<slug>-band.jpg`
  for slugs `roads`, `civil`, `building`, `oil`, `water`, `electro`, `micro`.

Budget: **per page, cover + band combined ≤ 800 KiB, JPEG quality never below
70** (quality is the hard floor; bytes yield to it — hub decision). Verify
artifacts on native-resolution crops, never downscaled copies.

- [ ] **Step 1: Create the directory and derive the seven covers**

Sources are the client-specified files (hub spec §7 — not substitutable).
Civil and micro are PNGs and MUST be re-encoded; civil's subject sits in the
lower two-thirds (do not crop off the bottom; crop sky from the top), water's
pump line sits in the lower half (crop from the bottom of the frame upward,
i.e. keep the bottom).

```bash
mkdir -p assets/img/v2/blp
# straightforward re-encodes (keep native aspect; the cover box crops via CSS)
sips -s format jpeg -s formatOptions 75 --resampleWidth 1920 \
  "assets/img/639d396c-cairo-street-hd-final-v2_edit.mp4_20260404_151225.212-copy-LzpQRTTKD9Mfji4x.jpg" \
  --out assets/img/v2/blp/roads-cover.jpg
sips -s format jpeg -s formatOptions 75 --resampleWidth 1920 \
  "assets/img/90e581cf-banner1-P9DJjSgxMdgIWaSl.jpg" \
  --out assets/img/v2/blp/building-cover.jpg
sips -s format jpeg -s formatOptions 75 --resampleWidth 1920 \
  "assets/img/785ed39d-picture2-1-pzwOGcrJcMDwEAmw.jpg" \
  --out assets/img/v2/blp/oil-cover.jpg
sips -s format jpeg -s formatOptions 75 --resampleWidth 1920 \
  "assets/img/7ed8b27e-banner1-2-7nJH1ii5XmyAwgxe.jpg" \
  --out assets/img/v2/blp/electro-cover.jpg
sips -s format jpeg -s formatOptions 75 --resampleWidth 1920 \
  "assets/img/84b54fc2-banner2-nepTLLbb7J94Brvx.png" \
  --out assets/img/v2/blp/micro-cover.jpg
# civil: 2800px PNG, sky-heavy top — resample, then crop to 1920x1080 keeping the bottom two-thirds
sips -s format jpeg -s formatOptions 75 --resampleWidth 1920 \
  "assets/img/0af4cdfb-civil-infrastructure-1-bDchTHDP9wFTCaIk.png" \
  --out assets/img/v2/blp/civil-cover.jpg
python3 - <<'EOF'
import subprocess
h = int(subprocess.check_output(['sips','-g','pixelHeight','assets/img/v2/blp/civil-cover.jpg']).split()[-1])
off = max(0, h-1080)   # crop entirely from the top (sky)
subprocess.run(['sips','--cropOffset',str(off),'0','-c','1080','1920',
  'assets/img/v2/blp/civil-cover.jpg'],check=True)
EOF
# water: keep the bottom of the frame (pump line in the lower half)
sips -s format jpeg -s formatOptions 75 --resampleWidth 1920 \
  "assets/img/264cfb29-banner1-1-d2fLiHtRPfmiLPjc.jpg" \
  --out assets/img/v2/blp/water-cover.jpg
python3 - <<'EOF'
import subprocess
h = int(subprocess.check_output(['sips','-g','pixelHeight','assets/img/v2/blp/water-cover.jpg']).split()[-1])
off = max(0, h-1080)
subprocess.run(['sips','--cropOffset',str(off),'0','-c','1080','1920',
  'assets/img/v2/blp/water-cover.jpg'],check=True)
EOF
```

- [ ] **Step 2: Derive the seven bands**

Band ≠ cover on every page. Six lines use the existing `div-*.jpg` set;
oil has no `div-` asset and uses a photograph already on its page.

```bash
sips -s format jpeg -s formatOptions 70 --resampleWidth 1920 assets/img/v2/div-roads.jpg    --out assets/img/v2/blp/roads-band.jpg
sips -s format jpeg -s formatOptions 70 --resampleWidth 1920 assets/img/v2/div-civil.jpg    --out assets/img/v2/blp/civil-band.jpg
sips -s format jpeg -s formatOptions 70 --resampleWidth 1920 assets/img/v2/div-building.jpg --out assets/img/v2/blp/building-band.jpg
sips -s format jpeg -s formatOptions 70 --resampleWidth 1920 assets/img/v2/div-water.jpg    --out assets/img/v2/blp/water-band.jpg
sips -s format jpeg -s formatOptions 70 --resampleWidth 1920 assets/img/v2/div-electro.jpg  --out assets/img/v2/blp/electro-band.jpg
sips -s format jpeg -s formatOptions 70 --resampleWidth 1920 assets/img/v2/div-micro.jpg    --out assets/img/v2/blp/micro-band.jpg
sips -s format jpeg -s formatOptions 70 --resampleWidth 1920 "assets/img/d37b16ed-banner5-YNqMW4be39u1ZoOp.jpg" --out assets/img/v2/blp/oil-band.jpg
```

- [ ] **Step 3: Visually verify all 14 derivations**

Open each derived file with the Read tool (it renders images). Check, per
file: subject present and sensibly framed (civil: barrier line and gates
visible; water: pump line visible); **band visibly different from that page's
cover** (in particular `roads-band` vs `roads-cover` — if `div-roads.jpg`
turns out to be the same Cairo Street frame, substitute
`assets/img/f16454cd-dji_20241202095605_0092_d.mp4_20250518_142228.229_edit-mnl4x5ej2ysEqr0y.jpg`
as the band source and re-run its sips line; likewise for oil, fallbacks are
`75f944c3-banner1-AVLxorQ5jaCGDvev.jpg` then
`8dc60ea6-banner4-xaVsvSl2cAMtXxBb.jpg`). Record which frame each file shows —
the alt text steps in Tasks 5–12 must be checked against these notes, and any
draft alt that misdescribes the frame must be corrected there.

- [ ] **Step 4: Check artifacts at native resolution**

For each cover, zoom a native crop and inspect for blocking/mosquito noise:

```bash
for f in assets/img/v2/blp/*-cover.jpg; do
  sips --cropOffset 200 400 -c 300 440 "$f" --out "/tmp/zoom-$(basename $f)"
done
```

Read each `/tmp/zoom-*.jpg`. If a file shows blocking in flat areas, re-derive
at quality 80 (never below 70).

- [ ] **Step 5: Enforce the byte budget and record sizes**

```bash
python3 - <<'EOF'
import os, collections
sizes = collections.defaultdict(int)
for f in sorted(os.listdir('assets/img/v2/blp')):
    slug = f.split('-')[0]
    sizes[slug] += os.path.getsize('assets/img/v2/blp/'+f)
    print(f, os.path.getsize('assets/img/v2/blp/'+f)//1024, 'KiB')
for s, b in sizes.items():
    print(s, b//1024, 'KiB', 'OK' if b <= 800*1024 else 'OVER BUDGET')
EOF
```

Expected: every slug `OK`. If a pair is over, re-derive the band at a lower
quality **not below 70**; if still over, resample the band to 1600 wide.
Record the final per-page numbers for the handover.

- [ ] **Step 6: Record intrinsic dimensions for the markup**

```bash
for f in assets/img/v2/blp/*.jpg; do
  echo -n "$f "; sips -g pixelWidth -g pixelHeight "$f" | awk '/Width/{w=$2}/Height/{h=$2}END{print w"x"h}'
done
```

Save the output — Tasks 5–12 must use these exact values in `width`/`height`
attributes. (Expected: covers 1920×1080 for civil/water after crop; others
keep native ratios.)

- [ ] **Step 7: Commit**

```bash
git add assets/img/v2/blp
git commit -m "feat(business-line-pages): derived cover and band imagery"
```

---

## Task 2: The page stylesheet

**Files:**
- Create: `assets/css/pages/business-line.css`

- [ ] **Step 1: Write the stylesheet**

Complete content (comments carry the *why* — preserve them):

```css
/* Business-line sub-pages — shared by the seven discipline pages.
   Loads after about-suite.css; everything else on these pages is kit.
   Spec: docs/superpowers/specs/2026-07-20-business-line-subpages-design.md
   Namespace: blp-. Only three components live here: the key-project rows,
   the all-projects button row, and the client logo grid. If anything more
   wants writing, the kit is wrong and that is a kit amendment. */

/* ---- 1. Key-project rows ------------------------------------------------
   Text-first contract rows modeled on the homepage's .wr-row: hairline
   bottom border, zero-width inset red edge that transitions on hover (a
   border-left would shift the row), arrow travelling inside its own column.
   Track widths: 220px fits the longest client string ("Joint Operations,
   Saudi Arabian Chevron" wraps to two 13px lines by design); 110px fits
   "USD 487.2M"; 130px fits "Completed 2022". Re-measure before changing. */
.blp-proj {
  margin: 0;
  padding: 0;
  list-style: none;
}

.blp-proj__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px 110px 130px 24px;
  align-items: baseline;
  gap: 24px;
  padding: 18px 0;
  border-bottom: .5px solid rgba(0, 42, 65, .16);
  text-decoration: none;
  box-shadow: inset 0 0 0 var(--v2-red);   /* zero-width at rest, so it transitions */
  transition: background-color .2s var(--v2-ease-out-quart),
              box-shadow .2s var(--v2-ease-out-quart);
}

.blp-proj__item:first-child .blp-proj__row {
  border-top: .5px solid rgba(0, 42, 65, .16);
}

/* Hover and focus share one rule so they cannot drift apart in a later edit.
   Colour/background feedback sits outside the reduced-motion gate. */
.blp-proj__row:hover,
.blp-proj__row:focus-visible {
  background-color: rgba(0, 42, 65, .07);
  box-shadow: inset 3px 0 0 var(--v2-red);
  outline: none;
}

@media (forced-colors: active) {
  .blp-proj__row:focus-visible { outline: 2px solid CanvasText; }
}
@media (prefers-contrast: more) {
  .blp-proj__row:focus-visible { outline: 2px solid var(--v2-navy); outline-offset: -2px; }
}

/* Hammersmith One ships one weight; family AND weight declared because this
   markup is outside .text-box and would otherwise fall back to Open Sans. */
.blp-proj__name {
  font-family: var(--font-primary, 'Hammersmith One', sans-serif);
  font-weight: 400;
  font-size: 17px;
  line-height: 1.3;
  color: var(--v2-navy);
  text-wrap: balance;
}

/* .72 is the measured floor that clears 4.5:1 on light grounds (design
   system, .wr-desc). Do not lighten. */
.blp-proj__client,
.blp-proj__status {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(0, 42, 65, .72);
}

.blp-proj__value {
  font-size: 13px;
  font-weight: 600;
  color: var(--v2-navy);
  font-variant-numeric: tabular-nums;
}

/* Arrow rests at -4px and travels TO 0, so motion stays inside the 24px
   column and the glyph is never clipped (homepage .wr-arrow pattern). */
.blp-proj__arrow {
  justify-self: end;
  color: var(--v2-red);
  transform: translateX(-4px);
}

@media (prefers-reduced-motion: no-preference) {
  .blp-proj__arrow { transition: transform .2s var(--v2-ease-out-quart); }
}

.blp-proj__row:hover .blp-proj__arrow,
.blp-proj__row:focus-visible .blp-proj__arrow {
  transform: translateX(0);
}

/* ---- 2. All-projects button row ---------------------------------------- */
.blp-btnrow {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

@media (max-width: 920px) {
  /* .as-btn already goes full-width at this breakpoint; stack them */
  .blp-btnrow { flex-direction: column; }
}

/* ---- 3. Client logo grid ------------------------------------------------
   Fixed-height tiles so mixed logo aspect ratios (512x177 MPW vs 960x1187
   KOC) read as one row. Logos contain, never crop. Not links. */
.blp-clients {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.blp-clients__item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 170px;
  height: 96px;
  padding: 14px 20px;
  background: #fff;
  border: 1px solid var(--as-hair-light);
  border-radius: 4px;
}

.blp-clients__item img {
  max-width: 100%;
  max-height: 64px;
  width: auto;
  height: auto;
  object-fit: contain;
}

/* ---- 4. Responsive ------------------------------------------------------
   920px is the builder's own breakpoint. There is no 768px breakpoint
   anywhere in this codebase; do not add one. */
@media (max-width: 920px) {
  .blp-proj__row {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 4px 16px;
  }
  .blp-proj__name   { grid-column: 1; grid-row: 1; }
  .blp-proj__value  { grid-column: 2; grid-row: 1; justify-self: end; }
  .blp-proj__client { grid-column: 1; grid-row: 2; }
  .blp-proj__status { grid-column: 2; grid-row: 2; justify-self: end; }
  .blp-proj__arrow  { display: none; }
}

@media (max-width: 600px) {
  .blp-clients__item { width: calc(50% - 8px); }
}
```

- [ ] **Step 2: Sanity-check the referenced custom properties**

```bash
grep -o "as-hair-light" assets/css/about-suite.css | head -1
grep -o "v2-ease-out-quart" assets/css/v2.css | head -1
```

Expected: both print a match. If `--as-hair-light` is absent from
`about-suite.css`, use `rgba(0, 42, 65, .12)` literally with a comment.

- [ ] **Step 3: Commit**

```bash
git add assets/css/pages/business-line.css
git commit -m "feat(business-line-pages): blp- page stylesheet"
```

---

## Task 3: Static tests (written first — they fail until pages are built)

**Files:**
- Create: `vitest.config.mjs`
- Create: `tests/business-line.test.mjs`

- [ ] **Step 1: Write the vitest config (the worktree-glob fix)**

```js
// vitest.config.mjs
// Root `npx vitest run` used to glob into .claude/worktrees/*/tests and
// report other sessions' suites. Scope to this checkout's tests only.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.mjs'],
    exclude: ['**/node_modules/**', '**/.claude/**'],
  },
});
```

- [ ] **Step 2: Write the static test file**

Complete content:

```js
// tests/business-line.test.mjs
// Static invariants for the seven business-line sub-pages. These parse the
// minified HTML as text — no browser. Computed-style assertions live in
// tools/business-line-check.js instead.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const PAGES = {
  'roads-and-bridges-contractor-kuwait': 'Roads and Bridges',
  'civil-infrastructure-kuwait': 'Civil Infrastructure',
  'building-construction-kuwait': 'Building Construction',
  'oil-and-gas-construction-kuwait': 'Oil and Gas',
  'water-treatment-plant-kuwait': 'Water and Wastewater',
  'electro-mechanical-contractor-kuwait': 'Electro-Mechanical',
  'micro-tunneling-kuwait': 'Micro-Tunnelling',
};

// Sub-nav hrefs, frozen order (spec §4.2)
const TABS = [
  '/business-lines-construction-services-kuwait',
  '/roads-and-bridges-contractor-kuwait',
  '/civil-infrastructure-kuwait',
  '/building-construction-kuwait',
  '/oil-and-gas-construction-kuwait',
  '/water-treatment-plant-kuwait',
  '/electro-mechanical-contractor-kuwait',
  '/micro-tunneling-kuwait',
];

const TYPOS = [
  'stream flood', 'sever network', 'tankge', 'Duqum',
  'GCC has tremendous', // missing-U variant; "UGCC has tremendous" is fine
];

const html = {};
for (const slug of Object.keys(PAGES)) {
  html[slug] = readFileSync(`${slug}/index.html`, 'utf8');
}

describe.each(Object.entries(PAGES))('%s', (slug, name) => {
  const doc = () => html[slug];

  it('loads the kit stylesheets in order, after v2.css', () => {
    const d = doc();
    const iV2 = d.indexOf('/assets/css/v2.css?v=4');
    const iKit = d.indexOf('/assets/css/about-suite.css?v=3');
    const iPage = d.indexOf('/assets/css/pages/business-line.css?v=1');
    expect(iV2).toBeGreaterThan(-1);
    expect(iKit).toBeGreaterThan(iV2);
    expect(iPage).toBeGreaterThan(iKit);
  });

  it('loads about-suite.js at v=2, deferred', () => {
    expect(doc()).toContain('src="/assets/js/about-suite.js?v=2" defer');
  });

  it('has exactly one h1 and it is the canonical display name', () => {
    const h1s = [...doc().matchAll(/<h1[^>]*>(.*?)<\/h1>/gs)];
    expect(h1s).toHaveLength(1);
    expect(h1s[0][1].replace(/\s+/g, ' ').trim()).toBe(name);
  });

  it('carries the frozen sub-nav with aria-current on its own tab', () => {
    const d = doc();
    const nav = d.match(/<section class="v2-subnav">.*?<\/section>/s);
    expect(nav).not.toBeNull();
    const hrefs = [...nav[0].matchAll(/href="([^"]*)"/g)].map(m => m[1]);
    expect(hrefs).toEqual(TABS);
    const active = nav[0].match(/<a href="([^"]*)"[^>]*class="is-active"[^>]*>/);
    expect(active[1]).toBe('/' + slug);
    expect(active[0]).toContain('aria-current="page"');
    expect(nav[0]).toContain('>Micro-Tunnelling<');       // canonical double-L
    expect(nav[0]).toContain('>Water and Wastewater<');   // canonical name
  });

  it('ships no desktop/mobile duplicate images in the rebuilt body', () => {
    expect(doc()).not.toContain('image-wrapper--mobile');
  });

  it('contains none of the known typo strings', () => {
    for (const t of TYPOS) expect(doc()).not.toContain(t);
  });

  it('every img in the body carries a non-empty alt', () => {
    const d = doc();
    const body = d.slice(d.indexOf('as-cover'), d.indexOf('id="FUdf9w9dXZ"'));
    for (const m of body.matchAll(/<img[^>]*>/g)) {
      expect(m[0], m[0]).toMatch(/alt="[^"]+"/);
    }
  });

  it('JSON-LD image points at the derived cover', () => {
    expect(doc()).toMatch(/"image":\s*"https:\/\/ugcc\.com\/assets\/img\/v2\/blp\/[a-z]+-cover\.jpg"/);
  });
});

describe('oil-and-gas status-aware links', () => {
  it('links completed only — no current button, no dead link', () => {
    const d = html['oil-and-gas-construction-kuwait'];
    expect(d).toContain('href="/oil-and-gas-completed"');
    expect(d).not.toContain('href="/oil-and-gas-current"');
  });
});

describe('micro-tunnelling title', () => {
  it('title uses the double-L display form', () => {
    expect(html['micro-tunneling-kuwait']).toContain('<title>Micro-Tunnelling Kuwait');
  });
});
```

- [ ] **Step 3: Run and verify the new tests FAIL (pages not built yet) and the old suite still passes**

```bash
npx --no-install vitest run --dir tests 2>&1 | tail -15
```

Expected: `business-line.test.mjs` fails on every page (kit stylesheets not
linked yet); `chat.test.mjs` passes. If `chat.test.mjs` fails, stop — that is
a pre-existing breakage to report, not to fix here.

- [ ] **Step 4: Verify the config fix scopes the root run**

```bash
npx --no-install vitest run 2>&1 | tail -5
```

Expected: the same two files only — no `.claude/worktrees` paths in the
output.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.mjs tests/business-line.test.mjs
git commit -m "test(business-line-pages): static invariants + scope vitest to root tests"
```

---

## Task 4: The console harness

**Files:**
- Create: `tools/business-line-check.js`

- [ ] **Step 1: Write the harness**

Complete content. Table-driven: one file serves all seven pages, keyed off
`location.pathname`. Skips are counted separately — **a skip is not a pass**
(hub defect 7).

```js
/* Business-line sub-page harness. Paste into the console on any of the
   seven discipline pages, or load via <script>. Asserts the frozen
   decisions of docs/superpowers/specs/2026-07-20-business-line-subpages-design.md.
   Dependency-free. Reports pass/fail/skip; a skip is NOT a pass. */
(function () {
  'use strict';

  var DATA = {
    'roads-and-bridges-contractor-kuwait': {
      name: 'Roads and Bridges',
      stats: ['14', 'USD 1.36B', 'USD 487M'],
      proj: ['/ra-259', '/ra200', '/ra245', '/ra-223'],
      listings: [['/roads-and-bridges-current', '6'], ['/roads-and-bridges-completed', '8']],
      clients: 4
    },
    'civil-infrastructure-kuwait': {
      name: 'Civil Infrastructure',
      stats: ['17', 'USD 2.20B', 'USD 509M'],
      proj: ['/kp3cns301', '/ra-259', '/pahwc1151', '/ra245'],
      listings: [['/civil-current', '4'], ['/civil-completed', '13']],
      clients: 7
    },
    'building-construction-kuwait': {
      name: 'Building Construction',
      stats: ['7', 'USD 942M', 'USD 509M'],
      proj: ['/kp3cns301', '/pahwc1151',
             '/c502015-infrastructure-works-for-the-commercial-berth-at-duqm-port-ip3-oman',
             '/paafa77'],
      listings: [['/building-construction-current', '2'], ['/building-construction-completed', '5']],
      clients: 5
    },
    'oil-and-gas-construction-kuwait': {
      name: 'Oil and Gas',
      stats: ['4', 'USD 291M', 'USD 114M'],
      proj: ['/zorepc0059', '/gc32', '/josc151lsp06', '/koc36081'],
      listings: [['/oil-and-gas-completed', '4']],   // status-aware: completed only
      clients: 4
    },
    'water-treatment-plant-kuwait': {
      name: 'Water and Wastewater',
      stats: ['6', 'USD 358M', 'USD 152M'],
      proj: ['/se19', '/5a-haya-eo24', '/se97', '/mew6085'],
      listings: [['/water-current', '3'], ['/water-completed', '3']],
      clients: 3
    },
    'electro-mechanical-contractor-kuwait': {
      name: 'Electro-Mechanical',
      stats: ['18', 'USD 2.03B', 'USD 487M'],
      proj: ['/ra-259', '/ra245', '/ra-223', '/pai18pa'],
      listings: [['/electro-mechanical-current', '7'], ['/electro-mechanical-completed', '11']],
      clients: 6
    },
    'micro-tunneling-kuwait': {
      name: 'Micro-Tunnelling',
      stats: ['5', 'USD 303M', 'USD 168M'],
      proj: ['/ra268', '/se19', '/5a-haya-eo24', '/owwsct2460879'],
      listings: [['/micro-tunneling-current', '3'], ['/micro-tunneling-completed', '2']],
      clients: 2
    }
  };

  var TABS = [
    '/business-lines-construction-services-kuwait',
    '/roads-and-bridges-contractor-kuwait',
    '/civil-infrastructure-kuwait',
    '/building-construction-kuwait',
    '/oil-and-gas-construction-kuwait',
    '/water-treatment-plant-kuwait',
    '/electro-mechanical-contractor-kuwait',
    '/micro-tunneling-kuwait'
  ];

  var slug = location.pathname.replace(/\//g, '');
  var D = DATA[slug];
  if (!D) { console.error('business-line-check: not a business-line page:', location.pathname); return; }

  var pass = 0, fail = 0, skip = 0, failures = [];
  function ok(cond, label) {
    if (cond) { pass++; } else { fail++; failures.push(label); }
  }
  function skipped(label) { skip++; failures.push('SKIP: ' + label); }
  function txt(el) { return (el && el.textContent || '').replace(/\s+/g, ' ').trim(); }

  /* 1. One h1, canonical name */
  var h1s = document.querySelectorAll('h1');
  ok(h1s.length === 1, 'exactly one h1');
  ok(h1s[0] && h1s[0].classList.contains('as-cover__title'), 'h1 is the cover title');
  ok(txt(h1s[0]) === D.name, 'h1 text is "' + D.name + '"');

  /* 2. Cover image */
  var cover = document.querySelector('.as-cover__media');
  ok(!!cover, 'cover media present');
  if (cover) {
    ok((cover.getAttribute('alt') || '').length > 0, 'cover alt non-empty');
    ok(txt(h1s[0]) !== cover.getAttribute('alt'), 'cover alt is not the h1 text');
    if (cover.complete && cover.naturalWidth) {
      ok(String(cover.naturalWidth) === cover.getAttribute('width') &&
         String(cover.naturalHeight) === cover.getAttribute('height'),
         'cover width/height match intrinsic size');
    } else { skipped('cover intrinsic size (not decoded — scroll/reload, do not set eager)'); }
  }

  /* 3. Sub-nav */
  var tabs = document.querySelectorAll('.v2-subnav a');
  ok(tabs.length === 8, 'sub-nav has 8 tabs');
  var hrefsOk = tabs.length === 8;
  for (var i = 0; i < tabs.length; i++) {
    if (tabs[i].getAttribute('href') !== TABS[i]) hrefsOk = false;
  }
  ok(hrefsOk, 'sub-nav hrefs in frozen order');
  var active = document.querySelectorAll('.v2-subnav a.is-active');
  ok(active.length === 1, 'exactly one active tab');
  ok(active[0] && active[0].getAttribute('href') === '/' + slug, 'active tab is this page');
  ok(active[0] && active[0].getAttribute('aria-current') === 'page', 'active tab has aria-current');
  var labels = Array.prototype.map.call(tabs, txt).join('|');
  ok(labels.indexOf('Micro-Tunnelling') !== -1, 'canonical Micro-Tunnelling label');
  ok(labels.indexOf('Water and Wastewater') !== -1, 'canonical Water and Wastewater label');

  /* 4. Stats */
  var stats = document.querySelectorAll('.as-stat');
  ok(stats.length === 3, 'exactly 3 stat tiles');
  for (var s = 0; s < Math.min(stats.length, 3); s++) {
    var fig = txt(stats[s].querySelector('.as-stat__figure'));
    ok(fig === D.stats[s], 'stat ' + (s + 1) + ' figure is "' + D.stats[s] + '" (got "' + fig + '")');
    ok(txt(stats[s].querySelector('.as-stat__unit')).length > 0, 'stat ' + (s + 1) + ' has a unit');
  }

  /* 5. Key-project rows */
  var rows = document.querySelectorAll('.blp-proj__row');
  ok(rows.length === 4, 'exactly 4 key-project rows');
  for (var r = 0; r < rows.length; r++) {
    var href = rows[r].getAttribute('href');
    ok(href === D.proj[r], 'row ' + (r + 1) + ' href is ' + D.proj[r] + ' (got ' + href + ')');
    var label = rows[r].getAttribute('aria-label') || '';
    var visible = txt(rows[r].querySelector('.blp-proj__name'));
    ok(label.indexOf(visible) === 0, 'row ' + (r + 1) + ' aria-label begins with its visible name');
  }

  /* 6. Listing links — status-aware */
  var expected = {};
  D.listings.forEach(function (l) { expected[l[0]] = l[1]; });
  var btns = document.querySelectorAll('.blp-btnrow .as-btn');
  ok(btns.length === D.listings.length, D.listings.length + ' listing button(s)');
  Array.prototype.forEach.call(btns, function (b) {
    var h = b.getAttribute('href');
    ok(expected.hasOwnProperty(h), 'listing button href ' + h + ' expected');
    ok(txt(b).indexOf('(' + expected[h] + ')') !== -1, 'button "' + txt(b) + '" carries count ' + expected[h]);
  });
  if (slug === 'oil-and-gas-construction-kuwait') {
    ok(!document.querySelector('a[href="/oil-and-gas-current"]'), 'no link to nonexistent oil-and-gas-current');
  }

  /* 7. Clients */
  var logos = document.querySelectorAll('.blp-clients img');
  ok(logos.length === D.clients, D.clients + ' client logos (got ' + logos.length + ')');
  Array.prototype.forEach.call(logos, function (img, n) {
    ok((img.getAttribute('alt') || '').length > 0, 'client logo ' + (n + 1) + ' alt non-empty');
  });

  /* 8. Nothing hidden */
  var hidden = 0;
  Array.prototype.forEach.call(document.querySelectorAll('.as-section *, .blp-proj *'), function (el) {
    if (getComputedStyle(el).opacity === '0') hidden++;
  });
  ok(hidden === 0, 'no element computes to opacity 0 (' + hidden + ' found)');

  /* 9. Exactly one key pill */
  ok(document.querySelectorAll('.as-pill--key').length === 1, 'exactly one as-pill--key');

  /* 10. No horizontal overflow */
  ok(document.documentElement.scrollWidth <= window.innerWidth + 1, 'no horizontal overflow');

  console.log('business-line-check [' + slug + ']: ' +
    pass + ' passed, ' + fail + ' failed, ' + skip + ' skipped' +
    (failures.length ? '\n - ' + failures.join('\n - ') : ''));
})();
```

- [ ] **Step 2: Commit**

```bash
git add tools/business-line-check.js
git commit -m "feat(business-line-pages): table-driven console harness"
```

(The harness is negative-tested in Task 6, against the built reference page.)

---

## Task 5: Reference page — Roads and Bridges

**Files:**
- Modify: `roads-and-bridges-contractor-kuwait/index.html`

- [ ] **Step 1: Write the new body to the scratchpad**

Write the following, complete and exact, to `$SCRATCH/bodies/roads.html`
(`$SCRATCH` = the session scratchpad directory). Substitute the two
`width`/`height` pairs from Task 1 Step 6's recorded output if they differ
from 1920×1080 (roads cover is 1920×1080; `div-roads` band is 1920×1080).
If Task 1 Step 3's notes contradict a draft alt below, fix the alt here.

```html
<section class="block block--desktop-first-visible block--mobile-first-visible as-cover" data-v-3ffce944>
  <img class="as-cover__media"
       src="/assets/img/v2/blp/roads-cover.jpg"
       alt="Multi-lane traffic on the rebuilt Cairo Street corridor in Kuwait"
       width="1920" height="1080"
       fetchpriority="high" decoding="async">
  <div class="as-cover__scrim" aria-hidden="true"></div>
  <div class="as-cover__inner">
    <p class="as-cover__eyebrow">Business lines</p>
    <h1 class="as-cover__title">Roads and Bridges</h1>
    <p class="as-cover__lede">Highways, interchanges, flyovers, bridge erection, asphalt paving and stormwater drainage.</p>
  </div>
</section>
<section class="v2-subnav"><div class="v2-subnav__inner"><a href="/business-lines-construction-services-kuwait">All</a><a href="/roads-and-bridges-contractor-kuwait" class="is-active" aria-current="page">Roads and Bridges</a><a href="/civil-infrastructure-kuwait">Civil Infrastructure</a><a href="/building-construction-kuwait">Building Construction</a><a href="/oil-and-gas-construction-kuwait">Oil and Gas</a><a href="/water-treatment-plant-kuwait">Water and Wastewater</a><a href="/electro-mechanical-contractor-kuwait">Electro-Mechanical</a><a href="/micro-tunneling-kuwait">Micro-Tunnelling</a></div></section>
<section class="as-section as-section--light">
  <div class="as-section__inner">
    <header class="as-head">
      <p class="as-head__eyebrow">Overview</p>
      <h2 class="as-head__title">The backbone of Kuwait's road network</h2>
      <span class="as-head__rule" aria-hidden="true"></span>
    </header>
    <div class="as-prose">
      <p>UGCC's Roads and Bridges division delivers safe, durable,
        high-capacity transport networks &mdash; highways, interchanges and
        complex bridge structures that connect people, cities and
        industries.</p>
      <p>The division carries fourteen contracts on record, from the 6th Ring
        Road to Interchange 82 on Salmi Road &mdash; at USD 487.2M the largest
        completed road contract in the portfolio &mdash; to the maintenance
        programmes that keep the 6th and 7th Ring Roads and Salmi Road in
        service. Current work includes the Cairo Street development and the
        roads and interchanges serving Mutla' City.</p>
      <p>Every kilometre is built to international standards of safety,
        efficiency and durability, with design, construction, testing and
        long-term maintenance handled by in-house engineering and project
        management teams.</p>
    </div>
  </div>
</section>
<section class="as-section as-section--tint">
  <div class="as-section__inner">
    <header class="as-head">
      <p class="as-head__eyebrow">Capabilities</p>
      <h2 class="as-head__title">From feasibility to long-term maintenance</h2>
      <span class="as-head__rule" aria-hidden="true"></span>
    </header>
    <ul class="as-pills">
      <li class="as-pill">Highway and expressway construction</li>
      <li class="as-pill">Interchanges and flyovers</li>
      <li class="as-pill">Bridge design and erection</li>
      <li class="as-pill">Road rehabilitation and maintenance</li>
      <li class="as-pill">Asphalt and concrete paving</li>
      <li class="as-pill">Stormwater drainage</li>
      <li class="as-pill as-pill--key">Motorway interchanges to USD 487M single-contract scale</li>
    </ul>
  </div>
</section>
<section class="as-section as-section--navy">
  <div class="as-section__inner">
    <header class="as-head">
      <p class="as-head__eyebrow">At a glance</p>
      <h2 class="as-head__title">Roads and Bridges in numbers</h2>
      <span class="as-head__rule" aria-hidden="true"></span>
    </header>
    <ul class="as-stats">
      <li class="as-stat">
        <span class="as-stat__figure">14</span>
        <span class="as-stat__unit">Contracts on record</span>
      </li>
      <li class="as-stat">
        <span class="as-stat__figure">USD 1.36B</span>
        <span class="as-stat__unit">Completed contract value</span>
      </li>
      <li class="as-stat">
        <span class="as-stat__figure">USD 487M</span>
        <span class="as-stat__unit">Largest single contract</span>
      </li>
    </ul>
  </div>
</section>
<figure class="as-band">
  <img src="/assets/img/v2/blp/roads-band.jpg"
       alt="Aerial view of a UGCC-built highway interchange in Kuwait"
       width="1920" height="1080" loading="lazy" decoding="async">
</figure>
<section class="as-section as-section--light">
  <div class="as-section__inner">
    <header class="as-head">
      <p class="as-head__eyebrow">Key projects</p>
      <h2 class="as-head__title">Four contracts that show the range</h2>
      <span class="as-head__rule" aria-hidden="true"></span>
      <p class="as-head__lede">From new expressway construction to city-scale
        road development, each with its own project page.</p>
    </header>
    <ul class="blp-proj">
      <li class="blp-proj__item">
        <a class="blp-proj__row" href="/ra-259"
           aria-label="6th Ring Road to Interchange 82, Salmi Road — Ministry of Public Works and PART, USD 487.2M, completed 2022">
          <span class="blp-proj__name">6th Ring Road to Interchange 82, Salmi Road</span>
          <span class="blp-proj__client">MPW / PART</span>
          <span class="blp-proj__value">USD 487.2M</span>
          <span class="blp-proj__status">Completed 2022</span>
          <span class="blp-proj__arrow" aria-hidden="true">&rarr;</span>
        </a>
      </li>
      <li class="blp-proj__item">
        <a class="blp-proj__row" href="/ra200"
           aria-label="Cairo Street Development — Ministry of Public Works and PART, USD 360.0M, in progress">
          <span class="blp-proj__name">Cairo Street Development</span>
          <span class="blp-proj__client">MPW / PART</span>
          <span class="blp-proj__value">USD 360.0M</span>
          <span class="blp-proj__status">In progress</span>
          <span class="blp-proj__arrow" aria-hidden="true">&rarr;</span>
        </a>
      </li>
      <li class="blp-proj__item">
        <a class="blp-proj__row" href="/ra245"
           aria-label="Roads and Interchanges to Mutla' City — Ministry of Public Works and PART, USD 357.9M, in progress">
          <span class="blp-proj__name">Roads and Interchanges to Mutla' City</span>
          <span class="blp-proj__client">MPW / PART</span>
          <span class="blp-proj__value">USD 357.9M</span>
          <span class="blp-proj__status">In progress</span>
          <span class="blp-proj__arrow" aria-hidden="true">&rarr;</span>
        </a>
      </li>
      <li class="blp-proj__item">
        <a class="blp-proj__row" href="/ra-223"
           aria-label="6.5 Ring Road Construction — Ministry of Public Works and PART, USD 316.0M, completed">
          <span class="blp-proj__name">6.5 Ring Road Construction</span>
          <span class="blp-proj__client">MPW / PART</span>
          <span class="blp-proj__value">USD 316.0M</span>
          <span class="blp-proj__status">Completed</span>
          <span class="blp-proj__arrow" aria-hidden="true">&rarr;</span>
        </a>
      </li>
    </ul>
  </div>
</section>
<section class="as-section as-section--tint">
  <div class="as-section__inner">
    <header class="as-head">
      <p class="as-head__eyebrow">All projects</p>
      <h2 class="as-head__title">Every Roads and Bridges contract on record</h2>
      <span class="as-head__rule" aria-hidden="true"></span>
      <p class="as-head__lede">Six contracts in delivery and eight completed,
        each with its own page.</p>
    </header>
    <div class="blp-btnrow">
      <a class="as-btn as-btn--on-light" href="/roads-and-bridges-current">Current projects (6)</a>
      <a class="as-btn as-btn--on-light" href="/roads-and-bridges-completed">Completed projects (8)</a>
    </div>
  </div>
</section>
<section class="as-section as-section--light">
  <div class="as-section__inner">
    <header class="as-head">
      <p class="as-head__eyebrow">Clients</p>
      <h2 class="as-head__title">Who we build for</h2>
      <span class="as-head__rule" aria-hidden="true"></span>
    </header>
    <ul class="blp-clients">
      <li class="blp-clients__item">
        <img src="/assets/img/0a508900-mpw-logo-AMqDBbG2P4SaEr7y.jpg"
             alt="Ministry of Public Works (MPW), Kuwait" width="512" height="177"
             loading="lazy" decoding="async">
      </li>
      <li class="blp-clients__item">
        <img src="/assets/img/0f3170d7-part-logo-vQ8vWcp6Oz724qsl.webp"
             alt="Public Authority for Roads and Transportation (PART), Kuwait" width="300" height="82"
             loading="lazy" decoding="async">
      </li>
      <li class="blp-clients__item">
        <img src="/assets/img/00a7c356-koc_logo_for_wikipedia-ljLWJesRHLstzg4H.png"
             alt="Kuwait Oil Company (KOC)" width="960" height="1187"
             loading="lazy" decoding="async">
      </li>
      <li class="blp-clients__item">
        <img src="/assets/img/197fcc72-kipic-odtYZVmql3vtss3x.jpg"
             alt="Kuwait Integrated Petroleum Industries Company (KIPIC)" width="768" height="842"
             loading="lazy" decoding="async">
      </li>
    </ul>
  </div>
</section>
<section class="as-section as-section--navy">
  <div class="as-section__inner">
    <header class="as-head">
      <p class="as-head__eyebrow">Get in touch</p>
      <h2 class="as-head__title">Talk to us about your project</h2>
      <span class="as-head__rule" aria-hidden="true"></span>
      <p class="as-head__lede">Tell us what you are building and we will point
        you at the team that has done it before.</p>
    </header>
    <a class="as-btn as-btn--on-dark" href="/contact-us">Contact us</a>
  </div>
</section>
```

- [ ] **Step 2: Splice the body into the page**

```bash
python3 - <<'EOF'
page = 'roads-and-bridges-contractor-kuwait/index.html'
html = open(page, encoding='utf-8').read()
start = html.index('<section class="block block--desktop-first-visible')
end = html.index('<section id="FUdf9w9dXZ"')
body = open('SCRATCHPAD/bodies/roads.html', encoding='utf-8').read()  # substitute real $SCRATCH path
open(page, 'w', encoding='utf-8').write(html[:start] + body + '\n' + html[end:])
print('spliced', len(body), 'bytes')
EOF
```

- [ ] **Step 3: Edit the head — stylesheets, script, JSON-LD**

```bash
python3 - <<'EOF'
page = 'roads-and-bridges-contractor-kuwait/index.html'
html = open(page, encoding='utf-8').read()
assert 'about-suite.css' not in html
html = html.replace(
  '<link rel="stylesheet" href="/assets/css/v2.css?v=4">',
  '<link rel="stylesheet" href="/assets/css/v2.css?v=4">'
  '<link rel="stylesheet" href="/assets/css/about-suite.css?v=3">'
  '<link rel="stylesheet" href="/assets/css/pages/business-line.css?v=1">', 1)
html = html.replace(
  '<script src="/assets/js/v2.js?v=3" defer></script>',
  '<script src="/assets/js/v2.js?v=3" defer></script>'
  '<script src="/assets/js/about-suite.js?v=2" defer></script>', 1)
old_img = 'https://ugcc.com/assets/img/7d61e989-credentials1-Yan0oklJ5MsZjQ3n.png'
assert old_img in html
html = html.replace(old_img, 'https://ugcc.com/assets/img/v2/blp/roads-cover.jpg')
open(page, 'w', encoding='utf-8').write(html)
print('head updated')
EOF
```

If either `replace` target string is not found verbatim (builder attribute
order can differ per page), locate the real tag with python, adjust the
target, and note the variance for the rollout tasks.

- [ ] **Step 4: Check for share-card tags**

```bash
python3 -c "
html = open('roads-and-bridges-contractor-kuwait/index.html').read()
print('og:image' in html, 'twitter:image' in html)"
```

If `True`, repoint them at the cover and add non-empty `og:image:alt` /
`twitter:image:alt` equal to the cover alt (hub defect 4). If `False False`,
nothing to do — do not add new og tags.

- [ ] **Step 5: Run the static tests for this page**

```bash
npx --no-install vitest run --dir tests -t "roads-and-bridges" 2>&1 | tail -8
```

Expected: all `roads-and-bridges-contractor-kuwait` tests PASS. (Other pages'
tests still fail — that is the rollout's job.)

- [ ] **Step 6: Verify reveal wiring by reading, not watching**

```bash
grep -o "SELECTOR[^;]*" assets/js/about-suite.js | head -2
grep -n "opacity: 0" assets/css/pages/business-line.css || echo "no opacity gate in page css"
```

Expected: the about-suite selector list contains only kit classes (plus
`.bl-tile`) — no `blp-` class; the page CSS declares no `opacity: 0`.
Conclusion to record: nothing on this page can be hidden by a reveal gate
that the script fails to lift.

- [ ] **Step 7: Commit**

```bash
git add roads-and-bridges-contractor-kuwait/index.html
git commit -m "feat(business-line-pages): rebuild Roads and Bridges on the kit spine"
```

---

## Task 6: Browser verification of the reference page — CHECKPOINT

**Files:** none changed unless a check fails.

- [ ] **Step 1: Serve the worktree**

Add (do not commit) a launch entry to the **main checkout's**
`.claude/launch.json` — it already carries other sessions' uncommitted local
entries; append, never replace:

```json
{
  "name": "ugcc-bl-pages",
  "runtimeExecutable": "python3",
  "runtimeArgs": ["-m", "http.server", "8765", "--directory",
    "/Users/danijeljovanovic/Dev/UGCC Website/.claude/worktrees/business-line-pages"],
  "port": 8765
}
```

Then `preview_start` with name `ugcc-bl-pages` (never Bash).

- [ ] **Step 2: Load the page and check the console**

Navigate to
`http://localhost:8765/roads-and-bridges-contractor-kuwait/`.
`read_console_messages` with `onlyErrors: true`. Expected: no errors.

- [ ] **Step 3: Run the harness**

Execute `tools/business-line-check.js` via `javascript_tool` (paste the file
contents). Expected: `N passed, 0 failed, 0 skipped` — if skips are reported
for undecoded images, scroll them into view (or run the decode helper pattern
from the hub) and re-run until 0 skipped.

- [ ] **Step 4: Negative-test the harness (required — this is the standing lesson)**

In the live page via `javascript_tool`, break each guarded invariant and
confirm the harness FAILS, then reload to restore:

1. `document.querySelector('.v2-subnav a.is-active').removeAttribute('aria-current')` → re-run harness → must report a failure.
2. `document.querySelector('.blp-proj__row').setAttribute('aria-label','wrong')` → must fail the prefix assertion.
3. `document.querySelector('.blp-btnrow').insertAdjacentHTML('beforeend','<a class="as-btn as-btn--on-light" href="/oil-and-gas-current">x</a>')` → must fail the button-count assertion.
4. `document.querySelector('.as-stat__figure').textContent='999'` → must fail the stat assertion.

Record all four results. A negative test that passes green is a harness bug —
fix the harness before proceeding.

- [ ] **Step 5: Visual pass at three widths**

`resize_window` 1280×2100 → screenshot (cover + subnav + overview + pills
visible). Then navigate with a fragment or re-screenshot after resize to
2100-tall segments if needed. Check: H1 fits the cover without overflow
(spec §4.1 — if it overflows, add the measured `max-width`/`font-size`
override to `business-line.css` with a comment, bump `?v=1` → `?v=2` on this
page only... no: the sheet is shared; bump the link on every already-built
page in the same commit). Then 920×1400 and 390×1400: rows stack per the
≤920px grid, buttons full-width, no horizontal overflow.

- [ ] **Step 6: Keyboard and reduced-motion checks**

Tab through: subnav tabs (8 stops) → four rows → two buttons → contact
button; ring visible on each. DevTools → emulate
`prefers-reduced-motion: reduce` → reload: no arrow slide transition, hover
tint still appears.

- [ ] **Step 7: JS-disabled render**

DevTools → disable JavaScript → reload. Expected: entire page present —
cover, all sections, rows, logos. Nothing blank.

- [ ] **Step 8: Fix anything found, commit fixes**

```bash
git add -A && git commit -m "fix(business-line-pages): <what was actually wrong>"
```

Skip if nothing needed fixing.

- [ ] **Step 9: CHECKPOINT — user review**

Report to the user with screenshots: the reference page is built and
verified. **Wait for approval of the template (and any copy notes) before
executing Tasks 7–12.** Fold requested changes into the reference page first,
re-verify, then roll out.

---

## Tasks 7–12: The six rollout pages

Each task instantiates the **exact markup pattern of Task 5 Step 1** with the
page's content block below, then repeats Task 5 Steps 2–7 with the page's own
paths (splice markers are identical on every page; the JSON-LD `old_img`
string is identical on every page). The structure, class names, section
order, attribute sets, and head-edit script are byte-identical apart from the
substitutions listed. After each page: run its static tests
(`npx --no-install vitest run --dir tests -t "<slug>"`), load it in the
preview, run the harness expecting `0 failed, 0 skipped`, then commit
`feat(business-line-pages): rebuild <name> on the kit spine`.

Shared invariants (identical on all six, already shown in Task 5): the
sub-nav block (move `is-active` + `aria-current` to the page's own tab), the
Contact section (byte-identical), the stats unit strings, the eyebrow set
("Business lines", "Overview", "Capabilities", "At a glance", "Key
projects", "All projects", "Clients", "Get in touch"), and the client-tile
markup shape with these five logo files and alts reused wherever a page's
client table names them:

| Client | src | width×height | alt |
|---|---|---|---|
| MPW | `/assets/img/0a508900-mpw-logo-AMqDBbG2P4SaEr7y.jpg` | 512×177 | Ministry of Public Works (MPW), Kuwait |
| PART | `/assets/img/0f3170d7-part-logo-vQ8vWcp6Oz724qsl.webp` | 300×82 | Public Authority for Roads and Transportation (PART), Kuwait |
| KOC | `/assets/img/00a7c356-koc_logo_for_wikipedia-ljLWJesRHLstzg4H.png` | 960×1187 | Kuwait Oil Company (KOC) |
| KIPIC | `/assets/img/197fcc72-kipic-odtYZVmql3vtss3x.jpg` | 768×842 | Kuwait Integrated Petroleum Industries Company (KIPIC) |
| KNPC | `/assets/img/00e30217-knpc_logo-xpeDn4iOkPwRQFQF.png` | 311×162 | Kuwait National Petroleum Company (KNPC) |
| Joint Operations | `/assets/img/436022ea-joint-operations-logo-oDF3iTx7wEC5UshP.jpg` | 375×154 | Joint Operations, Saudi Arabian Chevron |
| PAHW | `/assets/img/16beec30-pahw-logo-A1aznJOQO3fzeEpJ.png` | 319×128 | Public Authority for Housing Welfare (PAHW), Kuwait |
| PAI | `/assets/img/1458611b-pai-logo-YbN4P9ovpbu73RG9.png` | 375×250 | Public Authority for Industry (PAI), Kuwait |
| MEW | `/assets/img/01daaebd-mew-wJ8m4JEAhgIittxO.jpeg` | 270×143 | Ministry of Electricity and Water (MEW), Kuwait |
| Nama Water | `/assets/img/02702205-nama-logo-PPwuePDlsgWe3TpJ.jpg` | 375×165 | Nama Water Services, Oman |
| Jeeran Al-Khaleej | `/assets/img/19d01ada-jeeranalkhaleej-oldlogo-copy-unAcztivoYvri2DA.jpg` | 375×304 | Jeeran Al-Khaleej Real Estate |

Band/cover `width`/`height`: use Task 1 Step 6's recorded values, always.
Cover/band alt drafts below must be checked against Task 1 Step 3's notes of
what each derived frame actually shows, and corrected if they misdescribe it.

### Task 7: Civil Infrastructure

**Files:** Modify `civil-infrastructure-kuwait/index.html`. Scratch body:
`$SCRATCH/bodies/civil.html`.

Content block:

- **Cover:** src `/assets/img/v2/blp/civil-cover.jpg`; alt "Completed civil
  works plaza with barrier line and gate structures at a UGCC site"; H1
  `Civil Infrastructure`; lede "Water networks, sewerage and drainage,
  pumping stations, utility corridors, foundations and earthworks."
- **Overview** — title "The essential backbone of modern communities"; prose:

```html
<p>UGCC's Civil Infrastructure division delivers the essential backbone of
  modern communities &mdash; utilities and water networks, foundations and
  industrial facilities &mdash; executed with the engineering depth and
  safety standards that large, complex projects demand.</p>
<p>Seventeen contracts on record span water supply and distribution,
  sewerage and drainage, pumping stations, utility corridors and earthworks:
  from the Mishref pump station and its interceptors to the infrastructure
  works for the commercial berth at Duqm Port, and the civil packages inside
  contracts as large as the USD 509M Kuwait Airport apron and taxiways.</p>
<p>Because civil infrastructure serves generations, the division takes a
  long-term approach &mdash; robust safety protocols, environmentally
  responsible construction and materials chosen for resilience.</p>
```

- **Capabilities** — title "Full-spectrum civil works"; pills: Water supply
  and distribution / Sewerage and drainage / Pumping stations and reservoirs /
  Utility corridors and duct banks / Foundations and earthworks / Structural
  concrete and retaining systems / **key:** 17 contracts across water,
  sewerage and earthworks
- **Stats:** `17` / `USD 2.20B` / `USD 509M`; stats title "Civil
  Infrastructure in numbers".
- **Band:** src `/assets/img/v2/blp/civil-band.jpg`; alt "Excavation and
  utility works on a UGCC civil infrastructure site".
- **Key projects** — title "From airport aprons to residential cities";
  lede "The four largest civil contracts on record, each with its own page.";
  rows:

| href | name | client | value | status |
|---|---|---|---|---|
| `/kp3cns301` | Kuwait Airport Apron and Taxiways | MPW | USD 509.0M | In progress |
| `/ra-259` | 6th Ring Road to Interchange 82, Salmi Road | MPW / PART | USD 487.2M | Completed 2022 |
| `/pahwc1151` | Sabah Al Ahmed Residential City | PAHW | USD 422.2M | Completed 2014 |
| `/ra245` | Roads and Interchanges to Mutla' City | MPW / PART | USD 357.9M | In progress |

aria-label pattern as Task 5: `"<name> — <client full words>, <value>, <status lowercased>"`.

- **All projects** — title "Every Civil Infrastructure contract on record";
  lede "Four contracts in delivery and thirteen completed, each with its own
  page."; buttons `/civil-current` "Current projects (4)",
  `/civil-completed` "Completed projects (13)".
- **Clients (7):** MPW, PART, PAI, PAHW, KOC, KIPIC, Joint Operations.
- **JSON-LD image:** `https://ugcc.com/assets/img/v2/blp/civil-cover.jpg`.

### Task 8: Building Construction

**Files:** Modify `building-construction-kuwait/index.html`. Scratch body:
`$SCRATCH/bodies/building.html`.

This page's current intro is the Civil Infrastructure intro verbatim — it is
replaced, not edited (§9.1 repair).

- **Cover:** src `/assets/img/v2/blp/building-cover.jpg`; alt "Reinforced
  concrete frame of a UGCC building project under construction"; H1
  `Building Construction`; lede "Structural and reinforced concrete, facades,
  steel roof systems, fit-out and turnkey delivery."
- **Overview** — title "From structural frame to turnkey handover"; prose:

```html
<p>UGCC's Building Construction division delivers buildings from structural
  frame to turnkey handover &mdash; residential, institutional and
  industrial. One team carries a project from concept to completion:
  structural works, architectural finishes, electro-mechanical systems and
  interior fit-out.</p>
<p>The record runs from the College of Basic Education at Ardiya to Sabah Al
  Ahmed Residential City &mdash; at USD 422.2M the division's largest
  completed contract &mdash; alongside current work on the Kuwait Airport
  apron and taxiways package and the Jeeran Al-Khaleej residential tower in
  Fintas.</p>
<p>Rigorous quality management, proactive safety practice and efficient
  material use govern every stage, so that each building is reliable, safe
  and built to serve the community around it.</p>
```

- **Capabilities** — title "Integrated building delivery"; pills: Structural
  and reinforced concrete / Architectural and interior finishes /
  Electro-mechanical and HVAC installation / Steel structures and roof
  systems / Building envelopes and facades / **key:** Turnkey delivery to
  USD 509M contract scale
- **Stats:** `7` / `USD 942M` / `USD 509M`; stats title "Building
  Construction in numbers".
- **Band:** src `/assets/img/v2/blp/building-band.jpg`; alt "Facade and roof
  works on a UGCC building project".
- **Key projects** — title "Landmark buildings on record"; lede "The four
  largest building contracts, each with its own page."; rows:

| href | name | client | value | status |
|---|---|---|---|---|
| `/kp3cns301` | Kuwait Airport Apron and Taxiways | MPW | USD 509.0M | In progress |
| `/pahwc1151` | Sabah Al Ahmed Residential City | PAHW | USD 422.2M | Completed 2014 |
| `/c502015-infrastructure-works-for-the-commercial-berth-at-duqm-port-ip3-oman` | Duqm Port Commercial Berth Infrastructure | SEZAD, Oman | USD 200.6M | Completed 2020 |
| `/paafa77` | College of Basic Education, Ardiya | PAAET | USD 132.6M | Completed |

- **All projects** — title "Every Building Construction contract on record";
  lede "Two contracts in delivery and five completed, each with its own
  page."; buttons `/building-construction-current` "Current projects (2)",
  `/building-construction-completed` "Completed projects (5)".
- **Clients (5):** MPW, PAHW, Joint Operations, KIPIC, Jeeran Al-Khaleej.
- **JSON-LD image:** `https://ugcc.com/assets/img/v2/blp/building-cover.jpg`.

### Task 9: Oil and Gas

**Files:** Modify `oil-and-gas-construction-kuwait/index.html`. Scratch
body: `$SCRATCH/bodies/oil.html`.

Status-aware page: ONE listing button. Fixes "stream flood" and "tankge
upgradation" (§9.1).

- **Cover:** src `/assets/img/v2/blp/oil-cover.jpg`; alt "Pipe racks and
  process structures at a Kuwait oil and gas facility"; H1 `Oil and Gas`;
  lede "Gathering centres, heavy civil foundations, pipe racks, tank farms
  and blast-resistant shelters."
- **Overview** — title "Civil works for the oil and gas industry"; prose:

```html
<p>Construction for the oil and gas industry is a key component of UGCC's
  services. The division builds and maintains gathering centres, heavy civil
  foundations, pipe racks &mdash; including structural fabrication and
  erection &mdash; pipe sleepers, tank farms, pre-engineered buildings and
  blast-resistant shelters.</p>
<p>All four contracts on record are complete: the civil and tank works at
  the Al-Zour refinery, the GC-32 gathering centre for South East Kuwait,
  the large-scale steam flood pilot at Wafra for Joint Operations, and the
  effluent-water pipelines and tank upgrade at West Kuwait.</p>
<p>UGCC also carries maintenance programmes for government-owned oil
  companies, including civil works at the Mina Ahmadi refinery and upgrades
  to sub-centre facilities.</p>
```

- **Capabilities** — title "Built to refinery standards"; pills: Gathering
  centres / Heavy civil foundations / Pipe racks and sleepers / Tank farms /
  Blast-resistant shelters / Refinery maintenance / **key:**
  Gathering-centre civil works for KOC
- **Stats:** `4` / `USD 291M` / `USD 114M`; stats title "Oil and Gas in
  numbers".
- **Band:** src `/assets/img/v2/blp/oil-band.jpg`; alt "Tank farm and piping
  under construction at a UGCC oil and gas site".
- **Key projects** — title "Four contracts, all delivered"; lede "Every oil
  and gas contract on record, each with its own page."; rows:

| href | name | client | value | status |
|---|---|---|---|---|
| `/zorepc0059` | Al-Zour Refinery Civil and Tank Works | KNPC &ndash; KIPIC | USD 114.2M | Completed |
| `/gc32` | GC-32 Gathering Centre Civil Works | KOC | USD 72.5M | Completed 2022 |
| `/josc151lsp06` | Large Scale Steam Flood Pilot, Wafra | Joint Operations | USD 72.0M | Completed |
| `/koc36081` | Effluent Water Pipelines, West Kuwait | KOC | USD 32.1M | Completed |

- **All projects** — title "Every Oil and Gas contract on record"; lede
  "All four contracts on record are complete, each with its own page.";
  **one** button: `/oil-and-gas-completed` "Completed projects (4)". Do NOT
  emit a current-side button or any `/oil-and-gas-current` href.
- **Clients (4):** KOC, KNPC, KIPIC, Joint Operations.
- **JSON-LD image:** `https://ugcc.com/assets/img/v2/blp/oil-cover.jpg`.

### Task 10: Water and Wastewater

**Files:** Modify `water-treatment-plant-kuwait/index.html`. Scratch body:
`$SCRATCH/bodies/water.html`.

Fixes "GCC has tremendous expertise" (missing U) and the broken split H1
("Water and waste / water management") (§9.1). The USD 358M figure — wrongly
shown on the electro-mechanical page today — appears here, where it is true.

- **Cover:** src `/assets/img/v2/blp/water-cover.jpg`; alt "Pump line inside
  a UGCC-built pumping station hall"; H1 `Water and Wastewater`; lede
  "Treatment plants, pumping stations, reservoirs, distribution mains and
  trunk sewers."
- **Overview** — title "Three decades of water and wastewater work"; prose:

```html
<p>UGCC has three decades of expertise in water and wastewater management
  &mdash; treatment plants, pumping stations and the piping works that
  connect them.</p>
<p>The record runs from the Mishref pump station, its force mains and
  interceptors, and the TSE pumping stations and reservoirs at DMC, Kabad
  and Wafra, to current work on nine fresh-water towers at Mutlaa City and
  two live sewer contracts in Oman for Nama Water Services.</p>
```

- **Capabilities** — title "From intake to outfall"; pills: Water treatment
  plants / Pumping stations / Reservoirs and distribution mains / Trunk
  sewers / Pipeline works / **key:** Pump stations to USD 152M contract
  scale
- **Stats:** `6` / `USD 358M` / `USD 152M`; stats title "Water and
  Wastewater in numbers".
- **Band:** src `/assets/img/v2/blp/water-band.jpg`; alt "Treatment basins
  at a UGCC water infrastructure site".
- **Key projects** — title "Pump stations, sewers and reservoirs"; lede
  "The four largest water contracts on record, each with its own page.";
  rows:

| href | name | client | value | status |
|---|---|---|---|---|
| `/se19` | Mishrif Pump Station and Interceptors | MPW | USD 152.0M | Completed |
| `/5a-haya-eo24` | Al Khoudh Gravity Sewer Network, Oman | Haya Water | USD 151.1M | Completed |
| `/se97` | TSE Pumping Stations and Reservoirs | MPW | USD 55.0M | Completed |
| `/mew6085` | 9 Fresh Water Towers, Mutlaa City | MEW | USD 27.3M | In progress |

- **All projects** — title "Every Water and Wastewater contract on record";
  lede "Three contracts in delivery and three completed, each with its own
  page."; buttons `/water-current` "Current projects (3)",
  `/water-completed` "Completed projects (3)".
- **Clients (3):** MPW, MEW, Nama Water.
- **JSON-LD image:** `https://ugcc.com/assets/img/v2/blp/water-cover.jpg`.

### Task 11: Electro-Mechanical

**Files:** Modify `electro-mechanical-contractor-kuwait/index.html`. Scratch
body: `$SCRATCH/bodies/electro.html`.

Fixes the broken H1 ("Electro Mechanical" → "Electro-Mechanical"), "tankge
upgradation", and **replaces the false USD 358M stat** with the true
completed figure (§9.1).

- **Cover:** src `/assets/img/v2/blp/electro-cover.jpg`; alt "Street
  lighting columns along a Kuwait motorway built by UGCC"; H1
  `Electro-Mechanical`; lede "Street lighting, fire fighting systems, HVAC,
  instrumentation and pipeline works."
- **Overview** — title "The firm's busiest line"; prose:

```html
<p>UGCC's electro-mechanical works span sewage pumping stations, treatment
  plants, street lighting for roads and motorways, fire-fighting systems and
  oil-industry piping &mdash; including a new 30-inch high-pressure gas
  transmission line in northern Kuwait.</p>
<p>Eighteen contracts on record make this the firm's busiest line: the
  electro-mechanical packages inside major road contracts from the 6th Ring
  Road to Mutla' City, street lighting at Dasman, Shamiya, Subiya and
  Al-Mutlaa, and pumping stations at DMC, Kabad and Wafra.</p>
```

- **Capabilities** — title "Electrical and mechanical, end to end"; pills:
  Street lighting / Pumping stations / Treatment plants / Fire-fighting
  systems / Instrumentation / HVAC / **key:** Street lighting to 30-inch HP
  gas lines
- **Stats:** `18` / `USD 2.03B` / `USD 487M`; stats title
  "Electro-Mechanical in numbers".
- **Band:** src `/assets/img/v2/blp/electro-band.jpg`; alt "Electrical and
  mechanical installation works on a UGCC project".
- **Key projects** — title "The packages inside the biggest contracts";
  lede "The four largest contracts carrying electro-mechanical scope, each
  with its own page."; rows:

| href | name | client | value | status |
|---|---|---|---|---|
| `/ra-259` | 6th Ring Road to Interchange 82, Salmi Road | MPW / PART | USD 487.2M | Completed 2022 |
| `/ra245` | Roads and Interchanges to Mutla' City | MPW / PART | USD 357.9M | In progress |
| `/ra-223` | 6.5 Ring Road Construction | MPW / PART | USD 316.0M | Completed |
| `/pai18pa` | Al Shadadiya Industrial Zone Works | PAI | USD 315.0M | In progress |

- **All projects** — title "Every Electro-Mechanical contract on record";
  lede "Seven contracts in delivery and eleven completed, each with its own
  page."; buttons `/electro-mechanical-current` "Current projects (7)",
  `/electro-mechanical-completed` "Completed projects (11)".
- **Clients (6):** MPW, PART, MEW, PAHW, PAI, Nama Water.
- **JSON-LD image:** `https://ugcc.com/assets/img/v2/blp/electro-cover.jpg`.

### Task 12: Micro-Tunnelling

**Files:** Modify `micro-tunneling-kuwait/index.html`. Scratch body:
`$SCRATCH/bodies/micro.html`.

Fixes "sever network" (§9.1). Display text double-L; the **directory and
every href stay single-L** — do not "fix" any URL. Title tag changes to the
double-L form.

- **Cover:** src `/assets/img/v2/blp/micro-cover.jpg`; alt
  "Micro-tunnelling shaft with jacking pipe sections below ground level";
  H1 `Micro-Tunnelling`; lede "Guided boring 250&ndash;2400 mm diameter,
  shaft sinking to 30 m, without surface disruption."
- **Overview** — title "Pipelines without opening the ground"; prose:

```html
<p>UGCC installs pipelines by guided boring &mdash; micro-tunnelling &mdash;
  with international experience across Kuwait, Oman and India. Specialised
  crews handle pipes from 250 mm to 2400 mm in diameter and shaft sinking to
  a depth of 30 m, diverting live utility mains without lengthy service
  interruptions or surface disruption.</p>
<p>The method serves civil infrastructure, sewage, electro-mechanical and
  oil-industry works: the Mishrif pump station interceptors, the Al Khoudh
  gravity sewer network in Oman, trenchless installation at Hyderabad, and
  the C3B sewer network in the Seeb catchment for Nama Water Services.</p>
```

- **Capabilities** — title "Trenchless, guided, precise"; pills:
  Micro-tunnelling / Guided boring / Shaft sinking / Sewer networks /
  Utility diversions / **key:** Guided boring 250&ndash;2400 mm &middot;
  shafts to 30 m
- **Stats:** `5` / `USD 303M` / `USD 168M`; stats title "Micro-Tunnelling
  in numbers".
- **Band:** src `/assets/img/v2/blp/micro-band.jpg`; alt "Tunnel boring
  works on a UGCC trenchless pipeline drive".
- **Key projects** — title "Trenchless drives on record"; lede "The four
  largest contracts carrying micro-tunnelling scope, each with its own
  page."; rows:

| href | name | client | value | status |
|---|---|---|---|---|
| `/ra268` | Kuwait Airport Roads, Maqwa Road | MPW | USD 167.8M | In progress |
| `/se19` | Mishrif Pump Station and Interceptors | MPW | USD 152.0M | Completed |
| `/5a-haya-eo24` | Al Khoudh Gravity Sewer Network, Oman | Haya Water | USD 151.1M | Completed |
| `/owwsct2460879` | Bausher Main Trunk Sewer, Oman | Nama Water Services | OMR 21.0M | In progress |

- **All projects** — title "Every Micro-Tunnelling contract on record";
  lede "Three contracts in delivery and two completed, each with its own
  page."; buttons `/micro-tunneling-current` "Current projects (3)",
  `/micro-tunneling-completed` "Completed projects (2)".
- **Clients (2):** MPW, Nama Water.
- **Head extras:** in addition to the standard head edits, replace the title
  text: `<title>Micro-Tunneling Kuwait` → `<title>Micro-Tunnelling Kuwait`,
  and the JSON-LD `"name"` field likewise (JSON-LD `url` and keywords keep
  the single-L URL string — only display text changes).
- **JSON-LD image:** `https://ugcc.com/assets/img/v2/blp/micro-cover.jpg`.

---

## Task 13: Full-suite verification

**Files:** none changed unless a check fails.

- [ ] **Step 1: Full static suite**

```bash
npx --no-install vitest run --dir tests 2>&1 | tail -10
```

Expected: every test green, including `chat.test.mjs`. Zero failures.

- [ ] **Step 2: Harness on all seven pages**

Load each page in the preview, run `tools/business-line-check.js`, force
image decode by scrolling, and record the counts. Expected on all seven:
`0 failed, 0 skipped`. Also `read_console_messages` `onlyErrors: true` per
page: no errors.

- [ ] **Step 3: Cross-page spot-checks**

- On the hub (`/business-lines-construction-services-kuwait/`): confirm it
  still renders and its harness (`tools/business-lines-check.js`) still
  passes — the sub-pages must not have touched it.
- Click through: hub tile → discipline page → sub-nav to another discipline →
  its listing button → a listing page. The loop the spine exists to create.

- [ ] **Step 4: Weight audit**

For each page, sum transferred image bytes on a cold load
(`read_network_requests`). Expected: cover + band + logos well under the old
duplicate-asset pages. Record per-page numbers for the handover.

- [ ] **Step 5: JS-disabled and reduced-motion sweep**

One page from the rollout set (pick Water) + the reference page: disable JS →
full render; reduced motion → no transforms, colour feedback intact.

- [ ] **Step 6: Screenshots for the handover**

1280×2100 of each of the seven pages (tall viewport; do not scroll before
capturing).

- [ ] **Step 7: Commit any fixes**

```bash
git add -A && git commit -m "fix(business-line-pages): <what was actually wrong>"
```

---

## Task 14: Handover

- [ ] **Step 1: Append the handover section to this plan file**

Record: harness counts per page, static-suite total, per-page image weights
(Task 1 Step 5 + Task 13 Step 4), anything deferred, and — explicitly —
**copy is Claude-drafted and not client-approved; every string is
replaceable without touching CSS.**

- [ ] **Step 2: Final commit**

```bash
git add -A
git commit -m "docs(business-line-pages): record handover state"
```

- [ ] **Step 3: Report to the user**

Do **not** merge to `V2`. Report: branch name, worktree path, screenshots,
harness/static-test results, the §11 follow-ups (listing-rail tab set,
qstsh15 value, old asset GC), and the copy-approval gate. The user decides
on merge.

---

## Self-review

**Spec coverage.** §3 files → Tasks 2, 5–12 head edits. §4.1 cover → Tasks
5–12 + overflow check Task 6 Step 5. §4.2 sub-nav → every body + static test
+ harness 3. §4.3–4.5 → every body; stat figures asserted (harness 4).
§4.6 band → Task 1 + bodies. §4.7 rows → Task 2 CSS + bodies + harness 5.
§4.8 status-aware → Task 9 + harness 6 + static test. §4.9 clients → bodies
+ harness 7. §4.10 contact → bodies (byte-identical block). §5 meta → head
edit step per page + Task 12 title extras + share-card check (Task 5 Step
4). §6 frozen data → embedded in harness DATA and page tasks, they must
agree. §7 copy rules → prose blocks in Tasks 5, 7–12; typo strings asserted
absent (static tests). §8 stylesheet → Task 2. §9 a11y → markup + harness 1,
3, 5, 7, 8 + Task 6 Steps 6–7. §10 verification → Tasks 3, 4, 6, 13;
negative tests Task 6 Step 4. §11 follow-ups → Task 14 report.

**Known judgement points left to execution:** band-vs-cover distinctness
(Task 1 Step 3 names the fallbacks); head-edit replace targets may vary per
builder export (Task 5 Step 3 says how to adapt); cover H1 overflow override
(Task 6 Step 5 says exactly where it goes and that the `?v=` bump must cover
already-built pages).

**Checkpoint discipline:** Task 6 Step 9 blocks Tasks 7–12 on user approval
of the reference page.

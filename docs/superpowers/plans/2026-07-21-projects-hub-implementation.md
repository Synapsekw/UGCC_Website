# Projects Hub (Variant B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/construction-projects-kuwait` with the approved Variant B unified filterable grid, shipping AVIF+JPEG right-sized images, immutable caching, and a frozen-content test harness in the same change.

**Architecture:** The approved mockup `mockups/projects-hub-b/index.html` (commit ea869bf) is the visual contract; the production page is derived from it by script (never retyped). A manifest TSV is the single source of truth for slug → status → disciplines → source frame, consumed by the image pipeline, the page transform, and the checker. All work happens in the worktree `.claude/worktrees/projects-redesign` on branch `projects-redesign`.

**Tech Stack:** Static HTML (Hostinger export, buildless), sips-316 (AVIF encode), Python 3 for HTML surgery, Node 24 for checks, vitest (npx cache, plain-object config), Netlify headers.

**Spec:** `docs/superpowers/specs/2026-07-21-projects-hub-design.md`

**Hard constraints (apply to every task):**
- Content freeze: frozen strings are byte-copied programmatically from source files, never retyped. The mockup's strings were already byte-verified; do not re-wrap or re-encode entities.
- `sips --cropOffset` is silently broken on this machine — resample only, never crop.
- Only breakpoints 920px (+600px grid collapse). Builder header and footer `#FUdf9w9dXZ` stay byte-intact.
- Never edit files outside the worktree. Commit after every task.

---

### Task 1: Manifest — single source of truth

**Files:**
- Create: `tools/projects-hub-manifest.tsv`

- [ ] **Step 1: Write the manifest** (columns: slug, status, lines, source image; TAB-separated; data below was extracted from the approved mockup and verified against the discipline listing pages)

```tsv
ra268	current	roads civil micro	/assets/img/f67318ea-ra-268-2-dhH2XtbGOmoWxnVU.webp
qstsh15	current	roads	/assets/img/fde55784-cover-2.jpg.840x605_q90_format-webp-zXp0feFbDF5OrM65.jpg
hst7	current	roads	/assets/img/18f613de-dji_20250324092108_0068_d.jpg.840x605_q90_format-webp-IAo74kC4Ry0UDwit.jpg
hst6	current	roads	/assets/img/fd772970-dji_20250326112425_0066_d_2ebbzyq.jpg.840x605_q90_format-webp-1d82G42bJu7k6VwQ.jpg
ra245	current	roads civil em	/assets/img/7806bec4-cover-4-m5K85rOLGvIqan3a.jpg
ra200	current	roads	/assets/img/67892611-dji_20251026105928_0039_d-nSkE4qjlJDXYstnP.JPG
owwsct2459831	current	micro water em	/assets/img/6d1d2c55-owwsc-t-2459831-2023-d103-2024-cover-2-4IEg95qgNxIDjM3B.webp
owwsct2460879	current	micro water em	/assets/img/3a12bf31-owwsc-t-2460879-2023-c1246-2024-cover-0jxo0KTxP9teYyTG.webp
mew5773	current	em	/assets/img/8a36b9b9-mew-5773-2022-2023-cover-36iJ1EuNfAAnVAoB.webp
pahw1533	current	em	/assets/img/a73ce4c9-dji_20241123170923_0018_d.mp4_20250519_120659.104.jpg.840x605_q90_format-webp-QPCUwQ4t91WRSkW2.jpg
mew6085	current	water em	/assets/img/eb821544-mew-6085-2024-2025-cover-F1gB74AcL6aZ8mya.webp
kp3cns301	current	civil building	/assets/img/v2/proj/kp3cns301-880.jpg
pai18pa	current	civil em	/assets/img/v2/proj/pai18pa-880.jpg
jeeran-al-khaleej-residential-tower	current	building	/assets/img/cc98aedf-jeeran-al-khaleej-tower-cover-2-j0YcwoiNyCQtKBj7.webp
ra-126	completed	roads em	/assets/img/e7fa80e1-cover-YrD4E68vvNT9lkXG.jpg
ra-171	completed	roads civil	/assets/img/ef3669ba-137p1150418-AGBzD3RRLLs51W58.JPG
5a-haya-eo24	completed	civil micro water	/assets/img/8137beda-aseeb2-AzGMBDR0pVI82e19.jpg
se97	completed	water em	/assets/img/b29915a2-se-97-cover-mjE412MKzLspGPgN.JPG
se19	completed	civil micro water em	/assets/img/ad15ee57-dsc_1178r-m7VD7kJLl5txnkBz.jpg
koc36081	completed	civil em oil	/assets/img/c24f7d45-36081_15_xf61cvc.jpg.840x605_q90_format-webp-7S3GmvRjythHG9Zm.jpg
josc151lsp06	completed	civil building em oil	/assets/img/22a15801-cover-Y4LPw4OJojI7wEje.jpg
ra152	completed	civil em	/assets/img/88d479c9-cover-Yg24ZaJV3WSGPPRX.jpg
paafa77	completed	civil building em	/assets/img/857c1d04-cbe-gal-04-a-edit-YbN4PZqjykhNzD7x.jpg
pahwc1151	completed	civil building em	/assets/img/v2/proj/pahwc1151-880.jpg
gc32	completed	roads civil oil	/assets/img/d687c0a9-cover-mePgoLy6gZHJ2RJE.jpg
c502015-infrastructure-works-for-the-commercial-berth-at-duqm-port-ip3-oman	completed	roads civil building em	/assets/img/v2/proj/c502015-880.jpg
mer-r-419	completed	roads	/assets/img/f7816ef4-adji_0033-AR01j7bBzvT9925k.jpg
ra-259	completed	roads civil em	/assets/img/v2/proj/ra-259-880.jpg
ra-223	completed	roads civil em	/assets/img/8251b5d1-cover-AoP4orzaV7c1MVvP.jpg
zorepc0059	completed	roads civil building oil	/assets/img/v2/proj/zorepc0059-880.jpg
```

- [ ] **Step 2: Verify integrity** — 30 rows, 14 current, 16 completed, every source file exists:

```bash
cd "/Users/danijeljovanovic/Dev/UGCC Website/.claude/worktrees/projects-redesign"
awk -F'\t' 'END{print NR" rows"} $2=="current"{c++} $2=="completed"{k++} END{print c" current, "k" completed"}' tools/projects-hub-manifest.tsv
while IFS=$'\t' read -r slug st ln src; do [ -f ".${src}" ] || echo "MISSING: $src"; done < tools/projects-hub-manifest.tsv
```
Expected: `30 rows`, `14 current, 16 completed`, no MISSING lines. Also verify the mockup agrees: for each row, the slug's card in `mockups/projects-hub-b/index.html` must carry the same `data-status`, `data-lines`, and img src (script it with python; any mismatch is a stop-and-report).

- [ ] **Step 3: Commit**

```bash
git add tools/projects-hub-manifest.tsv
git commit -m "feat(projects): manifest of 30 hub cards (status, lines, source frame)"
```

---

### Task 2: Image pipeline — right-sized AVIF + JPEG derivatives

**Files:**
- Create: `tools/make-projects-hub-images.sh`
- Create (generated, committed): `assets/img/v2/proj/<slug>-440.{jpg,avif}` for all 30; `<slug>-880.{jpg,avif}` only where source ≥880px; `assets/img/v2/hero-projects-{960,1440,1920}.{jpg,avif}`; `assets/img/v2/hero-current-{960,1440,1920}.{jpg,avif}`

- [ ] **Step 1: Write the script**

```bash
#!/bin/bash
# make-projects-hub-images.sh — 440/880 JPEG+AVIF card derivatives for the
# projects hub, from tools/projects-hub-manifest.tsv. Resample only (sips
# crop is broken on this machine); CSS crops in the 4/3 box. Idempotent:
# skips outputs that already exist. Never upscales: the 880 pair is only
# produced when the source frame is >=880px wide.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=assets/img/v2/proj
mkdir -p "$OUT"

emit () { # emit <src> <base> <width>  -> base-<w>.jpg + base-<w>.avif
  local src=$1 base=$2 w=$3
  [ -f "$base-$w.jpg" ]  || sips --resampleWidth "$w" -s format jpeg -s formatOptions 80 "$src" --out "$base-$w.jpg"  >/dev/null
  [ -f "$base-$w.avif" ] || sips --resampleWidth "$w" -s format avif -s formatOptions 60 "$src" --out "$base-$w.avif" >/dev/null
}

while IFS=$'\t' read -r slug status lines src; do
  f=".$src"
  sw=$(sips -g pixelWidth "$f" | awk '/pixelWidth/{print $2}')
  emit "$f" "$OUT/$slug" 440
  if [ "$sw" -ge 880 ]; then emit "$f" "$OUT/$slug" 880; fi
done < tools/projects-hub-manifest.tsv

for h in hero-projects hero-current; do
  for w in 960 1440 1920; do emit "assets/img/v2/$h.jpg" "assets/img/v2/$h" "$w"; done
done
echo "done"
```

Note: for the 6 slugs whose source already is `v2/proj/<slug>-880.jpg`, `emit` regenerating `<slug>-880.jpg` from itself is skipped by the `[ -f ]` guard (file exists) — only the missing `.avif` and `-440` pair are produced.

- [ ] **Step 2: Run it and sanity-check output**

```bash
chmod +x tools/make-projects-hub-images.sh && tools/make-projects-hub-images.sh
ls assets/img/v2/proj | grep -c '\-440\.avif'         # expect 30
ls assets/img/v2/proj | grep -c '\-880\.avif'         # expect ~24 (sources >=880 incl. the 6 curated)
du -sh assets/img/v2/proj
```
Expected: 30 `-440.avif`; `-880.avif` count equals the number of manifest sources ≥880px (record the exact number for the checker in Task 3). Spot-check quality: convert one 440 AVIF back to png with sips and view it — no visible blocking.

- [ ] **Step 3: Verify no upscaling happened**

```bash
while IFS=$'\t' read -r slug st ln src; do
  sw=$(sips -g pixelWidth ".$src" | awk '/pixelWidth/{print $2}')
  if [ "$sw" -lt 880 ] && [ -f "assets/img/v2/proj/$slug-880.jpg" ]; then echo "UPSCALED: $slug ($sw)"; fi
done < tools/projects-hub-manifest.tsv
```
Expected: no output.

- [ ] **Step 4: Commit** (script + generated assets)

```bash
git add tools/make-projects-hub-images.sh assets/img/v2/proj assets/img/v2/hero-projects-*.{jpg,avif} assets/img/v2/hero-current-*.{jpg,avif}
git commit -m "feat(projects): 440/880 AVIF+JPEG derivatives for hub cards and heroes"
```

---

### Task 3: Checker + vitest suite (written to FAIL before Task 4)

**Files:**
- Create: `tools/projects-hub-check.js`
- Create: `tests/projects-hub.test.mjs`

- [ ] **Step 1: Write the checker.** Node, zero deps, exits 1 with a failure list. Structure (this is the complete assertion inventory — implement each as a numbered check that pushes into a `failures` array):

```js
#!/usr/bin/env node
// tools/projects-hub-check.js — frozen-content + perf-contract checks for
// the redesigned projects hub. Run: node tools/projects-hub-check.js
// Reads: construction-projects-kuwait/index.html (the page under test),
//        tools/projects-hub-manifest.tsv, the 30 detail pages, and git
//        history is NOT consulted (files on disk only).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const page = read('construction-projects-kuwait/index.html');
const manifest = read('tools/projects-hub-manifest.tsv').trim().split('\n')
  .map(l => { const [slug, status, lines, src] = l.split('\t'); return { slug, status, lines: lines.split(' '), src }; });
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

// 1. Manifest shape: 30 rows, 14 current / 16 completed.
// 2. Every slug appears exactly once as a card link href on the page
//    (href="/<slug>"), and no card href points outside the 30.
// 3. Zero occurrences of "ugcc.com/project" anywhere in the page.
// 4. Frozen title per card: strip tags from the card's <h3 class="as-card__title">
//    inner HTML and assert the string is a byte-exact substring of the
//    slug's detail page (<slug>/index.html). (Entities left as-is.)
// 5. Frozen hero subtitle: assert the lede paragraph text is a byte-exact
//    substring of the pre-redesign hub — source it from
//    mockups/projects-hub-b/index.html if present, else assert non-empty
//    and equal to the known string embedded in this file as a constant.
// 6. data-status of each card matches the manifest; data-lines set equals
//    the manifest set (order-insensitive).
// 7. Counts in the stats block: "30", "14", "7" figures present.
// 8. Every <img>/<source> URL referenced by the page exists on disk;
//    every srcset candidate file exists; no srcset advertises a width
//    larger than the candidate file's real pixelWidth is allowed to be
//    checked cheaply: assert candidate descriptors are only 440w/880w for
//    cards and 960w/1440w/1920w for hero/band.
// 9. Cards: loading="lazy" + decoding="async" + numeric width/height on
//    every card img; the cover img has fetchpriority="high" and NO
//    loading="lazy"; a <link rel="preload" as="image"> with imagesrcset
//    and type="image/avif" exists for the cover.
// 10. Every card is wrapped in <picture> with an image/avif <source>.
// 11. No-JS completeness: the shipped HTML contains no `hidden` attribute
//     inside the grid <ul>, and the two "All" chips carry
//     aria-pressed="true".
// 12. Perf budget from files on disk: hero-1920.avif <= 250KB; every
//     <slug>-440.avif <= 60KB; sum of (all card 440 avifs + hero 1920 avif
//     + band 1920 avif) <= 1.5MB.
// 13. Builder chrome intact: page still contains `block-header` and the
//     footer marker `FUdf9w9dXZ`.
// 14. Head hygiene: <title> does not contain "mockup"; the stylesheet
//     chain includes about-suite.css and pages/projects.css; scripts
//     include js/projects.js.
// ... implement all checks, then:
if (failures.length) { console.error('FAIL\n' + failures.map(f => ' - ' + f).join('\n')); process.exit(1); }
console.log('OK: all projects-hub checks passed');
```

Write real implementations for every numbered check (regex/DOM-lite string parsing is fine; this repo's other checkers do the same). Constant for check 5: the hero subtitle string `Building resilient, high-quality infrastructure that strengthens connectivity and supports national development.`

- [ ] **Step 2: Write the vitest wrapper**

```js
// tests/projects-hub.test.mjs — runs the hub checker as a child process so
// `npx vitest run` gates on it (same pattern as business-line.test.mjs).
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { test, expect } from 'vitest';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');

test('projects hub passes frozen-content and perf checks', () => {
  const out = execFileSync('node', [join(repo, 'tools/projects-hub-check.js')], { encoding: 'utf8' });
  expect(out).toContain('OK');
}, 60_000);
```

First read `tests/business-line.test.mjs` and mirror its structure if it differs from the above.

- [ ] **Step 3: Run to verify it FAILS against the current (old) hub**

```bash
node tools/projects-hub-check.js; echo "exit=$?"
```
Expected: FAIL with a non-empty failure list (old page has no <picture>, mockup-free title is fine but cards/hrefs won't match), exit=1.

- [ ] **Step 4: Commit**

```bash
git add tools/projects-hub-check.js tests/projects-hub.test.mjs
git commit -m "test(projects): hub checker + vitest gate (red until page ships)"
```

---

### Task 4: Page assets — `pages/projects.css` and `js/projects.js`

**Files:**
- Create: `assets/css/pages/projects.css`
- Create: `assets/js/projects.js`

- [ ] **Step 1: Extract the mockup's inline `<style>` into the page sheet.** Programmatically copy the full `<style>` block body from `mockups/projects-hub-b/index.html` into `assets/css/pages/projects.css` unchanged (it is the approved look), topped with a comment header matching the other page sheets (`/* pages/projects.css — projects hub (unified grid). Thin add-on over about-suite.css. */`).

- [ ] **Step 2: Write the filter JS** — the mockup's inline script plus hash deep-links, as an external file:

```js
// assets/js/projects.js — hub filter chips. Progressive enhancement only:
// the no-JS page shows all 30 cards; this script just toggles [hidden].
(function () {
  'use strict';
  var grid = document.querySelector('[data-projects-grid]');
  if (!grid) return;
  var cards = [].slice.call(grid.querySelectorAll('.pjx-card'));
  var chips = [].slice.call(document.querySelectorAll('.pjx-chip'));
  var count = document.querySelector('[data-projects-count]');
  var state = { status: 'all', line: 'all' };

  function apply() {
    var shown = 0;
    cards.forEach(function (c) {
      var okS = state.status === 'all' || c.getAttribute('data-status') === state.status;
      var okL = state.line === 'all' || (' ' + c.getAttribute('data-lines') + ' ').indexOf(' ' + state.line + ' ') !== -1;
      var show = okS && okL;
      if (show) shown++;
      if (show) c.removeAttribute('hidden'); else c.setAttribute('hidden', '');
    });
    if (count) count.textContent = 'Showing ' + shown + ' of ' + cards.length + ' projects';
    chips.forEach(function (b) {
      var g = b.getAttribute('data-filter-group');
      b.setAttribute('aria-pressed', String(state[g] === b.getAttribute('data-filter-value')));
    });
  }
  chips.forEach(function (b) {
    b.addEventListener('click', function () {
      state[b.getAttribute('data-filter-group')] = b.getAttribute('data-filter-value');
      apply();
    });
  });
  // Deep links: #current/#completed preselect status; #roads #civil #building
  // #micro #water #em #oil-and-gas preselect a line.
  var h = (location.hash || '').replace('#', '');
  var lineAlias = { 'oil-and-gas': 'oil' };
  if (h === 'current' || h === 'completed') { state.status = h; apply(); }
  else if (h) { h = lineAlias[h] || h;
    if (cards.some(function (c) { return (' ' + c.getAttribute('data-lines') + ' ').indexOf(' ' + h + ' ') !== -1; })) { state.line = h; apply(); }
  }
})();
```

Adjust the selectors/attribute names to whatever the mockup actually uses (`data-filter-group`/`data-filter-value` may need to be added to the chip markup in Task 5 — keep JS and markup in sync; the mockup's own inline script is the reference for the chip DOM).

- [ ] **Step 3: Commit**

```bash
git add assets/css/pages/projects.css assets/js/projects.js
git commit -m "feat(projects): page sheet + external filter script with hash deep-links"
```

---

### Task 5: Production page — transform mockup B into `/construction-projects-kuwait`

**Files:**
- Modify: `construction-projects-kuwait/index.html` (full body replacement; old version stays in git)

Do this with a Python script (write it to the scratchpad, run once). Steps the script must perform, in order:

- [ ] **Step 1: Start from the mockup.** Read `mockups/projects-hub-b/index.html`.

- [ ] **Step 2: Restore the real head.** From the CURRENT `construction-projects-kuwait/index.html`, byte-copy the original `<title>`, `meta name="description"`, canonical link, and any JSON-LD script blocks into the new page (frozen SEO strings). Keep the mockup's stylesheet chain and append `<link rel="stylesheet" href="/assets/css/pages/projects.css?v=1">` after `about-suite.css`. Remove the inline `<style>`.

- [ ] **Step 3: Wire the external JS.** Remove the mockup's inline filter `<script>`; add `<script src="/assets/js/projects.js?v=1" defer></script>` after `about-suite.js`. Add `data-filter-group`/`data-filter-value` attributes to the chips and `data-projects-grid` / `data-projects-count` hooks to match `assets/js/projects.js` exactly.

- [ ] **Step 4: Fix the subnav.** All tab → `href="/construction-projects-kuwait"` with `class="is-active" aria-current="page"`; Current → `/all-project-current`; Completed → `/all-projects-completed`.

- [ ] **Step 5: Picture-ize the images (the perf payload).**
  - Cover: replace the single `<img class="as-cover__media">` with `<picture>`: AVIF `<source srcset="/assets/img/v2/hero-projects-960.avif 960w, …-1440.avif 1440w, …-1920.avif 1920w" sizes="100vw" type="image/avif">` + fallback img `src="/assets/img/v2/hero-projects-1440.jpg"` with the same jpg srcset, keeping `fetchpriority="high" decoding="async"`, frozen alt, numeric width/height of the 1920 frame. Add to head: `<link rel="preload" as="image" imagesrcset="…avif 960w, …avif 1440w, …avif 1920w" imagesizes="100vw" type="image/avif">`.
  - Each card img: `<picture>` with AVIF source `srcset="/assets/img/v2/proj/<slug>-440.avif 440w[, /assets/img/v2/proj/<slug>-880.avif 880w]"` and jpg fallback img (same widths in jpg), `sizes="(max-width:600px) calc(100vw - 64px), (max-width:920px) 50vw, 384px"`, `loading="lazy" decoding="async"`, `alt=""`, numeric width/height taken from the actual 880 (or 440) jpg derivative's real pixels via sips. The 880 candidates are included only for slugs where the file exists (Task 2's no-upscale rule).
  - Band figure: `<picture>` with `hero-current-{960,1440,1920}` AVIF + jpg fallback, `sizes="100vw"`, lazy.

- [ ] **Step 6: Write the file and eyeball the diff.**

```bash
git diff --stat construction-projects-kuwait/index.html
```
Expected: one file changed; the new file still contains `block-header` and `FUdf9w9dXZ` (verify with grep before proceeding).

- [ ] **Step 7: Run the checker — this is the green step**

```bash
node tools/projects-hub-check.js && npx vitest run tests/projects-hub.test.mjs
```
Expected: `OK: all projects-hub checks passed`; vitest 1 passed. If any check fails, fix the page (or a genuinely wrong check), re-run until green.

- [ ] **Step 8: Commit**

```bash
git add construction-projects-kuwait/index.html
git commit -m "feat(projects): ship variant B unified grid hub with AVIF/JPEG picture markup"
```

---

### Task 6: Netlify caching headers

**Files:**
- Modify: `netlify.toml`

- [ ] **Step 1: Append the headers blocks** (keep every existing block untouched, including the global `X-Robots-Tag`):

```toml
# Long-lived immutable caching for fingerprinted/versioned static assets.
# Image filenames are content-hashed (Hostinger export) or curated v2/ files
# that only change alongside a page edit; CSS/JS use ?v= query versioning.
[[headers]]
  for = "/assets/img/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/assets/css/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/assets/js/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

- [ ] **Step 2: Sanity-check TOML parses**

```bash
python3 -c "import tomllib; tomllib.load(open('netlify.toml','rb')); print('toml ok')"
```
Expected: `toml ok`.

- [ ] **Step 3: Commit**

```bash
git add netlify.toml
git commit -m "perf(netlify): immutable caching for hashed/versioned assets"
```

---

### Task 7: Browser verification + budget evidence

No file changes except fixes it uncovers. Uses the running preview (`ugcc-projects-redesign`, port 8749, serving the worktree).

- [ ] **Step 1: Load `http://localhost:8749/construction-projects-kuwait/` in the pane** (resize to 1440×900 first — the pane can report width 0 until an explicit resize). Assert: zero console errors; `document.documentElement.scrollWidth - clientWidth === 0`; cover height 524; 30 cards; filter round-trip Completed→16, All→30; `#current` deep-link preselects the chip (navigate with the hash).
- [ ] **Step 2: Network evidence.** With the pane's network tools, confirm the card images actually served are `.avif` (Chrome supports AVIF) and lazy ones don't load until scroll. Record first-viewport image transfer (target ≤400KB) and full-scroll total (target ≤1.5MB).
- [ ] **Step 3: Responsive check** at 375 and 920 via numeric DOM assertions (not screenshots — pane screenshots go black when scrolled).
- [ ] **Step 4: Full-page capture for the user** with headless system Chrome (measure scrollHeight in the pane first): `--headless=new --disable-gpu --hide-scrollbars --window-size=1440,<h> --virtual-time-budget=20000 --screenshot=…`.
- [ ] **Step 5: No-JS render check**: fetch the raw HTML and assert the grid ships un-hidden (also covered by checker #11) and chips are inert buttons.
- [ ] **Step 6: Commit any fixes** made during verification (`fix(projects): …`).

---

### Task 8: Cleanup + handoff

- [ ] **Step 1: Remove the mockups from the branch** (they served their purpose; the compare page and thumbs too):

```bash
git rm -r mockups && git commit -m "chore(projects): remove design mockups before merge"
```

- [ ] **Step 2: Full test run**

```bash
npx vitest run
```
Expected: all suites pass (projects-hub + the pre-existing business-line and chat suites).

- [ ] **Step 3: Report** — summarize to the user: what shipped, measured before/after weights, screenshot, and the follow-ups logged in the spec (repo-wide dedup, phase 2 listing pages, phase 3 detail pages). Merging into `V2` happens only after Danijel reviews (superpowers:finishing-a-development-branch).

---

## Parallelization map (for subagent-driven execution)

- Task 1 first (fast, everything depends on it).
- Then Tasks 2, 3, 4, 6 in PARALLEL (pipeline / checker / assets / netlify are independent; they touch disjoint files).
- Task 5 after 2+3+4 (needs derivatives, checker, css/js).
- Task 7 after 5+6. Task 8 last.

# PROJECTS block → named contract cards — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage PROJECTS block (`#zd_fdi`) — 3026px of uncaptioned
square photographs holding exactly one link — with six deep-linked contract cards
carrying name, client, contract value and status.

**Architecture:** Pure markup and CSS. The `<section>` shell and its navy
`.block-background` div are kept; the builder's 46-row grid inside is replaced by
a header and one `<ul>` of six cards. Styling lives in a new per-section
stylesheet, `assets/css/projects.css`, following the pattern the gallery rail
established (`assets/css/rail.css`) rather than growing the shared `v2.css`. No
JavaScript is added.

**Tech Stack:** Static HTML, hand-written CSS, `sips` for image derivatives
(macOS built-in, no dependencies), a dependency-free browser-console check script
following `tools/rail-check.js`.

**Spec:** `docs/superpowers/specs/2026-07-19-projects-block-design.md`

---

## Working agreements

**Two other sessions are editing `index.html` on this branch right now**, on the
blocks above this one. Three rules follow:

1. **Never use byte offsets into `index.html`.** They have already shifted once
   during planning (`#zd_fdi` moved from 56485 to 57715). Every edit in this plan
   anchors on string markers.
2. **Stage only the files this plan names.** Use `git add <explicit paths>`, never
   `git add -A` or `git add .` — the working tree contains other sessions'
   in-flight changes to `assets/js/rail.js`, `tools/rail-check.js` and files under
   `docs/superpowers/`.
3. **Do not touch** `assets/css/v2.css`, `assets/js/v2.js`, `assets/js/rail.js`,
   `assets/css/rail.css`, `README.md`, or any block other than `#zd_fdi`.

**Serving the site:** a dev server may already be running on port 8747 from
another session. Check with `curl -s -o /dev/null -w "%{http_code}"
http://localhost:8747/` first. If it answers 200, use it. If not, start one with
`python3 -m http.server 8747` from the repo root.

## File structure

| File | Responsibility |
|---|---|
| `tools/make-project-images.sh` | Create: generates the six cards' 440w/880w derivatives from existing covers. Idempotent. |
| `assets/img/v2/proj/*.jpg` | Create: 12 generated files (6 projects x 2 widths). |
| `tools/projects-check.js` | Create: the assertion harness. Written before the implementation. |
| `assets/css/projects.css` | Create: all styling for the block. Owns nothing else. |
| `index.html` | Modify: contents of `#zd_fdi`, plus one `<link>` line in `<head>`. |

---

### Task 1: Image derivatives

**Files:**
- Create: `tools/make-project-images.sh`
- Create: `assets/img/v2/proj/{kp3cns301,ra-259,pahwc1151,pai18pa,c502015,zorepc0059}-{440,880}.jpg`

Sources were verified during planning: all six are landscape and at least 1024px
wide, so both derivatives are always downscales. Two of the six carry `.png` and
`.webp` extensions, which is why `-s format jpeg` appears in the resample call.
It is belt-and-braces rather than strictly required: `sips` picks its output
format from the `.jpg` output extension regardless of the input. It is kept so
the script stays correct if a source is ever swapped for a genuine PNG or WebP.

- [ ] **Step 1: Write the script**

Create `tools/make-project-images.sh`:

```bash
#!/usr/bin/env bash
# Generates the homepage PROJECTS block's card derivatives from the project
# cover images already in assets/img/.
# Idempotent: safe to re-run. Requires macOS `sips` (no external dependencies).
#
# Output: assets/img/v2/proj/<slug>-{440,880}.jpg, centre-cropped to an exact
# 440x275 / 880x550 (16:10) so every card reserves the same layout space and
# no card shifts as its image arrives.
set -euo pipefail

cd "$(dirname "$0")/.."
OUT="assets/img/v2/proj"
mkdir -p "$OUT"

# slug|source. The slug is the derivative filename stem and matches the project
# directory, except Duqm which is shortened so the file is not named after a
# 74-character directory. Every source was verified landscape and >= 1024px wide.
ROWS=(
  "kp3cns301|assets/img/v2/card-kp3.jpg"
  "ra-259|assets/img/c253e1af-60-mnl4x5okE6sxOWwl.png"
  "pahwc1151|assets/img/37063398-cover-mxB26lNQqxfoZnna.jpg"
  "pai18pa|assets/img/d09f536f-cover-AzGMBZ95W8tqw0VQ.JPG"
  "c502015|assets/img/c98236de-c50-2015-cover-dZsizRULbSONi57t.webp"
  "zorepc0059|assets/img/2310a664-zor-epc-cover-YBgjQp23yeipGgMV.jpg"
)

make_one() {
  local src="$1" out="$2" tw="$3" th="$4" w h
  read -r w h < <(sips -g pixelWidth -g pixelHeight "$src" \
    | awk '/pixelWidth/{w=$2} /pixelHeight/{h=$2} END{print w, h}')

  # Resample along whichever axis leaves both dimensions >= the target, then
  # centre-crop. Cropping without this can letterbox instead of crop.
  # -s format jpeg: two sources carry .png/.webp extensions. sips picks the
  # output format from the .jpg extension anyway, so this is belt-and-braces
  # for the day a source is swapped for a genuine PNG or WebP.
  if [ $(( w * th )) -gt $(( h * tw )) ]; then
    sips -s format jpeg --resampleHeight "$th" "$src" --out "$out" >/dev/null
  else
    sips -s format jpeg --resampleWidth "$tw" "$src" --out "$out" >/dev/null
  fi
  sips -c "$th" "$tw" "$out" >/dev/null
}

for row in "${ROWS[@]}"; do
  slug="${row%%|*}"
  src="${row#*|}"
  [ -f "$src" ] || { echo "missing $src" >&2; exit 1; }
  make_one "$src" "$OUT/$slug-440.jpg" 440 275
  make_one "$src" "$OUT/$slug-880.jpg" 880 550
  echo "$slug done"
done

echo
echo "Total: $(du -sh "$OUT" | cut -f1) in $OUT"
```

- [ ] **Step 2: Make it executable and run it**

```bash
chmod +x tools/make-project-images.sh
./tools/make-project-images.sh
```

Expected: six `<slug> done` lines, then a `Total:` line reporting roughly
1–2 MB.

- [ ] **Step 3: Verify every derivative is exactly the target size**

```bash
for f in assets/img/v2/proj/*.jpg; do
  printf "%-28s " "$(basename "$f")"
  sips -g pixelWidth -g pixelHeight -g format "$f" \
    | awk '/pixelWidth/{w=$2}/pixelHeight/{h=$2}/format:/{fm=$2}END{printf "%sx%s %s\n",w,h,fm}'
done
```

Expected: exactly 12 lines. Every `-440.jpg` reports `440x275 jpeg` and every
`-880.jpg` reports `880x550 jpeg`. Any other dimension, or a `png`/`webp` format,
is a failure — do not proceed.

- [ ] **Step 4: Confirm re-running changes nothing (idempotence)**

```bash
md5 -q assets/img/v2/proj/*.jpg > /tmp/proj-before.txt
./tools/make-project-images.sh >/dev/null
md5 -q assets/img/v2/proj/*.jpg > /tmp/proj-after.txt
diff /tmp/proj-before.txt /tmp/proj-after.txt && echo "IDEMPOTENT"
```

Expected: prints `IDEMPOTENT` with no diff output.

- [ ] **Step 5: Commit**

```bash
git add tools/make-project-images.sh assets/img/v2/proj
git commit -m "feat(projects): card image derivatives + generation script

Six project covers cropped to an exact 16:10 at 440w and 880w so every
card reserves identical layout space. Sources are existing assets; three
are PNG/WebP, so the resample forces JPEG output unlike the rail script."
```

---

### Task 2: The check harness, written first

**Files:**
- Create: `tools/projects-check.js`

This is written and run **before** any markup changes, so it fails against the
current block. A harness first proven to fail is the only kind worth trusting.

Note the vacuous-pass guard on the per-card loop — this is the defect that was
fixed for the rail harness in commit `4498392`, and it must not be reintroduced.

- [ ] **Step 1: Write the harness**

> **The code below is the original draft and is now out of date. The committed
> `tools/projects-check.js` is the source of truth.** Code review found two real
> defects in this draft and they were fixed in `f0f2e20` and `917eccd`:
>
> 1. `no image is upscaled in its slot` passed vacuously when every image was
>    broken — the outer count guard was defeated by an unguarded early `return`
>    inside the loop, so six 404ing images produced a green line claiming "all
>    sources >= their rendered width". It now requires `measured === CARD_COUNT`.
>    Both the implementer and the reviewer demonstrated the old code passing and
>    the new code failing against six deliberately-404ing cards.
> 2. The fixed 1200ms wait after `scrollIntoView()` was a flake risk, and worse,
>    the preview pane never fires lazy-load fetches and never scrolls at all
>    (`scrollY` stays 0 after an explicit `scrollTo`). The harness now forces the
>    fetch and polls `img.complete` with a 5000ms cap.
>
> Plus eight minor fixes: a `CARD_COUNT` constant replacing the magic `6`, `GET`
> instead of `HEAD` (static servers often answer `HEAD` with 405), a terminal
> `.catch()` so one throw cannot discard all 14 results, `documentElement`
> instead of `body` for the overflow check (the old comparison had a
> scrollbar's width of built-in slack), and better failure messages.
>
> Read the draft for intent; run the committed file.

Create `tools/projects-check.js`:

```javascript
/* UGCC PROJECTS block checks. Dependency-free.
   Usage: serve the site over HTTP, open the homepage, paste into the console.
   Returns a Promise of {passed, failed, results} — the link checks are async.

   Resize to 1280x720 before running: the height and column-count checks are
   viewport-dependent. Re-run at 800 and 375 for the responsive checks.

   NOT covered (manual verification required):
     - whether each 16:10 centre crop keeps its subject legible
     - whether these are the six projects the client wants to lead with
     - whether contract values belong on the homepage at all */
(function () {
  'use strict';

  var results = [];
  function check(name, fn) {
    var ok = false, detail = '';
    try {
      var r = fn();
      if (r === true) { ok = true; }
      else if (r && typeof r === 'object') { ok = !!r.ok; detail = r.detail || ''; }
    } catch (e) { detail = 'threw: ' + e.message; }
    results.push({ name: name, ok: ok, detail: detail });
  }
  function record(name, ok, detail) {
    results.push({ name: name, ok: ok, detail: detail || '' });
  }

  var SECTION = 'zd_fdi';
  var EXPECTED_HREFS = [
    '/kp3cns301',
    '/ra-259',
    '/pahwc1151',
    '/pai18pa',
    '/c502015-infrastructure-works-for-the-commercial-berth-at-duqm-port-ip3-oman',
    '/zorepc0059'
  ];
  var ALL_HREF = '/construction-projects-kuwait';

  function block() { return document.getElementById(SECTION); }
  function cards() {
    return Array.prototype.slice.call(document.querySelectorAll('.v2-proj__item'));
  }

  check('block is under 1300px tall', function () {
    var s = block();
    if (!s) return { ok: false, detail: 'section #' + SECTION + ' missing' };
    var h = Math.round(s.getBoundingClientRect().height);
    if (h === 0) return { ok: false, detail: 'section has zero height — not rendered' };
    return { ok: h < 1300, detail: h + 'px (was 3026px) @ ' + window.innerWidth + 'px wide' };
  });

  check('builder gallery is gone', function () {
    var s = block();
    if (!s) return { ok: false, detail: 'section missing' };
    var n = s.querySelectorAll('.grid-gallery, .grid-gallery-grid, .layout-element').length;
    return { ok: n === 0, detail: n + ' legacy builder nodes remain' };
  });

  check('block holds exactly 6 cards', function () {
    var n = cards().length;
    return { ok: n === 6, detail: n + ' cards (want 6)' };
  });

  check('block holds exactly 7 links', function () {
    var s = block();
    if (!s) return { ok: false, detail: 'section missing' };
    var n = s.querySelectorAll('a[href]').length;
    return { ok: n === 7, detail: n + ' links (want 7: 6 cards + all-projects; was 1)' };
  });

  check('each card is a single anchor', function () {
    /* Guard first: without it this passes vacuously when no cards exist. */
    var list = cards();
    if (list.length !== 6) {
      return { ok: false, detail: 'expected 6 cards to inspect, found ' + list.length };
    }
    var bad = [];
    list.forEach(function (li, i) {
      var n = li.querySelectorAll('a[href]').length;
      if (n !== 1) bad.push('#' + i + ' has ' + n + ' anchors');
    });
    return { ok: bad.length === 0, detail: bad.join('; ') || '6/6 single-anchor' };
  });

  check('every card image is lazy, described and intrinsically sized', function () {
    var list = cards();
    if (list.length !== 6) {
      return { ok: false, detail: 'expected 6 cards to inspect, found ' + list.length };
    }
    var bad = [];
    list.forEach(function (li, i) {
      var img = li.querySelector('img');
      if (!img) { bad.push('#' + i + ' no img'); return; }
      if (!img.getAttribute('alt')) bad.push('#' + i + ' empty alt');
      if (!img.getAttribute('width') || !img.getAttribute('height')) bad.push('#' + i + ' no width/height');
      if (img.getAttribute('loading') !== 'lazy') bad.push('#' + i + ' not lazy');
    });
    return { ok: bad.length === 0, detail: bad.join('; ') || '6/6 ok' };
  });

  check('image frames reserve a 16:10 box', function () {
    /* This is the mechanism that keeps layout shift at zero as lazy images
       arrive. Assert the mechanism, not a timing-dependent measurement. */
    var list = document.querySelectorAll('.v2-proj__shot');
    if (list.length !== 6) {
      return { ok: false, detail: 'expected 6 frames, found ' + list.length };
    }
    var bad = [];
    Array.prototype.forEach.call(list, function (el, i) {
      var ar = getComputedStyle(el).aspectRatio.replace(/\s/g, '');
      if (ar !== '16/10') bad.push('#' + i + ' aspect-ratio=' + ar);
    });
    return { ok: bad.length === 0, detail: bad.join('; ') || '6/6 at 16/10' };
  });

  check('cards produce exactly the 6 expected hrefs', function () {
    var hrefs = cards().map(function (li) {
      var a = li.querySelector('a[href]');
      return a ? a.getAttribute('href') : null;
    });
    var missing = EXPECTED_HREFS.filter(function (h) { return hrefs.indexOf(h) === -1; });
    var extra = hrefs.filter(function (h) { return h && EXPECTED_HREFS.indexOf(h) === -1; });
    return {
      ok: missing.length === 0 && extra.length === 0,
      detail: 'missing[' + missing.join(',') + '] extra[' + extra.join(',') + ']'
    };
  });

  check('the all-projects exit is present', function () {
    var a = document.querySelector('.v2-proj__all');
    if (!a) return { ok: false, detail: '.v2-proj__all missing' };
    return {
      ok: a.getAttribute('href') === ALL_HREF,
      detail: 'href=' + a.getAttribute('href')
    };
  });

  check('column count matches the viewport', function () {
    var grid = document.querySelector('.v2-proj__grid');
    if (!grid) return { ok: false, detail: 'grid missing' };
    var cols = getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(Boolean).length;
    var w = window.innerWidth;
    var want = w > 1024 ? 3 : (w > 600 ? 2 : 1);
    return { ok: cols === want, detail: cols + ' columns at ' + w + 'px (want ' + want + ')' };
  });

  check('no horizontal page overflow', function () {
    var over = document.body.scrollWidth - window.innerWidth;
    return {
      ok: over <= 0,
      detail: 'body.scrollWidth ' + document.body.scrollWidth +
              ' vs innerWidth ' + window.innerWidth + ' @ ' + window.innerWidth + 'px'
    };
  });

  /* ---------- async section ---------- */

  var list = cards();

  return Promise.resolve()
    .then(function () {
      /* Scroll the block into view so the lazy images actually fetch, then
         give the decode a moment. */
      var s = block();
      if (s) s.scrollIntoView();
      return new Promise(function (res) { setTimeout(res, 1200); });
    })
    .then(function () {
      if (list.length !== 6) {
        record('every card image actually loaded', false,
          'expected 6 cards to inspect, found ' + list.length);
        return;
      }
      var bad = [];
      list.forEach(function (li, i) {
        var img = li.querySelector('img');
        if (!img) { bad.push('#' + i + ' no img'); return; }
        if (!img.naturalWidth) bad.push('#' + i + ' ' + img.currentSrc.split('/').pop() + ' failed to load');
      });
      record('every card image actually loaded', bad.length === 0,
        bad.join('; ') || '6/6 decoded');
    })
    .then(function () {
      if (list.length !== 6) {
        record('no image is upscaled in its slot', false,
          'expected 6 cards to inspect, found ' + list.length);
        return;
      }
      var bad = [];
      list.forEach(function (li, i) {
        var img = li.querySelector('img');
        if (!img || !img.naturalWidth) return;
        var css = Math.round(img.getBoundingClientRect().width);
        if (img.naturalWidth < css) {
          bad.push('#' + i + ' ' + img.naturalWidth + 'w source in a ' + css + 'px slot');
        }
      });
      record('no image is upscaled in its slot', bad.length === 0,
        bad.join('; ') || 'all sources >= their rendered width');
    })
    .then(function () {
      var hrefs = EXPECTED_HREFS.concat([ALL_HREF]);
      return Promise.all(hrefs.map(function (h) {
        return fetch(h, { method: 'HEAD' })
          .then(function (r) { return { h: h, s: r.status }; })
          .catch(function () { return { h: h, s: 0 }; });
      })).then(function (rs) {
        var bad = rs.filter(function (r) { return r.s !== 200; });
        record('all 7 destinations return 200',
          bad.length === 0,
          bad.map(function (r) { return r.h + ' -> ' + r.s; }).join('; ') ||
            '7/7 reachable');
      });
    })
    .then(function () {
      var passed = results.filter(function (r) { return r.ok; }).length;
      var failed = results.length - passed;
      results.forEach(function (r) {
        console.log((r.ok ? 'PASS  ' : 'FAIL  ') + r.name + (r.detail ? '  [' + r.detail + ']' : ''));
      });
      console.log('\n' + passed + ' passed, ' + failed + ' failed');
      return { passed: passed, failed: failed, results: results };
    });
})();
```

- [ ] **Step 2: Run it against the unmodified page and confirm it fails**

Serve the site (see Working agreements), open `http://localhost:8747/`, resize to
1280x720, paste the file contents into the console.

Expected: a majority of checks FAIL, specifically including:
- `block is under 1300px tall` — FAIL at 3026px
- `builder gallery is gone` — FAIL, legacy nodes remain
- `block holds exactly 6 cards` — FAIL, 0 cards
- `block holds exactly 7 links` — FAIL, 1 link
- `each card is a single anchor` — FAIL, `expected 6 cards to inspect, found 0`

That last line is the important one: the guard reports the absence rather than
passing an empty loop.

- [ ] **Step 3: Commit**

```bash
git add tools/projects-check.js
git commit -m "test(projects): assertion harness for the PROJECTS block (failing)

Fails against the current block: 3026px, 0 cards, 1 link. Per-card loops
guard on the expected count first so an empty block reports absence
rather than passing vacuously (the defect fixed for the rail in 4498392)."
```

---

### Task 3: The stylesheet

**Files:**
- Create: `assets/css/projects.css`

Written before the markup so that when the markup lands it is styled on first
paint. Metrics are taken from `assets/css/rail.css` so the two adjacent navy
blocks read as a pair: same 1224px container with 24px inner padding, same
1024px/600px breakpoints, same red-bar caption motif, same easing token.

- [ ] **Step 1: Write the stylesheet**

Create `assets/css/projects.css`:

```css
/* ==========================================================================
   UGCC — homepage PROJECTS block (#zd_fdi)
   Replaces the builder's 46-row grid and 8-image square gallery.
   Loaded by index.html only.

   Tokens (--v2-navy, --v2-red, --v2-red-text, --v2-ease-out-quart) come from
   v2.css. Container metrics and breakpoints deliberately match rail.css so the
   two adjacent navy blocks reflow at the same widths.

   No JavaScript: this block is markup and CSS only.
   ========================================================================== */

.v2-proj-block {
  padding: 48px 0 56px;
}

.v2-proj {
  max-width: 1224px;
  margin: 0 auto;
  padding: 0 24px;
}

/* ---------- head ----------
   Grid areas rather than a wrapper div, so the markup stays flat: the eyebrow
   spans both columns, the title and intro stack in column 1, and the exit link
   sits bottom-right against them. */
.v2-proj__head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    "eyebrow eyebrow"
    "title   all"
    "intro   all";
  align-items: end;
  column-gap: 32px;
  padding-bottom: 20px;
  margin-bottom: 28px;
  border-bottom: 1px solid rgba(255, 255, 255, .16);
}

.v2-proj__eyebrow {
  grid-area: eyebrow;
  margin: 0;
  font-family: var(--font-secondary, 'Open Sans', sans-serif);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: var(--v2-red-text);
}

.v2-proj__title {
  grid-area: title;
  margin: 6px 0 0;
  font-family: var(--font-primary, 'Hammersmith One', sans-serif);
  font-size: 32px;
  line-height: 1.2;
  font-weight: 400;
  color: #fff;
}

.v2-proj__intro {
  grid-area: intro;
  margin: 10px 0 0;
  max-width: 54ch;
  font-family: var(--font-secondary, 'Open Sans', sans-serif);
  font-size: 15px;
  line-height: 1.6;
  color: rgba(255, 255, 255, .68);
}

.v2-proj__all {
  grid-area: all;
  align-self: end;
  justify-self: end;
  white-space: nowrap;
  text-decoration: none;
  font-family: var(--font-secondary, 'Open Sans', sans-serif);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: #fff;
  padding-bottom: 4px;
  border-bottom: 2px solid var(--v2-red);
}

/* ---------- grid ---------- */

.v2-proj__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 28px 24px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.v2-proj__item {
  min-width: 0;
}

.v2-proj__card {
  display: block;
  text-decoration: none;
  color: #fff;
}

/* The whole card is one anchor, so the focus ring belongs on the card box —
   not on the image alone, which would leave the title and metadata visually
   outside the focused region. */
.v2-proj__card:focus-visible {
  outline: 2px solid var(--v2-red);
  outline-offset: 5px;
  border-radius: 4px;
}

/* aspect-ratio is load-bearing: it reserves the card's image box before the
   lazy image arrives, which is what keeps the block's layout shift at zero. */
.v2-proj__shot {
  position: relative;
  display: block;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border-radius: 4px;
  background: #0b2233;
}

.v2-proj__shot img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ---------- sector tag ----------
   The red 2px bar is the rail's caption motif, reused so the two blocks read
   as one family. The tag is a solid plate rather than the rail's gradient
   scrim: these images are lighter and a scrim would wash them out. */
.v2-proj__tag {
  position: absolute;
  left: 0;
  bottom: 0;
  padding: 7px 12px 6px;
  background: rgba(0, 20, 32, .92);
  font-family: var(--font-secondary, 'Open Sans', sans-serif);
  font-size: 10px;
  letter-spacing: .15em;
  text-transform: uppercase;
  color: #fff;
}

.v2-proj__tag::before {
  content: "";
  display: inline-block;
  width: 2px;
  height: 10px;
  margin-right: 8px;
  vertical-align: -1px;
  background: var(--v2-red);
}

/* ---------- card text ---------- */

.v2-proj__name {
  margin: 14px 0 0;
  font-family: var(--font-primary, 'Hammersmith One', sans-serif);
  font-size: 17px;
  line-height: 1.3;
  font-weight: 400;
  color: #fff;
}

.v2-proj__meta {
  margin: 12px 0 0;
  padding-top: 11px;
  border-top: 1px solid rgba(255, 255, 255, .14);
  display: grid;
  gap: 5px;
  font-family: var(--font-secondary, 'Open Sans', sans-serif);
  font-size: 12px;
}

.v2-proj__meta > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.v2-proj__meta dt {
  color: rgba(255, 255, 255, .5);
}

.v2-proj__meta dd {
  margin: 0;
  text-align: right;
  color: rgba(255, 255, 255, .9);
  font-variant-numeric: tabular-nums;
}

/* ---------- motion ---------- */

@media (prefers-reduced-motion: no-preference) {
  .v2-proj__shot img {
    transition: transform .5s var(--v2-ease-out-quart),
                filter .5s var(--v2-ease-out-quart);
  }

  .v2-proj__card:hover .v2-proj__shot img,
  .v2-proj__card:focus-visible .v2-proj__shot img {
    transform: scale(1.05);
    filter: brightness(1.06) saturate(1.05);
  }

  .v2-proj__all {
    transition: color .25s var(--v2-ease-out-quart);
  }
}

.v2-proj__all:hover {
  color: var(--v2-red-text);
}

/* ---------- responsive ----------
   Breakpoints match rail.css so the two blocks reflow together. */

@media (max-width: 1024px) {
  .v2-proj__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .v2-proj__title { font-size: 26px; }
}

@media (max-width: 600px) {
  .v2-proj-block { padding: 34px 0 38px; }
  .v2-proj { padding: 0 16px; }
  .v2-proj__grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
  }
  .v2-proj__title { font-size: 22px; }
  .v2-proj__head {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      "eyebrow"
      "title"
      "intro"
      "all";
    row-gap: 14px;
  }
  .v2-proj__all { justify-self: start; }
}
```

- [ ] **Step 2: Verify it parses with no stray braces**

```bash
node -e "
const css = require('fs').readFileSync('assets/css/projects.css','utf8');
const o = (css.match(/{/g)||[]).length, c = (css.match(/}/g)||[]).length;
console.log('braces', o, c, o === c ? 'BALANCED' : 'UNBALANCED');
"
```

Expected: `braces 35 35 BALANCED`. If you reformat the file the count may
differ; the two numbers matching is what matters.

- [ ] **Step 3: Commit**

```bash
git add assets/css/projects.css
git commit -m "feat(projects): stylesheet for the named-contract cards

Per-section stylesheet as rail.css established, rather than growing
v2.css — which keeps this work out of the files the other two sessions
on this branch are in. Container metrics, breakpoints and the red-bar
caption motif are taken from rail.css so the adjacent navy blocks pair."
```

---

### Task 4: Replace the block markup

**Files:**
- Modify: `index.html` — the contents of `#zd_fdi`, and one new `<link>` in `<head>`

Both edits are string-anchored. **Do not use byte offsets.**

- [ ] **Step 1: Confirm the anchors are still present and unique**

```bash
python3 - <<'EOF'
h = open('index.html', encoding='utf-8').read()
for needle in ['<section id="zd_fdi"', '<section id="zZFMdo"',
               '<link rel="stylesheet" href="/assets/css/rail.css?v=1">']:
    print(h.count(needle), needle)
EOF
```

Expected: `1` for all three. If any reports `0`, another session has changed the
anchor — stop and re-derive it rather than guessing.

- [ ] **Step 2: Replace the block**

```bash
python3 - <<'PYEOF'
import io

path = 'index.html'
h = io.open(path, encoding='utf-8').read()

start = h.index('<section id="zd_fdi"')
end = h.index('<section id="zZFMdo"')   # the block immediately after

new = '''<section id="zd_fdi" class="block v2-proj-block" data-v-3ffce944><div class="block-background block-background--fixed" data-v-3ffce944 style="--v4cfc8878:rgb(0, 42, 65);--v5abb0200:85%;--v5c6fda9f:85%;--v47c095f9:15%;--v000e51f2:center;--v79d8fbfe:calc(-20svh * 50 / 100);--v3f9ca25a:false;"></div><div class="v2-proj"><div class="v2-proj__head"><p class="v2-proj__eyebrow">Selected projects</p><h3 class="v2-proj__title">Named contracts, from the 6th Ring Road to Duqm Port</h3><p class="v2-proj__intro">Six of thirty contracts on record, spanning roads, buildings, industrial infrastructure and oil and gas.</p><a class="v2-proj__all" href="/construction-projects-kuwait">All 30 projects</a></div><ul class="v2-proj__grid">
<li class="v2-proj__item"><a class="v2-proj__card" href="/kp3cns301"><span class="v2-proj__shot"><img src="/assets/img/v2/proj/kp3cns301-440.jpg" srcset="/assets/img/v2/proj/kp3cns301-440.jpg 440w,/assets/img/v2/proj/kp3cns301-880.jpg 880w" sizes="(max-width: 599px) calc(100vw - 32px),(max-width: 1024px) calc(50vw - 36px), 376px" loading="lazy" width="440" height="275" alt="Aerial view of the new Kuwait airport terminal, its wing-shaped roof under construction"><span class="v2-proj__tag">Building Construction</span></span><h4 class="v2-proj__name">Apron and taxiways, new passenger terminal, Kuwait Airport</h4><dl class="v2-proj__meta"><div><dt>Client</dt><dd>Ministry of Public Works</dd></div><div><dt>Value</dt><dd>509.0M USD</dd></div><div><dt>Status</dt><dd>In progress</dd></div><div><dt>Contract</dt><dd>KP3-CNS-301</dd></div></dl></a></li>
<li class="v2-proj__item"><a class="v2-proj__card" href="/ra-259"><span class="v2-proj__shot"><img src="/assets/img/v2/proj/ra-259-440.jpg" srcset="/assets/img/v2/proj/ra-259-440.jpg 440w,/assets/img/v2/proj/ra-259-880.jpg 880w" sizes="(max-width: 599px) calc(100vw - 32px),(max-width: 1024px) calc(50vw - 36px), 376px" loading="lazy" width="440" height="275" alt="Stacked flyover ramps of a completed desert interchange seen from the air"><span class="v2-proj__tag">Roads &amp; Bridges</span></span><h4 class="v2-proj__name">6th Ring Road to Interchange 82, Salmi Road</h4><dl class="v2-proj__meta"><div><dt>Client</dt><dd>Ministry of Public Works</dd></div><div><dt>Value</dt><dd>487.2M USD</dd></div><div><dt>Status</dt><dd>Completed 2022</dd></div><div><dt>Contract</dt><dd>RA-259</dd></div></dl></a></li>
<li class="v2-proj__item"><a class="v2-proj__card" href="/pahwc1151"><span class="v2-proj__shot"><img src="/assets/img/v2/proj/pahwc1151-440.jpg" srcset="/assets/img/v2/proj/pahwc1151-440.jpg 440w,/assets/img/v2/proj/pahwc1151-880.jpg 880w" sizes="(max-width: 599px) calc(100vw - 32px),(max-width: 1024px) calc(50vw - 36px), 376px" loading="lazy" width="440" height="275" alt="Rows of completed low-rise villas and surfaced streets in a desert housing city"><span class="v2-proj__tag">Building Construction</span></span><h4 class="v2-proj__name">Sabah Al Ahmad Residential City</h4><dl class="v2-proj__meta"><div><dt>Client</dt><dd>Public Authority for Housing Welfare</dd></div><div><dt>Value</dt><dd>422.2M USD</dd></div><div><dt>Status</dt><dd>Completed 2014</dd></div><div><dt>Contract</dt><dd>PAHW-C-1151</dd></div></dl></a></li>
<li class="v2-proj__item"><a class="v2-proj__card" href="/pai18pa"><span class="v2-proj__shot"><img src="/assets/img/v2/proj/pai18pa-440.jpg" srcset="/assets/img/v2/proj/pai18pa-440.jpg 440w,/assets/img/v2/proj/pai18pa-880.jpg 880w" sizes="(max-width: 599px) calc(100vw - 32px),(max-width: 1024px) calc(50vw - 36px), 376px" loading="lazy" width="440" height="275" alt="Graded industrial plots and a new road grid laid out across open desert"><span class="v2-proj__tag">Civil Infrastructure</span></span><h4 class="v2-proj__name">Al Shadadiya Industrial Zone infrastructure</h4><dl class="v2-proj__meta"><div><dt>Client</dt><dd>Public Authority for Industry</dd></div><div><dt>Value</dt><dd>315.0M USD</dd></div><div><dt>Status</dt><dd>In progress</dd></div><div><dt>Contract</dt><dd>PAI-18P-A</dd></div></dl></a></li>
<li class="v2-proj__item"><a class="v2-proj__card" href="/c502015-infrastructure-works-for-the-commercial-berth-at-duqm-port-ip3-oman"><span class="v2-proj__shot"><img src="/assets/img/v2/proj/c502015-440.jpg" srcset="/assets/img/v2/proj/c502015-440.jpg 440w,/assets/img/v2/proj/c502015-880.jpg 880w" sizes="(max-width: 599px) calc(100vw - 32px),(max-width: 1024px) calc(50vw - 36px), 376px" loading="lazy" width="440" height="275" alt="Port gate canopy and marked vehicle lanes at a newly built commercial berth"><span class="v2-proj__tag">Civil Infrastructure</span></span><h4 class="v2-proj__name">Commercial berth infrastructure, Duqm Port</h4><dl class="v2-proj__meta"><div><dt>Client</dt><dd>SEZAD, Oman</dd></div><div><dt>Value</dt><dd>200.6M USD</dd></div><div><dt>Status</dt><dd>Completed 2020</dd></div><div><dt>Contract</dt><dd>C50-2015</dd></div></dl></a></li>
<li class="v2-proj__item"><a class="v2-proj__card" href="/zorepc0059"><span class="v2-proj__shot"><img src="/assets/img/v2/proj/zorepc0059-440.jpg" srcset="/assets/img/v2/proj/zorepc0059-440.jpg 440w,/assets/img/v2/proj/zorepc0059-880.jpg 880w" sizes="(max-width: 599px) calc(100vw - 32px),(max-width: 1024px) calc(50vw - 36px), 376px" loading="lazy" width="440" height="275" alt="Refinery pipe racks and a blue-clad process building at ground level"><span class="v2-proj__tag">Oil &amp; Gas</span></span><h4 class="v2-proj__name">Civil and tankage works, Al-Zour Refinery</h4><dl class="v2-proj__meta"><div><dt>Client</dt><dd>KNPC / KIPIC</dd></div><div><dt>Value</dt><dd>114.2M USD</dd></div><div><dt>Status</dt><dd>Completed</dd></div><div><dt>Contract</dt><dd>ZOR-EPC-0059</dd></div></dl></a></li>
</ul></div></section>'''

h = h[:start] + new + h[end:]

link_anchor = '<link rel="stylesheet" href="/assets/css/rail.css?v=1">'
h = h.replace(link_anchor,
              link_anchor + '<link rel="stylesheet" href="/assets/css/projects.css?v=1">', 1)

io.open(path, 'w', encoding='utf-8').write(h)
print('block replaced and stylesheet linked')
PYEOF
```

- [ ] **Step 3: Verify the edit structurally**

```bash
python3 - <<'EOF'
import re
h = open('index.html', encoding='utf-8').read()
print('sections:', len(re.findall(r'<section ', h)), '(want 9)')
print('projects.css linked:', h.count('projects.css'), '(want 1)')
print('cards:', h.count('v2-proj__item'), '(want 6)')
print('grid-gallery left:', h.count('grid-gallery'), '(want 0)')
print('section order:', re.findall(r'<section id="([^"]+)"', h))
EOF
```

Expected: 9 sections, 1 stylesheet link, 6 cards, 0 `grid-gallery`, and the
section order still ending
`... zOl98u, zd_fdi, zZFMdo, zrby1M, Jways5TtQ, FUdf9w9dXZ`.

- [ ] **Step 4: Run the harness and confirm everything passes**

Reload `http://localhost:8747/` at 1280x720 and paste `tools/projects-check.js`
into the console.

Expected: `14 passed, 0 failed`. In particular `block is under 1300px tall`
should report roughly 1000–1200px, down from 3026px.

If `all 7 destinations return 200` fails on `/c502015-...-oman`, check the slug
against the directory name on disk — it is the one long enough to typo.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(projects): six named contract cards in place of the gallery

3026px of uncaptioned square photographs holding one link becomes six
deep-linked cards carrying name, client, contract value and status.
Retires the broken 172w/344w srcset and stops loading eight images
eagerly four screens down. Section shell and navy background kept, so
block order and colour are untouched."
```

---

### Task 5: Responsive and visual verification

**Files:** none modified unless a defect is found.

- [ ] **Step 1: Check the two-column and one-column reflows**

Re-run `tools/projects-check.js` at each width, reloading between runs:

| Viewport | `column count matches the viewport` expects | `no horizontal page overflow` |
|---|---|---|
| 1280x720 | 3 columns | pass |
| 800x900 | 2 columns | pass |
| 375x812 | 1 column | pass |

Expected: `0 failed` at all three widths.

- [ ] **Step 2: Confirm the block did not simply move its bulk elsewhere**

```javascript
JSON.stringify([...document.querySelectorAll('section.block')]
  .map(s => ({ id: s.id, h: Math.round(s.getBoundingClientRect().height) })))
```

Expected at 1280x720: `zd_fdi` around 1000–1200px (was 3026), and every other
section within a few pixels of its previous height — `zOl98u` ~419, `zZFMdo`
~1779, `zrby1M` ~624. If a neighbouring block changed materially, the replacement
leaked outside `#zd_fdi`.

- [ ] **Step 3: Look at all six crops**

Screenshot the block at 1280 wide and check each photograph individually. The
harness cannot judge this. A centre crop is right for an interchange and can
decapitate a water tower.

If a crop fails, the fix is a per-slug crop offset in
`tools/make-project-images.sh` — not a CSS `object-position` override, which
would leave the derivative wrong for every other consumer.

- [ ] **Step 4: Check the keyboard path**

Tab through the block. Expected: exactly seven stops (six cards, then
`All 30 projects`), each showing the red focus ring around the **whole card**,
not just its image.

- [ ] **Step 5: Check reduced motion**

In the browser's rendering settings, emulate `prefers-reduced-motion: reduce`,
reload, and hover a card. Expected: no image zoom, no transition — the card is
still fully clickable.

- [ ] **Step 6: Commit any fixes**

Only if Steps 3–5 required changes:

```bash
git add <the specific files you changed>
git commit -m "fix(projects): <what the visual check caught>"
```

---

## Definition of done

- [ ] `tools/projects-check.js` reports `0 failed` at 1280, 800 and 375.
- [ ] `#zd_fdi` is under 1300px, down from 3026px.
- [ ] Seven links where there was one; all seven return 200.
- [ ] Six lazy images, each with alt text and intrinsic dimensions.
- [ ] No neighbouring block's height changed.
- [ ] `git diff --stat master` touches only: `index.html`,
      `assets/css/projects.css`, `tools/make-project-images.sh`,
      `tools/projects-check.js`, `assets/img/v2/proj/*`, and this plan and its
      spec. Anything else means another session's work was staged by mistake.

## Deliberately not in this plan

- **`README.md`.** Its V2 section does not yet mention `hero.css`,
  `sections.css` or `rail.css` either. It should be updated once, covering all
  four blocks, after the three concurrent sessions land — not three times in
  parallel by three sessions editing the same paragraph.
- **The duplicate `<title>` across the 30 project pages.** Being handled in a
  separate session; see the spec's Deferred section.
- **Direction C, the sector switch.** Mocked up and deferred, not rejected.

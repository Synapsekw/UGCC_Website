# Offices Block (`#zrby1M`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the builder-exported absolute grid in the homepage offices block with a two-tier office register beside a real vector map, and make the block visible on mobile for the first time.

**Architecture:** Keep the builder's `<section id="zrby1M">` wrapper, strip its inline style variables and `data-v-3ffce944` attribute (following the rail block at `#zOl98u`), and replace the 23 `.layout-element` children with semantic markup styled from a new `assets/css/offices.css`. The map is inline SVG generated at build time by a checked-in Python script from public-domain Natural Earth data. No runtime JavaScript.

**Tech Stack:** Static HTML/CSS. Python 3 (stdlib only) for the build-time map generator. A dependency-free browser-console IIFE for verification, matching `tools/rail-check.js` and `tools/credentials-check.js`.

**Spec:** `docs/superpowers/specs/2026-07-20-offices-recompose-design.md`

---

## Orientation: what you need to know before starting

This repo is a **buildless static site**. There is no bundler, no npm install, no test runner. "Tests" are browser-console scripts in `tools/` that you paste into DevTools with the site served locally. Read `tools/rail-check.js` before Task 1 to see the house style.

**Serving the site locally.** A launch config already exists at `.claude/launch.json` (`python3 -m http.server 8747`). If a server is already running on 8747, reuse it. The homepage is `http://localhost:8747/index.html`.

**`index.html` is a 117 KB single-line-ish export.** Line numbers shift whenever any session edits it — as of this writing the offices section opens on line 3, but it was line 14 two days ago. **Always locate by string match, never by line number.** Use Python to do the surgery rather than an editor, as shown in Task 4.

**Branch:** `hero-recompose`. Other sessions are working on the same branch and the same file. Before each commit, `git diff --stat` to confirm you have only touched what you meant to.

**Conventions this plan follows** (established by the hero, rail, and credentials blocks):
- Section-specific CSS lives in its own file in `assets/css/`, linked in `<head>` after the others, with a `?v=1` cache-buster.
- Every CSS file opens with a block comment naming the section id, what it replaced, and its JS dependency (or explicit lack of one).
- Never redefine `.v2-btn` or the `:root` tokens from `v2.css` — consume them.
- Design tokens: `--v2-navy: rgb(0, 42, 65)`, `--v2-red: #d41c22`, `--v2-red-text: #e8635e`, `--v2-ease-out-quart`.
- Fonts: `var(--font-primary, 'Hammersmith One', sans-serif)` for headings, `var(--font-secondary, 'Open Sans', sans-serif)` for body. **Headings outside `.text-box` must declare `font-family` explicitly at weight 400** — `sections.css` has a comment about this. If you skip it, headings silently fall back to Open Sans Bold.
- Never use the builder's `.transition` / `.transition--slide` classes. They start at `opacity: 0` and are cleared by an IntersectionObserver in `assets/js/main.js`. A script failure would render the block blank — the exact defect this change removes.

---

## File Structure

| File | Status | Responsibility |
| --- | --- | --- |
| `tools/offices-check.js` | Create | Console assertion harness for the block. Written first, fails first. |
| `tools/make-office-map.py` | Create | Build-time generator: Natural Earth GeoJSON → inline SVG. Run by hand, never at page load. |
| `tools/generated/office-map.svg` | Create (generated) | The generator's output. Pasted into `index.html` by Task 4. Checked in so the map is diffable. |
| `assets/css/offices.css` | Create | All styling for `#zrby1M`. |
| `index.html` | Modify | Swap the section's contents; add the stylesheet link. |
| `docs/superpowers/specs/2026-07-20-offices-recompose-design.md` | Read only | The spec. Consult when a decision looks arbitrary — most are explained there. |

Task order is deliberately **test → generator → styles → markup → verify**, mirroring commit `4ba5dc5` ("test(projects): assertion harness for the PROJECTS block (failing)"). The harness is committed red and goes green in Task 5.

---

### Task 1: The failing harness

**Files:**
- Create: `tools/offices-check.js`

- [ ] **Step 1: Read the house style first**

Run: `head -40 tools/rail-check.js`

Note the shape you are copying: a top block comment stating usage and what is *not* covered, an IIFE, a `check(name, fn)` helper collecting `{name, ok, detail}`, a `PASS`/`FAIL` console dump, and a returned `{passed, failed, results}`.

- [ ] **Step 2: Write the complete harness**

> **Superseded — read before using the source below.** The harness as first
> written here had 11 checks and was landed as commit `c2c1cf8`. A code quality
> review found it too weak to gate Tasks 2–4: contact details were asserted as a
> flat set (so Kuwait's card could carry Oman's number and still pass — the same
> defect commit `b3de78b` fixed for the credentials ledger), the map's
> `role="img"` / `aria-labelledby` wiring was unasserted, and there was no check
> for the presence list, the legend, or leftover builder nodes. Commit `e951bb8`
> revised it to **15 checks** (1, 2, 3, 4, 5, 6, 7, 7b, 8, 9, 9b, 10, 11, 12, 13).
> **The committed file is authoritative; the block below is the superseded first
> draft, kept for the record.** Green is now `15 passed, 0 failed`.

Create `tools/offices-check.js` with exactly this content:

```javascript
/* UGCC offices block checks (#zrby1M). Dependency-free.
   Usage: serve the site over HTTP, open the homepage, paste into the console.
   Returns {passed, failed, results} synchronously.

   VIEWPORT MATTERS. Checks 1 and 9 are width-dependent. Run the whole file
   three times — at 375, 920 and 1280 CSS pixels wide — and confirm all three
   runs are green. The harness prints the width it observed so a run at the
   wrong size is obvious rather than silently passing.

   Check 1 exists because this block shipped with `block--mobile-hidden`,
   which main.css resolves to display:none at width<=920px. Every phone
   visitor saw nothing here. That must never come back.

   NOT covered (manual verification required):
     - whether the map composition reads well against the blocks above/below
     - whether the red/blue/plate tiers survive a low-quality external monitor
     - focus ring visibility on the navy ground on a real device */
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

  function section() { return document.getElementById('zrby1M'); }
  function vw() { return document.documentElement.clientWidth; }

  var EXPECTED_TEL = ['tel:+96522054250', 'tel:+966112611688', 'tel:+96824548660'];
  var EXPECTED_MAIL = 'mailto:ugcc@ugcc.com';
  var SIX = ['Kuwait', 'Saudi Arabia', 'Oman', 'Iraq', 'India', 'Malawi'];

  check('1. section renders (non-zero height, not display:none)', function () {
    var s = section();
    if (!s) return { ok: false, detail: 'section #zrby1M missing' };
    var h = Math.round(s.getBoundingClientRect().height);
    var d = getComputedStyle(s).display;
    return { ok: h > 0 && d !== 'none', detail: 'viewport ' + vw() + 'px, height ' + h + 'px, display ' + d };
  });

  check('2. block--mobile-hidden is gone', function () {
    var s = section();
    var has = s.classList.contains('block--mobile-hidden');
    return { ok: !has, detail: 'class="' + s.className + '"' };
  });

  check('3. three tel: links, correct numbers', function () {
    var got = [].map.call(section().querySelectorAll('a[href^="tel:"]'), function (a) {
      return a.getAttribute('href');
    });
    var ok = got.length === 3 && EXPECTED_TEL.every(function (t) { return got.indexOf(t) !== -1; });
    return { ok: ok, detail: got.join(' ') || 'none found' };
  });

  check('4. one mailto: link, correct address', function () {
    var got = [].map.call(section().querySelectorAll('a[href^="mailto:"]'), function (a) {
      return a.getAttribute('href');
    });
    return { ok: got.length === 1 && got[0] === EXPECTED_MAIL, detail: got.join(' ') || 'none found' };
  });

  check('5. three offices, each with a non-empty <address>', function () {
    var offices = section().querySelectorAll('.off__office');
    if (offices.length !== 3) return { ok: false, detail: offices.length + ' .off__office nodes' };
    var empty = [].filter.call(offices, function (o) {
      var a = o.querySelector('address');
      return !a || a.textContent.trim().length < 10;
    }).length;
    return { ok: empty === 0, detail: empty + ' offices with a missing or stub address' };
  });

  check('6. heading is live text and no <img> remains', function () {
    var s = section();
    var h = s.querySelector('.off__title');
    var imgs = s.querySelectorAll('img').length;
    var text = h ? h.textContent.trim() : '';
    return {
      ok: !!h && /offices/i.test(text) && imgs === 0,
      detail: 'title "' + text + '", ' + imgs + ' img elements'
    };
  });

  check('7. map has 3 office paths, 3 operations paths, 3 pins, 3 labels', function () {
    var s = section();
    var svg = s.querySelector('svg.off__map');
    if (!svg) return { ok: false, detail: 'no svg.off__map' };
    /* One <path> per country. A country's islands and exclaves are extra
       M...Z subpaths inside that one `d`, not extra elements — so India's
       Andaman and Nicobar groups must not inflate this count. */
    var hq = svg.querySelectorAll('.off__map-hq path').length;
    var op = svg.querySelectorAll('.off__map-op path').length;
    var pins = svg.querySelectorAll('.off__pin').length;
    var labels = svg.querySelectorAll('.off__map-label').length;
    var ctx = svg.querySelectorAll('.off__map-ctx path').length;
    return {
      ok: hq === 3 && op === 3 && pins === 3 && labels === 3 && ctx > 20,
      detail: hq + ' office, ' + op + ' operations, ' + ctx + ' context, ' + pins + ' pins, ' + labels + ' labels'
    };
  });

  check('7b. map <title> names all six countries', function () {
    var t = section().querySelector('svg.off__map title');
    if (!t) return { ok: false, detail: 'no <title> in the svg' };
    var txt = t.textContent;
    var missing = SIX.filter(function (c) { return txt.indexOf(c) === -1; });
    return { ok: missing.length === 0, detail: missing.length ? 'missing: ' + missing.join(', ') : txt.length + ' chars' };
  });

  check('8. nothing in the block depends on a JS reveal', function () {
    /* The block must not opt into .transition — those start at opacity 0 and
       depend on assets/js/main.js. closest() as well as querySelectorAll():
       the former excludes the section itself and every ancestor, so a
       .transition landing on #zrby1M would hide the whole block while this
       check stayed green. */
    var s = section();
    var hidden = s.querySelectorAll('.transition').length + (s.closest('.transition') ? 1 : 0);
    var title = s.querySelector('.off__title');
    if (!title) return { ok: false, detail: 'no .off__title to measure' };
    var faded = '';
    for (var el = title; el && el !== document.body; el = el.parentElement) {
      if (parseFloat(getComputedStyle(el).opacity) < 1) {
        faded = el.id || el.className || el.tagName;
        break;
      }
    }
    return {
      ok: hidden === 0 && faded === '',
      detail: hidden + ' .transition nodes; ' + (faded ? 'faded ancestor: ' + faded : 'nothing faded')
    };
  });

  check('9. no descendant overflows the viewport', function () {
    var limit = vw();
    var over = [].filter.call(section().querySelectorAll('*'), function (e) {
      var r = e.getBoundingClientRect();
      return r.width > 0 && (r.right > limit + 1 || r.left < -1);
    });
    var names = over.slice(0, 3).map(function (e) {
      return (typeof e.className === 'string' && e.className) || e.tagName;
    });
    return { ok: over.length === 0, detail: 'viewport ' + limit + 'px, ' + over.length + ' overflowing' + (names.length ? ': ' + names.join(', ') : '') };
  });

  check('10. the ADRESS typo is gone', function () {
    var txt = section().textContent;
    return { ok: txt.indexOf('ADRESS') === -1, detail: txt.indexOf('ADRESS') === -1 ? 'clean' : 'still present' };
  });

  var passed = results.filter(function (r) { return r.ok; }).length;
  var failed = results.length - passed;
  results.forEach(function (r) {
    console.log((r.ok ? 'PASS  ' : 'FAIL  ') + r.name + (r.detail ? '  [' + r.detail + ']' : ''));
  });
  console.log('\n' + passed + ' passed, ' + failed + ' failed  (viewport ' + vw() + 'px)');
  return { passed: passed, failed: failed, results: results };
})();
```

- [ ] **Step 3: Run it and confirm it fails**

Serve the site, open `http://localhost:8747/index.html` at 1280px wide, paste the file contents into the DevTools console.

Expected: **most checks FAIL.** Specifically checks 2, 3, 4, 5, 6, 7, 7b, 8, 10 fail against the current builder markup. Check 1 passes at 1280px (the block is visible on desktop) and check 9 probably passes.

If every check passes, you are looking at an already-migrated page — stop and re-read `git log`.

- [ ] **Step 4: Confirm check 1 fails at mobile width**

Resize the viewport to 375px wide and re-run.

Expected: **check 1 FAILS** with `height 0px, display none`. This is the headline defect. If it passes, `block--mobile-hidden` has already been removed by someone else — stop and reconcile.

- [ ] **Step 5: Commit the red harness**

```bash
git add tools/offices-check.js
git commit -m "test(offices): assertion harness for the OFFICES block (failing)"
```

---

### Task 2: The map generator

**Files:**
- Create: `tools/make-office-map.py`
- Create: `tools/generated/office-map.svg` (script output)

- [ ] **Step 1: Write the generator**

Create `tools/make-office-map.py` with exactly this content:

```python
#!/usr/bin/env python3
"""Generate the inline SVG map for the homepage offices block (#zrby1M).

BUILD TIME ONLY. Nothing here runs in a browser. Re-run this by hand when the
office list, the window, or the styling tiers change, then paste the contents
of tools/generated/office-map.svg into index.html (see the offices plan,
Task 4). The site itself stays buildless.

    python3 tools/make-office-map.py

Data: Natural Earth, public domain. From its LICENSE.md: "All versions of
Natural Earth raster + vector map data found on this website are in the public
domain... renounce all financial claim to the maps and invites you to use them
for personal, educational, and commercial purposes." No attribution required.

Resolution is mixed on purpose. The six UGCC countries come from 1:50m; every
other country from 1:110m. At 110m Kuwait simplifies to a 9-point smudge, which
is unacceptable for the head office; at 50m it is 67 points and correctly
shaped. Bytes are spent only where the eye goes.

Output is deterministic: same inputs produce a byte-identical SVG, so a diff on
tools/generated/office-map.svg is meaningful.
"""

import json
import math
import os
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, '.ne-cache')
OUT = os.path.join(HERE, 'generated', 'office-map.svg')

SOURCES = {
    '50m': 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson',
    '110m': 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson',
}

# Equirectangular window. Chosen to hold all six countries: Malawi at -13.9
# sets the southern bound, India's east coast the eastern one.
WIN = dict(lon0=26.0, lon1=95.0, lat0=41.0, lat1=-19.0)
W = 100.0
H = round(W * (WIN['lat0'] - WIN['lat1']) / (WIN['lon1'] - WIN['lon0']), 1)

OFFICES = ['Kuwait', 'Saudi Arabia', 'Oman']
OPERATIONS = ['Iraq', 'India', 'Malawi']
HIGHLIGHT = OFFICES + OPERATIONS

# (label, longitude, latitude, label dx, label dy) for the three office cities.
PINS = [
    ('Kuwait City', 47.98, 29.37, 3.2, -1.4),
    ('Riyadh', 46.72, 24.69, 3.2, 1.0),
    ('Muscat', 58.41, 23.59, 3.2, 1.0),
]


def fetch(key):
    """Download a Natural Earth file once and cache it next to this script."""
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, 'ne_%s.geojson' % key)
    if not os.path.exists(path):
        print('downloading %s ...' % key)
        with urllib.request.urlopen(SOURCES[key], timeout=180) as r:
            data = r.read()
        with open(path, 'wb') as f:
            f.write(data)
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def proj(lon, lat):
    return ((lon - WIN['lon0']) / (WIN['lon1'] - WIN['lon0']) * W,
            (WIN['lat0'] - lat) / (WIN['lat0'] - WIN['lat1']) * H)


def clip(poly, xmin, ymin, xmax, ymax):
    """Sutherland-Hodgman clip to the frame.

    Without this, China and Russia carry their full outlines into the file for
    the sake of a sliver in frame. Clipping cut the context tier by roughly 60%.
    """
    def half(pts, inside, inter):
        if not pts:
            return []
        out, prev = [], pts[-1]
        for cur in pts:
            ci, pi = inside(cur), inside(prev)
            if ci:
                if not pi:
                    out.append(inter(prev, cur))
                out.append(cur)
            elif pi:
                out.append(inter(prev, cur))
            prev = cur
        return out

    def ix(p, q, x):
        return (x, p[1] + (x - p[0]) / (q[0] - p[0]) * (q[1] - p[1]))

    def iy(p, q, y):
        return (p[0] + (y - p[1]) / (q[1] - p[1]) * (q[0] - p[0]), y)

    poly = half(poly, lambda p: p[0] >= xmin, lambda p, q: ix(p, q, xmin))
    poly = half(poly, lambda p: p[0] <= xmax, lambda p, q: ix(p, q, xmax))
    poly = half(poly, lambda p: p[1] >= ymin, lambda p, q: iy(p, q, ymin))
    poly = half(poly, lambda p: p[1] <= ymax, lambda p, q: iy(p, q, ymax))
    return poly


def rdp(pts, eps):
    """Douglas-Peucker. Iterative stack, not recursion: some rings are long
    enough to blow the default recursion limit."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        lo, hi = stack.pop()
        if hi <= lo + 1:
            continue
        ax, ay = pts[lo]
        bx, by = pts[hi]
        dx, dy = bx - ax, by - ay
        den = math.hypot(dx, dy)
        dmax, idx = 0.0, lo
        for i in range(lo + 1, hi):
            px, py = pts[i]
            d = (abs(dy * px - dx * py + bx * ay - by * ax) / den) if den else math.hypot(px - ax, py - ay)
            if d > dmax:
                dmax, idx = d, i
        if dmax > eps:
            keep[idx] = True
            stack.append((lo, idx))
            stack.append((idx, hi))
    return [p for p, k in zip(pts, keep) if k]


def rings(geom):
    t, c = geom['type'], geom['coordinates']
    if t == 'Polygon':
        return c
    if t == 'MultiPolygon':
        return [r for poly in c for r in poly]
    return []


def area(pts):
    return abs(sum(pts[i][0] * pts[i - 1][1] - pts[i - 1][0] * pts[i][1]
                   for i in range(len(pts)))) / 2


def build_path(feature, eps, min_area, precision):
    """All of one country's rings concatenated into a single `d` string.

    One <path> per country is a contract the harness checks: islands and
    exclaves are extra M...Z subpaths inside this string, never extra elements.
    """
    parts = []
    for ring in rings(feature['geometry']):
        pts = clip([proj(x, y) for x, y in ring], -0.4, -0.4, W + 0.4, H + 0.4)
        if len(pts) < 3:
            continue
        pts = rdp(pts, eps)
        if len(pts) < 4 or area(pts) < min_area:
            continue
        fmt = '%%.%df,%%.%df' % (precision, precision)
        parts.append('M' + ' '.join(fmt % (x, y) for x, y in pts) + 'Z')
    return ''.join(parts)


def esc(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def main():
    fine = {f['properties']['NAME']: f for f in fetch('50m')['features']}
    coarse = fetch('110m')['features']

    missing = [n for n in HIGHLIGHT if n not in fine]
    if missing:
        raise SystemExit('Natural Earth 50m is missing: %s' % ', '.join(missing))

    office_paths = [build_path(fine[n], 0.035, 0.01, 2) for n in OFFICES]
    op_paths = [build_path(fine[n], 0.035, 0.01, 2) for n in OPERATIONS]

    context = []
    for f in coarse:
        if f['properties']['NAME'] in HIGHLIGHT:
            continue
        d = build_path(f, 0.22, 0.45, 1)
        if d:
            context.append(d)

    for name, paths in (('office', office_paths), ('operations', op_paths)):
        empty = [i for i, p in enumerate(paths) if not p]
        if empty:
            raise SystemExit('%s tier produced an empty path at index %s' % (name, empty))

    title = (
        'Map of the Middle East, Africa and South Asia. UGCC offices in '
        + ', '.join(OFFICES)
        + '; project operations in '
        + ', '.join(OPERATIONS)
        + '.'
    )

    out = []
    out.append('<svg class="off__map" viewBox="0 0 %d %s" role="img" aria-labelledby="off-map-title">' % (W, H))
    out.append('<title id="off-map-title">%s</title>' % esc(title))
    out.append('<g class="off__map-ctx">' + ''.join('<path d="%s"/>' % d for d in context) + '</g>')
    out.append('<g class="off__map-op">' + ''.join('<path d="%s"/>' % d for d in op_paths) + '</g>')
    out.append('<g class="off__map-hq">' + ''.join('<path d="%s"/>' % d for d in office_paths) + '</g>')

    pins = []
    for label, lon, lat, dx, dy in PINS:
        x, y = proj(lon, lat)
        pins.append('<circle class="off__halo" cx="%.1f" cy="%.1f" r="2.6"/>' % (x, y))
        pins.append('<circle class="off__pin" cx="%.1f" cy="%.1f" r="0.9"/>' % (x, y))
        pins.append('<text class="off__map-label" x="%.1f" y="%.1f">%s</text>' % (x + dx, y + dy, esc(label)))
    out.append('<g class="off__map-pins">' + ''.join(pins) + '</g>')
    out.append('</svg>')

    svg = ''.join(out)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(svg + '\n')

    print('wrote %s' % OUT)
    print('  viewBox 0 0 %d %s' % (W, H))
    print('  %d office paths, %d operations paths, %d context paths, %d pins'
          % (len(office_paths), len(op_paths), len(context), len(PINS)))
    print('  %d bytes (%.1f KB)' % (len(svg), len(svg) / 1024))


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Ignore the download cache**

The cache holds 3.7 MB of GeoJSON that must not enter the repo. Append to `.gitignore`:

```
# Natural Earth download cache for tools/make-office-map.py
tools/.ne-cache/
```

- [ ] **Step 3: Run the generator**

Run: `python3 tools/make-office-map.py`

Expected output (the first run also prints two `downloading ...` lines):

```
wrote /Users/.../tools/generated/office-map.svg
  viewBox 0 0 100 87.0
  3 office paths, 3 operations paths, 48 context paths, 3 pins
  25XXX bytes (2X.X KB)
```

The exact byte count will land near 24–26 KB. **If any tier count is not 3, or context is under 20, stop** — the harness's check 7 asserts exactly these numbers and will fail in Task 5.

- [ ] **Step 4: Verify determinism**

Run: `python3 tools/make-office-map.py && md5 tools/generated/office-map.svg && python3 tools/make-office-map.py && md5 tools/generated/office-map.svg`

Expected: the two hashes are identical. If they differ, the script has non-determinism (dict ordering, float formatting) and Task 4's paste step becomes unrepeatable — fix before continuing.

- [ ] **Step 5: Sanity-check the geometry**

Run: `python3 -c "
import re
s = open('tools/generated/office-map.svg', encoding='utf-8').read()
print('office paths:', s.split('off__map-hq')[1].count('<path'))
print('operations paths:', s.split('off__map-op')[1].split('off__map-hq')[0].count('<path'))
print('pins:', s.count('off__pin'))
print('labels:', s.count('off__map-label'))
for c in ['Kuwait','Saudi Arabia','Oman','Iraq','India','Malawi']:
    print(' title names', c + ':', c in s)
"`

Expected: 3, 3, 3, 3, and six `True` lines.

- [ ] **Step 6: Commit**

```bash
git add tools/make-office-map.py tools/generated/office-map.svg .gitignore
git commit -m "build(offices): Natural Earth map generator for the offices block

Public-domain source data, mixed resolution: 1:50m for the six UGCC
countries, 1:110m for context. At 110m Kuwait is a 9-point smudge.

Build-time only -- the site stays buildless. Output is checked in so the
map is diffable and the SVG can be pasted into index.html."
```

---

### Task 3: The stylesheet

**Files:**
- Create: `assets/css/offices.css`

- [ ] **Step 1: Write the stylesheet**

Create `assets/css/offices.css` with exactly this content:

```css
/* ==========================================================================
   UGCC homepage — the offices block (#zrby1M), "Our offices and Branches".
   Loaded only by index.html, after credentials.css.

   Replaces a builder-exported absolute grid: 23 .layout-element divs on a
   22-column / 32-row track list, over a map screenshot that had the section
   heading baked into its pixels and omitted Malawi. See
   docs/superpowers/specs/2026-07-20-offices-recompose-design.md.

   No JavaScript, and deliberately none of the builder's .transition reveal
   classes: those start at opacity 0 and depend on assets/js/main.js, so a
   script failure would render this block blank.

   The section previously carried block--mobile-hidden (display:none at
   width<=920px). It is gone. Nothing in this file may reintroduce a rule
   that hides the block at any width.
   ========================================================================== */

#zrby1M {
  background: var(--v2-navy, rgb(0, 42, 65));
  color: #fff;
  /* Task 4 strips the section's inline --block-padding variables. main.css
     still declares padding: var(--block-padding) on .block, which becomes an
     invalid declaration once the variable is gone — the result is
     browser-dependent rather than simply zero. Set it explicitly; .off owns
     the block's spacing. */
  padding: 0;
  /* Local tokens. The hairline is reused by every divider in the block, so
     changing the block's contrast is a one-line edit. */
  --off-hair: rgba(255, 255, 255, .16);
  --off-dim: rgba(255, 255, 255, .45);
  --off-body: rgba(255, 255, 255, .82);
}

/* width: min(), not max-width + vw padding. box-sizing is border-box from
   main.css's * reset, so viewport-proportional padding on a capped-width box
   eats the cap. Matches #zZFMdo and #u7vIc0iRh. */
.off {
  width: min(1224px, 100% - 64px);
  margin-inline: auto;
  padding-block: 88px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
  gap: 56px;
  align-items: start;
  font-family: var(--font-secondary, 'Open Sans', sans-serif);
}

/* ---------- heading ---------- */

.off__eyebrow {
  margin: 0 0 12px;
  font-size: 11px;
  letter-spacing: .2em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--v2-red-text, #e8635e);
}

/* font-family and weight are explicit: this heading lives outside .text-box,
   so the builder's h2 custom properties do not reach it and it would
   otherwise fall back to Open Sans Bold. See the note in sections.css. */
.off__title {
  margin: 0;
  font-family: var(--font-primary, 'Hammersmith One', sans-serif);
  font-weight: 400;
  font-size: clamp(28px, 3.4vw, 40px);
  line-height: 1.15;
  letter-spacing: -.005em;
  color: #fff;
  text-wrap: balance;
}

.off__lede {
  margin: 12px 0 0;
  max-width: 46ch;
  font-size: 15px;
  line-height: 1.6;
  color: rgba(255, 255, 255, .66);
}

/* ---------- office register ---------- */

.off__list {
  list-style: none;
  margin: 34px 0 0;
  padding: 0;
}

.off__office {
  padding: 22px 0;
  border-top: 1px solid var(--off-hair);
  display: grid;
  gap: 10px;
}

.off__office:last-child {
  border-bottom: 1px solid var(--off-hair);
}

.off__country {
  margin: 0;
  font-family: var(--font-primary, 'Hammersmith One', sans-serif);
  font-weight: 400;
  font-size: 21px;
  letter-spacing: .01em;
  color: #fff;
}

.off__hq {
  display: inline-block;
  vertical-align: 3px;
  margin-left: 9px;
  padding: 2px 6px;
  font-family: var(--font-secondary, 'Open Sans', sans-serif);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: #fff;
  background: var(--v2-red, #d41c22);
}

.off__addr {
  margin: 0;
  font-style: normal; /* <address> italicises by default */
  font-size: 14.5px;
  line-height: 1.55;
  color: var(--off-body);
}

.off__line {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.off__label {
  flex: none;
  min-width: 68px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: var(--off-dim);
}

.off__link {
  color: #fff;
  font-size: 15px;
  text-decoration: none;
  font-variant-numeric: tabular-nums;
  border-bottom: 1px solid transparent;
  transition:
    color .25s var(--v2-ease-out-quart, ease),
    border-color .25s var(--v2-ease-out-quart, ease);
}

.off__link:hover,
.off__link:focus-visible {
  color: var(--v2-red-text, #e8635e);
  border-bottom-color: var(--v2-red-text, #e8635e);
}

/* ---------- presence tier ---------- */

.off__presence {
  margin-top: 30px;
  padding-top: 24px;
  border-top: 1px solid var(--off-hair);
  display: flex;
  align-items: baseline;
  gap: 14px 30px;
  flex-wrap: wrap;
}

.off__presence-label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: var(--off-dim);
}

.off__presence-list {
  display: flex;
  gap: 30px;
  flex-wrap: wrap;
  list-style: none;
  margin: 0;
  padding: 0;
}

.off__presence-list li {
  position: relative;
  font-family: var(--font-primary, 'Hammersmith One', sans-serif);
  font-size: 17px;
  color: var(--off-body);
}

.off__presence-list li::before {
  content: "";
  position: absolute;
  left: -17px;
  top: 50%;
  width: 5px;
  height: 5px;
  border: 1px solid var(--v2-red-text, #e8635e);
  border-radius: 50%;
  transform: translateY(-50%);
}

/* ---------- map ---------- */

.off__map {
  display: block;
  width: 100%;
  height: auto;
  background: #001b2a;
  border: 1px solid var(--off-hair);
}

/* No internal borders in the background tier. The 48 context countries are
   still separate <path> elements (the harness asserts ctx > 20), but the
   stroke matches the fill, which closes the anti-aliasing seams between
   adjacent polygons so they read as one continuous landmass.

   This is deliberate and was the site owner's call. The background's job is
   orientation, not geopolitics, and Natural Earth's default boundaries put
   Israel, Palestine, N. Cyprus and Somaliland in frame as distinct outlined
   entities. Drawing land-versus-sea only keeps the block out of every one of
   those arguments, and costs nothing that the block needed.

   Do not "fix" this by restoring a contrasting stroke. If the seams ever show
   as faint hairlines, increase stroke-width rather than changing the colour. */
.off__map-ctx path {
  fill: #083c56;
  stroke: #083c56;
  stroke-width: .2;
}

.off__map-op path {
  fill: #1c6d8f;
  stroke: #2f88ad;
  stroke-width: .16;
}

/* The navy stroke is not decoration. Filled solid without it, Kuwait, Saudi
   Arabia and Oman merge into one red mass and the block appears to claim one
   country instead of three. */
.off__map-hq path {
  fill: var(--v2-red, #d41c22);
  stroke: var(--v2-navy, rgb(0, 42, 65));
  stroke-width: .3;
}

.off__halo {
  fill: none;
  stroke: #fff;
  stroke-width: .3;
  opacity: .9;
}

.off__pin {
  fill: #fff;
}

.off__map-label {
  fill: #fff;
  font-family: var(--font-secondary, 'Open Sans', sans-serif);
  font-size: 2.4px;
  letter-spacing: .04px;
}

/* ---------- map key ---------- */

/* Tier meaning is carried by this key as well as by colour, so the
   office/operations distinction survives for a colour-blind reader. */
.off__key {
  display: flex;
  gap: 22px;
  flex-wrap: wrap;
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
  font-size: 11px;
  letter-spacing: .04em;
  color: rgba(255, 255, 255, .5);
}

.off__key li {
  display: flex;
  align-items: center;
  gap: 7px;
}

.off__key-swatch {
  width: 9px;
  height: 9px;
  flex: none;
}

.off__key-swatch--office {
  background: var(--v2-red, #d41c22);
}

.off__key-swatch--op {
  background: #1c6d8f;
}

/* ---------- 920px: the builder's own breakpoint, and the width at which
   this block used to vanish entirely ---------- */

@media screen and (width <= 920px) {
  .off {
    grid-template-columns: minmax(0, 1fr);
    gap: 32px;
    padding-block: 64px;
    width: min(1224px, 100% - 32px);
  }

  /* Map above the register. Source order keeps the heading first for a
     screen reader; only the visual order changes. */
  .off__col--map {
    order: -1;
  }

  /* Illegible below roughly 2px rendered — the pins and tier fills still
     carry the map as a locator. */
  .off__map-label {
    display: none;
  }

  .off__list {
    margin-top: 24px;
  }

  .off__line {
    gap: 6px 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .off__link {
    transition: none;
  }
}
```

- [ ] **Step 2: Link the stylesheet**

`index.html` is one enormous line; do this with Python, not by hand.

Run:

```bash
python3 - <<'PY'
p = 'index.html'
h = open(p, encoding='utf-8').read()
old = '<link rel="stylesheet" href="/assets/css/credentials.css?v=1">'
new = old + '<link rel="stylesheet" href="/assets/css/offices.css?v=1">'
assert h.count(old) == 1, 'expected exactly one credentials.css link, found %d' % h.count(old)
assert '/assets/css/offices.css' not in h, 'offices.css is already linked'
open(p, 'w', encoding='utf-8').write(h.replace(old, new))
print('linked offices.css after credentials.css')
PY
```

Expected: `linked offices.css after credentials.css`

If the assert about credentials.css fires, another session has changed the head. Find the last `<link rel="stylesheet"` before `</head>` and anchor on that instead.

- [ ] **Step 3: Confirm the stylesheet loads**

Reload `http://localhost:8747/index.html` and run in the console:

```javascript
[...document.styleSheets].map(s => s.href).filter(h => h && h.includes('offices'))
```

Expected: an array containing one URL ending `offices.css?v=1`. An empty array means a 404 — check the path and filename.

- [ ] **Step 4: Commit**

```bash
git add assets/css/offices.css index.html
git commit -m "style(offices): stylesheet for the offices block

Two-column register and map on the navy ground, collapsing to one column
at 920px with the map above the register. No .transition classes: the
block must render without main.js."
```

---

### Task 4: Replace the markup

**Files:**
- Modify: `index.html` (the contents of `<section id="zrby1M">`)

- [ ] **Step 1: Snapshot the current block**

Keeping a copy makes the diff reviewable and gives you something to restore from.

```bash
mkdir -p /tmp/ugcc-offices
python3 - <<'PY'
h = open('index.html', encoding='utf-8').read()
i = h.find('<section id="zrby1M"')
j = h.find('<section id="Jways5TtQ"')
assert i != -1 and j != -1 and i < j, 'section boundaries not found'
open('/tmp/ugcc-offices/before.html', 'w', encoding='utf-8').write(h[i:j])
print('saved %d bytes' % (j - i))
PY
```

Expected: `saved 23824 bytes` (a nearby number is fine — other sessions may have touched it).

- [ ] **Step 2: Perform the swap**

The script reads the generated SVG, builds the new block, and replaces everything from the section's opening tag up to the next section.

The `<section>` tag loses its inline style variables and its `data-v-3ffce944` attribute, following the rail block (`<section id="zOl98u" class="block v2-rail-block">`). Dropping `data-v-3ffce944` detaches main.css's scoped `.block[data-v-3ffce944]` grid rules, which is what lets `offices.css` own the layout.

```bash
python3 - <<'PY'
svg = open('tools/generated/office-map.svg', encoding='utf-8').read().strip()

block = (
'<section id="zrby1M" class="block v2-offices-block">'
'<div class="off">'
  '<div class="off__col off__col--register">'
    '<p class="off__eyebrow">Our locations</p>'
    '<h2 class="off__title">Offices &amp; branches</h2>'
    '<p class="off__lede">Three permanent offices across the Gulf, with project '
    'operations in three more countries.</p>'
    '<ol class="off__list">'
      '<li class="off__office">'
        '<h3 class="off__country">Kuwait<span class="off__hq">Head office</span></h3>'
        '<address class="off__addr">United Gulf Construction Company<br>'
        'Al-Ardiya, Block 1, Plot 264</address>'
        '<p class="off__line"><span class="off__label">Telephone</span>'
        '<a class="off__link" href="tel:+96522054250">+965 220 542 50</a></p>'
        '<p class="off__line"><span class="off__label">Email</span>'
        '<a class="off__link" href="mailto:ugcc@ugcc.com">ugcc@ugcc.com</a></p>'
      '</li>'
      '<li class="off__office">'
        '<h3 class="off__country">Saudi Arabia</h3>'
        '<address class="off__addr">Building No. 3909, Hisham Ibn Abdul Malik Ibn '
        'Marwan Street,<br>King Fahd District, Riyadh</address>'
        '<p class="off__line"><span class="off__label">Telephone</span>'
        '<a class="off__link" href="tel:+966112611688">+966 112 611 688</a></p>'
      '</li>'
      '<li class="off__office">'
        '<h3 class="off__country">Oman</h3>'
        '<address class="off__addr">Building No. 9933, Way No. 3941, Al Khoudh,<br>'
        'P.O. Box 2971, P.C. 111, Muscat</address>'
        '<p class="off__line"><span class="off__label">Telephone</span>'
        '<a class="off__link" href="tel:+96824548660">+968 245 486 60</a></p>'
      '</li>'
    '</ol>'
    '<div class="off__presence">'
      '<span class="off__presence-label">Also operating in</span>'
      '<ul class="off__presence-list"><li>Iraq</li><li>India</li><li>Malawi</li></ul>'
    '</div>'
  '</div>'
  '<div class="off__col off__col--map">'
    + svg +
    '<ul class="off__key">'
      '<li><span class="off__key-swatch off__key-swatch--office"></span>Permanent office</li>'
      '<li><span class="off__key-swatch off__key-swatch--op"></span>Project operations</li>'
    '</ul>'
  '</div>'
'</div>'
'</section>'
)

p = 'index.html'
h = open(p, encoding='utf-8').read()
i = h.find('<section id="zrby1M"')
j = h.find('<section id="Jways5TtQ"')
assert i != -1, 'offices section not found'
assert j != -1, 'the following section (Jways5TtQ) not found'
assert i < j, 'section order is not what this script assumes'
open(p, 'w', encoding='utf-8').write(h[:i] + block + h[j:])
print('replaced %d bytes with %d' % (j - i, len(block)))
PY
```

Expected: `replaced 23824 bytes with 27XXX` — the new block is a similar size because the inline SVG is most of it.

- [ ] **Step 3: Confirm the old artefacts are gone**

Run:

```bash
python3 - <<'PY'
h = open('index.html', encoding='utf-8').read()
i = h.find('<section id="zrby1M"')
j = h.find('<section id="Jways5TtQ"')
seg = h[i:j]
for token, want in [
    ('block--mobile-hidden', False), ('layout-element', False), ('grid-shape', False),
    ('screenshot-2025-10-20', False), ('transition--slide', False), ('ADRESS', False),
    ('data-v-3ffce944', False), ('off__map', True), ('tel:+96522054250', True),
    ('mailto:ugcc@ugcc.com', True), ('<address', True),
]:
    got = token in seg
    print(('OK  ' if got == want else 'BAD ') + token + ' present=' + str(got))
PY
```

Expected: every line starts `OK`.

- [ ] **Step 4: Confirm nothing outside the block moved**

Run: `git diff --stat`

Expected: `index.html` only (plus nothing else). Then run:

```bash
git diff index.html | head -5
```

Expected: a single-hunk diff. `index.html` is nearly one line, so the diff will be unreadable — that is normal. What matters is that only `index.html` changed and the neighbouring sections still exist:

```bash
python3 -c "
h = open('index.html', encoding='utf-8').read()
for s in ['zZFMdo','zrby1M','Jways5TtQ','FUdf9w9dXZ','zOl98u','zd_fdi']:
    print(s, h.count('<section id=\"%s\"' % s))
"
```

Expected: each id appears exactly `1` time.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(offices): two-tier register and vector map for #zrby1M

Replaces 23 absolutely-positioned .layout-element divs and the map
screenshot whose baked-in heading duplicated the live one and whose frame
omitted Malawi.

The block renders on mobile for the first time: block--mobile-hidden is
gone. Phone numbers and the email are now links. Kuwait/KSA/Oman carry
full detail; Iraq/India/Malawi are declared as operations, so the
asymmetry reads as a category rather than missing data."
```

---

### Task 5: Turn the harness green

**Files:**
- Modify: `assets/css/offices.css` (only if a check fails)

- [ ] **Step 1: Run the harness at 1280px**

Serve the site, open `http://localhost:8747/index.html`, set the viewport to 1280x800, hard-reload, paste `tools/offices-check.js` into the console.

Expected: `15 passed, 0 failed  (viewport 1280px)`

- [ ] **Step 2: Run at 920px**

Resize to 920px wide, hard-reload, paste again.

Expected: `15 passed, 0 failed  (viewport 920px)`

This is the boundary where the old block disappeared. Check 1 passing here is the headline fix.

- [ ] **Step 3: Run at 375px**

Resize to 375px wide, hard-reload, paste again.

Expected: `15 passed, 0 failed  (viewport 375px)`

**Check 9 proved nothing at this width before Task 4.** It short-circuits on
`r.width > 0`, and a `display:none` block yields all-zero rects — so it reported
a vacuous pass at 375px throughout Tasks 1–3. It only becomes a real assertion
once check 1 is green. Do not treat a green check 9 here as evidence unless
check 1 is also green in the same run.

Check 9 is the one most likely to fail here. If it reports an overflowing node, the usual causes are the long Saudi street address not wrapping, or the SVG being given an intrinsic width. Fix in `offices.css` — add `overflow-wrap: anywhere` to `.off__addr`, or confirm `.off__map { width: 100%; height: auto; }` is applying — never by hiding anything.

- [ ] **Step 4: Confirm the block survives without JavaScript**

Disable JavaScript in DevTools (Command Palette → "Disable JavaScript"), hard-reload, and confirm the offices block still renders fully: heading, three offices, map, key.

Expected: the block looks identical. This is what check 8 asserts statically; this step proves it end to end. If the block is blank, a `.transition` class has crept in.

Re-enable JavaScript afterwards.

- [ ] **Step 5: Confirm focus rings are visible on navy**

Click just above the block, then press Tab repeatedly until focus enters the offices links.

Expected: each phone/email link shows a visible red outline against the navy ground. The rule comes from `v2.css` (`:focus-visible { outline: 2px solid var(--v2-red); outline-offset: 3px }`).

If the ring is hard to see against navy, add to `offices.css`:

```css
.off__link:focus-visible {
  outline-color: #fff;
}
```

- [ ] **Step 6: Commit any fixes**

Only if Steps 3–5 required changes:

```bash
git add assets/css/offices.css
git commit -m "fix(offices): <what you actually fixed>"
```

If nothing needed fixing, skip this step — do not create an empty commit.

---

### Task 6: Record the result

**Files:**
- Modify: `docs/superpowers/specs/2026-07-20-offices-recompose-design.md`

- [ ] **Step 1: Measure the new block**

With the site served at 1280x720, run in the console:

```javascript
(() => {
  const el = document.getElementById('zrby1M');
  const h = el.getBoundingClientRect().height;
  const page = document.body.scrollHeight;
  return `offices ${Math.round(h)}px, page ${Math.round(page)}px, ${(h / page * 100).toFixed(1)}%`;
})()
```

Record the output. For reference, the old block was `624px, page 7685px, 8.1%`.

- [ ] **Step 2: Append the outcome to the spec**

Add this section to the end of `docs/superpowers/specs/2026-07-20-offices-recompose-design.md`, filling in the real numbers from Step 1 and from `ls -l tools/generated/office-map.svg`:

```markdown
## Outcome

Implemented 2026-07-20 on `hero-recompose`.

- Block height: <N>px at 1280x720 (was 624px), <N>% of the page.
- Inline SVG: <N> bytes raw.
- `tools/offices-check.js`: 15 passed, 0 failed at 375px, 920px and 1280px.
- Verified rendering with JavaScript disabled.

The six map screenshot variants remain on disk, unreferenced, per "Old assets".
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-07-20-offices-recompose-design.md
git commit -m "docs(offices): record the implemented result"
```

---

## Definition of done

- [ ] `tools/offices-check.js` reports 15 passed, 0 failed at 375px, 920px and 1280px.
- [ ] The block renders with JavaScript disabled.
- [ ] `git grep -c 'block--mobile-hidden' index.html` does not match inside `#zrby1M`.
- [ ] No `<img>` inside `#zrby1M`.
- [ ] Three `tel:` links and one `mailto:` link, all reachable by keyboard with a visible focus ring.
- [ ] `python3 tools/make-office-map.py` reproduces `tools/generated/office-map.svg` byte-identically.
- [ ] `git status` is clean and `git log --oneline -6` shows the six commits from this plan.

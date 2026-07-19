# Credentials Block Recompose Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 1,779px dashed-timeline credentials block (`#zZFMdo`, "THE POWER OF EXPERIENCE") with a ~600px two-column white block — the experience claim and its three sourced figures on the left, the five certifications as a dated register on the right, and an exit to `/credentials/`.

**Architecture:** Purely additive layers on a buildless static site, following the pattern `hero.css`, `sections.css` and `rail.css` established. The wrapper `<section id="zZFMdo">` is kept with its id and its builder-generated contents are replaced wholesale. Styling goes in a new `assets/css/credentials.css`, loaded only by `index.html`. No JavaScript at all — the block does not use the builder's `.transition` reveal classes, so it renders whether or not `assets/js/main.js` runs.

**Tech Stack:** Plain HTML and CSS. A throwaway Python 3 splice for the one markup surgery. No build step, no bundler, no dependencies.

**Spec:** `docs/superpowers/specs/2026-07-19-credentials-recompose-design.md`

**Branch:** `hero-recompose`. Do not push. Do not merge to `master`.

---

## Concurrency protocol — read this before starting

**Three other agents are working in this same checkout, on this same branch, right now.** They own the three blocks *above* this one: About / WHO ARE WE, the gallery rail (`#zOl98u`), and PROJECTS (`#zd_fdi`). This is not hypothetical — during design, `index.html` went from 135,695 to 132,288 bytes and `#zZFMdo` moved from byte 74,607 to 71,200 while another session landed its `rail.css` link.

### Why there is no git worktree

The governing skill normally requires an isolated worktree. **We are deliberately not using one**, for the same structural reason recorded in the gallery-rail plan: the entire page body of `index.html` is a single ~100 KB line. Two branches both editing that one line produce a merge conflict spanning the whole page, which git cannot resolve and a human cannot review. Isolation would convert a small coordination problem into an unmergeable one.

We share the tree and coordinate by discipline instead.

### File ownership

**This work may create or modify only:**

- `tools/credentials-check.js`
- `assets/css/credentials.css`
- `index.html` — **exactly once**, in Task 3

**Never touch, for any reason:** `assets/css/hero.css`, `assets/css/sections.css`, `assets/css/rail.css`, `assets/css/v2.css`, `assets/css/main.css`, `assets/css/custom.css`, `assets/js/*`, `tools/hero-check.js`, `tools/rail-check.js`, `tools/home-check.js`.

If a task seems to require editing one of those, stop and report BLOCKED rather than editing it. In particular: **the CTA reuses `.v2-btn.v2-btn--on-light`, which already exists in `sections.css`.** If the button looks wrong, fix it in `credentials.css` with a more specific selector — do not edit `sections.css`, which the About session owns.

### Task ordering is a safety property, not a preference

Tasks 1 and 2 create **new files only** and cannot collide with anything. `index.html` is touched exactly once, in Task 3, and committed immediately. This is why Task 2 defers all browser verification to Task 3 — the alternative was editing `index.html` early and leaving it modified across two tasks.

Do not reorder the tasks. Do not "just quickly" add the `<link>` tag early.

### Rules for every task

1. **Start** by running `git log --oneline -3` and `git status --short`, so you know what moved since the last task.
2. **Never `git add -A`, `git add .`, or `git commit -a`.** Always name explicit paths. A wildcard add will sweep another session's in-flight work into your commit.
3. **Never** revert, amend, rebase, `git checkout --` or stash anything you did not create in this task.
4. If `git status` shows modifications to files you do not own, **leave them alone** — that is another session's working state. Do not report it as a problem; just do not commit it.
5. If a git command fails with `index.lock`, wait a few seconds and retry once. That is another session committing.
6. If your commit unexpectedly contains files you do not own, **do not push or amend** — report it immediately.

### Two rules specific to this work

7. **Locate by string, never by byte offset or line number.** Every offset in the spec was already invalidated once. `id="zZFMdo"` was not.
8. **The markup you insert must contain no newline characters.** The page body is one line; splitting it turns every other session's edit to that line into a conflicting hunk. Task 3's script builds the markup as a single Python string for exactly this reason — do not reformat it across lines to make it prettier.

### Serving the site

Another session already holds port 8747. Do not fight it — that server serves this same working tree, so it is already serving your changes.

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8747/
```

If that prints `200`, use `http://localhost:8747/`. If it does not, start your own on a free port:

```bash
python3 -m http.server 8848
```

---

## Task 1: The failing check script

Written first, and run first, so that every later claim of success has evidence behind it.

**Files:**
- Create: `tools/credentials-check.js`

- [ ] **Step 1: Write the check script**

Create `tools/credentials-check.js` with exactly this content:

```javascript
/* UGCC credentials block checks (#zZFMdo). Dependency-free, synchronous.
   Usage: serve the site over HTTP, open the homepage, paste into the console.
   Returns {passed, failed, results}.

   Resize to 1280x720 before running — the height check is width-sensitive.
   Re-runnable: nothing here mutates the page.

   NOT covered (manual verification required):
     - whether the two-column rhythm reads well against the block above
     - whether "1975 / 6 / 7" is the most persuasive trio of figures */
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

  var SECTION = 'zZFMdo';
  var EXPECTED_CODES = ['ISO 9001', 'ISO 45001', 'ISO 14001', 'ISO 17025', 'GRADE 1'];
  var EXPECTED_YEARS = ['2004', '2007', '2012', '2019'];
  var EXPECTED_FIGURES = ['1975', '6', '7'];

  function section() { return document.getElementById(SECTION); }
  function rows() {
    return Array.prototype.slice.call(document.querySelectorAll('#' + SECTION + ' .cred__row'));
  }

  check('section is under 700px tall', function () {
    var s = section();
    if (!s) return { ok: false, detail: 'section #' + SECTION + ' missing' };
    var h = Math.round(s.getBoundingClientRect().height);
    if (h === 0) return { ok: false, detail: 'section has zero height — not rendered' };
    return { ok: h < 700, detail: h + 'px (was 1779px) @ ' + window.innerWidth + 'px wide' };
  });

  check('all six decorative SVGs are gone', function () {
    var s = section();
    if (!s) return { ok: false, detail: 'section missing' };
    var n = s.querySelectorAll('svg').length;
    return { ok: n === 0, detail: n + ' svg elements remain (want 0)' };
  });

  check('ledger holds exactly five dt/dd pairs', function () {
    var s = section();
    if (!s) return { ok: false, detail: 'section missing' };
    var dts = s.querySelectorAll('.cred__ledger dt').length;
    var dds = s.querySelectorAll('.cred__ledger dd').length;
    var rowCount = rows().length;
    return {
      ok: dts === 5 && dds === 5 && rowCount === 5,
      detail: rowCount + ' rows, ' + dts + ' dt, ' + dds + ' dd (want 5 / 5 / 5)'
    };
  });

  check('the five credential codes are present, in ledger order', function () {
    /* The count guard is load-bearing: without it this passes vacuously on a
       page with no rows at all, because the map produces an empty array that
       trivially satisfies nothing. A green line in a red harness is worse
       than a red one. */
    var list = rows();
    if (list.length !== 5) {
      return { ok: false, detail: 'expected 5 rows to inspect, found ' + list.length };
    }
    var got = list.map(function (r) {
      var n = r.querySelector('.cred__name');
      return n ? n.textContent.trim().toUpperCase() : '(none)';
    });
    var want = EXPECTED_CODES.join(' | ');
    var have = got.join(' | ');
    return { ok: have === want, detail: 'got [' + have + '] want [' + want + ']' };
  });

  check('exactly four dated rows, chronological, Grade 1 undated', function () {
    /* This is the check that stops the original bug from returning. The old
       block drew a timeline whose DOM order was 2004, (none), 2012, 2007,
       2019 — a chronology that was not chronological. */
    var s = section();
    if (!s) return { ok: false, detail: 'section missing' };
    var times = Array.prototype.slice.call(s.querySelectorAll('.cred__ledger time'));
    if (times.length !== 4) {
      return { ok: false, detail: times.length + ' <time> elements (want exactly 4)' };
    }
    var got = times.map(function (t) { return t.getAttribute('datetime'); });
    var ordered = got.join(',') === EXPECTED_YEARS.join(',');
    var labelled = times.every(function (t) {
      return t.textContent.trim() === t.getAttribute('datetime');
    });
    var last = rows()[4];
    var lastName = last && last.querySelector('.cred__name');
    var gradeUndated = !!last && last.querySelectorAll('time').length === 0 &&
      !!lastName && lastName.textContent.trim().toUpperCase() === 'GRADE 1';
    return {
      ok: ordered && labelled && gradeUndated,
      detail: 'datetime[' + got.join(',') + '] ordered=' + ordered +
              ' labelled=' + labelled + ' gradeUndated=' + gradeUndated
    };
  });

  check('the three stat figures read 1975 / 6 / 7', function () {
    var s = section();
    if (!s) return { ok: false, detail: 'section missing' };
    var figs = Array.prototype.slice.call(s.querySelectorAll('.cred__figure'));
    if (figs.length !== 3) {
      return { ok: false, detail: figs.length + ' figures (want exactly 3)' };
    }
    var got = figs.map(function (f) { return f.textContent.trim(); });
    return {
      ok: got.join(',') === EXPECTED_FIGURES.join(','),
      detail: 'got [' + got.join(', ') + '] want [' + EXPECTED_FIGURES.join(', ') + ']'
    };
  });

  check('exactly one link, pointing at /credentials/', function () {
    var s = section();
    if (!s) return { ok: false, detail: 'section missing' };
    var links = Array.prototype.slice.call(s.querySelectorAll('a'));
    var hrefs = links.map(function (a) { return a.getAttribute('href'); });
    return {
      ok: links.length === 1 && hrefs[0] === '/credentials/',
      detail: links.length + ' links [' + hrefs.join(', ') + ']'
    };
  });

  check('the CTA reuses the shared button classes', function () {
    var s = section();
    if (!s) return { ok: false, detail: 'section missing' };
    var a = s.querySelector('a');
    if (!a) return { ok: false, detail: 'no link found' };
    var has = a.classList.contains('v2-btn') && a.classList.contains('v2-btn--on-light');
    var radius = getComputedStyle(a).borderRadius;
    return {
      ok: has && parseInt(radius, 10) > 100,
      detail: 'class="' + a.className + '" border-radius=' + radius +
              ' (a small radius means sections.css did not load)'
    };
  });

  check('heading is an h2 and is the block only heading', function () {
    var s = section();
    if (!s) return { ok: false, detail: 'section missing' };
    var h2 = s.querySelectorAll('h2').length;
    var others = s.querySelectorAll('h1, h3, h4, h5, h6').length;
    return { ok: h2 === 1 && others === 0, detail: h2 + ' h2, ' + others + ' other headings' };
  });

  check('no legacy builder layout elements survive in the block', function () {
    var s = section();
    if (!s) return { ok: false, detail: 'section missing' };
    var n = s.querySelectorAll('.layout-element, .text-box, .grid-shape, .block-layout').length;
    return { ok: n === 0, detail: n + ' builder nodes remain (want 0)' };
  });

  check('no horizontal page overflow', function () {
    var over = document.body.scrollWidth - window.innerWidth;
    return {
      ok: over <= 0,
      detail: 'body.scrollWidth ' + document.body.scrollWidth +
              ' vs innerWidth ' + window.innerWidth
    };
  });

  check('block is readable without JavaScript reveals', function () {
    /* The block must not opt into .transition — those start at opacity 0 and
       depend on assets/js/main.js. If main.js fails, this block must still
       render. See "Behaviour" in the spec. */
    var s = section();
    if (!s) return { ok: false, detail: 'section missing' };
    var hidden = s.querySelectorAll('.transition').length;
    var title = s.querySelector('.cred__title');
    var op = title ? getComputedStyle(title).opacity : '0';
    return {
      ok: hidden === 0 && parseFloat(op) === 1,
      detail: hidden + ' .transition nodes, title opacity ' + op
    };
  });

  var passed = results.filter(function (r) { return r.ok; }).length;
  var failed = results.length - passed;
  results.forEach(function (r) {
    console.log((r.ok ? 'PASS  ' : 'FAIL  ') + r.name + (r.detail ? '  [' + r.detail + ']' : ''));
  });
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  return { passed: passed, failed: failed, results: results };
})();
```

- [ ] **Step 2: Run it against the current page to verify it fails**

Serve the site (see "Serving the site" above), open `http://localhost:8747/` at 1280x720, and paste the contents of `tools/credentials-check.js` into the browser console.

Expected: **11 of 12 checks FAIL.** Specifically:

- `section is under 700px tall` → FAIL, `1779px (was 1779px) @ 1280px wide`
- `all six decorative SVGs are gone` → FAIL, `6 svg elements remain (want 0)`
- `ledger holds exactly five dt/dd pairs` → FAIL, `0 rows, 0 dt, 0 dd`
- `the five credential codes are present, in ledger order` → FAIL, `expected 5 rows to inspect, found 0`
- `exactly four dated rows, chronological, Grade 1 undated` → FAIL, `0 <time> elements`
- `the three stat figures read 1975 / 6 / 7` → FAIL, `0 figures`
- `exactly one link, pointing at /credentials/` → FAIL, `0 links []`
- `the CTA reuses the shared button classes` → FAIL, `no link found`
- `heading is an h2 and is the block only heading` → FAIL, `0 h2, 1 other headings`
- `no legacy builder layout elements survive in the block` → FAIL (a large count, ~14)
- `block is readable without JavaScript reveals` → FAIL (a non-zero `.transition` count)

The one that should already PASS is `no horizontal page overflow`. If it fails, that is a pre-existing problem in someone else's block — record it and move on; it is not yours to fix.

**If any other check passes at this stage, the check is wrong, not the page.** Fix the check before continuing — a check that passes against the old markup will also pass against a broken new one.

- [ ] **Step 3: Commit**

```bash
git add tools/credentials-check.js
git commit -m "test: credentials block assertion harness (failing)"
```

---

## Task 2: The stylesheet

Written before the markup because the markup is generated by a script in Task 3 and should be inserted once, correctly, with its styling already in place.

**Files:**
- Create: `assets/css/credentials.css`

- [ ] **Step 1: Write the stylesheet**

Create `assets/css/credentials.css` with exactly this content:

```css
/* ==========================================================================
   UGCC homepage — the credentials block (#zZFMdo), "The Power of Experience".
   Loaded only by index.html, after sections.css.

   The CTA reuses .v2-btn / .v2-btn--on-light from sections.css. Nothing here
   redefines the button. If the button looks wrong, add a more specific rule
   in this file — sections.css belongs to another session.

   No JavaScript, and deliberately none of the builder's .transition reveal
   classes: those start at opacity 0 and depend on assets/js/main.js, so a
   script failure would render this block blank. See "Behaviour" in the spec.
   ========================================================================== */

#zZFMdo {
  background: #fff;
}

.cred {
  max-width: 1224px;
  margin: 0 auto;
  padding: 88px 4.44vw;
  display: grid;
  grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr);
  gap: 64px;
  align-items: start;
}

/* ---------- left column: the claim ---------- */

.cred__title {
  margin: 0;
  font-family: var(--font-primary, 'Hammersmith One', sans-serif);
  font-weight: 400;
  font-size: clamp(30px, 3.2vw, 44px);
  line-height: 1.12;
  letter-spacing: .01em;
  text-transform: uppercase;
  color: var(--v2-navy, #002a41);
}

/* The rule is decoration, so it is a span with aria-hidden rather than an
   <hr>, which would announce a thematic break that is not there. */
.cred__rule {
  display: block;
  width: 34px;
  height: 2px;
  margin: 20px 0;
  background: var(--v2-red, #d41c22);
}

.cred__lede {
  margin: 0;
  font-family: var(--font-secondary, 'Open Sans', sans-serif);
  font-size: 15px;
  line-height: 1.75;
  color: #5a6570;
}

.cred__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  margin: 32px 0 0;
  padding: 0;
  list-style: none;
}

.cred__stats li {
  display: flex;
  flex-direction: column;
}

.cred__figure {
  font-family: var(--font-primary, 'Hammersmith One', sans-serif);
  font-size: 38px;
  line-height: 1;
  color: var(--v2-navy, #002a41);
}

.cred__unit {
  margin-top: 6px;
  font-family: var(--font-secondary, 'Open Sans', sans-serif);
  font-size: 11px;
  letter-spacing: .09em;
  text-transform: uppercase;
  color: #8a929a;
}

.cred__claim .v2-btn {
  margin-top: 36px;
}

/* ---------- right column: the ledger ----------
   Two grids, not one. The row is [dt | dd]; the dt is itself [year | code].
   A single three-column grid would need the <time> to be a sibling of the
   <dt>, which is invalid inside a <dl>. Fixed widths on both keep the years
   and the codes aligned down the block regardless. */

.cred__ledger {
  margin: 0;
  border-top: 1px solid #e6e8ea;
}

.cred__row {
  display: grid;
  grid-template-columns: 168px minmax(0, 1fr);
  gap: 16px;
  align-items: baseline;
  padding: 18px 0;
  border-bottom: 1px solid #e6e8ea;
}

.cred__code {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 12px;
  align-items: baseline;
  margin: 0;
}

.cred__year {
  font-family: var(--font-secondary, 'Open Sans', sans-serif);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: #8a929a;
}

.cred__name {
  font-family: var(--font-secondary, 'Open Sans', sans-serif);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: .02em;
  color: var(--v2-navy, #002a41);
}

.cred__desc {
  margin: 0;
  font-family: var(--font-secondary, 'Open Sans', sans-serif);
  font-size: 14px;
  line-height: 1.6;
  color: #5a6570;
}

/* ---------- one column ---------- */

@media (max-width: 768px) {
  .cred {
    grid-template-columns: minmax(0, 1fr);
    gap: 36px;
    padding: 56px 16px;
  }

  .cred__stats {
    gap: 24px;
  }

  .cred__figure {
    font-size: 30px;
  }

  .cred__claim .v2-btn {
    margin-top: 28px;
  }

  /* The year moves up beside its code so the description keeps full width. */
  .cred__row {
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
    padding: 14px 0;
  }

  .cred__code {
    grid-template-columns: auto auto;
    justify-content: start;
    gap: 10px;
  }
}
```

- [ ] **Step 2: Verify the file parses and defines what Task 3 expects**

The stylesheet cannot be verified in a browser yet — no markup uses it. Verify statically that every class the markup will use has a rule, and that no rule targets a file we do not own:

```bash
cd "/Users/danijeljovanovic/Dev/UGCC Website"
for c in cred cred__claim cred__title cred__rule cred__lede cred__stats cred__figure cred__unit cred__ledger cred__row cred__code cred__year cred__name cred__desc; do
  grep -q "\.$c[ ,{:]" assets/css/credentials.css && echo "ok   .$c" || echo "MISSING .$c"
done
grep -c "v2-btn" assets/css/credentials.css
```

Expected: fourteen `ok` lines, no `MISSING`, and the final count is `2` — the two `.cred__claim .v2-btn` margin rules and nothing else. **If that count is higher, the file is redefining the shared button; delete those rules before continuing.**

Note that `.cred__claim` legitimately has no standalone rule of its own beyond the descendant selector — it is a positioning wrapper only. The loop above checks for `.cred__claim ` with a trailing space, which the `.cred__claim .v2-btn` rules satisfy.

- [ ] **Step 3: Commit**

```bash
git add assets/css/credentials.css
git commit -m "style: credentials block, claim beside a dated register"
```

---

## Task 3: The markup — the only `index.html` edit

This is the one task that touches a shared file. Do it in one sitting and commit immediately.

**Files:**
- Modify: `index.html` (two changes: one `<link>`, one block replacement)

- [ ] **Step 1: Confirm the tree is in a state you can reason about**

```bash
cd "/Users/danijeljovanovic/Dev/UGCC Website"
git log --oneline -3
git status --short
wc -c index.html
grep -c 'id="zZFMdo"' index.html
grep -c 'credentials.css' index.html
```

Expected: `grep -c 'id="zZFMdo"'` prints `1`, and `grep -c 'credentials.css'` prints `0`. If `index.html` shows as modified in `git status`, that is another session mid-edit — **wait and re-check rather than proceeding.** Note the `wc -c` figure; you will compare against it in Step 4.

- [ ] **Step 2: Add the stylesheet link**

Use an `Edit` call — exact string match, anchored on `</head>` per the convention commit `980946e` established:

- old_string: `<link rel="stylesheet" href="/assets/css/rail.css?v=1"></head>`
- new_string: `<link rel="stylesheet" href="/assets/css/rail.css?v=1"><link rel="stylesheet" href="/assets/css/credentials.css?v=1"></head>`

If that old_string is not found, another session has changed the `<head>`. Re-read the last 200 characters before `</head>` and anchor on whatever the last stylesheet link actually is — **never** anchor on `</head>` alone, because another session may be about to insert there too.

- [ ] **Step 3: Replace the block contents**

Run this script. It asserts before it writes, and refuses to run if anything is not exactly as expected:

```bash
cd "/Users/danijeljovanovic/Dev/UGCC Website" && python3 - <<'PYEOF'
import re, sys

path = 'index.html'
src = open(path, encoding='utf-8').read()
before = len(src)

open_tag_re = re.compile(r'<section id="zZFMdo"[^>]*>')
opens = list(open_tag_re.finditer(src))
if len(opens) != 1:
    sys.exit('ABORT: expected exactly 1 opening tag for #zZFMdo, found %d' % len(opens))

start = opens[0].end()
end = src.find('</section>', start)
if end == -1:
    sys.exit('ABORT: no closing </section> after #zZFMdo')

old = src[start:end]
for marker in ('THE POWER ', 'ISO 17025', 'zRxBFj'):
    if marker not in old:
        sys.exit('ABORT: %r not inside #zZFMdo — wrong region, refusing to write' % marker)
if 'cred__ledger' in old:
    sys.exit('ABORT: block already replaced — nothing to do')

ROWS = [
    ('2004', 'ISO 9001',  'Quality management system'),
    ('2007', 'ISO 45001', 'Occupational health and safety, first certified as OHSAS 18001'),
    ('2012', 'ISO 14001', 'Environmental management system'),
    ('2019', 'ISO 17025', 'Central testing laboratory competence'),
    (None,   'Grade 1',   'Highest Kuwaiti classification for roads, infrastructure and '
                          'building construction, plus electrical works'),
]

rows = ''
for year, name, desc in ROWS:
    cell = ('<time class="cred__year" datetime="%s">%s</time>' % (year, year)) if year \
        else '<span class="cred__year" aria-hidden="true">&#8212;</span>'
    rows += ('<div class="cred__row"><dt class="cred__code">%s'
             '<span class="cred__name">%s</span></dt>'
             '<dd class="cred__desc">%s</dd></div>' % (cell, name, desc))

new = (
    '<div class="cred">'
    '<div class="cred__claim">'
    '<h2 class="cred__title">The Power<br>of Experience</h2>'
    '<span class="cred__rule" aria-hidden="true"></span>'
    '<p class="cred__lede">UGCC is amongst the most sought-after and efficient '
    'engineering organizations in the Middle East, and represents a tremendous '
    'concentration of technical and strategic knowledge in Kuwait and '
    'internationally.</p>'
    '<ul class="cred__stats">'
    '<li><span class="cred__figure">1975</span><span class="cred__unit">Since</span></li>'
    '<li><span class="cred__figure">6</span><span class="cred__unit">Countries</span></li>'
    '<li><span class="cred__figure">7</span><span class="cred__unit">Sectors</span></li>'
    '</ul>'
    '<a class="v2-btn v2-btn--on-light" href="/credentials/">View Credentials</a>'
    '</div>'
    '<dl class="cred__ledger">' + rows + '</dl>'
    '</div>'
)

if '\n' in new:
    sys.exit('ABORT: replacement contains a newline — would split the body line')

out = src[:start] + new + src[end:]
open(path, 'w', encoding='utf-8').write(out)
print('replaced %d bytes with %d; file %d -> %d' % (len(old), len(new), before, len(out)))
PYEOF
```

Expected output. These are **measured**, by running this exact script against a scratch copy of `index.html` at 132,288 bytes:

```
replaced 20418 bytes with 1930; file 132288 -> 113800
```

The figures will drift as other sessions commit, but the shape must hold: **about 20 KB removed, about 1.9 KB added.** If the removed figure is far under 20 KB, the region matched was too small — stop and investigate rather than committing.

If the script prints `ABORT:`, it wrote nothing. Read the message, fix the cause, run it again. The `ABORT: block already replaced` case means the step succeeded earlier — move to Step 4 rather than re-running.

- [ ] **Step 4: Verify the diff touched only this block**

```bash
cd "/Users/danijeljovanovic/Dev/UGCC Website"
git diff --stat index.html
git diff --numstat index.html
awk 'END{print NR" lines"}' index.html
grep -c 'cred__ledger' index.html
grep -c 'zRxBFj\|zH9LJs\|zXXhjo\|zMxkur\|zRKVL4\|zy95MQ' index.html
```

Expected — again, **measured** against the 132,288-byte scratch copy:

- `git diff --numstat` shows `1  13  index.html`: one line added, thirteen removed.
- `awk 'END{print NR}' index.html` drops from **25 to 13**.
- `grep -c 'cred__ledger'` prints `1`.
- The old decorative shape ids print `0` — all six SVG containers are gone.

**The line count is supposed to drop, and this is the one number most likely to look alarming.** It is not the body line splitting. Those twelve newlines exist only because the six decorative `<svg>` elements were emitted pretty-printed — two newlines each, inside the block, all of them inside markup this task deletes on purpose. Confirm that reading before accepting the diff:

```bash
git diff -U0 index.html | grep -c '^-.*<circle\|^-.*<line\|^-.*</svg>'
```

Expected: `12`. Every removed line is SVG decoration. If any removed line is something else, **stop** — the region matched was wrong.

What must *not* happen is the added count exceeding 1. One added line means the body is still one line. If `numstat` shows `2 13` or worse, the replacement contained a newline; run `git checkout -- index.html` **only if you are certain no other session has uncommitted work in it** (check `git status --short` and ask before doing this), and re-run Step 3.

- [ ] **Step 5: Run the check script**

Reload `http://localhost:8747/` at 1280x720 and paste `tools/credentials-check.js` into the console.

Expected: **12 passed, 0 failed.**

If `the CTA reuses the shared button classes` fails on `border-radius`, `sections.css` did not load — check the `<link>` from Step 2 is present and ordered after `sections.css`, not before it.

If `section is under 700px tall` fails with a number near 1779, the builder's `--block-min-height` is still applying. It lived on the `.block-layout` div that Step 3 deleted, so this should not happen; if it does, add `#zZFMdo { min-height: 0; }` to `credentials.css` — that file is yours, `main.css` is not.

- [ ] **Step 6: Confirm nothing else on the page regressed**

Paste `tools/home-check.js` into the same console. **Do not edit that file.** Record its output verbatim in your report. Some of its assertions cover blocks other sessions are actively rewriting, so failures there may not be yours — say which failures you caused and which you inherited, and do not fix anyone else's.

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "feat(credentials): claim and dated register, 1779px -> ~600px"
```

Name `index.html` explicitly. Do not use `-a`.

---

## Task 4: Narrow viewport

The block is now correct at 1280px. This task proves it at phone width, where the two-column grid collapses.

**Files:**
- Modify: `assets/css/credentials.css` (only if a defect is found)

- [ ] **Step 1: Check the single-column layout at 390px**

Resize the browser to 390x844 and reload. Paste `tools/credentials-check.js` again.

Expected: **12 passed, 0 failed** — the same as desktop. Two checks are genuinely width-sensitive and are the reason for re-running:

- `no horizontal page overflow` — the most likely failure. The `168px` dt column is overridden at this width, but a long unbroken string could still push the grid wide.
- `section is under 700px tall` — the block is taller in one column. If it exceeds 700px at 390px wide, that is acceptable and the *check* is what needs relaxing, not the design. Change that one check to `h < (window.innerWidth < 769 ? 1100 : 700)` and note it in your report. Do not silently widen the desktop bound.

- [ ] **Step 2: Read the block and confirm it reads in the right order**

```javascript
document.querySelector('#zZFMdo .cred').innerText
```

Expected order: the title, the lede, `1975 Since 6 Countries 7 Sectors`, `View Credentials`, then the five rows beginning `2004 ISO 9001 Quality management system` and ending with the Grade 1 row. The Grade 1 row must **not** contain an em-dash — it is `aria-hidden`, so `innerText` should skip it. If a dash appears, the `aria-hidden` attribute is missing from the span.

- [ ] **Step 3: Fix any defect found, in `credentials.css` only**

If Steps 1–2 were clean, skip to Step 4 with no code change.

If overflow was found, the fix goes in the `@media (max-width: 768px)` block already in the file — most likely `.cred__desc { overflow-wrap: anywhere; }`. Do not add a horizontal scroll container, and do not touch any other file.

- [ ] **Step 4: Commit**

If Step 3 changed nothing, there is nothing to commit — say so and stop. Otherwise:

```bash
git add assets/css/credentials.css
git commit -m "fix(credentials): <the specific defect, named>"
```

---

## Done criteria

All four must hold before reporting this complete:

1. `tools/credentials-check.js` reports 12 passed, 0 failed at both 1280x720 and 390x844.
2. `git diff --numstat` for the `index.html` commit shows `1` added line. The removed count is expected to be 13, all of it SVG decoration.
3. `git log --oneline` shows four commits from this work, and `git show --stat` on each confirms none of them contains a file outside the ownership list.
4. `tools/home-check.js` output is recorded, with any failures attributed to this work or to another session.

## What this work does not verify

State these plainly in the final report rather than implying full coverage:

- **No screenshot evidence.** The browser preview pane in the authoring session renders a different surface than the one its scripts drive, so it could not capture this block. Verification is by check script and DOM measurement. If the executing session has a working preview, take a screenshot at 1280x720 and attach it — but do not claim a visual pass without one.
- **The colour relationship with the block above** depends on what the PROJECTS session lands. White was chosen precisely so this block is correct either way, but the seam between the two has not been looked at by a human.
- **Copy has not been client-approved.** Every fact is a restatement of something already published on this site (see "Numbers" in the spec), so nothing new is asserted — but "6 countries" and "7 sectors" are now stated as figures rather than buried in prose, which is a change in emphasis worth flagging to the client.
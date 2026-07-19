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

9. **Re-verify every shared class name before you use it.** This plan consumes exactly one thing it does not own: the button, `.v2-btn.v2-btn--on-light` from `sections.css`.

   This bit once already. The plan was first written against `.v2-btn--dark`; the About session's commit `a786382`, "name the button variants by the ground they sit on", renamed it to `.v2-btn--on-light` while this plan was being drafted. The old name was silently dead — the pill rendered with a transparent background and no error anywhere. **Assume it can be renamed again.** Before Task 3, run:

   ```bash
   grep -n "v2-btn--on-light" assets/css/sections.css
   ```

   If that returns nothing, the variant was renamed again. Find the current light-ground variant — it is the one whose rule is `background: var(--v2-navy); color: #fff` — and use that name in Task 3's markup, in Task 2's `credentials.css`, and in Task 1's check. Do not edit `sections.css` to add the old name back.

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

  check('section is under its height budget', function () {
    var s = section();
    if (!s) return { ok: false, detail: 'section #' + SECTION + ' missing' };
    var h = Math.round(s.getBoundingClientRect().height);
    if (h === 0) return { ok: false, detail: 'section has zero height — not rendered' };
    /* The bound is per-breakpoint because one column is legitimately taller
       than two, and a check that goes red on a correct block teaches the
       reader to ignore red. Both numbers are measured, not guessed: this
       markup and CSS render 591px at 1280 wide and 974px at 390. The desktop
       bound is the entire point of the work; the narrow bound is the measured
       974 plus headroom for longer text or a larger default font.

       921, not 769: it must track the stylesheet's own breakpoint, which is
       920px to match the builder and the header. See credentials.css. */
    var bound = window.innerWidth < 921 ? 1100 : 700;
    return {
      ok: h < bound,
      detail: h + 'px (was 1779px) @ ' + window.innerWidth + 'px wide, bound ' + bound
    };
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

  check('each dated row pairs its own year with its own credential', function () {
    /* This is the check that stops the original bug from returning. The old
       block drew a timeline whose DOM order was 2004, (none), 2012, 2007,
       2019 — a chronology that was not chronological.

       Bind year to row POSITIONALLY. Gathering every <time> in the ledger
       into one flat list and comparing that list to the expected years is not
       enough: a block with two <time> elements in row 1 and none in row 2
       still yields four datetimes in the right order, so it passes while
       rendering ISO 45001 with no year at all — the exact mispairing this
       check exists to catch. */
    var list = rows();
    if (list.length !== 5) {
      return { ok: false, detail: 'expected 5 rows to inspect, found ' + list.length };
    }
    var bad = [];
    EXPECTED_YEARS.forEach(function (year, i) {
      var name = list[i].querySelector('.cred__name');
      var label = name ? name.textContent.trim().toUpperCase() : '(none)';
      if (label !== EXPECTED_CODES[i]) {
        bad.push('row ' + i + ' is ' + label + ', want ' + EXPECTED_CODES[i]);
      }
      var times = list[i].querySelectorAll('time');
      if (times.length !== 1) {
        bad.push('row ' + i + ' (' + label + ') has ' + times.length + ' <time>, want 1');
        return;
      }
      var dt = times[0].getAttribute('datetime');
      var txt = times[0].textContent.trim();
      if (dt !== year) bad.push('row ' + i + ' (' + label + ') datetime=' + dt + ', want ' + year);
      if (txt !== year) bad.push('row ' + i + ' (' + label + ') text=' + txt + ', want ' + year);
    });

    /* Grade 1 has no year in any source. The dash standing in for one must be
       hidden from assistive technology — an announced "em dash" in the year
       column is worse than an empty cell. Asserting only the absence of
       <time> would let an announced dash through. */
    var last = list[4];
    var lastName = last.querySelector('.cred__name');
    if (!lastName || lastName.textContent.trim().toUpperCase() !== 'GRADE 1') {
      bad.push('last row is not GRADE 1');
    }
    if (last.querySelectorAll('time').length !== 0) bad.push('GRADE 1 row carries a <time>');
    if (!last.querySelector('[aria-hidden="true"]')) bad.push('GRADE 1 dash is not aria-hidden');

    return {
      ok: bad.length === 0,
      detail: bad.join('; ') || '4 rows correctly paired; GRADE 1 undated and hidden'
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
    /* closest() as well as querySelectorAll(): the former excludes the section
       itself and every ancestor, so a .transition landing on #zZFMdo would
       hide the whole block while this check stayed green. */
    var hidden = s.querySelectorAll('.transition').length + (s.closest('.transition') ? 1 : 0);
    var title = s.querySelector('.cred__title');
    if (!title) return { ok: false, detail: 'no .cred__title to measure' };
    /* Walk the ancestors too. getComputedStyle(title).opacity reports the
       title's own value, which stays "1" underneath a faded parent. */
    var faded = '';
    for (var el = title; el && el !== document.body; el = el.parentElement) {
      if (parseFloat(getComputedStyle(el).opacity) < 1) {
        faded = el.id || el.className || el.tagName;
        break;
      }
    }
    return {
      ok: hidden === 0 && faded === '',
      detail: hidden + ' .transition nodes; ' +
              (faded ? 'faded ancestor: ' + faded : 'nothing faded')
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

Expected: **11 of 12 checks FAIL.** These detail strings are **measured** — this harness was run against the unmodified page at 1280x720:

- `section is under its height budget` → FAIL, `1779px (was 1779px) @ 1280px wide, bound 700`
- `all six decorative SVGs are gone` → FAIL, `6 svg elements remain (want 0)`
- `ledger holds exactly five dt/dd pairs` → FAIL, `0 rows, 0 dt, 0 dd (want 5 / 5 / 5)`
- `the five credential codes are present, in ledger order` → FAIL, `expected 5 rows to inspect, found 0`
- `each dated row pairs its own year with its own credential` → FAIL, `expected 5 rows to inspect, found 0`
- `the three stat figures read 1975 / 6 / 7` → FAIL, `0 figures (want exactly 3)`
- `exactly one link, pointing at /credentials/` → FAIL, `0 links []`
- `the CTA reuses the shared button classes` → FAIL, `no link found`
- `heading is an h2 and is the block only heading` → FAIL, `0 h2, 1 other headings`
- `no legacy builder layout elements survive in the block` → FAIL, `37 builder nodes remain (want 0)`
- `block is readable without JavaScript reveals` → FAIL, `no .cred__title to measure`

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

/* width: min(), not max-width + vw padding. box-sizing is border-box from
   main.css's * reset, so viewport-proportional padding on a capped-width box
   eats the cap: the content column peaks around 1115px and then shrinks as the
   viewport grows — 1054px at 1920, 997px at 2560. It would also misalign this
   block against #u7vIc0iRh above, which uses the min() form in sections.css. */
.cred {
  width: min(1224px, 100% - 64px);
  margin-inline: auto;
  padding-block: 88px;
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

/* #6b747c, not a lighter grey. These labels are what make the bare figures
   mean anything, and at 11px they are normal text for contrast purposes:
   4.76:1 on white. The first draft used #8a929a, which is 3.15:1 and fails AA. */
.cred__unit {
  margin-top: 6px;
  font-family: var(--font-secondary, 'Open Sans', sans-serif);
  font-size: 11px;
  letter-spacing: .09em;
  text-transform: uppercase;
  color: #6b747c;
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
  color: #6b747c;
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

/* ---------- one column ----------
   920px, not 768px: the builder's own breakpoint, and where the header swaps
   to its mobile layout. sections.css:193 argues for it by name. Choosing 768
   here would leave a 769-920 band where this block is still two-column while
   the header and the sections around it have already gone mobile. */

@media (max-width: 920px) {
  .cred {
    width: calc(100% - 32px);
    padding-block: 56px;
    grid-template-columns: minmax(0, 1fr);
    gap: 36px;
  }

  .cred__stats {
    gap: 24px;
  }

  .cred__figure {
    font-size: 30px;
  }

  /* Full-width, to match the other two homepage CTAs at this width. */
  .cred__claim .v2-btn {
    display: block;
    margin-top: 28px;
    text-align: center;
  }

  /* One column, so the description gets the full width instead of sharing a
     row with the code. The year stays beside the code, as it already is. */
  .cred__row {
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
    padding: 14px 0;
  }

  /* Still a fixed first track. `auto auto` would size the year column to each
     row's own content, and the Grade 1 row holds an em-dash rather than a
     four-digit year — so its name would start ~16px left of the four above
     it, ragged on exactly the row the fixed track exists to keep in line. */
  .cred__code {
    grid-template-columns: 34px minmax(0, 1fr);
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

# Count RULES mentioning the shared button, not lines. The file's own header
# comment names .v2-btn in prose, so a plain `grep -c v2-btn` returns 3 and
# looks like a violation. It is not. Match selector lines only.
grep -cE '^\s*\.[^{]*v2-btn[^{]*\{' assets/css/credentials.css

# The assertion that actually matters: this file must never define a bare
# .v2-btn or .v2-btn--* rule, which would fork the shared button.
grep -nE '^\s*\.v2-btn' assets/css/credentials.css || echo "ok   shared button not redefined"
```

Expected: fourteen `ok` lines, no `MISSING`; the rule count is `2` — the two `.cred__claim .v2-btn` margin overrides and nothing else; and the last command prints `ok   shared button not redefined` with no line numbers above it.

**If the rule count is higher than 2, or the last command prints any line numbers, the file is forking the shared button; delete those rules before continuing.**

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

**Do not trust the anchor written here. Read the head first.** This anchor has already gone stale once: it originally named `rail.css?v=1` as the last link, and by the time Task 3 came around another session had bumped `sections.css` to `?v=2` and appended a `careers.css` link after `rail.css`.

```bash
python3 -c "
s=open('index.html',encoding='utf-8').read()
i=s.find('</head>')
print(repr(s[i-400:i+7]))"
```

Take the **last** `<link rel=\"stylesheet\" …>` immediately preceding `</head>` from that output and use it as the anchor. As of this writing that is:

- old_string: `<link rel="stylesheet" href="/assets/css/careers.css?v=1"></head>`
- new_string: `<link rel="stylesheet" href="/assets/css/careers.css?v=1"><link rel="stylesheet" href="/assets/css/credentials.css?v=1"></head>`

Two rules that do not change even when the anchor does:

1. **Never anchor on `</head>` alone.** Another session may be inserting there in the same window, and a bare `</head>` anchor gives no protection against landing in the wrong place.
2. **`credentials.css` must come after `sections.css`,** because the CTA inherits `.v2-btn` from it. Appending immediately before `</head>` satisfies this as long as no session inserts `sections.css` later — check the ordering in the output above rather than assuming.

Ordering against `rail.css` and `careers.css` does not matter; those files scope to their own blocks.

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

Expected output. **The removed and added figures are exact; the file totals are not.**

The block is 20,418 bytes and the replacement is 1,930 — both measured by running this exact script against a scratch copy, and the block has not changed since, because no other session touches it. The file totals move every time another session commits: it was 132,288 bytes when this was drafted and 114,421 by the time Task 3 ran.

So expect this shape, with the last two numbers differing:

```
replaced 20418 bytes with 1930; file 114421 -> 95933
```

**`replaced 20418 bytes with 1930` must match exactly.** If the removed figure differs at all, the region matched is not the region measured — stop and investigate rather than committing. The file totals should satisfy `after = before - 20418 + 1930`; check that arithmetic rather than the literal numbers.

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

Expected — the **shape** is measured and fixed; the absolute line counts move as other sessions add lines to the head.

- `git diff --numstat` shows `1  13  index.html`: one line added, thirteen removed.
- `awk 'END{print NR}' index.html` drops by exactly **12** — it was 25→13 when measured on the scratch copy, and 26→14 at the time Task 3 ran, because another session had since added a line to the `<head>`. Check the delta, not the absolutes.
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

Expected: **12 passed, 0 failed.** The height check should report a number near **591px** — that is the measured height of this exact markup and CSS at 1280px wide, taken during planning. A result within ~40px of it is right; a result near 1779 or near 200 means something did not apply.

If `the CTA reuses the shared button classes` fails on `border-radius`, `sections.css` did not load — check the `<link>` from Step 2 is present and ordered after `sections.css`, not before it.

If the button renders with a **transparent background**, the variant was renamed again — see protocol rule 9. That is the exact symptom the rename produced, and it is silent: no console error, correct radius, invisible pill.

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
- Modify: `assets/css/credentials.css` (only if a defect is found — not expected)

- [ ] **Step 1: Check the single-column layout at 390px**

Resize the browser to 390x844 and reload. Paste `tools/credentials-check.js` again.

Expected: **12 passed, 0 failed** — the same as desktop.

The height check already carries a per-breakpoint bound (1100 below 769px, 700 above), so it should pass at roughly **974px** rather than going red. Both figures were measured during planning by rendering this exact markup and CSS in a 390px viewport. Two checks are genuinely width-sensitive and are the reason for re-running:

- `section is under its height budget` — expect roughly **974px** against the 1100 bound. If it reports a number near 1779, the media query is not applying. If it exceeds 1100, do not simply raise the bound; find out what got taller first.
- `no horizontal page overflow` — measured `scrollWidth` 390 against a 390px viewport. This is the check most likely to catch a real defect at this width, so treat any failure as genuine rather than as a threshold to relax.

- [ ] **Step 2: Read the block and confirm it reads in the right order**

```javascript
document.querySelector('#zZFMdo .cred').innerText
```

Expected order: the title, the lede, `1975 Since 6 Countries 7 Sectors`, `View Credentials`, then the five rows beginning `2004 ISO 9001 Quality management system` and ending with the Grade 1 row.

**The Grade 1 row will contain a visible em-dash, and that is correct.** `innerText` does not respect `aria-hidden` — verified in this browser: a `<span aria-hidden="true">` still appears in `innerText`. `aria-hidden` removes a node from the accessibility tree, not from the text layout. Do not treat the dash as a missing attribute and do not go looking for a bug. The check harness already asserts the attribute itself via `[aria-hidden="true"]`, which is the correct test.

To inspect what a screen reader would actually get, look at the attribute directly:

```javascript
document.querySelectorAll('#zZFMdo .cred__row')[4].querySelector('[aria-hidden="true"]')?.outerHTML
```

Expected: `<span class="cred__year" aria-hidden="true">—</span>`.

- [ ] **Step 3: Fix any defect found, in `credentials.css` only**

If Steps 1–2 were clean, skip to Step 4 with no code change.

If overflow was found, the fix goes in the `@media (max-width: 768px)` block already in the file — most likely `.cred__desc { overflow-wrap: anywhere; }`. Do not add a horizontal scroll container, and do not touch any other file.

- [ ] **Step 4: Commit**

If Steps 1–3 were clean, **there is nothing to commit.** Say so plainly in your report rather than manufacturing a change or implying a fix was needed. A task that correctly ends in no commit is a good outcome, not a failure.

Otherwise:

```bash
git add assets/css/credentials.css
git commit -m "fix(credentials): <the specific defect, named>"
```

---

## Done criteria

All four must hold before reporting this complete:

1. `tools/credentials-check.js` reports 12 passed, 0 failed at both 1280x720 and 390x844.
2. `git diff --numstat` for the `index.html` commit shows `1` added line. The removed count is expected to be 13, all of it SVG decoration.
3. `git log --oneline` shows four or five commits from this work — four if Task 4 Step 3 found no defect — and `git show --stat` on each confirms none contains a file outside the ownership list.
4. `tools/home-check.js` output is recorded, with any failures attributed to this work or to another session.

## What this work does not verify

State these plainly in the final report rather than implying full coverage:

- **No screenshot evidence.** The browser preview pane in the authoring session renders a different surface than the one its scripts drive — an injected fixed-position probe was invisible in captures while being fully present in the DOM — so it could not capture this block. If the executing session has a working preview, take a screenshot at 1280x720 and attach it; do not claim a visual pass without one.

  What *was* measured, by rendering the exact markup and CSS from Tasks 2 and 3 in an offscreen 1280px container on the live page: height **591px**, no horizontal overflow, title in Hammersmith One at 40.96px, and the CTA computing to `background rgb(0, 42, 65)` with white text and a 999px radius. At a 390px viewport, one column, **974px**, `scrollWidth` 390, no overflow. So the layout numbers are evidence, not estimates — but nobody has *looked* at it.
- **The colour relationship with the block above** depends on what the PROJECTS session lands. White was chosen precisely so this block is correct either way, but the seam between the two has not been looked at by a human.
- **Copy has not been client-approved.** Every fact is a restatement of something already published on this site (see "Numbers" in the spec), so nothing new is asserted — but "6 countries" and "7 sectors" are now stated as figures rather than buried in prose, which is a change in emphasis worth flagging to the client.
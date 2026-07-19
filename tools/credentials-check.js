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

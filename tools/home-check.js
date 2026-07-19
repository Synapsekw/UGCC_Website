/* UGCC homepage About + Who-are-we layout checks. Dependency-free.
   Usage: paste into the browser console on the homepage, or evaluate via
   automation. Returns {passed, failed, results}. Resize to 1280x720 first.

   Companion to tools/hero-check.js, which covers the hero and the header.
   Both must pass.

   NOT covered by this script (manual verification required):
     - 375px layout for both sections
     - the chat widget overlapping the Explore More button or the last row

   Who-are-we text contrast HAS been computed against the section's own
   background photo rather than assumed white: that wall runs 203-255, and
   rgba(0, 42, 65, .72) is the measured floor that clears 4.5:1 at the dark
   end and under the .07 hover tint. Anything lighter fails somewhere. */
(function () {
  'use strict';

  var ABOUT = '#BCClZ9bf3';
  var WHO = '#u7vIc0iRh';

  /* Numeral, accessible name, and href for all seven rows, in DOM order.
     The hrefs are the ones the builder markup already used - they are
     load-bearing and must survive the rewrite verbatim. */
  var SERVICES = [
    ['01', 'ROADS AND BRIDGES', '/roads-and-bridges-contractor-kuwait'],
    ['02', 'CIVIL INFRASTRUCTURE', '/civil-infrastructure-kuwait'],
    ['03', 'BUILDING CONSTRUCTION', '/building-construction-kuwait'],
    ['04', 'OIL AND GAS', '/oil-and-gas-construction-kuwait'],
    ['05', 'WATER MANAGEMENT', '/water-treatment-plant-kuwait'],
    ['06', 'ELECTRO-MECHANICAL', '/electro-mechanical-contractor-kuwait'],
    ['07', 'MICRO-TUNNELING', '/micro-tunneling-kuwait']
  ];

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

  /* Precondition. Every height assertion below is calibrated to this
     viewport; at any other size they are meaningless rather than wrong,
     which is worse. */
  check('viewport is exactly 1280x720', function () {
    return {
      ok: window.innerWidth === 1280 && window.innerHeight === 720,
      detail: window.innerWidth + 'x' + window.innerHeight
    };
  });

  check('seven services in order, correct names and hrefs', function () {
    var rows = document.querySelectorAll(WHO + ' .wr-row');
    if (rows.length !== 7) return { ok: false, detail: 'found ' + rows.length + ' .wr-row' };
    var bad = [];
    SERVICES.forEach(function (s, i) {
      var row = rows[i];
      var num = row.querySelector('.wr-num');
      var name = row.querySelector('.wr-name');
      var href = row.getAttribute('href');
      if (!num || num.textContent.trim() !== s[0]) {
        bad.push('row' + i + ' num=' + (num ? num.textContent.trim() : 'MISSING'));
      }
      if (!name || name.textContent.trim() !== s[1]) {
        bad.push('row' + i + ' name=' + (name ? name.textContent.trim() : 'MISSING'));
      }
      if (href !== s[2]) bad.push('row' + i + ' href=' + href);
    });
    return { ok: bad.length === 0, detail: bad.join('; ') || '7/7 correct' };
  });

  check('every service row carries a description', function () {
    var rows = document.querySelectorAll(WHO + ' .wr-row');
    var empty = 0;
    Array.prototype.forEach.call(rows, function (r) {
      var d = r.querySelector('.wr-desc');
      if (!d || !d.textContent.trim()) empty++;
    });
    return {
      ok: rows.length === 7 && empty === 0,
      detail: 'rows=' + rows.length + '; empty descriptions=' + empty
    };
  });

  check('About fits in 600px', function () {
    var s = document.querySelector(ABOUT);
    if (!s) return { ok: false, detail: 'section not found' };
    return { ok: s.offsetHeight <= 600, detail: s.offsetHeight + 'px (was 726px)' };
  });

  check('Who-are-we is under 1000px', function () {
    var s = document.querySelector(WHO);
    if (!s) return { ok: false, detail: 'section not found' };
    return { ok: s.offsetHeight < 1000, detail: s.offsetHeight + 'px (was 1394px)' };
  });

  check('one h1, and both new sections use h2', function () {
    var h1 = document.querySelectorAll('h1').length;
    var a = document.querySelector(ABOUT + ' .about-statement');
    var w = document.querySelector(WHO + ' .wr-title');
    var aTag = a ? a.tagName : 'MISSING';
    var wTag = w ? w.tagName : 'MISSING';
    return {
      ok: h1 === 1 && aTag === 'H2' && wTag === 'H2',
      detail: 'h1 count=' + h1 + '; about=' + aTag + '; who=' + wTag
    };
  });

  check('section buttons match the hero button', function () {
    var hero = document.querySelector('#aCqA2TkE7 .hero-btn--primary');
    if (!hero) return { ok: false, detail: 'hero primary button not found' };
    var btns = document.querySelectorAll('.v2-btn');
    if (btns.length !== 2) {
      return { ok: false, detail: 'expected 2 .v2-btn, found ' + btns.length };
    }
    var h = getComputedStyle(hero);
    var props = ['borderTopLeftRadius', 'paddingTop', 'paddingLeft', 'fontSize', 'fontWeight'];
    var bad = [];
    Array.prototype.forEach.call(btns, function (b, i) {
      var s = getComputedStyle(b);
      props.forEach(function (p) {
        if (s[p] !== h[p]) bad.push('btn' + i + '.' + p + '=' + s[p] + ' vs hero ' + h[p]);
      });
    });
    return { ok: bad.length === 0, detail: bad.join('; ') || 'geometry matches on both' };
  });

  /* The keyboard state must be the designed state, not a browser default.
     Asserting the two computed styles match is impossible - you cannot force
     :focus-visible from script reliably - so assert instead that one single
     CSS rule carries both selectors, which is what makes divergence
     impossible in the first place. */
  check('row hover and focus-visible are one rule', function () {
    var found = null;
    var sheets = document.styleSheets;
    for (var i = 0; i < sheets.length && !found; i++) {
      var rules;
      try { rules = sheets[i].cssRules; } catch (e) { continue; }
      if (!rules) continue;
      for (var j = 0; j < rules.length; j++) {
        var sel = rules[j].selectorText;
        if (!sel) continue;
        if (sel.indexOf('.wr-row:hover') !== -1 &&
            sel.indexOf('.wr-row:focus-visible') !== -1) {
          found = rules[j];
          break;
        }
      }
    }
    if (!found) {
      return { ok: false, detail: 'no single rule matches both .wr-row:hover and .wr-row:focus-visible' };
    }
    var bs = found.style.getPropertyValue('box-shadow');
    var bg = found.style.getPropertyValue('background-color');
    return {
      ok: bs.indexOf('inset') !== -1 && bg !== '',
      detail: 'box-shadow=' + bs + '; background-color=' + bg
    };
  });

  /* The reveal must be opt-IN. sections.js adds .v2-reveal before the hiding
     rules bite, so a failure to load the script leaves the content visible
     rather than permanently invisible. Removing the class must therefore
     leave every row fully opaque. */
  check('reveal is opt-in, not opt-out', function () {
    var root = document.documentElement;
    var had = root.classList.contains('v2-reveal');
    root.classList.remove('v2-reveal');
    var rows = document.querySelectorAll(WHO + ' .wr-row');
    var hidden = 0;
    Array.prototype.forEach.call(rows, function (r) {
      if (parseFloat(getComputedStyle(r).opacity) < 1) hidden++;
    });
    if (had) root.classList.add('v2-reveal');
    return {
      ok: rows.length === 7 && hidden === 0,
      detail: 'rows=' + rows.length + '; hidden without .v2-reveal=' + hidden
    };
  });

  /* --v2-red-text (#e8635e) is a lightened salmon chosen for legibility on
     dark video. On this section's near-white ground it falls to roughly
     2.9:1. --v2-red measures 3.3-5.3:1 across this photo's range versus
     1.6-2.6:1 for --v2-red-text, so it is the correct token of the two; the
     eyebrow is 12px/600 letterspaced label text rather than body copy.
     Getting these two backwards is invisible in a screenshot and fails
     accessibility. */
  check('who-are-we uses the light-ground red', function () {
    var eyebrow = document.querySelector(WHO + ' .wr-eyebrow');
    if (!eyebrow) return { ok: false, detail: '.wr-eyebrow not found' };
    var c = getComputedStyle(eyebrow).color.replace(/\s/g, '');
    return { ok: c === 'rgb(212,28,34)', detail: c + ' (want rgb(212,28,34) = #d41c22)' };
  });

  /* The builder styles headings via `.text-box h2 { font-family:
     var(--h2-font-family) }`. Both new sections use headings that sit
     OUTSIDE .text-box, so they silently fall back to the body face at bold
     unless the font is declared explicitly. That regression shipped on the
     hero once, the client caught it, and it shipped again here. Cheap to
     assert, invisible in a screenshot unless you know the two faces. */
  check('new section headings use the builder heading face', function () {
    var targets = [
      [ABOUT + ' .about-statement', 'about'],
      [WHO + ' .wr-title', 'who-are-we']
    ];
    var seen = 0, bad = [];
    targets.forEach(function (t) {
      var el = document.querySelector(t[0]);
      if (!el) return;
      seen++;
      var cs = getComputedStyle(el);
      if (cs.fontFamily.indexOf('Hammersmith One') === -1) {
        bad.push(t[1] + ' font-family=' + cs.fontFamily);
      }
      if (cs.fontWeight !== '400') {
        bad.push(t[1] + ' font-weight=' + cs.fontWeight);
      }
    });
    if (!seen) return { ok: false, detail: 'neither heading present yet' };
    return {
      ok: bad.length === 0,
      detail: bad.join('; ') || seen + '/' + targets.length + ' present, all Hammersmith One 400'
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

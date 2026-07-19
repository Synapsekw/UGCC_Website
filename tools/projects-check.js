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

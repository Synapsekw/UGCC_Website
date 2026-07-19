/* UGCC PROJECTS block checks. Dependency-free.
   Usage: serve the site over HTTP, open the homepage, paste into the console.
   Returns a Promise of {passed, failed, results} — the link checks are async.

   Resize to 1280x720 before running: the height and column-count checks are
   viewport-dependent. Re-run at 800 and 375 for the responsive checks.

   NOT covered (manual verification required):
     - whether each 16:10 centre crop keeps its subject legible
     - whether these are the six projects the client wants to lead with
     - whether contract values belong on the homepage at all
     - whether lazy-loading actually defers the fetch in a real browser.
       The preview pane this harness runs in never fires lazy-load fetches
       and never scrolls, so the image checks force the fetch and therefore
       prove only that the files exist and decode. That the browser WOULD
       have deferred them is covered only indirectly, by the synchronous
       loading="lazy" attribute check. Confirm it once in a normal browser.
     - whether the block's aspect-ratio boxes actually hold layout steady.
       "image frames reserve a 16:10 box" asserts the CSS declaration, not
       a measured shift; getComputedStyle reports the declared value even
       where it has no effect. */
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
  var CARD_COUNT = EXPECTED_HREFS.length;

  function block() { return document.getElementById(SECTION); }
  function cards() {
    return Array.prototype.slice.call(document.querySelectorAll('.v2-proj__item'));
  }

  /* html { scroll-behavior: smooth } is set globally in main.css and v2.css,
     so a bare scrollIntoView() animates and the lazy images do not begin
     fetching until the animation lands. Scroll instantly instead, then poll
     img.complete — which turns true for loaded AND errored images, so this
     converges either way and the naturalWidth assertions below still tell the
     two apart. Bounded, so a hung request costs capMs, not the whole run. */
  function imagesSettled(imgs, capMs) {
    var deadline = Date.now() + capMs;
    return new Promise(function (res) {
      (function poll() {
        if (imgs.every(function (i) { return i.complete; }) || Date.now() > deadline) return res();
        setTimeout(poll, 50);
      })();
    });
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
    var found = Array.prototype.map.call(
      s.querySelectorAll('.grid-gallery, .grid-gallery-grid, .layout-element'),
      function (el) { return el.classList[0] || el.tagName.toLowerCase(); });
    return {
      ok: found.length === 0,
      detail: found.length + ' legacy builder nodes remain' +
              (found.length ? ': ' + found.join(', ') : '')
    };
  });

  check('block holds exactly ' + CARD_COUNT + ' cards', function () {
    var n = cards().length;
    return { ok: n === CARD_COUNT, detail: n + ' cards (want ' + CARD_COUNT + ')' };
  });

  check('block holds exactly ' + (CARD_COUNT + 1) + ' links', function () {
    var s = block();
    if (!s) return { ok: false, detail: 'section missing' };
    var n = s.querySelectorAll('a[href]').length;
    return {
      ok: n === CARD_COUNT + 1,
      detail: n + ' links (want ' + (CARD_COUNT + 1) + ': ' + CARD_COUNT +
              ' cards + all-projects; was 1)'
    };
  });

  check('each card is a single anchor', function () {
    /* Guard first: without it this passes vacuously when no cards exist. */
    var list = cards();
    if (list.length !== CARD_COUNT) {
      return { ok: false, detail: 'expected ' + CARD_COUNT + ' cards to inspect, found ' + list.length };
    }
    var bad = [];
    list.forEach(function (li, i) {
      var n = li.querySelectorAll('a[href]').length;
      if (n !== 1) bad.push('#' + i + ' has ' + n + ' anchors');
    });
    return {
      ok: bad.length === 0,
      detail: bad.join('; ') || CARD_COUNT + '/' + CARD_COUNT + ' single-anchor'
    };
  });

  check('every card image is lazy, described and intrinsically sized', function () {
    var list = cards();
    if (list.length !== CARD_COUNT) {
      return { ok: false, detail: 'expected ' + CARD_COUNT + ' cards to inspect, found ' + list.length };
    }
    var bad = [];
    list.forEach(function (li, i) {
      var img = li.querySelector('img');
      if (!img) { bad.push('#' + i + ' no img'); return; }
      if (!img.getAttribute('alt')) bad.push('#' + i + ' empty alt');
      if (!img.getAttribute('width') || !img.getAttribute('height')) bad.push('#' + i + ' no width/height');
      if (img.getAttribute('loading') !== 'lazy') bad.push('#' + i + ' not lazy');
    });
    return {
      ok: bad.length === 0,
      detail: bad.join('; ') || CARD_COUNT + '/' + CARD_COUNT + ' ok'
    };
  });

  check('image frames reserve a 16:10 box', function () {
    /* This is the mechanism that keeps layout shift at zero as lazy images
       arrive. Assert the mechanism, not a timing-dependent measurement. */
    var list = document.querySelectorAll('.v2-proj__shot');
    if (list.length !== CARD_COUNT) {
      return { ok: false, detail: 'expected ' + CARD_COUNT + ' frames, found ' + list.length };
    }
    var bad = [];
    Array.prototype.forEach.call(list, function (el, i) {
      var ar = getComputedStyle(el).aspectRatio.replace(/\s/g, '');
      if (ar !== '16/10') bad.push('#' + i + ' aspect-ratio=' + ar);
    });
    return {
      ok: bad.length === 0,
      detail: bad.join('; ') || CARD_COUNT + '/' + CARD_COUNT + ' at 16/10'
    };
  });

  check('cards produce exactly the ' + CARD_COUNT + ' expected hrefs', function () {
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
    /* These two thresholds mirror the max-width media queries in
       assets/css/projects.css (1024px and 600px) — change both together.
       The strict > at exactly 1024px is deliberate: a max-width: 1024px query
       matches AT 1024, so 1024 itself belongs to the two-column band. */
    var want = w > 1024 ? 3 : (w > 600 ? 2 : 1);
    return { ok: cols === want, detail: cols + ' columns at ' + w + 'px (want ' + want + ')' };
  });

  check('no horizontal page overflow', function () {
    /* Compare the documentElement against itself. body.scrollWidth excludes
       the vertical scrollbar while window.innerWidth includes it, so that
       pairing cannot see an overflow narrower than the scrollbar. */
    var de = document.documentElement;
    return {
      ok: de.scrollWidth <= de.clientWidth,
      detail: 'documentElement scrollWidth ' + de.scrollWidth +
              ' vs clientWidth ' + de.clientWidth + ' @ ' + window.innerWidth + 'px'
    };
  });

  /* ---------- async section ---------- */

  return Promise.resolve()
    .then(function () {
      var list = cards();
      var imgs = list.map(function (li) { return li.querySelector('img'); })
                     .filter(Boolean);

      /* Belt and braces only — the forced fetch below is the mechanism. Sweep
         every card rather than just the last: at 375px the six stack across
         ~2000px, so centring only the last one strands the first ones exactly
         as centring only the section stranded the last ones. */
      list.forEach(function (li) {
        li.scrollIntoView({ behavior: 'auto', block: 'center' });
      });

      /* Some environments (this browser pane among them) never fire
         loading="lazy" fetches and ignore programmatic scrolling, so relying
         on scroll position to trigger the fetch makes the two checks below
         report failures that say nothing about the markup. Force the fetch.
         Safe: the loading="lazy" attribute assertion is a separate,
         synchronous check that has already run against the unmodified DOM. */
      imgs.forEach(function (img) {
        if (img.complete) return;
        img.loading = 'eager';
        img.src = img.src;          /* re-assign to kick a fetch that never started */
      });

      return imagesSettled(imgs, 5000);
    })
    .then(function () {
      var list = cards();
      if (list.length !== CARD_COUNT) {
        record('every card image actually loaded', false,
          'expected ' + CARD_COUNT + ' cards to inspect, found ' + list.length);
        return;
      }
      var bad = [];
      list.forEach(function (li, i) {
        var img = li.querySelector('img');
        if (!img) { bad.push('#' + i + ' no img'); return; }
        if (!img.naturalWidth) {
          /* currentSrc is '' for an image that never began fetching, which
             would print a nameless "#0  failed to load". */
          var who = (img.currentSrc || img.getAttribute('src') || '').split('/').pop();
          bad.push('#' + i + ' ' + (who || '(no currentSrc)') + ' failed to load');
        }
      });
      record('every card image actually loaded', bad.length === 0,
        bad.join('; ') || CARD_COUNT + '/' + CARD_COUNT + ' decoded');
    })
    .then(function () {
      var list = cards();
      if (list.length !== CARD_COUNT) {
        record('no image is upscaled in its slot', false,
          'expected ' + CARD_COUNT + ' cards to inspect, found ' + list.length);
        return;
      }
      /* Count what was actually measured. Skipping broken images without
         counting lets this report "all sources >= their rendered width" on a
         page where every image 404'd — a green line asserting something it
         never looked at. */
      var bad = [];
      var measured = 0;
      list.forEach(function (li, i) {
        var img = li.querySelector('img');
        if (!img || !img.naturalWidth) return;
        measured++;
        var css = Math.round(img.getBoundingClientRect().width);
        if (img.naturalWidth < css) {
          bad.push('#' + i + ' ' + img.naturalWidth + 'w source in a ' + css + 'px slot');
        }
      });
      record('no image is upscaled in its slot',
        bad.length === 0 && measured === CARD_COUNT,
        bad.join('; ') || measured + '/' + CARD_COUNT + ' sources >= their rendered width');
    })
    .then(function () {
      var hrefs = EXPECTED_HREFS.concat([ALL_HREF]);
      /* GET, like rail-check.js: plenty of static servers answer HEAD with
         405/501, which would redden all of these for reasons unrelated to the
         markup. Judge on r.ok so a 304 from a warm cache is not a failure. */
      return Promise.all(hrefs.map(function (h) {
        return fetch(h, { method: 'GET' })
          .then(function (r) { return { h: h, s: r.status, ok: r.ok }; })
          .catch(function (e) { return { h: h, s: 0, ok: false, why: e.message }; });
      })).then(function (rs) {
        var bad = rs.filter(function (r) { return !r.ok; });
        record('all ' + hrefs.length + ' destinations are reachable',
          bad.length === 0,
          bad.map(function (r) { return r.h + ' -> ' + (r.s || r.why); }).join('; ') ||
            hrefs.length + '/' + hrefs.length + ' reachable');
      });
    })
    /* Terminal catch, before the reporting block: one unexpected throw would
       otherwise discard every result collected so far and print a bare stack. */
    .catch(function (e) {
      record('harness', false, 'threw: ' + e.message);
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

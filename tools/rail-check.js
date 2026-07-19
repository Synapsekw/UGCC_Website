/* UGCC gallery rail checks. Dependency-free.
   Usage: serve the site over HTTP, open the homepage, paste into the console.
   Returns a Promise of {passed, failed, results} — several checks are async.

   Resize to 1280x720 before running the height check.

   ORDERING MATTERS. The synchronous checks run first. Then the link fetches.
   Then the scroll-driving check, which needs the rail untouched. Then the
   user-override check, which permanently disables scroll-driving for the
   page — anything after it would measure a rail that has stopped listening.
   Reload before re-running.

   NOT covered (manual verification required):
     - whether the scroll-to-travel ratio feels right
     - caption legibility over each individual photograph
     - touch drag behaviour on a real device */
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

  var SECTION = 'zOl98u';
  var EXPECTED_HREFS = [
    '/oil-and-gas-completed',
    '/civil-completed',
    '/water-completed',
    '/building-construction-completed',
    '/roads-and-bridges-completed'
  ];

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var branch = reduced ? 'reduce' : 'no-preference';

  function cards() {
    return Array.prototype.slice.call(document.querySelectorAll('.v2-rail__item'));
  }
  function viewport() { return document.querySelector('.v2-rail__viewport'); }

  check('section is under 500px tall', function () {
    var s = document.getElementById(SECTION);
    if (!s) return { ok: false, detail: 'section #' + SECTION + ' missing' };
    var h = Math.round(s.getBoundingClientRect().height);
    if (h === 0) return { ok: false, detail: 'section has zero height — not rendered' };
    return { ok: h < 500, detail: h + 'px (was 1029px)' };
  });

  check('old slideshow is gone', function () {
    var n = document.querySelectorAll('.slideshow, .slide, .slideshow__dots').length;
    return { ok: n === 0, detail: n + ' legacy slideshow nodes remain' };
  });

  check('track holds exactly 15 items and no aria-hidden', function () {
    var all = cards().length;
    var hidden = document.querySelectorAll('.v2-rail [aria-hidden]').length;
    return {
      ok: all === 15 && hidden === 0,
      detail: all + ' items, ' + hidden + ' aria-hidden nodes (want 15 / 0)'
    };
  });

  check('every card has alt text, intrinsic size and lazy loading', function () {
    /* The count guard is load-bearing: without it this check passes vacuously
       on a page with no cards at all, because the loop body never runs. A green
       line in a red harness is worse than a red one. */
    var list = cards();
    if (list.length !== 15) {
      return { ok: false, detail: 'expected 15 cards to inspect, found ' + list.length };
    }
    var bad = [];
    list.forEach(function (li, i) {
      var img = li.querySelector('img');
      if (!img) { bad.push('#' + i + ' no img'); return; }
      if (!img.getAttribute('alt')) bad.push('#' + i + ' empty alt');
      if (!img.getAttribute('width') || !img.getAttribute('height')) bad.push('#' + i + ' no width/height');
      if (img.getAttribute('loading') !== 'lazy') bad.push('#' + i + ' not lazy');
    });
    return { ok: bad.length === 0, detail: bad.join('; ') || '15/15 ok' };
  });

  check('no horizontal page overflow', function () {
    var over = document.body.scrollWidth - window.innerWidth;
    return {
      ok: over <= 0,
      detail: 'body.scrollWidth ' + document.body.scrollWidth +
              ' vs innerWidth ' + window.innerWidth + ' @ ' + window.innerWidth + 'px'
    };
  });

  /* The rail must be a real scrollable region in BOTH media states: under
     reduce it is the entire fallback, and under no-preference it is the
     manual affordance. A transform-based rail would fail this. */
  check('viewport is genuinely horizontally scrollable', function () {
    var vp = viewport();
    if (!vp) return { ok: false, detail: 'rail not implemented' };
    var ovx = getComputedStyle(vp).overflowX;
    var scrollable = vp.scrollWidth > vp.clientWidth;
    return {
      ok: ovx === 'auto' && scrollable,
      detail: '[' + branch + '] overflow-x=' + ovx +
              '; scrollWidth=' + vp.scrollWidth + ' clientWidth=' + vp.clientWidth
    };
  });

  check('cards produce exactly the 5 expected hrefs', function () {
    var hrefs = cards().map(function (li) {
      var a = li.querySelector('a');
      return a ? a.getAttribute('href') : null;
    });
    var distinct = hrefs.filter(function (h, i) { return h && hrefs.indexOf(h) === i; });
    var missing = EXPECTED_HREFS.filter(function (h) { return distinct.indexOf(h) === -1; });
    var extra = distinct.filter(function (h) { return EXPECTED_HREFS.indexOf(h) === -1; });
    return {
      ok: missing.length === 0 && extra.length === 0,
      detail: 'missing[' + missing.join(',') + '] extra[' + extra.join(',') + ']'
    };
  });

  /* ---------- async section ---------- */

  function frames() {
    /* Two frames: one for the driver's rAF to fire, one for it to land. */
    return new Promise(function (res) {
      requestAnimationFrame(function () { requestAnimationFrame(res); });
    });
  }
  function scrollPageTo(y) {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, y);
    return frames();
  }

  var hrefs = cards().map(function (li) {
    var a = li.querySelector('a');
    return a ? a.getAttribute('href') : null;
  });
  var distinct = hrefs.filter(function (h, i) { return h && hrefs.indexOf(h) === i; });

  return Promise.all(distinct.map(function (h) {
    return fetch(h, { method: 'GET' })
      .then(function (r) { return { h: h, ok: r.ok }; })
      .catch(function () { return { h: h, ok: false }; });
  })).then(function (linkResults) {
    var dead = linkResults.filter(function (r) { return !r.ok; }).map(function (r) { return r.h; });
    record('every href resolves',
      dead.length === 0 && linkResults.length > 0,
      dead.length ? 'dead: ' + dead.join(', ') : linkResults.length + '/' + linkResults.length + ' ok');

    var vp = viewport();
    var sec = document.getElementById(SECTION);
    if (!vp || !sec) {
      record('page scroll drives the rail', false, 'rail not implemented');
      record('user interaction takes the rail over', false, 'rail not implemented');
      return;
    }

    var startY = window.scrollY;
    var secTop = sec.getBoundingClientRect().top + window.scrollY;
    var before = Math.max(0, secTop - window.innerHeight - 50);
    var after = secTop + sec.offsetHeight + 50;
    var max = vp.scrollWidth - vp.clientWidth;

    /* The driver traverses only a fraction of the rail per viewport transit, and
       publishes that fraction on .v2-rail so this check asserts the real target
       instead of duplicating the constant. Absent (reduced motion, or no JS at
       all) it defaults to 1 — which is also the correct expectation for the
       no-JS case, where nothing should move at all. */
    var rail = document.querySelector('.v2-rail');
    var ratio = parseFloat((rail && rail.getAttribute('data-travel-ratio')) || '1');
    var want = max * ratio;

    /* scroll-snap quantizes where the rail comes to REST, so the settled
       scrollLeft is the nearest card boundary to what the driver wrote — off by
       up to half a card pitch, in either direction, essentially arbitrarily.
       Asserting an exact target here is not achievable, and making the driver
       write snap-aligned values instead would make the motion visibly stepped.

       Half a pitch is the theoretical bound on that error, and measurement lands
       right at it: -153px against a half-pitch of 156 at 768x1024, leaving 6px of
       margin. That is not a pass worth trusting. 0.6 of a pitch buys real
       headroom and still discriminates — at 768x1024 it accepts [2774, 3148],
       which excludes both a rail that never moved (0) and one that ran to its
       maximum (3948), the two failures that actually matter. */
    var itemEls = document.querySelectorAll('.v2-rail__item');
    var pitch = itemEls.length > 1 ? (itemEls[1].offsetLeft - itemEls[0].offsetLeft) : 0;
    var tol = Math.max(3, pitch * 0.6 + 3);

    /* Where the rail actually came to rest, for the override check below to
       compare against. That check is about whether the rail HELD, not about
       where it was — comparing it to `want` would make it inherit the snap
       error and fail for an unrelated reason. */
    var settled = null;

    return scrollPageTo(before)
      .then(function () {
        var atStart = vp.scrollLeft;
        return scrollPageTo(after).then(function () {
          var atEnd = vp.scrollLeft;
          if (reduced) {
            /* Under reduce the driver must not attach at all. */
            record('page scroll drives the rail',
              atStart === 0 && atEnd === 0,
              '[reduce] scrollLeft stayed ' + atStart + ' -> ' + atEnd + ' (want 0 -> 0)');
          } else {
            /* Both bounds matter. A lower bound alone would pass a rail that
               overshot to max, silently losing the tuning; an upper bound alone
               would pass a rail that never moved. */
            settled = atEnd;
            record('page scroll drives the rail',
              atStart <= 2 && Math.abs(atEnd - want) <= tol && want > 0,
              '[no-preference] scrollLeft ' + Math.round(atStart) + ' -> ' +
                Math.round(atEnd) + ' (want ' + Math.round(want) + ' +/- ' +
                Math.round(tol) + ', ratio ' + ratio + ' of ' + max + ')');
          }
        });
      })
      .then(function () {
        /* MUST BE LAST: this permanently disables scroll-driving. */
        if (reduced) {
          record('user interaction takes the rail over', true,
            '[reduce] not applicable — driver never attached');
          return;
        }
        vp.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        return scrollPageTo(before).then(function () {
          var held = vp.scrollLeft;
          /* `settled > 0` is not redundant. Comparing held to settled alone is
             satisfied vacuously by a rail parked at 0 that never moved and never
             could — 0 holds at 0. Requiring it to have travelled somewhere first
             makes this a statement about yielding rather than about stillness. */
          record('user interaction takes the rail over',
            settled !== null && settled > 0 && Math.abs(held - settled) <= 3,
            'after pointerdown, scrollLeft held at ' + Math.round(held) +
              ' (want ~' + Math.round(settled) + ', where it already was — ' +
              'i.e. page scroll ignored)');
        });
      })
      .then(function () { return scrollPageTo(startY); });
  }).then(function () {
    var passed = results.filter(function (r) { return r.ok; }).length;
    var failed = results.length - passed;
    results.forEach(function (r) {
      console.log((r.ok ? 'PASS  ' : 'FAIL  ') + r.name + (r.detail ? '  [' + r.detail + ']' : ''));
    });
    console.log('\n' + passed + ' passed, ' + failed + ' failed');
    console.log('(reload before re-running — the last check is one-way)');
    return { passed: passed, failed: failed, results: results };
  });
})();

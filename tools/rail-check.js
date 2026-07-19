/* UGCC gallery rail checks. Dependency-free.
   Usage: serve the site over HTTP, open the homepage, paste into the console.
   Returns a Promise of {passed, failed, results} — several checks are async.

   Resize to 1280x720 before running the height check.

   ORDERING MATTERS. The synchronous checks run first, then the link fetches,
   then the drift and pause checks, which need a rail that is still drifting.
   The handover check is LAST because handover is one-way for the life of the
   page — anything after it would measure a rail that has permanently stopped.
   Reload before re-running.

   Several checks sample the track's live transform over a few hundred
   milliseconds rather than reading a CSS declaration, so a run takes a couple
   of seconds. That is deliberate: "an animation is declared" and "the thing is
   actually moving" are different claims, and only the second one matters.

   NOT covered (manual verification required):
     - whether the drift speed feels right
     - caption legibility over each individual photograph
     - touch drag and handover on a real device */
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

  function allCards() {
    return Array.prototype.slice.call(document.querySelectorAll('.v2-rail__item'));
  }
  /* The 15 real ones. The duplicate set is loop padding, not content. */
  function cards() {
    return allCards().filter(function (li) {
      return li.getAttribute('aria-hidden') !== 'true';
    });
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

  /* The seamless -50% loop needs the 15 projects emitted twice. The duplicate
     set must be invisible to assistive tech and unreachable by tabbing, or the
     page announces fifteen projects as thirty. */
  check('track holds 30 items, 15 of them hidden duplicates', function () {
    var all = allCards().length;
    var hidden = allCards().filter(function (li) {
      return li.getAttribute('aria-hidden') === 'true';
    }).length;
    return {
      ok: all === 30 && hidden === 15,
      detail: all + ' items, ' + hidden + ' aria-hidden (want 30 / 15)'
    };
  });

  check('duplicate set is not keyboard reachable', function () {
    var bad = allCards().filter(function (li) {
      if (li.getAttribute('aria-hidden') !== 'true') return false;
      var a = li.querySelector('a');
      return !a || a.getAttribute('tabindex') !== '-1';
    }).length;
    return { ok: bad === 0, detail: bad + ' hidden cards lack tabindex="-1"' };
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
     reduce it is the entire fallback, and under no-preference it is what
     handover converts into. */
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

  check('drift matches the motion preference', function () {
    var track = document.querySelector('.v2-rail__track');
    if (!track) return { ok: false, detail: 'rail not implemented' };
    var name = getComputedStyle(track).animationName;
    if (reduced) {
      return { ok: name === 'none', detail: '[reduce] animation-name=' + name };
    }
    return {
      ok: name === 'v2-rail-drift',
      detail: '[no-preference] animation-name=' + name
    };
  });

  check('pause control is present exactly when it is meaningful', function () {
    var btn = document.querySelector('.v2-rail__toggle');
    if (reduced) {
      /* Nothing drifts, so a pause button would be a control for nothing. */
      var gone = !btn || getComputedStyle(btn).display === 'none';
      return { ok: gone, detail: '[reduce] toggle hidden=' + gone };
    }
    if (!btn) return { ok: false, detail: 'no .v2-rail__toggle — WCAG 2.2.2 needs one' };
    var shown = getComputedStyle(btn).display !== 'none';
    var labelled = !!btn.getAttribute('aria-label');
    var pressable = btn.getAttribute('aria-pressed') !== null;
    return {
      ok: shown && labelled && pressable,
      detail: '[no-preference] visible=' + shown + ' aria-label=' + labelled +
              ' aria-pressed=' + pressable
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
    var rail = document.querySelector('.v2-rail');
    var track = document.querySelector('.v2-rail__track');
    if (!vp || !rail || !track) {
      record('the rail actually drifts', false, 'rail not implemented');
      record('pause toggle stops the drift', false, 'rail not implemented');
      record('interaction hands over to native scrolling', false, 'rail not implemented');
      return;
    }

    function translateX() {
      var t = getComputedStyle(track).transform;
      if (!t || t === 'none') return 0;
      var open = t.indexOf('(');
      var parts = t.slice(open + 1, t.lastIndexOf(')')).split(',');
      return parseFloat(parts[t.slice(0, open) === 'matrix3d' ? 12 : 4]) || 0;
    }
    function wait(ms) {
      return new Promise(function (res) { setTimeout(res, ms); });
    }
    /* Two animation frames: one for the style change to be committed, one for
       it to take effect. */
    function frames() {
      return new Promise(function (res) {
        requestAnimationFrame(function () { requestAnimationFrame(res); });
      });
    }

    /* Sample the live transform twice. Reading the computed style resolves a
       running animation to its current matrix, so a genuinely moving track
       reports two different offsets. This is the difference between asserting
       "an animation is declared" and "the thing is actually moving" — the
       former passes on a track whose animation is paused, zero-duration, or
       overridden by something later in the cascade. */
    var t0 = translateX();
    return wait(400).then(function () {
      var t1 = translateX();
      var moved = Math.abs(t1 - t0);
      if (reduced) {
        record('the rail actually drifts',
          moved < 1,
          '[reduce] translateX ' + Math.round(t0) + ' -> ' + Math.round(t1) +
            ' (want no movement)');
      } else {
        record('the rail actually drifts',
          moved > 1 && t1 < t0,
          '[no-preference] translateX ' + Math.round(t0) + ' -> ' + Math.round(t1) +
            ' over 400ms (want leftward movement)');
      }
    }).then(function () {
      var btn = document.querySelector('.v2-rail__toggle');
      if (reduced) {
        record('pause toggle stops the drift', true,
          '[reduce] not applicable — nothing drifts');
        return;
      }
      if (!btn) {
        record('pause toggle stops the drift', false, 'no toggle');
        return;
      }
      btn.click();
      var pressed = btn.getAttribute('aria-pressed');
      /* Sample only AFTER the pause has actually landed. Reading synchronously
         after the click catches the one frame of drift already committed —
         about 1.3px at desktop rates — which is in-flight motion, not a failure
         to pause. Two frames is the difference between measuring the product
         and measuring our own timing. */
      return frames().then(function () {
      var paused0 = translateX();
      return wait(400).then(function () {
        var paused1 = translateX();
        var state = getComputedStyle(track).animationPlayState;
        btn.click();   /* restore, so the handover check below sees a live rail */
        record('pause toggle stops the drift',
          pressed === 'true' && state === 'paused' && Math.abs(paused1 - paused0) < 0.5,
          'aria-pressed=' + pressed + ' play-state=' + state +
            '; translateX moved ' + (Math.abs(paused1 - paused0)).toFixed(2) +
            'px over 400ms while paused (want 0)');
      });
      });
    }).then(function () {
      /* MUST BE LAST: handover is one-way for the life of the page. */
      if (reduced) {
        record('interaction hands over to native scrolling', true,
          '[reduce] not applicable — nothing to hand over');
        return;
      }
      return wait(300).then(function () {
        /* Measure what the VISITOR sees. Comparing scrollLeft to -translateX
           only checks that two numbers we chose agree; a card's on-screen
           position is the actual claim — that nothing moves at the moment of
           handover. An earlier version of this check compared the numbers and
           passed or failed depending on where the drift happened to be. */
        var probe = allCards()[4];
        var beforeRect = probe.getBoundingClientRect().left;
        var beforeX = translateX();

        vp.dispatchEvent(new Event('pointerdown', { bubbles: true }));

        return frames().then(function () {
          var isManual = rail.getAttribute('data-manual') === 'true';
          var anim = getComputedStyle(track).animationName;
          var shift = Math.abs(probe.getBoundingClientRect().left - beforeRect);
          record('interaction hands over to native scrolling',
            isManual && anim === 'none' && beforeX < -1 && shift <= 2,
            'data-manual=' + isManual + ' animation=' + anim +
              '; card moved ' + shift.toFixed(2) + 'px across handover ' +
              '(want 0; translateX was ' + Math.round(beforeX) +
              ', scrollLeft now ' + Math.round(vp.scrollLeft) + ')');
        });
      });
    });
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

/* UGCC CAREERS block checks. Dependency-free.
   Usage: serve the site over HTTP, open the homepage, paste into the console.
   Returns a Promise of {passed, failed, results} — the link checks are async.

   Resize to 1280x720 before running: the height and layout checks are
   viewport-dependent. Re-run at 800 and 375 for the responsive checks.

   NOT covered (manual verification required):
     - whether the aerial is the right photograph to recruit against
     - whether "we recruit partners in construction" is on-message for HR
     - whether the four figures are the four the client wants to lead with */
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

  var SECTION = 'Jways5TtQ';
  var APPLY_HREF = '/careers';
  var MAIL_HREF = 'mailto:careers@ugcc.com';
  var CREDENTIALS = 'zZFMdo';

  function block() { return document.getElementById(SECTION); }
  function bgImage() {
    var s = block();
    return s ? s.querySelector('.block-background__image') : null;
  }

  function imagesSettled(imgs, capMs) {
    var deadline = Date.now() + capMs;
    return new Promise(function (res) {
      (function poll() {
        if (imgs.every(function (i) { return i.complete; }) || Date.now() > deadline) return res();
        setTimeout(poll, 50);
      })();
    });
  }

  check('block exists and is rendered', function () {
    var s = block();
    if (!s) return { ok: false, detail: 'section #' + SECTION + ' missing' };
    var h = Math.round(s.getBoundingClientRect().height);
    return { ok: h > 0, detail: h + 'px tall @ ' + window.innerWidth + 'px wide' };
  });

  check('builder layout is gone', function () {
    var s = block();
    if (!s) return { ok: false, detail: 'section missing' };
    var found = Array.prototype.map.call(
      s.querySelectorAll('.layout-element, .text-box, .grid-button'),
      function (el) { return el.classList[0] || el.tagName.toLowerCase(); });
    return {
      ok: found.length === 0,
      detail: found.length + ' legacy builder nodes remain' +
              (found.length ? ': ' + found.join(', ') : '')
    };
  });

  /* The builder block was 780px of mostly empty grid. The recompose earns its
     height with the figures bar, so it is allowed to be taller than the copy
     alone needs — but on a laptop the whole band, CTA included, has to fit one
     screen or the statement and the button never appear together.

     Phones get a looser ceiling and not a pass: the headline wraps to six
     lines and the figures go two-up, so one viewport is not achievable, but
     1.4 still catches the block growing without anyone noticing. */
  check('block fits its budget for this viewport', function () {
    var s = block();
    if (!s) return { ok: false, detail: 'section missing' };
    var h = Math.round(s.getBoundingClientRect().height);
    var wide = window.innerWidth > 900;
    var cap = Math.round(window.innerHeight * (wide ? 1 : 1.4));
    return {
      ok: h <= cap,
      detail: h + 'px vs ' + cap + 'px cap (' + (wide ? '1.0' : '1.4') +
              ' x ' + window.innerHeight + 'px viewport)'
    };
  });

  check('heading is an h2, matching the other homepage blocks', function () {
    var s = block();
    if (!s) return { ok: false, detail: 'section missing' };
    var levels = Array.prototype.map.call(s.querySelectorAll('h1,h2,h3,h4,h5,h6'),
      function (el) { return el.tagName.toLowerCase(); });
    return {
      ok: levels.length === 1 && levels[0] === 'h2',
      detail: levels.length ? levels.join(', ') : 'no heading found'
    };
  });

  check('block holds exactly 2 links', function () {
    var s = block();
    if (!s) return { ok: false, detail: 'section missing' };
    var n = s.querySelectorAll('a').length;
    return { ok: n === 2, detail: n + ' links (want 2)' };
  });

  check('CTAs point at the careers page and the careers inbox', function () {
    var s = block();
    if (!s) return { ok: false, detail: 'section missing' };
    var hrefs = Array.prototype.map.call(s.querySelectorAll('a'),
      function (a) { return a.getAttribute('href'); });
    var wantApply = hrefs.indexOf(APPLY_HREF) !== -1;
    var wantMail = hrefs.indexOf(MAIL_HREF) !== -1;
    return { ok: wantApply && wantMail, detail: hrefs.join(', ') || 'none' };
  });

  /* The old copy promised "a look at our open positions". The site has no
     positions listing — the careers page is a download-the-form-and-email
     flow — so that sentence must not come back. */
  check('copy does not promise a job listing the site does not have', function () {
    var s = block();
    if (!s) return { ok: false, detail: 'section missing' };
    var txt = s.textContent.toLowerCase();
    var banned = ['open position', 'vacanc', 'job board', 'browse roles'];
    var hit = banned.filter(function (w) { return txt.indexOf(w) !== -1; });
    return { ok: hit.length === 0, detail: hit.join(', ') || 'clean' };
  });

  /* The band sat two sections below Credentials while restating four of its
     figures — 1975, seven disciplines, Grade I, the ISO numbers — none of
     which it sourced or dated. Credentials is where those claims live; this
     asserts they have not crept back in. Matching is on the numerals rather
     than the labels because it is the figure that duplicates, whatever noun
     a later edit puts under it. */
  check('does not restate the Credentials figures', function () {
    var s = block();
    if (!s) return { ok: false, detail: 'section missing' };
    var cred = document.getElementById(CREDENTIALS);
    if (!cred) return { ok: false, detail: 'credentials block #' + CREDENTIALS + ' missing' };
    var txt = s.textContent;
    var claims = ['1975', 'Grade 1', 'Grade I', 'ISO 9001', 'ISO 14001', 'ISO 45001', 'ISO 17025'];
    var hit = claims.filter(function (c) { return txt.indexOf(c) !== -1; });
    return { ok: hit.length === 0, detail: hit.join(', ') || 'no overlap with #' + CREDENTIALS };
  });

  /* Nothing between the CTA and the end of the block. The figures bar used to
     fill that space; if something else lands there it should be a decision,
     not a leftover. */
  check('CTA is the last thing in the block', function () {
    var s = block();
    if (!s) return { ok: false, detail: 'section missing' };
    var layout = s.querySelector('.v3-careers__layout');
    if (!layout) return { ok: false, detail: 'no .v3-careers__layout' };
    var last = layout.lastElementChild;
    var cta = s.querySelector('.v3-careers__cta');
    if (!cta) return { ok: false, detail: 'no .v3-careers__cta' };
    return {
      ok: last && last.contains(cta),
      detail: last ? 'ends with .' + (last.className || last.tagName) : 'layout is empty'
    };
  });

  check('background carries a scrim, so white text has a ground', function () {
    var s = block();
    if (!s) return { ok: false, detail: 'section missing' };
    var ov = s.querySelector('.v3-careers__scrim');
    if (!ov) return { ok: false, detail: 'no .v3-careers__scrim' };
    var bg = getComputedStyle(ov).backgroundImage;
    return { ok: bg.indexOf('gradient') !== -1, detail: bg.slice(0, 60) };
  });

  check('headline renders white on the scrim', function () {
    var h = document.querySelector('.v3-careers__title');
    if (!h) return { ok: false, detail: 'no .v3-careers__title' };
    var c = getComputedStyle(h).color;
    return { ok: c === 'rgb(255, 255, 255)', detail: c };
  });

  check('nothing overflows the viewport horizontally', function () {
    var s = block();
    if (!s) return { ok: false, detail: 'section missing' };
    var wide = Array.prototype.filter.call(s.querySelectorAll('*'), function (el) {
      var r = el.getBoundingClientRect();
      return r.right > window.innerWidth + 1 || r.left < -1;
    });
    return {
      ok: wide.length === 0,
      detail: wide.length ? wide.length + ' nodes past the edge: ' +
        wide.slice(0, 3).map(function (e) { return e.className || e.tagName; }).join(', ')
        : 'clean @ ' + window.innerWidth + 'px'
    };
  });

  /* ---------- async section ---------- */

  return Promise.resolve()
    .then(function () {
      /* html { scroll-behavior: smooth } is set globally in main.css and
         v3.css, so scrollIntoView() animates and the lazy background does not
         begin fetching until the animation lands. Scroll instantly instead.

         Then force loading="eager". The band's photograph is deliberately
         lazy — it sits ~8000px down the homepage — but headless and
         offscreen renderers routinely never satisfy the intersection that
         triggers a lazy fetch, which would redden the two checks below on a
         perfectly good image. Flipping the attribute makes them assert what
         they are actually for: that the source is reachable, decodes, and is
         large enough for its slot. Whether lazy-loading itself fires is a
         browser behaviour, not something this markup can get wrong. */
      var s = block();
      var img = bgImage();
      if (s) {
        var root = document.documentElement;
        var prev = root.style.scrollBehavior;
        root.style.scrollBehavior = 'auto';
        s.scrollIntoView({ block: 'center' });
        root.style.scrollBehavior = prev;
      }
      if (img && !img.complete) img.loading = 'eager';
      return imagesSettled(img ? [img] : [], 5000);
    })
    .then(function () {
      var img = bgImage();
      if (!img) {
        record('background photograph actually loaded', false, 'no .block-background__image');
        return;
      }
      record('background photograph actually loaded', !!img.naturalWidth,
        img.naturalWidth
          ? (img.currentSrc || img.src).split('/').pop() + ' at ' + img.naturalWidth + 'w'
          : (img.currentSrc || img.src).split('/').pop() + ' failed to load');
    })
    .then(function () {
      var img = bgImage();
      if (!img || !img.naturalWidth) {
        record('background source is not upscaled', false, 'no decoded image to measure');
        return;
      }
      var css = Math.round(img.getBoundingClientRect().width);
      record('background source is not upscaled', img.naturalWidth >= css,
        img.naturalWidth + 'w source in a ' + css + 'px slot');
    })
    .then(function () {
      /* GET, like rail-check.js and projects-check.js: plenty of static
         servers answer HEAD with 405/501. mailto: is not fetchable, so it is
         asserted structurally above rather than over the network. */
      return fetch(APPLY_HREF, { method: 'GET' })
        .then(function (r) { return { s: r.status, ok: r.ok }; })
        .catch(function (e) { return { s: 0, ok: false, why: e.message }; })
        .then(function (r) {
          record('the careers page is reachable', r.ok,
            APPLY_HREF + ' -> ' + (r.s || r.why));
        });
    })
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

/* Business Lines hub — verification harness.
   Paste into the DevTools console on
   /business-lines-construction-services-kuwait/ at 1280x900.

   Asserts the decisions a screenshot cannot show. Every failure here means
   the page disagrees with the spec, not that the assertion is wrong:
   docs/superpowers/specs/2026-07-20-business-lines-hub-design.md */
(function () {
  'use strict';
  var pass = 0, fail = 0, skip = 0;
  function ok(name, cond, detail) {
    if (cond) { pass++; console.log('%c PASS ', 'background:#0a0;color:#fff', name); }
    else { fail++; console.error('FAIL', name, detail === undefined ? '' : detail); }
  }
  /* A skipped assertion is not a passing one. Skips are counted and reported
     separately, because a green total that silently omits checks is worse
     than a red one: the intrinsic-size checks below were gated on a lazy
     image having decoded, so on a fresh load they all vanished from the
     total and "96 passed" looked like full coverage. */
  function skipped(name, why) {
    skip++; console.warn('SKIP', name, '-', why);
  }

  var tiles = document.querySelectorAll('.bl-tile');
  var leads = document.querySelectorAll('.bl-tile--lead');
  var h1s = document.querySelectorAll('h1');

  /* ---- structure ---- */
  ok('exactly one h1', h1s.length === 1, h1s.length);
  ok('h1 is the cover title',
     h1s[0] && h1s[0].classList.contains('as-cover__title'));
  /* 2026-07-20 header unification: the hub joined the About/Facilities
     family form — short caps title + sub-nav rail. This reverses the
     earlier topical-h1 decision (user request). */
  ok('h1 is the family nav label',
     h1s[0] && h1s[0].textContent.trim() === 'Business Lines',
     h1s[0] && h1s[0].textContent.trim());
  var tabs = document.querySelectorAll('.v3-subnav a');
  ok('sub-nav rail has 8 tabs', tabs.length === 8, tabs.length);
  var active = document.querySelectorAll('.v3-subnav a.is-active');
  ok('All is the active tab',
     active.length === 1 && active[0].textContent.trim() === 'All' &&
     active[0].getAttribute('aria-current') === 'page');
  ok('eight tiles', tiles.length === 8, tiles.length);
  ok('two lead tiles', leads.length === 2, leads.length);
  ok('one fill tile', document.querySelectorAll('.bl-tile--all').length === 1);

  var imgs = document.querySelectorAll('.bl-tile__shot img');
  ok('seven tile images', imgs.length === 7, imgs.length);

  /* ---- images ---- */
  Array.prototype.forEach.call(imgs, function (img, i) {
    var tile = img.closest('.bl-tile');
    var name = tile.querySelector('.bl-tile__name');
    var label = name ? name.textContent.trim() : 'tile ' + i;

    ok(label + ': has alt', !!img.getAttribute('alt'));
    ok(label + ': has width and height',
       !!img.getAttribute('width') && !!img.getAttribute('height'));

    /* Attributes must match the real file, or the aspect-ratio box and the
       intrinsic size disagree and the CLS guard stops guarding.

       Every tile image is loading="lazy" and below the fold, so on a fresh
       load naturalWidth is 0 and this cannot be evaluated yet. Report that
       as a SKIP, never as a pass — see the note on `skipped` above. Run
       forceDecode() first (bottom of this file) to make these real. */
    if (img.naturalWidth) {
      ok(label + ': width attr matches the file',
         +img.getAttribute('width') === img.naturalWidth,
         img.getAttribute('width') + ' vs ' + img.naturalWidth);
      ok(label + ': height attr matches the file',
         +img.getAttribute('height') === img.naturalHeight,
         img.getAttribute('height') + ' vs ' + img.naturalHeight);
    } else {
      skipped(label + ': intrinsic size vs attributes', 'image not decoded yet');
      skipped(label + ': intrinsic height vs attribute', 'image not decoded yet');
    }

    /* alt describes the frame; repeating the line name makes the tile
       announce its own label twice. */
    ok(label + ': alt is not the line name',
       !name || img.getAttribute('alt').trim().toLowerCase()
                  !== label.toLowerCase());

    ok(label + ': is lazy', img.getAttribute('loading') === 'lazy');
  });

  /* ---- never hide in CSS and reveal in JS ----

     A bare "opacity !== 0" here is wrong, and false-failed on correct code:
     when the reveal is working, tiles below the fold sit at opacity 0 until
     they are scrolled to. That is the feature, not the bug.

     What must actually hold:
       - with the reveal gate OFF (no JS, or the fail-safe fired), nothing
         may be hidden at all;
       - with it ON, any tile that has ALREADY entered the viewport must
         have revealed. A tile still below the fold is legitimately pending.
     Whether it will ever reveal is a separate, stronger check — the
     SELECTOR assertion below. */
  var revealGateOn = document.documentElement.classList.contains('v3-reveal') &&
                     document.documentElement.classList.contains('hero-motion');

  Array.prototype.forEach.call(tiles, function (tile, i) {
    var hidden = getComputedStyle(tile).opacity === '0';
    var box = tile.getBoundingClientRect();
    var hasEnteredView = box.top < window.innerHeight;

    if (!revealGateOn) {
      /* No gate: opacity is the whole truth, and anything hidden here is
         the permanent-hide bug. */
      ok('tile ' + i + ' is not hidden (reveal gate off)', !hidden,
         'opacity 0 with no reveal gate — this is the permanent-hide bug');
    } else if (hasEnteredView) {
      /* Gate on: assert the STATE CLASS, not opacity. A tile that has just
         revealed still computes opacity 0 for the length of its stagger
         delay (as-fade-up runs `both`, delayed up to --i * 60ms), so an
         opacity check here fails on a perfectly healthy page. `.is-in` is
         the invariant the observer actually establishes. */
      ok('tile ' + i + ' has .is-in after entering the viewport',
         tile.classList.contains('is-in'),
         'top at ' + Math.round(box.top) + ', opacity ' +
         getComputedStyle(tile).opacity);
    } else {
      skipped('tile ' + i + ' reveal', 'still below the fold; scroll to it first');
    }

    ok('tile ' + i + ' has exactly one anchor',
       tile.querySelectorAll('a').length === 1);
  });

  /* The reveal only works if about-suite.js observes .bl-tile. If the
     stylesheet hides it and the script does not observe it, every tile is
     invisible forever in any browser where IntersectionObserver works —
     the script's fail-safe does not save it, because that returns as soon
     as any one target has revealed and .as-head always intersects.

     This must read the script's actual source. Asserting only that the
     <script> tag exists passes even with .bl-tile deleted from SELECTOR,
     which is exactly the bug this is here to catch. */
  var suiteSrc = null;
  Array.prototype.forEach.call(document.scripts, function (s) {
    if (/about-suite\.js/.test(s.src)) suiteSrc = s.src;
  });
  ok('about-suite.js is linked', !!suiteSrc);
  if (suiteSrc) {
    var body = null;
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', suiteSrc, false);
      xhr.send();
      body = xhr.responseText;
    } catch (e) { body = null; }

    if (body === null) {
      skipped('.bl-tile is observed by about-suite.js', 'could not read source');
    } else {
      /* Match inside the selector list, not just anywhere in the file — a
         mention in a comment must not satisfy this. */
      var list = body.match(/var\s+SELECTOR\s*=\s*\[([\s\S]*?)\]/);
      ok('about-suite.js exposes a SELECTOR list', !!list);
      ok('.bl-tile is observed by about-suite.js',
         !!list && /['"]\.bl-tile['"]/.test(list[1]),
         list ? list[1].replace(/\s+/g, ' ').slice(0, 120) : 'no SELECTOR found');
    }
  }

  /* Whatever the stylesheet hides must be in that list. Derive the hidden
     set from the CSS itself so a newly hidden component cannot be forgotten. */
  var hiddenBySheet = [];
  try {
    Array.prototype.forEach.call(document.styleSheets, function (ss) {
      Array.prototype.forEach.call(ss.cssRules || [], function (r) {
        if (r.style && r.style.opacity === '0' &&
            /hero-motion\.v3-reveal/.test(r.selectorText || '')) {
          (r.selectorText || '').split(',').forEach(function (sel) {
            var m = sel.match(/\.([a-z0-9_-]+)\s*$/i);
            if (m) hiddenBySheet.push('.' + m[1]);
          });
        }
      });
    });
  } catch (e) { /* cross-origin sheet; ignore */ }
  ok('every reveal-hidden component is in the script selector list',
     hiddenBySheet.indexOf('.bl-tile') !== -1 || hiddenBySheet.length === 0,
     hiddenBySheet.join(' '));

  /* ---- head pattern ---- */
  var heads = document.querySelectorAll('.as-head');
  Array.prototype.forEach.call(heads, function (h, i) {
    ok('head ' + i + ' has exactly one rule',
       h.querySelectorAll('.as-head__rule').length === 1);
    ok('head ' + i + ' eyebrow is a p, not a heading',
       !!h.querySelector('p.as-head__eyebrow'));
  });

  /* ---- the two reds are not interchangeable ---- */
  var lightEyebrow = document.querySelector('.as-section--light .as-head__eyebrow');
  ok('light-ground eyebrow uses --v3-red',
     !lightEyebrow || getComputedStyle(lightEyebrow).color === 'rgb(212, 28, 34)',
     lightEyebrow && getComputedStyle(lightEyebrow).color);

  var darkEyebrow = document.querySelector('.as-section--navy .as-head__eyebrow');
  ok('navy-ground eyebrow uses --v3-red-text',
     !darkEyebrow || getComputedStyle(darkEyebrow).color === 'rgb(232, 99, 94)',
     darkEyebrow && getComputedStyle(darkEyebrow).color);

  /* ---- type ---- */
  var display = document.querySelectorAll('.bl-tile__name, .bl-tile__figure');
  Array.prototype.forEach.call(display, function (n, i) {
    ok('display type ' + i + ' is Hammersmith One',
       /Hammersmith/.test(getComputedStyle(n).fontFamily),
       getComputedStyle(n).fontFamily);
    ok('display type ' + i + ' is weight 400',
       getComputedStyle(n).fontWeight === '400',
       getComputedStyle(n).fontWeight);
  });

  /* ---- layout ---- */
  ok('no horizontal overflow',
     document.documentElement.scrollWidth <= window.innerWidth,
     document.documentElement.scrollWidth + ' vs ' + window.innerWidth);

  var cover = document.querySelector('.as-cover');
  var title = document.querySelector('.as-cover__title');
  ok('cover title fits inside the cover',
     title.getBoundingClientRect().bottom < cover.getBoundingClientRect().bottom,
     Math.round(title.getBoundingClientRect().bottom) + ' vs ' +
     Math.round(cover.getBoundingClientRect().bottom));

  if (window.innerWidth >= 1200) {
    var tops = [];
    Array.prototype.forEach.call(tiles, function (t) {
      var y = Math.round(t.getBoundingClientRect().top);
      if (tops.indexOf(y) === -1) tops.push(y);
    });
    ok('three rows at desktop', tops.length === 3, tops.length);
    ok('lead tiles are wider than standard',
       leads[0].getBoundingClientRect().width >
       tiles[tiles.length - 1].getBoundingClientRect().width);
  }

  /* ---- links ---- */
  var links = document.querySelectorAll('.bl-tile__link');
  ok('every tile links somewhere',
     Array.prototype.every.call(links, function (a) {
       return a.getAttribute('href');
     }));

  /* Every anchor carries an explicit aria-label, and it must BEGIN with the
     visible name (SC 2.5.3, Label in Name).

     Do not "simplify" this by deleting the aria-label and trusting the
     subtree. Name-from-content includes the <img> alt, and the image
     precedes the text in DOM order, so the computed name would start with
     the photo description and run to ~30 words. Checking textContent here
     instead of aria-label hides that entirely — textContent excludes alt,
     so the broken version passes. That false pass shipped once. */
  Array.prototype.forEach.call(links, function (a) {
    var n = a.querySelector('.bl-tile__name');
    /* The fill tile has no .bl-tile__name; its visible label is the call to
       action. Read it from the DOM — comparing against a string this file
       hardcodes would keep passing after someone reworded the tile. */
    var go = a.querySelector('.bl-tile__go');
    var src = n || go;
    var visible = src ? src.textContent.replace(/[\s→>]+$/, '').trim() : '';
    var label = a.getAttribute('aria-label') || '';
    ok((visible || 'tile') + ': has a visible label in the DOM', !!visible);
    ok((visible || 'tile') + ': has an explicit aria-label', !!label);
    ok((visible || 'tile') + ': aria-label begins with the visible name',
       !!visible && label.toLowerCase().indexOf(visible.toLowerCase()) === 0,
       JSON.stringify(label) + ' vs visible ' + JSON.stringify(visible));
  });

  /* The display text is double-L "Micro-Tunnelling"; the URL keeps the
     single-L spelling it shipped with. Do not "fix" the href. */
  ok('micro-tunnelling href keeps its single-L URL',
     !!document.querySelector('a[href="/micro-tunneling-kuwait"]'));

  console.log('%c ' + pass + ' passed, ' + fail + ' failed, ' + skip + ' skipped ',
    'background:' + (fail ? '#a00' : (skip ? '#a60' : '#0a0')) + ';color:#fff');
  if (skip) {
    console.warn('Run window.blForceDecode() then re-run — ' + skip +
                 ' assertion(s) could not be evaluated. Skips are NOT passes.');
  }
  window.blCheckResult = { pass: pass, fail: fail, skip: skip };
  return window.blCheckResult;
})();

/* Bring the tile images into view so the browser loads them, letting the
   intrinsic-size assertions run. Call this, await it, then re-run.

   Deliberately does NOT set loading="eager": that is the attribute the
   harness checks, and mutating it here would make this helper manufacture
   its own failures. Scrolling is how a real visitor triggers these. */
window.blForceDecode = function () {
  var mosaic = document.querySelector('.bl-mosaic');
  if (mosaic) mosaic.scrollIntoView();
  var imgs = document.querySelectorAll('.bl-tile__shot img');
  return new Promise(function (resolve) {
    var tries = 0;
    (function poll() {
      var done = Array.prototype.filter.call(imgs, function (i) {
        return i.naturalWidth > 0;
      }).length;
      if (done === imgs.length || ++tries > 40) {
        window.scrollTo(0, 0);
        resolve(done + '/' + imgs.length + ' images loaded');
      } else { setTimeout(poll, 50); }
    })();
  });
};

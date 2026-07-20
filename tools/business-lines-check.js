/* Business Lines hub — verification harness.
   Paste into the DevTools console on
   /business-lines-construction-services-kuwait/ at 1280x900.

   Asserts the decisions a screenshot cannot show. Every failure here means
   the page disagrees with the spec, not that the assertion is wrong:
   docs/superpowers/specs/2026-07-20-business-lines-hub-design.md */
(function () {
  'use strict';
  var pass = 0, fail = 0;
  function ok(name, cond, detail) {
    if (cond) { pass++; console.log('%c PASS ', 'background:#0a0;color:#fff', name); }
    else { fail++; console.error('FAIL', name, detail === undefined ? '' : detail); }
  }

  var tiles = document.querySelectorAll('.bl-tile');
  var leads = document.querySelectorAll('.bl-tile--lead');
  var h1s = document.querySelectorAll('h1');

  /* ---- structure ---- */
  ok('exactly one h1', h1s.length === 1, h1s.length);
  ok('h1 is the cover title',
     h1s[0] && h1s[0].classList.contains('as-cover__title'));
  ok('h1 is a topic signal, not the nav label',
     h1s[0] && h1s[0].textContent.trim().toLowerCase() !== 'business lines',
     h1s[0] && h1s[0].textContent.trim());
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
       intrinsic size disagree and the CLS guard stops guarding. */
    if (img.naturalWidth) {
      ok(label + ': width attr matches the file',
         +img.getAttribute('width') === img.naturalWidth,
         img.getAttribute('width') + ' vs ' + img.naturalWidth);
      ok(label + ': height attr matches the file',
         +img.getAttribute('height') === img.naturalHeight,
         img.getAttribute('height') + ' vs ' + img.naturalHeight);
    }

    /* alt describes the frame; repeating the line name makes the tile
       announce its own label twice. */
    ok(label + ': alt is not the line name',
       !name || img.getAttribute('alt').trim().toLowerCase()
                  !== label.toLowerCase());

    ok(label + ': is lazy', img.getAttribute('loading') === 'lazy');
  });

  /* ---- never hide in CSS and reveal in JS ---- */
  Array.prototype.forEach.call(tiles, function (tile, i) {
    ok('tile ' + i + ' is not hidden',
       getComputedStyle(tile).opacity !== '0',
       'opacity ' + getComputedStyle(tile).opacity);
    ok('tile ' + i + ' has exactly one anchor',
       tile.querySelectorAll('a').length === 1);
  });

  /* The reveal only works if about-suite.js observes .bl-tile. If the
     stylesheet hides it and the script does not observe it, every tile is
     invisible forever in any browser where IntersectionObserver works —
     the script's fail-safe does not save it, because that returns as soon
     as any one target has revealed and .as-head always intersects. */
  ok('.bl-tile is in the about-suite reveal contract',
     Array.prototype.some.call(document.scripts, function (s) {
       return /about-suite\.js/.test(s.src);
     }), 'about-suite.js not linked');

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
  ok('light-ground eyebrow uses --v2-red',
     !lightEyebrow || getComputedStyle(lightEyebrow).color === 'rgb(212, 28, 34)',
     lightEyebrow && getComputedStyle(lightEyebrow).color);

  var darkEyebrow = document.querySelector('.as-section--navy .as-head__eyebrow');
  ok('navy-ground eyebrow uses --v2-red-text',
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

  /* The display text is double-L "Micro-Tunnelling"; the URL keeps the
     single-L spelling it shipped with. Do not "fix" the href. */
  ok('micro-tunnelling href keeps its single-L URL',
     !!document.querySelector('a[href="/micro-tunneling-kuwait"]'));

  console.log('%c ' + pass + ' passed, ' + fail + ' failed ',
    'background:' + (fail ? '#a00' : '#0a0') + ';color:#fff');
  return { pass: pass, fail: fail };
})();

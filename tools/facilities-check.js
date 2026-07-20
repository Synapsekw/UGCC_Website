/* UGCC facilities-family check. Dependency-free console IIFE, ES5.
   Run on any of the four facilities pages:
     fetch('/tools/facilities-check.js').then(function(r){return r.text()}).then(eval)
   Asserts the invisible decisions of
   docs/superpowers/specs/2026-07-20-facilities-family-design.md. */
(function () {
  'use strict';

  var path = location.pathname;
  var PAGE =
    path.indexOf('facilities-overview') !== -1 ? 'hub' :
    path.indexOf('/plants') === 0 ? 'plants' :
    path.indexOf('/laboratories') === 0 ? 'labs' :
    path.indexOf('/equipment') === 0 ? 'equipment' : null;
  if (!PAGE) { console.error('facilities-check: not a facilities page'); return; }

  /* djb2 of the page's locked copy, recorded after the pages were built and
     visually signed off. null = not recorded yet (harness warns instead of
     failing, so the harness can be written before the pages). */
  var COPY = { hub: null, plants: null, labs: null, equipment: null };

  var failures = [], passes = 0;
  function ok(name, cond, detail) {
    if (cond) { passes += 1; }
    else { failures.push(name + (detail ? ' — ' + detail : '')); }
  }

  /* 1 — cover contract (kit §1; the data-v attribute is what makes main.css
     reserve the header row — its absence is invisible in a screenshot) */
  var cover = document.querySelector('.as-cover');
  ok('cover: present', !!cover);
  if (cover) {
    ok('cover: data-v-3ffce944', cover.hasAttribute('data-v-3ffce944'));
    ok('cover: height 524', Math.round(cover.getBoundingClientRect().height) === 524,
       'got ' + Math.round(cover.getBoundingClientRect().height));
    var media = cover.querySelector('.as-cover__media');
    ok('cover: media alt non-empty', !!(media && (media.getAttribute('alt') || '').length));
    ok('cover: media width+height attrs',
       !!(media && media.getAttribute('width') && media.getAttribute('height')));
  }
  ok('one h1 per page', document.querySelectorAll('h1').length === 1,
     'got ' + document.querySelectorAll('h1').length);

  /* 2 — the shipped subnav, kept, with the a11y addition */
  var subLinks = document.querySelectorAll('.v2-subnav a');
  ok('subnav: 4 links', subLinks.length === 4, 'got ' + subLinks.length);
  var LABELS = ['Facilities', 'Plants', 'Laboratories', 'Equipment'];
  Array.prototype.forEach.call(subLinks, function (a, i) {
    ok('subnav: label ' + (i + 1) + ' = ' + LABELS[i],
       a.textContent.replace(/\s+/g, ' ').trim() === LABELS[i],
       'got "' + a.textContent.trim() + '"');
  });
  var actives = document.querySelectorAll('.v2-subnav a.is-active');
  ok('subnav: exactly one .is-active', actives.length === 1);
  ok('subnav: .is-active carries aria-current="page"',
     actives.length === 1 && actives[0].getAttribute('aria-current') === 'page');

  /* 3 — hub directory */
  if (PAGE === 'hub') {
    var tiles = document.querySelectorAll('.fx-tile');
    ok('hub: 4 tiles', tiles.length === 4, 'got ' + tiles.length);
    var anchors = document.querySelectorAll('.fx-tile > a');
    ok('hub: exactly 3 tile anchors', anchors.length === 3, 'got ' + anchors.length);
    Array.prototype.forEach.call(anchors, function (a) {
      var label = a.querySelector('.fx-tile__label');
      var num = label && label.querySelector('.fx-tile__num');
      var visible = label
        ? label.textContent.replace(num ? num.textContent : '', '').replace(/\s+/g, ' ').trim()
        : '';
      var acc = a.getAttribute('aria-label') || '';
      ok('hub: aria-label starts with visible name (' + visible + ')',
         acc.indexOf(visible) === 0, 'aria-label "' + acc + '"');
      ok('hub: tile number aria-hidden (' + visible + ')',
         !num || num.getAttribute('aria-hidden') === 'true');
    });
    if (tiles.length === 4) {
      ok('hub: WORKSHOPS tile has no link', !tiles[3].querySelector('a'));
    }
  }

  /* 4 — galleries: count, intrinsic sizes, and the per-page no-repeat rule */
  var GAL = { hub: 0, plants: 4, labs: 5, equipment: 12 };
  var cards = document.querySelectorAll('.fx-gallery > li');
  ok('gallery: ' + GAL[PAGE] + ' cards', cards.length === GAL[PAGE], 'got ' + cards.length);
  Array.prototype.forEach.call(cards, function (li, i) {
    var img = li.querySelector('img');
    ok('gallery: card ' + (i + 1) + ' img with width+height+alt',
       !!(img && img.getAttribute('width') && img.getAttribute('height') &&
          (img.getAttribute('alt') || '').length));
  });
  /* content photographs only — the builder header renders its logo twice
     (desktop + mobile layouts), which is chrome, not a photo placement */
  var seen = {}, dup = null;
  Array.prototype.forEach.call(document.querySelectorAll('.as-cover img, .as-section img'), function (img) {
    var src = img.getAttribute('src');
    if (seen[src]) dup = src; else seen[src] = true;
  });
  ok('no photo rendered twice on the page', !dup, dup || '');

  /* 5 — the two reds: eyebrows on light grounds use --v2-red (#d41c22).
     Getting this backwards is invisible in a screenshot. */
  Array.prototype.forEach.call(
    document.querySelectorAll('.as-section--light .as-head__eyebrow, .as-section--tint .as-head__eyebrow'),
    function (el) {
      ok('eyebrow on light ground is --v2-red',
         getComputedStyle(el).color === 'rgb(212, 28, 34)',
         getComputedStyle(el).color);
    });

  /* 6 — progressive enhancement: without both gate classes on <html>,
     nothing may compute to opacity 0 (a failed script must degrade to a
     visible page, never a blank one) */
  var root = document.documentElement;
  var gated = root.classList.contains('hero-motion') && root.classList.contains('v2-reveal');
  if (!gated) {
    var hiddenEl = null;
    Array.prototype.forEach.call(
      document.querySelectorAll('.as-head, .as-prose, .as-quote, .fx-tile, .fx-type, .fx-gallery li'),
      function (el) {
        if (getComputedStyle(el).opacity === '0') hiddenEl = el.className;
      });
    ok('nothing hidden without the reveal gate', !hiddenEl, hiddenEl || '');
  }

  /* 7 — copy freeze. djb2 over the locked regions' normalised text. */
  function djb2(s) {
    var h = 5381, i;
    for (i = 0; i < s.length; i++) { h = (((h << 5) + h) + s.charCodeAt(i)) >>> 0; }
    return h.toString(16);
  }
  var lockSel = ['.as-cover__title', '.as-cover__lede', '.as-head__title',
    '.as-head__lede', '.as-head__eyebrow', '.as-prose', '.fx-tile__desc',
    '.fx-type', '.v2-table', '.as-quote__text'].join(',');
  var parts = [];
  Array.prototype.forEach.call(document.querySelectorAll(lockSel), function (el) {
    parts.push(el.textContent.replace(/\s+/g, ' ').trim());
  });
  var hash = djb2(parts.join('|'));
  if (COPY[PAGE]) {
    ok('copy freeze', hash === COPY[PAGE], 'got ' + hash + ', want ' + COPY[PAGE]);
  } else {
    console.warn('facilities-check: copy hash for ' + PAGE + ' is ' + hash +
      ' — record it in COPY once the page is signed off.');
  }

  /* 8 — tables survived verbatim (row counts; content is covered by #7) */
  var ROWS = { hub: 5, plants: 6, labs: 7, equipment: 7 };
  var rows = document.querySelectorAll('.v2-table tbody tr');
  ok('table: ' + ROWS[PAGE] + ' body rows', rows.length === ROWS[PAGE], 'got ' + rows.length);

  var summary = 'facilities-check [' + PAGE + ']: ' + passes + ' passed, ' +
    failures.length + ' failed';
  if (failures.length) {
    console.error(summary);
    failures.forEach(function (f) { console.error('  FAIL ' + f); });
  } else {
    console.log(summary);
  }
  window.__facilitiesCheck = { page: PAGE, passes: passes, failures: failures };
}());

/* UGCC offices block checks (#zrby1M). Dependency-free.
   Usage: serve the site over HTTP, open the homepage, paste into the console.
   Returns {passed, failed, results} synchronously.

   VIEWPORT MATTERS. Checks 1 and 9 are width-dependent. Run the whole file
   three times — at 375, 920 and 1280 CSS pixels wide — and confirm all three
   runs are green. The harness prints the width it observed so a run at the
   wrong size is obvious rather than silently passing.

   Check 1 exists because this block shipped with `block--mobile-hidden`,
   which main.css resolves to display:none at width<=920px. Every phone
   visitor saw nothing here. That must never come back.

   NOT covered (manual verification required):
     - whether the map composition reads well against the blocks above/below
     - whether the red/blue/plate tiers survive a low-quality external monitor
     - focus ring visibility on the navy ground on a real device */
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

  function section() { return document.getElementById('zrby1M'); }
  function vw() { return document.documentElement.clientWidth; }

  var EXPECTED_TEL = ['tel:+96522054250', 'tel:+966112611688', 'tel:+96824548660'];
  var EXPECTED_MAIL = 'mailto:ugcc@ugcc.com';
  var SIX = ['Kuwait', 'Saudi Arabia', 'Oman', 'Iraq', 'India', 'Malawi'];

  check('1. section renders (non-zero height, not display:none)', function () {
    var s = section();
    if (!s) return { ok: false, detail: 'section #zrby1M missing' };
    var h = Math.round(s.getBoundingClientRect().height);
    var d = getComputedStyle(s).display;
    return { ok: h > 0 && d !== 'none', detail: 'viewport ' + vw() + 'px, height ' + h + 'px, display ' + d };
  });

  check('2. block--mobile-hidden is gone', function () {
    var s = section();
    var has = s.classList.contains('block--mobile-hidden');
    return { ok: !has, detail: 'class="' + s.className + '"' };
  });

  check('3. three tel: links, correct numbers', function () {
    var got = [].map.call(section().querySelectorAll('a[href^="tel:"]'), function (a) {
      return a.getAttribute('href');
    });
    var ok = got.length === 3 && EXPECTED_TEL.every(function (t) { return got.indexOf(t) !== -1; });
    return { ok: ok, detail: got.join(' ') || 'none found' };
  });

  check('4. one mailto: link, correct address', function () {
    var got = [].map.call(section().querySelectorAll('a[href^="mailto:"]'), function (a) {
      return a.getAttribute('href');
    });
    return { ok: got.length === 1 && got[0] === EXPECTED_MAIL, detail: got.join(' ') || 'none found' };
  });

  check('5. three offices, each with a non-empty <address>', function () {
    var offices = section().querySelectorAll('.off__office');
    if (offices.length !== 3) return { ok: false, detail: offices.length + ' .off__office nodes' };
    var empty = [].filter.call(offices, function (o) {
      var a = o.querySelector('address');
      return !a || a.textContent.trim().length < 10;
    }).length;
    return { ok: empty === 0, detail: empty + ' offices with a missing or stub address' };
  });

  check('6. heading is live text and no <img> remains', function () {
    var s = section();
    var h = s.querySelector('.off__title');
    var imgs = s.querySelectorAll('img').length;
    var text = h ? h.textContent.trim() : '';
    return {
      ok: !!h && /offices/i.test(text) && imgs === 0,
      detail: 'title "' + text + '", ' + imgs + ' img elements'
    };
  });

  check('7. map has 3 office paths, 3 operations paths, 3 pins, 3 labels', function () {
    var s = section();
    var svg = s.querySelector('svg.off__map');
    if (!svg) return { ok: false, detail: 'no svg.off__map' };
    /* One <path> per country. A country's islands and exclaves are extra
       M...Z subpaths inside that one `d`, not extra elements — so India's
       Andaman and Nicobar groups must not inflate this count. */
    var hq = svg.querySelectorAll('.off__map-hq path').length;
    var op = svg.querySelectorAll('.off__map-op path').length;
    var pins = svg.querySelectorAll('.off__pin').length;
    var labels = svg.querySelectorAll('.off__map-label').length;
    var ctx = svg.querySelectorAll('.off__map-ctx path').length;
    return {
      ok: hq === 3 && op === 3 && pins === 3 && labels === 3 && ctx > 20,
      detail: hq + ' office, ' + op + ' operations, ' + ctx + ' context, ' + pins + ' pins, ' + labels + ' labels'
    };
  });

  check('7b. map <title> names all six countries', function () {
    var t = section().querySelector('svg.off__map title');
    if (!t) return { ok: false, detail: 'no <title> in the svg' };
    var txt = t.textContent;
    var missing = SIX.filter(function (c) { return txt.indexOf(c) === -1; });
    return { ok: missing.length === 0, detail: missing.length ? 'missing: ' + missing.join(', ') : txt.length + ' chars' };
  });

  check('8. nothing in the block depends on a JS reveal', function () {
    /* The block must not opt into .transition — those start at opacity 0 and
       depend on assets/js/main.js. closest() as well as querySelectorAll():
       the former excludes the section itself and every ancestor, so a
       .transition landing on #zrby1M would hide the whole block while this
       check stayed green. */
    var s = section();
    var hidden = s.querySelectorAll('.transition').length + (s.closest('.transition') ? 1 : 0);
    var title = s.querySelector('.off__title');
    if (!title) return { ok: false, detail: 'no .off__title to measure' };
    var faded = '';
    for (var el = title; el && el !== document.body; el = el.parentElement) {
      if (parseFloat(getComputedStyle(el).opacity) < 1) {
        faded = el.id || el.className || el.tagName;
        break;
      }
    }
    return {
      ok: hidden === 0 && faded === '',
      detail: hidden + ' .transition nodes; ' + (faded ? 'faded ancestor: ' + faded : 'nothing faded')
    };
  });

  check('9. no descendant overflows the viewport', function () {
    var limit = vw();
    var over = [].filter.call(section().querySelectorAll('*'), function (e) {
      var r = e.getBoundingClientRect();
      return r.width > 0 && (r.right > limit + 1 || r.left < -1);
    });
    var names = over.slice(0, 3).map(function (e) {
      return (typeof e.className === 'string' && e.className) || e.tagName;
    });
    return { ok: over.length === 0, detail: 'viewport ' + limit + 'px, ' + over.length + ' overflowing' + (names.length ? ': ' + names.join(', ') : '') };
  });

  check('10. the ADRESS typo is gone', function () {
    var txt = section().textContent;
    return { ok: txt.indexOf('ADRESS') === -1, detail: txt.indexOf('ADRESS') === -1 ? 'clean' : 'still present' };
  });

  var passed = results.filter(function (r) { return r.ok; }).length;
  var failed = results.length - passed;
  results.forEach(function (r) {
    console.log((r.ok ? 'PASS  ' : 'FAIL  ') + r.name + (r.detail ? '  [' + r.detail + ']' : ''));
  });
  console.log('\n' + passed + ' passed, ' + failed + ' failed  (viewport ' + vw() + 'px)');
  return { passed: passed, failed: failed, results: results };
})();

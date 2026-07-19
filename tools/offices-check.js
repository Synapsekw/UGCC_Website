/* UGCC offices block checks (#zrby1M). Dependency-free.
   Usage: serve the site over HTTP, open the homepage, paste into the console.
   Returns {passed, failed, results} synchronously.

   VIEWPORT MATTERS. Checks 1, 9 and 9b are width-dependent. Run the whole
   file three times — at 375, 920 and 1280 CSS pixels wide — and confirm all
   three runs are green. The harness prints the width it observed so a run at
   the wrong size is obvious rather than silently passing.

   Check 1 exists because this block shipped with `block--mobile-hidden`,
   which main.css resolves to display:none at width<=920px. Every phone
   visitor saw nothing here. That must never come back.

   Check 9 is vacuous while check 1 is red: it filters on r.width > 0, and a
   display:none block has no boxes to overflow with. A green 9 means nothing
   until 1 is green too. That is accepted, not an oversight.

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
  function digits(s) { return String(s == null ? '' : s).replace(/[^0-9]/g, ''); }
  function textOf(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }

  /* Contact details are bound to their office POSITIONALLY, in DOM order.
     Collecting every tel: in the section into one flat list and set-comparing
     it against the expected three is not enough: a block with all three
     numbers inside the Kuwait card and none in the other two still yields the
     right three hrefs, so it passes while telling a caller in Muscat to dial
     Kuwait City. Same reasoning as the ledger rows in credentials-check.js. */
  var OFFICES = [
    { name: 'Kuwait', tel: 'tel:+96522054250', mail: 'mailto:ugcc@ugcc.com' },
    { name: 'Saudi Arabia', tel: 'tel:+966112611688', mail: null },
    { name: 'Oman', tel: 'tel:+96824548660', mail: null }
  ];
  var SIX = ['Kuwait', 'Saudi Arabia', 'Oman', 'Iraq', 'India', 'Malawi'];
  var OPERATIONS = ['Iraq', 'India', 'Malawi'];

  check('1. section renders (non-zero height, not display:none)', function () {
    var s = section();
    if (!s) return { ok: false, detail: 'section #zrby1M missing' };
    var h = Math.round(s.getBoundingClientRect().height);
    var d = getComputedStyle(s).display;
    return { ok: h > 0 && d !== 'none', detail: 'viewport ' + vw() + 'px, height ' + h + 'px, display ' + d };
  });

  check('2. block--mobile-hidden is gone', function () {
    var s = section();
    if (!s) return { ok: false, detail: 'section missing' };
    var has = s.classList.contains('block--mobile-hidden');
    return { ok: !has, detail: 'class="' + s.className + '"' };
  });

  check('3. each office is the country it claims, and dials the digits it shows', function () {
    var s = section();
    if (!s) return { ok: false, detail: 'section missing' };
    var offices = s.querySelectorAll('.off__office');
    if (offices.length !== 3) return { ok: false, detail: 'expected 3 .off__office nodes, found ' + offices.length };
    var bad = [];
    OFFICES.forEach(function (want, i) {
      /* Bind the LABEL to the position first, exactly as credentials-check.js
         checks a row's name before trusting its <time>. Without this, a card
         headed "Oman" carrying Kuwait's address and Kuwait's number satisfies
         every other assertion here — the contact details would be internally
         consistent and still send a caller in Muscat to Kuwait City.

         Contains rather than equals: the heading also carries the "Head
         office" badge span. Contains rather than starts-with, because
         whether that badge precedes or follows the country name is a free
         choice in the markup and not something this harness should pin. The
         exclusivity test below is what actually closes the mislabelling
         hole — the name of another office must not appear. */
      var country = offices[i].querySelector('.off__country');
      var label = textOf(country);
      if (!country) {
        bad.push('office ' + i + ' has no .off__country (want ' + want.name + ')');
      } else if (label.indexOf(want.name) === -1) {
        bad.push('office ' + i + ' is headed "' + label + '", want ' + want.name);
      } else {
        var strays = OFFICES.filter(function (o) {
          return o.name !== want.name && label.indexOf(o.name) !== -1;
        }).map(function (o) { return o.name; });
        if (strays.length) {
          bad.push('office ' + i + ' (' + want.name + ') also names ' + strays.join(' and ') + ' in "' + label + '"');
        }
      }
      var links = offices[i].querySelectorAll('a[href^="tel:"]');
      if (links.length !== 1) {
        bad.push('office ' + i + ' (' + want.name + ') has ' + links.length + ' tel: links, want 1');
        return;
      }
      var href = links[0].getAttribute('href');
      if (href !== want.tel) {
        bad.push('office ' + i + ' (' + want.name + ') dials ' + href + ', want ' + want.tel);
      }
      var shown = textOf(links[0]);
      if (digits(shown) !== digits(href)) {
        bad.push('office ' + i + ' (' + want.name + ') shows "' + shown + '" but dials ' + href);
      }
    });
    return { ok: bad.length === 0, detail: bad.length ? bad.join('; ') : 'all three offices paired correctly' };
  });

  check('4. only the Kuwait office carries the mailto:', function () {
    var s = section();
    if (!s) return { ok: false, detail: 'section missing' };
    var offices = s.querySelectorAll('.off__office');
    if (offices.length !== 3) return { ok: false, detail: 'expected 3 .off__office nodes, found ' + offices.length };
    var bad = [];
    OFFICES.forEach(function (want, i) {
      var links = offices[i].querySelectorAll('a[href^="mailto:"]');
      var n = want.mail ? 1 : 0;
      if (links.length !== n) {
        bad.push('office ' + i + ' (' + want.name + ') has ' + links.length + ' mailto: links, want ' + n);
        return;
      }
      if (want.mail && links[0].getAttribute('href') !== want.mail) {
        bad.push('office ' + i + ' (' + want.name + ') mails ' + links[0].getAttribute('href') + ', want ' + want.mail);
      }
    });
    return { ok: bad.length === 0, detail: bad.length ? bad.join('; ') : 'one mailto, on Kuwait' };
  });

  check('5. three offices, each with a non-empty <address>', function () {
    var s = section();
    if (!s) return { ok: false, detail: 'section missing' };
    var offices = s.querySelectorAll('.off__office');
    if (offices.length !== 3) return { ok: false, detail: offices.length + ' .off__office nodes' };
    var empty = [].filter.call(offices, function (o) {
      var a = o.querySelector('address');
      return !a || a.textContent.trim().length < 10;
    }).length;
    return { ok: empty === 0, detail: empty + ' offices with a missing or stub address' };
  });

  check('6. heading is a live-text <h2> and no <img> remains', function () {
    var s = section();
    if (!s) return { ok: false, detail: 'section missing' };
    var h = s.querySelector('.off__title');
    var imgs = s.querySelectorAll('img').length;
    var text = textOf(h);
    var tag = h ? h.tagName : '(none)';
    return {
      ok: !!h && tag === 'H2' && /offices/i.test(text) && imgs === 0,
      detail: '<' + tag.toLowerCase() + '> "' + text + '", ' + imgs + ' img elements'
    };
  });

  check('7. map has 3 office paths, 3 operations paths, >20 context paths, 3 pins, 3 labels', function () {
    var s = section();
    if (!s) return { ok: false, detail: 'section missing' };
    var svg = s.querySelector('svg.off__map');
    if (!svg) return { ok: false, detail: 'no svg.off__map' };
    /* One <path> per country. A country's islands and exclaves are extra
       M...Z subpaths inside that one `d`, not extra elements — so India's
       Andaman and Nicobar groups must not inflate this count.

       Both emissions are accepted: the tier class on a wrapping <g>, or the
       tier class on each <path> directly. Requiring only the former would
       false-fail a perfectly correct map. */
    function tier(cls) {
      return svg.querySelectorAll('.' + cls + ' path, path.' + cls).length;
    }
    var hq = tier('off__map-hq');
    var op = tier('off__map-op');
    var ctx = tier('off__map-ctx');
    var pins = svg.querySelectorAll('.off__pin').length;
    var labels = svg.querySelectorAll('.off__map-label').length;
    return {
      ok: hq === 3 && op === 3 && pins === 3 && labels === 3 && ctx > 20,
      detail: hq + ' office, ' + op + ' operations, ' + ctx + ' context, ' + pins + ' pins, ' + labels + ' labels'
    };
  });

  check('7b. map is labelled: role="img", aria-labelledby wired to a <title> naming all six countries', function () {
    var s = section();
    if (!s) return { ok: false, detail: 'section missing' };
    var svg = s.querySelector('svg.off__map');
    if (!svg) return { ok: false, detail: 'no svg.off__map' };
    var t = svg.querySelector('title');
    if (!t) return { ok: false, detail: 'no <title> in the svg' };
    var bad = [];
    /* Without role="img" the accessible name may never be announced, and this
       map is the block's only visual statement of reach. */
    var role = svg.getAttribute('role');
    if (role !== 'img') bad.push('role="' + (role || '') + '", want "img"');
    var labelledby = svg.getAttribute('aria-labelledby') || '';
    var titleId = t.getAttribute('id') || '';
    if (!labelledby) bad.push('aria-labelledby is empty');
    else if (!titleId) bad.push('<title> has no id for aria-labelledby="' + labelledby + '" to point at');
    else if (labelledby !== titleId) bad.push('aria-labelledby="' + labelledby + '" but <title> id="' + titleId + '"');
    var txt = t.textContent;
    var missing = SIX.filter(function (c) { return txt.indexOf(c) === -1; });
    if (missing.length) bad.push('title is missing: ' + missing.join(', '));
    return { ok: bad.length === 0, detail: bad.length ? bad.join('; ') : 'role=img, labelledby=' + titleId + ', all six named' };
  });

  check('8. nothing in the block depends on a JS reveal', function () {
    /* The block must not opt into .transition — those start at opacity 0 and
       depend on assets/js/main.js. closest() as well as querySelectorAll():
       the former excludes the section itself and every ancestor, so a
       .transition landing on #zrby1M would hide the whole block while this
       check stayed green. */
    var s = section();
    if (!s) return { ok: false, detail: 'section missing' };
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
    var s = section();
    if (!s) return { ok: false, detail: 'section missing' };
    var limit = vw();
    var over = [].filter.call(s.querySelectorAll('*'), function (e) {
      var r = e.getBoundingClientRect();
      return r.width > 0 && (r.right > limit + 1 || r.left < -1);
    });
    var names = over.slice(0, 3).map(function (e) {
      return (typeof e.className === 'string' && e.className) || e.tagName;
    });
    return { ok: over.length === 0, detail: 'viewport ' + limit + 'px, ' + over.length + ' overflowing' + (names.length ? ': ' + names.join(', ') : '') };
  });

  check('9b. no horizontal page overflow', function () {
    /* Check 9 walks querySelectorAll('*'), which excludes #zrby1M itself, so
       a negative margin on the section is invisible to it. This catches it.

       Compare the documentElement against itself, matching projects-check.js.
       body.scrollWidth excludes the vertical scrollbar while window.innerWidth
       includes it, so that pairing cannot see an overflow narrower than the
       scrollbar — and body.scrollWidth also misses overflow that escapes
       <body> entirely. */
    var de = document.documentElement;
    var ok = de.scrollWidth <= de.clientWidth;
    var detail = 'documentElement scrollWidth ' + de.scrollWidth +
                 ' vs clientWidth ' + de.clientWidth + ' @ ' + window.innerWidth + 'px';
    if (!ok) {
      /* This check measures the whole page, so the culprit may live in a
         block that is none of our business. Name it, and say plainly whether
         it is ours — Task 5 may only touch assets/css/offices.css.

         Two refinements, both learned the hard way against this page:

         Skip elements clipped by an ancestor. The hero's client marquee is
         deliberately wider than the viewport and sits inside an overflow
         hidden track; it contributes nothing to the page's scrollWidth, but
         it and its children put ~124 boxes past the right edge and bury the
         real culprit.

         Sort by how far each element overshoots, widest first, and count
         ours across the WHOLE set rather than the handful we print. Reporting
         "none of the first 3 are ours" off a DOM-ordered list is worse than
         saying nothing — it points the reader away from a block that really
         is at fault. */
      var s = section();
      function clipped(e) {
        for (var p = e.parentElement; p && p !== document.documentElement; p = p.parentElement) {
          var ox = getComputedStyle(p).overflowX;
          if (ox && ox !== 'visible') return true;
        }
        return false;
      }
      var culprits = [].filter.call(document.body.querySelectorAll('*'), function (e) {
        var r = e.getBoundingClientRect();
        return r.width > 0 && r.right > de.clientWidth + 1 && !clipped(e);
      });
      culprits.sort(function (a, b) {
        return b.getBoundingClientRect().right - a.getBoundingClientRect().right;
      });
      function ours(e) { return !!(s && (s === e || s.contains(e))); }
      var mine = culprits.filter(ours).length;
      var names = culprits.slice(0, 3).map(function (e) {
        var r = e.getBoundingClientRect();
        return (e.id ? '#' + e.id : ((typeof e.className === 'string' && e.className.trim()) ? '.' + e.className.trim().split(/\s+/).join('.') : e.tagName)) +
               ' (+' + Math.round(r.right - de.clientWidth) + 'px' + (ours(e) ? ', inside #zrby1M' : '') + ')';
      });
      detail += '; ' + culprits.length + ' unclipped overflowing' + (names.length ? ', widest: ' + names.join(', ') : '') +
                '; ' + (mine ? mine + ' of them inside #zrby1M — ours' : 'none inside #zrby1M — not ours');
      if (!culprits.length) detail += ' (no unclipped element box overflows — suspect a margin, a pseudo-element or a table)';
    }
    return { ok: ok, detail: detail };
  });

  check('10. the ADRESS typo is gone', function () {
    var s = section();
    if (!s) return { ok: false, detail: 'section missing' };
    var txt = s.textContent.replace(/\s+/g, ' ');
    /* Case-insensitive: the export may also carry "Adress" in title case.
       This cannot match the correct spelling "Address" — the double d is the
       whole difference. */
    var m = /adress/i.exec(txt);
    if (!m) return { ok: true, detail: 'clean' };
    var start = Math.max(0, m.index - 15);
    return { ok: false, detail: 'still present near: ...' + txt.substr(start, 40) + '...' };
  });

  check('11. presence list names exactly the three operations countries', function () {
    var s = section();
    if (!s) return { ok: false, detail: 'section missing' };
    var items = s.querySelectorAll('.off__presence-list li');
    var got = [].map.call(items, textOf);
    var ok = got.length === 3 && OPERATIONS.every(function (c) { return got.indexOf(c) !== -1; });
    return { ok: ok, detail: got.length + ' items [' + got.join(', ') + '], want ' + OPERATIONS.join(', ') };
  });

  check('12. a legend keys the map tiers in words, not colour alone', function () {
    var s = section();
    if (!s) return { ok: false, detail: 'section missing' };
    var items = s.querySelectorAll('.off__key li');
    var txt = [].map.call(items, textOf).join(' ');
    var ok = items.length >= 2 && /office/i.test(txt) && /operations/i.test(txt);
    return { ok: ok, detail: items.length + ' key items [' + txt + ']' };
  });

  check('13. no legacy builder layout elements survive in the block', function () {
    var s = section();
    if (!s) return { ok: false, detail: 'section missing' };
    /* Task 4 is string surgery on a 117 KB single-line export. An orphaned
       .layout-element left behind is a likely real defect, and nothing else
       here would notice it. */
    var nodes = s.querySelectorAll('.layout-element, .text-box, .grid-shape, .block-layout');
    var first = nodes.length ? ((typeof nodes[0].className === 'string' && nodes[0].className) || nodes[0].tagName) : '';
    return {
      ok: nodes.length === 0,
      detail: nodes.length + ' builder nodes remain (want 0)' + (first ? ', first is class="' + first + '"' : '')
    };
  });

  var passed = results.filter(function (r) { return r.ok; }).length;
  var failed = results.length - passed;
  results.forEach(function (r) {
    console.log((r.ok ? 'PASS  ' : 'FAIL  ') + r.name + (r.detail ? '  [' + r.detail + ']' : ''));
  });
  console.log('\n' + passed + ' passed, ' + failed + ' failed  (viewport ' + vw() + 'px)');
  return { passed: passed, failed: failed, results: results };
})();

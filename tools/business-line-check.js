/* Business-line sub-page harness. Paste into the console on any of the
   seven discipline pages, or load via <script>. Asserts the frozen
   decisions of docs/superpowers/specs/2026-07-20-business-line-subpages-design.md.
   Dependency-free. Reports pass/fail/skip; a skip is NOT a pass. */
(function () {
  'use strict';

  var DATA = {
    'roads-and-bridges-contractor-kuwait': {
      name: 'Roads and Bridges',
      stats: ['14', 'USD 1.36B', 'USD 487M'],
      proj: ['/ra-259', '/ra200', '/ra245', '/ra-223'],
      listings: [['/roads-and-bridges-current', '6'], ['/roads-and-bridges-completed', '8']],
      clients: 4,
      keyPills: 0
    },
    'civil-infrastructure-kuwait': {
      name: 'Civil Infrastructure',
      stats: ['17', 'USD 2.20B', 'USD 509M'],
      proj: ['/kp3cns301', '/ra-259', '/pahwc1151', '/ra245'],
      listings: [['/civil-current', '4'], ['/civil-completed', '13']],
      clients: 7,
      keyPills: 0
    },
    'building-construction-kuwait': {
      name: 'Building Construction',
      stats: ['7', 'USD 942M', 'USD 509M'],
      proj: ['/kp3cns301', '/pahwc1151',
             '/c502015-infrastructure-works-for-the-commercial-berth-at-duqm-port-ip3-oman',
             '/paafa77'],
      listings: [['/building-construction-current', '2'], ['/building-construction-completed', '5']],
      clients: 5,
      keyPills: 0
    },
    'oil-and-gas-construction-kuwait': {
      name: 'Oil and Gas',
      stats: ['4', 'USD 291M', 'USD 114M'],
      proj: ['/zorepc0059', '/gc32', '/josc151lsp06', '/koc36081'],
      listings: [['/oil-and-gas-completed', '4']],   // status-aware: completed only
      clients: 4,
      keyPills: 0
    },
    'water-treatment-plant-kuwait': {
      name: 'Water and Wastewater',
      stats: ['6', 'USD 358M', 'USD 152M'],
      proj: ['/se19', '/5a-haya-eo24', '/se97', '/mew6085'],
      listings: [['/water-current', '3'], ['/water-completed', '3']],
      clients: 3,
      keyPills: 0
    },
    'electro-mechanical-contractor-kuwait': {
      name: 'Electro-Mechanical',
      stats: ['18', 'USD 2.03B', 'USD 487M'],
      proj: ['/ra-259', '/ra245', '/ra-223', '/pai18pa'],
      listings: [['/electro-mechanical-current', '7'], ['/electro-mechanical-completed', '11']],
      clients: 6,
      keyPills: 0
    },
    'micro-tunneling-kuwait': {
      name: 'Micro-Tunnelling',
      stats: ['5', 'USD 303M', 'USD 168M'],
      proj: ['/ra268', '/se19', '/5a-haya-eo24', '/owwsct2460879'],
      listings: [['/micro-tunneling-current', '3'], ['/micro-tunneling-completed', '2']],
      clients: 2,
      keyPills: 1
    }
  };

  var TABS = [
    '/business-lines-construction-services-kuwait',
    '/roads-and-bridges-contractor-kuwait',
    '/civil-infrastructure-kuwait',
    '/building-construction-kuwait',
    '/oil-and-gas-construction-kuwait',
    '/water-treatment-plant-kuwait',
    '/electro-mechanical-contractor-kuwait',
    '/micro-tunneling-kuwait'
  ];

  var slug = location.pathname.replace(/\//g, '');
  var D = DATA[slug];
  if (!D) { console.error('business-line-check: not a business-line page:', location.pathname); return; }

  var pass = 0, fail = 0, skip = 0, failures = [];
  function ok(cond, label) {
    if (cond) { pass++; } else { fail++; failures.push(label); }
  }
  function skipped(label) { skip++; failures.push('SKIP: ' + label); }
  function txt(el) { return (el && el.textContent || '').replace(/\s+/g, ' ').trim(); }

  /* 1. One h1, canonical name */
  var h1s = document.querySelectorAll('h1');
  ok(h1s.length === 1, 'exactly one h1');
  ok(h1s[0] && h1s[0].classList.contains('as-cover__title'), 'h1 is the cover title');
  ok(txt(h1s[0]) === D.name, 'h1 text is "' + D.name + '"');

  /* 2. Cover image */
  var cover = document.querySelector('.as-cover__media');
  ok(!!cover, 'cover media present');
  if (cover) {
    ok((cover.getAttribute('alt') || '').length > 0, 'cover alt non-empty');
    ok(txt(h1s[0]) !== cover.getAttribute('alt'), 'cover alt is not the h1 text');
    if (cover.complete && cover.naturalWidth) {
      ok(String(cover.naturalWidth) === cover.getAttribute('width') &&
         String(cover.naturalHeight) === cover.getAttribute('height'),
         'cover width/height match intrinsic size');
    } else { skipped('cover intrinsic size (not decoded — scroll/reload, do not set eager)'); }
  }

  /* 3. Sub-nav */
  var tabs = document.querySelectorAll('.v2-subnav a');
  ok(tabs.length === 8, 'sub-nav has 8 tabs');
  var hrefsOk = tabs.length === 8;
  for (var i = 0; i < tabs.length; i++) {
    if (tabs[i].getAttribute('href') !== TABS[i]) hrefsOk = false;
  }
  ok(hrefsOk, 'sub-nav hrefs in frozen order');
  var active = document.querySelectorAll('.v2-subnav a.is-active');
  ok(active.length === 1, 'exactly one active tab');
  ok(active[0] && active[0].getAttribute('href') === '/' + slug, 'active tab is this page');
  ok(active[0] && active[0].getAttribute('aria-current') === 'page', 'active tab has aria-current');
  var labels = Array.prototype.map.call(tabs, txt).join('|');
  ok(labels.indexOf('Micro-Tunnelling') !== -1, 'canonical Micro-Tunnelling label');
  ok(labels.indexOf('Water and Wastewater') !== -1, 'canonical Water and Wastewater label');

  /* 4. Stats */
  var stats = document.querySelectorAll('.as-stat');
  ok(stats.length === 3, 'exactly 3 stat tiles');
  for (var s = 0; s < Math.min(stats.length, 3); s++) {
    var fig = txt(stats[s].querySelector('.as-stat__figure'));
    ok(fig === D.stats[s], 'stat ' + (s + 1) + ' figure is "' + D.stats[s] + '" (got "' + fig + '")');
    ok(txt(stats[s].querySelector('.as-stat__unit')).length > 0, 'stat ' + (s + 1) + ' has a unit');
  }

  /* 5. Key-project rows */
  var rows = document.querySelectorAll('.blp-proj__row');
  ok(rows.length === 4, 'exactly 4 key-project rows');
  for (var r = 0; r < rows.length; r++) {
    var href = rows[r].getAttribute('href');
    ok(href === D.proj[r], 'row ' + (r + 1) + ' href is ' + D.proj[r] + ' (got ' + href + ')');
    var label = rows[r].getAttribute('aria-label') || '';
    var visible = txt(rows[r].querySelector('.blp-proj__name'));
    ok(label.indexOf(visible) === 0, 'row ' + (r + 1) + ' aria-label begins with its visible name');
  }

  /* 6. Listing links — status-aware */
  var expected = {};
  D.listings.forEach(function (l) { expected[l[0]] = l[1]; });
  var btns = document.querySelectorAll('.blp-btnrow .as-btn');
  ok(btns.length === D.listings.length, D.listings.length + ' listing button(s)');
  Array.prototype.forEach.call(btns, function (b) {
    var h = b.getAttribute('href');
    ok(expected.hasOwnProperty(h), 'listing button href ' + h + ' expected');
    ok(txt(b).indexOf('(' + expected[h] + ')') !== -1, 'button "' + txt(b) + '" carries count ' + expected[h]);
  });
  if (slug === 'oil-and-gas-construction-kuwait') {
    ok(!document.querySelector('a[href="/oil-and-gas-current"]'), 'no link to nonexistent oil-and-gas-current');
  }

  /* 7. Clients */
  var logos = document.querySelectorAll('.blp-clients img');
  ok(logos.length === D.clients, D.clients + ' client logos (got ' + logos.length + ')');
  Array.prototype.forEach.call(logos, function (img, n) {
    ok((img.getAttribute('alt') || '').length > 0, 'client logo ' + (n + 1) + ' alt non-empty');
  });

  /* 8. Nothing hidden */
  var hidden = 0;
  Array.prototype.forEach.call(document.querySelectorAll('.as-section *, .blp-proj *'), function (el) {
    if (getComputedStyle(el).opacity === '0') hidden++;
  });
  ok(hidden === 0, 'no element computes to opacity 0 (' + hidden + ' found)');

  /* 9. Key pills — frozen per page (customer text freeze: only micro keeps one) */
  ok(document.querySelectorAll('.as-pill--key').length === D.keyPills,
     D.keyPills + ' as-pill--key expected');

  /* 10. No horizontal overflow */
  ok(document.documentElement.scrollWidth <= window.innerWidth + 1, 'no horizontal overflow');

  console.log('business-line-check [' + slug + ']: ' +
    pass + ' passed, ' + fail + ' failed, ' + skip + ' skipped' +
    (failures.length ? '\n - ' + failures.join('\n - ') : ''));
})();

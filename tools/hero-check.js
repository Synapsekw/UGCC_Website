/* UGCC hero layout checks. Dependency-free.
   Usage: paste into the browser console on the homepage, or evaluate via
   automation. Returns {passed, failed, results}. Resize to 1280x720 first. */
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

  var SERVICE_IDS = ['z5y7PA', 'zGp0a1', 'zBf9dg'];
  var vh = window.innerHeight;

  check('all three service headings are above the fold', function () {
    var bad = [];
    SERVICE_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) { bad.push(id + ' missing'); return; }
      var b = el.getBoundingClientRect().bottom;
      if (b > vh) bad.push(id + ' bottom=' + Math.round(b) + ' > vh=' + vh);
    });
    return { ok: bad.length === 0, detail: bad.join('; ') };
  });

  check('hero fits the viewport', function () {
    var hero = document.getElementById('aCqA2TkE7');
    var h = hero.getBoundingClientRect().height;
    return { ok: h <= vh + 1, detail: 'hero height=' + Math.round(h) + ' vh=' + vh };
  });

  check('h1 accessible name is exactly WE BUILD BETTER', function () {
    var h1 = document.querySelector('#aCqA2TkE7 h1');
    if (!h1) return { ok: false, detail: 'no h1 in hero' };
    var name = (h1.textContent || '').replace(/\s+/g, ' ').trim();
    return { ok: name === 'WE BUILD BETTER', detail: 'got "' + name + '"' };
  });

  check('eyebrow exists and is not pure red', function () {
    var el = document.querySelector('#aCqA2TkE7 .hero-eyebrow');
    if (!el) return { ok: false, detail: 'no .hero-eyebrow' };
    var c = getComputedStyle(el).color;
    return { ok: c !== 'rgb(255, 0, 0)', detail: 'color=' + c };
  });

  check('supporting line exists', function () {
    var el = document.querySelector('#aCqA2TkE7 .hero-sub');
    return { ok: !!el && el.textContent.trim().length > 20,
             detail: el ? 'len=' + el.textContent.trim().length : 'missing' };
  });

  check('two hero CTAs, second points at projects', function () {
    var btns = document.querySelectorAll('#aCqA2TkE7 .hero-cta a');
    if (btns.length !== 2) return { ok: false, detail: 'found ' + btns.length };
    var second = btns[1].getAttribute('href');
    return { ok: second === '/construction-projects-kuwait',
             detail: 'second href=' + second };
  });

  check('headline has no hardcoded inline colour', function () {
    var span = document.querySelector('#aCqA2TkE7 h1 span[style*="color"]');
    return { ok: !span, detail: span ? 'inline colour still present' : '' };
  });

  check('header condenses on scroll without content jump', function () {
    var header = document.querySelector('header.block-header');
    var hero = document.getElementById('aCqA2TkE7');
    var y0 = window.scrollY;
    document.documentElement.style.scrollBehavior = 'auto';

    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.classList.remove('v2-scrolled');
    var restH = header.getBoundingClientRect().height;
    var heroTop0 = hero.getBoundingClientRect().top;

    document.documentElement.classList.add('v2-scrolled');
    var condH = header.getBoundingClientRect().height;
    var heroTop1 = hero.getBoundingClientRect().top;

    document.documentElement.classList.remove('v2-scrolled');
    window.scrollTo({ top: y0, behavior: 'instant' });

    var shrank = condH < restH - 20;
    var jump = Math.abs(heroTop1 - heroTop0);
    return { ok: shrank && jump < 2,
             detail: 'rest=' + Math.round(restH) + ' condensed=' + Math.round(condH) +
                     ' heroJump=' + Math.round(jump) + 'px' };
  });

  check('contact link is a pill, not a plain link', function () {
    var last = document.querySelector(
      '.block-header-layout-desktop .block-header-item:last-child .item-content');
    if (!last) return { ok: false, detail: 'last nav item not found' };
    var r = parseFloat(getComputedStyle(last).borderTopLeftRadius);
    return { ok: r >= 12, detail: 'border-radius=' + r + 'px' };
  });

  var passed = results.filter(function (r) { return r.ok; }).length;
  var failed = results.length - passed;

  results.forEach(function (r) {
    console.log((r.ok ? 'PASS  ' : 'FAIL  ') + r.name + (r.detail ? '  [' + r.detail + ']' : ''));
  });
  console.log('\n' + passed + ' passed, ' + failed + ' failed');

  return { passed: passed, failed: failed, results: results };
})();

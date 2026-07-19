/* UGCC hero layout checks. Dependency-free.
   Usage: paste into the browser console on the homepage, or evaluate via
   automation. Returns {passed, failed, results}. Resize to 1280x720 first.

   NOT covered by this script (manual verification required):
     - inner-page nav appearance on light backgrounds (this script only
       exercises the homepage hero, which sits on a dark/video background)
     - mobile layout at 375px viewport width
   Reduced-motion behaviour and CTA keyboard-focus visibility ARE covered
   by the checks below — they are not manual-only gaps. */
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

  /* Title divs + description boxes for all three service columns. The
     description boxes are intentionally display:none at mobile widths;
     at 1280x720 (the viewport this script requires) all six must render. */
  var SERVICE_IDS = ['z5y7PA', 'zGp0a1', 'zBf9dg', 'zEZmIA', 'zGqZ-o', 'zwB5a2'];
  var vh = window.innerHeight;

  /* ---- preconditions: must fail loudly, not silently invalidate later checks ---- */

  check('preconditions: page at scroll top', function () {
    return { ok: window.scrollY === 0, detail: 'scrollY=' + window.scrollY };
  });

  check('preconditions: viewport is 1280x720', function () {
    var w = window.innerWidth, h = window.innerHeight;
    return { ok: w === 1280 && h === 720, detail: 'innerWidth=' + w + ' innerHeight=' + h };
  });

  check('all three service columns are above the fold', function () {
    var bad = [];
    SERVICE_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) { bad.push(id + ' missing'); return; }
      var r = el.getBoundingClientRect();
      /* A display:none element yields an all-zero rect, so bottom=0 would
         otherwise read as "above the fold". Zero size means unrendered,
         not visible. */
      if (r.height <= 0 || r.bottom <= 0) { bad.push(id + ' not rendered (height=' + r.height + ')'); return; }
      if (r.bottom > vh) bad.push(id + ' bottom=' + Math.round(r.bottom) + ' > vh=' + vh);
    });
    return { ok: bad.length === 0, detail: bad.join('; ') };
  });

  check('hero fits the viewport', function () {
    var hero = document.getElementById('aCqA2TkE7');
    var r = hero.getBoundingClientRect();
    if (r.height <= 0) return { ok: false, detail: 'hero not rendered (height=0)' };
    /* +1: subpixel layout rounding, not a real tolerance for overflow. */
    return { ok: r.height <= vh + 1, detail: 'hero height=' + Math.round(r.height) + ' vh=' + vh };
  });

  check('h1 accessible name is exactly WE BUILD BETTER', function () {
    var h1 = document.querySelector('#aCqA2TkE7 h1');
    if (!h1) return { ok: false, detail: 'no h1 in hero' };
    var name = (h1.textContent || '').replace(/\s+/g, ' ').trim();
    if (name !== 'WE BUILD BETTER') return { ok: false, detail: 'got "' + name + '"' };

    /* textContent equality is not sufficient: aria-label/aria-labelledby
       override it, and aria-hidden="true" on a wrapper span (e.g. from a
       per-word span split) can silently remove visible text from the
       accessible name while textContent still reads correctly. */
    if (h1.hasAttribute('aria-label')) {
      return { ok: false, detail: 'h1 has aria-label="' + h1.getAttribute('aria-label') + '"' };
    }
    if (h1.hasAttribute('aria-labelledby')) {
      return { ok: false, detail: 'h1 has aria-labelledby="' + h1.getAttribute('aria-labelledby') + '"' };
    }
    var hiddenOffenders = [];
    Array.prototype.forEach.call(h1.querySelectorAll('[aria-hidden="true"]'), function (el) {
      if ((el.textContent || '').trim().length > 0) {
        hiddenOffenders.push(el.tagName.toLowerCase());
      }
    });
    if (hiddenOffenders.length) {
      return { ok: false, detail: hiddenOffenders.length + ' descendant(s) with non-whitespace text carry aria-hidden="true": ' + hiddenOffenders.join(', ') };
    }
    return { ok: true };
  });

  check('eyebrow colour matches the --v2-red-text token', function () {
    var token = getComputedStyle(document.documentElement).getPropertyValue('--v2-red-text').trim();
    if (!token) return { ok: false, detail: '--v2-red-text custom property is unset/empty' };

    var el = document.querySelector('#aCqA2TkE7 .hero-eyebrow');
    if (!el) return { ok: false, detail: 'no .hero-eyebrow' };

    /* Resolve the token through a throwaway element so hex, rgb(), and
       named colours all normalise to the same computed-style string the
       browser reports for the eyebrow itself. */
    var probe = document.createElement('span');
    probe.style.color = token;
    document.body.appendChild(probe);
    var resolved = getComputedStyle(probe).color;
    document.body.removeChild(probe);

    var actual = getComputedStyle(el).color;
    return { ok: actual === resolved, detail: 'eyebrow color=' + actual + ' token(' + token + ')=>' + resolved };
  });

  check('supporting line exists', function () {
    var el = document.querySelector('#aCqA2TkE7 .hero-sub');
    /* 20 chars: just enough to rule out empty/placeholder text without
       hardcoding the final copy. */
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
    var h1 = document.querySelector('#aCqA2TkE7 h1');
    if (!h1) return { ok: false, detail: 'no h1 in hero' };
    /* Use the parsed el.style.color property, not a [style*="color"]
       attribute-substring selector — the latter also false-matches
       background-color. Scan the h1 itself AND every descendant, since
       real markup hardcodes colour on both the <h1>
       ("color: rgb(0,0,0)") and an inner <span>
       ("color: rgb(255,255,255)"). */
    var offenders = [];
    var nodes = [h1].concat(Array.prototype.slice.call(h1.querySelectorAll('*')));
    nodes.forEach(function (el) {
      if (el.style && el.style.color && el.style.color.trim() !== '') {
        offenders.push(el.tagName.toLowerCase() + ' color=' + el.style.color);
      }
    });
    return { ok: offenders.length === 0, detail: offenders.join('; ') };
  });

  check('header condenses on scroll without content jump', function () {
    var header = document.querySelector('header.block-header');
    var hero = document.getElementById('aCqA2TkE7');
    var sibling = hero.nextElementSibling;
    if (!sibling) return { ok: false, detail: 'hero has no next element sibling to measure' };

    /* The header overlays the hero on this page, so the hero's own top is
       pinned at 0 regardless of header height — asserting on hero.top
       would be vacuous by construction. Measure the first in-flow element
       BELOW the hero instead: if the header is (or becomes) in-flow, that
       element moving is the real layout jump users would see. */
    var y0 = window.scrollY;
    var prevScrollBehavior = document.documentElement.style.scrollBehavior;
    try {
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.documentElement.classList.remove('v2-scrolled');
      var restH = header.getBoundingClientRect().height;
      var sibTop0 = sibling.getBoundingClientRect().top;

      document.documentElement.classList.add('v2-scrolled');
      var condH = header.getBoundingClientRect().height;
      var sibTop1 = sibling.getBoundingClientRect().top;

      /* 20px margin: condensed header must be meaningfully shorter than
         resting, not just different by font-metric/subpixel noise. */
      var shrank = condH < restH - 20;
      /* 2px tolerance: sub-pixel rounding only, not a real allowance for
         visible content shift. */
      var jump = Math.abs(sibTop1 - sibTop0);
      return { ok: shrank && jump < 2,
               detail: 'rest=' + Math.round(restH) + ' condensed=' + Math.round(condH) +
                       ' siblingJump=' + Math.round(jump) + 'px' };
    } finally {
      /* Restore v2-scrolled explicitly using the site's own threshold
         (assets/js/v2.js: window.scrollY > 24) rather than relying on its
         scroll listener, which defers to requestAnimationFrame and will
         not have fired synchronously by the time this check returns. */
      document.documentElement.classList.toggle('v2-scrolled', y0 > 24);
      window.scrollTo({ top: y0, behavior: 'instant' });
      /* Never leave 'auto' stamped on <html>: v2.css sets
         scroll-behavior: smooth, and a reviewer clicking an anchor link
         afterward would see a false smooth-scroll regression. */
      document.documentElement.style.scrollBehavior = prevScrollBehavior;
    }
  });

  check('contact link is a pill, not a plain link', function () {
    /* Resting-state rule, not the .v2-scrolled block — this check does
       not depend on (and must not toggle) scroll state. */
    var last = document.querySelector(
      '.block-header-layout-desktop .block-header-item:last-child .item-content');
    if (!last) return { ok: false, detail: 'last nav item not found' };
    var r = parseFloat(getComputedStyle(last).borderTopLeftRadius);
    /* 12px: distinguishes an actual pill/rounded-button treatment from
       subtle default button rounding (a few px). */
    return { ok: r >= 12, detail: 'border-radius=' + r + 'px' };
  });

  check('reduced motion disables hero animation', function () {
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var hasClass = document.documentElement.classList.contains('hero-motion');
    if (reduced) {
      return { ok: !hasClass, detail: 'prefers-reduced-motion: reduce is active; hero-motion class present=' + hasClass };
    }
    return { ok: hasClass, detail: 'prefers-reduced-motion: reduce is NOT active; hero-motion class present=' + hasClass };
  });

  check('hero CTAs show a visible focus ring', function () {
    var btns = document.querySelectorAll('#aCqA2TkE7 .hero-cta a');
    if (btns.length === 0) return { ok: false, detail: 'no CTAs found to test' };
    var bad = [];
    Array.prototype.forEach.call(btns, function (el, i) {
      el.focus();
      var cs = getComputedStyle(el);
      var visible = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
      if (!visible) bad.push('cta[' + i + '] outline-style=' + cs.outlineStyle + ' outline-width=' + cs.outlineWidth);
    });
    document.body.focus();
    return { ok: bad.length === 0, detail: bad.join('; ') };
  });

  var passed = results.filter(function (r) { return r.ok; }).length;
  var failed = results.length - passed;

  results.forEach(function (r) {
    console.log((r.ok ? 'PASS  ' : 'FAIL  ') + r.name + (r.detail ? '  [' + r.detail + ']' : ''));
  });
  console.log('\n' + passed + ' passed, ' + failed + ' failed');

  return { passed: passed, failed: failed, results: results };
})();

/* UGCC hero layout checks. Dependency-free.
   Usage: paste into the browser console on the homepage, or evaluate via
   automation. Returns {passed, failed, results}. Resize to 1280x720 first.

   NOT covered by this script (manual verification required):
     - inner-page nav appearance on light backgrounds
     - 375px mobile layout
     - keyboard focus visibility on nav links and hero CTAs
     - header condensing without content jump, on inner pages where the
       header is in flow
   Reduced-motion behaviour for the hero IS covered by the checks below. */
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

  /* Hoisted so checks 1 and 2 can gate on them directly, not just report
     alongside them — a precondition failure must invalidate those results,
     not merely appear as a separate line above a false PASS. */
  var atScrollTop = window.scrollY === 0;
  var atRequiredViewport = window.innerWidth === 1280 && window.innerHeight === 720;
  var PRECONDITION_DETAIL = 'precondition not met — page must be at scroll top at 1280x720';

  /* ---- preconditions: reported as their own lines, and gate checks 1 & 2 below ---- */

  check('preconditions: page at scroll top', function () {
    return { ok: atScrollTop, detail: 'scrollY=' + window.scrollY };
  });

  check('preconditions: viewport is 1280x720', function () {
    return { ok: atRequiredViewport, detail: 'innerWidth=' + window.innerWidth + ' innerHeight=' + window.innerHeight };
  });

  check('all three service columns are above the fold', function () {
    if (!atScrollTop || !atRequiredViewport) return { ok: false, detail: PRECONDITION_DETAIL };
    var bad = [];
    SERVICE_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) { bad.push(id + ' missing'); return; }
      var r = el.getBoundingClientRect();
      /* A display:none element yields an all-zero rect (height=0, bottom=0);
         an element merely scrolled above the viewport can have real height
         but a negative/zero bottom. These are different failures and get
         different messages so "not rendered" never gets reported alongside
         a nonzero height. */
      if (r.height <= 0) { bad.push(id + ' not rendered (height=0)'); return; }
      if (r.bottom <= 0) { bad.push(id + ' scrolled above viewport (bottom=' + Math.round(r.bottom) + ')'); return; }
      if (r.bottom > vh) bad.push(id + ' bottom=' + Math.round(r.bottom) + ' > vh=' + vh);
    });
    return { ok: bad.length === 0, detail: bad.join('; ') };
  });

  check('hero fits the viewport', function () {
    if (!atScrollTop || !atRequiredViewport) return { ok: false, detail: PRECONDITION_DETAIL };
    var hero = document.getElementById('aCqA2TkE7');
    var r = hero.getBoundingClientRect();
    if (r.height <= 0) return { ok: false, detail: 'hero not rendered (height=0)' };
    /* +1: subpixel layout rounding, not a real tolerance for overflow. */
    return { ok: r.height <= vh + 1, detail: 'hero height=' + Math.round(r.height) + ' vh=' + vh };
  });

  check('h1 accessible name is exactly WE BUILD BETTER', function () {
    var h1 = document.querySelector('#aCqA2TkE7 h1');
    if (!h1) return { ok: false, detail: 'no h1 in hero' };

    function isAriaHiddenTrue(el) {
      var v = el.getAttribute && el.getAttribute('aria-hidden');
      return !!v && v.toLowerCase() === 'true';
    }
    function hasPresentationRole(el) {
      var v = el.getAttribute && el.getAttribute('role');
      return !!v && (v.toLowerCase() === 'presentation' || v.toLowerCase() === 'none');
    }

    if (isAriaHiddenTrue(h1) || hasPresentationRole(h1)) {
      return { ok: false, detail: 'h1 itself carries aria-hidden="true" or role="presentation"/"none", which removes it from the accessibility tree entirely' };
    }
    var h1cs = getComputedStyle(h1);
    if (h1cs.display === 'none' || h1cs.visibility === 'hidden') {
      return { ok: false, detail: 'h1 itself is display:none or visibility:hidden' };
    }

    /* Reconstruct what the browser's accessible-name computation would
       gather from this subtree: skip any node (and its descendants) that
       is aria-hidden="true" (case-insensitively — "TRUE" counts too),
       role="presentation"/"none", display:none, or visibility:hidden.
       This single computation is what actually catches all of:
         - a descendant with aria-hidden="true"/"TRUE" hiding real words
         - a descendant hidden via CSS (display/visibility) whose text
           textContent would still count, silently truncating the name
         - a *whitespace-only* aria-hidden separator sitting between two
           visible word spans: dropping its contribution merges the
           adjacent runs with no space between them (e.g. "WEBUILDBETTER"),
           which fails the exact-match comparison below without needing
           special-cased adjacency detection. */
    function accessibleText(node) {
      if (node.nodeType === 3) return node.nodeValue || '';
      if (node.nodeType !== 1) return '';
      if (isAriaHiddenTrue(node) || hasPresentationRole(node)) return '';
      var cs = getComputedStyle(node);
      if (cs.display === 'none' || cs.visibility === 'hidden') return '';
      var text = '';
      Array.prototype.forEach.call(node.childNodes, function (child) {
        text += accessibleText(child);
      });
      return text;
    }

    var raw = accessibleText(h1);
    var accessibleName = raw.replace(/[\s ]+/g, ' ').trim();
    if (accessibleName !== 'WE BUILD BETTER') {
      var rawTextContent = (h1.textContent || '').replace(/\s+/g, ' ').trim();
      return { ok: false, detail: 'computed accessible name="' + accessibleName + '" (raw textContent="' + rawTextContent + '")' };
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
    var resolved;
    try {
      probe.style.color = token;
      /* An unparseable token (or one this probe cannot resolve standalone,
         e.g. a typo) is a silent no-op: probe.style.color stays ''. Left
         unchecked, the probe would then report its *inherited* colour,
         which can coincidentally match an unstyled eyebrow and false-pass.
         Treat "did not parse" as a hard failure instead. */
      if (probe.style.color === '') {
        return { ok: false, detail: '--v2-red-text is not a parseable colour: ' + token };
      }
      document.body.appendChild(probe);
      resolved = getComputedStyle(probe).color;
    } finally {
      if (probe.parentNode) probe.parentNode.removeChild(probe);
    }

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
       ("color: rgb(255,255,255)"). Note this also flags
       style="color: var(--token)" as an offender even though it resolves
       to a design token — deliberate: the requirement is no inline colour
       declaration at all, so this fails closed rather than trying to
       whitelist "acceptable" inline values. */
    var offenders = [];
    var nodes = [h1].concat(Array.prototype.slice.call(h1.querySelectorAll('*')));
    nodes.forEach(function (el) {
      if (el.style && el.style.color && el.style.color.trim() !== '') {
        offenders.push(el.tagName.toLowerCase() + ' color=' + el.style.color);
      }
    });
    return { ok: offenders.length === 0, detail: offenders.join('; ') };
  });

  check('header frosts on scroll and does NOT change height', function () {
    /* Condensing was attempted and REJECTED. On inner pages the header sits
       in flow above .page__blocks, and shrinking its padding shifted that
       content up by 30px on all three pages tested — far past the 2px
       tolerance. On the homepage the header overlays the hero, so the jump
       is invisible there; that blind spot is exactly why the old automated
       "no content jump" assertion was removed rather than trusted.

       So this now asserts what actually shipped: the frosted-glass state
       applies AND the height stays put. The height half is a regression
       guard — if someone reintroduces condensing, inner pages break again
       and this goes red. Content-jump verification on inner pages remains
       on the manual list below. */
    var header = document.querySelector('header.block-header');
    var y0 = window.scrollY;
    var prevScrollBehavior = document.documentElement.style.scrollBehavior;
    try {
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.documentElement.classList.remove('v2-scrolled');
      var restH = header.getBoundingClientRect().height;

      document.documentElement.classList.add('v2-scrolled');
      var condH = header.getBoundingClientRect().height;
      var cs = getComputedStyle(header);
      var filter = cs.backdropFilter || cs.webkitBackdropFilter || '';
      var bg = cs.backgroundColor;

      var problems = [];
      /* 2px tolerance: same threshold used for the manual inner-page jump
         check, and absorbs subpixel/font-metric noise. */
      if (Math.abs(condH - restH) >= 2) {
        problems.push('height changed ' + Math.round(restH) + '->' + Math.round(condH) +
                      ' (condensing was rejected: it shifts inner-page content 30px)');
      }
      if (filter.indexOf('blur') === -1) {
        problems.push('no backdrop blur when scrolled (got "' + filter + '")');
      }
      /* Must be translucent, or there is nothing for the blur to act on -
         the original 92% opacity was why the frost was invisible. */
      if (!/rgba\([^)]*0?\.\d+\s*\)/.test(bg)) {
        problems.push('scrolled background is not translucent (got ' + bg + ')');
      }

      return { ok: problems.length === 0,
               detail: problems.length ? problems.join('; ')
                                       : 'h=' + Math.round(restH) + ' stable, ' + filter };
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
    var radiusStr = getComputedStyle(last).borderTopLeftRadius;
    /* border-radius: 50% computes to a string ending in "%", and
       parseFloat("50%") happily returns 50 — indistinguishable from a
       real 50px pill radius unless the unit is checked first. */
    if (radiusStr.trim().slice(-1) === '%') {
      return { ok: false, detail: 'border-radius is a percentage (' + radiusStr + '), not a pill treatment' };
    }
    var r = parseFloat(radiusStr);
    /* 12px: distinguishes an actual pill/rounded-button treatment from
       subtle default button rounding (a few px). */
    return { ok: r >= 12, detail: 'border-radius=' + r + 'px' };
  });

  check('reduced motion disables hero animation', function () {
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var heroTitle = document.querySelector('#aCqA2TkE7 .hero-title');
    var branch = reduced ? 'reduce' : 'no-preference';
    if (!heroTitle) {
      return { ok: false, detail: 'hero not yet recomposed (no .hero-title) [' + branch + ']' };
    }
    var hasClass = document.documentElement.classList.contains('hero-motion');
    var words = heroTitle.querySelectorAll('.hero-word');
    var animatedWords = 0;
    Array.prototype.forEach.call(words, function (w) {
      if (getComputedStyle(w).animationName !== 'none') animatedWords++;
    });

    if (reduced) {
      /* Under reduced motion the class must be absent AND no .hero-word
         may actually be running an animation — a class-only check would
         vacuously pass on a page where nothing was ever implemented. */
      var ok = !hasClass && animatedWords === 0;
      return { ok: ok, detail: '[' + branch + '] hero-motion class present=' + hasClass +
                 '; animated .hero-word=' + animatedWords + '/' + words.length };
    }
    /* Under no-preference the class must be present AND at least one
       .hero-word must actually be animating — same rationale in reverse. */
    var ok2 = hasClass && words.length > 0 && animatedWords > 0;
    return { ok: ok2, detail: '[' + branch + '] hero-motion class present=' + hasClass +
               '; animated .hero-word=' + animatedWords + '/' + words.length };
  });

  var passed = results.filter(function (r) { return r.ok; }).length;
  var failed = results.length - passed;

  results.forEach(function (r) {
    console.log((r.ok ? 'PASS  ' : 'FAIL  ') + r.name + (r.detail ? '  [' + r.detail + ']' : ''));
  });
  console.log('\n' + passed + ' passed, ' + failed + ' failed');

  return { passed: passed, failed: failed, results: results };
})();

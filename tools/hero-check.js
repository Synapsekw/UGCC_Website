/* UGCC hero layout checks. Dependency-free.
   Usage: paste into the browser console on the homepage, or evaluate via
   automation. Returns a Promise of {passed, failed, results} — the scrolled
   sync-pass check is async. Resize to 1280x720 first, at scroll top.

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

  /* Vertical midpoint of an element in viewport coordinates, with any
     transform removed - i.e. where the element sits in LAYOUT.

     getBoundingClientRect() includes transforms. Several hero elements
     carry entry animations declared with animation-fill-mode: both, which
     pins them at their from-state (translateY(18px) for hero-fade-up)
     through the animation delay. A positional assertion that measures the
     raw rect therefore reads the animation as displacement and is true or
     false depending on when it happens to run. That is not a hypothetical:
     the rail alignment check below passed while the rail was genuinely
     18px out of place, because a script had shifted `bottom` by exactly
     the amount the transform was cancelling. */
  function layoutMid(el) {
    var r = el.getBoundingClientRect();
    var m = getComputedStyle(el).transform;
    var ty = 0;
    if (m && m !== 'none') {
      var p = m.replace(/^matrix3d\(/, '').replace(/^matrix\(/, '').replace(/\)$/, '').split(',');
      ty = parseFloat(p.length === 16 ? p[13] : p[5]) || 0;
    }
    return r.top - ty + r.height / 2;
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

  check('the three service cards are gone', function () {
    /* Replaced at the client's request by a rolling client-logo rail.
       Regression guard: an earlier revision of this file asserted these
       columns were present and above the fold, so a stale revert would
       otherwise silently reinstate them. */
    var left = SERVICE_IDS.filter(function (id) { return !!document.getElementById(id); });
    if (document.querySelector('#aCqA2TkE7 .hero-services')) left.push('.hero-services');
    return { ok: left.length === 0,
             detail: left.length ? 'still present: ' + left.join(', ') : 'removed' };
  });

  check('client logo rail is present, above the fold, and rolling', function () {
    if (!atScrollTop || !atRequiredViewport) return { ok: false, detail: PRECONDITION_DETAIL };
    var rail = document.querySelector('#aCqA2TkE7 .hero-clients');
    if (!rail) return { ok: false, detail: 'no .hero-clients rail' };

    var imgs = rail.querySelectorAll('img');
    var problems = [];
    /* 6 is a floor, not a target: there are 9 client logos available and
       a marquee needs enough of them to fill the width without obvious
       repetition. */
    if (imgs.length < 6) problems.push('only ' + imgs.length + ' logos (expected at least 6)');

    var r = rail.getBoundingClientRect();
    if (r.height <= 0) problems.push('rail not rendered');
    else if (r.bottom > vh + 1) problems.push('rail bottom=' + Math.round(r.bottom) + ' > vh=' + vh);

    /* The rail must actually roll. Accept a CSS animation on the track or
       a running Web Animation - not a static row of logos. */
    var track = rail.querySelector('.hero-clients__track') || rail.firstElementChild;
    var animated = false;
    if (track) {
      var an = getComputedStyle(track).animationName;
      if (an && an !== 'none') animated = true;
      if (!animated && typeof track.getAnimations === 'function' && track.getAnimations().length) animated = true;
    }
    if (!animated) problems.push('rail track has no animation - it is not rolling');

    return { ok: problems.length === 0,
             detail: problems.length ? problems.join('; ')
                                     : imgs.length + ' logos, bottom=' + Math.round(r.bottom) + ', rolling' };
  });

  check('logos are white and semi-transparent', function () {
    var img = document.querySelector('#aCqA2TkE7 .hero-clients img');
    if (!img) return { ok: false, detail: 'no logo images' };
    var cs = getComputedStyle(img);
    /* Effective opacity can come from the image, the track or the rail, so
       walk up and multiply rather than reading a single node. */
    var eff = 1, el = img;
    while (el && el.id !== 'aCqA2TkE7') {
      eff *= parseFloat(getComputedStyle(el).opacity);
      el = el.parentElement;
    }
    var problems = [];
    if (!(eff < 0.95)) problems.push('effective opacity ' + eff.toFixed(2) + ' - not semi-transparent');
    /* Whiteness comes either from a filter (brightness/invert on a source
       image) or from the asset itself already being a white silhouette.
       Accept either; only flag when neither is true AND no filter is set. */
    var hasFilter = cs.filter && cs.filter !== 'none';
    var src = img.getAttribute('src') || '';
    var whiteAsset = src.indexOf('/clients/') >= 0;
    if (!hasFilter && !whiteAsset) {
      problems.push('logos are neither filtered white nor drawn from prebuilt white assets');
    }
    return { ok: problems.length === 0,
             detail: problems.length ? problems.join('; ')
                                     : 'effective opacity ' + eff.toFixed(2) + ', ' + (whiteAsset ? 'white assets' : 'filter: ' + cs.filter) };
  });

  check('logo rail lines up with the chat widget', function () {
    if (!atScrollTop || !atRequiredViewport) return { ok: false, detail: PRECONDITION_DETAIL };
    var rail = document.querySelector('#aCqA2TkE7 .hero-clients');
    var widget = document.getElementById('glass-ai-widget-host');
    if (!rail) return { ok: false, detail: 'no rail' };
    if (!widget) return { ok: true, detail: 'chat widget not present on this load - nothing to align to' };
    var wr = widget.getBoundingClientRect();
    var railMid = layoutMid(rail), widgetMid = wr.top + wr.height / 2;
    var off = railMid - widgetMid;
    /* 16px: the client asked for the rail to sit "in line with the chat
       icon". Tight enough to read as deliberately aligned, loose enough to
       absorb the widget's own internal padding. */
    return { ok: Math.abs(off) <= 16,
             detail: 'rail mid=' + Math.round(railMid) + ' widget mid=' + Math.round(widgetMid) +
                     ' off by ' + Math.round(off) + 'px' };
  });

  check('hero exactly fills the viewport, nothing below it shows', function () {
    if (!atScrollTop || !atRequiredViewport) return { ok: false, detail: PRECONDITION_DETAIL };
    var hero = document.getElementById('aCqA2TkE7');
    var r = hero.getBoundingClientRect();
    if (r.height <= 0) return { ok: false, detail: 'hero not rendered (height=0)' };

    var problems = [];
    /* 1px tolerances throughout are subpixel layout rounding, not real slack. */
    if (Math.abs(r.top) > 1) {
      problems.push('hero top=' + Math.round(r.top) + ', should be 0');
    }
    if (r.height > vh + 1) {
      problems.push('hero height=' + Math.round(r.height) + ' > vh=' + vh);
    }
    /* The actual complaint this guards: a sliver of the next section
       peeking under the hero on load. It was 6px, caused by the hero
       being offset -6px while still exactly vh tall. */
    var next = hero.nextElementSibling;
    if (next) {
      var nr = next.getBoundingClientRect();
      if (nr.top < vh - 1) {
        problems.push('next section visible at top=' + Math.round(nr.top) +
                      ' (' + Math.round(vh - nr.top) + 'px of it showing)');
      }
    }
    return { ok: problems.length === 0,
             detail: problems.length ? problems.join('; ')
                                     : 'top=0 h=' + Math.round(r.height) + ' = vh, nothing below' };
  });

  check('headline and CTAs are centred in the viewport', function () {
    if (!atScrollTop || !atRequiredViewport) return { ok: false, detail: PRECONDITION_DETAIL };
    var stack = document.querySelector('#aCqA2TkE7 .hero-stack');
    if (!stack) return { ok: false, detail: 'no .hero-stack' };
    var r = stack.getBoundingClientRect();
    if (r.height <= 0) return { ok: false, detail: 'hero-stack not rendered' };
    var stackCentre = r.top + r.height / 2;
    var off = stackCentre - vh / 2;
    /* 12px: enough to absorb line-box and font-metric asymmetry, tight
       enough that a genuinely off-centre stack fails. */
    return { ok: Math.abs(off) <= 12,
             detail: 'stack centre=' + Math.round(stackCentre) +
                     ' viewport centre=' + Math.round(vh / 2) +
                     ' off by ' + Math.round(off) + 'px' };
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

  check('eyebrow and supporting line are gone', function () {
    /* Both were removed at the client's request: the red GRADE-I eyebrow
       was disliked, and the hero is meant to carry only the headline and
       the two CTAs. This is a regression guard, not a layout assertion -
       an earlier revision of this file asserted the OPPOSITE, so without
       this a stale revert would silently reinstate them. */
    var problems = [];
    if (document.querySelector('#aCqA2TkE7 .hero-eyebrow')) problems.push('.hero-eyebrow still present');
    if (document.querySelector('#aCqA2TkE7 .hero-sub')) problems.push('.hero-sub still present');
    return { ok: problems.length === 0,
             detail: problems.length ? problems.join('; ') : 'both removed' };
  });

  check('headline is the dominant element on the page', function () {
    if (!atRequiredViewport) return { ok: false, detail: PRECONDITION_DETAIL };
    var h1 = document.querySelector('#aCqA2TkE7 .hero-title');
    if (!h1) return { ok: false, detail: 'no .hero-title' };
    var size = parseFloat(getComputedStyle(h1).fontSize);
    /* 72px floor at 1280x720. The previous headline rendered around 51px;
       the brief was "larger, it is the main statement". A floor rather than
       an exact value so the size can stay fluid via clamp(). */
    return { ok: size >= 72,
             detail: 'font-size=' + Math.round(size) + 'px (floor 72px at this viewport)' };
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

  /* The logo rail is aligned on the chat widget by CSS alone: bottom:34px
     plus half of its 44px height puts its midpoint 56px above the viewport
     bottom, which is where the widget's midpoint sits.

     This asserts the alignment WITHOUT the entry transform, because
     getBoundingClientRect() includes transforms and .hero-clients carries
     hero-fade-up — whose animation-fill-mode: both pins it at
     translateY(18px) through the entry delay. A script that measures the
     raw rect during that window reads the animation as an 18px layout
     error; correcting it lands the rail 18px high until the transform
     reaches 0, at which point the correction is undone and the rail visibly
     drops. That regression shipped once. The inline-style half of this
     check is what catches it: if anything is writing `bottom` onto the
     element at runtime, the alignment is being driven by measurement rather
     than by CSS, and it is only ever one mistimed pass from jumping. */
  check('logo rail aligned by CSS, not corrected at runtime', function () {
    var rail = document.querySelector('#aCqA2TkE7 .hero-clients');
    var widget = document.getElementById('glass-ai-widget-host');
    if (!rail) return { ok: false, detail: '.hero-clients not found' };
    if (!widget) return { ok: false, detail: 'chat widget absent — cannot verify alignment' };

    var inline = rail.style.bottom;
    if (inline) {
      return { ok: false, detail: 'inline bottom=' + inline + ' — rail is being positioned by script' };
    }

    var railMid = layoutMid(rail);
    var wr = widget.getBoundingClientRect();
    var widgetMid = wr.top + wr.height / 2;
    var off = Math.abs(railMid - widgetMid);
    return {
      ok: off <= 1,
      detail: 'rail mid=' + railMid.toFixed(1) + '; widget mid=' + widgetMid.toFixed(1) +
              '; off by ' + off.toFixed(1) + 'px'
    };
  });

  function record(name, ok, detail) {
    results.push({ name: name, ok: ok, detail: detail || '' });
  }

  /* ---------- async section ---------- */

  /* The check above catches a script-written `bottom` only if one has
     already been written by the time the harness runs. This one provokes
     the write: it scrolls the hero fully off-screen, fires the resize the
     sync path listens for, and asserts the rail is still positioned by
     CSS afterwards.

     This is the exact sequence behind the rail appearing over other
     sections: a sync pass at scrollY=S compared the rail (document
     coordinates — it scrolls away with the hero) against the fixed chat
     widget (viewport coordinates), read the difference as a layout error
     of exactly -S, and wrote it into `bottom`. One resize at 4000px put
     the rail 3966px below the hero — over the PROJECTS block — and it
     stayed there for the rest of the visit. A mistimed pass is the same
     failure without any window resize: this page loads ~30 images and
     streams video, so the `load`-event pass can land seconds in, after
     the user has already scrolled. */
  return Promise.resolve()
    .then(function () {
      var rail = document.querySelector('#aCqA2TkE7 .hero-clients');
      var widget = document.getElementById('glass-ai-widget-host');
      if (!rail) {
        record('rail survives a sync pass while scrolled', false, 'no .hero-clients');
        return;
      }
      if (!widget) {
        /* Without the widget the sync path returns before measuring, so
           this scenario cannot fail — but nor has it been exercised. Flag
           it rather than pass it. */
        record('rail survives a sync pass while scrolled', false,
          'chat widget absent — the scrolled-sync scenario did not run');
        return;
      }

      var root = document.documentElement;
      var prevBehavior = root.style.scrollBehavior;
      var prevScroll = window.scrollY;
      root.style.scrollBehavior = 'auto';
      window.scrollTo(0, Math.min(4000, root.scrollHeight - window.innerHeight - 100));
      window.dispatchEvent(new Event('resize'));

      /* The resize handler debounces at 120ms; 400ms covers it plus a
         frame or two of layout. */
      return new Promise(function (res) { setTimeout(res, 400); })
        .then(function () {
          var inline = rail.style.bottom;
          var hr = document.getElementById('aCqA2TkE7').getBoundingClientRect();
          var rr = rail.getBoundingClientRect();
          var inHero = rr.top >= hr.top - 1 && rr.bottom <= hr.bottom + 1;
          record('rail survives a sync pass while scrolled',
            !inline && inHero,
            (inline ? 'inline bottom=' + inline + ' written at scrollY=' + window.scrollY
                    : 'no inline bottom') +
            (inHero ? '; rail still inside the hero' : '; rail has LEFT the hero (top=' +
              Math.round(rr.top - hr.top) + 'px into the section below)'));

          window.scrollTo(0, prevScroll);
          root.style.scrollBehavior = prevBehavior;
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

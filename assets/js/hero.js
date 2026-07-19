/* UGCC hero motion — vanilla ports of the React Bits effects used in the
   spec (Split Text, Blur Text). No dependencies. Runs after v2.js.

   Adds .hero-motion to <html> and sets per-element animation delays. All
   the animation itself lives in hero.css. If the user prefers reduced
   motion this does nothing at all, so the hero renders fully visible and
   static - by construction, not by override. */
(function () {
  'use strict';

  var hero = document.getElementById('aCqA2TkE7');
  if (!hero) return;

  /* ---------- keep --header-height honest ----------
     main.css seats the first block under the header with a matched pair:
       padding-top: var(--header-height)
       margin-top:  calc(-1 * var(--header-height))
     The builder bakes 123px into the section inline, but the header does
     not actually render at 123px - and its real height moves whenever the
     nav changes (it is currently ~118px after the nav rework, and was
     117.3px before it). Any mismatch offsets the hero vertically, which is
     what let a 6px sliver of the next section show under it.

     hero.css carries a static fallback, but a hardcoded number goes stale
     the moment anyone touches the header. Measure the real thing instead.
     This runs BEFORE the reduced-motion guard on purpose: it is layout
     correctness, not motion, and must apply either way. */
  function syncHeaderHeight() {
    var header = document.querySelector('header.block-header');
    if (!header) return;
    var h = header.getBoundingClientRect().height;
    if (!h) return;
    var prop = window.matchMedia('(max-width: 920px)').matches
      ? '--header-height-mobile'
      : '--header-height';
    hero.style.setProperty(prop, h + 'px', 'important');
  }

  /* ---------- the logo rail is positioned by CSS, on purpose ----------
     hero.css bottom:34px puts the rail's midpoint 56px above the viewport
     bottom, which is where the chat widget's fixed midpoint sits. A
     syncRailToWidget() used to re-derive that alignment at runtime by
     measuring both and nudging `bottom` by the difference. It is gone, and
     must not come back in that shape: it compared the rail (document
     coordinates — it scrolls away with the hero) against the widget
     (viewport coordinates — position:fixed), so any pass that ran while
     the page was scrolled read the scroll offset as a layout error and
     wrote it into `bottom`, tearing the rail out of the hero and pinning
     it over whatever section was on screen. Every trigger it had could
     fire while scrolled: `load` lands seconds in on this image-heavy
     page, and resize fires on desktop window drags and every mobile
     URL-bar collapse. Its first bug (the 18px entry-transform misread,
     see c5f3b30) came from the same root: measuring a live page and
     writing the reading into layout.

     If the widget's offset ever changes, change bottom:34px in hero.css.
     tools/hero-check.js asserts the alignment at rest AND that nothing
     writes an inline `bottom` — including after a resize while scrolled —
     so a stale CSS value or a reintroduced sync both fail the harness. */

  syncHeaderHeight();
  /* Fonts and the nav settle late, and the header's height moves with
     them, so re-measure at the same points the rail sync used to. */
  window.addEventListener('load', syncHeaderHeight);
  setTimeout(syncHeaderHeight, 600);
  setTimeout(syncHeaderHeight, 1800);

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(syncHeaderHeight, 120);
  }, { passive: true });

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* Split Text: wrap each word in a span, preserving the whitespace between
     them as real text nodes so the <h1>'s accessible name is unchanged.
     Words, not characters - a character cascade on a headline this size
     reads as busy and is worse for screen readers for less payoff. */
  var title = hero.querySelector('.hero-title');
  var words = [];
  if (title) {
    var parts = title.textContent.split(/(\s+)/);
    title.textContent = '';
    parts.forEach(function (part) {
      if (part === '') return;
      if (/^\s+$/.test(part)) {
        title.appendChild(document.createTextNode(part));
        return;
      }
      var span = document.createElement('span');
      span.className = 'hero-word';
      span.textContent = part;
      title.appendChild(span);
      words.push(span);
    });
  }

  function delay(el, ms) {
    if (el) el.style.animationDelay = ms + 'ms';
  }

  /* No eyebrow to lead with any more, so the headline opens the sequence:
     word by word, then the CTAs, then the service strip. */
  words.forEach(function (w, i) {
    delay(w, 80 + i * 60);
  });

  var afterWords = 80 + words.length * 60;
  delay(hero.querySelector('.hero-cta'), afterWords + 120);

  /* The three service cards were replaced by the client logo rail, which
     fades in as one band rather than as staggered items - the rail has its
     own continuous marquee, so staggering its contents on entry would read
     as two competing motions. */
  delay(hero.querySelector('.hero-clients'), afterWords + 240);

  document.documentElement.classList.add('hero-motion');
})();

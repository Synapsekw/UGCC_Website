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

  /* ---------- line the logo rail up with the chat widget ----------
     The brief is that the rail sits "in line with the chat icon". That
     widget is injected by a third-party script, is position:fixed against
     the viewport bottom, and owns its own offset - so hardcoding a matching
     value in CSS would go stale the moment the widget changes.

     The hero spans the full viewport, so at scroll top its bottom edge and
     the viewport's coincide: the rail's offset from the hero's bottom that
     puts the two midpoints on one line is
       (viewportHeight - widgetMidpoint) - railHeight / 2.
     Falls back to the CSS value when the widget is absent. */
  function syncRailToWidget() {
    var rail = hero.querySelector('.hero-clients');
    var widget = document.getElementById('glass-ai-widget-host');
    if (!rail || !widget) return;
    var wr = widget.getBoundingClientRect();
    var rr = rail.getBoundingClientRect();
    if (!wr.height || !rr.height) return;

    /* Measure the error and correct it, rather than computing an offset
       from the viewport. The rail's containing block is the builder's
       .block-layout, whose padding box does NOT coincide with the section
       box - an analytically derived `bottom` lands ~18px out. Nudging by
       the observed delta is correct whatever the containing block turns
       out to be, and converges in one pass because the relationship is
       linear. Increasing `bottom` moves the rail up. */
    var widgetMid = wr.top + wr.height / 2;
    var railMid = rr.top + rr.height / 2;
    var delta = railMid - widgetMid;
    if (Math.abs(delta) < 0.5) return;

    var current = parseFloat(getComputedStyle(rail).bottom);
    if (isNaN(current)) return;
    rail.style.bottom = (current + delta) + 'px';
  }

  function syncLayout() {
    syncHeaderHeight();
    syncRailToWidget();
  }

  syncLayout();
  /* The widget script may inject after us, so re-run once it settles. */
  window.addEventListener('load', syncLayout);
  setTimeout(syncLayout, 600);
  setTimeout(syncLayout, 1800);

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(syncLayout, 120);
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

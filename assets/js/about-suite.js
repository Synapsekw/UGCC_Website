/* UGCC About-suite section reveals. Dependency-free, ES5.

   The homepage equivalent, sections.js, cannot be reused here: it queries two
   hardcoded homepage block ids (#BCClZ9bf3, #u7vIc0iRh) and returns early on
   any other page. It also depends on hero.js to add .hero-motion, and hero.js
   is likewise index-only — it opens by looking up #aCqA2TkE7 and returns. So
   the five About-family pages had no way to satisfy either gate. This file
   supplies both for those pages, against the same contract about-suite.css
   already implements, so no CSS changes.

   Contract (see docs/superpowers/specs/2026-07-20-v2-design-system.md):
     - .hero-motion on <html>, only when reduced motion is NOT requested, so
       the calm path is static by construction rather than by override.
     - .v2-reveal on <html>, added only once targets are found and an observer
       is actually installed.
     - .is-in on each element as it intersects, threshold 0.2, then unobserve.
     - inline --i integer stagger, read by the animation-delay rule.

   Opt-in by construction, matching sections.js: the hiding rules in
   about-suite.css are scoped to .hero-motion.v2-reveal, and BOTH classes are
   added here. If this script fails to load, or IntersectionObserver is
   missing, nothing is ever set to opacity 0 and the page is simply visible.
   The inverse — hiding in CSS and revealing in JS — fails to a blank page. */
(function () {
  'use strict';

  var root = document.documentElement;

  /* matchMedia is guarded: the reduced-motion query is the one thing that
     must not throw on an old engine, because throwing here would leave the
     page un-gated rather than merely un-animated. */
  var reduced = false;
  try {
    reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) { reduced = false; }
  if (reduced) return;

  if (!('IntersectionObserver' in window)) return;

  /* Exactly the component selectors that are hidden by a reveal block. Kept as
     one list so the stylesheets can be diffed against it by eye; if a
     component is added to a stylesheet's reveal block it must be added
     here too, or it will hide and never come back.

     The first seven live in about-suite.css. .bl-tile lives in
     pages/business-lines.css and is inert on every other page, since none of
     them contains one. */
  var SELECTOR = [
    '.as-head',
    '.as-prose',
    '.as-card',
    '.as-ledger__row',
    '.as-acc',
    '.as-stat',
    '.as-quote',
    '.bl-tile'
  ].join(',');

  var targets = document.querySelectorAll(SELECTOR);
  if (!targets.length) return;

  root.classList.add('hero-motion');

  /* The stagger index is positional WITHIN a parent, not across the document:
     a global counter would give the fourth card on the page a 180ms delay
     even when it is the first card in its own grid, so a group low on the
     page would visibly trickle in. Counting per parent means every group
     starts its stagger at zero. Only the four grid-like components carry a
     delay rule in CSS; setting --i on the others is harmless and keeps this
     loop single-pass. */
  var counters = [];
  var parents = [];
  Array.prototype.forEach.call(targets, function (el) {
    var p = el.parentNode;
    var idx = parents.indexOf(p);
    if (idx === -1) { parents.push(p); counters.push(0); idx = parents.length - 1; }
    el.style.setProperty('--i', counters[idx]);
    counters[idx] += 1;
  });

  root.classList.add('v2-reveal');

  /* Two thresholds, not the contract's bare 0.2, because 0.2 is unreachable
     for an element taller than five viewports: the ratio is measured against
     the ELEMENT's own box, so a 5000px block in a 900px window peaks at 0.18
     and the callback never fires — the block would hide and stay hidden.
     The homepage can use a bare 0.2 because it only ever observes short rows;
     here .as-prose wraps CSR's full accordion body and .as-ledger__row can
     run long on a narrow screen.

     So: fire at 0.2 as specified for anything that can reach it, and for
     anything that cannot, fall back to "any part of it is on screen". The 0
     entry is what makes that second case observable at all. */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var tallerThanView = e.boundingClientRect.height > window.innerHeight * 5;
      if (e.intersectionRatio < 0.2 && !tallerThanView) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { threshold: [0, 0.2] });

  Array.prototype.forEach.call(targets, function (t) { io.observe(t); });

  /* Fail-safe. Everything above is opt-in — nothing hides until this script
     has decided to observe — but once the gate classes are on, the content is
     invisible until the observer actually delivers. If it never does, the page
     reads as blank, which is a far worse outcome than an unanimated page.

     IntersectionObserver does not deliver in a hidden document, and there are
     other ways to end up with an installed-but-silent observer (bfcache
     restores, printing from a background tab, engine bugs). So: if not one
     single target has been revealed a few seconds in, conclude the observer is
     not working and drop `.v2-reveal` from <html>. The hide rule requires BOTH
     `.hero-motion` and `.v2-reveal`, so removing one un-hides everything at
     once, permanently, with no further work.

     Deliberately NOT gated on visibilityState: in a hidden tab this fires
     early and simply shows the content, and the only thing lost is an
     animation nobody was there to watch. Showing too eagerly is the safe
     direction to fail in.

     One target revealing is enough to prove the observer works — the first
     block sits near the top of every one of these pages and intersects on
     load, so "zero revealed" is a reliable signal of breakage rather than of
     a user who simply has not scrolled yet. */
  window.setTimeout(function () {
    for (var i = 0; i < targets.length; i++) {
      if (targets[i].classList.contains('is-in')) return;
    }
    io.disconnect();
    root.classList.remove('v2-reveal');
  }, 4000);
}());

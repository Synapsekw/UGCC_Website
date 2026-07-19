/* UGCC homepage gallery rail — scroll-linked advance.
   ES5, no dependencies, no build step.

   The rail is a plain overflow-x:auto region and is fully usable without this
   file. All this does is map the section's progress across the viewport onto
   the rail's scrollLeft, so a visitor scrolling the page normally is walked
   through all fifteen photographs.

   Driving scrollLeft rather than a transform is deliberate: page-driven motion
   and user dragging then act on the same value and compose, instead of
   fighting each other.

   WCAG 2.2.2 does not apply here — nothing moves unless the user scrolls. */
(function () {
  'use strict';

  function init() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var rails = document.querySelectorAll('.v2-rail');
    Array.prototype.forEach.call(rails, function (rail) {
      var vp = rail.querySelector('.v2-rail__viewport');
      if (!vp) return;

      var taken = false;    /* the user has taken hold; stop driving, for good */
      var ticking = false;

      function release() {
        taken = true;
        rail.setAttribute('data-user-scrolled', 'true');
      }

      vp.addEventListener('pointerdown', release);
      vp.addEventListener('touchstart', release, { passive: true });
      vp.addEventListener('focusin', release);
      vp.addEventListener('wheel', function (e) {
        /* Only a deliberate horizontal gesture counts. A normal vertical
           wheel over the rail is the visitor scrolling the page, not
           grabbing the rail. */
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) release();
      }, { passive: true });

      function apply() {
        ticking = false;
        if (taken) return;

        var r = rail.getBoundingClientRect();
        var span = window.innerHeight + r.height;
        if (span <= 0) return;

        var max = vp.scrollWidth - vp.clientWidth;
        if (max <= 0) return;      /* everything already fits; nothing to drive */

        var p = (window.innerHeight - r.top) / span;
        if (p < 0) p = 0;
        if (p > 1) p = 1;

        vp.scrollLeft = p * max;
      }

      function onScroll() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(apply);
      }

      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      apply();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

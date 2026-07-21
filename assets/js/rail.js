/* UGCC homepage gallery rail — autoplay control and handover.
   ES5, no dependencies, no build step.

   The drift itself is a CSS keyframe (see rail.css) so it runs on the
   compositor. Nothing here animates anything; this file only does the two
   things CSS cannot:

     1. The pause/resume toggle. WCAG 2.2.2 requires a pause mechanism for
        content that moves automatically for more than five seconds, available
        to every user. Hover and focus pausing do not satisfy it — a touch user
        has no hover. This control is the reason the autoplay is shippable.

     2. Handover. The moment the visitor grabs the rail, the drift freezes at
        exactly where it had reached and the rail becomes an ordinary scrollable
        region for the rest of the visit. That conversion is the whole trick:
        the animation positions the track with a transform, native scrolling
        positions it with scrollLeft, and the two cannot both be in charge. So
        we read the transform off, clear it, and write the equivalent
        scrollLeft — visually identical, mechanically completely different.

   The rail is fully usable with this file deleted: it still drifts, still
   pauses on hover, and is still overflow-x: auto so it can be dragged. What is
   lost without it is the touch-accessible pause and the clean handover. */
(function () {
  'use strict';

  /* Horizontal offset currently applied to the track by the drift animation.
     getComputedStyle resolves the running animation to a matrix, so this reads
     the live position mid-flight rather than the keyframe's endpoint.

     matrix(a, b, c, d, tx, ty)                    -> tx is index 4
     matrix3d(m11 ... m41, m42, m43, m44)          -> tx is index 12 */
  function currentTranslateX(el) {
    var t = window.getComputedStyle(el).transform;
    if (!t || t === 'none') return 0;
    var open = t.indexOf('(');
    var parts = t.slice(open + 1, t.lastIndexOf(')')).split(',');
    var idx = t.slice(0, open) === 'matrix3d' ? 12 : 4;
    return parseFloat(parts[idx]) || 0;
  }

  function init() {
    var rails = document.querySelectorAll('.v3-rail');

    Array.prototype.forEach.call(rails, function (rail) {
      var vp = rail.querySelector('.v3-rail__viewport');
      var track = rail.querySelector('.v3-rail__track');
      var btn = rail.querySelector('.v3-rail__toggle');
      if (!vp || !track) return;

      var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      /* Nothing is drifting under reduced motion, so there is nothing to pause
         and nothing to hand over. The rail is already a scrollable region. */
      if (reduced) return;

      var manual = false;

      function handOver() {
        if (manual) return;
        manual = true;

        var dx = currentTranslateX(track);   /* negative: the track has moved left */

        /* Order matters. Set the attribute first so the stylesheet drops the
           animation, then clear the inline transform, then adopt the equivalent
           scroll position. Doing it the other way round lets one frame render
           with neither transform nor scrollLeft applied — a visible jump back
           to the first card. */
        rail.setAttribute('data-manual', 'true');
        track.style.transform = 'none';
        vp.scrollLeft = -dx;
      }

      vp.addEventListener('pointerdown', handOver);
      vp.addEventListener('touchstart', handOver, { passive: true });
      vp.addEventListener('focusin', handOver);
      vp.addEventListener('wheel', function (e) {
        /* Only a deliberate horizontal gesture counts. A vertical wheel over
           the rail is the visitor scrolling the page, not grabbing the rail. */
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) handOver();
      }, { passive: true });

      if (!btn) return;

      btn.addEventListener('click', function () {
        var paused = rail.getAttribute('data-paused') === 'true';
        var next = !paused;
        rail.setAttribute('data-paused', next ? 'true' : 'false');
        btn.setAttribute('aria-pressed', next ? 'true' : 'false');
        btn.setAttribute('aria-label',
          next ? 'Resume the moving gallery' : 'Pause the moving gallery');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

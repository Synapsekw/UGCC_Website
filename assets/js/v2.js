/* UGCC V2.0 enhancement script — header scroll state + staggered reveals.
   Runs after main.js; purely additive. */
(function () {
  'use strict';

  /* ---------- header: solid navy once the page is scrolled ---------- */
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      document.documentElement.classList.toggle('v2-scrolled', window.scrollY > 24);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- staggered reveals ----------
     The builder's reveal CSS reads --user-animation-delay for its
     transition-delay. Give siblings inside the same container an
     incremental delay so groups cascade instead of popping at once. */
  var groups = new Map();
  document.querySelectorAll('.transition').forEach(function (el) {
    var parent = el.parentElement;
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent).push(el);
  });
  groups.forEach(function (els) {
    if (els.length < 2) return;
    els.forEach(function (el, i) {
      var delay = Math.min(60 + i * 90, 510);
      el.style.setProperty('--user-animation-delay', delay + 'ms');
    });
  });
})();

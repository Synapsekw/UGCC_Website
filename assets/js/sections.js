/* UGCC homepage section reveals. Dependency-free, ES5.

   Gated on .hero-motion, which hero.js adds to <html> only when the user has
   NOT requested reduced motion. So the reduced-motion path is static by
   construction rather than by override.

   This file also adds .v3-reveal, and the hiding rules in sections.css are
   scoped to it. That makes the reveal opt-IN: if this script fails to load,
   or IntersectionObserver is unavailable, nothing is ever set to opacity 0
   and the content is simply visible. The alternative - hiding in CSS and
   revealing in JS - fails to a blank page. */
(function () {
  'use strict';

  var root = document.documentElement;
  if (!root.classList.contains('hero-motion')) return;
  if (!('IntersectionObserver' in window)) return;

  var targets = [];

  var about = document.querySelector('#BCClZ9bf3 .about-stack');
  if (about) targets.push(about);

  var head = document.querySelector('#u7vIc0iRh .wr-head');
  if (head) targets.push(head);

  var rows = document.querySelectorAll('#u7vIc0iRh .wr-row');
  Array.prototype.forEach.call(rows, function (row, i) {
    /* Read by the animation-delay rule in sections.css. Set inline rather
       than in CSS because the stagger index is positional. */
    row.style.setProperty('--i', i);
    targets.push(row);
  });

  if (!targets.length) return;

  root.classList.add('v3-reveal');

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.2 });

  targets.forEach(function (t) { io.observe(t); });
}());

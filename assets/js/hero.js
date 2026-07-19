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

  /* Eyebrow first, then the headline word by word, then the supporting
     line, CTAs and finally the service strip. */
  delay(hero.querySelector('.hero-eyebrow'), 80);

  words.forEach(function (w, i) {
    delay(w, 260 + i * 60);
  });

  var afterWords = 260 + words.length * 60;
  delay(hero.querySelector('.hero-sub'), afterWords + 60);
  delay(hero.querySelector('.hero-cta'), afterWords + 180);

  var services = hero.querySelectorAll('.hero-service');
  Array.prototype.forEach.call(services, function (s, i) {
    delay(s, afterWords + 300 + i * 110);
  });

  document.documentElement.classList.add('hero-motion');
})();

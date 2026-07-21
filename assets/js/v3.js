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
      document.documentElement.classList.toggle('v3-scrolled', window.scrollY > 24);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- background videos: respect reduced motion ----------
     Pause hero/section background videos for users who prefer reduced
     motion; the poster frame stays visible. */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('video.block-background__image').forEach(function (v) {
      v.removeAttribute('autoplay');
      v.pause();
    });
  }

  /* ---------- accordions (CSR page etc.) ---------- */
  document.querySelectorAll('.v3-acc__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var acc = btn.closest('.v3-acc');
      var open = acc.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

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

/* ---------- deferred background video ----------
   The three background videos total 26.7MB. The homepage one was preload=auto
   and autoplay, so it competed with the LCP image on every visit; the About
   pair were preload=metadata but still fetched in full to satisfy autoplay.

   Their markup now carries data-src instead of src plus preload="none", so
   nothing is requested until this runs. Loading waits for window load — the
   LCP is never in contention — and then for the element to come within a
   screen height of the viewport, so the two About videos cost nothing unless
   the visitor scrolls to them.

   Proximity is measured with getBoundingClientRect on scroll rather than with
   IntersectionObserver. IO is the tidier API, but it does not fire at all in
   some headless/embedded browsers, and a video that silently never loads is a
   worse failure than a slightly less elegant scroll handler. rAF throttling
   keeps the handler cheap, and it unbinds once every video has loaded.

   Without JavaScript the poster remains, which is a still of the same footage
   — a static hero rather than a broken one. */
(function () {
  var pending = [].slice.call(document.querySelectorAll('video[data-src]'));
  if (!pending.length) return;

  function load(video) {
    if (video.dataset.loaded) return;
    video.dataset.loaded = '1';
    video.src = video.dataset.src;
    video.removeAttribute('data-src');
    video.load();
    if (!video.hasAttribute('autoplay')) return;

    /* autoplay does not re-trigger for a src assigned after parse, so play()
       has to be called by hand. Calling it once is not enough: immediately
       after load() the element may not have enough data yet and the promise
       rejects, leaving a permanently frozen poster. Retry on canplay, and
       once more on the first user interaction in case the browser is
       withholding autoplay permission. */
    var tries = 0;
    function attempt() {
      if (!video.paused || tries > 3) return;
      tries++;
      var p = video.play();
      if (p && p.catch) p.catch(function () { /* poster stays; retried below */ });
    }
    video.addEventListener('canplay', attempt);
    video.addEventListener('loadeddata', attempt);
    ['pointerdown', 'touchstart', 'keydown'].forEach(function (evt) {
      document.addEventListener(evt, attempt, { once: true, passive: true });
    });
    attempt();
  }

  var ticking = false;

  function sweep() {
    ticking = false;
    var limit = window.innerHeight * 2;   // one screen of runway
    pending = pending.filter(function (v) {
      if (v.getBoundingClientRect().top < limit) { load(v); return false; }
      return true;
    });
    if (!pending.length) stop();
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(sweep);
  }

  var timer = null;

  function stop() {
    document.removeEventListener('scroll', onScroll, true);
    window.removeEventListener('resize', onScroll);
    if (timer) { clearInterval(timer); timer = null; }
  }

  function start() {
    // Capture phase on document, not window: this page scrolls inside a
    // container, and a window-only listener never hears those scrolls.
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onScroll, { passive: true });
    // Safety net. If no scroll event is ever observable — an embedded browser,
    // an unusual scroll container, a synthetic scroll — a video that never
    // loads is a visible defect, so sweep on a slow timer too. It costs one
    // getBoundingClientRect per second and stops as soon as all have loaded.
    timer = setInterval(sweep, 1000);
    sweep();
  }

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
})();

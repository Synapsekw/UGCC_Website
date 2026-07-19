/* Self-contained interactivity for the static UGCC site.
   Replaces the Hostinger builder's Vue hydration (mobile menu + hero slideshow).
   All class names match the original builder CSS, so animations are identical. */
(function () {
  'use strict';

  /* ---------- Mobile burger menu ---------- */
  document.querySelectorAll('.block-header-layout-mobile').forEach(function (header) {
    var burger = header.querySelector('.burger');
    var dropdown = header.querySelector('.block-header-layout-mobile__dropdown');
    if (!burger || !dropdown) return;

    burger.addEventListener('click', function () {
      var open = burger.classList.toggle('burger--open');
      dropdown.classList.toggle('block-header-layout-mobile__dropdown--open', open);
    });

    /* Close the menu when a nav link is tapped */
    dropdown.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        burger.classList.remove('burger--open');
        dropdown.classList.remove('block-header-layout-mobile__dropdown--open');
      }
    });
  });

  /* ---------- Appear-on-scroll animations ----------
     The builder hides .transition elements (opacity 0 / translated) until it
     sets data-animation-state="active" when they enter the viewport. */
  var animated = document.querySelectorAll('.transition, [data-animation-role]');
  function activate(el) {
    el.setAttribute('data-animation-state', 'active');
    if (el.getAttribute('data-animation-role') === 'image') el.classList.add('loaded');
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          activate(en.target);
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -5% 0px' });
    animated.forEach(function (el) { io.observe(el); });
  } else {
    animated.forEach(activate);
  }

  /* ---------- Hero slideshow (home page) ---------- */
  document.querySelectorAll('.slideshow').forEach(function (show) {
    var slides = Array.prototype.slice.call(show.querySelectorAll('.slide'));
    if (slides.length < 2) return;

    var dots = Array.prototype.slice.call(show.querySelectorAll('.slideshow__dots .dot'));
    var prevBtn = show.querySelector('.slideshow-nav-button--left');
    var nextBtn = show.querySelector('.slideshow-nav-button--right');
    var current = 0;
    var INTERVAL = 3000; /* matches builder autoplayInterval: 3s */
    var timer = null;

    show.classList.add('js-init');
    /* The builder server-renders every slide except the first with an inline
       display:none (Vue v-show). Clear it — visibility is opacity-driven here. */
    slides.forEach(function (s) { s.style.removeProperty('display'); });

    function render() {
      slides.forEach(function (s, i) {
        s.classList.toggle('slide--active', i === current);
      });
      dots.forEach(function (d, i) {
        d.classList.toggle('dot--current', i === current);
      });
    }

    function go(i) {
      current = (i + slides.length) % slides.length;
      render();
    }

    function restart() {
      if (timer) clearInterval(timer);
      timer = setInterval(function () { go(current + 1); }, INTERVAL);
    }

    if (nextBtn) nextBtn.addEventListener('click', function () { go(current + 1); restart(); });
    if (prevBtn) prevBtn.addEventListener('click', function () { go(current - 1); restart(); });
    dots.forEach(function (d, i) {
      d.addEventListener('click', function () { go(i); restart(); });
    });

    render();
    restart();
  });
})();

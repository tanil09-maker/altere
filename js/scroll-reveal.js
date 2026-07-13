/* ============================================================
   ALTERE — Scroll reveal
   Vanilla, IntersectionObserver-based (no scroll listeners).
   Slow, weighty, luxe — transform + opacity only.

   Markup:
     data-reveal="up|fade|left|right|draw"   single element
     data-reveal-delay="120"                 delay in ms
     data-reveal-group[="up|left|..."]        container: its direct children
                                              reveal, auto-staggered
     data-reveal-stagger="100"                per-child stagger in ms (group)

   Rules:
   - Elements already in view at load are shown instantly (no flash, no anim).
   - prefers-reduced-motion → everything visible instantly, no animation.
   - No-JS → nothing is hidden (the hidden state is gated behind .reveal-ready,
     which only this script adds).
   ============================================================ */
(function () {
  'use strict';

  var docEl = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Expand [data-reveal-group] containers into staggered per-child reveals. */
  function expandGroups() {
    var groups = document.querySelectorAll('[data-reveal-group]');
    Array.prototype.forEach.call(groups, function (group) {
      var variant = group.getAttribute('data-reveal-group') || 'up';
      if (!variant) variant = 'up';
      var step = parseInt(group.getAttribute('data-reveal-stagger') || '90', 10);
      var kids = group.children, i, k, base = 0;
      base = parseInt(group.getAttribute('data-reveal-base') || '0', 10);
      for (i = 0; i < kids.length; i++) {
        k = kids[i];
        if (!k.hasAttribute('data-reveal')) k.setAttribute('data-reveal', variant);
        if (!k.hasAttribute('data-reveal-delay')) k.setAttribute('data-reveal-delay', String(base + i * step));
      }
    });
  }

  function showInstant(el) { el.classList.add('is-revealed', 'reveal-static'); }

  function run() {
    expandGroups();
    docEl.classList.add('reveal-ready');  // enables the CSS hidden state

    var els = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
    if (!els.length) return;

    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(showInstant);
      return;
    }

    var vh = window.innerHeight || document.documentElement.clientHeight;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var delay = parseInt(el.getAttribute('data-reveal-delay') || '0', 10);
        if (delay) el.style.transitionDelay = (delay / 1000) + 's';
        el.classList.add('is-revealed');
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    els.forEach(function (el) {
      // Already (even partly) in view at load → show instantly, no animation.
      var r = el.getBoundingClientRect();
      var inView = r.top < vh * 0.92 && r.bottom > vh * 0.04;
      if (inView) showInstant(el);
      else io.observe(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();

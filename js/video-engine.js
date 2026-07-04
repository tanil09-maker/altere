/* ============================================================
   ALTERE — Video Engine
   Handles every video integration on the site:
     1. Hero background loop  — crossfade in on canplay
     2. In-view videos        — play at threshold, pause when out (demo + clips)
     3. Reveal                — opacity 0→1 + scale 1.04→1 for video containers

   Design: vanilla, dependency-free, transform/opacity only.
   Add a new video by dropping the right data-attributes on the markup —
   no code change needed:
     • data-video="hero"                     → hero loop (crossfade)
     • data-video-io [data-io-threshold]     → play/pause on viewport (default 0.35)
     • data-video-reveal                     → cinematic reveal of the container

   Fallbacks (poster-only, no motion):
     • prefers-reduced-motion: reduce
     • navigator.connection.saveData === true
   ============================================================ */
(function () {
  'use strict';

  var docEl = document.documentElement;
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var conn = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
  var SAVE_DATA = !!(conn && conn.saveData);
  var POSTER_ONLY = REDUCED || SAVE_DATA;

  docEl.classList.add('js-video');
  if (POSTER_ONLY) docEl.classList.add('video-poster-only');

  function playSafe(v) {
    var p = v.play();
    if (p && typeof p.catch === 'function') p.catch(function () {});
  }

  /* --- 1. Hero background loop: crossfade over its poster on canplay --- */
  function initHero() {
    var v = document.querySelector('[data-video="hero"]');
    if (!v) return;

    // Poster-only: leave the poster layer visible, never play.
    if (POSTER_ONLY) return;

    var reveal = function () { v.classList.add('is-ready'); };
    if (v.readyState >= 3) reveal();                                  // HAVE_FUTURE_DATA
    else v.addEventListener('canplay', reveal, { once: true });

    // On failure the poster layer stays; just make sure the video stays hidden.
    v.addEventListener('error', function () { v.classList.remove('is-ready'); }, { once: true });

    playSafe(v);
  }

  /* --- 2. In-view videos: play at threshold, pause when out of view --- */
  function initInViewVideos() {
    var vids = Array.prototype.slice.call(document.querySelectorAll('[data-video-io]'));
    vids.forEach(function (v) {
      var threshold = parseFloat(v.getAttribute('data-io-threshold'));
      if (isNaN(threshold)) threshold = 0.35;

      if (POSTER_ONLY) {
        v.classList.add('is-ready');   // clear any fade state; poster remains
        return;
      }
      if (!('IntersectionObserver' in window)) { playSafe(v); return; }

      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && en.intersectionRatio >= threshold) {
            v.classList.add('is-ready');
            playSafe(v);               // preload="none" → this kicks off the fetch
          } else {
            v.pause();
          }
        });
      }, { threshold: [0, threshold] });

      io.observe(v);
    });
  }

  /* --- 3. Reveal: cinematic entrance for video containers --- */
  function initReveals() {
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-video-reveal]'));
    if (!els.length) return;

    if (POSTER_ONLY || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-revealed', 'is-static'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-revealed');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });

    els.forEach(function (el) { io.observe(el); });
  }

  function init() {
    initHero();
    initInViewVideos();
    initReveals();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

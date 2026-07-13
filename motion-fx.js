/* ============================================================
   ALTERE — Motion enhancements (cinematic)
   Progressive, non-blocking. Falls back to CSS if Motion or
   the network is unavailable, and respects reduced-motion.
   ============================================================ */
(function () {
  var root = document.documentElement;
  var M = window.Motion;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // No Motion (CDN blocked) or reduced-motion → let CSS handle it, reveal everything.
  if (!M || reduce) {
    root.classList.remove('pre-motion');
    return;
  }

  var animate = M.animate;
  var stagger = M.stagger;
  var inView  = M.inView;
  var EASE    = [0.22, 1, 0.36, 1];

  /* --- Split a text element into per-letter spans, preserving
         <br> line breaks and keeping words unbreakable. --- */
  function splitChars(el, charClass) {
    var nodes = Array.prototype.slice.call(el.childNodes);
    el.innerHTML = '';
    var chars = [];
    nodes.forEach(function (node) {
      if (node.nodeName === 'BR') { el.appendChild(document.createElement('br')); return; }
      var text = node.textContent;
      text.split(/(\s+)/).forEach(function (token) {
        if (token === '') return;
        if (/^\s+$/.test(token)) { el.appendChild(document.createTextNode(token)); return; }
        var word = document.createElement('span');
        word.className = 'hero-word';
        token.split('').forEach(function (ch) {
          var s = document.createElement('span');
          s.className = charClass;
          s.textContent = ch;
          word.appendChild(s);
          chars.push(s);
        });
        el.appendChild(word);
      });
    });
    return chars;
  }

  function heroReveal() {
    // --- Nav logo: staggered per-letter reveal of "ALTERE" ---
    var logo = document.querySelector('.nav__logo');
    if (logo && !logo.dataset.split) {
      var text = logo.textContent.trim();
      logo.dataset.split = '1';
      logo.setAttribute('aria-label', text);
      logo.innerHTML = text.split('').map(function (c) {
        return '<span class="logo-char" aria-hidden="true">' + c + '</span>';
      }).join('');
      animate('.nav__logo .logo-char',
        { opacity: [0, 1], transform: ['translateY(16px)', 'translateY(0)'] },
        { duration: 0.7, delay: stagger(0.06, { start: 0.15 }), easing: EASE });
    }

    // --- Headline: cinematic per-letter reveal out of blur & depth ---
    var h = document.querySelector('.hero__headline');
    if (h && !h.dataset.split) {
      h.dataset.split = '1';
      var chars = splitChars(h, 'hero-char');
      h.style.opacity = '1';
      chars.forEach(function (c) {
        c.style.opacity = '0';
        c.style.filter = 'blur(18px)';
        c.style.transform = 'scale(1.28) translateY(0.14em)';
      });
      animate(chars,
        { opacity: [0, 1], filter: ['blur(18px)', 'blur(0px)'], transform: ['scale(1.28) translateY(0.14em)', 'scale(1) translateY(0)'] },
        { duration: 1.0, delay: stagger(0.05, { start: 0.35 }), easing: EASE });
    }

    // --- Rest of the hero: orchestrated staggered reveal ---
    var seq = [
      ['.hero__eyebrow',      0.15],
      ['.hero__sub',          0.75],
      ['.search-box',         0.9],
      ['.hero__brands-strip', 1.15],
      ['.hero__scroll-cue',   1.3]
    ];
    seq.forEach(function (item) {
      var el = document.querySelector(item[0]);
      if (!el) return;
      animate(el,
        { opacity: [0, 1], transform: ['translateY(30px)', 'translateY(0)'] },
        { duration: 0.9, delay: item[1], easing: EASE });
    });

    // Clear the guard once the sequence is under way.
    setTimeout(function () { root.classList.remove('pre-motion'); }, 500);
  }

  /* Scroll reveals + section-title reveals are now handled by the dedicated
     vanilla js/scroll-reveal.js (data-reveal). motion-fx only owns the hero
     load-in choreography (nav logo + headline letters + hero elements). */

  function init() {
    heroReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

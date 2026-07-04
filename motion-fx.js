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

  /* --- Big section titles: per-word masked line-wipe on scroll-in --- */
  function titleReveals() {
    var titles = document.querySelectorAll('[data-fx="title"]');
    titles.forEach(function (el) {
      if (el.dataset.split) return;
      el.dataset.split = '1';
      // Wrap each word in an overflow-hidden mask with an inner slider.
      var raw = el.textContent.trim();
      el.innerHTML = '';
      raw.split(/\s+/).forEach(function (word, i, arr) {
        var mask = document.createElement('span');
        mask.className = 'fx-word-mask';
        var inner = document.createElement('span');
        inner.className = 'fx-word';
        inner.textContent = word;
        inner.style.transform = 'translateY(110%)';
        mask.appendChild(inner);
        el.appendChild(mask);
        if (i < arr.length - 1) el.appendChild(document.createTextNode(' '));
      });
      el.style.opacity = '1';
      var stop = inView(el, function () {
        animate(el.querySelectorAll('.fx-word'),
          { transform: ['translateY(110%)', 'translateY(0)'] },
          { duration: 0.9, delay: stagger(0.08), easing: EASE });
        if (typeof stop === 'function') stop();
      }, { margin: '0px 0px -14% 0px' });
    });
  }

  /* --- Cinematic scroll reveals: scale-from-depth (+ optional blur) --- */
  function scrollReveals() {
    if (typeof inView !== 'function') return;
    var targets = document.querySelectorAll('[data-fx="reveal"]');
    targets.forEach(function (el) {
      el.style.opacity = '0';
      el.style.transform = 'scale(0.9) translateY(48px)';
      el.style.filter = 'blur(6px)';
      var stop = inView(el, function () {
        var delay = parseFloat(el.getAttribute('data-fx-delay')) || 0;
        animate(el,
          { opacity: [0, 1], filter: ['blur(6px)', 'blur(0px)'], transform: ['scale(0.9) translateY(48px)', 'scale(1) translateY(0)'] },
          { duration: 1.0, delay: delay, easing: EASE });
        if (typeof stop === 'function') stop();
      }, { margin: '0px 0px -12% 0px' });
    });
  }

  function init() {
    heroReveal();
    titleReveals();
    scrollReveals();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

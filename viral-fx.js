/* ============================================================
   ALTERE — Viral interaction layer
   Parallax depth, 3D tilt, magnetic buttons. Pure vanilla,
   rAF-batched, transform/opacity only. No dependency on the
   Motion CDN, so it survives even if that fails to load.

   Guards:
   - prefers-reduced-motion  → nothing runs
   - pointer: coarse (touch) → hover-only effects (tilt/magnetic) skipped,
                               only cheap scroll parallax remains
   ============================================================ */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  var fine = window.matchMedia('(pointer: fine)').matches;
  var clamp = function (v, min, max) { return v < min ? min : v > max ? max : v; };

  /* ---------------------------------------------------------
     1. HERO PARALLAX — background depth layers (scroll + mouse)
     Only the background moves; the content stays readable and
     never fights the load-in animation.
     --------------------------------------------------------- */
  (function heroParallax() {
    var hero  = document.querySelector('.hero');
    var vwrap = document.querySelector('.hero__video-wrap');
    if (!hero || !vwrap) return;

    vwrap.style.willChange = 'transform';
    vwrap.style.transformOrigin = 'center';

    var sy = 0, mx = 0, my = 0, ticking = false;

    function render() {
      ticking = false;
      var vh = window.innerHeight;
      if (sy > vh + 40) return; // hero fully scrolled away → stop working
      vwrap.style.transform =
        'translate3d(' + (mx * 20) + 'px,' + (sy * 0.15 + my * 20) + 'px,0) scale(1.35)';
    }
    function request() { if (!ticking) { ticking = true; requestAnimationFrame(render); } }

    window.addEventListener('scroll', function () {
      sy = window.scrollY || window.pageYOffset || 0;
      request();
    }, { passive: true });

    if (fine) {
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        mx = clamp(((e.clientX - r.left) / r.width - 0.5) * 2, -1, 1);
        my = clamp(((e.clientY - r.top) / r.height - 0.5) * 2, -1, 1);
        request();
      });
      hero.addEventListener('pointerleave', function () { mx = 0; my = 0; request(); });
    }
    render();
  })();

  /* ---------------------------------------------------------
     1b. SCROLL-DRIVEN "Daily Source" build (desktop layout)
     Original slides in from the left, dupe from the right, and
     the VS badge scales up as the section scrolls into view.
     --------------------------------------------------------- */
  (function dotdScrollBuild() {
    var card = document.querySelector('[data-dotd-build]');
    var section = document.querySelector('.dotd');
    if (!card || !section) return;
    if (!window.matchMedia('(min-width: 769px)').matches) return; // desktop-only (mobile stacks)

    var orig = card.querySelector('.dotd__original');
    var dupe = card.querySelector('.dotd__dupe');
    var vs   = card.querySelector('.dotd__vs');
    var ticking = false;

    function render() {
      ticking = false;
      var r = section.getBoundingClientRect();
      var vh = window.innerHeight;
      var start = vh * 0.92, end = vh * 0.32;
      var p = clamp((start - r.top) / (start - end), 0, 1);
      var e = p * p * (3 - 2 * p); // smoothstep
      if (orig) { orig.style.transform = 'translateX(' + (-72 * (1 - e)) + 'px)'; orig.style.opacity = clamp(e * 1.5, 0, 1); }
      if (dupe) { dupe.style.transform = 'translateX(' + (72 * (1 - e)) + 'px)'; dupe.style.opacity = clamp(e * 1.5, 0, 1); }
      if (vs)   { vs.style.transform = 'translate(-50%,-50%) scale(' + (0.5 + 0.5 * e) + ')'; vs.style.opacity = clamp((e - 0.35) * 3, 0, 1); }
    }
    function req() { if (!ticking) { ticking = true; requestAnimationFrame(render); } }

    // Prime the hidden state, then track scroll.
    if (orig) orig.style.willChange = 'transform, opacity';
    if (dupe) dupe.style.willChange = 'transform, opacity';
    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', req, { passive: true });
    render();
  })();

  /* ---------------------------------------------------------
     2. COUNT-UP numbers (prices / percentages) on scroll-in
     Works on all devices. Preserves prefix/suffix + formatting.
     --------------------------------------------------------- */
  (function countUps() {
    function run(el) {
      var raw = (el.textContent || '').trim();
      var m = raw.match(/^([^\d-]*[-−]?)([\d.,]+)(.*)$/);
      if (!m) return;
      var pre = m[1], numStr = m[2], suf = m[3];
      var decimals = (numStr.split('.')[1] || '').length;
      var grouped = numStr.indexOf(',') > -1;
      var target = parseFloat(numStr.replace(/,/g, ''));
      if (isNaN(target)) return;
      function fmt(n) {
        var s = n.toFixed(decimals);
        if (grouped) s = Number(s).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
        return pre + s + suf;
      }
      var dur = 1100, t0 = null;
      function step(ts) {
        if (!t0) t0 = ts;
        var p = clamp((ts - t0) / dur, 0, 1);
        var e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(target * e);
        if (p < 1) requestAnimationFrame(step); else el.textContent = pre + numStr + suf;
      }
      requestAnimationFrame(step);
    }

    var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { io.unobserve(en.target); run(en.target); }
      });
    }, { threshold: 0.6 }) : null;

    function watch(el) { if (!el) return; if (io) io.observe(el); else run(el); }

    // Static showcase cards: discount badges + match %
    document.querySelectorAll('.results__grid .dupe-card__badge, .results__grid .dupe-card__match span')
      .forEach(watch);

    // Daily Source savings — count up once its value is injected + in view.
    var savings = document.getElementById('dotdSavings');
    if (savings && 'MutationObserver' in window) {
      var mo = new MutationObserver(function () {
        if (savings.textContent.trim()) { mo.disconnect(); watch(savings); }
      });
      mo.observe(savings, { childList: true, characterData: true, subtree: true });
    }
  })();

  /* ---------------------------------------------------------
     3. SEARCH BUTTON ripple — champagne pulse from the tap point
     --------------------------------------------------------- */
  (function ripples() {
    function spawn(e) {
      var b = e.currentTarget;
      var r = b.getBoundingClientRect();
      var size = Math.max(r.width, r.height) * 2;
      var s = document.createElement('span');
      s.className = 'btn-ripple';
      s.style.width = s.style.height = size + 'px';
      s.style.left = (e.clientX - r.left - size / 2) + 'px';
      s.style.top = (e.clientY - r.top - size / 2) + 'px';
      b.appendChild(s);
      setTimeout(function () { s.remove(); }, 700);
    }
    document.querySelectorAll('.search-box__btn, .dotd__btn, .about-page__btn')
      .forEach(function (b) { b.addEventListener('click', spawn); });
  })();

  if (!fine) return; // remaining effects are hover-based — skip on touch

  /* ---------------------------------------------------------
     4. CUSTOM CURSOR — champagne dot that grows on interactive hover
     --------------------------------------------------------- */
  (function customCursor() {
    var dot = document.createElement('div');
    dot.className = 'cursor-dot';
    document.body.appendChild(dot);
    document.documentElement.classList.add('has-cursor');
    var mx = 0, my = 0, dx = 0, dy = 0, running = false, shown = false;

    function loop() {
      dx += (mx - dx) * 0.22;
      dy += (my - dy) * 0.22;
      dot.style.transform = 'translate(' + dx + 'px,' + dy + 'px) translate(-50%,-50%)';
      if (Math.abs(mx - dx) > 0.3 || Math.abs(my - dy) > 0.3) requestAnimationFrame(loop);
      else running = false;
    }
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      if (!shown) { shown = true; dot.classList.add('is-visible'); }
      if (!running) { running = true; requestAnimationFrame(loop); }
    }, { passive: true });
    window.addEventListener('pointerdown', function () { dot.classList.add('is-down'); });
    window.addEventListener('pointerup', function () { dot.classList.remove('is-down'); });
    document.addEventListener('mouseleave', function () { dot.classList.remove('is-visible'); shown = false; });

    var interactive = 'a, button, [role="button"], input, textarea, select, label, ' +
      '.dupe-card, .celeb__card, .filter-btn, .trending__chip, .faq__question, .sort-select__trigger';
    document.addEventListener('pointerover', function (e) {
      if (e.target.closest(interactive)) dot.classList.add('is-hovering');
    });
    document.addEventListener('pointerout', function (e) {
      if (e.target.closest(interactive) && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(interactive)))
        dot.classList.remove('is-hovering');
    });
  })();

  /* ---------------------------------------------------------
     Shared tilt helper — applies a subtle 3D rotation toward
     the cursor. Baseline transform is preserved (e.g. lift).
     --------------------------------------------------------- */
  function makeTilt(el, opts) {
    opts = opts || {};
    var max = opts.max || 6;
    var base = opts.base || '';
    var raf = null, rx = 0, ry = 0;

    function apply() {
      raf = null;
      el.style.transform =
        'perspective(900px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) ' + base;
    }
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;   // -0.5..0.5
      var py = (e.clientY - r.top) / r.height - 0.5;
      ry = clamp(px * max * 2, -max, max);
      rx = clamp(-py * max * 2, -max, max);
      el.style.transition = 'none';
      el.style.setProperty('--gx', (px + 0.5) * 100 + '%');
      el.style.setProperty('--gy', (py + 0.5) * 100 + '%');
      if (!raf) raf = requestAnimationFrame(apply);
    });
    el.addEventListener('pointerleave', function () {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      el.style.transition = '';      // hand back to CSS for a smooth settle
      el.style.transform = '';
    });
  }

  /* ---------------------------------------------------------
     2. UPLOAD ZONE — 3D tilt with a cursor-following highlight
     --------------------------------------------------------- */
  var upload = document.getElementById('uploadArea');
  if (upload) {
    upload.style.setProperty('--gx', '50%');
    upload.style.setProperty('--gy', '50%');
    makeTilt(upload, { max: 7 });
  }

  /* ---------------------------------------------------------
     3. PRODUCT CARD 3D TILT (the share-worthy moment)
     Delegated on the grids so AI-injected cards work too.
     --------------------------------------------------------- */
  function tiltCard(card, e) {
    var r = card.getBoundingClientRect();
    var px = (e.clientX - r.left) / r.width - 0.5;
    var py = (e.clientY - r.top) / r.height - 0.5;
    var ry = clamp(px * 16, -8, 8);   // 1.5x deeper than before
    var rx = clamp(-py * 16, -8, 8);
    card.style.transition = 'none';
    card.style.transform =
      'perspective(1000px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateY(-8px)';
    // Cursor-following light reflection over the image
    card.style.setProperty('--gx', (px + 0.5) * 100 + '%');
    card.style.setProperty('--gy', (py + 0.5) * 100 + '%');
  }
  function resetCard(card) {
    card.style.transition = '';
    card.style.transform = '';
  }

  function wireGrid(grid, cardSelector) {
    if (!grid) return;
    var current = null, raf = null, lastEvt = null;
    grid.addEventListener('pointermove', function (e) {
      var card = e.target.closest(cardSelector);
      if (card !== current) {
        if (current) resetCard(current);
        current = card;
      }
      if (!card) return;
      lastEvt = e;
      if (!raf) raf = requestAnimationFrame(function () { raf = null; if (current && lastEvt) tiltCard(current, lastEvt); });
    });
    grid.addEventListener('pointerleave', function () {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      if (current) { resetCard(current); current = null; }
    });
  }

  wireGrid(document.querySelector('.results__grid'), '.dupe-card');
  wireGrid(document.querySelector('.celeb__grid'), '.celeb__card');
  wireGrid(document.querySelector('.saved-page__grid'), '.saved-card');

  /* ---------------------------------------------------------
     4. MAGNETIC BUTTONS — primary CTAs drift toward the cursor
     --------------------------------------------------------- */
  function makeMagnetic(btn, strength) {
    strength = strength || 0.3;
    var raf = null, tx = 0, ty = 0;
    function apply() { raf = null; btn.style.transform = 'translate(' + tx + 'px,' + ty + 'px)'; }
    btn.addEventListener('pointermove', function (e) {
      var r = btn.getBoundingClientRect();
      tx = clamp((e.clientX - (r.left + r.width / 2)) * strength, -10, 10);
      ty = clamp((e.clientY - (r.top + r.height / 2)) * strength, -8, 8);
      btn.style.transition = 'none';
      if (!raf) raf = requestAnimationFrame(apply);
    });
    btn.addEventListener('pointerleave', function () {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      btn.style.transition = '';
      btn.style.transform = '';
    });
  }

  document.querySelectorAll('.search-box__btn, .dotd__btn, .about-page__btn')
    .forEach(function (b) { makeMagnetic(b); });
})();

/* ============================================================
   ALTERE — Viral interaction layer
   Parallax depth, 3D tilt, magnetic buttons, custom cursor.
   Pure vanilla, rAF-batched, transform/opacity only. No
   dependency on the Motion CDN.

   Performance rules enforced here:
   - Every pointermove handler only stores coordinates; all
     getBoundingClientRect READS are cached on pointerenter and
     all style WRITES happen inside a single rAF → no per-move
     forced reflow (no layout thrashing).
   - GPU compositing via translate3d + will-change (toggled on
     hover so we don't leave permanent compositor layers around).
   - The custom cursor tracks the pointer instantly (1 frame),
     no lerp trailing.

   Guards:
   - prefers-reduced-motion  → nothing runs
   - pointer: coarse (touch) → hover effects skipped
   ============================================================ */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  var fine = window.matchMedia('(pointer: fine)').matches;
  var clamp = function (v, min, max) { return v < min ? min : v > max ? max : v; };

  /* --- Optional frametime logger: add ?perf=1 or localStorage.altere_perf=1 ---
     Logs avg/max frame time during each burst of mouse movement so you can
     measure before/after in the console. */
  (function perfMeter() {
    var on = /[?&]perf=1/.test(location.search);
    try { on = on || localStorage.getItem('altere_perf') === '1'; } catch (e) {}
    if (!on) return;
    var last = performance.now(), frames = 0, sum = 0, max = 0, active = false, idle;
    function tick(now) {
      var dt = now - last; last = now;
      if (active) { frames++; sum += dt; if (dt > max) max = dt; }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    window.addEventListener('pointermove', function () {
      active = true;
      clearTimeout(idle);
      idle = setTimeout(function () {
        if (frames) {
          console.log('[ALTERE perf] avg ' + (sum / frames).toFixed(1) + 'ms (' +
            (1000 / (sum / frames)).toFixed(0) + 'fps), max ' + max.toFixed(1) +
            'ms over ' + frames + ' frames');
        }
        frames = 0; sum = 0; max = 0; active = false;
      }, 500);
    }, { passive: true });
  })();

  /* ---------------------------------------------------------
     1. HERO PARALLAX — background depth layers (scroll + mouse)
     --------------------------------------------------------- */
  (function heroParallax() {
    var hero    = document.querySelector('.hero');
    var vwrap   = document.querySelector('.hero__video-wrap');
    var content = document.querySelector('.hero__content');
    if (!hero || !vwrap) return;

    // Video parallax is skipped on mobile / touch (keep the heavy 4K/1080p
    // video static there → frames). The cheap text fade still runs everywhere.
    var lite = !fine || window.matchMedia('(max-width: 767px)').matches;

    if (!lite) {
      vwrap.style.willChange = 'transform';
      vwrap.style.transformOrigin = 'center';
    }

    var sy = 0, mx = 0, my = 0, ticking = false, hr = null;

    function render() {
      ticking = false;
      var vh = window.innerHeight;
      if (sy > vh + 40) return; // hero scrolled away → idle
      if (!lite) {
        vwrap.style.transform =
          'translate3d(' + (mx * 20) + 'px,' + (sy * 0.15 + my * 20) + 'px,0) scale(1.35)';
      }
      // Hero text fades subtly as you scroll away (transform-free = cheap).
      if (content) content.style.opacity = String(sy > 0 ? Math.max(0, 1 - sy / (vh * 0.55)) : 1);
    }
    function request() { if (!ticking) { ticking = true; requestAnimationFrame(render); } }

    window.addEventListener('scroll', function () {
      sy = window.scrollY || window.pageYOffset || 0;
      request();
    }, { passive: true });
    window.addEventListener('resize', function () { hr = null; }, { passive: true });

    if (fine && !lite) {
      // cache the hero rect on enter (read once), never per-move
      hero.addEventListener('pointerenter', function () { hr = hero.getBoundingClientRect(); });
      hero.addEventListener('pointermove', function (e) {
        if (!hr) hr = hero.getBoundingClientRect();
        mx = clamp(((e.clientX - hr.left) / hr.width - 0.5) * 2, -1, 1);
        my = clamp(((e.clientY - hr.top) / hr.height - 0.5) * 2, -1, 1);
        request();
      }, { passive: true });
      hero.addEventListener('pointerleave', function () { mx = 0; my = 0; hr = null; request(); });
    }
    render();
  })();

  /* ---------------------------------------------------------
     1b. SCROLL-DRIVEN "Daily Source" build (desktop layout)
     --------------------------------------------------------- */
  (function dotdScrollBuild() {
    var card = document.querySelector('[data-dotd-build]');
    var section = document.querySelector('.dotd');
    if (!card || !section) return;
    if (!window.matchMedia('(min-width: 769px)').matches) return;

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
      var e = p * p * (3 - 2 * p);
      if (orig) { orig.style.transform = 'translateX(' + (-72 * (1 - e)) + 'px)'; orig.style.opacity = clamp(e * 1.5, 0, 1); }
      if (dupe) { dupe.style.transform = 'translateX(' + (72 * (1 - e)) + 'px)'; dupe.style.opacity = clamp(e * 1.5, 0, 1); }
      if (vs)   { vs.style.transform = 'translate(-50%,-50%) scale(' + (0.5 + 0.5 * e) + ')'; vs.style.opacity = clamp((e - 0.35) * 3, 0, 1); }
    }
    function req() { if (!ticking) { ticking = true; requestAnimationFrame(render); } }

    if (orig) orig.style.willChange = 'transform, opacity';
    if (dupe) dupe.style.willChange = 'transform, opacity';
    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', req, { passive: true });
    render();
  })();

  /* ---------------------------------------------------------
     2. COUNT-UP numbers on scroll-in
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

    document.querySelectorAll('.results__grid .dupe-card__badge, .results__grid .dupe-card__match span')
      .forEach(watch);

    var savings = document.getElementById('dotdSavings');
    if (savings && 'MutationObserver' in window) {
      var mo = new MutationObserver(function () {
        if (savings.textContent.trim()) { mo.disconnect(); watch(savings); }
      });
      mo.observe(savings, { childList: true, characterData: true, subtree: true });
    }
  })();

  /* ---------------------------------------------------------
     3. SEARCH BUTTON ripple
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
     4. CUSTOM CURSOR — champagne dot, tracks the pointer instantly
     (no lerp trailing → no perceived lag), GPU-composited.
     --------------------------------------------------------- */
  (function customCursor() {
    var dot = document.createElement('div');
    dot.className = 'cursor-dot';
    document.body.appendChild(dot);
    document.documentElement.classList.add('has-cursor');
    var mx = 0, my = 0, raf = null, shown = false;

    function render() {
      raf = null;
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0) translate(-50%,-50%)';
    }
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;            // store only — no reads, no writes
      if (!shown) { shown = true; dot.classList.add('is-visible'); }
      if (!raf) raf = requestAnimationFrame(render);   // one write per frame, instant
    }, { passive: true });
    window.addEventListener('pointerdown', function () { dot.classList.add('is-down'); }, { passive: true });
    window.addEventListener('pointerup', function () { dot.classList.remove('is-down'); }, { passive: true });
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
     Shared tilt helper — rect cached on enter, coords-only on
     move, all writes in rAF (no per-move reflow).
     --------------------------------------------------------- */
  function makeTilt(el, opts) {
    opts = opts || {};
    var max = opts.max || 6, base = opts.base || '';
    var raf = null, rx = 0, ry = 0, gx = '50%', gy = '50%', rect = null;

    function apply() {
      raf = null;
      el.style.transform = 'perspective(900px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) ' + base;
      el.style.setProperty('--gx', gx);
      el.style.setProperty('--gy', gy);
    }
    el.addEventListener('pointerenter', function () {
      rect = el.getBoundingClientRect();     // READ once
      el.style.transition = 'none';
      el.style.willChange = 'transform';
    });
    el.addEventListener('pointermove', function (e) {
      if (!rect) rect = el.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width - 0.5;
      var py = (e.clientY - rect.top) / rect.height - 0.5;
      ry = clamp(px * max * 2, -max, max);
      rx = clamp(-py * max * 2, -max, max);
      gx = (px + 0.5) * 100 + '%';
      gy = (py + 0.5) * 100 + '%';
      if (!raf) raf = requestAnimationFrame(apply);
    }, { passive: true });
    el.addEventListener('pointerleave', function () {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      el.style.transition = '';
      el.style.transform = '';
      el.style.willChange = '';
      rect = null;
    });
  }

  /* --- UPLOAD ZONE tilt --- */
  var upload = document.getElementById('uploadArea');
  if (upload) {
    upload.style.setProperty('--gx', '50%');
    upload.style.setProperty('--gy', '50%');
    makeTilt(upload, { max: 7 });
  }

  /* ---------------------------------------------------------
     5. PRODUCT CARD 3D TILT — delegated, rect cached per card.
     --------------------------------------------------------- */
  function tiltCard(card, e, r) {
    var px = (e.clientX - r.left) / r.width - 0.5;
    var py = (e.clientY - r.top) / r.height - 0.5;
    var ry = clamp(px * 16, -8, 8);
    var rx = clamp(-py * 16, -8, 8);
    card.style.transform =
      'perspective(1000px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateY(-4px)';
    card.style.setProperty('--gx', (px + 0.5) * 100 + '%');
    card.style.setProperty('--gy', (py + 0.5) * 100 + '%');
  }
  function resetCard(card) {
    card.style.transition = '';
    card.style.transform = '';
    card.style.willChange = '';
  }

  function wireGrid(grid, cardSelector) {
    if (!grid) return;
    var current = null, raf = null, lastEvt = null, rect = null;
    grid.addEventListener('pointermove', function (e) {
      var card = e.target.closest(cardSelector);
      if (card !== current) {
        if (current) resetCard(current);
        current = card;
        rect = card ? card.getBoundingClientRect() : null;   // READ once per card
        if (card) { card.style.transition = 'none'; card.style.willChange = 'transform'; }
      }
      if (!card) return;
      lastEvt = e;
      if (!raf) raf = requestAnimationFrame(function () {
        raf = null;
        if (current && lastEvt && rect) tiltCard(current, lastEvt, rect);
      });
    }, { passive: true });
    grid.addEventListener('pointerleave', function () {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      if (current) { resetCard(current); current = null; }
      rect = null;
    });
  }

  wireGrid(document.querySelector('.results__grid'), '.dupe-card');
  wireGrid(document.querySelector('.celeb__grid'), '.celeb__card');
  wireGrid(document.querySelector('.saved-page__grid'), '.saved-card');

  /* ---------------------------------------------------------
     6. MAGNETIC BUTTONS — rect/center cached on enter.
     --------------------------------------------------------- */
  function makeMagnetic(btn, strength) {
    strength = strength || 0.3;
    var raf = null, tx = 0, ty = 0, cx = 0, cy = 0, cached = false;
    function apply() { raf = null; btn.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0)'; }
    function cache() {
      var r = btn.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2; cached = true;
    }
    btn.addEventListener('pointerenter', function () {
      cache();
      btn.style.transition = 'none';
      btn.style.willChange = 'transform';
    });
    btn.addEventListener('pointermove', function (e) {
      if (!cached) cache();
      tx = clamp((e.clientX - cx) * strength, -10, 10);
      ty = clamp((e.clientY - cy) * strength, -8, 8);
      if (!raf) raf = requestAnimationFrame(apply);
    }, { passive: true });
    btn.addEventListener('pointerleave', function () {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      btn.style.transition = '';
      btn.style.transform = '';
      btn.style.willChange = '';
      cached = false;
    });
  }

  document.querySelectorAll('.search-box__btn, .dotd__btn, .about-page__btn')
    .forEach(function (b) { makeMagnetic(b); });
})();

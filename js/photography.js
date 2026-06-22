/* Photography gallery — motion, filtering, lightbox
   Adapted from the Claude Design handoff. Tiles are plain <img> (filled) or
   styled placeholders; the lightbox runs over .photo.filled using data-full. */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  /* ---------- theme toggle ---------- */
  var tgl = document.getElementById('themeToggle');
  if (tgl) {
    tgl.addEventListener('click', function () {
      var cur = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      var next = cur === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('nr-theme', next); } catch (e) {}
    });
  }

  /* ---------- nav + scroll progress ---------- */
  var nav = document.querySelector('nav');
  var prog = document.getElementById('scrollProg');
  var ticking = false;
  function onScroll() { if (!ticking) { requestAnimationFrame(update); ticking = true; } }
  function update() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset;
    if (nav) nav.classList.toggle('scrolled', y > 24);
    if (prog) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      prog.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', update);
  update();

  /* ---------- reveal fallback (no view-timeline) ---------- */
  var hasVT = window.CSS && CSS.supports && CSS.supports('animation-timeline: view()');
  if (!hasVT && !reduce) {
    var rev = [].slice.call(document.querySelectorAll('.reveal'));
    rev.forEach(function (el) { el.style.opacity = '0'; el.style.transform = 'translateY(40px)'; el.style.transition = 'opacity .8s cubic-bezier(.2,.7,.2,1), transform .8s cubic-bezier(.2,.7,.2,1)'; });
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) { if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'none'; io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    rev.forEach(function (el) { io.observe(el); });
  }

  /* ---------- filtering ---------- */
  var filters = [].slice.call(document.querySelectorAll('.filter'));
  var photos = [].slice.call(document.querySelectorAll('.photo'));
  function applyFilter(cat) {
    var shown = 0;
    photos.forEach(function (p) {
      var match = cat === 'all' || p.getAttribute('data-cat') === cat;
      if (match) {
        p.style.display = '';
        if (!reduce) {
          p.style.animation = 'none';
          void p.offsetWidth; // force reflow then re-trigger
          p.style.animation = 'photoIn .55s cubic-bezier(.2,.7,.2,1) both';
          p.style.animationDelay = Math.min(shown * 35, 320) + 'ms';
        }
        shown++;
      } else {
        p.style.display = 'none';
      }
    });
  }
  filters.forEach(function (f) {
    f.addEventListener('click', function () {
      filters.forEach(function (x) { x.classList.remove('active'); });
      f.classList.add('active');
      applyFilter(f.getAttribute('data-filter'));
    });
  });

  /* ---------- lightbox ---------- */
  // A tile is openable when it carries a real image (data-full on a .filled
  // figure). Empty placeholder tiles are inert.
  function fullSrc(photo) {
    if (!photo.classList.contains('filled')) return null;
    return photo.getAttribute('data-full') || null;
  }
  var lb = document.getElementById('lightbox');
  var lbImg = lb.querySelector('.lb-stage img');
  var lbCap = lb.querySelector('.lb-meta .cap');
  var lbCat = lb.querySelector('.lb-meta .cat');
  var lbExif = lb.querySelector('.lb-meta .exif');
  var lbCount = lb.querySelector('.lb-count');
  var current = [];
  var idx = 0;

  function openAt(photo) {
    if (!fullSrc(photo)) return;
    current = photos.filter(function (p) { return p.style.display !== 'none' && fullSrc(p); });
    idx = current.indexOf(photo);
    if (idx < 0) { current = [photo]; idx = 0; }
    show();
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function show() {
    var p = current[idx];
    lbImg.src = fullSrc(p);
    lbImg.alt = p.getAttribute('data-cap') || '';
    lbCap.textContent = p.getAttribute('data-cap') || '';
    lbCat.textContent = p.getAttribute('data-catlabel') || '';
    lbExif.textContent = p.getAttribute('data-exif') || '';
    lbCount.textContent = (idx + 1) + ' / ' + current.length;
    lbImg.style.animation = 'none'; void lbImg.offsetWidth; lbImg.style.animation = '';
  }
  function close() {
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  function step(d) { if (!current.length) return; idx = (idx + d + current.length) % current.length; show(); }

  photos.forEach(function (p) {
    if (!fullSrc(p)) return;
    p.addEventListener('click', function () { openAt(p); });
    p.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAt(p); }
    });
  });
  lb.querySelector('.lb-close').addEventListener('click', close);
  lb.querySelector('.lb-prev').addEventListener('click', function (e) { e.stopPropagation(); step(-1); });
  lb.querySelector('.lb-next').addEventListener('click', function (e) { e.stopPropagation(); step(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  });

  // touch swipe on the lightbox stage
  var stage = lb.querySelector('.lb-stage');
  var touchX = null;
  stage.addEventListener('touchstart', function (e) { touchX = e.changedTouches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    touchX = null;
  }, { passive: true });

  /* ---------- starfield ---------- */
  var c = document.getElementById('stars');
  if (c) {
    var ctx = c.getContext('2d');
    var stars = [], w, h, mx = 0, my = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      var host = c.parentElement;
      w = c.width = window.innerWidth * dpr;
      h = c.height = host.offsetHeight * dpr;
      c.style.width = window.innerWidth + 'px';
      c.style.height = host.offsetHeight + 'px';
      var n = Math.min(140, Math.floor(window.innerWidth / 12));
      stars = Array.from({ length: n }, function () {
        return { x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.3 * dpr + 0.2,
          a: Math.random() * 0.6 + 0.15, tw: Math.random() * 0.02 + 0.004, d: Math.random() * 1.4 + 0.3 };
      });
    }
    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      var light = root.getAttribute('data-theme') === 'light';
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var al = s.a + Math.sin(t * s.tw) * 0.25;
        ctx.beginPath();
        ctx.arc(s.x + mx * s.d, s.y + my * s.d, s.r, 0, Math.PI * 2);
        ctx.fillStyle = light
          ? 'oklch(0.55 0.06 250 / ' + Math.max(0.04, al * 0.55) + ')'
          : 'oklch(0.92 0.03 240 / ' + Math.max(0.05, al) + ')';
        ctx.fill();
      }
      requestAnimationFrame(draw);
    }
    if (!reduce) {
      window.addEventListener('mousemove', function (e) {
        mx = (e.clientX / window.innerWidth - 0.5) * 14 * dpr;
        my = (e.clientY / window.innerHeight - 0.5) * 9 * dpr;
      });
    }
    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(draw);
  }
})();

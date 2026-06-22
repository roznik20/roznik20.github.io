/* Nikita Rozanov — flagship rework: motion + interaction */
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
      root.classList.add('theme-transition');
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('nr-theme', next); } catch (e) {}
      setTimeout(function () { root.classList.remove('theme-transition'); }, 520);
    });
  }

  /* ---------- nav scrolled state + scroll progress + hero parallax ---------- */
  var nav = document.querySelector('nav');
  var prog = document.getElementById('scrollProg');
  var heroInner = document.querySelector('.hero-inner');
  var aurora = document.querySelector('.aurora');
  var hero = document.querySelector('.hero');
  var gallery = document.querySelector('.gallery');
  var track = document.getElementById('galTrack');

  var ticking = false;
  function onScroll() {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }
  function update() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset;
    var vh = window.innerHeight;

    if (nav) nav.classList.toggle('scrolled', y > 24);

    if (prog) {
      var h = document.documentElement.scrollHeight - vh;
      prog.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
    }

    if (!reduce && hero) {
      var hp = Math.min(y / vh, 1);
      if (heroInner) {
        heroInner.style.transform = 'translate3d(0,' + (hp * 90) + 'px,0) scale(' + (1 - hp * 0.06) + ')';
        heroInner.style.opacity = Math.max(0, 1 - hp * 1.25).toFixed(3);
      }
      if (aurora) aurora.style.transform = 'translate3d(0,' + (hp * 130) + 'px,0)';
    }

    /* horizontal gallery driven by vertical scroll */
    if (!reduce && gallery && track) {
      var gr = gallery.getBoundingClientRect();
      var total = gallery.offsetHeight - vh;
      var passed = Math.min(Math.max(-gr.top, 0), total);
      var p = total > 0 ? passed / total : 0;
      var maxX = track.scrollWidth - window.innerWidth;
      if (maxX < 0) maxX = 0;
      track.style.transform = 'translate3d(' + (-maxX * p) + 'px,0,0)';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', update);
  update();

  /* ---------- IntersectionObserver fallback reveal (browsers without view-timeline) ---------- */
  var hasVT = CSS && CSS.supports && CSS.supports('animation-timeline: view()');
  if (!hasVT && !reduce) {
    var els = [].slice.call(document.querySelectorAll('.reveal, .statement .line'));
    els.forEach(function (el) { el.style.opacity = '0'; el.style.transform = 'translateY(40px)'; el.style.transition = 'opacity .8s cubic-bezier(.2,.7,.2,1), transform .8s cubic-bezier(.2,.7,.2,1)'; });
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) {
        if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'none'; io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- magnetic buttons ---------- */
  if (!reduce && matchMedia('(pointer:fine)').matches) {
    document.querySelectorAll('.btn').forEach(function (b) {
      b.addEventListener('mousemove', function (e) {
        var r = b.getBoundingClientRect();
        var mx = (e.clientX - r.left - r.width / 2) / r.width;
        var my = (e.clientY - r.top - r.height / 2) / r.height;
        b.style.transform = 'translate(' + (mx * 8) + 'px,' + (my * 8) + 'px)';
      });
      b.addEventListener('mouseleave', function () { b.style.transform = ''; });
    });
  }

  /* ---------- photography dropdown: click to open, stays put ---------- */
  var dd = document.querySelector('.nav-dd');
  if (dd) {
    var trigger = dd.querySelector('.dd-trigger');
    trigger.addEventListener('click', function (e) {
      // let the in-page anchor work, but also toggle the menu open
      e.preventDefault();
      dd.classList.toggle('open');
    });
    document.addEventListener('click', function (e) {
      if (!dd.contains(e.target)) dd.classList.remove('open');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') dd.classList.remove('open');
    });
    dd.querySelectorAll('.dd-menu a').forEach(function (a) {
      a.addEventListener('click', function () { dd.classList.remove('open'); });
    });
  }

  /* ---------- starfield (theme-aware, cursor parallax) ---------- */
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
      var n = Math.min(150, Math.floor(window.innerWidth / 11));
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
        mx = (e.clientX / window.innerWidth - 0.5) * 16 * dpr;
        my = (e.clientY / window.innerHeight - 0.5) * 10 * dpr;
      });
    }
    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(draw);
  }
})();

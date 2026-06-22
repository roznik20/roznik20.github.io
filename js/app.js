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

  /* ---------- magnetosphere: solar wind deflecting around a shielded planet ---------- */
  var mag = document.getElementById('magneto');
  if (mag) {
    var mctx = mag.getContext('2d');
    var mw, mh, mdpr = Math.min(window.devicePixelRatio || 1, 2);
    var parts = [], sparks = [], bgStars = [], px, py, pr, running = false, rafId = 0, tms = 0;
    var auroraN = 0, auroraS = 0; // polar glow charge (decays)
    function accent() {
      return root.getAttribute('data-theme') === 'light'
        ? { wind: 'oklch(0.55 0.16 250', core: 'oklch(0.58 0.14 215', shield: 'oklch(0.54 0.16 250', hot: 'oklch(0.62 0.20 25', star: 'oklch(0.6 0.05 250' }
        : { wind: 'oklch(0.82 0.13 200', core: 'oklch(0.72 0.135 240', shield: 'oklch(0.80 0.13 200', hot: 'oklch(0.78 0.18 30', star: 'oklch(0.9 0.03 240' };
    }
    function msize() {
      var r = mag.getBoundingClientRect();
      mw = mag.width = Math.max(1, r.width) * mdpr;
      mh = mag.height = Math.max(1, r.height) * mdpr;
      px = mw * 0.66; py = mh * 0.5; pr = Math.min(mw, mh) * 0.135;
      var n = reduce ? 40 : Math.min(170, Math.floor(mw / 6));
      parts = Array.from({ length: n }, mkPart);
      bgStars = Array.from({ length: reduce ? 0 : Math.floor(mw * mh / (14000 * mdpr)) }, function () {
        return { x: Math.random() * mw, y: Math.random() * mh, r: Math.random() * 1.1 * mdpr + 0.2, a: Math.random() * 0.5 + 0.1, tw: Math.random() * 0.02 + 0.003 };
      });
    }
    function mkPart(reset) {
      var spd = 0.6 + Math.random() * 1.0;
      return {
        x: reset ? -Math.random() * mw * 0.5 : Math.random() * mw,
        y: Math.random() * mh,
        v: spd * mdpr,
        len: (8 + Math.random() * 30) * mdpr,
        a: 0.25 + Math.random() * 0.5,
        hot: Math.random() < 0.22,   // some high-energy particles (warm color)
        hit: false
      };
    }
    // dipole field line: rho = L*sin^2(theta), axis vertical, on a given side
    function fieldLine(L, side, squash, stretch) {
      mctx.beginPath();
      for (var th = 0.001; th <= Math.PI; th += 0.13) {
        var rho = L * Math.sin(th) * Math.sin(th);
        var fx = px + rho * Math.sin(th) * side * squash;
        var fy = py - rho * Math.cos(th) * stretch;
        if (th < 0.14) mctx.moveTo(fx, fy); else mctx.lineTo(fx, fy);
      }
      mctx.stroke();
    }
    function mstep() {
      rafId = requestAnimationFrame(mstep);
      tms += 0.016;
      mctx.clearRect(0, 0, mw, mh);
      var col = accent();
      var breathe = 1 + Math.sin(tms * 0.9) * 0.05;
      var shieldR = pr * 2.55 * breathe;

      // background micro-stars
      for (var b = 0; b < bgStars.length; b++) {
        var st = bgStars[b];
        mctx.beginPath();
        mctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        mctx.fillStyle = col.star + ' / ' + Math.max(0.04, st.a + Math.sin(tms * 60 * st.tw) * 0.2).toFixed(2) + ')';
        mctx.fill();
      }

      // magnetotail — stretched field on the night (right) side
      mctx.strokeStyle = col.shield + ' / 0.13)';
      mctx.lineWidth = 1 * mdpr;
      for (var ti = 0; ti < 2; ti++) {
        var ty = py + (ti ? 1 : -1) * pr * 0.7;
        mctx.beginPath();
        mctx.moveTo(px, ty);
        mctx.bezierCurveTo(px + pr * 2, ty + (ti ? 1 : -1) * pr * 0.2, px + pr * 4.5, ty + (ti ? 1 : -1) * pr * 0.1, mw + 20, ty + (ti ? 1 : -1) * pr * 0.5);
        mctx.stroke();
      }

      // dipole field lines (compressed on sun side, stretched on night side)
      for (var li = 0; li < 3; li++) {
        var L = pr * (1.7 + li * 0.95);
        mctx.strokeStyle = col.shield + ' / ' + (0.30 - li * 0.07).toFixed(2) + ')';
        mctx.lineWidth = (1.3 - li * 0.25) * mdpr;
        fieldLine(L, -1, 0.72, 1);          // sun side, compressed
        fieldLine(L, 1, 1.05 + li * 0.25, 1); // night side, flared
      }

      // magnetopause bow shock
      mctx.beginPath();
      for (var t = -1.3; t <= 1.3; t += 0.04) {
        var ax = px - Math.cos(t) * shieldR * 1.18 + shieldR * 0.16;
        var ay = py + Math.sin(t) * shieldR * 1.55;
        if (t === -1.3) mctx.moveTo(ax, ay); else mctx.lineTo(ax, ay);
      }
      mctx.strokeStyle = col.shield + ' / 0.22)';
      mctx.lineWidth = 1.2 * mdpr;
      mctx.stroke();

      // solar wind particles
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        var dx = p.x - px, dy = p.y - py;
        var dist = Math.hypot(dx, dy);
        if (dist < shieldR) {
          var f = (shieldR - dist) / shieldR;
          p.y += (dy / (dist || 1)) * f * 3.8 * mdpr;
          p.x += (dx / (dist || 1)) * f * 1.3 * mdpr;
          // impact near the nose of the magnetopause → spark + aurora charge
          if (!p.hit && dist < shieldR * 0.62 && p.x < px) {
            p.hit = true;
            if (sparks.length < 60) {
              for (var s = 0; s < 3; s++) sparks.push({ x: p.x, y: p.y, vx: (Math.random() - 0.3) * 2 * mdpr, vy: (Math.random() - 0.5) * 3 * mdpr, life: 1, hot: p.hot });
            }
            if (p.y < py) auroraN = Math.min(1, auroraN + 0.12); else auroraS = Math.min(1, auroraS + 0.12);
          }
        }
        p.x += p.v;
        var streak = Math.min(p.len, p.v * 9);
        var grad = mctx.createLinearGradient(p.x - streak, p.y, p.x, p.y);
        var base = p.hot ? col.hot : col.wind;
        grad.addColorStop(0, base + ' / 0)');
        grad.addColorStop(1, base + ' / ' + p.a.toFixed(2) + ')');
        mctx.strokeStyle = grad;
        mctx.lineWidth = (p.hot ? 1.8 : 1.3) * mdpr;
        mctx.beginPath();
        mctx.moveTo(p.x - streak, p.y);
        mctx.lineTo(p.x, p.y);
        mctx.stroke();
        if (p.x - streak > mw + 10) { parts[i] = mkPart(true); }
      }

      // impact sparks
      for (var si = sparks.length - 1; si >= 0; si--) {
        var sp = sparks[si];
        sp.x += sp.vx; sp.y += sp.vy; sp.vy += 0.04 * mdpr; sp.life -= 0.045;
        if (sp.life <= 0) { sparks.splice(si, 1); continue; }
        mctx.beginPath();
        mctx.arc(sp.x, sp.y, 1.6 * mdpr * sp.life + 0.4, 0, Math.PI * 2);
        mctx.fillStyle = (sp.hot ? col.hot : col.shield) + ' / ' + sp.life.toFixed(2) + ')';
        mctx.fill();
      }

      // planet magnetosphere glow
      var g = mctx.createRadialGradient(px - pr * 0.3, py - pr * 0.3, pr * 0.1, px, py, pr * 2.6);
      g.addColorStop(0, col.core + ' / 0.5)');
      g.addColorStop(1, col.core + ' / 0)');
      mctx.fillStyle = g;
      mctx.beginPath(); mctx.arc(px, py, pr * 2.6, 0, Math.PI * 2); mctx.fill();

      // planet body with day/night terminator (lit toward the sun, left)
      var bg2 = mctx.createRadialGradient(px - pr * 0.55, py - pr * 0.2, pr * 0.1, px, py, pr * 1.05);
      bg2.addColorStop(0, col.core + ' / 1)');
      bg2.addColorStop(0.6, col.shield + ' / 0.9)');
      bg2.addColorStop(1, 'oklch(0.22 0.05 270 / 0.96)');
      mctx.fillStyle = bg2;
      mctx.beginPath(); mctx.arc(px, py, pr, 0, Math.PI * 2); mctx.fill();

      // polar aurora caps (flare on impact, then decay)
      auroraN *= 0.965; auroraS *= 0.965;
      function aurora(yy, charge, dir) {
        if (charge < 0.02) return;
        mctx.save();
        mctx.beginPath();
        mctx.ellipse(px, yy, pr * 0.5, pr * 0.22, 0, 0, Math.PI * 2);
        var ag = mctx.createRadialGradient(px, yy, 0, px, yy, pr * 0.6);
        ag.addColorStop(0, col.shield + ' / ' + (0.55 * charge).toFixed(2) + ')');
        ag.addColorStop(1, col.shield + ' / 0)');
        mctx.fillStyle = ag;
        mctx.fill();
        mctx.restore();
      }
      aurora(py - pr * 0.78, auroraN, -1);
      aurora(py + pr * 0.78, auroraS, 1);

      // sun-facing shield arc
      mctx.beginPath();
      mctx.arc(px, py, pr * 1.45, Math.PI * 0.58, Math.PI * 1.42, false);
      mctx.strokeStyle = col.shield + ' / ' + (0.45 + Math.sin(tms * 1.6) * 0.12).toFixed(2) + ')';
      mctx.lineWidth = 2 * mdpr;
      mctx.stroke();

      if (reduce) { cancelAnimationFrame(rafId); }
    }
    msize();
    window.addEventListener('resize', function () { msize(); });
    function start() { if (!running) { running = true; mstep(); } }
    function stop() { if (running) { running = false; cancelAnimationFrame(rafId); } }
    start();
    var mio = new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) start(); else stop();
    }, { threshold: 0.02 });
    mio.observe(mag);
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

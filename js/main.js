/* ============ Navigation, progress, reveals, hero background ============ */
(function () {
  'use strict';

  // --- Progress bar ---
  const fill = document.getElementById('progress-fill');
  function updateProgress() {
    const h = document.documentElement;
    const scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight);
    fill.style.width = (scrolled * 100).toFixed(1) + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  // --- Active nav link via IntersectionObserver ---
  const navLinks = Array.from(document.querySelectorAll('#nav-list a'));
  const sections = navLinks.map(a => document.querySelector(a.getAttribute('href')));
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const id = '#' + e.target.id;
        navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === id));
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => s && navObserver.observe(s));

  // --- Reveal on scroll ---
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revealObserver.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  // --- Mobile nav toggle ---
  const toggle = document.getElementById('nav-toggle');
  const list = document.getElementById('nav-list');
  if (toggle) toggle.addEventListener('click', () => list.classList.toggle('open'));
  navLinks.forEach(a => a.addEventListener('click', () => list.classList.remove('open')));

  // --- Lazy init: only run heavy module setup when a section nears viewport ---
  const initialized = {};
  const lazyObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const id = e.target.id;
        if (!initialized[id] && window.LLMLab && typeof window.LLMLab[id] === 'function') {
          initialized[id] = true;
          try { window.LLMLab[id](); } catch (err) { console.error('init ' + id, err); }
        }
      }
    });
  }, { rootMargin: '200px 0px' });
  document.querySelectorAll('.section').forEach(s => lazyObserver.observe(s));

  // Registry that other module files populate
  window.LLMLab = window.LLMLab || {};

  /* ---------- Hero animated background: a soft neural particle field ---------- */
  const canvas = document.getElementById('hero-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, nodes = [];
  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    const count = Math.min(70, Math.floor(W * H / 22000));
    nodes = [];
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
        r: 1 + Math.random() * 2, pulse: Math.random() * Math.PI * 2
      });
    }
  }
  window.addEventListener('resize', resize);
  resize();

  function heroFrame(t) {
    ctx.clearRect(0, 0, W, H);
    // connections
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      a.x += a.vx; a.y += a.vy;
      if (a.x < 0 || a.x > W) a.vx *= -1;
      if (a.y < 0 || a.y > H) a.vy *= -1;
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 150) {
          const alpha = (1 - d / 150) * 0.22;
          ctx.strokeStyle = 'rgba(108,123,255,' + alpha + ')';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    // nodes
    for (const n of nodes) {
      const glow = 0.5 + 0.5 * Math.sin(t * 0.002 + n.pulse);
      ctx.fillStyle = 'rgba(34,211,238,' + (0.35 + glow * 0.45) + ')';
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r + glow * 1.2, 0, 7); ctx.fill();
    }
    requestAnimationFrame(heroFrame);
  }
  requestAnimationFrame(heroFrame);
})();

/* ============ Modules 4-7: tokens, embeddings, attention, prediction ============ */
window.LLMLab = window.LLMLab || {};

/* ---------- Module 4: Tokenizer (toy subword splitter) ---------- */
window.LLMLab.tokens = function () {
  const input = document.getElementById('token-input');
  const out = document.getElementById('token-output');
  const palette = ['#6c7bff', '#22d3ee', '#37e0a0', '#ff6b9d', '#f7b955', '#a78bfa', '#4ade80'];

  // toy tokenizer: split on spaces/punctuation, then chop long words into subwords
  function tokenize(text) {
    const raw = text.match(/[A-Za-z0-9']+|[^\s\w]/g) || [];
    const tokens = [];
    for (let w of raw) {
      if (w.length <= 5 || !/[A-Za-z0-9]/.test(w)) { tokens.push(w); continue; }
      // chop into chunks of ~3-4, mark continuation with ##
      let i = 0;
      while (i < w.length) {
        const len = i === 0 ? 4 : 3;
        const piece = w.slice(i, i + len);
        tokens.push(i === 0 ? piece : '##' + piece);
        i += len;
      }
    }
    return tokens;
  }

  function hashId(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 50000; return h; }

  function render() {
    const text = input.value;
    const toks = tokenize(text);
    out.innerHTML = '';
    toks.forEach((t, i) => {
      const el = document.createElement('span');
      el.className = 'tok';
      const c = palette[i % palette.length];
      el.style.background = c + '22'; el.style.borderColor = c + '66'; el.style.color = '#fff';
      el.innerHTML = t.replace('##', '<span style="opacity:.5">##</span>') + '<small>id ' + hashId(t) + '</small>';
      out.appendChild(el);
    });
    document.getElementById('token-count').textContent = toks.length;
    document.getElementById('char-count').textContent = text.length;
  }
  input.addEventListener('input', render);
  render();
};

/* ---------- Module 5: Embeddings 2D map ---------- */
window.LLMLab.embed = function () {
  const canvas = document.getElementById('embed-canvas'), ctx = canvas.getContext('2d');
  const info = document.getElementById('embed-info');
  // hand-placed 2D "semantic" map: clusters of related words
  const words = [
    // animals
    { t: 'cat', x: 0.18, y: 0.25, g: 0 }, { t: 'dog', x: 0.24, y: 0.32, g: 0 },
    { t: 'lion', x: 0.12, y: 0.34, g: 0 }, { t: 'horse', x: 0.27, y: 0.20, g: 0 },
    // royalty
    { t: 'king', x: 0.72, y: 0.22, g: 1 }, { t: 'queen', x: 0.80, y: 0.28, g: 1 },
    { t: 'prince', x: 0.68, y: 0.32, g: 1 }, { t: 'crown', x: 0.82, y: 0.16, g: 1 },
    // tech
    { t: 'computer', x: 0.70, y: 0.74, g: 2 }, { t: 'code', x: 0.78, y: 0.80, g: 2 },
    { t: 'algorithm', x: 0.64, y: 0.82, g: 2 }, { t: 'network', x: 0.74, y: 0.66, g: 2 },
    // food
    { t: 'bread', x: 0.20, y: 0.72, g: 3 }, { t: 'apple', x: 0.14, y: 0.78, g: 3 },
    { t: 'soup', x: 0.28, y: 0.80, g: 3 }, { t: 'coffee', x: 0.22, y: 0.64, g: 3 },
    // emotions (center bridge)
    { t: 'happy', x: 0.46, y: 0.48, g: 4 }, { t: 'sad', x: 0.52, y: 0.54, g: 4 },
  ];
  const groupCol = ['#6c7bff', '#ff6b9d', '#22d3ee', '#37e0a0', '#f7b955'];
  const groupName = ['animals', 'royalty', 'technology', 'food', 'emotions'];
  let selected = null;
  const W = canvas.width, H = canvas.height;
  const px = w => w.x * (W - 60) + 30, py = w => w.y * (H - 60) + 30;

  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // grid
    ctx.strokeStyle = '#ffffff08'; ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath(); ctx.moveTo(i / 10 * W, 0); ctx.lineTo(i / 10 * W, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i / 10 * H); ctx.lineTo(W, i / 10 * H); ctx.stroke();
    }
    // neighbor lines if selected
    if (selected) {
      const neigh = words.filter(w => w !== selected).map(w => ({ w, d: dist(w, selected) }))
        .sort((a, b) => a.d - b.d).slice(0, 3);
      neigh.forEach(n => {
        ctx.strokeStyle = 'rgba(34,211,238,' + (0.6 - n.d) + ')'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px(selected), py(selected)); ctx.lineTo(px(n.w), py(n.w)); ctx.stroke();
      });
    }
    // points
    words.forEach(w => {
      const r = w === selected ? 9 : 6;
      ctx.fillStyle = groupCol[w.g];
      ctx.shadowColor = groupCol[w.g]; ctx.shadowBlur = w === selected ? 16 : 6;
      ctx.beginPath(); ctx.arc(px(w), py(w), r, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = w === selected ? '#fff' : '#cfd4f2';
      ctx.font = (w === selected ? '600 ' : '') + '13px Inter';
      ctx.fillText(w.t, px(w) + 11, py(w) + 4);
    });
  }

  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);
    let best = null, bd = 1e9;
    words.forEach(w => { const d = Math.hypot(px(w) - mx, py(w) - my); if (d < bd) { bd = d; best = w; } });
    if (bd < 40) {
      selected = best;
      const neigh = words.filter(w => w !== best).map(w => ({ w, d: dist(w, best) }))
        .sort((a, b) => a.d - b.d).slice(0, 3);
      const vx = (best.x * 2 - 1).toFixed(2), vy = (1 - best.y * 2).toFixed(2);
      info.innerHTML = '<b>' + best.t + '</b><br><span style="color:#9aa0c4">group: ' + groupName[best.g] + '</span>' +
        '<br><span style="color:#9aa0c4">vector ≈</span> [<b>' + vx + ', ' + vy + '</b>]' +
        '<br><br>Nearest neighbors:<br>' +
        neigh.map(n => '• <b>' + n.w.t + '</b> <span style="color:#9aa0c4">(d=' + n.d.toFixed(2) + ')</span>').join('<br>') +
        '<br><br><span style="color:#9aa0c4">Small distance = similar meaning.</span>';
      draw();
    }
  });
  draw();
};

/* ---------- Module 6: Attention visualization ---------- */
window.LLMLab.attention = function () {
  const container = document.getElementById('attn-sentence');
  const words = ['The', 'cat', 'ate', 'quickly', 'because', 'it', 'was', 'hungry'];
  // hand-crafted attention weights (row = querying word -> how much it attends to each)
  const attn = {
    'it': { 'cat': 1.0, 'hungry': 0.5, 'was': 0.4 },
    'hungry': { 'cat': 0.7, 'it': 0.6, 'was': 0.5 },
    'ate': { 'cat': 0.9, 'quickly': 0.6, 'hungry': 0.4 },
    'was': { 'it': 0.7, 'hungry': 0.8 },
    'because': { 'ate': 0.6, 'hungry': 0.5 },
    'quickly': { 'ate': 0.9 },
    'cat': { 'ate': 0.6, 'hungry': 0.4 },
  };
  const els = [];
  container.innerHTML = '';
  words.forEach(w => {
    const span = document.createElement('span');
    span.className = 'attn-word'; span.textContent = w; span.dataset.w = w;
    container.appendChild(span); els.push(span);
  });
  function clear() { els.forEach(e => { e.style.background = '#ffffff08'; e.style.color = '#e7e9f5'; e.style.boxShadow = 'none'; }); }
  els.forEach(el => {
    el.addEventListener('mouseenter', () => {
      clear();
      const map = attn[el.dataset.w] || {};
      el.style.background = 'rgba(108,123,255,.35)'; el.style.boxShadow = '0 0 0 1px #6c7bff';
      els.forEach(other => {
        if (other === el) return;
        const a = map[other.dataset.w] || 0;
        if (a > 0) {
          other.style.background = 'rgba(34,211,238,' + (0.12 + a * 0.55) + ')';
          other.style.color = '#fff';
        }
      });
    });
    el.addEventListener('mouseleave', clear);
  });
};

/* ---------- Module 7: next-token predictor (bigram model on a small corpus) ---------- */
window.LLMLab.predict = function () {
  const corpus = `the cat eats fish . the cat sleeps a lot . the dog runs fast .
    the dog eats a bone . the child reads a book . the child draws a sun .
    the sun shines in the sky . the sky is blue . the sea is blue .
    the robot learns fast . the robot thinks a lot . the model learns from data .
    the model predicts the next word . the cat hunts fish . the dog guards the house .`;
  // build bigram counts
  const tokens = corpus.toLowerCase().replace(/\n/g, ' ').split(/\s+/).filter(Boolean);
  const bigram = {};
  for (let i = 0; i < tokens.length - 1; i++) {
    const a = tokens[i], b = tokens[i + 1];
    (bigram[a] = bigram[a] || {})[b] = (bigram[a][b] || 0) + 1;
  }
  let current = 'the';
  let output = ['the'];
  let autoTimer = null;

  const barsEl = document.getElementById('pred-bars');
  const curEl = document.getElementById('pred-current');
  const outEl = document.getElementById('pred-output');

  function distribution(word) {
    const next = bigram[word] || { '.': 1 };
    const total = Object.values(next).reduce((a, b) => a + b, 0);
    return Object.entries(next).map(([w, c]) => ({ w, p: c / total })).sort((a, b) => b.p - a.p);
  }
  function renderBars() {
    curEl.textContent = current;
    const dist = distribution(current).slice(0, 5);
    barsEl.innerHTML = '';
    dist.forEach(d => {
      const row = document.createElement('div'); row.className = 'pred-bar';
      row.innerHTML = '<span class="w">' + d.w + '</span><div class="track"><div class="fill" style="width:' +
        (d.p * 100).toFixed(0) + '%"></div></div><span class="pct">' + (d.p * 100).toFixed(0) + '%</span>';
      barsEl.appendChild(row);
    });
  }
  function renderOutput() {
    outEl.innerHTML = output.map((w, i) => i === output.length - 1 ? '<b>' + w + '</b>' : w).join(' ');
  }
  function sample() {
    const dist = distribution(current);
    // weighted random (a bit of "temperature")
    const r = Math.random();
    let acc = 0, pick = dist[0].w;
    for (const d of dist) { acc += d.p; if (r <= acc) { pick = d.w; break; } }
    current = pick === '.' ? ['the', 'the', 'a'][Math.floor(Math.random() * 3)] : pick;
    output.push(pick);
    if (output.length > 40) output = output.slice(-40);
    renderBars(); renderOutput();
  }

  document.getElementById('pred-step').addEventListener('click', sample);
  document.getElementById('pred-auto').addEventListener('click', function () {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; this.textContent = '▶ Generate automatically'; }
    else { autoTimer = setInterval(sample, 650); this.textContent = '⏸ Stop'; }
  });
  document.getElementById('pred-reset').addEventListener('click', () => {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; document.getElementById('pred-auto').textContent = '▶ Generate automatically'; }
    current = 'the'; output = ['the']; renderBars(); renderOutput();
  });
  renderBars(); renderOutput();
};

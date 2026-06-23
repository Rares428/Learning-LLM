/* ============ THE EXPERIMENT: cars learn a track via neuroevolution ============ */
window.LLMLab = window.LLMLab || {};

window.LLMLab.cars = function () {
  const canvas = document.getElementById('sim-canvas'), ctx = canvas.getContext('2d');
  const brainCanvas = document.getElementById('brain-canvas'), bctx = brainCanvas.getContext('2d');
  const chartCanvas = document.getElementById('fitness-chart'), cctx = chartCanvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, halfW = 46;

  /* ---------- Track state (rebuildable) ---------- */
  let center = [], inner = [], outer = [], walls = [], tangents = [], checkpoints = [], startA = 0, N = 0;

  function defaultCenter() {
    const pts = [], M = 110, cyOff = 275;
    for (let i = 0; i < M; i++) {
      const t = i / M * Math.PI * 2;
      const rx = 290 + 62 * Math.sin(2 * t) + 26 * Math.sin(3 * t + 1);
      const ry = 150 + 44 * Math.cos(2 * t) - 18 * Math.sin(3 * t);
      pts.push([cx + Math.cos(t) * rx, cyOff + Math.sin(t) * ry]);
    }
    return pts;
  }

  // build inner/outer walls, checkpoints, start heading from a closed centerline
  function buildTrack(pts) {
    center = pts; N = center.length;
    inner = []; outer = []; walls = []; tangents = []; checkpoints = [];
    for (let i = 0; i < N; i++) {
      const p = center[i], a = center[(i - 1 + N) % N], b = center[(i + 1) % N];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const len = Math.hypot(tx, ty) || 1; tx /= len; ty /= len;
      tangents.push([tx, ty]);
      const nx = -ty, ny = tx;
      inner.push([p[0] - nx * halfW, p[1] - ny * halfW]);
      outer.push([p[0] + nx * halfW, p[1] + ny * halfW]);
    }
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      walls.push([inner[i][0], inner[i][1], inner[j][0], inner[j][1]]);
      walls.push([outer[i][0], outer[i][1], outer[j][0], outer[j][1]]);
    }
    for (let i = 0; i < N; i += 3) checkpoints.push({ x: center[i][0], y: center[i][1], idx: i });
    startA = Math.atan2(tangents[0][1], tangents[0][0]);
  }

  /* ---------- Resample a hand-drawn closed loop into smooth, evenly spaced points ---------- */
  function resampleClosed(raw, count) {
    const pts = raw.slice();
    let total = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      total += Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    const step = total / count;
    const out = [];
    // walk along the polyline, sampling evenly
    for (let k = 0; k < count; k++) {
      const dist = k * step;
      let walked = 0, idx = 0;
      for (idx = 0; idx < pts.length; idx++) {
        const a = pts[idx], b = pts[(idx + 1) % pts.length];
        const segLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (walked + segLen >= dist || idx === pts.length - 1) {
          const f = segLen > 0 ? (dist - walked) / segLen : 0;
          out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
          break;
        }
        walked += segLen;
      }
    }
    // smoothing passes (moving average, wrapped)
    let sm = out;
    for (let pass = 0; pass < 3; pass++) {
      const next = [];
      for (let i = 0; i < sm.length; i++) {
        const a = sm[(i - 1 + sm.length) % sm.length], b = sm[i], c = sm[(i + 1) % sm.length];
        next.push([(a[0] + 2 * b[0] + c[0]) / 4, (a[1] + 2 * b[1] + c[1]) / 4]);
      }
      sm = next;
    }
    return sm;
  }

  /* ---------- Ray-segment intersection ---------- */
  function rayHit(ox, oy, dx, dy, ax, ay, bx, by) {
    const v1x = ox - ax, v1y = oy - ay, v2x = bx - ax, v2y = by - ay, v3x = -dy, v3y = dx;
    const dot = v2x * v3x + v2y * v3y;
    if (Math.abs(dot) < 1e-9) return null;
    const t = (v2x * v1y - v2y * v1x) / dot;
    const u = (v1x * v3x + v1y * v3y) / dot;
    if (t >= 0 && u >= 0 && u <= 1) return t;
    return null;
  }

  /* ---------- Car ---------- */
  const SENSOR_ANGLES = [-1.0, -0.5, 0, 0.5, 1.0];
  const SENSOR_RANGE = 170;
  function Car(brain) { this.reset(brain); }
  Car.prototype.reset = function (brain) {
    this.x = checkpoints[0].x; this.y = checkpoints[0].y;
    this.angle = startA; this.speed = 0;
    this.brain = brain;
    this.dead = false; this.score = 0; this.nextCp = 1;
    this.idle = 0; this.sensors = [1, 1, 1, 1, 1];
  };
  Car.prototype.sense = function () {
    for (let s = 0; s < SENSOR_ANGLES.length; s++) {
      const a = this.angle + SENSOR_ANGLES[s];
      const dx = Math.cos(a), dy = Math.sin(a);
      let best = SENSOR_RANGE;
      for (let w = 0; w < walls.length; w++) {
        const t = rayHit(this.x, this.y, dx, dy, walls[w][0], walls[w][1], walls[w][2], walls[w][3]);
        if (t !== null && t < best) best = t;
      }
      this.sensors[s] = best / SENSOR_RANGE;
    }
  };
  Car.prototype.update = function () {
    if (this.dead) return;
    this.sense();
    const out = this.brain.forward(this.sensors);
    const steer = out[0], throttle = out[1];
    this.angle += steer * 0.085;
    this.speed = 1.7 + (throttle * 0.5 + 0.5) * 2.4;
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;

    let nd = 1e9;
    for (let i = 0; i < N; i++) {
      const d = (center[i][0] - this.x) ** 2 + (center[i][1] - this.y) ** 2;
      if (d < nd) nd = d;
    }
    if (Math.sqrt(nd) > halfW - 4) { this.dead = true; return; }

    const cp = checkpoints[this.nextCp % checkpoints.length];
    const dcp = Math.hypot(cp.x - this.x, cp.y - this.y);
    if (dcp < halfW * 1.1) { this.score++; this.nextCp++; this.idle = 0; }
    this.idle++;
    if (this.idle > 140) this.dead = true;
  };
  Car.prototype.fitness = function () {
    const cp = checkpoints[this.nextCp % checkpoints.length];
    const dcp = Math.hypot(cp.x - this.x, cp.y - this.y);
    return this.score + Math.max(0, 1 - dcp / (halfW * 4));
  };

  /* ---------- Population / GA ---------- */
  const LAYERS = [5, 8, 6, 2];
  let pop = [], generation = 1, record = 0, frame = 0, running = false, raf = null;
  let speedMult = 1, history = [];
  let popSize = +document.getElementById('s-pop').value;
  let mutRate = +document.getElementById('s-mut').value;
  let mode = 'sim'; // 'sim' | 'draw'
  let drawing = false, drawnPts = [];

  function fresh() {
    pop = [];
    for (let i = 0; i < popSize; i++) pop.push(new Car(new NN.Network(LAYERS)));
    generation = 1; record = 0; frame = 0; history = [];
  }

  function pickParent(sorted, totalFit) {
    let r = Math.random() * totalFit, acc = 0;
    for (const c of sorted) { acc += c.fitness(); if (r <= acc) return c; }
    return sorted[0];
  }

  function evolve() {
    const sorted = pop.slice().sort((a, b) => b.fitness() - a.fitness());
    const bestFit = sorted[0].fitness();
    record = Math.max(record, bestFit);
    history.push(bestFit);
    if (history.length > 60) history.shift();

    const elites = sorted.slice(0, Math.max(2, Math.floor(sorted.length * 0.2)));
    const totalFit = elites.reduce((s, c) => s + c.fitness(), 0) || 1;
    const newBrains = [sorted[0].brain.copy()];
    while (newBrains.length < popSize) {
      const pa = pickParent(elites, totalFit), pb = pickParent(elites, totalFit);
      const child = NN.Network.crossover(pa.brain, pb.brain);
      child.mutate(mutRate, 0.45);
      newBrains.push(child);
    }
    pop = newBrains.slice(0, popSize).map(b => new Car(b));
    generation++; frame = 0;
  }

  function leader() {
    let best = null, bf = -1;
    for (const c of pop) { if (!c.dead) { const f = c.fitness(); if (f > bf) { bf = f; best = c; } } }
    return best || pop[0];
  }

  /* ---------- Drawing the track ---------- */
  function drawTrack() {
    ctx.fillStyle = '#0a0c18'; ctx.fillRect(0, 0, W, H);
    ctx.beginPath();
    outer.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.closePath();
    ctx.moveTo(inner[0][0], inner[0][1]);
    for (let i = 1; i < inner.length; i++) ctx.lineTo(inner[i][0], inner[i][1]);
    ctx.closePath();
    ctx.fillStyle = '#1a1d2e'; ctx.fill('evenodd');
    ctx.strokeStyle = '#ff6b9d'; ctx.lineWidth = 3; ctx.beginPath();
    outer.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = '#22d3ee'; ctx.beginPath();
    inner.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(inner[0][0], inner[0][1]); ctx.lineTo(outer[0][0], outer[0][1]); ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawCar(c, isLeader) {
    ctx.save();
    ctx.translate(c.x, c.y); ctx.rotate(c.angle);
    if (isLeader) { ctx.fillStyle = '#37e0a0'; ctx.shadowColor = '#37e0a0'; ctx.shadowBlur = 12; }
    else { ctx.fillStyle = c.dead ? '#444a6b' : 'rgba(108,123,255,.85)'; }
    ctx.fillRect(-7, -4, 14, 8);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawSensors(c) {
    if (!c) return;
    for (let s = 0; s < SENSOR_ANGLES.length; s++) {
      const a = c.angle + SENSOR_ANGLES[s];
      const d = c.sensors[s] * SENSOR_RANGE;
      const ex = c.x + Math.cos(a) * d, ey = c.y + Math.sin(a) * d;
      ctx.strokeStyle = 'rgba(247,185,85,' + (0.25 + (1 - c.sensors[s]) * 0.6) + ')';
      ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.fillStyle = '#f7b955'; ctx.beginPath(); ctx.arc(ex, ey, 3, 0, 7); ctx.fill();
    }
  }

  function drawBrain(c) {
    bctx.clearRect(0, 0, brainCanvas.width, brainCanvas.height);
    if (!c || !c.brain.activations.length) return;
    const acts = c.brain.activations, BW = brainCanvas.width, BH = brainCanvas.height;
    const cols = acts.length;
    const colX = i => 24 + i * ((BW - 48) / (cols - 1));
    const nodePos = acts.map((layer, li) => layer.map((v, j) => {
      const y = layer.length === 1 ? BH / 2 : 16 + j * ((BH - 32) / (layer.length - 1));
      return { x: colX(li), y, v };
    }));
    for (let l = 0; l < cols - 1; l++) {
      nodePos[l].forEach((a, i) => nodePos[l + 1].forEach((b, j) => {
        ctx2line(bctx, a.x, a.y, b.x, b.y, c.brain.weights[l][j][i]);
      }));
    }
    nodePos.forEach((layer) => layer.forEach(n => {
      const act = Math.min(Math.abs(n.v), 1);
      const col = n.v >= 0 ? '55,224,160' : '255,93,108';
      bctx.fillStyle = 'rgba(' + col + ',' + (0.25 + act * 0.75) + ')';
      bctx.beginPath(); bctx.arc(n.x, n.y, 6, 0, 7); bctx.fill();
      bctx.strokeStyle = '#ffffff33'; bctx.lineWidth = 1; bctx.stroke();
    }));
    bctx.fillStyle = '#9aa0c4'; bctx.font = '9px Inter';
    bctx.fillText('eyes', 8, 12); bctx.fillText('decisions', BW - 52, 12);
  }
  function ctx2line(c2, x1, y1, x2, y2, w) {
    const mag = Math.min(Math.abs(w), 1.5) / 1.5;
    c2.strokeStyle = (w >= 0 ? 'rgba(55,224,160,' : 'rgba(255,93,108,') + (0.05 + mag * 0.35) + ')';
    c2.lineWidth = 0.5 + mag * 1.5;
    c2.beginPath(); c2.moveTo(x1, y1); c2.lineTo(x2, y2); c2.stroke();
  }

  function drawChart() {
    const CW = chartCanvas.width, CH = chartCanvas.height;
    cctx.clearRect(0, 0, CW, CH);
    cctx.fillStyle = '#9aa0c4'; cctx.font = '9px Inter';
    cctx.fillText('best score / generation', 6, 12);
    if (history.length < 2) return;
    const mx = Math.max(...history, 1);
    cctx.strokeStyle = '#22d3ee'; cctx.lineWidth = 2; cctx.beginPath();
    history.forEach((v, i) => {
      const x = 6 + i * ((CW - 12) / Math.max(1, history.length - 1));
      const y = CH - 8 - (v / mx) * (CH - 24);
      i ? cctx.lineTo(x, y) : cctx.moveTo(x, y);
    });
    cctx.stroke();
  }

  const showSensors = () => document.getElementById('s-sensors').checked;
  const showBrain = () => document.getElementById('s-brain').checked;

  function drawDrawPreview() {
    ctx.fillStyle = '#0a0c18'; ctx.fillRect(0, 0, W, H);
    // hint grid
    ctx.strokeStyle = '#ffffff08'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    if (drawnPts.length > 1) {
      ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = halfW * 2;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      drawnPts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      drawnPts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
      ctx.stroke();
      // start dot
      ctx.fillStyle = '#37e0a0';
      ctx.beginPath(); ctx.arc(drawnPts[0][0], drawnPts[0][1], 6, 0, 7); ctx.fill();
    }
    document.getElementById('sim-overlay').textContent = drawing
      ? '✏️ Drawing… release the mouse to close the loop'
      : '✏️ Hold and draw a closed loop (come back toward the green dot)';
  }

  function render() {
    if (mode === 'draw') { drawDrawPreview(); return; }
    drawTrack();
    const lead = leader();
    for (const c of pop) if (c !== lead) drawCar(c, false);
    if (showSensors() && lead) drawSensors(lead);
    if (lead) drawCar(lead, true);
    if (showBrain()) drawBrain(lead);
    drawChart();

    const alive = pop.filter(c => !c.dead).length;
    document.getElementById('s-gen').textContent = generation;
    document.getElementById('s-alive').textContent = alive;
    document.getElementById('s-best').textContent = lead ? lead.score : 0;
    document.getElementById('s-record').textContent = Math.floor(record);
    document.getElementById('sim-overlay').textContent =
      'Generation ' + generation + '  ·  ' + alive + '/' + pop.length + ' alive  ·  record ' + Math.floor(record) + ' checkpoints';
  }

  function tick() {
    for (let s = 0; s < speedMult; s++) {
      let anyAlive = false;
      for (const c of pop) { c.update(); if (!c.dead) anyAlive = true; }
      frame++;
      if (!anyAlive || frame > 1400) { evolve(); break; }
    }
  }

  function loop() {
    if (mode === 'sim' && running) tick();
    render();
    raf = requestAnimationFrame(loop);
  }

  /* ---------- Mouse drawing on the canvas ---------- */
  function toCanvas(e) {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height)];
  }
  canvas.addEventListener('pointerdown', e => {
    if (mode !== 'draw') return;
    drawing = true; drawnPts = [toCanvas(e)];
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (mode !== 'draw' || !drawing) return;
    const p = toCanvas(e), last = drawnPts[drawnPts.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 10) drawnPts.push(p);
  });
  canvas.addEventListener('pointerup', () => {
    if (mode !== 'draw' || !drawing) return;
    drawing = false;
    if (drawnPts.length >= 8) {
      const custom = resampleClosed(drawnPts, 110);
      buildTrack(custom);
      fresh();
      mode = 'sim'; running = false;
      drawBtn.textContent = '✏️ Draw your track';
    } else {
      drawnPts = [];
    }
  });

  /* ---------- Controls ---------- */
  document.getElementById('sim-start').addEventListener('click', () => { if (mode === 'sim') running = true; });
  document.getElementById('sim-pause').addEventListener('click', () => { running = false; });
  const fastBtn = document.getElementById('sim-fast');
  fastBtn.addEventListener('click', () => {
    speedMult = speedMult === 1 ? 3 : speedMult === 3 ? 8 : 1;
    fastBtn.textContent = '⏩ Speed: ' + speedMult + '×';
  });
  document.getElementById('sim-reset').addEventListener('click', () => { fresh(); running = false; });
  const drawBtn = document.getElementById('sim-draw');
  drawBtn.addEventListener('click', () => {
    if (mode === 'draw') { mode = 'sim'; drawBtn.textContent = '✏️ Draw your track'; canvas.style.cursor = 'default'; }
    else { mode = 'draw'; running = false; drawnPts = []; drawBtn.textContent = '✖ Cancel drawing'; canvas.style.cursor = 'crosshair'; }
  });
  document.getElementById('sim-default').addEventListener('click', () => {
    buildTrack(defaultCenter()); fresh(); mode = 'sim'; running = false;
    drawBtn.textContent = '✏️ Draw your track'; canvas.style.cursor = 'default';
  });
  document.getElementById('s-pop').addEventListener('input', function () {
    popSize = +this.value; document.getElementById('s-pop-v').textContent = this.value;
  });
  document.getElementById('s-mut').addEventListener('input', function () {
    mutRate = +this.value; document.getElementById('s-mut-v').textContent = (+this.value).toFixed(2);
  });

  buildTrack(defaultCenter());
  fresh();
  render();
  loop();
};

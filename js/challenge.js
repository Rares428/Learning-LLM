/* ============ Coding challenge: write the neuron, run tests, drive a car ============ */
window.LLMLab = window.LLMLab || {};
window.LLMLab.challenge = function () {
  const editor = document.getElementById('code-editor');
  const results = document.getElementById('test-results');
  const reward = document.getElementById('reward');
  const starter = editor.value;

  const solution = `// tanh is already defined for you.
function neuron(inputs, weights, bias) {
  let sum = 0;
  for (let i = 0; i < inputs.length; i++) {
    sum += inputs[i] * weights[i];
  }
  sum += bias;
  return tanh(sum);
}`;

  // reference implementation
  const ref = (x, w, b) => { let s = b; for (let i = 0; i < x.length; i++) s += x[i] * w[i]; return Math.tanh(s); };

  const cases = [
    { x: [0, 0], w: [0, 0], b: 0, label: 'all zeros → 0' },
    { x: [1], w: [2], b: 0, label: 'one input, weight 2' },
    { x: [0.5, -0.3], w: [1, 0.8], b: 0, label: 'two inputs' },
    { x: [1, 1, 1], w: [1, 1, 1], b: -2, label: 'with negative bias' },
    { x: [-0.4, 0.9, 0.2], w: [1.5, -0.7, 2.0], b: 0.3, label: 'mixed case' },
    { x: [0.7], w: [-3], b: 1, label: 'negative weight' },
  ];

  let passedAll = false;

  function runTests() {
    results.innerHTML = '';
    let userNeuron;
    try {
      const factory = new Function('tanh', editor.value + '\n;return neuron;');
      userNeuron = factory(Math.tanh);
      if (typeof userNeuron !== 'function') throw new Error('function "neuron" was not found');
    } catch (err) {
      results.innerHTML = '<div class="test-summary no">❌ Invalid code: ' + err.message + '</div>';
      return;
    }

    let pass = 0;
    cases.forEach((c, i) => {
      let got, ok = false, msg;
      try {
        got = userNeuron(c.x, c.w, c.b);
        ok = typeof got === 'number' && Math.abs(got - ref(c.x, c.w, c.b)) < 1e-6;
        msg = ok ? 'correct (' + got.toFixed(4) + ')' : 'you returned ' + (typeof got === 'number' ? got.toFixed(4) : got) + ', the correct answer was ' + ref(c.x, c.w, c.b).toFixed(4);
      } catch (e) { msg = 'runtime error: ' + e.message; }
      if (ok) pass++;
      const line = document.createElement('div');
      line.className = 'test-line ' + (ok ? 'test-pass' : 'test-fail');
      line.innerHTML = (ok ? '✓' : '✗') + ' <span>Test ' + (i + 1) + ' — ' + c.label + ': ' + msg + '</span>';
      results.appendChild(line);
    });

    const summary = document.createElement('div');
    if (pass === cases.length) {
      summary.className = 'test-summary ok';
      summary.textContent = '✅ All ' + cases.length + ' tests pass! You built a working neuron.';
      passedAll = true;
      reward.classList.remove('hidden');
      setupReward(userNeuron);
    } else {
      summary.className = 'test-summary no';
      summary.textContent = pass + '/' + cases.length + ' tests pass. Keep trying — check the sum and the tanh.';
    }
    results.appendChild(summary);
  }

  document.getElementById('run-tests').addEventListener('click', runTests);
  document.getElementById('reset-code').addEventListener('click', () => { editor.value = starter; results.innerHTML = ''; });
  document.getElementById('show-solution').addEventListener('click', () => { editor.value = solution; });

  /* ---------- Reward: a car driven by the student's neuron() ---------- */
  let rewardInited = false, rewardCar, rewardRAF, userNeuronRef;
  const rc = document.getElementById('reward-canvas'), rctx = rc.getContext('2d');
  const RW = rc.width, RH = rc.height, rcx = RW / 2, rcy = RH / 2;
  const rHalf = 40;
  const rCenter = [];
  for (let i = 0; i < 80; i++) {
    const t = i / 80 * Math.PI * 2;
    rCenter.push([rcx + Math.cos(t) * (RW / 2 - 80), rcy + Math.sin(t) * (RH / 2 - 60)]);
  }

  function nearestCenter(x, y) {
    let nd = 1e9, idx = 0;
    for (let i = 0; i < rCenter.length; i++) {
      const d = (rCenter[i][0] - x) ** 2 + (rCenter[i][1] - y) ** 2;
      if (d < nd) { nd = d; idx = i; }
    }
    return { dist: Math.sqrt(nd), idx };
  }
  function wallDist(x, y, ang) {
    for (let d = 6; d < 120; d += 4) {
      const px = x + Math.cos(ang) * d, py = y + Math.sin(ang) * d;
      if (nearestCenter(px, py).dist > rHalf) return d / 120;
    }
    return 1;
  }

  function setupReward(fn) {
    userNeuronRef = fn;
    const start = rCenter[0], nxt = rCenter[1];
    rewardCar = { x: start[0], y: start[1], angle: Math.atan2(nxt[1] - start[1], nxt[0] - start[0]) };
    if (!rewardInited) {
      rewardInited = true;
      document.getElementById('reward-start').addEventListener('click', () => {
        if (rewardRAF) return;
        const s = rCenter[0], n = rCenter[1];
        rewardCar = { x: s[0], y: s[1], angle: Math.atan2(n[1] - s[1], n[0] - s[0]) };
        rewardLoop();
      });
    }
    drawRewardTrack();
  }

  function drawRewardTrack() {
    rctx.fillStyle = '#0a0c18'; rctx.fillRect(0, 0, RW, RH);
    rctx.strokeStyle = '#272b4d'; rctx.lineWidth = rHalf * 2;
    rctx.beginPath();
    rCenter.forEach((p, i) => i ? rctx.lineTo(p[0], p[1]) : rctx.moveTo(p[0], p[1]));
    rctx.closePath(); rctx.stroke();
    rctx.strokeStyle = '#1a1d2e'; rctx.lineWidth = rHalf * 2 - 6; rctx.stroke();
  }

  function rewardLoop() {
    drawRewardTrack();
    const c = rewardCar;
    const sL = wallDist(c.x, c.y, c.angle - 0.5);
    const sR = wallDist(c.x, c.y, c.angle + 0.5);
    const sF = wallDist(c.x, c.y, c.angle);
    // steering decision computed by the STUDENT's neuron
    const steer = userNeuronRef([sL - sR], [-3.0], 0);
    c.angle += steer * 0.08;
    const speed = 1.4 + sF * 1.6;
    c.x += Math.cos(c.angle) * speed;
    c.y += Math.sin(c.angle) * speed;
    if (nearestCenter(c.x, c.y).dist > rHalf) {
      const s = rCenter[0], n = rCenter[1];
      c.x = s[0]; c.y = s[1]; c.angle = Math.atan2(n[1] - s[1], n[0] - s[0]);
    }
    [[-0.5, sL], [0, sF], [0.5, sR]].forEach(([off, d]) => {
      const a = c.angle + off;
      rctx.strokeStyle = '#f7b95588'; rctx.lineWidth = 1.5;
      rctx.beginPath(); rctx.moveTo(c.x, c.y);
      rctx.lineTo(c.x + Math.cos(a) * d * 120, c.y + Math.sin(a) * d * 120); rctx.stroke();
    });
    rctx.save(); rctx.translate(c.x, c.y); rctx.rotate(c.angle);
    rctx.fillStyle = '#37e0a0'; rctx.shadowColor = '#37e0a0'; rctx.shadowBlur = 12;
    rctx.fillRect(-9, -5, 18, 10); rctx.restore(); rctx.shadowBlur = 0;
    rctx.fillStyle = '#37e0a0'; rctx.font = '12px Inter';
    rctx.fillText('🏎️ driven by your neuron() function', 14, RH - 14);
    rewardRAF = requestAnimationFrame(rewardLoop);
  }
};

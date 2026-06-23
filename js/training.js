/* ============ Module 8: gradient descent demo ============ */
window.LLMLab = window.LLMLab || {};
window.LLMLab.train = function () {
  const canvas = document.getElementById('loss-canvas'), ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = 36;

  // a non-trivial loss curve with a couple of dips (so learning rate matters)
  function loss(x) {
    return 0.5 * x * x - 0.9 * Math.cos(2.4 * x) + 0.9 + 0.12 * Math.sin(4 * x);
  }
  function grad(x) {
    const h = 1e-4;
    return (loss(x + h) - loss(x - h)) / (2 * h);
  }

  const xMin = -3.2, xMax = 3.2;
  let yMax = 0; for (let x = xMin; x <= xMax; x += 0.05) yMax = Math.max(yMax, loss(x));
  yMax *= 1.08;

  let ballX = 2.6, iter = 0, anim = null;
  const sx = x => pad + (x - xMin) / (xMax - xMin) * (W - 2 * pad);
  const sy = y => H - pad - (y / yMax) * (H - 2 * pad);

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // axes
    ctx.strokeStyle = '#ffffff14'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, H - pad); ctx.lineTo(W - pad, H - pad); ctx.stroke();
    ctx.fillStyle = '#9aa0c4'; ctx.font = '11px Inter';
    ctx.fillText('weight value →', W - 130, H - pad + 22);
    ctx.save(); ctx.translate(14, H / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText('error (loss)', 0, 0); ctx.restore();

    // curve
    ctx.strokeStyle = '#6c7bff'; ctx.lineWidth = 2.5; ctx.beginPath();
    let first = true;
    for (let x = xMin; x <= xMax; x += 0.02) {
      const X = sx(x), Y = sy(loss(x));
      if (first) { ctx.moveTo(X, Y); first = false; } else ctx.lineTo(X, Y);
    }
    ctx.stroke();
    // fill under curve
    ctx.lineTo(sx(xMax), H - pad); ctx.lineTo(sx(xMin), H - pad); ctx.closePath();
    ctx.fillStyle = 'rgba(108,123,255,0.08)'; ctx.fill();

    // tangent (the gradient direction) at ball
    const g = grad(ballX), bx = sx(ballX), by = sy(loss(ballX));
    const dx = 0.7;
    ctx.strokeStyle = '#f7b955'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(sx(ballX - dx), sy(loss(ballX) - g * dx));
    ctx.lineTo(sx(ballX + dx), sy(loss(ballX) + g * dx));
    ctx.stroke();

    // ball
    ctx.fillStyle = '#37e0a0'; ctx.shadowColor = '#37e0a0'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(bx, by, 9, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, 9, 0, 7); ctx.stroke();

    // arrow showing next step direction
    const dir = -Math.sign(g);
    ctx.fillStyle = '#37e0a0'; ctx.font = '600 13px Inter';
    ctx.fillText(dir > 0 ? '→ lower this way' : '← lower this way', bx + (dir > 0 ? 14 : -104), by - 16);

    document.getElementById('train-iter').textContent = iter;
    document.getElementById('train-loss').textContent = loss(ballX).toFixed(4);
  }

  function step() {
    const lr = +document.getElementById('lr').value;
    ballX = ballX - lr * grad(ballX);
    ballX = Math.max(xMin, Math.min(xMax, ballX));
    iter++;
    draw();
  }

  document.getElementById('lr').addEventListener('input', function () {
    document.getElementById('lr-v').textContent = (+this.value).toFixed(2);
  });
  document.getElementById('train-step').addEventListener('click', step);
  document.getElementById('train-run').addEventListener('click', () => {
    if (anim) return;
    let n = 0;
    anim = setInterval(() => { step(); if (++n >= 50) { clearInterval(anim); anim = null; } }, 60);
  });
  document.getElementById('train-reset').addEventListener('click', () => {
    if (anim) { clearInterval(anim); anim = null; }
    ballX = xMin + Math.random() * (xMax - xMin); iter = 0; draw();
  });
  document.getElementById('lr-v').textContent = (+document.getElementById('lr').value).toFixed(2);
  draw();
};

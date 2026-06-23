/* ============ Module 2: interactive single neuron ============ */
window.LLMLab = window.LLMLab || {};
window.LLMLab.neuron = function () {
  const $ = id => document.getElementById(id);
  const canvas = $('neuron-canvas'), ctx = canvas.getContext('2d');
  const ids = ['n-x1', 'n-w1', 'n-x2', 'n-w2', 'n-b'];
  const acts = {
    tanh: x => Math.tanh(x),
    sigmoid: x => 1 / (1 + Math.exp(-x)),
    relu: x => Math.max(0, x)
  };

  function fmt(v) { return (v >= 0 ? ' ' : '') + v.toFixed(2); }

  function draw() {
    const x1 = +$('n-x1').value, w1 = +$('n-w1').value;
    const x2 = +$('n-x2').value, w2 = +$('n-w2').value;
    const b = +$('n-b').value, actName = $('n-act').value;
    ['n-x1', 'n-w1', 'n-x2', 'n-w2', 'n-b'].forEach(id => $(id + '-v').textContent = fmt(+$(id).value));

    const sum = w1 * x1 + w2 * x2 + b;
    const out = acts[actName](sum);
    $('n-sum').textContent = fmt(sum);
    $('n-out').textContent = fmt(out);

    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // layout
    const inX = 90, outX = 360, midY = H / 2;
    const inputs = [
      { y: 120, x: x1, w: w1, label: 'x₁' },
      { y: 240, x: x2, w: w2, label: 'x₂' }
    ];

    // connections (thickness/color by weight)
    inputs.forEach(inp => {
      const mag = Math.min(Math.abs(inp.w), 2) / 2;
      ctx.lineWidth = 1 + mag * 7;
      ctx.strokeStyle = inp.w >= 0 ? 'rgba(55,224,160,' + (0.3 + mag * 0.7) + ')'
        : 'rgba(255,93,108,' + (0.3 + mag * 0.7) + ')';
      ctx.beginPath(); ctx.moveTo(inX + 26, inp.y); ctx.lineTo(outX - 40, midY); ctx.stroke();
      // weight label
      ctx.fillStyle = '#9aa0c4'; ctx.font = '12px JetBrains Mono';
      ctx.fillText('w=' + inp.w.toFixed(2), (inX + outX) / 2 - 30, (inp.y + midY) / 2 + (inp.y < midY ? -6 : 14));
    });

    // input nodes
    inputs.forEach(inp => {
      const act = Math.min(Math.abs(inp.x), 1);
      ctx.fillStyle = '#151830'; ctx.strokeStyle = '#6c7bff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(inX, inp.y, 26, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(34,211,238,' + (0.15 + act * 0.6) + ')';
      ctx.beginPath(); ctx.arc(inX, inp.y, 26, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '600 14px Inter'; ctx.textAlign = 'center';
      ctx.fillText(inp.label, inX, inp.y - 4);
      ctx.font = '11px JetBrains Mono'; ctx.fillText(inp.x.toFixed(2), inX, inp.y + 12);
      ctx.textAlign = 'left';
    });

    // bias bubble
    ctx.fillStyle = '#9aa0c4'; ctx.font = '12px JetBrains Mono';
    ctx.fillText('bias = ' + b.toFixed(2), outX - 56, midY + 70);

    // neuron body — glow by output
    const glow = Math.min(Math.abs(out), 1);
    const grad = ctx.createRadialGradient(outX, midY, 4, outX, midY, 46);
    const col = out >= 0 ? '55,224,160' : '255,93,108';
    grad.addColorStop(0, 'rgba(' + col + ',' + (0.4 + glow * 0.6) + ')');
    grad.addColorStop(1, 'rgba(' + col + ',0.05)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(outX, midY, 42, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(outX, midY, 42, 0, 7); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '600 13px Inter';
    ctx.fillText('Σ + act', outX, midY - 4);
    ctx.font = '600 16px JetBrains Mono';
    ctx.fillText(out.toFixed(2), outX, midY + 16);

    // output arrow
    ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2 + glow * 4;
    ctx.beginPath(); ctx.moveTo(outX + 42, midY); ctx.lineTo(outX + 110, midY); ctx.stroke();
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath(); ctx.moveTo(outX + 110, midY); ctx.lineTo(outX + 100, midY - 6); ctx.lineTo(outX + 100, midY + 6); ctx.fill();
    ctx.fillStyle = '#22d3ee'; ctx.font = '600 13px Inter';
    ctx.fillText('output', outX + 75, midY - 12);
    ctx.textAlign = 'left';
  }

  [...ids, 'n-act'].forEach(id => $(id).addEventListener('input', draw));
  draw();
};

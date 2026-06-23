/* ============ Module 3: 3D neural network (Three.js) ============ */
window.LLMLab = window.LLMLab || {};
window.LLMLab.network = function () {
  const container = document.getElementById('net3d-canvas');
  if (!window.THREE) { container.innerHTML = '<p style="padding:20px;color:#9aa0c4">Could not load Three.js (check your internet connection).</p>'; return; }

  const layers = [4, 6, 6, 3];
  const xGap = 5, yGap = 2.2;
  let autoRotate = true;

  const scene = new THREE.Scene();
  const W = container.clientWidth, H = container.clientHeight;
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 1000);
  camera.position.set(0, 0, 22);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const pl = new THREE.PointLight(0x6c7bff, 1.2); pl.position.set(10, 10, 20); scene.add(pl);
  const pl2 = new THREE.PointLight(0x22d3ee, 0.8); pl2.position.set(-15, -8, 10); scene.add(pl2);

  const group = new THREE.Group();
  scene.add(group);

  // build neurons
  const neurons = []; // [layer][i] => mesh
  const nGeo = new THREE.SphereGeometry(0.45, 24, 24);
  layers.forEach((count, li) => {
    const arr = [];
    const x = (li - (layers.length - 1) / 2) * xGap;
    for (let i = 0; i < count; i++) {
      const y = (i - (count - 1) / 2) * yGap;
      const mat = new THREE.MeshStandardMaterial({
        color: 0x1b1f3a, emissive: 0x22d3ee, emissiveIntensity: 0.08,
        metalness: 0.4, roughness: 0.4
      });
      const mesh = new THREE.Mesh(nGeo, mat);
      mesh.position.set(x, y, 0);
      mesh.userData = { base: 0.08, target: 0.08, layer: li, i };
      group.add(mesh);
      arr.push(mesh);
    }
    neurons.push(arr);
  });

  // build connections
  const connections = [];
  function buildWeights() {
    connections.forEach(c => group.remove(c.line));
    connections.length = 0;
    for (let li = 0; li < layers.length - 1; li++) {
      neurons[li].forEach(a => {
        neurons[li + 1].forEach(b => {
          const w = (Math.random() * 2 - 1);
          const mag = Math.abs(w);
          const color = w >= 0 ? new THREE.Color(0x37e0a0) : new THREE.Color(0xff5d6c);
          const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.12 + mag * 0.4 });
          const geo = new THREE.BufferGeometry().setFromPoints([a.position, b.position]);
          const line = new THREE.Line(geo, mat);
          group.add(line);
          connections.push({ line, from: a, to: b, w, baseOpacity: 0.12 + mag * 0.4 });
        });
      });
    }
  }
  buildWeights();

  // forward-pass pulse animation
  function pulse() {
    let delay = 0;
    layers.forEach((count, li) => {
      setTimeout(() => {
        neurons[li].forEach(n => { n.userData.target = 0.9 + Math.random() * 0.6; });
        connections.filter(c => c.from.userData.layer === li).forEach(c => {
          c.line.material.opacity = Math.min(1, c.baseOpacity + 0.5);
          setTimeout(() => { c.line.material.opacity = c.baseOpacity; }, 420);
        });
        setTimeout(() => { neurons[li].forEach(n => { n.userData.target = n.userData.base; }); }, 520);
      }, delay);
      delay += 300;
    });
  }

  // mouse drag rotation
  let dragging = false, px = 0, py = 0, rotX = 0.2, rotY = 0;
  container.addEventListener('pointerdown', e => { dragging = true; px = e.clientX; py = e.clientY; });
  window.addEventListener('pointerup', () => dragging = false);
  window.addEventListener('pointermove', e => {
    if (!dragging) return;
    rotY += (e.clientX - px) * 0.008;
    rotX += (e.clientY - py) * 0.008;
    rotX = Math.max(-1, Math.min(1, rotX));
    px = e.clientX; py = e.clientY;
  });

  // controls
  document.getElementById('net-pulse').addEventListener('click', pulse);
  document.getElementById('net-rand').addEventListener('click', buildWeights);
  const rotBtn = document.getElementById('net-rotate');
  rotBtn.addEventListener('click', () => {
    autoRotate = !autoRotate;
    rotBtn.textContent = '⟳ Auto-rotate: ' + (autoRotate ? 'ON' : 'OFF');
  });

  function onResize() {
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  // auto-pulse loop
  let lastPulse = 0;
  function animate(t) {
    if (autoRotate && !dragging) rotY += 0.0035;
    group.rotation.y = rotY;
    group.rotation.x = rotX;
    neurons.flat().forEach(n => {
      const cur = n.material.emissiveIntensity;
      n.material.emissiveIntensity += (n.userData.target - cur) * 0.12;
      const s = 1 + Math.min(n.material.emissiveIntensity, 1.5) * 0.18;
      n.scale.setScalar(s);
    });
    if (t - lastPulse > 4200) { pulse(); lastPulse = t; }
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
};

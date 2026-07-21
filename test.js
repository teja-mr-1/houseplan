
// ─── Scene Setup ─────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000010);
scene.fog = new THREE.FogExp2(0x000010, 0.008);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(30, 40, 50);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('canvas-container').appendChild(renderer.domElement);

// ─── Lighting ─────────────────────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0x001133, 1.5);
scene.add(ambient);

const pointLight1 = new THREE.PointLight(0x00e5ff, 2.5, 200);
pointLight1.position.set(10, 60, 10);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0x7c4dff, 1.5, 200);
pointLight2.position.set(-30, 40, -20);
scene.add(pointLight2);

const pointLight3 = new THREE.PointLight(0x00ff88, 1.0, 150);
pointLight3.position.set(30, 20, 30);
scene.add(pointLight3);

// ─── Grid ─────────────────────────────────────────────────────────────────────
const gridHelper = new THREE.GridHelper(200, 40, 0x003344, 0x001a22);
scene.add(gridHelper);

// ─── Coordinate Conversion ───────────────────────────────────────────────────
// SVG coords → 3D World: SVG x→ world X (flipped), SVG y → world Z
// SVG origin approx: x=0..420, y=0..450 (1 SVG unit = 0.1 world units roughly)
const S = 0.08; // scale
function svgToWorld(svgX, svgY) {
  return [(svgX - 210) * S, 0, (svgY - 225) * S];
}

// ─── Material helpers ─────────────────────────────────────────────────────────
function holoBorderMat(color = 0x00e5ff, opacity = 0.9) {
  return new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity,
    emissive: color,
    emissiveIntensity: 0.4,
    roughness: 0.2,
    metalness: 0.6
  });
}
function holoFillMat(color = 0x00e5ff, opacity = 0.18) {
  return new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity,
    emissive: color,
    emissiveIntensity: 0.15,
    roughness: 0.5,
    metalness: 0.1,
    side: THREE.DoubleSide
  });
}

// Global collections
const roofMeshes = [];
const wireframeMeshes = [];
let wireframeOn = false;
let roofVisible = true;
let hologramMode = false;

// ─── Build a room box ────────────────────────────────────────────────────────
function makeRoom(svgX, svgY, svgW, svgH, fillColor, name) {
  const wx = svgX * S, wz = svgY * S;
  const ww = svgW * S, wd = svgH * S;
  const cx = wx - (210 * S) + ww / 2;
  const cz = wz - (225 * S) + wd / 2;

  // Floor
  const floorGeo = new THREE.BoxGeometry(ww, 0.05, wd);
  const floor = new THREE.Mesh(floorGeo, holoFillMat(fillColor, 0.22));
  floor.position.set(cx, 0.025, cz);
  scene.add(floor);

  // Label
  addLabel(name, cx, H + 0.5, cz, fillColor);
}

// ─── Wall height in world units ───────────────────────────────────────────────
const H = 2.5; // 10ft ceiling

// ─── Compound (Plot boundary) ─────────────────────────────────────────────────
function makeCompound() {
  const px = (0 - 210) * S, pz = (0 - 225) * S;
  const pw = 420 * S, pd = 450 * S;
  const ch = 0.6;
  const wallThick = 0.12;
  const cmat = new THREE.MeshStandardMaterial({
    color: 0xff1744, transparent: true, opacity: 0.35,
    emissive: 0xff1744, emissiveIntensity: 0.2
  });
  // North
  [
    { w: pw, d: wallThick, px: px + pw/2, pz: pz },
    { w: pw, d: wallThick, px: px + pw/2, pz: pz + pd },
    { w: wallThick, d: pd, px: px, pz: pz + pd/2 },
    { w: wallThick, d: pd, px: px + pw, pz: pz + pd/2 },
  ].forEach(w => {
    const geo = new THREE.BoxGeometry(w.w, ch, w.d);
    const mesh = new THREE.Mesh(geo, cmat);
    mesh.position.set(w.px, ch/2, w.pz);
    scene.add(mesh);
  });
}

// ─── Exact Wall Segments ──────────────────────────────────────────────────────
function makeWallSegment(svgX, svgY, svgW, svgH) {
  const wx = svgX * S, wz = svgY * S;
  const ww = svgW * S, wd = svgH * S;
  const cx = wx - (210 * S) + ww / 2;
  const cz = wz - (225 * S) + wd / 2;
  
  const geo = new THREE.BoxGeometry(ww, H, wd);
  const mat = holoBorderMat(0x00e5ff, 0.95);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(cx, H/2, cz);
  mesh.castShadow = true;
  scene.add(mesh);
  wireframeMeshes.push(mesh);
}

function makeExactWalls() {
  // Outer North (Left)
  makeWallSegment(90, 140, 10, 290);
  // Outer South (Right)
  makeWallSegment(390, 140, 10, 290);
  // Outer West (Bottom)
  makeWallSegment(100, 420, 290, 10);
  
  // Outer East (Top) with Main Door gap (162.5 to 192.5)
  makeWallSegment(100, 140, 62.5, 10);
  makeWallSegment(192.5, 140, 197.5, 10);

  // Vertical: Hall / Kitchen (Y=150 to 215)
  makeWallSegment(255, 150, 5, 65);
  
  // Vertical: NW Bed / Baths
  makeWallSegment(200, 285, 5, 20); // before Bath 1 door
  makeWallSegment(200, 335, 5, 85); // after Bath 1 door
  
  // Vertical: Baths / Master Bed
  makeWallSegment(255, 285, 5, 95); // before Bath 2 door
  makeWallSegment(255, 410, 5, 10); // after Bath 2 door
  
  // Horizontal: Hall/Kitchen & Beds
  makeWallSegment(100, 280, 5, 5); // Corner before NW Bed door
  makeWallSegment(135, 280, 130, 5); // Between NW Bed door and Master Bed door
  makeWallSegment(295, 280, 95, 5); // After Master Bed door
  
  // Horizontal: Bath 1 / Bath 2 divider
  makeWallSegment(205, 345, 50, 5);

  // Roof
  const ww = 310 * S, wd = 290 * S;
  const wx = (90 - 210) * S, wz = (140 - 225) * S;
  const cx = wx + ww/2, cz = wz + wd/2;
  const roofGeo = new THREE.BoxGeometry(ww + 0.5, 0.12, wd + 0.5);
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x00e5ff, transparent: true, opacity: 0.13,
    emissive: 0x00e5ff, emissiveIntensity: 0.1, side: THREE.DoubleSide
  });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(cx, H + 0.06, cz);
  scene.add(roof);
  roofMeshes.push(roof);

  const edges = new THREE.EdgesGeometry(roofGeo);
  const lineMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.7 });
  const edgeMesh = new THREE.LineSegments(edges, lineMat);
  edgeMesh.position.copy(roof.position);
  scene.add(edgeMesh);
  roofMeshes.push(edgeMesh);
}

// ─── Internal rooms ───────────────────────────────────────────────────────────
function makeRooms() {
  // Hall
  makeRoom(100,150,155,130, 0x4fc3f7, 'హాల్');
  // Kitchen
  makeRoom(260,150,130,130, 0xa5d6a7, 'కిచెన్');
  // Bed Room
  makeRoom(100,285,100,135, 0xce93d8, 'బెడ్ రూమ్');
  // Master Bed
  makeRoom(260,285,130,135, 0x80cbc4, 'మాస్టర్ బెడ్');
  // Bath 1
  makeRoom(205,285,50,60, 0xfff176, 'బాత్ 1');
  // Bath 2
  makeRoom(205,350,50,70, 0xfff176, 'బాత్ 2');
}

// ─── Portico ──────────────────────────────────────────────────────────────────
function makePorfico() {
  // SVG: x=100,y=80,w=155,h=60
  const px = (100 - 210) * S, pz = (80 - 225) * S;
  const pw = 155 * S, pd = 60 * S;
  const cx = px + pw/2, cz = pz + pd/2;

  const mat = holoFillMat(0x81d4fa, 0.18);
  const geo = new THREE.BoxGeometry(pw, H * 0.6, pd);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(cx, H * 0.3, cz);
  scene.add(mesh);

  // Pillar left
  addPillar(px + 0.3, cz - pd/2 + 0.3);
  addPillar(px + 0.3, cz + pd/2 - 0.3);
  addPillar(px + pw - 0.3, cz - pd/2 + 0.3);
  addPillar(px + pw - 0.3, cz + pd/2 - 0.3);

  // Portico roof
  const roofGeo = new THREE.BoxGeometry(pw + 0.3, 0.1, pd + 0.3);
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x81d4fa, transparent: true, opacity: 0.22,
    emissive: 0x81d4fa, emissiveIntensity: 0.15
  });
  const roofM = new THREE.Mesh(roofGeo, roofMat);
  roofM.position.set(cx, H * 0.6, cz);
  scene.add(roofM);
  roofMeshes.push(roofM);

  addLabel('పోర్టికో (6\')', cx, H * 0.65 + 0.6, cz, 0x81d4fa);
}

function addPillar(x, z) {
  const geo = new THREE.CylinderGeometry(0.1, 0.12, H * 0.6, 8);
  const mat = holoBorderMat(0x81d4fa, 0.85);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, H * 0.3, z);
  scene.add(mesh);
}

// ─── Steps ────────────────────────────────────────────────────────────────────
function makeSteps() {
  // SVG translate(290,80)
  const ox = (290 - 210) * S, oz = (80 - 225) * S;
  for (let i = 0; i < 5; i++) {
    const sw = 0.6, sd = (5 - i) * 0.8 * S * 10, sh = 0.12 * (i + 1);
    const geo = new THREE.BoxGeometry(sw, sh, sd);
    const mat = holoBorderMat(0xb0bec5, 0.75);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(ox + sw/2, sh/2, oz + (5-i)*0.4*S*10/2);
    scene.add(mesh);
  }
}

// ─── Glowing Doors ────────────────────────────────────────────────────────────
function makeDoors() {
  // Main Door (Orange)
  makeDoor(192.5, 150, 30, Math.PI * 0.75, 0xffaa00);
  // NW Bed to Hall
  makeDoor(105, 285, 30, Math.PI * 0.25, 0x00e5ff);
  // Kitchen to Master Bed
  makeDoor(265, 285, 30, Math.PI * 0.25, 0x00e5ff);
  // Master Bed to Bath 2
  makeDoor(255, 380, 30, Math.PI * 0.75, 0x00e5ff);
  // NW Bed to Bath 1
  makeDoor(205, 305, 30, Math.PI * 0.25, 0x00e5ff);
}

function makeDoor(svgX, svgY, width, angleY, color) {
  const dw = width * S;
  const dh = H * 0.75; 
  const geo = new THREE.BoxGeometry(dw, dh, 0.04);
  geo.translate(dw/2, 0, 0); 
  const mat = new THREE.MeshStandardMaterial({
    color: color, transparent: true, opacity: 0.85,
    emissive: color, emissiveIntensity: 0.5,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set((svgX - 210) * S, dh/2, (svgY - 225) * S);
  mesh.rotation.y = angleY; 
  scene.add(mesh);
}

// ─── Glowing floor grid (inside house) ───────────────────────────────────────
function makeHouseFloor() {
  const wx = (90 - 210) * S, wz = (140 - 225) * S;
  const ww = 310 * S, wd = 290 * S;
  const geo = new THREE.PlaneGeometry(ww, wd, 12, 12);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x001a33, transparent: true, opacity: 0.7,
    emissive: 0x001122, emissiveIntensity: 0.3
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(wx + ww/2, 0, wz + wd/2);
  scene.add(mesh);

  // Glowing grid lines
  const grid = new THREE.GridHelper(ww, 10, 0x00e5ff, 0x003344);
  grid.position.set(wx + ww/2, 0.01, wz + wd/2);
  scene.add(grid);
}

// ─── Glowing particles ────────────────────────────────────────────────────────
function makeParticles() {
  const geo = new THREE.BufferGeometry();
  const count = 600;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i*3]   = (Math.random() - 0.5) * 80;
    positions[i*3+1] = Math.random() * 30;
    positions[i*3+2] = (Math.random() - 0.5) * 80;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x00e5ff, size: 0.06, transparent: true, opacity: 0.5
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);
  return points;
}

// ─── Orbit Controls (manual) ─────────────────────────────────────────────────
let isDragging = false, isRight = false;
let prevX = 0, prevY = 0;
let theta = 0.4, phi = 0.9, radius = 60;
let target = new THREE.Vector3(0, 2, 0);
let panDelta = new THREE.Vector3();

function updateCamera() {
  camera.position.set(
    target.x + radius * Math.sin(phi) * Math.sin(theta),
    target.y + radius * Math.cos(phi),
    target.z + radius * Math.sin(phi) * Math.cos(theta)
  );
  camera.lookAt(target);
}
updateCamera();

renderer.domElement.addEventListener('mousedown', e => {
  isDragging = true;
  isRight = e.button === 2;
  prevX = e.clientX; prevY = e.clientY;
});
renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('mouseup', () => { isDragging = false; });
window.addEventListener('mousemove', e => {
  if (!isDragging) return;
  const dx = e.clientX - prevX, dy = e.clientY - prevY;
  if (isRight) {
    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    right.crossVectors(camera.getWorldDirection(new THREE.Vector3()), up).normalize();
    target.addScaledVector(right, -dx * 0.04);
    target.y += dy * 0.04;
  } else {
    theta -= dx * 0.008;
    phi = Math.max(0.1, Math.min(Math.PI/2.1, phi - dy * 0.008));
  }
  prevX = e.clientX; prevY = e.clientY;
  updateCamera();
});
renderer.domElement.addEventListener('wheel', e => {
  radius = Math.max(10, Math.min(120, radius + e.deltaY * 0.05));
  updateCamera();
});

// ─── Touch support ────────────────────────────────────────────────────────────
let lastTouchDist = null;
renderer.domElement.addEventListener('touchstart', e => {
  if (e.touches.length === 1) {
    isDragging = true; isRight = false;
    prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
  }
});
renderer.domElement.addEventListener('touchend', () => { isDragging = false; lastTouchDist = null; });
renderer.domElement.addEventListener('touchmove', e => {
  e.preventDefault();
  if (e.touches.length === 1 && isDragging) {
    const dx = e.touches[0].clientX - prevX, dy = e.touches[0].clientY - prevY;
    theta -= dx * 0.008;
    phi = Math.max(0.1, Math.min(Math.PI/2.1, phi + dy * 0.008));
    prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
    updateCamera();
  } else if (e.touches.length === 2) {
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    if (lastTouchDist) { radius = Math.max(10, Math.min(120, radius - (d - lastTouchDist) * 0.1)); updateCamera(); }
    lastTouchDist = d;
  }
}, { passive: false });

// ─── Button handlers ──────────────────────────────────────────────────────────
function resetCamera() {
  theta = 0.4; phi = 0.9; radius = 60;
  target.set(0, 2, 0);
  updateCamera();
}
function toggleWireframe() {
  wireframeOn = !wireframeOn;
  wireframeMeshes.forEach(m => { if (m.material) m.material.wireframe = wireframeOn; });
}
function toggleRoof() {
  roofVisible = !roofVisible;
  roofMeshes.forEach(m => { m.visible = roofVisible; });
}
function toggleHologram() {
  hologramMode = !hologramMode;
  scene.background = new THREE.Color(hologramMode ? 0x000008 : 0x000010);
  pointLight1.intensity = hologramMode ? 4.0 : 2.5;
  pointLight2.intensity = hologramMode ? 2.5 : 1.5;
}

// ─── Build scene ──────────────────────────────────────────────────────────────
makeCompound();
makeHouseFloor();
makeExactWalls();
makeRooms();
makePorfico();
// makeSteps(); // Removed as requested
makeDoors();
const particles = makeParticles();

// ─── Animate ──────────────────────────────────────────────────────────────────
let t = 0;
function animate() {
  requestAnimationFrame(animate);
  t += 0.005;
  // Pulsing glow
  pointLight1.intensity = 2.5 + Math.sin(t * 1.5) * 0.5;
  // Floating particles
  particles.rotation.y = t * 0.05;
  renderer.render(scene, camera);
}
animate();

// ─── Resize ───────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Hide loader ──────────────────────────────────────────────────────────────
setTimeout(() => {
  document.getElementById('loading').style.transition = 'opacity 0.8s';
  document.getElementById('loading').style.opacity = '0';
  setTimeout(() => document.getElementById('loading').style.display = 'none', 800);
}, 1600);


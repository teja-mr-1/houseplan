
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

const pointLight1 = new THREE.PointLight(0x00e5ff, 1.5, 200); // Reduced from 2.5
pointLight1.position.set(10, 60, 10);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0x7c4dff, 1.0, 200); // Reduced from 1.5
pointLight2.position.set(-30, 40, -20);
scene.add(pointLight2);

const pointLight3 = new THREE.PointLight(0x00ff88, 0.8, 150); // Reduced from 1.0
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
    emissiveIntensity: 0.2, // Reduced from 0.4
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
    emissiveIntensity: 0.05, // Reduced from 0.15
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
function makeRoom(svgX, svgY, svgW, svgH, fillColor, name, dims) {
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
  addLabel(name, dims, cx, H + 0.5, cz, fillColor);
}

// ─── Label sprite ─────────────────────────────────────────────────────────────
function addLabel(text1, text2, x, y, z, color = 0x00e5ff) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const hex = '#' + color.toString(16).padStart(6, '0');
  ctx.fillStyle = hex;
  ctx.textAlign = 'center';
  ctx.shadowColor = hex;
  ctx.shadowBlur = 15;
  
  ctx.font = 'bold 44px Arial';
  
  // Add a dark stroke outline to make text highly visible against bright backgrounds
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#000000';
  ctx.strokeText(text1, 256, 50);
  ctx.fillText(text1, 256, 50);
  
  if(text2) {
    ctx.font = '32px Arial';
    ctx.strokeText(text2, 256, 100);
    ctx.fillText(text2, 256, 100);
  }
  
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(7, 1.75, 1);
  sprite.position.set(x, y, z);
  scene.add(sprite);
}

// ─── Small Label sprite ───────────────────────────────────────────────────────
function addSmallLabel(text, x, y, z, color = 0xffffff, sScale = 1.0) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `bold ${28 * sScale}px Arial`;
  
  const textWidth = ctx.measureText(text).width;
  const cWidth = Math.max(128 * sScale, textWidth + 40 * sScale);
  const cHeight = 64 * sScale;
  
  canvas.width = cWidth; 
  canvas.height = cHeight;
  
  const hex = '#' + color.toString(16).padStart(6, '0');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${28 * sScale}px Arial`;
  
  // Black outline for high visibility
  ctx.lineWidth = 4 * sScale;
  ctx.strokeStyle = '#000000';
  ctx.strokeText(text, cWidth / 2, cHeight / 2);
  
  ctx.fillStyle = hex;
  ctx.fillText(text, cWidth / 2, cHeight / 2);
  
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  
  const worldHeight = 1.25 * sScale;
  const worldWidth = worldHeight * (cWidth / cHeight);
  
  sprite.scale.set(worldWidth, worldHeight, 1);
  sprite.position.set(x, y, z);
  scene.add(sprite);
}

// ─── Wall height in world units ───────────────────────────────────────────────
const H = 2.5; // 10ft ceiling

// ─── Compound (Plot boundary) ─────────────────────────────────────────────────
function makeCompWall(svgX, svgY, svgW, svgH) {
  const ww = Math.max(svgW * S, 0.12); 
  const wd = Math.max(svgH * S, 0.12);
  const cx = (svgX - 210) * S + ww / 2;
  const cz = (svgY - 225) * S + wd / 2;
  const ch = 0.6;
  
  const geo = new THREE.BoxGeometry(ww, ch, wd);
  const cmat = new THREE.MeshStandardMaterial({
    color: 0xff1744, transparent: true, opacity: 0.6,
    emissive: 0xff1744, emissiveIntensity: 0.3
  });
  const mesh = new THREE.Mesh(geo, cmat);
  mesh.position.set(cx, ch/2, cz);
  scene.add(mesh);

  const edges = new THREE.EdgesGeometry(geo);
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xff5252, transparent: true, opacity: 0.9 });
  const edgeMesh = new THREE.LineSegments(edges, edgeMat);
  edgeMesh.position.copy(mesh.position);
  scene.add(edgeMesh);
}

function makeGate(svgX, svgY, svgW, svgH) {
  const ww = Math.max(svgW * S, 0.05); 
  const wd = Math.max(svgH * S, 0.05);
  const cx = (svgX - 210) * S + ww / 2;
  const cz = (svgY - 225) * S + wd / 2;
  const ch = 0.7; // Taller than compound wall
  
  const geo = new THREE.BoxGeometry(ww, ch, wd);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x00ffaa, transparent: true, opacity: 0.8,
    emissive: 0x00ffaa, emissiveIntensity: 0.5
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(cx, ch/2, cz);
  scene.add(mesh);
  addSmallLabel("గేటు", cx, ch + 0.3, cz, 0x00ffaa);
}

function makeCompound() {
  // North Wall (X=0)
  makeCompWall(-2, 0, 2, 450);
  // East Wall (Y=0)
  makeCompWall(0, -2, 420, 2);
  
  // South Wall (X=420) with Gate at Y=30 to 45 (Size 15, matching 1.5ft path, 3ft from corner)
  makeCompWall(420, 0, 2, 30);
  makeGate(420, 30, 2, 15);
  makeCompWall(420, 45, 2, 405);

  // West Wall (Y=450) with Gate at X=10 to 50
  makeCompWall(0, 450, 10, 2);
  makeGate(10, 450, 40, 2);
  makeCompWall(50, 450, 370, 2);
}

// ─── Landscaping ──────────────────────────────────────────────────────────────
function makeLandscaping() {
  // Base Compound Sand Area (0 to 420 in X, 0 to 450 in Y)
  const cX = (0 + 420) / 2;
  const cY = (0 + 450) / 2;
  const cW = 420 * S;
  const cD = 450 * S;
  
  const sandGeo = new THREE.PlaneGeometry(cW, cD);
  const sandMat = new THREE.MeshBasicMaterial({ color: 0x6d4c41 }); // Warm brown, ignores cyan light
  const sand = new THREE.Mesh(sandGeo, sandMat);
  sand.rotation.x = -Math.PI / 2;
  sand.position.set((cX - 210) * S, 0.01, (cY - 225) * S);
  scene.add(sand);

  // Custom Pathway dimensions (10 SVG units = 1 foot)
  const pEast = 60;  // 6 feet on East (Top)
  const pNorth = 20; // 2 feet on North (Left)
  const pSouth = 20; // 2 feet on South (Right)
  const pWest = 20;  // 2 feet on West (Bottom)

  const tMat = new THREE.MeshBasicMaterial({ color: 0x78909c }); // Cool grey tiles
  const addPath = (x, y, w, d) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w * S, 0.03, d * S), tMat);
    mesh.position.set((x + w/2 - 210) * S, 0.02, (y + d/2 - 225) * S);
    scene.add(mesh);
    // Grid lines for tiles
    const grid = new THREE.GridHelper(Math.max(w*S, d*S), Math.max(w,d)/5, 0xffffff, 0xffffff);
    grid.position.set(mesh.position.x, 0.04, mesh.position.z);
    grid.material.opacity = 0.4;
    grid.material.transparent = true;
    if (w > d) grid.scale.set(1, 1, d/w);
    else grid.scale.set(w/d, 1, 1);
    scene.add(grid);
  };

  // East Path (Top)
  addPath(100 - pNorth, 150 - pEast, pNorth + 300 + pSouth, pEast);
  // West Path (Bottom) - Extended up to Y=450, starting from North Sabja (X=80)
  addPath(80, 420, 340, 30);
  // North Path (Left)
  addPath(100 - pNorth, 150, pNorth, 270);
  // South Path (Right)
  addPath(400, 150, pSouth, 270);

  // L-Shape Path from South-East Gate to Portico Main Door (Width 15 SVG units = 1.5ft)
  // Segment 1 (Long arm): From SE Gate (X=420, Y=30) towards main door center (X=120)
  addPath(112.5, 30, 420 - 112.5, 15);
  // Segment 2 (Short arm): Turns towards portico floor directly opposite main door (Y=45 to Y=90)
  addPath(112.5, 45, 15, 45);

  // Trees/Plants in the Sand
  const trunkMat = new THREE.MeshBasicMaterial({ color: 0x4e342e });
  const leafMat = new THREE.MeshBasicMaterial({ color: 0x388e3c });
  const addTree = (x, y) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.0), trunkMat);
    trunk.position.set((x - 210) * S, 0.5, (y - 225) * S);
    scene.add(trunk);
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.5, 6), leafMat);
    leaves.position.set((x - 210) * S, 1.5, (y - 225) * S);
    scene.add(leaves);
  };
  // Place trees according to pink dots
  // East side row 1 (Outer edge, Y=15)
  for (let x = 40; x <= 400; x += 35) {
    addTree(x, 15);
  }
  // East side row 2 (Inner sand area, Y=65, matching new pink dots, perfectly aligned with Row 1)
  for (let x = 145; x <= 390; x += 35) {
    addTree(x, 65);
  }
  // North side row (Right edge of image, X=40)
  for (let y = 60; y <= 420; y += 50) {
    addTree(40, y);
  }

  // ─── Kuni (SVG Triangle: 420,0 → 570,0 → 420,450) on South side ─────────────
  // In 3D: X maps to SVG-X, Z maps to SVG-Y
  const p1 = [(420 - 210) * S, (0   - 225) * S];
  const p2 = [(570 - 210) * S, (0   - 225) * S];
  const p3 = [(420 - 210) * S, (450 - 225) * S];

  const kuniGeo = new THREE.BufferGeometry();
  kuniGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    p1[0], 0.02, p1[1],
    p2[0], 0.02, p2[1],
    p3[0], 0.02, p3[1],
  ]), 3));
  kuniGeo.setIndex([0, 1, 2]);
  kuniGeo.computeVertexNormals();
  const kuniMat = new THREE.MeshBasicMaterial({ color: 0xc2b280, side: THREE.DoubleSide }); // Muted sand color
  const kuniMesh = new THREE.Mesh(kuniGeo, kuniMat);
  scene.add(kuniMesh);

  // Kuni border lines
  const kuniEdgeMat = new THREE.LineBasicMaterial({ color: 0x9e9e9e });
  const kuniEdgeGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(p1[0], 0.04, p1[1]),
    new THREE.Vector3(p2[0], 0.04, p2[1]),
    new THREE.Vector3(p3[0], 0.04, p3[1]),
    new THREE.Vector3(p1[0], 0.04, p1[1]),
  ]);
  scene.add(new THREE.Line(kuniEdgeGeo, kuniEdgeMat));

  // Kuni Label (Inside the triangle, elevated and shifted East to avoid wall clipping)
  addSmallLabel("కుణి (ఆగ్నేయం)", (470-210)*S, 0.5, (80-225)*S, 0xff0000, 1.2);

  // ─── Dimension Lines ─────────────────────────────────────────────────────────
  const addDimension = (x1, y1, x2, y2, text, color, xOff = 0, yOff = 0) => {
    const pA = new THREE.Vector3(((x1 + xOff) - 210) * S, 0.25, ((y1 + yOff) - 225) * S);
    const pB = new THREE.Vector3(((x2 + xOff) - 210) * S, 0.25, ((y2 + yOff) - 225) * S);
    const dGeo = new THREE.BufferGeometry().setFromPoints([pA, pB]);
    const dMat = new THREE.LineDashedMaterial({ color: color, dashSize: 0.15, gapSize: 0.1 });
    const dLine = new THREE.Line(dGeo, dMat);
    dLine.computeLineDistances();
    scene.add(dLine);
    const cx = ((x1 + x2)/2 + xOff - 210) * S;
    const cz = ((y1 + y2)/2 + yOff - 225) * S;
    addSmallLabel(text, cx, 0.35, cz, color, 1.5); // size 1.5x for "visible more"
  };
  
  // Total Plot (Outside compound)
  addDimension(0, 0, 420, 0, "42'", 0xff5252, 0, -15); // Width (South outside)
  addDimension(0, 0, 0, 450, "45'", 0xff5252, -15, 0); // Length (West outside)
  
  // Kuni Length 15' (On the East extension)
  addDimension(420, 0, 570, 0, "15'", 0xffeb3b, 0, -10);

  // ─── Roads outside compound ──────────────────────────────────────────────────
  const rMat = new THREE.MeshBasicMaterial({ color: 0x2c2c2c, side: THREE.DoubleSide });

  // ─── SOUTH SIDE STRIPS (Sand, Drain, Road) ───────────────────────────────────
  // Kuni slope vector: dx = -150, dz = 450.
  const baseL = Math.hypot(-150, 450);
  const kunNx = 450 / baseL;
  const kunNz = 150 / baseL;

  const addSouthStrip = (width, offset, endZ, makeFn) => {
    const startZ = 0;
    const dz = endZ - startZ;
    const dx = -150 * (dz / 450);
    const l = Math.hypot(dx, dz);
    
    const cxBase = 570 + dx / 2;
    const czBase = startZ + dz / 2;
    
    const o = offset + width / 2;
    const cx = cxBase + o * kunNx;
    const cz = czBase + o * kunNz;
    
    const group = new THREE.Group();
    group.position.set((cx - 210) * S, 0, (cz - 225) * S);
    // Align local Z to the slanted direction
    group.lookAt(new THREE.Vector3(((cx + dx) - 210) * S, 0, ((cz + dz) - 225) * S));
    group.add(makeFn(width, l));
    scene.add(group);
  };

  const addStraightStrip = (width, offset, makeFn) => {
    const group = new THREE.Group();
    group.position.set((570 + offset + width/2 - 210) * S, 0, (-50 - 225) * S);
    group.add(makeFn(width, 100));
    scene.add(group);
  };

  const ditchDepth = 0.4;
  
  const makeSand = (w, l) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w * S, 0.02, l * S), new THREE.MeshBasicMaterial({ color: 0x6d4c41 }));
    m.position.y = 0.01; return m;
  };

  const makeDrain = (w, l) => {
    const g = new THREE.Group();
    
    const base = new THREE.Mesh(new THREE.BoxGeometry(16 * S, 0.05, l * S), new THREE.MeshBasicMaterial({ color: 0x222222 }));
    base.position.set(0, -ditchDepth, 0);
    g.add(base);

    const wMat = new THREE.MeshBasicMaterial({ color: 0x444444 });
    const bMat = new THREE.MeshBasicMaterial({ color: 0x9e9e9e });
    [[-9, wMat, ditchDepth, -ditchDepth/2], [9, wMat, ditchDepth, -ditchDepth/2], [-9, bMat, 0.04, 0.02], [9, bMat, 0.04, 0.02]].forEach(([x, mat, h, y]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(2 * S, h, l * S), mat);
      m.position.set(x * S, y, 0); 
      g.add(m);
    });
    
    const water = new THREE.Mesh(new THREE.BoxGeometry(16 * S, 0.15, l * S), new THREE.MeshStandardMaterial({ color: 0x1b3a24, transparent: true, opacity: 0.85, emissive: 0x1b3a24, emissiveIntensity: 0.3 }));
    water.position.set(0, -ditchDepth + 0.075, 0); 
    g.add(water);
    
    const we = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(16 * S, l * S)), new THREE.LineBasicMaterial({ color: 0x81c784, transparent: true, opacity: 0.6 }));
    we.rotation.x = -Math.PI / 2; 
    we.position.set(0, -ditchDepth + 0.155, 0); 
    g.add(we);
    
    return g;
  };

  const makeRoad = (w, l) => {
    const g = new THREE.Group();
    const r = new THREE.Mesh(new THREE.BoxGeometry(w * S, 0.02, l * S), rMat);
    r.position.y = 0.01; g.add(r);
    const dMat = new THREE.MeshBasicMaterial({color: 0xffeb3b});
    for (let i = -l/2 + 20; i < l/2; i += 40) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(2 * S, 0.04, 20 * S), dMat);
      d.position.set(0, 0.02, i * S); g.add(d);
    }
    return g;
  };

  // Build the South strips with exact cut-off points to form a clean L-junction
  addSouthStrip(30, 0, 480, makeSand); // Ends at Z=480 (meets inner edge of West Sand)
  addSouthStrip(20, 30, 500, makeDrain); // Ends at Z=500 (meets West Drain)
  addSouthStrip(300, 50, 500, makeRoad); // Ends at Z=500 (meets West Road)

  [addStraightStrip].forEach(addFn => {
    addFn(30, 0, makeSand);
    addFn(20, 30, makeDrain);
    addFn(300, 50, makeRoad);
  });

  // ─── Perfect Miter Joints for the South Corner Gaps ────────────────────────
  const makeJointGeo = (w, offset) => {
    const oIn = offset;
    const oOut = offset + w;
    const p1 = new THREE.Vector2(570 + oIn, 0);
    const p2 = new THREE.Vector2(570 + oOut, 0);
    const p3 = new THREE.Vector2(570 + oOut * kunNx, oOut * kunNz);
    const p4 = new THREE.Vector2(570 + oIn * kunNx, oIn * kunNz);
    
    const geo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      (p1.x - 210)*S, 0, (p1.y - 225)*S,
      (p2.x - 210)*S, 0, (p2.y - 225)*S,
      (p3.x - 210)*S, 0, (p3.y - 225)*S,
      (p4.x - 210)*S, 0, (p4.y - 225)*S,
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.computeVertexNormals();
    return geo;
  };

  const sandJ = new THREE.Mesh(makeJointGeo(30, 0), new THREE.MeshBasicMaterial({ color: 0x6d4c41 }));
  sandJ.position.y = 0.01; scene.add(sandJ);

  const dbJ = new THREE.Mesh(makeJointGeo(20, 30), new THREE.MeshBasicMaterial({ color: 0x222222 }));
  dbJ.position.y = -ditchDepth - 0.001; scene.add(dbJ);

  const dwJ = new THREE.Mesh(makeJointGeo(20, 30), new THREE.MeshStandardMaterial({ color: 0x1b3a24, transparent: true, opacity: 0.85, emissive: 0x1b3a24, emissiveIntensity: 0.3 }));
  dwJ.position.y = -ditchDepth + 0.075; scene.add(dwJ);

  const borderMatJ = new THREE.MeshBasicMaterial({ color: 0x9e9e9e });
  const b1J = new THREE.Mesh(makeJointGeo(2, 30), borderMatJ);
  b1J.position.y = 0.021; scene.add(b1J);
  const b2J = new THREE.Mesh(makeJointGeo(2, 48), borderMatJ);
  b2J.position.y = 0.021; scene.add(b2J);

  const rJ = new THREE.Mesh(makeJointGeo(300, 50), rMat);
  rJ.position.y = 0.01; scene.add(rJ);

  addSmallLabel("మురుగు కాలువ (Drainage)", (515 - 210) * S, 0.2, (150 - 225) * S, 0x81c784);

  // ─── WEST SIDE STRIPS (Sand, Drain, Road) ───────────────────────────────────
  // West Road (Bottom, Y=500 onwards)
  const wRoad = new THREE.Mesh(new THREE.PlaneGeometry(830 * S, 300 * S), rMat);
  wRoad.rotation.x = -Math.PI / 2;
  wRoad.position.set((315 - 210) * S, 0.009, (650 - 225) * S); // slightly under South road to prevent z-fight
  scene.add(wRoad);

  // West Sand Y=450 to 480 (Cut off at X=420 to prevent bleeding into South drain)
  // Length: 470, Center: 185
  const wSand = new THREE.Mesh(new THREE.PlaneGeometry(470 * S, 30 * S), new THREE.MeshBasicMaterial({ color: 0x6d4c41 }));
  wSand.rotation.x = -Math.PI / 2;
  wSand.position.set((185 - 210) * S, 0.011, (465 - 225) * S);
  scene.add(wSand);

  // West 3D Drainage Ditch Y=480 to 500 (Cut off at X=444 to perfectly meet South drain inner edge)
  // Length: 494, Center: 197
  const cxDrainW = (197 - 210) * S;
  const czDrainW = (490 - 225) * S;

  const dBaseW = new THREE.Mesh(new THREE.BoxGeometry(494 * S, 0.05, 16 * S), new THREE.MeshBasicMaterial({ color: 0x222222 }));
  dBaseW.position.set(cxDrainW, -ditchDepth - 0.001, czDrainW);
  scene.add(dBaseW);

  const dWallGeoW = new THREE.BoxGeometry(494 * S, ditchDepth, 2 * S);
  const dWallMatW = new THREE.MeshBasicMaterial({ color: 0x444444 });
  const dWallLeftW = new THREE.Mesh(dWallGeoW, dWallMatW);
  dWallLeftW.position.set(cxDrainW, -ditchDepth/2, (481 - 225) * S);
  scene.add(dWallLeftW);
  const dWallRightW = new THREE.Mesh(dWallGeoW, dWallMatW);
  dWallRightW.position.set(cxDrainW, -ditchDepth/2, (499 - 225) * S);
  scene.add(dWallRightW);
  
  const borderMatW = new THREE.MeshBasicMaterial({ color: 0x9e9e9e });
  const border1W = new THREE.Mesh(new THREE.BoxGeometry(494 * S, 0.04, 2 * S), borderMatW);
  border1W.position.set(cxDrainW, 0.021, (481 - 225) * S);
  scene.add(border1W);
  const border2W = new THREE.Mesh(new THREE.BoxGeometry(494 * S, 0.04, 2 * S), borderMatW);
  border2W.position.set(cxDrainW, 0.021, (499 - 225) * S);
  scene.add(border2W);
  
  const waterW = new THREE.Mesh(new THREE.BoxGeometry(494 * S, 0.15, 16 * S), new THREE.MeshStandardMaterial({
    color: 0x1b3a24, transparent: true, opacity: 0.85, emissive: 0x1b3a24, emissiveIntensity: 0.3
  }));
  waterW.position.set(cxDrainW, -ditchDepth + 0.076, czDrainW);
  scene.add(waterW);
  
  const wEdgeMeshW = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(494 * S, 16 * S)), 
    new THREE.LineBasicMaterial({ color: 0x81c784, transparent: true, opacity: 0.6 })
  );
  wEdgeMeshW.rotation.x = -Math.PI / 2;
  wEdgeMeshW.position.set(cxDrainW, -ditchDepth + 0.156, czDrainW);
  scene.add(wEdgeMeshW);

  // Drainage Label
  addSmallLabel("మురుగు కాలువ (Drainage)", cxDrainW, 0.2, czDrainW, 0x81c784);

  // Road centre dashed lines (Yellow)
  const lineMatMesh = new THREE.MeshBasicMaterial({color: 0xffeb3b});
  
  // West Road Dashes (Horizontal at Y=650)
  for(let i = -80; i <= 700; i += 40) {
    const wl = new THREE.Mesh(new THREE.PlaneGeometry(20 * S, 2 * S), lineMatMesh);
    wl.rotation.x = -Math.PI / 2;
    wl.position.set((i - 210) * S, 0.03, (650 - 225) * S);
    scene.add(wl);
  }
}

// ─── Dotted Lines for Setbacks ────────────────────────────────────────────────
function makeDottedLine(x1, y1, x2, y2, color = 0xff5252) {
  const p1 = svgToWorld(x1, y1);
  const p2 = svgToWorld(x2, y2);
  
  const points = [];
  points.push(new THREE.Vector3(p1[0], 0.05, p1[2]));
  points.push(new THREE.Vector3(p2[0], 0.05, p2[2]));
  
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineDashedMaterial({
    color: color, linewidth: 2, scale: 1, dashSize: 0.5, gapSize: 0.3,
  });
  
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  scene.add(line);
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
  
  // Outer East (Top) with Main Door gap (105 to 135)
  makeWallSegment(100, 140, 5, 10);
  makeWallSegment(135, 140, 255, 10);

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

  // Pooja Room (NE corner of Kitchen, 4x6 interior, X=260..300, Y=150..210)
  makeWallSegment(300, 150, 5, 65); // South wall of Pooja room
  makeWallSegment(260, 210, 5, 5);  // West wall part 1
  makeWallSegment(295, 210, 5, 5);  // West wall part 2

  // Roof System
  const lineMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.7 });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x00e5ff, transparent: true, opacity: 0.13,
    emissive: 0x00e5ff, emissiveIntensity: 0.1, side: THREE.DoubleSide
  });

  // 1. Inner Roof (This is the only part that hides when toggled)
  // Covers X=90 to 400, Z=140 to 430
  const innerW = 310 * S, innerD = 290 * S;
  const cxInner = (245 - 210) * S, czInner = (285 - 225) * S;
  const innerRoofGeo = new THREE.BoxGeometry(innerW, 0.12, innerD);
  const innerRoof = new THREE.Mesh(innerRoofGeo, roofMat);
  innerRoof.position.set(cxInner, H + 0.06, czInner);
  scene.add(innerRoof);
  roofMeshes.push(innerRoof); // Toggled!

  const innerEdge = new THREE.LineSegments(new THREE.EdgesGeometry(innerRoofGeo), lineMat);
  innerEdge.position.copy(innerRoof.position);
  scene.add(innerEdge);
  roofMeshes.push(innerEdge); // Toggled!

  // 2. Sabja Overhangs (Stay visible)
  const addSabja = (wSVG, dSVG, xSVG, zSVG) => {
    const geo = new THREE.BoxGeometry(wSVG * S, 0.12, dSVG * S);
    const m = new THREE.Mesh(geo, roofMat);
    m.position.set((xSVG - 210) * S, H + 0.06, (zSVG - 225) * S);
    scene.add(m);
    
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineMat);
    e.position.copy(m.position);
    scene.add(e);
  };
  
  // North Sabja (X=80 to 90, Z=140 to 440)
  addSabja(10, 300, 85, 290);
  // South Sabja (X=400 to 410, Z=140 to 440)
  addSabja(10, 300, 405, 290);
  // West Sabja (X=90 to 400, Z=430 to 440)
  addSabja(310, 10, 245, 435);

  // ─── Midde Parapet Walls ──────────────────────────────────────────────────────
  const pThick = 0.05;
  const pMat = new THREE.MeshStandardMaterial({
    color: 0x4fc3f7, transparent: true, opacity: 0.5,
    emissive: 0x0288d1, emissiveIntensity: 0.3, side: THREE.DoubleSide
  });

  const addParapet = (x1, z1, x2, z2) => {
    let w = Math.abs(x2 - x1) * S;
    let d = Math.abs(z2 - z1) * S;
    if (w < 0.01) w = pThick;
    if (d < 0.01) d = pThick;
    if (w > pThick) w += pThick;
    if (d > pThick) d += pThick;

    const mx = (x1 + x2)/2 - 210;
    const mz = (z1 + z2)/2 - 225;
    
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, d), pMat);
    mesh.position.set(mx * S, H + 0.42, mz * S);
    scene.add(mesh);
    // Not pushed to roofMeshes so it stays visible
    
    const pEdges = new THREE.EdgesGeometry(mesh.geometry);
    const pEdgeMesh = new THREE.LineSegments(pEdges, lineMat);
    pEdgeMesh.position.copy(mesh.position);
    scene.add(pEdgeMesh);
    // Not pushed to roofMeshes so it stays visible
  };

  // Continuous loop around the walkable roof
  addParapet(80, 440, 80, 90);    // North Edge (West to Portico East)
  addParapet(80, 90, 290, 90);    // Portico East Edge
  addParapet(290, 90, 290, 110);  // Portico South Edge (stops at stairs top flight entrance)
  // Gap at 290, 110 to 125 for entering the Top Flight (Outer flight) from the Portico roof
  addParapet(290, 125, 290, 140); // Portico South Edge (prevents falling into bottom flight stairwell)
  addParapet(290, 140, 410, 140); // Main Roof East Edge (covers the entire stairwell from above)
  addParapet(410, 140, 410, 440); // South Edge
  addParapet(410, 440, 80, 440);  // West Edge
}

// ─── Glowing Windows ──────────────────────────────────────────────────────────
function makeWindows() {
  // Left Wall (X=90 to 100) - Outside is Local -Z
  makeWindow(89.5, 195, 11, 30, 0, -1); // Hall
  makeWindow(89.5, 335, 11, 30, 0, -1); // NW Bed

  // Top Wall (Y=140 to 150) - Outside is Local -Z
  makeWindow(162.5, 139.5, 30, 11, 0, -1); // Hall
  makeWindow(275, 139.5, 20, 11, 2, -1);   // Pooja Gadhi (Small window)
  makeWindow(345, 139.5, 20, 11, 2, -1);   // Kitchen (Small window, on East wall)

  // Right Wall (X=390 to 400) - Outside is Local +Z
  // makeWindow(389.5, 195, 11, 30); // Kitchen (Removed as requested)
  makeWindow(389.5, 335, 11, 30, 0, 1); // Master Bed

  // Bottom Wall (Y=420 to 430) - Outside is Local +Z
  makeWindow(135, 419.5, 30, 11, 0, 1); // NW Bed
  makeWindow(220, 419.5, 20, 11, 1, 1); // Bath 2 (Ventilator)
  makeWindow(310, 419.5, 30, 11, 0, 1); // Master Bed
}

function makeWindow(x, z, w, d, windowType = 0, zDirection = -1) {
  const isX = w > d;
  const L = (isX ? w : d) * S;
  const T = (isX ? d : w) * S;
  
  let winH = 1.0;
  let yPos = H / 2;
  if (windowType === 1) { // Ventilator
    winH = 0.4;
    yPos = H * 0.75;
  } else if (windowType === 2) { // Small window (e.g. Kitchen)
    winH = 0.6;
    yPos = H * 0.65;
  }
  
  const cx = (x + w/2 - 210) * S;
  const cz = (z + d/2 - 225) * S;

  const frameMat = holoFillMat(0x1a237e, 0.9); // Dark blue frame
  const grillMat = new THREE.MeshStandardMaterial({
    color: 0xffca28, emissive: 0xffca28, emissiveIntensity: 0.9
  }); // Highly visible gold/yellow safety grill
  const shutterFrameMat = holoFillMat(0x0277bd, 0.8); // Shutter frame
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xccffff, transparent: true, opacity: 0.3,
    emissive: 0x00b0ff, emissiveIntensity: 0.3, roughness: 0.1, metalness: 0.8
  });

  const group = new THREE.Group();
  group.position.set(cx, yPos, cz);
  if (!isX) group.rotation.y = Math.PI / 2;

  const fT = 0.04;
  const hingeZ = zDirection * T / 4;
  const swingDir = -zDirection;

  // Outer Frame
  group.add(new THREE.Mesh(new THREE.BoxGeometry(L, fT, T), frameMat).translateY(winH/2 - fT/2));
  group.add(new THREE.Mesh(new THREE.BoxGeometry(L, fT, T), frameMat).translateY(-winH/2 + fT/2));
  group.add(new THREE.Mesh(new THREE.BoxGeometry(fT, winH, T), frameMat).translateX(-L/2 + fT/2));
  group.add(new THREE.Mesh(new THREE.BoxGeometry(fT, winH, T), frameMat).translateX(L/2 - fT/2));

  // Safety Grill
  const barCount = Math.floor(L / 0.15); 
  const barSpacing = L / (barCount + 1);
  for(let i = 1; i <= barCount; i++) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, winH, 8), grillMat);
    bar.position.set(-L/2 + i * barSpacing, 0, 0);
    group.add(bar);
  }
  const hBar = new THREE.Mesh(new THREE.BoxGeometry(L, 0.02, 0.02), grillMat);
  group.add(hBar);

  const shutterL = L / 2 - fT; 
  const shutterT = 0.02; 
  
  if (windowType !== 1) {
    // Left Shutter Door
    const lShutter = new THREE.Group();
    lShutter.position.set(-L/2 + fT, 0, hingeZ); // hinge
    
    const sMeshL = new THREE.Group();
    sMeshL.position.set(shutterL/2, 0, 0);
    sMeshL.add(new THREE.Mesh(new THREE.BoxGeometry(shutterL, winH - fT*2, shutterT), glassMat));
    sMeshL.add(new THREE.Mesh(new THREE.BoxGeometry(shutterL, fT, shutterT*1.1), shutterFrameMat).translateY((winH-fT*2)/2 - fT/2));
    sMeshL.add(new THREE.Mesh(new THREE.BoxGeometry(shutterL, fT, shutterT*1.1), shutterFrameMat).translateY(-(winH-fT*2)/2 + fT/2));
    sMeshL.add(new THREE.Mesh(new THREE.BoxGeometry(fT, winH - fT*2, shutterT*1.1), shutterFrameMat).translateX(-shutterL/2 + fT/2));
    sMeshL.add(new THREE.Mesh(new THREE.BoxGeometry(fT, winH - fT*2, shutterT*1.1), shutterFrameMat).translateX(shutterL/2 - fT/2));
    
    lShutter.add(sMeshL);
    lShutter.rotation.y = swingDir * Math.PI / 2.2; // Wide open
    group.add(lShutter);

    // Right Shutter Door
    const rShutter = new THREE.Group();
    rShutter.position.set(L/2 - fT, 0, hingeZ); 
    
    const sMeshR = new THREE.Group();
    sMeshR.position.set(-shutterL/2, 0, 0); 
    sMeshR.add(new THREE.Mesh(new THREE.BoxGeometry(shutterL, winH - fT*2, shutterT), glassMat));
    sMeshR.add(new THREE.Mesh(new THREE.BoxGeometry(shutterL, fT, shutterT*1.1), shutterFrameMat).translateY((winH-fT*2)/2 - fT/2));
    sMeshR.add(new THREE.Mesh(new THREE.BoxGeometry(shutterL, fT, shutterT*1.1), shutterFrameMat).translateY(-(winH-fT*2)/2 + fT/2));
    sMeshR.add(new THREE.Mesh(new THREE.BoxGeometry(fT, winH - fT*2, shutterT*1.1), shutterFrameMat).translateX(-shutterL/2 + fT/2));
    sMeshR.add(new THREE.Mesh(new THREE.BoxGeometry(fT, winH - fT*2, shutterT*1.1), shutterFrameMat).translateX(shutterL/2 - fT/2));

    rShutter.add(sMeshR);
    rShutter.rotation.y = -swingDir * Math.PI / 2.2; // Wide open
    group.add(rShutter);
  } else {
    // Ventilator Louvers
    for(let i=0; i<3; i++) {
      const louver = new THREE.Mesh(new THREE.BoxGeometry(L - fT*2, 0.08, 0.01), glassMat);
      louver.position.set(0, (i-1)*0.12, 0.01);
      louver.rotation.x = Math.PI / 4;
      group.add(louver);
    }
  }

  scene.add(group);
}

// ─── Internal rooms ───────────────────────────────────────────────────────────
function makeRooms() {
  // Hall
  makeRoom(100,150,155,130, 0x4fc3f7, 'హాల్', '15½ x 13');
  // Kitchen (Split to wrap around Pooja room)
  makeRoom(305, 150, 85, 130, 0xa5d6a7, 'కిచెన్', '13 x 13');
  makeRoom(260, 215, 45, 65, 0xa5d6a7, '', '');
  // Pooja Room
  makeRoom(260, 150, 40, 60, 0xffca28, 'పూజా గది', '4 x 6');
  // Bed Room
  makeRoom(100,285,100,135, 0xce93d8, 'బెడ్ రూమ్', '10 x 13½');
  // Master Bed
  makeRoom(260,285,130,135, 0x80cbc4, 'మాస్టర్ బెడ్', '13 x 13½');
  // Bath 1
  makeRoom(205,285,50,60, 0xfff176, 'బాత్ 1', '5 x 6');
  // Bath 2
  makeRoom(205,350,50,70, 0xfff176, 'బాత్ 2', '5 x 7');
}

// ─── Dimensions ───────────────────────────────────────────────────────────────
function makeDimensions() {
  const lbl = addSmallLabel;
  const yF = 0.1; // floor level
  const yW = H + 0.2; // wall top level
  
  // Setbacks Text
  lbl("9'", (45-210)*S, yF, (330-225)*S, 0xff5252);
  lbl("14'", (290-210)*S, yF, (70-225)*S, 0xff5252);
  lbl("2'", (410-210)*S, yF, (325-225)*S, 0xff5252);
  lbl("2'", (290-210)*S, yF, (445-225)*S, 0xff5252);

  // Setbacks Dotted Lines
  makeDottedLine(0, 330, 90, 330, 0xff5252); // 9'
  makeDottedLine(280, 0, 280, 140, 0xff5252); // 14'
  makeDottedLine(400, 330, 420, 330, 0xff5252); // 2' West
  makeDottedLine(280, 430, 280, 450, 0xff5252); // 2' South

  // Plot sizes Text
  lbl("45'", (-20-210)*S, yF, (225-225)*S, 0x4caf50);
  lbl("42'", 0, yF, (470-225)*S, 0x4caf50);
  lbl("42'", 0, yF, (-15-225)*S, 0x4caf50);
  lbl("15'", (495-210)*S, yF, (-15-225)*S, 0xff5252); // Kuni

  // Wall thicknesses (Outer 12") -> Yellow
  lbl("12\"", (95-210)*S, yW, (260-225)*S, 0xffff00);
  lbl("12\"", (250-210)*S, yW, (425-225)*S, 0xffff00);
  lbl("12\"", (250-210)*S, yW, (145-225)*S, 0xffff00);
  lbl("12\"", (395-210)*S, yW, (260-225)*S, 0xffff00);

  // Wall thicknesses (Inner 6") -> Pink
  lbl("6\"", (257.5-210)*S, yW, (182.5-225)*S, 0xff4081); // Hall/Kitchen Wall
  lbl("6\"", (302.5-210)*S, yW, (182.5-225)*S, 0xff4081); // Pooja South Wall
  lbl("6\"", (340-210)*S, yW, (282.5-225)*S, 0xff4081);
  lbl("6\"", (190-210)*S, yW, (282.5-225)*S, 0xff4081);
  lbl("6\"", (257.5-210)*S, yW, (320-225)*S, 0xff4081);
  lbl("6\"", (230-210)*S, yW, (347.5-225)*S, 0xff4081);
  lbl("6\"", (202.5-210)*S, yW, (380-225)*S, 0xff4081);
}

// ─── Interior Furniture ───────────────────────────────────────────────────────
function makeBoxAt(svgX, svgY, svgW, svgH, heightWorld, yOffsetWorld, color) {
  const ww = svgW * S, wd = svgH * S;
  const cx = (svgX - 210) * S + ww / 2;
  const cz = (svgY - 225) * S + wd / 2;
  const geo = new THREE.BoxGeometry(ww, heightWorld, wd);
  const mat = new THREE.MeshStandardMaterial({
    color: color, transparent: true, opacity: 0.85,
    emissive: color, emissiveIntensity: 0.3
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(cx, yOffsetWorld + heightWorld/2, cz);
  scene.add(mesh);
}

function makeCylinderAt(svgX, svgY, radiusSVG, heightWorld, yOffsetWorld, color) {
  const r = radiusSVG * S;
  const cx = (svgX - 210) * S;
  const cz = (svgY - 225) * S;
  const geo = new THREE.CylinderGeometry(r, r, heightWorld, 24);
  const mat = new THREE.MeshStandardMaterial({
    color: color, transparent: true, opacity: 0.85,
    emissive: color, emissiveIntensity: 0.3
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(cx, yOffsetWorld + heightWorld/2, cz);
  scene.add(mesh);
}

function makeToilet(svgX, svgY) {
  // Tank (against the West/Bottom wall)
  makeBoxAt(svgX - 10, svgY - 5, 20, 10, 0.8, 0, 0xffffff); 
  // Bowl (Cylinder extending towards North/Top)
  makeCylinderAt(svgX, svgY - 12, 7, 0.4, 0, 0xffffff); 
  // Lid
  makeCylinderAt(svgX, svgY - 12, 7.2, 0.05, 0.4, 0xe0e0e0);
}

function makeInterior() {
  // L-Shape Sofa (East-South corner of Hall)
  // Long piece against East wall (Y=150)
  makeBoxAt(170, 155, 85, 25, 0.3, 0, 0x4fc3f7); // seat
  makeBoxAt(170, 155, 85, 8,  0.8, 0, 0x0288d1); // backrest
  // Short piece against South wall (ends exactly at Y=215 wall end)
  makeBoxAt(222, 180, 25, 35, 0.3, 0, 0x4fc3f7); // seat
  makeBoxAt(247, 180, 8,  35, 0.8, 0, 0x0288d1); // backrest

  // TV and Stand (West wall of Hall Y=280, centered around X=177.5)
  makeBoxAt(150, 265, 55, 15,  0.4, 0,    0x8d6e63); // TV Stand
  makeBoxAt(155, 276, 45, 4,   0.6, 0.6,  0x212121); // TV Body
  makeBoxAt(156, 275.5, 43, 0.5, 0.5, 0.65, 0x00e5ff); // TV Screen Glowing

  // Kitchen Counters & Sink & Fridge
  makeBoxAt(305, 155, 80,  25, 0.75, 0,    0xa5d6a7); // East counter (Shifted to clear Pooja)
  makeBoxAt(360, 180, 25,  75, 0.75, 0,    0xa5d6a7); // South counter
  makeBoxAt(315, 160, 30,  15, 0.05, 0.75, 0x42a5f5); // Sink (Shifted)
  makeBoxAt(360, 255, 25,  25, 1.8,  0,    0x90caf9); // Fridge (SW side, cutting layout)

  // Beds (Headboards on West side -> Y=410 to 420)
  // NW Bed
  makeBoxAt(120, 340, 60, 70, 0.4, 0, 0xce93d8); // Mattress
  makeBoxAt(120, 410, 60, 10, 0.9, 0, 0x8e24aa); // Headboard
  makeBoxAt(130, 395, 40, 15, 0.1, 0.4, 0xffffff); // Pillow

  // Master Bed
  makeBoxAt(290, 340, 70, 70, 0.4, 0, 0x80cbc4); // Mattress
  makeBoxAt(290, 410, 70, 10, 0.9, 0, 0x00897b); // Headboard
  makeBoxAt(305, 395, 40, 15, 0.1, 0.4, 0xffffff); // Pillow

  // Toilets (Against West walls of Bath 1 & Bath 2)
  makeToilet(230, 340); // Bath 1 (West wall is at Y=345)
  makeToilet(230, 415); // Bath 2 (West wall is at Y=420)
}

// ─── Portico ──────────────────────────────────────────────────────────────────
function makePorfico() {
  // SVG: x=80,y=90,w=210,h=50 (Extended to connect with Sabja at X=80 and touch Stairwell at X=290)
  const px = (80 - 210) * S, pz = (90 - 225) * S;
  const pw = 210 * S, pd = 50 * S;
  const cx = px + pw/2, cz = pz + pd/2;

  const mat = holoFillMat(0x81d4fa, 0.18);
  const geo = new THREE.BoxGeometry(pw, H, pd);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(cx, H * 0.5, cz);
  scene.add(mesh);

  // Pillar left
  addPillar(px + 0.3, cz - pd/2 + 0.3);
  addPillar(px + 0.3, cz + pd/2 - 0.3);
  addPillar(px + pw - 0.3, cz - pd/2 + 0.3);
  addPillar(px + pw - 0.3, cz + pd/2 - 0.3);

  // Portico roof
  const roofGeo = new THREE.BoxGeometry(pw + 0.3, 0.12, pd + 0.3);
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x81d4fa, transparent: true, opacity: 0.22,
    emissive: 0x81d4fa, emissiveIntensity: 0.15
  });
  const roofM = new THREE.Mesh(roofGeo, roofMat);
  roofM.position.set(cx, H + 0.06, cz);
  scene.add(roofM);

  addLabel('పోర్టికో', '(6\')', cx, H + 0.6, cz, 0x81d4fa);
}

function addPillar(x, z) {
  const geo = new THREE.CylinderGeometry(0.1, 0.12, H, 8);
  const mat = holoBorderMat(0x81d4fa, 0.85);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, H * 0.5, z);
  scene.add(mesh);
}

// ─── Steps ────────────────────────────────────────────────────────────────────
function makeSteps() {
  const stepCount = 10; 
  const flightLenSVG = 50;
  const flightWidSVG = 15; // Changed from 30 to 15 (1.5 feet per flight, total 3 feet)
  
  const stepTreadSVG = flightLenSVG / stepCount; 
  const stepTreadW = stepTreadSVG * S;
  const stepWidthW = flightWidSVG * S;
  const stepRiseW = (H / 2) / stepCount;
  const stepThick = 0.05;
  
  const mat = new THREE.MeshStandardMaterial({
    color: 0x90caf9, transparent: true, opacity: 0.85,
    emissive: 0x1565c0, emissiveIntensity: 0.3
  });

  // Stairs attached to Kitchen wall (Y=140). Total width 30 (Y=110 to 140).
  // Entrance faces North (starts at X=290). 
  
  // 1. Bottom Flight (Right side / Inner flight, climbing South): Y=125 to 140. X goes 290 -> 340
  const bottomStartY = 125;
  for (let i = 0; i < stepCount; i++) {
    const cxSVG = 290 + i * stepTreadSVG + stepTreadSVG / 2; // Moving South (right)
    const cySVG = bottomStartY + flightWidSVG / 2; 
    
    const cx = (cxSVG - 210) * S;
    const cz = (cySVG - 225) * S;
    const cy = i * stepRiseW + stepRiseW / 2;

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(stepTreadW, stepThick, stepWidthW), mat);
    mesh.position.set(cx, cy, cz);
    scene.add(mesh);
    
    const riser = new THREE.Mesh(new THREE.BoxGeometry(0.02, stepRiseW, stepWidthW), mat);
    riser.position.set(cx - stepTreadW/2, cy - stepRiseW/2, cz);
    scene.add(riser);
  }

  // 2. Mid Landing (South side): X=340 to 370. Y=110 to 140 (total 30 width)
  const lx = (355 - 210) * S;
  const lz = (125 - 225) * S;
  const landing = new THREE.Mesh(new THREE.BoxGeometry(30 * S, stepThick, 30 * S), mat);
  landing.position.set(lx, H / 2, lz);
  scene.add(landing);

  // Bathroom & Washing area under/behind the landing (X=340..370, Y=110..140)
  const makeUnderStairBath = () => {
    const bMat = new THREE.MeshStandardMaterial({ color: 0x90caf9, transparent: true, opacity: 0.6 });
    // Back wall
    const w1 = new THREE.Mesh(new THREE.BoxGeometry(2 * S, H / 2, 30 * S), bMat);
    w1.position.set((369 - 210) * S, H / 4, (125 - 225) * S);
    scene.add(w1);
    // Side wall
    const w2 = new THREE.Mesh(new THREE.BoxGeometry(30 * S, H / 2, 2 * S), bMat);
    w2.position.set((355 - 210) * S, H / 4, (111 - 225) * S);
    scene.add(w2);
    
    // 3D Washing Machine
    const wmGeo = new THREE.BoxGeometry(8 * S, 10 * S, 8 * S);
    const wmMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const wm = new THREE.Mesh(wmGeo, wmMat);
    wm.position.set((360 - 210) * S, 5 * S, (120 - 225) * S);
    scene.add(wm);
    // Drum
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(2.5 * S, 2.5 * S, 0.5 * S, 16), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    drum.rotation.z = Math.PI / 2;
    drum.position.set(-4 * S, 1 * S, 0);
    wm.add(drum);
    
    // 3D Tap
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * S, 0.3 * S, 3 * S, 8), new THREE.MeshStandardMaterial({ color: 0xcccccc }));
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set((366 - 210) * S, 8 * S, (130 - 225) * S);
    scene.add(pipe);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * S, 0.3 * S, 1 * S, 8), new THREE.MeshStandardMaterial({ color: 0xcccccc }));
    nozzle.position.set(-1.5 * S, -0.5 * S, 0);
    pipe.add(nozzle);
    
    // Label
    addSmallLabel("బాత్రూమ్ / వాషింగ్", (355 - 210) * S, 0.5, (140 - 225) * S, 0xffff00, 0.8);
  };
  makeUnderStairBath();



  // 3. Top Flight (Left side / Outer flight, climbing North): Y=110 to 125. X goes 340 -> 290.
  const topStartY = 110;
  for (let i = 0; i < stepCount; i++) {
    const cxSVG = 340 - i * stepTreadSVG - stepTreadSVG / 2; // Moving North (left)
    const cySVG = topStartY + flightWidSVG / 2; 
    
    const cx = (cxSVG - 210) * S;
    const cz = (cySVG - 225) * S;
    const cy = H / 2 + i * stepRiseW + stepRiseW / 2;

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(stepTreadW, stepThick, stepWidthW), mat);
    mesh.position.set(cx, cy, cz);
    scene.add(mesh);
    
    const riser = new THREE.Mesh(new THREE.BoxGeometry(0.02, stepRiseW, stepWidthW), mat);
    riser.position.set(cx + stepTreadW/2, cy - stepRiseW/2, cz);
    scene.add(riser);
  }
}

// ─── Glowing Doors ────────────────────────────────────────────────────────────
function makeDoors() {
  // Main Door (Orange)
  makeDoor(105, 150, 30, Math.PI * 1.75, 0xffaa00);
  // NW Bed to Hall
  makeDoor(105, 285, 30, Math.PI * 0.25, 0x00e5ff);
  // Kitchen to Master Bed
  makeDoor(265, 285, 30, Math.PI * 0.25, 0x00e5ff);
  // Master Bed to Bath 2
  makeDoor(255, 380, 30, Math.PI * 0.75, 0x00e5ff); // Bath 2 Door
  makeDoor(205, 305, 30, Math.PI * 0.25, 0x00e5ff); // Bath 1 Door
  makeDoor(265, 210, 30, Math.PI * 0.5, 0xffca28); // Pooja Room Door (West facing, golden color)
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
    color: 0xf0f8ff, transparent: true, opacity: 0.9,
    emissive: 0xffffff, emissiveIntensity: 0.15, roughness: 0.2, metalness: 0.1
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(wx + ww/2, 0, wz + wd/2);
  scene.add(mesh);

  // Realistic light-colored tiles
  const gridSize = Math.max(ww, wd);
  const gridDivisions = Math.floor(gridSize / 0.6); // roughly 2-foot tiles
  const grid = new THREE.GridHelper(gridSize, gridDivisions, 0x90a4ae, 0xcfd8dc);
  grid.position.set(wx + ww/2, 0.01, wz + wd/2);
  if (ww > wd) grid.scale.set(1, 1, wd/ww);
  else grid.scale.set(ww/wd, 1, 1);
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
let theta = 0.4, phi = 0.9, radius = 45;
let target = new THREE.Vector3(0, 2, 0);
let panDelta = new THREE.Vector3();

function updateCamera() {
  if (isTourActive) return;
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

const raycaster = new THREE.Raycaster();
const basePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

renderer.domElement.addEventListener('wheel', e => {
  const zoomIn = e.deltaY < 0;
  if (zoomIn) {
    const mouse = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);
    const targetPoint = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(basePlane, targetPoint);
    if (hit && targetPoint.distanceTo(target) < 100) {
      target.lerp(targetPoint, 0.1);
      target.x = Math.max(-40, Math.min(40, target.x));
      target.z = Math.max(-40, Math.min(40, target.z));
    }
  }
  
  radius = Math.max(10, Math.min(120, radius + e.deltaY * 0.05));
  updateCamera();
});

// ─── Touch support ────────────────────────────────────────────────────────────
let lastTouchDist = null;
let mobileMode = 'ROTATE';

function toggleMobileMode() {
  const btn = document.getElementById('mobile-mode-btn');
  if (mobileMode === 'ROTATE') {
    mobileMode = 'PAN';
    btn.innerText = '👆 Pan Mode';
    btn.style.background = 'rgba(0, 255, 0, 0.15)';
    btn.style.color = '#00ff00';
    btn.style.borderColor = 'rgba(0, 255, 0, 0.5)';
  } else {
    mobileMode = 'ROTATE';
    btn.innerText = '🔄 Rotate Mode';
    btn.style.background = 'rgba(0, 229, 255, 0.15)';
    btn.style.color = '#00e5ff';
    btn.style.borderColor = 'rgba(0, 229, 255, 0.5)';
  }
}

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
    if (mobileMode === 'ROTATE') {
      theta -= dx * 0.008;
      phi = Math.max(0.1, Math.min(Math.PI/2.1, phi + dy * 0.008));
    } else {
      const right = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);
      right.crossVectors(camera.getWorldDirection(new THREE.Vector3()), up).normalize();
      target.addScaledVector(right, -dx * 0.04);
      target.y += dy * 0.04;
    }
    prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
    updateCamera();
  } else if (e.touches.length === 2) {
    const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    
    if (lastTouchDist) { 
      const zoomDiff = d - lastTouchDist;
      if (zoomDiff > 0) { // Zooming IN
        const mouse = new THREE.Vector2((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
        raycaster.setFromCamera(mouse, camera);
        const targetPoint = new THREE.Vector3();
        const hit = raycaster.ray.intersectPlane(basePlane, targetPoint);
        if (hit && targetPoint.distanceTo(target) < 100) {
          const lerpFactor = Math.min(zoomDiff * 0.005, 1.0);
          target.lerp(targetPoint, lerpFactor);
          target.x = Math.max(-40, Math.min(40, target.x));
          target.z = Math.max(-40, Math.min(40, target.z));
        }
      }
      radius = Math.max(10, Math.min(120, radius - zoomDiff * 0.1)); 
      updateCamera(); 
    }
    lastTouchDist = d;
  }
}, { passive: false });

// ─── Button handlers ──────────────────────────────────────────────────────────
function resetCamera() {
  theta = 0.4; phi = 0.9; radius = 45;
  target.set(0, 2, 0);
  updateCamera();
}

// ─── Tour Animation ───────────────────────────────────────────────────────────
let isTourActive = false;
let tourStartMs = 0;
const tourDuration = 34000;
let tourCamCurve, tourTgtCurve;

const tourData = [
  { time: 0, cam: [22, 2.5, -15], tgt: [15, 1.5, -15], msg: "నమస్కారం! ఇది మన ఇంటి ఆగ్నేయం (South-East) గేటు. ఇక్కడి నుంచే ప్రవేశం." },
  { time: 5000, cam: [14, 2.5, -15], tgt: [14, 1.5, -8], msg: "బయట వైపున మెట్లు, వాటి కింద వాషింగ్ ఏరియాతో పాటు చిన్న బాత్ రూమ్ ఉంది." },
  { time: 10000, cam: [-8, 2.5, -15], tgt: [-10.5, 2, -7.5], msg: "ఇది తూర్పు ముఖంగా ఉన్న ప్రధాన ద్వారం (సింహద్వారం). లోపలికి వెళ్దాం రండి." },
  { time: 15000, cam: [-10, 2.5, -6], tgt: [-3, 2, 0], msg: "ఇది విశాలమైన హాల్. ఇక్కడ టీవీ మరియు సోఫాలు వస్తాయి." },
  { time: 20000, cam: [-3, 2.5, -1], tgt: [9, 2, -3], msg: "కుడివైపు చూస్తే వంటగది. దాని ఈశాన్య మూలలో పూజా గది ఉంది." },
  { time: 25000, cam: [-3, 2.5, 3], tgt: [2, 2, 12], msg: "పడమర వైపున మాస్టర్ బెడ్ రూమ్, ఇంకో బెడ్ రూమ్, మరియు అటాచ్డ్ బాత్ రూమ్స్ ఉన్నాయి." },
  { time: 30000, cam: [0, 15, 20], tgt: [0, 0, 0], msg: "ఇంటి టూర్ పూర్తయింది. మీరు స్క్రీన్ ని జరిపి వివరంగా చూడవచ్చు!" },
  { time: 34000, cam: [0, 15, 20], tgt: [0, 0, 0], msg: "" }
];

function startTour() {
  const camPts = tourData.map(d => new THREE.Vector3(...d.cam));
  const tgtPts = tourData.map(d => new THREE.Vector3(...d.tgt));
  tourCamCurve = new THREE.CatmullRomCurve3(camPts);
  tourCamCurve.curveType = 'centripetal';
  tourTgtCurve = new THREE.CatmullRomCurve3(tgtPts);
  tourTgtCurve.curveType = 'centripetal';
  
  isTourActive = true;
  tourStartMs = performance.now();
  document.getElementById('tour-subtitle').style.display = 'block';
  document.getElementById('tour-subtitle').style.opacity = '1';
  if(roofVisible) toggleRoof();
}

function updateTour() {
  const elapsed = performance.now() - tourStartMs;
  let fraction = Math.min(1, elapsed / tourDuration);
  
  if (fraction >= 1) {
    isTourActive = false;
    document.getElementById('tour-subtitle').style.opacity = '0';
    setTimeout(() => { document.getElementById('tour-subtitle').style.display = 'none'; }, 500);
    const offset = new THREE.Vector3().subVectors(camera.position, target);
    radius = Math.max(0.1, offset.length());
    phi = Math.acos(Math.max(-1, Math.min(1, offset.y / radius)));
    theta = Math.atan2(offset.x, offset.z);
    return;
  }
  
  let currMsg = tourData[0].msg;
  for (let i = 0; i < tourData.length; i++) {
    if (elapsed >= tourData[i].time) currMsg = tourData[i].msg;
  }
  document.getElementById('tour-subtitle').innerText = currMsg;
  
  tourCamCurve.getPoint(fraction, camera.position);
  tourTgtCurve.getPoint(fraction, target);
  camera.lookAt(target);
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
makeLandscaping();
makeHouseFloor();
makeExactWalls();
makeRooms();
makePorfico();
makeSteps();
makeDoors();
makeWindows();
makeDimensions();
makeInterior();
const particles = makeParticles();

// Hide roof by default to show interior
toggleRoof();

// ─── Animate ──────────────────────────────────────────────────────────────────
let t = 0;
function animate() {
  requestAnimationFrame(animate);
  t += 0.005;
  if (isTourActive) updateTour();
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

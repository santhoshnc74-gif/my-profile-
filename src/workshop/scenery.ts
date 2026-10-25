// 3D Miniature Architectural Workshop Environment inspired directly by Reference Concept
// Ivory travertine plinth, warm sunlight, natural oak, deep teal accents, detailed miniature stations, and lush greenery
import * as THREE from 'three';
import type { Portfolio } from '../types';

export interface WorkshopSceneryObject extends THREE.Group {
  updateContent: (portfolio: Portfolio) => void;
  dispose: () => void;
}

export function createWorkshopScenery(initialPortfolio?: Portfolio): WorkshopSceneryObject {
  const root = new THREE.Group() as WorkshopSceneryObject;

  // ----------------------------------------------------
  // MATERIALS PALETTE (Physical, Believable, Warm)
  // ----------------------------------------------------
  const ivoryPlinthMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#eae4d9'),
    roughness: 0.62,
    metalness: 0.04,
  });

  const upperFloorMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#f0ece4'),
    roughness: 0.58,
    metalness: 0.03,
  });

  const wallPlasterMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#dfd7cb'),
    roughness: 0.82,
    metalness: 0.02,
  });

  const oakWoodMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#c69b6a'),
    roughness: 0.48,
    metalness: 0.05,
  });

  const darkOakMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#8a623a'),
    roughness: 0.55,
    metalness: 0.05,
  });

  const deepTealMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#164b4c'),
    roughness: 0.38,
    metalness: 0.15,
  });

  const softTealFabricMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#1e5b5c'),
    roughness: 0.85,
    metalness: 0.02,
  });

  const chromeMetalMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#e2e8e8'),
    roughness: 0.18,
    metalness: 0.88,
  });

  const brassTrimMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#d4af37'),
    roughness: 0.32,
    metalness: 0.82,
  });

  const terracottaMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#cb6542'),
    roughness: 0.72,
    metalness: 0.04,
  });

  const ivoryFabricMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#f5f2eb'),
    roughness: 0.85,
    metalness: 0.02,
  });

  const foliageDarkMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#255633'),
    roughness: 0.65,
    metalness: 0.02,
  });

  const foliageLightMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#3b7549'),
    roughness: 0.65,
    metalness: 0.02,
  });

  const soilMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#2d241c'),
    roughness: 0.95,
  });

  const rockMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#a8a096'),
    roughness: 0.9,
    metalness: 0.05,
  });

  // ----------------------------------------------------
  // 1. ARCHITECTURAL TRAVERTINE PLINTH & STEPS
  // ----------------------------------------------------

  // Main Raised Ivory Plinth (with slight rounded corners)
  const plinthWidth = 16.2;
  const plinthDepth = 15.6;
  const plinthHeight = 0.65;

  const plinthGeo = new THREE.BoxGeometry(plinthWidth, plinthHeight, plinthDepth);
  const plinthMesh = new THREE.Mesh(plinthGeo, ivoryPlinthMaterial);
  plinthMesh.position.set(0.6, -plinthHeight / 2, -0.6);
  plinthMesh.receiveShadow = true;
  root.add(plinthMesh);

  // Stepped Plinth Curb / Bevel Frame
  const curbGeo = new THREE.BoxGeometry(plinthWidth + 0.3, 0.08, plinthDepth + 0.3);
  const curbMesh = new THREE.Mesh(curbGeo, upperFloorMaterial);
  curbMesh.position.set(0.6, -0.04, -0.6);
  curbMesh.receiveShadow = true;
  root.add(curbMesh);

  // Front Left Entrance Steps (4 steps descending to lower level)
  const stepsGroup = new THREE.Group();
  const numSteps = 4;
  const stepW = 2.4;
  const stepTotalH = 0.38;
  const stepTotalD = 1.5;

  for (let i = 0; i < numSteps; i++) {
    const sH = (stepTotalH / numSteps) * (i + 1);
    const sD = stepTotalD / numSteps;
    const stepMesh = new THREE.Mesh(
      new THREE.BoxGeometry(stepW, sH, sD),
      ivoryPlinthMaterial
    );
    stepMesh.position.set(0, sH / 2 - 0.22, (numSteps - 1 - i) * sD);
    stepMesh.castShadow = true;
    stepMesh.receiveShadow = true;
    stepsGroup.add(stepMesh);
  }
  stepsGroup.position.set(-4.2, 0, 3.2);
  root.add(stepsGroup);

  // Engraved Plinth Text ("INTERACTIVE WORKSHOP · LEARN · BUILD · EXPLORE")
  const engravedCanvas = document.createElement('canvas');
  engravedCanvas.width = 1024;
  engravedCanvas.height = 128;
  const eCtx = engravedCanvas.getContext('2d');
  if (eCtx) {
    eCtx.fillStyle = '#eae4d9';
    eCtx.fillRect(0, 0, 1024, 128);
    eCtx.fillStyle = '#6e7777';
    eCtx.font = 'bold 36px "Inter", "Helvetica Neue", sans-serif';
    eCtx.textAlign = 'center';
    eCtx.letterSpacing = '8px';
    eCtx.fillText('INTERACTIVE  WORKSHOP', 512, 54);
    eCtx.font = '22px "Inter", sans-serif';
    eCtx.fillStyle = '#8f9a9a';
    eCtx.letterSpacing = '6px';
    eCtx.fillText('LEARN   •   BUILD   •   EXPLORE', 512, 98);
  }
  const engravedTex = new THREE.CanvasTexture(engravedCanvas);
  const engravedMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(8.5, 0.75),
    new THREE.MeshStandardMaterial({ map: engravedTex, roughness: 0.75 })
  );
  engravedMesh.position.set(1.4, -0.32, 7.21);
  root.add(engravedMesh);

  // Central Launch Pad (Glowing Teal Ring & Inner Travertine Disc)
  const ringGeo = new THREE.RingGeometry(1.45, 1.62, 64);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#38b2ac'),
    side: THREE.DoubleSide,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.position.set(0.6, 0.006, -0.2);
  root.add(ringMesh);

  const innerDiscGeo = new THREE.CircleGeometry(1.42, 64);
  innerDiscGeo.rotateX(-Math.PI / 2);
  const innerDisc = new THREE.Mesh(innerDiscGeo, upperFloorMaterial);
  innerDisc.position.set(0.6, 0.005, -0.2);
  innerDisc.receiveShadow = true;
  root.add(innerDisc);

  // Compass Brass Tick Pointer on ring (Facing Forward-South)
  const pointerGeo = new THREE.ConeGeometry(0.12, 0.45, 12);
  pointerGeo.rotateX(-Math.PI / 2);
  const pointerMesh = new THREE.Mesh(pointerGeo, brassTrimMaterial);
  pointerMesh.position.set(0.6, 0.008, 0.65);
  root.add(pointerMesh);

  // Back Plaster Wall & Right Wall (with beveled/rounded edges)
  const backWallGeo = new THREE.BoxGeometry(15.2, 4.2, 0.45);
  const backWall = new THREE.Mesh(backWallGeo, wallPlasterMaterial);
  backWall.position.set(0.6, 2.1, -7.8);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  root.add(backWall);

  const rightWallGeo = new THREE.BoxGeometry(0.45, 4.2, 8.8);
  const rightWall = new THREE.Mesh(rightWallGeo, wallPlasterMaterial);
  rightWall.position.set(8.0, 2.1, -3.6);
  rightWall.castShadow = true;
  rightWall.receiveShadow = true;
  root.add(rightWall);

  // Warm Wall Sconce Lamp on Right Wall (as seen in reference)
  const sconceArm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8), brassTrimMaterial);
  sconceArm.rotation.z = Math.PI / 2;
  sconceArm.position.set(7.75, 2.7, -4.2);
  root.add(sconceArm);

  const sconceShade = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.22, 16), brassTrimMaterial);
  sconceShade.position.set(7.55, 2.65, -4.2);
  root.add(sconceShade);

  const sconceLight = new THREE.PointLight('#ffe5b4', 1.4, 4.5);
  sconceLight.position.set(7.5, 2.5, -4.2);
  root.add(sconceLight);

  // ----------------------------------------------------
  // 2. STATION 01: PROJECTS (TEXFLOW WEAVING WORKSHOP & SCREEN)
  // ----------------------------------------------------
  const station01 = new THREE.Group();
  station01.position.set(-3.8, 0, -3.2);

  // Large Arched Wood-Framed Project Screen (Exact Reference Match)
  const screenFrameGeo = new THREE.BoxGeometry(4.8, 2.6, 0.25);
  const screenFrame = new THREE.Mesh(screenFrameGeo, oakWoodMaterial);
  screenFrame.position.set(0, 1.6, -1.8);
  screenFrame.castShadow = true;
  station01.add(screenFrame);

  // High-Resolution Project Display Canvas
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 1024;
  screenCanvas.height = 512;
  const screenTex = new THREE.CanvasTexture(screenCanvas);
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 2.3), screenMat);
  screenMesh.position.set(0, 1.6, -1.66);
  station01.add(screenMesh);

  const drawProjectScreen = (projectName: string = 'TEXFLOW', subtitle: string = 'GARMENT & TEXTILE FACTORY MANAGEMENT SYSTEM') => {
    const sCtx = screenCanvas.getContext('2d');
    if (!sCtx) return;
    // Deep Teal Gradient
    const grad = sCtx.createLinearGradient(0, 0, 1024, 512);
    grad.addColorStop(0, '#092526');
    grad.addColorStop(0.5, '#124142');
    grad.addColorStop(1, '#081e1e');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 1024, 512);

    // Elegant Fluid Wave Curves (Exact Reference visual)
    sCtx.strokeStyle = 'rgba(74, 222, 222, 0.4)';
    sCtx.lineWidth = 5;
    sCtx.beginPath();
    for (let x = 0; x <= 1024; x += 16) {
      const y = 310 + Math.sin(x * 0.007) * 90 + Math.cos(x * 0.014) * 45;
      if (x === 0) sCtx.moveTo(x, y);
      else sCtx.lineTo(x, y);
    }
    sCtx.stroke();

    sCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    sCtx.lineWidth = 2.5;
    sCtx.beginPath();
    for (let x = 0; x <= 1024; x += 16) {
      const y = 360 + Math.sin(x * 0.009 + 0.8) * 70;
      if (x === 0) sCtx.moveTo(x, y);
      else sCtx.lineTo(x, y);
    }
    sCtx.stroke();

    // Pulse indicator
    sCtx.fillStyle = '#4ade80';
    sCtx.beginPath();
    sCtx.arc(90, 80, 8, 0, Math.PI * 2);
    sCtx.fill();

    sCtx.fillStyle = '#8de8e8';
    sCtx.font = 'bold 20px "Inter", sans-serif';
    sCtx.textAlign = 'left';
    sCtx.letterSpacing = '3px';
    sCtx.fillText('PRIMARY SYSTEM · ACTIVE', 110, 86);

    // Project Name & Subtitle
    sCtx.fillStyle = '#ffffff';
    sCtx.font = 'bold 68px "Inter", sans-serif';
    sCtx.textAlign = 'center';
    sCtx.letterSpacing = '5px';
    sCtx.fillText(projectName.toUpperCase(), 512, 215);

    sCtx.fillStyle = '#7ee3e3';
    sCtx.font = '22px "Inter", sans-serif';
    sCtx.letterSpacing = '4px';
    sCtx.fillText(subtitle.toUpperCase().slice(0, 48), 512, 275);

    // Tech Tags line
    sCtx.font = '18px "Inter", sans-serif';
    sCtx.fillStyle = '#d6f5f5';
    sCtx.fillText('REACT  ·  TYPESCRIPT  ·  FASTAPI  ·  PYTHON  ·  POSTGRESQL', 512, 335);

    screenTex.needsUpdate = true;
  };
  drawProjectScreen(initialPortfolio?.profile.currentWork.name, initialPortfolio?.profile.currentWork.description);

  // Textile Machinery & Workbench Table
  const tableBaseGeo = new THREE.BoxGeometry(3.6, 0.55, 1.4);
  const tableBase = new THREE.Mesh(tableBaseGeo, upperFloorMaterial);
  tableBase.position.set(0, 0.28, 0);
  tableBase.castShadow = true;
  tableBase.receiveShadow = true;
  station01.add(tableBase);

  // Conveyor Belt Bed
  const beltGeo = new THREE.BoxGeometry(3.4, 0.04, 0.9);
  const beltMat = new THREE.MeshStandardMaterial({ color: '#2b3033', roughness: 0.9 });
  const belt = new THREE.Mesh(beltGeo, beltMat);
  belt.position.set(0, 0.58, 0);
  station01.add(belt);

  // Chrome Gantry Pillars & Drive Rails
  const gantryPillarGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.85, 12);
  const p1 = new THREE.Mesh(gantryPillarGeo, chromeMetalMaterial);
  p1.position.set(-1.4, 0.95, -0.4);
  p1.castShadow = true;
  station01.add(p1);

  const p2 = new THREE.Mesh(gantryPillarGeo, chromeMetalMaterial);
  p2.position.set(1.4, 0.95, -0.4);
  p2.castShadow = true;
  station01.add(p2);

  const bar = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.08, 0.08), chromeMetalMaterial);
  bar.position.set(0, 1.38, -0.4);
  station01.add(bar);

  // Robotic Tooling Head
  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.35, 0.28), deepTealMaterial);
  headMesh.position.set(0, 1.15, -0.3);
  headMesh.castShadow = true;
  station01.add(headMesh);

  // Fabric Bolts (Teal, Terracotta, Ivory cloth rolls as in reference)
  const createClothRoll = (radius: number, length: number, material: THREE.Material, rotZ: number = 0) => {
    const geo = new THREE.CylinderGeometry(radius, radius, length, 24);
    geo.rotateZ(Math.PI / 2 + rotZ);
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    return mesh;
  };

  const rollTeal = createClothRoll(0.15, 0.8, softTealFabricMaterial);
  rollTeal.position.set(-0.85, 0.73, 0.15);
  station01.add(rollTeal);

  const rollTerracotta = createClothRoll(0.14, 0.75, terracottaMaterial);
  rollTerracotta.position.set(0.65, 0.72, 0.1);
  station01.add(rollTerracotta);

  const rollIvory = createClothRoll(0.13, 0.65, ivoryFabricMaterial);
  rollIvory.position.set(-0.2, 0.71, -0.12);
  station01.add(rollIvory);

  // Side Natural Oak Shelf Unit with Stacked Rolls
  const shelfUnit = new THREE.Group();
  const shelfFrame = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.95, 0.65), oakWoodMaterial);
  shelfFrame.position.set(0, 0.48, 0);
  shelfFrame.castShadow = true;
  shelfUnit.add(shelfFrame);

  const shelfRoll1 = createClothRoll(0.11, 0.5, terracottaMaterial);
  shelfRoll1.position.set(0, 0.72, 0);
  shelfUnit.add(shelfRoll1);

  shelfUnit.position.set(-2.4, 0, 0);
  station01.add(shelfUnit);

  root.add(station01);

  // ----------------------------------------------------
  // 3. STATION 02: LEARNING (STUDY DESK, LAPTOP & SHELVES)
  // ----------------------------------------------------
  const station02 = new THREE.Group();
  station02.position.set(0.2, 0, -4.8);

  // Solid Natural Oak Desk
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 1.3), oakWoodMaterial);
  deskTop.position.set(0, 0.76, 0);
  deskTop.castShadow = true;
  station02.add(deskTop);

  // Slender Desk Legs
  const legGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.76, 12);
  const legPositions = [
    [-1.15, 0.38, -0.52],
    [1.15, 0.38, -0.52],
    [-1.15, 0.38, 0.52],
    [1.15, 0.38, 0.52],
  ];
  legPositions.forEach(([x, y, z]) => {
    const leg = new THREE.Mesh(legGeo, oakWoodMaterial);
    leg.position.set(x, y, z);
    leg.castShadow = true;
    station02.add(leg);
  });

  // Ergonomic Teal Swivel Chair (Exact Reference Character)
  const chairGroup = new THREE.Group();
  const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.07, 0.58), softTealFabricMaterial);
  chairSeat.position.y = 0.45;
  chairSeat.castShadow = true;
  chairGroup.add(chairSeat);

  const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.55, 0.08), softTealFabricMaterial);
  chairBack.position.set(0, 0.74, 0.26);
  chairBack.castShadow = true;
  chairGroup.add(chairBack);

  const chairStem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 12), chromeMetalMaterial);
  chairStem.position.y = 0.23;
  chairGroup.add(chairStem);

  chairGroup.position.set(0, 0, 0.75);
  station02.add(chairGroup);

  // Open Silver Laptop on Desk
  const laptopGroup = new THREE.Group();
  const laptopBase = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.018, 0.3), chromeMetalMaterial);
  laptopBase.position.y = 0.81;
  laptopGroup.add(laptopBase);

  const laptopScreen = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.28, 0.015), deepTealMaterial);
  laptopScreen.position.set(0, 0.94, -0.15);
  laptopScreen.rotation.x = -0.22;
  laptopGroup.add(laptopScreen);

  // Lit Display with Neural Network Graphic
  const laptopScreenMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 0.25),
    new THREE.MeshBasicMaterial({ color: '#7be3e3' })
  );
  laptopScreenMesh.position.set(0, 0.94, -0.14);
  laptopScreenMesh.rotation.x = -0.22;
  laptopGroup.add(laptopScreenMesh);
  station02.add(laptopGroup);

  // Articulated Task Lamp casting warm pool of light
  const lampGroup = new THREE.Group();
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 16), brassTrimMaterial);
  lampBase.position.set(0.95, 0.81, -0.3);
  lampGroup.add(lampBase);

  const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.38, 12), brassTrimMaterial);
  lampPole.position.set(0.95, 1.0, -0.3);
  lampGroup.add(lampPole);

  const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.14, 16), brassTrimMaterial);
  lampShade.rotateX(Math.PI / 1.35);
  lampShade.position.set(0.88, 1.18, -0.2);
  lampGroup.add(lampShade);

  const deskLampLight = new THREE.PointLight('#fff3db', 1.4, 2.8);
  deskLampLight.position.set(0.82, 1.12, -0.15);
  lampGroup.add(deskLampLight);
  station02.add(lampGroup);

  // Stack of Books on Desk
  const bookGeo = new THREE.BoxGeometry(0.28, 0.05, 0.22);
  const b1 = new THREE.Mesh(bookGeo, terracottaMaterial);
  b1.position.set(-0.9, 0.83, 0.1);
  station02.add(b1);

  const b2 = new THREE.Mesh(bookGeo, deepTealMaterial);
  b2.position.set(-0.9, 0.88, 0.1);
  b2.rotation.y = 0.12;
  station02.add(b2);

  // Floating Natural Wood Shelves Above Desk on Wall (Exact Reference visual)
  const shelf1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 0.3), oakWoodMaterial);
  shelf1.position.set(0, 2.3, -2.8);
  shelf1.castShadow = true;
  station02.add(shelf1);

  const shelf2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 0.3), oakWoodMaterial);
  shelf2.position.set(-0.3, 2.8, -2.8);
  shelf2.castShadow = true;
  station02.add(shelf2);

  // Miniature Books on Shelves
  const createMiniBook = (w: number, h: number, d: number, color: string) => {
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
  };
  const mb1 = createMiniBook(0.06, 0.24, 0.2, '#cb6542');
  mb1.position.set(-0.7, 2.45, -2.75);
  station02.add(mb1);
  const mb2 = createMiniBook(0.07, 0.22, 0.2, '#164b4c');
  mb2.position.set(-0.62, 2.44, -2.75);
  station02.add(mb2);
  const mb3 = createMiniBook(0.08, 0.26, 0.2, '#f0ece4');
  mb3.position.set(-0.53, 2.46, -2.75);
  station02.add(mb3);

  // Pinned Wall Blueprint / Poster ("Better Ideas Brighter Tomorrows.")
  const blueprintCanvas = document.createElement('canvas');
  blueprintCanvas.width = 512;
  blueprintCanvas.height = 384;
  const bpTex = new THREE.CanvasTexture(blueprintCanvas);
  const bpMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 1.4),
    new THREE.MeshBasicMaterial({ map: bpTex })
  );
  bpMesh.position.set(0.65, 2.35, -2.96);
  station02.add(bpMesh);

  const drawLearningBlueprint = (institution: string = 'Excel Engineering College', degree: string = 'B.Tech · AI & Data Science') => {
    const bpCtx = blueprintCanvas.getContext('2d');
    if (!bpCtx) return;
    bpCtx.fillStyle = '#faf8f5';
    bpCtx.fillRect(0, 0, 512, 384);
    bpCtx.strokeStyle = '#2d8280';
    bpCtx.lineWidth = 3;
    bpCtx.strokeRect(16, 16, 480, 352);

    bpCtx.fillStyle = '#1c4a4b';
    bpCtx.font = 'bold 24px "Inter", sans-serif';
    bpCtx.textAlign = 'left';
    bpCtx.fillText('Better Ideas', 36, 62);
    bpCtx.fillText('Brighter Tomorrows.', 36, 95);

    bpCtx.font = 'bold 18px "Inter", sans-serif';
    bpCtx.fillStyle = '#263333';
    bpCtx.fillText(degree.slice(0, 34), 36, 140);

    bpCtx.font = '15px "Inter", sans-serif';
    bpCtx.fillStyle = '#596969';
    bpCtx.fillText(institution.slice(0, 36), 36, 170);
    bpCtx.fillText('Third Year · Expected Graduation 2028', 36, 194);

    // Neural network diagram sketch
    bpCtx.strokeStyle = '#8fb8b8';
    bpCtx.lineWidth = 2;
    bpCtx.beginPath();
    bpCtx.arc(80, 280, 14, 0, Math.PI * 2);
    bpCtx.arc(80, 330, 14, 0, Math.PI * 2);
    bpCtx.arc(240, 255, 14, 0, Math.PI * 2);
    bpCtx.arc(240, 305, 14, 0, Math.PI * 2);
    bpCtx.arc(240, 355, 14, 0, Math.PI * 2);
    bpCtx.arc(400, 305, 14, 0, Math.PI * 2);
    bpCtx.stroke();

    // Connecting weights
    bpCtx.beginPath();
    bpCtx.moveTo(94, 280); bpCtx.lineTo(226, 255);
    bpCtx.moveTo(94, 280); bpCtx.lineTo(226, 305);
    bpCtx.moveTo(94, 330); bpCtx.lineTo(226, 305);
    bpCtx.moveTo(94, 330); bpCtx.lineTo(226, 355);
    bpCtx.moveTo(254, 305); bpCtx.lineTo(386, 305);
    bpCtx.stroke();

    bpTex.needsUpdate = true;
  };
  drawLearningBlueprint(initialPortfolio?.profile.education.institution, initialPortfolio?.profile.education.degree);

  root.add(station02);

  // ----------------------------------------------------
  // 4. STATION 03: FUTURE PLANS (PLANNING CHALKBOARD WALL)
  // ----------------------------------------------------
  const station03 = new THREE.Group();
  station03.position.set(5.2, 0, -4.6);

  // Natural Blonde Wood Chalkboard Frame
  const boardFrameGeo = new THREE.BoxGeometry(2.9, 2.6, 0.12);
  const boardFrame = new THREE.Mesh(boardFrameGeo, oakWoodMaterial);
  boardFrame.position.set(0, 2.1, -2.8);
  boardFrame.castShadow = true;
  station03.add(boardFrame);

  // Dark Slate Chalkboard Canvas
  const planCanvas = document.createElement('canvas');
  planCanvas.width = 512;
  planCanvas.height = 512;
  const planTex = new THREE.CanvasTexture(planCanvas);
  const planMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 2.3),
    new THREE.MeshBasicMaterial({ map: planTex })
  );
  planMesh.position.set(0, 2.1, -2.73);
  station03.add(planMesh);

  const drawPlansChalkboard = (goals: Array<{ title: string; description: string }> = []) => {
    const pCtx = planCanvas.getContext('2d');
    if (!pCtx) return;
    pCtx.fillStyle = '#223838'; // Dark chalkboard slate
    pCtx.fillRect(0, 0, 512, 512);

    pCtx.fillStyle = '#ffffff';
    pCtx.font = 'bold 36px "Inter", sans-serif';
    pCtx.fillText('Keep learning.', 36, 75);
    pCtx.fillText('Build. Ship.', 36, 125);
    pCtx.fillText('Become an', 36, 175);
    pCtx.fillText('entrepreneur.', 36, 225);

    // Goal item details
    const defaultGoals = [
      { title: 'Keep learning', description: 'Strengthen technical knowledge' },
      { title: 'Become an entrepreneur', description: 'Build ventures connecting tech with needs' },
    ];
    const displayGoals = goals.length > 0 ? goals.slice(0, 2) : defaultGoals;

    let y = 295;
    displayGoals.forEach((g) => {
      pCtx.fillStyle = '#43d9b8';
      pCtx.font = 'bold 20px "Inter", sans-serif';
      pCtx.fillText(`• ${g.title}`, 36, y);
      pCtx.fillStyle = '#c5ecec';
      pCtx.font = '16px "Inter", sans-serif';
      pCtx.fillText(g.description.slice(0, 40), 52, y + 26);
      y += 65;
    });

    // Startup growth curve sketch in chalk
    pCtx.strokeStyle = '#43d9b8';
    pCtx.lineWidth = 4;
    pCtx.beginPath();
    pCtx.moveTo(36, 470);
    pCtx.quadraticCurveTo(240, 460, 460, 350);
    pCtx.stroke();

    pCtx.fillStyle = '#43d9b8';
    pCtx.beginPath();
    pCtx.arc(460, 350, 8, 0, Math.PI * 2);
    pCtx.fill();

    planTex.needsUpdate = true;
  };
  drawPlansChalkboard(initialPortfolio?.profile.goals);

  root.add(station03);

  // ----------------------------------------------------
  // 5. STATION 04: CONNECT (LOUNGE, TEAL RUG & MEDIA SCREEN)
  // ----------------------------------------------------
  const station04 = new THREE.Group();
  station04.position.set(4.6, 0, 2.0);

  // Large Circular Teal Rug (Exact Reference Match)
  const rugGeo = new THREE.CircleGeometry(2.35, 64);
  rugGeo.rotateX(-Math.PI / 2);
  const rugMesh = new THREE.Mesh(rugGeo, deepTealMaterial);
  rugMesh.position.set(0, 0.007, 0);
  rugMesh.receiveShadow = true;
  station04.add(rugMesh);

  // Round Natural Oak Coffee Table
  const coffeeTableGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.28, 32);
  const coffeeTable = new THREE.Mesh(coffeeTableGeo, oakWoodMaterial);
  coffeeTable.position.set(0, 0.14, 0);
  coffeeTable.castShadow = true;
  station04.add(coffeeTable);

  // Tabletop Miniature Plant
  const tablePlantPot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.08, 12), terracottaMaterial);
  tablePlantPot.position.set(0, 0.32, 0);
  station04.add(tablePlantPot);

  const tablePlantFoliage = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), foliageLightMaterial);
  tablePlantFoliage.position.set(0, 0.42, 0);
  station04.add(tablePlantFoliage);

  // Two Rounded Mid-Century Ivory Armchairs with Terracotta Pillows
  const createArmchair = () => {
    const chair = new THREE.Group();
    // Rounded base cushion
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.22, 24), ivoryFabricMaterial);
    seat.position.y = 0.22;
    seat.castShadow = true;
    chair.add(seat);

    // Curved backrest shell
    const back = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.45, 24, 1, false, 0, Math.PI), ivoryFabricMaterial);
    back.position.set(0, 0.45, 0);
    back.rotation.y = Math.PI / 2;
    back.castShadow = true;
    chair.add(back);

    // Terracotta accent pillow
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.1), terracottaMaterial);
    pillow.position.set(0, 0.4, -0.22);
    chair.add(pillow);

    // Tapered Wooden Legs
    const legGeo = new THREE.CylinderGeometry(0.02, 0.015, 0.22, 8);
    const legCoords = [
      [-0.24, 0.11, -0.24],
      [0.24, 0.11, -0.24],
      [-0.24, 0.11, 0.24],
      [0.24, 0.11, 0.24],
    ];
    legCoords.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeo, darkOakMaterial);
      leg.position.set(x, y, z);
      leg.castShadow = true;
      chair.add(leg);
    });

    return chair;
  };

  const chair1 = createArmchair();
  chair1.position.set(-1.15, 0, -0.2);
  chair1.rotation.y = Math.PI / 3.2;
  station04.add(chair1);

  const chair2 = createArmchair();
  chair2.position.set(1.15, 0, -0.2);
  chair2.rotation.y = -Math.PI / 3.2;
  station04.add(chair2);

  // Low Partition Wall & Framed Connect Media Display (Exact Reference visual)
  const connectFrameGeo = new THREE.BoxGeometry(3.6, 2.2, 0.2);
  const connectFrame = new THREE.Mesh(connectFrameGeo, oakWoodMaterial);
  connectFrame.position.set(0, 1.35, -1.7);
  connectFrame.castShadow = true;
  station04.add(connectFrame);

  // Connect Display Screen Canvas (with Globe and "Let's start a conversation.")
  const connectCanvas = document.createElement('canvas');
  connectCanvas.width = 1024;
  connectCanvas.height = 512;
  const cCtx = connectCanvas.getContext('2d');
  if (cCtx) {
    const grad = cCtx.createLinearGradient(0, 0, 1024, 512);
    grad.addColorStop(0, '#0c1b1c');
    grad.addColorStop(1, '#133536');
    cCtx.fillStyle = grad;
    cCtx.fillRect(0, 0, 1024, 512);

    // Left Invitation Text
    cCtx.fillStyle = '#ffffff';
    cCtx.font = 'bold 44px "Inter", sans-serif';
    cCtx.textAlign = 'left';
    cCtx.fillText("Let's start", 80, 180);
    cCtx.fillText('a conversation.', 80, 235);

    // GitHub & Profile Badges
    cCtx.fillStyle = '#7ee3e3';
    cCtx.font = '22px "Inter", sans-serif';
    cCtx.fillText('GitHub · LinkedIn · Email', 80, 310);

    // Right Side 3D Earth Globe Visual Graphic
    cCtx.save();
    cCtx.translate(760, 256);
    cCtx.beginPath();
    cCtx.arc(0, 0, 160, 0, Math.PI * 2);
    cCtx.fillStyle = '#0a2324';
    cCtx.fill();
    cCtx.lineWidth = 4;
    cCtx.strokeStyle = '#2da6a4';
    cCtx.stroke();

    // Longitude / latitude lines
    cCtx.lineWidth = 2;
    cCtx.strokeStyle = 'rgba(74, 222, 222, 0.4)';
    cCtx.beginPath();
    cCtx.ellipse(0, 0, 160, 80, 0, 0, Math.PI * 2);
    cCtx.ellipse(0, 0, 160, 20, 0, 0, Math.PI * 2);
    cCtx.ellipse(0, 0, 80, 160, 0, 0, Math.PI * 2);
    cCtx.ellipse(0, 0, 20, 160, 0, 0, Math.PI * 2);
    cCtx.stroke();
    cCtx.restore();
  }
  const connectTex = new THREE.CanvasTexture(connectCanvas);
  const connectScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(3.3, 1.95),
    new THREE.MeshBasicMaterial({ map: connectTex })
  );
  connectScreen.position.set(0, 1.35, -1.59);
  station04.add(connectScreen);

  root.add(station04);

  // ----------------------------------------------------
  // 6. PLANTERS & MINIATURE BONSAI TREES (EXACT REFERENCE EDGES)
  // ----------------------------------------------------

  // Front-Left Planter Box (Beside Steps) with Stone, Moss & Bonsai
  const createPlanter = (w: number, d: number, h: number = 0.45) => {
    const pGroup = new THREE.Group();
    // Terracotta box
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), terracottaMaterial);
    box.position.y = h / 2;
    box.castShadow = true;
    box.receiveShadow = true;
    pGroup.add(box);

    // Soil layer
    const soil = new THREE.Mesh(new THREE.BoxGeometry(w - 0.08, 0.04, d - 0.08), soilMaterial);
    soil.position.y = h;
    pGroup.add(soil);

    // Rocks
    const rock1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12), rockMaterial);
    rock1.position.set(-w / 3.5, h + 0.06, 0);
    pGroup.add(rock1);

    const rock2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.1), rockMaterial);
    rock2.position.set(w / 3.5, h + 0.05, 0.05);
    pGroup.add(rock2);

    // Miniature Bonsai / Shrub clusters
    const numTrunks = 3;
    for (let i = 0; i < numTrunks; i++) {
      const offsetX = (i - (numTrunks - 1) / 2) * (w / (numTrunks + 0.6));
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.38, 8), darkOakMaterial);
      trunk.position.set(offsetX, h + 0.19, (i % 2 === 0 ? 0.04 : -0.04));
      trunk.castShadow = true;
      pGroup.add(trunk);

      const leafBall = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), i % 2 === 0 ? foliageDarkMaterial : foliageLightMaterial);
      leafBall.position.set(offsetX, h + 0.45, (i % 2 === 0 ? 0.04 : -0.04));
      leafBall.castShadow = true;
      pGroup.add(leafBall);
    }
    return pGroup;
  };

  // Left Planter (Near Steps)
  const leftPlanter = createPlanter(2.2, 0.85);
  leftPlanter.position.set(-6.0, 0, 2.0);
  root.add(leftPlanter);

  // Front-Right Sunken Garden Planter
  const rightPlanter = createPlanter(2.4, 0.9);
  rightPlanter.position.set(4.8, 0, 5.8);
  root.add(rightPlanter);

  // ----------------------------------------------------
  // DYNAMIC UPDATE & DISPOSAL METHODS
  // ----------------------------------------------------
  root.updateContent = (p: Portfolio) => {
    drawProjectScreen(p.profile.currentWork.name, p.profile.currentWork.description);
    drawLearningBlueprint(p.profile.education.institution, p.profile.education.degree);
    drawPlansChalkboard(p.profile.goals);
  };

  root.dispose = () => {
    screenTex.dispose();
    bpTex.dispose();
    planTex.dispose();
    connectTex.dispose();
    engravedTex.dispose();
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else if (mesh.material) {
          mesh.material.dispose();
        }
      }
    });
  };

  return root;
}

import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { mergeAllGroupMeshesByMaterial } from '../utils/geometryMerger';
import { geoCache } from '../utils/GeometryCache';

// ─────────────────────────────────────────────────────────────────────────────
// WRIST MODULE — High-Precision Ergonomic Humanoid Robotic Gauntlet Cuff
// Re-engineered to strictly match reference photos (Reference Images 1 & 2):
//
// Key Architectural Features:
//   1. Sculpted dark titanium / gunmetal ergonomic squircle gauntlet cuff (superellipse)
//      with smooth filleted corners, continuous G2 curvature, and zero sharp box edges.
//   2. Ultra-flush polished chrome upper forearm-docking and lower carpal-docking trim rims.
//   3. Signature Cybernetic Purple OLED capsule display sunken flush on the dorsal face.
//   4. Precision lateral and medial styloid process rotary bearing hubs with hex fasteners.
//   5. Compact internal 2-DOF transverse axle pin & clevis trunnion with zero neck gap.
// ─────────────────────────────────────────────────────────────────────────────

export interface WristNodes {
  group: THREE.Group;
  wristPivot: THREE.Group;
  trunnionPivot: THREE.Group;
  distalHandMount: THREE.Group;
  swivelCollar: THREE.Mesh;
  accentRing: THREE.Mesh;
  pivotPin: THREE.Mesh;
  distalClevis: THREE.Mesh;
  ribbedRings: THREE.Mesh[];
  styloidCaps: THREE.Mesh[];
  ledMeshes: THREE.Mesh[];
  styloidArmorLeft: THREE.Mesh;
  styloidArmorRight: THREE.Mesh;
  dorsalCowl: THREE.Mesh;
  rotaryCore: THREE.Mesh;
  distalSocket: THREE.Mesh;
}

/**
 * Creates an ergonomic squircle (superellipse) gauntlet cuff geometry.
 * Continuously curved, filleted quad-mesh with top and bottom chamfers.
 */
function createSquircleCuffGeometry(
  width: number = 0.0432,
  depth: number = 0.0332,
  height: number = 0.0135,
  power: number = 3.2
): THREE.BufferGeometry {
  const radialSegments = 48;
  const a = width * 0.5;
  const b = depth * 0.5;

  // Longitudinal profile definitions (y, scale)
  const profile = [
    { y:  0.0000, scale: 0.92 }, // Top lid inner rim
    { y: -0.0008, scale: 0.985 }, // Top chamfer
    { y: -0.0024, scale: 1.00 }, // Upper flank
    { y: -0.0068, scale: 1.015 }, // Mid organic convex crown
    { y: -0.0112, scale: 1.00 }, // Lower flank
    { y: -0.0127, scale: 0.985 }, // Bottom chamfer
    { y: -0.0135, scale: 0.93 }, // Bottom lid inner rim
  ];

  const heightSegments = profile.length - 1;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= heightSegments; j++) {
    const p = profile[j];
    const curA = a * p.scale;
    const curB = b * p.scale;
    const v = j / heightSegments;

    for (let i = 0; i <= radialSegments; i++) {
      const u = i / radialSegments;
      const theta = u * Math.PI * 2;

      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const sX = Math.sign(cosT) * Math.pow(Math.abs(cosT), 2 / power);
      const sZ = Math.sign(sinT) * Math.pow(Math.abs(sinT), 2 / power);

      positions.push(curA * sX, p.y, curB * sZ);
      uvs.push(u, v);
    }
  }

  // Quads between profile rings
  for (let j = 0; j < heightSegments; j++) {
    for (let i = 0; i < radialSegments; i++) {
      const p1 = j * (radialSegments + 1) + i;
      const p2 = p1 + 1;
      const p3 = (j + 1) * (radialSegments + 1) + i;
      const p4 = p3 + 1;

      indices.push(p1, p3, p2);
      indices.push(p2, p3, p4);
    }
  }

  // Top cap center vertex
  const topCenterIndex = positions.length / 3;
  positions.push(0, 0, 0);
  uvs.push(0.5, 0.5);

  for (let i = 0; i < radialSegments; i++) {
    indices.push(topCenterIndex, i, i + 1);
  }

  // Bottom cap center vertex
  const botCenterIndex = positions.length / 3;
  positions.push(0, -height, 0);
  uvs.push(0.5, 0.5);

  const botRingStart = heightSegments * (radialSegments + 1);
  for (let i = 0; i < radialSegments; i++) {
    indices.push(botCenterIndex, botRingStart + i + 1, botRingStart + i);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates a precision squircle trim ring ribbon conforming to the cuff perimeter.
 */
function createSquircleRingGeometry(
  width: number,
  depth: number,
  height: number = 0.0010,
  power: number = 3.2
): THREE.BufferGeometry {
  const radialSegments = 48;
  const a = width * 0.5;
  const b = depth * 0.5;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= 1; j++) {
    const y = -j * height;
    for (let i = 0; i <= radialSegments; i++) {
      const u = i / radialSegments;
      const theta = u * Math.PI * 2;

      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const sX = Math.sign(cosT) * Math.pow(Math.abs(cosT), 2 / power);
      const sZ = Math.sign(sinT) * Math.pow(Math.abs(sinT), 2 / power);

      positions.push(a * sX, y, b * sZ);
      uvs.push(u, j);
    }
  }

  for (let i = 0; i < radialSegments; i++) {
    const p1 = i;
    const p2 = i + 1;
    const p3 = (radialSegments + 1) + i;
    const p4 = p3 + 1;

    indices.push(p1, p3, p2);
    indices.push(p2, p3, p4);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function getSquircleCuffGeometry(
  width: number = 0.0432,
  depth: number = 0.0332,
  height: number = 0.0135,
  power: number = 3.2
): THREE.BufferGeometry {
  const key = `SquircleCuff_${width.toFixed(5)}_${depth.toFixed(5)}_${height.toFixed(5)}_${power.toFixed(2)}`;
  return geoCache.get(key, () => createSquircleCuffGeometry(width, depth, height, power));
}

function getSquircleRingGeometry(
  width: number,
  depth: number,
  height: number = 0.0010,
  power: number = 3.2
): THREE.BufferGeometry {
  const key = `SquircleRing_${width.toFixed(5)}_${depth.toFixed(5)}_${height.toFixed(5)}_${power.toFixed(2)}`;
  return geoCache.get(key, () => createSquircleRingGeometry(width, depth, height, power));
}

export function createWrist(
  side: -1 | 1,
  materials: RobotMaterialPalette
): WristNodes {
  const wristGroup = new THREE.Group();
  wristGroup.name = side === -1 ? 'LeftWristPivot' : 'RightWristPivot';

  const ledMeshes: THREE.Mesh[] = [];
  const ribbedRings: THREE.Mesh[] = [];
  const styloidCaps: THREE.Mesh[] = [];

  const mechanicsGroup = new THREE.Group();
  mechanicsGroup.name = 'WristMechanics';
  wristGroup.add(mechanicsGroup);

  // ════════════════════════════════════════════════════════════
  // 1. SCULPTED ERGONOMIC GAUNTLET CUFF (SUPER-ELLIPSE GEOMETRY)
  //    Dark titanium chamfered body with continuous G2 curvature
  // ════════════════════════════════════════════════════════════
  const cuffW = 0.0496; // 49.6 mm wide (harmonious proportional bridge: forearm ~50mm -> carpal 49.6mm)
  const cuffD = 0.0388; // 38.8 mm deep (eliminates narrow bottleneck while preserving sleek articulation)
  const cuffH = 0.0152; // 15.2 mm controlled athletic height

  const cuffGeo = getSquircleCuffGeometry(cuffW, cuffD, cuffH, 3.2);
  const swivelCollar = new THREE.Mesh(cuffGeo, materials.joint);
  swivelCollar.name = 'WristSmartCuff';
  swivelCollar.position.set(0, 0, 0);
  swivelCollar.castShadow = true;
  swivelCollar.receiveShadow = true;
  mechanicsGroup.add(swivelCollar);

  // ════════════════════════════════════════════════════════════
  // 2. POLISHED METALLIC TRIM BEZELS (Upper Forearm & Lower Carpal)
  // ════════════════════════════════════════════════════════════
  // Upper trim docking with forearm gauntlet collar (zero air gap)
  const topTrimGeo = getSquircleRingGeometry(cuffW * 1.006, cuffD * 1.006, 0.0010, 3.2);
  const topTrim = new THREE.Mesh(topTrimGeo, materials.metallic);
  topTrim.position.set(0, 0.0001, 0);
  mechanicsGroup.add(topTrim);
  ribbedRings.push(topTrim);

  // Lower trim docking with carpal hand base
  const botTrimGeo = getSquircleRingGeometry(cuffW * 0.975, cuffD * 0.975, 0.0010, 3.2);
  const botTrim = new THREE.Mesh(botTrimGeo, materials.metallic);
  botTrim.position.set(0, -cuffH + 0.0006, 0);
  mechanicsGroup.add(botTrim);
  ribbedRings.push(botTrim);

  // ════════════════════════════════════════════════════════════
  // 3. SIGNATURE DORSAL CYBERNETIC PURPLE OLED CAPSULE DISPLAY
  //    Sleek, pill-shaped horizontal slot recessed flush into dorsal face
  // ════════════════════════════════════════════════════════════
  const slotRadius = 0.0014;
  const slotLength = 0.0160;
  const slotY = -cuffH * 0.50;
  const slotZ = (cuffD * 0.50) * 1.015 - 0.0002;

  // Recessed dark backing tray
  const trayGeo = geoCache.getBox(slotLength + 0.0046, slotRadius * 2.8, 0.0010);
  const slotTray = new THREE.Mesh(trayGeo, materials.joint);
  slotTray.position.set(0, slotY, slotZ - 0.0004);
  mechanicsGroup.add(slotTray);

  // Precision polished chrome capsule bezel frame
  const bezelGeo = geoCache.get(
    `WristBezel_${slotRadius.toFixed(5)}_${slotLength.toFixed(5)}`,
    () => {
      const g = new THREE.CapsuleGeometry(slotRadius * 1.35, slotLength, 8, 16);
      g.rotateZ(Math.PI / 2);
      return g;
    }
  );
  const slotBezel = new THREE.Mesh(bezelGeo, materials.metallic);
  slotBezel.position.set(0, slotY, slotZ - 0.0001);
  mechanicsGroup.add(slotBezel);

  // Glowing Cybernetic Purple Emissive Element
  const ledGeo = geoCache.get(
    `WristLed_${slotRadius.toFixed(5)}_${slotLength.toFixed(5)}`,
    () => {
      const g = new THREE.CapsuleGeometry(slotRadius, slotLength * 0.95, 8, 16);
      g.rotateZ(Math.PI / 2);
      return g;
    }
  );
  const accentRing = new THREE.Mesh(ledGeo, materials.purpleEmissive);
  accentRing.name = 'WristPurpleEmissiveSlot';
  accentRing.position.set(0, slotY, slotZ + 0.0002);
  mechanicsGroup.add(accentRing);
  ledMeshes.push(accentRing);

  // Soft Purple Bloom Aura
  const bloomGeo = geoCache.get(
    `WristBloom_${slotRadius.toFixed(5)}_${slotLength.toFixed(5)}`,
    () => {
      const g = new THREE.CapsuleGeometry(slotRadius * 1.5, slotLength * 1.05, 8, 16);
      g.rotateZ(Math.PI / 2);
      return g;
    }
  );
  const bloomMesh = new THREE.Mesh(bloomGeo, materials.purpleBloom);
  bloomMesh.position.copy(accentRing.position);
  mechanicsGroup.add(bloomMesh);

  // Micro sensor apertures flanking display (Reference Image 1)
  const sensorGeo = geoCache.get(
    'WristSensorAperture',
    () => {
      const g = new THREE.CylinderGeometry(0.0005, 0.0005, 0.0008, 8);
      g.rotateX(Math.PI / 2);
      return g;
    }
  );
  for (const sX of [-0.0130, 0.0130]) {
    const sensor = new THREE.Mesh(sensorGeo, materials.metallic);
    sensor.position.set(sX, slotY, slotZ - 0.0002);
    mechanicsGroup.add(sensor);
  }

  // ════════════════════════════════════════════════════════════
  // 4. TRANSVERSE FLEXION AXLE PIN & STYLOID BEARING HUBS
  //    True anatomical wrist pivot axis at Y = -0.0120m
  // ════════════════════════════════════════════════════════════
  const pivotY = -0.0120;

  const coreGeo = geoCache.getCylinder(0.0080, 0.0080, 0.0096, 20);
  const rotaryCore = new THREE.Mesh(coreGeo, materials.joint);
  rotaryCore.name = 'WristRotaryCore';
  rotaryCore.position.set(0, pivotY, 0);
  rotaryCore.castShadow = true;
  mechanicsGroup.add(rotaryCore);

  const pinGeo = geoCache.get(
    `WristPivotPin_${cuffW.toFixed(5)}`,
    () => {
      const g = new THREE.CylinderGeometry(0.0038, 0.0038, cuffW + 0.0018, 18);
      g.rotateZ(Math.PI / 2);
      return g;
    }
  );
  const pivotPin = new THREE.Mesh(pinGeo, materials.metallic);
  pivotPin.name = 'WristPivotPin';
  pivotPin.position.set(0, pivotY, 0);
  pivotPin.castShadow = true;
  mechanicsGroup.add(pivotPin);

  // Lateral & Medial styloid rotary bearing hubs on pivot axis
  const collarGeo = geoCache.get('WristStyloidCollar', () => {
    const g = new THREE.CylinderGeometry(0.0052, 0.0052, 0.0013, 16);
    g.rotateZ(Math.PI / 2);
    return g;
  });
  const ringGeo = geoCache.get('WristStyloidRing', () => {
    const g = new THREE.TorusGeometry(0.0039, 0.00045, 6, 16);
    g.rotateY(Math.PI / 2);
    return g;
  });
  const boltGeo = geoCache.get('WristStyloidBolt', () => {
    const g = new THREE.CylinderGeometry(0.0013, 0.0013, 0.0015, 6);
    g.rotateZ(Math.PI / 2);
    return g;
  });

  for (const pSide of [-1, 1]) {
    const hubX = pSide * (cuffW * 0.50 + 0.0002);

    // Bearing race outer collar
    const collar = new THREE.Mesh(collarGeo, materials.joint);
    collar.position.set(hubX, pivotY, 0);
    mechanicsGroup.add(collar);
    styloidCaps.push(collar);

    // Polished chrome accent ring
    const ring = new THREE.Mesh(ringGeo, materials.metallic);
    ring.position.set(hubX + pSide * 0.0006, pivotY, 0);
    mechanicsGroup.add(ring);

    // Central axle cap with hex socket
    const bolt = new THREE.Mesh(boltGeo, materials.metallic);
    bolt.position.set(hubX + pSide * 0.0008, pivotY, 0);
    mechanicsGroup.add(bolt);
  }

  // ════════════════════════════════════════════════════════════
  // 5. COMPATIBILITY PROXIES (Exploded View Nodes)
  // ════════════════════════════════════════════════════════════
  const dummyArmorGeo = geoCache.get('DummyArmorGeo', () => new THREE.BufferGeometry());
  const styloidArmorLeft = new THREE.Mesh(dummyArmorGeo, materials.armor);
  styloidArmorLeft.visible = false;
  mechanicsGroup.add(styloidArmorLeft);

  const styloidArmorRight = new THREE.Mesh(dummyArmorGeo, materials.armor);
  styloidArmorRight.visible = false;
  mechanicsGroup.add(styloidArmorRight);

  const dorsalCowl = new THREE.Mesh(dummyArmorGeo, materials.armor);
  dorsalCowl.visible = false;
  mechanicsGroup.add(dorsalCowl);

  // ════════════════════════════════════════════════════════════
  // 6. ARTICULATED DISTAL TRUNNION ASSEMBLY
  //    Articulates around transverse axle pin at Y = pivotY (-0.0120m)
  // ════════════════════════════════════════════════════════════
  const trunnionPivot = new THREE.Group();
  trunnionPivot.name = side === -1 ? 'LeftWristTrunnion' : 'RightWristTrunnion';
  trunnionPivot.position.set(0, pivotY, 0);
  wristGroup.add(trunnionPivot);

  // Dual-shear titanium clevis yoke embracing axle pin
  const earGeo = geoCache.get('WristTrunnionEar', () => {
    const g = new THREE.CylinderGeometry(0.0052, 0.0052, 0.0022, 16);
    g.rotateZ(Math.PI / 2);
    return g;
  });
  for (const cSide of [-1, 1]) {
    const ear = new THREE.Mesh(earGeo, materials.joint);
    ear.position.set(cSide * 0.0145, 0, 0);
    ear.castShadow = true;
    trunnionPivot.add(ear);
  }

  // Clevis bridge base linking ears
  const bridgeGeo = geoCache.getBox(0.0290, 0.0026, 0.0145);
  const distalClevis = new THREE.Mesh(bridgeGeo, materials.joint);
  distalClevis.name = 'WristDistalClevis';
  distalClevis.position.set(0, -0.0016, 0);
  distalClevis.castShadow = true;
  distalClevis.receiveShadow = true;
  trunnionPivot.add(distalClevis);

  // Precision centering carpal socket collar
  const socketGeo = geoCache.getCylinder(0.0150, 0.0160, 0.0020, 24);
  const distalSocket = new THREE.Mesh(socketGeo, materials.joint);
  distalSocket.position.set(0, -0.0020, 0);
  trunnionPivot.add(distalSocket);

  // Dedicated Distal Mounting Anchor (flush docking against cuff bottom rim)
  const distalHandMount = new THREE.Group();
  distalHandMount.name = side === -1 ? 'LeftDistalHandMount' : 'RightDistalHandMount';
  distalHandMount.position.set(0, -0.0028, 0);
  trunnionPivot.add(distalHandMount);

  // Natural athletic resting flexion: subtle forward tilt (~2.5°)
  trunnionPivot.rotation.set(0.042, 0, 0);

  // Batch static meshes in mechanicsGroup (excluding animated swivelCollar and purple LED)
  mergeAllGroupMeshesByMaterial(mechanicsGroup, {
    excludeNames: [swivelCollar.name, accentRing.name],
    namePrefix: side === -1 ? 'LeftWristStatic' : 'RightWristStatic',
  });

  // Batch rigid ears and socket in trunnionPivot (excluding distalHandMount group and animated distalClevis)
  mergeAllGroupMeshesByMaterial(trunnionPivot, {
    excludeNames: [distalHandMount.name, distalClevis.name],
    namePrefix: side === -1 ? 'LeftWristTrunnion' : 'RightWristTrunnion',
  });

  return {
    group: wristGroup,
    wristPivot: wristGroup,
    trunnionPivot,
    distalHandMount,
    swivelCollar,
    accentRing,
    pivotPin,
    distalClevis,
    ribbedRings,
    styloidCaps,
    ledMeshes,
    styloidArmorLeft,
    styloidArmorRight,
    dorsalCowl,
    rotaryCore,
    distalSocket,
  };
}

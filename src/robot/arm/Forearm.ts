/**
 * ============================================================================
 * FOREARM MODULE — GAUNTLET & MECHANICAL CORE (AAA PRODUCTION SPECIFICATION)
 * ============================================================================
 *
 * Exact mechanical and hard-surface CAD reconstruction adhering strictly to:
 * - Reference Image 2: Wide under-elbow mass, continuous taper to wrist,
 *   exposed dark spaceframe core, and front-outer recessed purple LED accent.
 * - Corrections 14 to 18: Forearm volume, multi-piece white armor, visible
 *   dark titanium core, recessed longitudinal purple LED, and distinct wrist taper.
 *
 * Architecture:
 *   elbow.forearmPivot (Parent rotation pivot for elbow flexion)
 *     │
 *     ▼
 *   forearmMechanicalCore (Dark titanium structural spine + dual flexor actuators + cable conduit)
 *     │
 *     ▼
 *   forearmWhiteArmor (Multi-piece ceramic composite gauntlet: anterior + lateral + posterior)
 *     │
 *     ▼
 *   forearmVentilationChannel & purpleAccent (Recessed front-outer channel + purple LED rod)
 *     │
 *     ▼
 *   distalWristMount (Precision machined cuff interfacing with Wrist.ts)
 * ============================================================================
 */

import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { mergeAllGroupMeshesByMaterial } from '../utils/geometryMerger';
import { geoCache } from '../utils/GeometryCache';

export interface ForearmNodes {
  group: THREE.Group;
  mechanicalCore: THREE.Group;
  armatureSpine: THREE.Mesh;
  armorGroup: THREE.Group;
  anteriorArmor: THREE.Mesh;
  posteriorArmor: THREE.Mesh;
  sideArmor?: THREE.Mesh;
  innerArmor?: THREE.Mesh;
  ventilationChannel: THREE.Group;
  ledStrip: THREE.Mesh;
  ledMeshes: THREE.Mesh[];
  distalWristMount: THREE.Group;
  wristCuff: THREE.Mesh;
  // Compatibility aliases
  elbowSocketCollar: THREE.Mesh;
  brachioradialis: THREE.Mesh;
  panelSeam: THREE.Mesh;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. SCULPTED FOREARM ARMOR GEOMETRY (CORRECTIONS 14, 15, 18)
// Wide near elbow, sleek continuous taper to wrist, real 3.5mm wall thickness.
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// 1. COHERENT FOREARM GAUNTLET ARMOR GEOMETRY (SECTIONS 10, 11, 12, 15, 16)
// Coherent volumetric gauntlet, wide under-elbow mass, continuous taper to wrist.
// ─────────────────────────────────────────────────────────────────────────────
function createForearmCoherentArmor(
  shellType: 'primaryOuter' | 'secondaryInner',
  side: -1 | 1
): THREE.BufferGeometry {
  const cacheKey = `Forearm_Armor_${shellType}_${side}`;
  return geoCache.get(cacheKey, () => {
    const radialSegs = 32;
    const heightSegs = 30;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

  const yTop = -0.006; // Originates directly flush at elbow lower housing collar (Y = -0.020m in forearmPivot)
  const totalLength = 0.160; // Extended length (+10mm) proportioned harmoniously to lengthened upper arm (150mm)
  const thickness = 0.0028;  // 2.8 mm real physical wall thickness

  let startAngle = 0;
  let endAngle = 0;

  if (side === 1) {
    if (shellType === 'primaryOuter') {
      startAngle = -0.19 * Math.PI;
      endAngle = 0.84 * Math.PI;
    } else {
      startAngle = 0.85 * Math.PI;
      endAngle = 1.80 * Math.PI;
    }
  } else {
    if (shellType === 'primaryOuter') {
      startAngle = 0.19 * Math.PI;
      endAngle = -0.84 * Math.PI;
    } else {
      startAngle = -0.85 * Math.PI;
      endAngle = -1.80 * Math.PI;
    }
  }

  function evaluateSurface(layer: 0 | 1, iy: number, ix: number): THREE.Vector3 {
    const v = iy / heightSegs;
    const u = ix / radialSegs;
    let y = yTop - v * totalLength;

    // Athletic humanoid mecha gauntlet taper: under-elbow width ~67.4mm down to wrist ~48.6mm
    // Proportioned to slightly increased upper arm with matching 0.98x lateral width
    let radius = 0.0344 - 0.0096 * v + 0.0015 * Math.sin(Math.pow(v, 0.70) * Math.PI);

    if (v < 0.10) {
      // Inward chamfer at proximal elbow rim to seamlessly dock with lowCollar
      const tTop = (0.10 - v) / 0.10;
      radius -= tTop * 0.0006;
    } else if (v > 0.85) {
      // Inward socket bevel at distal wrist rim (\______/ )
      const tBot = (v - 0.85) / 0.15;
      radius -= tBot * 0.0008;
    }

    const angle = startAngle + u * (endAngle - startAngle);
    const sinA = Math.sin(angle);
    const cosA = Math.cos(angle);

    // Both width (rx) and depth (rz) taper gradually to create the sculpted athletic profile
    let rx = radius * 0.98; // medial-lateral width matching UpperArm (0.98x)
    let rz = radius * 0.97; // anterior-posterior depth (~66.7mm at elbow -> ~48.1mm at wrist)

    // 3D Facet Crowning & Crisp 45° Corner Chamfers (Matching UpperArm mecha lines)
    if (shellType === 'primaryOuter') {
      if (cosA > 0.50) {
        // Central anterior facet: crowned curvature
        const tCenter = (cosA - 0.50) / 0.50;
        rz -= (1.0 - Math.pow(tCenter, 1.4) * 0.35) * 0.0020;

        // Distinct recessed vertical panel line / seam down the front (matching UpperArm design system)
        if (cosA > 0.95 && Math.abs(sinA) < 0.10) {
          const tSeam = 1.0 - Math.abs(sinA) / 0.10;
          rz -= tSeam * 0.0014;
        }
      } else if (cosA > 0.12) {
        // Crisp 45° chamfered corner bevel connecting front and lateral faces
        const tChamfer = (cosA - 0.12) / 0.38;
        rx -= Math.sin(tChamfer * Math.PI) * 0.0020;
        rz -= (1.0 - tChamfer) * 0.0020;
      }
    }

    // Posterior dorsal flexor contour
    if (shellType === 'secondaryInner') {
      if (cosA < -0.40) {
        const tPost = (-cosA - 0.40) / 0.60;
        rz += Math.pow(tPost, 1.3) * 0.0018 * Math.sin(v * Math.PI * 0.85);
      } else if (cosA < 0) {
        const tChamfer = (-cosA) / 0.40;
        rx -= Math.sin(tChamfer * Math.PI) * 0.0010;
      }
    }

    // Proximal Forearm Elbow Transition (subtle chevron crest cleanly seating under cowl)
    if (v < 0.22) {
      const tElbow = (0.22 - v) / 0.22;
      const frontBias = Math.max(0, (cosA - 0.20) / 0.80);
      const sideBias = 1.0 - frontBias;
      // Front center facet reaches upward into sleek chevron crest towards elbow joint
      y += frontBias * 0.0040 * tElbow;
      rz += frontBias * 0.0008 * tElbow;
      // Lateral and medial sides smoothly funnel to meet the mechanical hinge width
      y -= sideBias * 0.0012 * tElbow;
      rx -= sideBias * 0.0008 * Math.pow(tElbow, 1.2);

      // Sculpted lateral actuator disc clearance scallop
      // Ensures circular rotary actuator disc seats cleanly with zero mesh collision
      const lateralFactor = Math.max(0, side * sinA);
      if (lateralFactor > 0.15) {
        const tLat = (lateralFactor - 0.15) / 0.85;
        rx -= tLat * 0.0026 * Math.pow(tElbow, 1.1);
      }
    }

    // Distal Wrist Transition Socket (terminates in engineered collar socket)
    if (v > 0.85) {
      const tWrist = (v - 0.85) / 0.15;
      rx -= tWrist * 0.0008;
      rz -= tWrist * 0.0009;
    }

    const rFactor = layer === 0 ? 1.0 : (1.0 - thickness / Math.max(rx, rz));

    return new THREE.Vector3(
      rFactor * rx * sinA,
      y,
      rFactor * rz * cosA
    );
  }

  // 1. Generate Vertices for Outer Shell (layer 0) and Inner Shell (layer 1)
  for (let layer = 0; layer <= 1; layer++) {
    for (let iy = 0; iy <= heightSegs; iy++) {
      for (let ix = 0; ix <= radialSegs; ix++) {
        const p = evaluateSurface(layer as 0 | 1, iy, ix);
        positions.push(p.x, p.y, p.z);
        uvs.push(ix / radialSegs, iy / heightSegs);
      }
    }
  }

  const layerStride = (heightSegs + 1) * (radialSegs + 1);

  // 2. Generate Triangles for Outer Surface
  for (let iy = 0; iy < heightSegs; iy++) {
    for (let ix = 0; ix < radialSegs; ix++) {
      const a = iy * (radialSegs + 1) + ix;
      const b = a + 1;
      const c = a + (radialSegs + 1);
      const d = c + 1;
      if (side === 1) {
        indices.push(a, c, b);
        indices.push(b, c, d);
      } else {
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }
  }

  // 3. Generate Triangles for Inner Surface
  for (let iy = 0; iy < heightSegs; iy++) {
    for (let ix = 0; ix < radialSegs; ix++) {
      const a = layerStride + iy * (radialSegs + 1) + ix;
      const b = a + 1;
      const c = a + (radialSegs + 1);
      const d = c + 1;
      if (side === 1) {
        indices.push(a, b, c);
        indices.push(b, d, c);
      } else {
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }
  }

  // 4. Perimeter Edge Walls (watertight bevel borders)
  for (let ix = 0; ix < radialSegs; ix++) {
    const oA = ix;
    const oB = ix + 1;
    const iA = layerStride + ix;
    const iB = layerStride + ix + 1;
    if (side === 1) {
      indices.push(oA, oB, iA);
      indices.push(oB, iB, iA);
    } else {
      indices.push(oA, iA, oB);
      indices.push(oB, iA, iB);
    }
  }

  const botRow = heightSegs * (radialSegs + 1);
  for (let ix = 0; ix < radialSegs; ix++) {
    const oA = botRow + ix;
    const oB = botRow + ix + 1;
    const iA = layerStride + botRow + ix;
    const iB = layerStride + botRow + ix + 1;
    if (side === 1) {
      indices.push(oA, iA, oB);
      indices.push(oB, iA, iB);
    } else {
      indices.push(oA, oB, iA);
      indices.push(oB, iB, iA);
    }
  }

  for (let iy = 0; iy < heightSegs; iy++) {
    const oA0 = iy * (radialSegs + 1);
    const oC0 = (iy + 1) * (radialSegs + 1);
    const iA0 = layerStride + oA0;
    const iC0 = layerStride + oC0;
    if (side === 1) {
      indices.push(oA0, iA0, oC0);
      indices.push(oC0, iA0, iC0);
    } else {
      indices.push(oA0, oC0, iA0);
      indices.push(oC0, iC0, iA0);
    }

    const oA1 = iy * (radialSegs + 1) + radialSegs;
    const oC1 = (iy + 1) * (radialSegs + 1) + radialSegs;
    const iA1 = layerStride + oA1;
    const iC1 = layerStride + oC1;
    if (side === 1) {
      indices.push(oA1, oC1, iA1);
      indices.push(oC1, iC1, iA1);
    } else {
      indices.push(oA1, iA1, oC1);
      indices.push(oC1, iA1, iC1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

    return geometry;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MAIN FOREARM ASSEMBLY BUILDER
// ─────────────────────────────────────────────────────────────────────────────
export function createForearm(
  side: -1 | 1,
  materials: RobotMaterialPalette
): ForearmNodes {
  const forearmGroup = new THREE.Group();
  forearmGroup.name = side === -1 ? 'LeftForearmAssembly' : 'RightForearmAssembly';

  const ledMeshes: THREE.Mesh[] = [];

  // ==========================================================================
  // SECTION 1: DARK STRUCTURAL MECHANICAL CORE (CORRECTION 16)
  // Titanium load-bearing spaceframe visually connecting ELBOW → FOREARM → WRIST
  // ==========================================================================
  const mechanicalCore = new THREE.Group();
  mechanicalCore.name = side === -1 ? 'LeftForearmMechanicalCore' : 'RightForearmMechanicalCore';
  forearmGroup.add(mechanicalCore);

  // 1. Proximal Elbow Docking Collar (interfaces with Elbow lower housing)
  const dockGeo = geoCache.get('Forearm_DockGeo', () => new THREE.CylinderGeometry(0.0332, 0.0344, 0.016, 28));
  const elbowSocketCollar = new THREE.Mesh(dockGeo, materials.joint);
  elbowSocketCollar.name = 'ForearmElbowSocketCollar';
  elbowSocketCollar.position.set(0, -0.008, 0);
  elbowSocketCollar.castShadow = true;
  mechanicalCore.add(elbowSocketCollar);

  // 2. Main Structural Column / Spaceframe Spine (scaled & extended to 160mm)
  const spineGeo = geoCache.get('Forearm_SpineGeo', () => new THREE.BoxGeometry(0.021, 0.160, 0.024));
  const armatureSpine = new THREE.Mesh(spineGeo, materials.joint);
  armatureSpine.name = 'ForearmArmatureSpine';
  armatureSpine.position.set(0, -0.088, 0);
  armatureSpine.castShadow = true;
  armatureSpine.receiveShadow = true;
  mechanicalCore.add(armatureSpine);

  // CNC Weight-Reduction Cutouts on Spine
  const cavGeo = geoCache.get('Forearm_CavGeo', () => new THREE.BoxGeometry(0.023, 0.018, 0.019));
  for (let c = 0; c < 4; c++) {
    const cav = new THREE.Mesh(cavGeo, materials.joint);
    cav.position.set(0, -0.044 - c * 0.027, 0);
    mechanicalCore.add(cav);
  }

  // 3. Substantial Bilateral Linear Flexor Actuator Cylinders & Chrome Piston Rods
  // Compacted load-bearing actuators nestled inside gauntlet spaceframe
  const actCylGeo = geoCache.get('Forearm_ActCylGeo', () => new THREE.CylinderGeometry(0.0040, 0.0040, 0.056, 16));
  const actRingGeo = geoCache.get('Forearm_ActRingGeo', () => new THREE.TorusGeometry(0.0046, 0.0008, 6, 16));
  const pistonGeo = geoCache.get('Forearm_PistonGeo', () => new THREE.CylinderGeometry(0.0026, 0.0026, 0.060, 14));
  for (const aSide of [-1, 1]) {
    const actCyl = new THREE.Mesh(actCylGeo, materials.joint);
    actCyl.position.set(aSide * 0.0110, -0.074, 0.008);
    actCyl.castShadow = true;
    mechanicalCore.add(actCyl);

    const actRing = new THREE.Mesh(actRingGeo, materials.metallic);
    actRing.position.set(aSide * 0.0110, -0.057, 0.008);
    mechanicalCore.add(actRing);

    const piston = new THREE.Mesh(pistonGeo, materials.metallic);
    piston.position.set(aSide * 0.0110, -0.124, 0.008);
    piston.castShadow = true;
    mechanicalCore.add(piston);
  }

  // 4. Internal Protected Cable Conduit Raceway
  const cableConduitGeo = geoCache.get('Forearm_CableConduitGeo', () => new THREE.CylinderGeometry(0.0024, 0.0024, 0.156, 10));
  const cableConduit = new THREE.Mesh(cableConduitGeo, materials.joint);
  cableConduit.position.set(0, -0.088, -0.010);
  cableConduit.castShadow = true;
  mechanicalCore.add(cableConduit);

  // 5. Distal Wrist Interface Mount (Receives Dedicated Wrist Module at Y = -0.171m for extended proportions)
  const distalWristMount = new THREE.Group();
  distalWristMount.name = side === -1 ? 'LeftDistalWristMount' : 'RightDistalWristMount';
  distalWristMount.position.set(0, -0.171, 0);
  mechanicalCore.add(distalWristMount);

  const cuffGeo = geoCache.get('Forearm_CuffGeo', () => new THREE.CylinderGeometry(0.0242, 0.0248, 0.010, 28));
  const wristCuff = new THREE.Mesh(cuffGeo, materials.joint);
  wristCuff.name = 'ForearmWristCuff';
  wristCuff.position.set(0, 0.005, 0);
  wristCuff.castShadow = true;
  wristCuff.receiveShadow = true;
  distalWristMount.add(wristCuff);

  const cuffRimGeo = geoCache.get('Forearm_CuffRimGeo', () => {
    const g = new THREE.TorusGeometry(0.0246, 0.00085, 6, 28);
    g.rotateX(Math.PI / 2);
    return g;
  });
  const cuffRim = new THREE.Mesh(cuffRimGeo, materials.metallic);
  cuffRim.position.set(0, 0.009, 0);
  distalWristMount.add(cuffRim);

  // Forearm -> Wrist Tapered Transition Collar (Interlocks with dedicated wrist housing)
  const collarGeo = geoCache.get('Forearm_CollarGeo', () => new THREE.CylinderGeometry(0.0242, 0.0248, 0.008, 28));
  const transitionCollar = new THREE.Mesh(collarGeo, materials.joint);
  transitionCollar.name = 'ForearmWristTransitionCollar';
  transitionCollar.position.set(0, -0.167, 0);
  transitionCollar.castShadow = true;
  forearmGroup.add(transitionCollar);

  const collarRingGeo = geoCache.get('Forearm_CollarRingGeo', () => {
    const g = new THREE.TorusGeometry(0.0246, 0.00085, 6, 28);
    g.rotateX(Math.PI / 2);
    return g;
  });
  const collarRing = new THREE.Mesh(collarRingGeo, materials.metallic);
  collarRing.position.set(0, -0.167, 0);
  forearmGroup.add(collarRing);

  // ==========================================================================
  // SECTION 2: SCULPTED WHITE CERAMIC COHERENT GAUNTLET (SECTIONS 10, 11, 12)
  // Single coherent armored volume: primary outer shell + secondary inner shell
  // ==========================================================================
  const armorGroup = new THREE.Group();
  armorGroup.name = side === -1 ? 'LeftForearmArmorGroup' : 'RightForearmArmorGroup';
  forearmGroup.add(armorGroup);

  // 1. Primary Outer Shell (Anterior face + lateral gauntlet + Lower Elbow Guard)
  const outerGeo = createForearmCoherentArmor('primaryOuter', side);
  const anteriorArmor = new THREE.Mesh(outerGeo, materials.armorDoubleSide);
  anteriorArmor.name = 'ForearmPrimaryOuterArmorShell';
  anteriorArmor.castShadow = true;
  anteriorArmor.receiveShadow = true;
  armorGroup.add(anteriorArmor);

  // 2. Secondary Inner Shell (Medial + Posterior flexor volume)
  const innerGeo = createForearmCoherentArmor('secondaryInner', side);
  const posteriorArmor = new THREE.Mesh(innerGeo, materials.armorDoubleSide);
  posteriorArmor.name = 'ForearmSecondaryInnerArmorShell';
  posteriorArmor.castShadow = true;
  posteriorArmor.receiveShadow = true;
  armorGroup.add(posteriorArmor);

  const sideArmor = anteriorArmor;
  const innerArmor = posteriorArmor;

  // Proximal compression gasket seal ring mating flush to elbow lower collar
  const proxGasketGeo = geoCache.get('Forearm_ProxGasketGeo', () => {
    const g = new THREE.TorusGeometry(0.0342, 0.00095, 6, 32);
    g.rotateX(Math.PI / 2);
    return g;
  });
  const proxGasket = new THREE.Mesh(proxGasketGeo, materials.joint);
  proxGasket.name = 'ForearmProximalElbowGasket';
  proxGasket.position.set(0, -0.006, 0);
  armorGroup.add(proxGasket);

  // ==========================================================================
  // SECTION 3: INTEGRATED TECHNICAL PANEL & PURPLE EMISSIVE DETAIL (SECTION 16)
  // WHITE ARMOR → DARK RECESS → PURPLE EMISSIVE ELEMENT → THIN BEZEL
  // Perfectly sunken flush into the sculpted armor facet with ZERO clipping
  // ==========================================================================
  const techBayGroup = new THREE.Group();
  techBayGroup.name = 'ForearmStandardizedTechBay';
  // Positioned flush along the true anterior mechanical centerline at x = 0, y = -0.089m, z = 0.0286m
  // With positive pitch rotation (+0.0680 rad / ~3.89°) matching the natural forearm taper slope
  const bayX = 0;
  const bayZ = 0.0286;
  const bayY = -0.089;
  techBayGroup.position.set(bayX, bayY, bayZ);
  techBayGroup.rotation.x = 0.0680;
  armorGroup.add(techBayGroup);

  // 1. Dark Titanium Recessed Tray / Cavity Housing
  const bayHousingGeo = geoCache.get('Forearm_BayHousingGeo', () => new THREE.BoxGeometry(0.0088, 0.038, 0.0020));
  const bayHousing = new THREE.Mesh(bayHousingGeo, materials.joint);
  bayHousing.position.set(0, 0, -0.0006);
  bayHousing.castShadow = true;
  techBayGroup.add(bayHousing);

  // 2. Precision Machined Metallic Thin Bezel Rim
  const bezelFrameGeo = geoCache.get('Forearm_BezelFrameGeo', () => new THREE.BoxGeometry(0.0096, 0.039, 0.0007));
  const bezelFrame = new THREE.Mesh(bezelFrameGeo, materials.metallic);
  bezelFrame.position.set(0, 0, 0.0003);
  techBayGroup.add(bezelFrame);

  // 3. Centered Flush Purple Emissive Accent Strip
  const purpleRodGeo = geoCache.get('Forearm_PurpleRodGeo', () => new THREE.CapsuleGeometry(0.0014, 0.024, 8, 16));
  const ledStrip = new THREE.Mesh(purpleRodGeo, materials.purpleEmissive);
  ledStrip.name = 'ForearmPurpleLEDAccent';
  ledStrip.position.set(0, 0, 0.0004);
  techBayGroup.add(ledStrip);
  ledMeshes.push(ledStrip);

  // Controlled High-Intensity Bloom Glow (Calibrated radius to stay inside bezel)
  const purpleBloomGeo = geoCache.get('Forearm_PurpleBloomGeo', () => new THREE.CapsuleGeometry(0.0022, 0.024, 8, 16));
  const purpleBloomMesh = new THREE.Mesh(purpleBloomGeo, materials.purpleBloom);
  purpleBloomMesh.position.copy(ledStrip.position);
  techBayGroup.add(purpleBloomMesh);

  // 4. Micro Heat-Dissipation Louvers (Symmetric top and bottom technical vents)
  const ventilationChannel = new THREE.Group();
  ventilationChannel.name = 'ForearmVentilationChannel';
  ventilationChannel.position.set(0, 0, 0);
  techBayGroup.add(ventilationChannel);

  const slatGeo = geoCache.get('Forearm_SlatGeo', () => new THREE.BoxGeometry(0.0055, 0.0008, 0.0010));
  for (const lY of [-0.016, 0.016]) {
    const slat = new THREE.Mesh(slatGeo, materials.joint);
    slat.position.set(0, lY, 0.0002);
    ventilationChannel.add(slat);
  }

  // 4b. Stepped Micro-Louvers Bilaterally Symmetrical flanking the purple strip (Matching 5-step ladder in UpperArm)
  const louverLadderCount = 5;
  const louverGeo = geoCache.get('Forearm_LouverGeo', () => new THREE.BoxGeometry(0.0012, 0.0016, 0.0010));
  for (let i = 0; i < louverLadderCount; i++) {
    const lY = -0.010 + i * 0.0050;
    for (const flSide of [-1, 1]) {
      const louverMesh = new THREE.Mesh(louverGeo, materials.joint);
      louverMesh.position.set(flSide * 0.0030, lY, 0.0003);
      techBayGroup.add(louverMesh);
    }
  }

  // Helper function to evaluate exact anterior gauntlet armor surface Z at Y
  function evalForearmZ(y: number): number {
    const yTop = -0.006;
    const totalLength = 0.160;
    const v = (yTop - y) / totalLength;
    let radius = 0.0344 - 0.0096 * v + 0.0015 * Math.sin(Math.pow(v, 0.70) * Math.PI);
    if (v < 0.10) {
      const tTop = (0.10 - v) / 0.10;
      radius -= tTop * 0.0006;
    } else if (v > 0.85) {
      const tBot = (v - 0.85) / 0.15;
      radius -= tBot * 0.0008;
    }
    let rz = radius * 0.97;
    rz -= (1.0 - 0.35) * 0.0020;
    if (v < 0.22) {
      const tElbow = (0.22 - v) / 0.22;
      rz += 0.0008 * tElbow;
    }
    return rz;
  }

  // Helper to build a surface-conforming watertight seam inlay for forearm
  function createConformingForearmSeamGeo(yStart: number, yEnd: number, segs = 10): THREE.BufferGeometry {
    const halfW = 0.0008; // 1.6mm seam width
    const depth = 0.0018; // 1.8mm depth into the armor
    const pos: number[] = [];
    const idx: number[] = [];

    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const y = yStart + t * (yEnd - yStart);
      const zSurface = evalForearmZ(y);
      const zFront = zSurface - 0.0004; // Sits 0.4mm inside the 1.4mm recess for clean visual definition
      const zBack = zFront - depth;

      pos.push(-halfW, y, zFront);
      pos.push(halfW, y, zFront);
      pos.push(-halfW, y, zBack);
      pos.push(halfW, y, zBack);
    }

    for (let i = 0; i < segs; i++) {
      const a = i * 4;
      const b = (i + 1) * 4;
      // Front face
      idx.push(a, b, a + 1);
      idx.push(b, b + 1, a + 1);
      // Left side
      idx.push(a + 2, b + 2, a);
      idx.push(b + 2, b, a);
      // Right side
      idx.push(a + 1, b + 1, a + 3);
      idx.push(b + 1, b + 3, a + 3);
    }
    // Top end cap
    idx.push(0, 1, 2);
    idx.push(1, 3, 2);
    // Bottom end cap
    const last = segs * 4;
    idx.push(last, last + 2, last + 1);
    idx.push(last + 1, last + 2, last + 3);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }

  // 5. Engineered Anterior Center Vertical Seam Segments (Matching UpperArm design language)
  // Upper segment: bridges from proximal collar down to the top of tech bay bezel
  // Conforms 100% to 3D gauntlet taper curvature, terminating cleanly with 1.5mm elbow gasket margin and 1.0mm bezel margin
  const antSeamUpperGeo = geoCache.get('Forearm_AntSeamUpperGeo', () => createConformingForearmSeamGeo(-0.0075, -0.0705, 10));
  const antSeamUpper = new THREE.Mesh(antSeamUpperGeo, materials.joint);
  antSeamUpper.name = 'ForearmAnteriorCenterSeamUpper';
  antSeamUpper.castShadow = true;
  armorGroup.add(antSeamUpper);

  // Lower segment: bridges from bottom of tech bay bezel down to distal wrist collar
  // Conforms 100% to 3D gauntlet taper curvature, terminating cleanly with 1.0mm bezel margin and 2.5mm wrist collar margin
  const antSeamLowerGeo = geoCache.get('Forearm_AntSeamLowerGeo', () => createConformingForearmSeamGeo(-0.1095, -0.1635, 10));
  const antSeamLower = new THREE.Mesh(antSeamLowerGeo, materials.joint);
  antSeamLower.name = 'ForearmAnteriorCenterSeamLower';
  antSeamLower.castShadow = true;
  armorGroup.add(antSeamLower);

  // 6. Engineered Parting Seam between inner and outer shells (Safely inside at radius 22mm)
  const medSeamGeo = geoCache.get('Forearm_MedSeamGeo', () => new THREE.BoxGeometry(0.0018, 0.160, 0.0025));
  const panelSeam = new THREE.Mesh(medSeamGeo, materials.joint);
  panelSeam.name = 'ForearmPartingSeam';
  panelSeam.position.set(-side * 0.022, -0.089, 0);
  armorGroup.add(panelSeam);

  // 7. High-Performance Static Mesh Batching (Zero visual regression, massive draw call reduction)
  const mergedArmor = mergeAllGroupMeshesByMaterial(armorGroup, {
    namePrefix: side === -1 ? 'LeftForearmArmor' : 'RightForearmArmor',
  });

  const mergedDistal = mergeAllGroupMeshesByMaterial(distalWristMount, {
    namePrefix: side === -1 ? 'LeftForearmWristMount' : 'RightForearmWristMount',
  });

  const mergedCore = mergeAllGroupMeshesByMaterial(mechanicalCore, {
    excludeNames: [distalWristMount.name],
    namePrefix: side === -1 ? 'LeftForearmCore' : 'RightForearmCore',
  });

  const mergedLed = mergedArmor.find((m) => m.material === materials.purpleEmissive);
  if (mergedLed) {
    ledMeshes.length = 0;
    ledMeshes.push(mergedLed);
  }

  // Compatibility aliases
  const primaryArmorMesh = mergedArmor[0] || anteriorArmor;
  const primaryCoreMesh = mergedCore[0] || armatureSpine;
  const primaryWristCuff = mergedDistal[0] || wristCuff;

  return {
    group: forearmGroup,
    mechanicalCore,
    armatureSpine: primaryCoreMesh,
    armorGroup,
    anteriorArmor: primaryArmorMesh,
    posteriorArmor: primaryArmorMesh,
    sideArmor: primaryArmorMesh,
    innerArmor: primaryArmorMesh,
    ventilationChannel,
    ledStrip: mergedLed || ledStrip,
    ledMeshes,
    distalWristMount,
    wristCuff: primaryWristCuff,
    // Aliases
    elbowSocketCollar: primaryCoreMesh,
    brachioradialis: primaryArmorMesh,
    panelSeam: primaryArmorMesh,
  };
}

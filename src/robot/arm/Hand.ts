import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { createFinger, createThumb, FingerNodes, ThumbNodes, FingerSpec } from './Finger';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger';
import { geoCache } from '../utils/GeometryCache';

// ─────────────────────────────────────────────────────────────────────────────
// HAND MODULE — Ultra-Realistic Humanoid Robotic Hand & Metacarpal Architecture
// Precision CAD-engineered from authoritative Reference Images 1 & 2:
//
// Refinements:
//   - Preserves 100% existing athletic mecha scale, finger lengths, and silhouette
//   - Seamless Squircle Carpal Interface Collar bridging flush into Wrist Module
//   - Integrated Titanium Structural Core & Metacarpal Knuckle Clevis Bed
//     (Completely eliminating open voids and floating knuckle cylinders)
//   - Sculpted Ceramic White Dorsal Armor Shell with precision anatomical
//     scalloped knuckle hoods cradling each finger's MCP joint with flush Z-seating
//   - Continuous lateral perimeter flank wrap enclosing the chassis (zero paper-thin sheets)
//   - Precision dual-shear MCP knuckle assemblies with chamfered bearing caps
//   - Opposable articulated robotic thumb with clean rotary actuator visibility
//   - Flush palmar friction grip pads with ergonomic thenar/hypothenar contours
// ─────────────────────────────────────────────────────────────────────────────

export interface HandNodes {
  group: THREE.Group;
  palmChassis: THREE.Mesh;
  dorsalArmor: THREE.Mesh;
  carpalCuff: THREE.Mesh;
  thumb: ThumbNodes;
  indexFinger: FingerNodes;
  middleFinger: FingerNodes;
  ringFinger: FingerNodes;
  pinkyFinger: FingerNodes;
  littleFinger: FingerNodes;
  knuckles: THREE.Mesh[];
  knuckleCaps: THREE.Mesh[];
  palmarPads: THREE.Mesh[];
  ledMeshes: THREE.Mesh[];
}

// ─────────────────────────────────────────────────────────────────────────────
// FINGER SPECIFICATIONS BUILDER — Precision Proportioned Humanoid Mecha Scale
// Calibrated with bilateral radial symmetry: radial (+X for left hand, -X for right)
// ─────────────────────────────────────────────────────────────────────────────
function getFingerSpecs(side: -1 | 1): FingerSpec[] {
  // Radial sign: for side=1 (right hand), radial/thumb is at -X, so radial = -1.
  // For side=-1 (left hand), radial/thumb is at +X, so radial = +1.
  const radial = -side;

  return [
    {
      name: 'Index',
      spreadX: radial * 0.0205,
      offsetY: -0.0470,
      offsetZ:  0.0024,
      proximalLength: 0.0310,
      middleLength:   0.0210,
      distalLength:   0.0150,
      proximalRadius: 0.0060,
      middleRadius:   0.0052,
      distalRadius:   0.0044,
    },
    {
      name: 'Middle',
      spreadX: radial * 0.0068,
      offsetY: -0.0495,
      offsetZ:  0.0035,
      proximalLength: 0.0350,
      middleLength:   0.0235,
      distalLength:   0.0165,
      proximalRadius: 0.0063,
      middleRadius:   0.0055,
      distalRadius:   0.0047,
    },
    {
      name: 'Ring',
      spreadX: -radial * 0.0075,
      offsetY: -0.0480,
      offsetZ:  0.0026,
      proximalLength: 0.0330,
      middleLength:   0.0220,
      distalLength:   0.0155,
      proximalRadius: 0.0060,
      middleRadius:   0.0052,
      distalRadius:   0.0044,
    },
    {
      name: 'Little',
      spreadX: -radial * 0.0210,
      offsetY: -0.0440,
      offsetZ:  0.0014,
      proximalLength: 0.0245,
      middleLength:   0.0160,
      distalLength:   0.0115,
      proximalRadius: 0.0051,
      middleRadius:   0.0044,
      distalRadius:   0.0037,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// SQUIRCLE GEOMETRY HELPER FOR CARPAL TRANSITION COLLAR
// Matches the wrist gauntlet cross-section perfectly
// ─────────────────────────────────────────────────────────────────────────────
function createCarpalSquircleGeo(width: number, depth: number, height: number): THREE.BufferGeometry {
  const key = `CarpalSquircle_${width.toFixed(5)}_${depth.toFixed(5)}_${height.toFixed(5)}`;
  return geoCache.get(key, () => {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const radialSegments = 32;
    const a = width * 0.5;
    const b = depth * 0.5;
    const power = 3.2;

    for (let j = 0; j <= 1; j++) {
      const y = -j * height;
      const v = j;
      for (let i = 0; i <= radialSegments; i++) {
        const u = i / radialSegments;
        const theta = u * Math.PI * 2;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        const sX = Math.sign(cosT) * Math.pow(Math.abs(cosT), 2 / power);
        const sZ = Math.sign(sinT) * Math.pow(Math.abs(sinT), 2 / power);

        positions.push(a * sX, y, b * sZ);
        uvs.push(u, v);
      }
    }

    for (let i = 0; i < radialSegments; i++) {
      const p1 = i;
      const p2 = i + 1;
      const p3 = (radialSegments + 1) + i;
      const p4 = p3 + 1;
      indices.push(p1, p3, p2, p2, p3, p4);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SCULPTED DORSAL METACARPAL ARMOR SHELL
// Aerodynamic ceramic shield with anatomical transverse arch, 4 protective
// knuckle hoods, and wrapped lateral perimeter walls (eliminating paper-thin look).
// ─────────────────────────────────────────────────────────────────────────────
function getKnuckleMargin(x: number, side: -1 | 1): number {
  const radial = -side;
  const fingers = [
    { name: 'Index',  spreadX: radial * 0.0205,  yTarget: -0.0445 },
    { name: 'Middle', spreadX: radial * 0.0068,  yTarget: -0.0470 },
    { name: 'Ring',   spreadX: -radial * 0.0075, yTarget: -0.0455 },
    { name: 'Little', spreadX: -radial * 0.0210, yTarget: -0.0415 },
  ];

  // Base continuous curvature across the metacarpal arch
  const ulnarT = THREE.MathUtils.clamp((x * (-radial) + 0.0285) / 0.0570, 0, 1);
  const baseLine = THREE.MathUtils.lerp(-0.0410, -0.0385, ulnarT);

  // Blend in the 4 knuckle hood scallops
  let hoodDelta = 0;
  for (const f of fingers) {
    const d = Math.abs(x - f.spreadX);
    const w = 0.0070;
    const factor = Math.exp(-Math.pow(d / w, 2));
    const delta = f.yTarget - baseLine;
    hoodDelta += delta * factor;
  }

  return baseLine + hoodDelta;
}

function createDorsalPlate(side: -1 | 1, materials: RobotMaterialPalette): THREE.Mesh {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const numY = 28; // longitudinal rings from carpal collar to knuckles
  const numX = 26; // transverse contour points per row

  // 1. DORSAL SURFACE GRID
  for (let iy = 0; iy < numY; iy++) {
    const v = iy / (numY - 1);

    // Dynamic width taper: starts at 49.6mm at carpal collar, smoothly flares to 57.0mm at knuckles
    const baseHw = THREE.MathUtils.lerp(0.0248, 0.0285, Math.pow(v, 0.85));

    for (let ix = 0; ix < numX; ix++) {
      const u = ix / (numX - 1);
      // Normalized span across width [-1, 1]
      const nx = (u - 0.5) * 2.0;

      // Inverted radial coordinate: +1 is ALWAYS the radial (thumb/index) flank, -1 is ulnar (pinky) flank
      const r = -side * nx;

      // Smooth G2 thenar socket clearance on radial flank (v in [0.08, 0.46])
      let socketNotch = 0;
      if (r > 0.45 && v > 0.08 && v < 0.46) {
        const socketPhase = (v - 0.08) / (0.46 - 0.08);
        socketNotch = -Math.sin(socketPhase * Math.PI) * 0.0026;
      }

      const hw = baseHw + (r > 0 ? socketNotch : 0);
      const x = nx * hw;

      // True anatomical distal knuckle margin (calibrated to finger MCP heights)
      const knuckleY = getKnuckleMargin(x, side);

      // Continuous interpolation from carpal collar (+0.0006m) to knuckle margin
      const yStart = 0.0006;
      const y = yStart + v * (knuckleY - yStart);

      // Subtle Metacarpal Ray Crests (gentle organic ridges leading to each finger)
      const ray1 = Math.exp(-Math.pow((r - 0.75) / 0.20, 2)) * 0.0006; // Index ray
      const ray2 = Math.exp(-Math.pow((r - 0.22) / 0.20, 2)) * 0.0008; // Middle ray
      const ray3 = Math.exp(-Math.pow((r - (-0.26)) / 0.20, 2)) * 0.0007; // Ring ray
      const ray4 = Math.exp(-Math.pow((r - (-0.78)) / 0.20, 2)) * 0.0005; // Little ray
      const metacarpalRays = (ray1 + ray2 + ray3 + ray4) * Math.sin(v * Math.PI * 0.85);

      // Aerodynamic compound-camber dorsal arch
      const crownArch = Math.cos(nx * Math.PI * 0.44) * 0.0048;

      // Flank curvature curling down on edges to wrap smoothly around internal core
      const flankDrop = Math.pow(Math.abs(nx), 2.2) * 0.0080;

      // Z depth profile: smoothly slopes from carpal collar (14.2mm) down to knuckle surface (8.4mm)
      // so the dorsal armor sits flush directly over the knuckle barrels and matches wrist cuff
      const baseZ = THREE.MathUtils.lerp(0.0142, 0.0084, Math.pow(v, 0.92));
      const z = baseZ + crownArch * (0.65 + 0.35 * (1 - v)) + metacarpalRays - flankDrop;

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  // Quads for dorsal grid
  const stride = numX;
  for (let iy = 0; iy < numY - 1; iy++) {
    for (let ix = 0; ix < numX - 1; ix++) {
      const a = iy * stride + ix;
      const b = (iy + 1) * stride + ix;
      const c = (iy + 1) * stride + (ix + 1);
      const d = iy * stride + (ix + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  // 2. SKIRT WALL ON RADIAL/LEFT FLANK (ix = 0)
  for (let iy = 0; iy < numY; iy++) {
    const topIdx = iy * stride + 0;
    const x = positions[topIdx * 3];
    const y = positions[topIdx * 3 + 1];
    positions.push(x * 0.96, y, -0.0060);
    uvs.push(0, iy / (numY - 1));
  }
  const leftSkirtStart = numY * numX;
  for (let iy = 0; iy < numY - 1; iy++) {
    const topA = iy * stride + 0;
    const topB = (iy + 1) * stride + 0;
    const botA = leftSkirtStart + iy;
    const botB = leftSkirtStart + (iy + 1);
    indices.push(topA, botA, topB, topB, botA, botB);
  }

  // 3. SKIRT WALL ON ULNAR/RIGHT FLANK (ix = numX - 1)
  for (let iy = 0; iy < numY; iy++) {
    const topIdx = iy * stride + (numX - 1);
    const x = positions[topIdx * 3];
    const y = positions[topIdx * 3 + 1];
    positions.push(x * 0.96, y, -0.0060);
    uvs.push(1, iy / (numY - 1));
  }
  const rightSkirtStart = leftSkirtStart + numY;
  for (let iy = 0; iy < numY - 1; iy++) {
    const topA = iy * stride + (numX - 1);
    const topB = (iy + 1) * stride + (numX - 1);
    const botA = rightSkirtStart + iy;
    const botB = rightSkirtStart + (iy + 1);
    indices.push(topA, topB, botA, topB, botB, botA);
  }

  // 4. CARPAL TOP RIM WALL (iy = 0)
  const topWallStart = positions.length / 3;
  for (let ix = 0; ix < numX; ix++) {
    const topIdx = ix;
    const x = positions[topIdx * 3];
    const y = positions[topIdx * 3 + 1];
    positions.push(x * 0.96, y, -0.0024);
    uvs.push(ix / (numX - 1), 0);
  }
  for (let ix = 0; ix < numX - 1; ix++) {
    const topA = ix;
    const topB = ix + 1;
    const botA = topWallStart + ix;
    const botB = topWallStart + (ix + 1);
    indices.push(topA, topB, botA, topB, botB, botA);
  }

  // 5. DISTAL KNUCKLE HOOD CHAMFER LIP (iy = numY - 1)
  const botLipStart = positions.length / 3;
  const lastRow = (numY - 1) * stride;
  for (let ix = 0; ix < numX; ix++) {
    const topIdx = lastRow + ix;
    const x = positions[topIdx * 3];
    const y = positions[topIdx * 3 + 1];
    const z = positions[topIdx * 3 + 2];
    positions.push(x, y - 0.0006, z - 0.0024);
    uvs.push(ix / (numX - 1), 1);
  }
  for (let ix = 0; ix < numX - 1; ix++) {
    const topA = lastRow + ix;
    const topB = lastRow + (ix + 1);
    const botA = botLipStart + ix;
    const botB = botLipStart + (ix + 1);
    indices.push(topA, botA, topB, topB, botA, botB);
  }

  const geo = geoCache.get(`HandDorsalPlateGeo_${side}`, () => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  });

  const mesh = new THREE.Mesh(geo, materials.armor);
  mesh.name = 'HandDorsalArmor';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HAND FACTORY
// ─────────────────────────────────────────────────────────────────────────────
export function createHand(
  side: -1 | 1,
  materials: RobotMaterialPalette
): HandNodes {
  const handGroup = new THREE.Group();
  handGroup.name = side === -1 ? 'LeftHandRoot' : 'RightHandRoot';

  const ledMeshes: THREE.Mesh[] = [];
  let knuckles: THREE.Mesh[] = [];
  let knuckleCaps: THREE.Mesh[] = [];
  let palmarPads: THREE.Mesh[] = [];

  const staticPalmGroup = new THREE.Group();
  staticPalmGroup.name = 'StaticPalmAssembly';

  // ════════════════════════════════════════════════════════════
  // 1. CARPAL INTERFACE DOCKING COLLAR
  //    Seamless squircle collar matching wrist gauntlet profile (42.8mm x 32.8mm)
  // ════════════════════════════════════════════════════════════
  const cuffW = 0.0496;
  const cuffD = 0.0388;

  // Polished chrome docking interface ring
  const cuffRimGeo = createCarpalSquircleGeo(cuffW, cuffD, 0.0014);
  const cuffRim = new THREE.Mesh(cuffRimGeo, materials.metallic);
  cuffRim.position.set(0, 0.0000, 0);
  staticPalmGroup.add(cuffRim);

  // Dark titanium interior seal collar
  const cuffGeo = createCarpalSquircleGeo(cuffW * 0.96, cuffD * 0.96, 0.0022);
  let carpalCuff: THREE.Mesh = new THREE.Mesh(cuffGeo, materials.joint);
  carpalCuff.name = 'HandCarpalCuff';
  carpalCuff.position.set(0, -0.0008, 0);
  carpalCuff.castShadow = true;
  staticPalmGroup.add(carpalCuff);

  // ════════════════════════════════════════════════════════════
  // 2. INTERNAL TITANIUM CHASSIS CORE & METACARPAL KNUCKLE BED
  //    Strictly enclosed inside white armor shell (zero flank clipping)
  // ════════════════════════════════════════════════════════════
  // Contoured internal chassis filling palm volume seamlessly
  const palmGeo = geoCache.getBox(0.0410, 0.0370, 0.0125);
  let palmChassis: THREE.Mesh = new THREE.Mesh(palmGeo, materials.joint);
  palmChassis.name = 'PalmChassis';
  palmChassis.position.set(0, -0.0240, -0.0035);
  palmChassis.castShadow = true;
  palmChassis.receiveShadow = true;
  staticPalmGroup.add(palmChassis);

  // Transverse Metacarpal Knuckle Anchor Bar (flush within palm contour)
  const knuckleBarGeo = geoCache.getBox(0.0510, 0.0040, 0.0055);
  const knuckleBar = new THREE.Mesh(knuckleBarGeo, materials.joint);
  knuckleBar.name = 'MetacarpalKnuckleBed';
  knuckleBar.position.set(0, -0.0455, 0.0005);
  knuckleBar.castShadow = true;
  knuckleBar.receiveShadow = true;
  staticPalmGroup.add(knuckleBar);

  // CNC Weight-reduction pockets along palmar face of chassis
  const pockGeo = geoCache.getBox(0.0080, 0.0100, 0.0024);
  for (let p = 0; p < 3; p++) {
    const pock = new THREE.Mesh(pockGeo, materials.joint);
    pock.position.set((p - 1) * 0.0105, -0.0240, -0.0095);
    staticPalmGroup.add(pock);
  }

  // ── Palmar Tactile Friction Grip Pads (Thenar + Hypothenar) ────────────────
  const rThumb = -side;
  const rPinky = side;
  const padData = [
    { x: rThumb * 0.0125, y: -0.0225, h: 0.0200, w: 0.0150 }, // Thenar pad
    { x: rPinky * 0.0125, y: -0.0250, h: 0.0190, w: 0.0145 }, // Hypothenar pad
    { x: 0,               y: -0.0415, h: 0.0065, w: 0.0400 }, // Transverse MCP palm pad
  ];
  for (const pd of padData) {
    const padGeo = geoCache.getBox(pd.w, pd.h, 0.0020);
    const pad = new THREE.Mesh(padGeo, materials.joint);
    pad.position.set(pd.x, pd.y, -0.0095);
    pad.castShadow = true;
    staticPalmGroup.add(pad);
    palmarPads.push(pad);

    // Polished metallic perimeter trim for pad
    const padTrimGeo = geoCache.getBox(pd.w + 0.0006, pd.h + 0.0006, 0.0004);
    const padTrim = new THREE.Mesh(padTrimGeo, materials.metallic);
    padTrim.position.set(pd.x, pd.y, -0.0087);
    staticPalmGroup.add(padTrim);
  }

  // ════════════════════════════════════════════════════════════
  // 3. SCULPTED WHITE CERAMIC DORSAL METACARPAL SHELL
  // ════════════════════════════════════════════════════════════
  const dorsalArmor = createDorsalPlate(side, materials);
  handGroup.add(dorsalArmor);

  // Precision micro-fasteners on dorsal plate (4 hex screws + chrome washers)
  const fastenerCoords = [
    { x: -side * 0.0150, y: -0.0075, z: 0.0138 },
    { x:  side * 0.0150, y: -0.0075, z: 0.0138 },
    { x: -side * 0.0185, y: -0.0355, z: 0.0088 },
    { x:  side * 0.0185, y: -0.0355, z: 0.0088 },
  ];
  const screwGeo = geoCache.get('HandScrewGeo', () => {
    const g = new THREE.CylinderGeometry(0.0008, 0.0008, 0.0014, 6);
    g.rotateX(Math.PI / 2);
    return g;
  });
  const washerGeo = geoCache.get('HandWasherGeo', () => {
    const g = new THREE.TorusGeometry(0.0012, 0.00028, 6, 12);
    g.rotateX(Math.PI / 2);
    return g;
  });
  for (const f of fastenerCoords) {
    const screw = new THREE.Mesh(screwGeo, materials.joint);
    screw.position.set(f.x, f.y, f.z);
    staticPalmGroup.add(screw);

    const washer = new THREE.Mesh(washerGeo, materials.metallic);
    washer.position.copy(screw.position);
    staticPalmGroup.add(washer);
  }

  // Signature Cybernetic Purple Telemetry Status Capsule on upper dorsum (Longitudinal Slit matching Reference Image 1)
  const ledX = -side * 0.0046;
  const ledY = -0.0120;
  const ledZ = 0.0162;

  const ledBezelGeo = geoCache.getBox(0.0022, 0.0080, 0.0012);
  const ledBezel = new THREE.Mesh(ledBezelGeo, materials.metallic);
  ledBezel.position.set(ledX, ledY, ledZ);
  staticPalmGroup.add(ledBezel);

  const ledGeo = geoCache.getBox(0.0012, 0.0068, 0.0014);
  const ledMesh = new THREE.Mesh(ledGeo, materials.purpleEmissive);
  ledMesh.name = 'HandTelemetryLED';
  ledMesh.position.set(ledX, ledY, ledZ + 0.0003);
  handGroup.add(ledMesh);
  ledMeshes.push(ledMesh);

  // Subtle bloom aura for telemetry LED
  const bloomGeo = geoCache.getBox(0.0018, 0.0078, 0.0018);
  const bloomMesh = new THREE.Mesh(bloomGeo, materials.purpleBloom);
  bloomMesh.name = 'HandTelemetryBloom';
  bloomMesh.position.copy(ledMesh.position);
  handGroup.add(bloomMesh);

  // Micro sensor dot / fastener adjacent to telemetry capsule (as seen in Reference Image 1)
  const dotX = -side * 0.0090;
  const dotY = -0.0125;
  const dotGeo = geoCache.get('HandDotGeo', () => {
    const g = new THREE.CylinderGeometry(0.0007, 0.0007, 0.0012, 12);
    g.rotateX(Math.PI / 2);
    return g;
  });
  const dotMesh = new THREE.Mesh(dotGeo, materials.joint);
  dotMesh.position.set(dotX, dotY, ledZ + 0.0001);
  staticPalmGroup.add(dotMesh);

  const dotPinGeo = geoCache.get('HandDotPinGeo', () => {
    const g = new THREE.CylinderGeometry(0.00035, 0.00035, 0.0014, 8);
    g.rotateX(Math.PI / 2);
    return g;
  });
  const dotPin = new THREE.Mesh(dotPinGeo, materials.metallic);
  dotPin.position.copy(dotMesh.position);
  staticPalmGroup.add(dotPin);

  // ════════════════════════════════════════════════════════════
  // 4. METACARPOPHALANGEAL (MCP) KNUCKLE ASSEMBLIES
  //    Integrated dark titanium joint barrels nested beneath dorsal hoods
  // ════════════════════════════════════════════════════════════
  const fingerSpecs = getFingerSpecs(side);

  for (const spec of fingerSpecs) {
    const kRadius = spec.proximalRadius * 0.72;
    const kWidth = spec.proximalRadius * 1.78;

    // Transverse knuckle barrel
    const kGeo = geoCache.get(
      `HandKnuckle_${kRadius.toFixed(5)}_${kWidth.toFixed(5)}`,
      () => {
        const g = new THREE.CylinderGeometry(kRadius, kRadius, kWidth, 20);
        g.rotateZ(Math.PI / 2);
        return g;
      }
    );
    const knuckle = new THREE.Mesh(kGeo, materials.joint);
    knuckle.position.set(spec.spreadX, spec.offsetY, spec.offsetZ);
    knuckle.castShadow = true;
    staticPalmGroup.add(knuckle);
    knuckles.push(knuckle);

    // Precision flush metallic pivot caps with micro hex detail
    const capRadius = spec.proximalRadius * 0.72;
    const capX = kWidth * 0.50 + 0.0003;
    const capGeo = geoCache.get(
      `HandKnuckleCap_${capRadius.toFixed(5)}`,
      () => {
        const g = new THREE.CylinderGeometry(capRadius, capRadius * 0.94, 0.0008, 18);
        g.rotateZ(Math.PI / 2);
        return g;
      }
    );
    const capHubGeo = geoCache.get(
      `HandKnuckleHub_${capRadius.toFixed(5)}`,
      () => {
        const g = new THREE.CylinderGeometry(capRadius * 0.46, capRadius * 0.46, 0.0010, 12);
        g.rotateZ(Math.PI / 2);
        return g;
      }
    );

    for (const cSide of [-1, 1]) {
      const cap = new THREE.Mesh(capGeo, materials.metallic);
      cap.position.set(
        spec.spreadX + cSide * capX,
        spec.offsetY,
        spec.offsetZ
      );
      staticPalmGroup.add(cap);
      knuckleCaps.push(cap);

      // Inner micro hub pin
      const capHub = new THREE.Mesh(capHubGeo, materials.joint);
      capHub.position.copy(cap.position);
      staticPalmGroup.add(capHub);
    }
  }

  // Merge static palm components by material for optimal batching
  const mergedJoint = mergeGroupMeshesByMaterial(staticPalmGroup, materials.joint, 'HandPalmJoint_Merged', true, true);
  const mergedMetallic = mergeGroupMeshesByMaterial(staticPalmGroup, materials.metallic, 'HandPalmMetallic_Merged', true);
  handGroup.add(staticPalmGroup);

  if (mergedJoint) {
    palmChassis = mergedJoint;
    carpalCuff = mergedJoint;
    knuckles = [mergedJoint];
    palmarPads = [mergedJoint];
  }
  if (mergedMetallic) {
    knuckleCaps = [mergedMetallic];
  }

  // ════════════════════════════════════════════════════════════
  // 5. ARTICULATED FINGERS (4 × articulated digits)
  // ════════════════════════════════════════════════════════════
  const indexFinger  = createFinger(fingerSpecs[0], side, materials);
  const middleFinger = createFinger(fingerSpecs[1], side, materials);
  const ringFinger   = createFinger(fingerSpecs[2], side, materials);
  const littleFinger = createFinger(fingerSpecs[3], side, materials);

  handGroup.add(indexFinger.group);
  handGroup.add(middleFinger.group);
  handGroup.add(ringFinger.group);
  handGroup.add(littleFinger.group);

  // ════════════════════════════════════════════════════════════
  // 6. OPPOSABLE ARTICULATED ROBOTIC THUMB
  //    High-mounted origin (Y = -0.0140m) with rotary actuator trunnion
  // ════════════════════════════════════════════════════════════
  const thumb = createThumb(side, materials);
  handGroup.add(thumb.group);

  // Store palmar pads & knuckle caps for exploded-view animations
  for (const finger of [indexFinger, middleFinger, ringFinger, littleFinger]) {
    if (finger.distal.padMesh) {
      finger.distal.padMesh.userData.baseZ = finger.distal.padMesh.position.z;
      palmarPads.push(finger.distal.padMesh);
    }
    if (finger.proximal.hingeMesh) {
      finger.proximal.hingeMesh.userData.baseZ = finger.proximal.hingeMesh.position.z;
      knuckleCaps.push(...(finger.proximal.hingeCaps ?? []));
    }
  }

  return {
    group: handGroup,
    palmChassis,
    dorsalArmor,
    carpalCuff,
    thumb,
    indexFinger,
    middleFinger,
    ringFinger,
    pinkyFinger:  littleFinger,
    littleFinger,
    knuckles,
    knuckleCaps,
    palmarPads,
    ledMeshes,
  };
}

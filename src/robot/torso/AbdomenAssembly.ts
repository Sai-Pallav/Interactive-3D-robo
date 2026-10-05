import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { TORSO_CONFIG } from './TorsoConfig';
import { mergeGroupMeshesByMaterial, mergeAllGroupMeshesByMaterial } from '../utils/geometryMerger';
import { geoCache } from '../utils/GeometryCache';

// ─── Public interfaces (strictly preserved for animation controller compatibility) ────

export interface StomachRingNodes {
  group: THREE.Group;
  outerRing: THREE.Mesh;
  innerCore: THREE.Mesh;
  frontPlate?: THREE.Mesh;
  pistons?: THREE.Mesh[];
  accentLed?: THREE.Mesh;
  mechanism?: THREE.Group;
}

export interface StomachAssemblyNodes {
  group: THREE.Group;
  upperConnector: THREE.Group;
  segment01: THREE.Group;
  segment02: THREE.Group;
  segment03: THREE.Group;
  segment04: THREE.Group;
  segment05: THREE.Group;
  rings: StomachRingNodes[];
  lowerAbdomen: THREE.Group;
  lowerConnector: THREE.Group;
  sideMechanismLeft: THREE.Group;
  sideMechanismRight: THREE.Group;
  internalSpine: THREE.Group;
  spineCore: THREE.Mesh;
  vertebraeDiscs: THREE.Mesh[];
  ledMeshes: THREE.Mesh[];
  armorPlates?: THREE.Mesh[];
}

// ─── 5-Segment Articulated Spine Vertebral Positions ────────────────────────
export const VERTEBRA_Y = TORSO_CONFIG.stomach.vertebraY;

// ─── 1. SPINE UPPER MOUNT / LOWER CHEST INTERFACE ───────────────────────────
function createSpineUpperMount(materials: RobotMaterialPalette): {
  group: THREE.Group;
  ledMeshes: THREE.Mesh[];
} {
  const group = new THREE.Group();
  group.name = 'SpineUpperMount';
  const ledMeshes: THREE.Mesh[] = [];

  const tmpJoint = new THREE.Group();
  const tmpMetallic = new THREE.Group();

  // Precision spherical gimbal pivot ball entering the chest gimbal yoke
  const ballGeo = geoCache.get('SpineUpperMount_Ball', () => new THREE.SphereGeometry(0.024, 28, 24));
  const gimbalBall = new THREE.Mesh(ballGeo, materials.metallic);
  gimbalBall.position.set(0, -0.076, 0.008);
  tmpMetallic.add(gimbalBall);

  // Precision cylindrical neck column anchoring into Vertebra 01 core
  const neckGeo = geoCache.get('SpineUpperMount_Neck', () => new THREE.CylinderGeometry(0.024, 0.026, 0.016, 32));
  const neckCollar = new THREE.Mesh(neckGeo, materials.joint);
  neckCollar.position.set(0, -0.074, 0.008);
  tmpJoint.add(neckCollar);

  // Stepped ground metallic retaining race
  const raceGeo = geoCache.get('SpineUpperMount_Race', () => new THREE.CylinderGeometry(0.028, 0.028, 0.004, 32));
  const retainRace = new THREE.Mesh(raceGeo, materials.metallic);
  retainRace.position.set(0, -0.072, 0.008);
  tmpMetallic.add(retainRace);

  const mergedJoint = mergeGroupMeshesByMaterial(tmpJoint, materials.joint, 'SpineUpperMount_Joint_Merged', false)!;
  if (mergedJoint) {
    mergedJoint.castShadow = true;
    mergedJoint.receiveShadow = true;
    group.add(mergedJoint);
  }

  const mergedMetallic = mergeGroupMeshesByMaterial(tmpMetallic, materials.metallic, 'SpineUpperMount_Metallic_Merged', false);
  if (mergedMetallic) {
    group.add(mergedMetallic);
  }

  // Purple optical indicator ring recessed at chest-to-spine interface (Section 15)
  const ledRingGeo = geoCache.get('SpineUpperMount_LedRing', () => new THREE.TorusGeometry(0.0285, 0.0014, 8, 32));
  const ledRing = new THREE.Mesh(ledRingGeo, materials.purpleEmissive);
  ledRing.rotation.x = Math.PI / 2;
  ledRing.position.set(0, -0.072, 0.008);
  group.add(ledRing);
  ledMeshes.push(ledRing);

  return { group, ledMeshes };
}

// ─── 2. ARTICULATED ROBOTIC VERTEBRAL MODULE ────────────────────────────────
/**
 * Precision-machined robotic vertebral module:
 * - Outer beveled white composite armor shell with lateral wrap
 * - Dark titanium inner mechanical bearing housing
 * - Spherical / cylindrical inter-vertebral gimbal knuckle
 * - Interlocking elastomeric damper collar
 * - Structural dark titanium chassis backing block
 * - Transverse process wings with attachment bosses
 * - Integrated crevice purple LED illumination
 */
function createVertebraModule(
  index: number,
  materials: RobotMaterialPalette,
  ledMeshes: THREE.Mesh[]
): {
  group: THREE.Group;
  primaryMesh: THREE.Mesh;
  armorMesh: THREE.Mesh;
} {
  const group = new THREE.Group();
  group.name = `VertebraModule_${String(index + 1).padStart(2, '0')}`;

  const cfg = TORSO_CONFIG.stomach;
  const pCfg = cfg.armorPlates[index];
  const ringCfg = cfg.rings[index];

  const yPos = cfg.vertebraY[index];
  // Subtle designed anatomical robotic curvature: slight inward arch at mid-spine
  const zArch = -0.004 + Math.sin((index / 4) * Math.PI) * 0.004;
  group.position.set(0, yPos, zArch);

  // Gentle forward pitch taper down the spine
  group.rotation.x = (2 - index) * 0.015;

  const w = pCfg.width;
  const h = pCfg.height;
  const d = pCfg.depth;
  const halfW = w * 0.5;
  const halfH = h * 0.5;

  // ---------------------------------------------------------------------------
  // A. Inner Structural Vertebral Core (Dark Titanium) & Chassis Backing
  // ---------------------------------------------------------------------------
  const coreRadius = ringCfg.radiusX * 0.65;
  const coreHeight = ringCfg.height;

  const coreGeo = new THREE.CylinderGeometry(coreRadius, coreRadius * 0.96, coreHeight, 32);
  const coreMesh = new THREE.Mesh(coreGeo, materials.joint);
  coreMesh.name = `VertebraCore_${index + 1}`;
  coreMesh.castShadow = true;
  coreMesh.receiveShadow = true;
  group.add(coreMesh);

  // Bearing Race Ring (Precision ground metallic race)
  const raceGeo = new THREE.CylinderGeometry(coreRadius * 1.04, coreRadius * 1.04, 0.0035, 32);
  const raceMesh = new THREE.Mesh(raceGeo, materials.metallic);
  raceMesh.position.set(0, 0, 0);
  group.add(raceMesh);

  // Inter-Vertebral Interlocking Spherical Pivot Knuckle
  const pivotRadius = coreRadius * 0.55;
  const pivotGeo = new THREE.SphereGeometry(pivotRadius, 20, 16);
  const pivotMesh = new THREE.Mesh(pivotGeo, materials.metallic);
  pivotMesh.position.set(0, coreHeight * 0.5, 0);
  group.add(pivotMesh);

  // Elastomeric Dampening Ring between adjacent vertebrae
  // ENHANCED: Deeper recess creating pronounced horizontal segmentation groove
  if (index < cfg.vertebraCount - 1) {
    const damperGeo = new THREE.CylinderGeometry(coreRadius * 0.88, coreRadius * 0.88, 0.005, 28);
    const damperMesh = new THREE.Mesh(damperGeo, materials.joint);
    damperMesh.position.set(0, -coreHeight * 0.5 - 0.0025, 0);
    group.add(damperMesh);
    
    // ADDITION: Deep horizontal separation groove creating mechanical segmented appearance
    const grooveDepth = 0.008;
    const grooveRadius = coreRadius * 1.15;
    const grooveGeo = new THREE.CylinderGeometry(grooveRadius, grooveRadius, grooveDepth, 32);
    const grooveMesh = new THREE.Mesh(grooveGeo, materials.joint);
    grooveMesh.position.set(0, -coreHeight * 0.5 - grooveDepth * 0.5, 0);
    grooveMesh.castShadow = true;
    grooveMesh.receiveShadow = true;
    group.add(grooveMesh);
  }

  // Structural Chassis Backing Block (Dark Titanium)
  // Firmly anchors the white armor facet to the vertebral core disc, eliminating any floating plate appearance
  const backingW = halfW * 0.82;
  const backingH = h * 0.86;
  const backingD = 0.020;
  const backingGeo = new THREE.BoxGeometry(backingW * 2, backingH, backingD);
  const backingMesh = new THREE.Mesh(backingGeo, materials.joint);
  backingMesh.position.set(0, 0, 0.022);
  backingMesh.castShadow = true;
  group.add(backingMesh);

  // Precision M3 Hex Fastener Screws on chassis flanks
  for (const side of [-1, 1] as const) {
    for (const bY of [-halfH * 0.45, halfH * 0.45]) {
      const boltGeo = new THREE.CylinderGeometry(0.0014, 0.0014, 0.003, 6);
      const bolt = new THREE.Mesh(boltGeo, materials.metallic);
      bolt.rotation.z = Math.PI / 2;
      bolt.position.set(side * (backingW + 0.001), bY, 0.022);
      group.add(bolt);
    }
  }

  // SPECIAL FOR VERTEBRA 01 (Thoracic-to-Abdominal Transition Module - Sections 4, 5, 6, 7):
  // Directly continues the lower chest architecture:
  // - Stepped interlocking upper armor crest entering the chest sub-costal arch
  // - Structural dark titanium chassis backing & lateral thoracic lugs
  // - Recessed purple optical conduit inside the interlocking interface
  if (index === 0) {
    const crestW = halfW * 0.72;
    const crestH = 0.010;
    const crestD = 0.014;
    const crestGeo = new THREE.BoxGeometry(crestW * 2, crestH, crestD);
    const crestMesh = new THREE.Mesh(crestGeo, materials.armor);
    crestMesh.name = 'ThoracicTransitionCrest';
    crestMesh.position.set(0, halfH + crestH * 0.5 - 0.003, pCfg.z - 0.006);
    crestMesh.castShadow = true;
    crestMesh.receiveShadow = true;
    group.add(crestMesh);

    // Stepped dark titanium interlocking receiver frame
    const recPlateGeo = new THREE.BoxGeometry(crestW * 2 + 0.012, crestH + 0.004, 0.016);
    const recPlate = new THREE.Mesh(recPlateGeo, materials.joint);
    recPlate.name = 'ThoracicInterlockingFrame';
    recPlate.position.set(0, halfH + crestH * 0.5, pCfg.z - 0.014);
    group.add(recPlate);

    // Bilateral thoracic transition mounting lugs tying Vertebra 01 into chest load path
    for (const side of [-1, 1] as const) {
      const lugGeo = new THREE.BoxGeometry(0.014, 0.014, 0.018);
      const lug = new THREE.Mesh(lugGeo, materials.joint);
      lug.position.set(side * (halfW * 0.84), halfH * 0.45, 0.016);
      lug.rotation.y = -side * 0.15;
      group.add(lug);

      const pinGeo = new THREE.CylinderGeometry(0.0022, 0.0022, 0.018, 12);
      const pin = new THREE.Mesh(pinGeo, materials.metallic);
      pin.rotation.z = Math.PI / 2;
      pin.position.set(side * (halfW * 0.84), halfH * 0.45, 0.016);
      group.add(pin);
    }

    // Recessed purple optical conduit highlighting the mechanical interface (Section 15)
    const transLedGeo = new THREE.BoxGeometry(crestW * 1.3, 0.0020, 0.004);
    const transLed = new THREE.Mesh(transLedGeo, materials.purpleEmissive);
    transLed.name = 'ThoracicInterfaceLed';
    transLed.position.set(0, halfH + 0.001, pCfg.z - 0.004);
    group.add(transLed);
    ledMeshes.push(transLed);
  }

  // ---------------------------------------------------------------------------
  // B. Transverse Lateral Process Wings & Actuator Link Bosses
  // ---------------------------------------------------------------------------
  for (const side of [-1, 1] as const) {
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, halfH * 0.65);
    wingShape.lineTo(side * (halfW * 0.72), halfH * 0.35);
    wingShape.lineTo(side * (halfW * 0.72), -halfH * 0.35);
    wingShape.lineTo(0, -halfH * 0.65);
    wingShape.closePath();

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
      depth: 0.014,
      bevelEnabled: true,
      bevelThickness: 0.0018,
      bevelSize: 0.0018,
      bevelSegments: 2,
    });
    wingGeo.center();

    const wing = new THREE.Mesh(wingGeo, materials.joint);
    wing.position.set(side * (halfW * 0.22), 0, 0.008);
    wing.rotation.y = -side * 0.12;
    wing.castShadow = true;
    group.add(wing);

    // Lateral CNC Fastener Pins
    const pinGeo = new THREE.CylinderGeometry(0.0018, 0.0018, 0.008, 12);
    const pin = new THREE.Mesh(pinGeo, materials.metallic);
    pin.rotation.z = Math.PI / 2;
    pin.position.set(side * (halfW * 0.80), 0, 0.012);
    group.add(pin);

    // SPECIAL: Vertebra 03 (Mid-Thoracic) has heavy CNC clevis horns for lateral actuator tie-rods!
    if (index === 2) {
      const hornGeo = new THREE.BoxGeometry(0.010, 0.012, 0.014);
      const horn = new THREE.Mesh(hornGeo, materials.joint);
      horn.position.set(side * (halfW * 0.86 + 0.004), 0, 0.010);
      group.add(horn);

      const hornPinGeo = new THREE.CylinderGeometry(0.0024, 0.0024, 0.016, 12);
      const hornPin = new THREE.Mesh(hornPinGeo, materials.metallic);
      hornPin.rotation.x = Math.PI / 2;
      hornPin.position.set(side * (halfW * 0.86 + 0.004), 0, 0.010);
      group.add(hornPin);
    }
  }

  // ---------------------------------------------------------------------------
  // C. Precision-Sculpted White Composite Outer Armor Facet
  // ---------------------------------------------------------------------------
  const topW = halfW * 0.96;
  const midW = halfW;
  const botW = halfW * 0.88;
  const zFace = pCfg.z;
  const zRidge = zFace + 0.007;
  const zSide = zFace - 0.008;
  const zBack = -0.010;

  const positions: number[] = [];

  function addQuad(
    bl: [number, number, number],
    br: [number, number, number],
    tr: [number, number, number],
    tl: [number, number, number]
  ) {
    positions.push(...bl, ...br, ...tr);
    positions.push(...bl, ...tr, ...tl);
  }

  function addTri(
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number]
  ) {
    positions.push(...p1, ...p2, ...p3);
  }

  // Vertices for precision trapezoidal chamfered facet
  const pTopL: [number, number, number] = [-topW * 0.75, halfH, zFace];
  const pTopM: [number, number, number] = [0, halfH + 0.0015, zFace];
  const pTopR: [number, number, number] = [topW * 0.75, halfH, zFace];

  const pMidL: [number, number, number] = [-midW * 0.82, 0, zRidge];
  const pMidM: [number, number, number] = [0, 0, zRidge + 0.002];
  const pMidR: [number, number, number] = [midW * 0.82, 0, zRidge];

  const pBotL: [number, number, number] = [-botW * 0.75, -halfH, zFace];
  const pBotM: [number, number, number] = [0, -halfH, zFace];
  const pBotR: [number, number, number] = [botW * 0.75, -halfH, zFace];

  const pWingTopL: [number, number, number] = [-topW, halfH - 0.002, zSide];
  const pWingTopR: [number, number, number] = [topW, halfH - 0.002, zSide];
  const pWingMidL: [number, number, number] = [-midW, 0, zSide];
  const pWingMidR: [number, number, number] = [midW, 0, zSide];
  const pWingBotL: [number, number, number] = [-botW, -halfH + 0.002, zSide];
  const pWingBotR: [number, number, number] = [botW, -halfH + 0.002, zSide];

  const pBackTopL: [number, number, number] = [-topW * 0.9, halfH, zBack];
  const pBackTopR: [number, number, number] = [topW * 0.9, halfH, zBack];
  const pBackBotL: [number, number, number] = [-botW * 0.9, -halfH, zBack];
  const pBackBotR: [number, number, number] = [botW * 0.9, -halfH, zBack];

  // Front center panels (meeting at central horizontal ridge)
  addQuad(pMidL, pMidM, pTopM, pTopL);
  addQuad(pMidM, pMidR, pTopR, pTopM);
  addQuad(pBotL, pBotM, pMidM, pMidL);
  addQuad(pBotM, pBotR, pMidR, pMidM);

  // Front lateral wing chamfers
  addQuad(pWingMidL, pMidL, pTopL, pWingTopL);
  addQuad(pWingBotL, pBotL, pMidL, pWingMidL);
  addQuad(pMidR, pWingMidR, pWingTopR, pTopR);
  addQuad(pBotR, pWingBotR, pWingMidR, pMidR);

  // Top & bottom chamfer bevels
  addQuad(pTopL, pTopR, pBackTopR, pBackTopL);
  addQuad(pBackBotL, pBackBotR, pBotR, pBotL);

  // Watertight lateral edge closure (clean non-degenerate triangles)
  addTri(pBackBotL, pWingBotL, pWingMidL);
  addTri(pBackBotL, pWingMidL, pBackTopL);
  addTri(pBackTopL, pWingMidL, pWingTopL);

  addTri(pWingBotR, pBackBotR, pWingMidR);
  addTri(pWingMidR, pBackBotR, pBackTopR);
  addTri(pWingMidR, pBackTopR, pWingTopR);

  // Watertight posterior back closure
  addQuad(pBackBotR, pBackBotL, pBackTopL, pBackTopR);

  const armorGeo = new THREE.BufferGeometry();
  armorGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  armorGeo.computeVertexNormals();
  
  // CRITICAL: Apply edge smoothing for premium rounded appearance
  // Merge close vertices and compute smooth normals for rounded edge effect
  const mergedGeo = BufferGeometryUtils.mergeVertices(armorGeo, 0.0001);
  mergedGeo.computeVertexNormals();

  const armorMesh = new THREE.Mesh(mergedGeo, materials.armor);
  armorMesh.name = `VertebraArmor_${index + 1}`;
  armorMesh.castShadow = true;
  armorMesh.receiveShadow = true;
  group.add(armorMesh);

  // ---------------------------------------------------------------------------
  // D. Purple Emissive LED Indicators & Optical Conduits (Section 15)
  // ---------------------------------------------------------------------------
  // Subtle, high-precision central energy conduit (secondary to mechanical geometry)
  const slitWidth = index === 0 ? 0.018 : Math.max(0.012, 0.022 - index * 0.0025);
  const creviceLedGeo = new THREE.BoxGeometry(slitWidth, 0.0016, 0.003);
  const creviceLed = new THREE.Mesh(creviceLedGeo, materials.purpleEmissive);
  creviceLed.name = `VertebraCreviceLed_${index + 1}`;
  creviceLed.position.set(0, 0, zRidge + 0.001);
  group.add(creviceLed);
  ledMeshes.push(creviceLed);
  
  // CRITICAL FIX: Prominent horizontal dark separator bands on outer armor surface
  // These create the visible segmented ring appearance matching the reference image
  if (index < cfg.vertebraCount - 1) {
    // Bottom dark separator band (visible horizontal black line between segments)
    const separatorHeight = 0.006;
    const separatorW = w * 1.02;
    
    // Create rounded separator band using ExtrudeGeometry with bevel
    const separatorShape = new THREE.Shape();
    separatorShape.moveTo(-separatorW * 0.5, -separatorHeight * 0.5);
    separatorShape.lineTo(separatorW * 0.5, -separatorHeight * 0.5);
    separatorShape.lineTo(separatorW * 0.5, separatorHeight * 0.5);
    separatorShape.lineTo(-separatorW * 0.5, separatorHeight * 0.5);
    separatorShape.closePath();
    
    const separatorGeo = new THREE.ExtrudeGeometry(separatorShape, {
      depth: 0.002,
      bevelEnabled: true,
      bevelThickness: 0.0008,
      bevelSize: 0.0008,
      bevelSegments: 3,
    });
    separatorGeo.center();
    
    const separatorMesh = new THREE.Mesh(separatorGeo, materials.joint);
    separatorMesh.position.set(0, -halfH - separatorHeight * 0.5, zFace + 0.002);
    separatorMesh.castShadow = true;
    separatorMesh.receiveShadow = true;
    group.add(separatorMesh);
  }
  
  // Top dark border line for enhanced definition with smooth edges
  const topBorderShape = new THREE.Shape();
  const topBW = w * 0.98;
  const topBH = 0.0018;
  topBorderShape.moveTo(-topBW * 0.5, -topBH * 0.5);
  topBorderShape.lineTo(topBW * 0.5, -topBH * 0.5);
  topBorderShape.lineTo(topBW * 0.5, topBH * 0.5);
  topBorderShape.lineTo(-topBW * 0.5, topBH * 0.5);
  topBorderShape.closePath();
  
  const topBorderGeo = new THREE.ExtrudeGeometry(topBorderShape, {
    depth: 0.001,
    bevelEnabled: true,
    bevelThickness: 0.0004,
    bevelSize: 0.0004,
    bevelSegments: 2,
  });
  topBorderGeo.center();
  
  const topBorder = new THREE.Mesh(topBorderGeo, materials.joint);
  topBorder.position.set(0, halfH - 0.001, zFace + 0.002);
  group.add(topBorder);

  // 3. Posterior power core lens on mid-thoracic vertebra (Vertebra 03)
  if (index === 2) {
    const rearBezelGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.004, 24);
    const rearBezel = new THREE.Mesh(rearBezelGeo, materials.metallic);
    rearBezel.rotation.x = Math.PI / 2;
    rearBezel.position.set(0, 0, -coreRadius - 0.002);
    group.add(rearBezel);

    const rearLensGeo = new THREE.CylinderGeometry(0.0085, 0.0085, 0.005, 24);
    const rearLens = new THREE.Mesh(rearLensGeo, materials.purpleEmissive);
    rearLens.name = 'SpineRearPowerCoreLens';
    rearLens.rotation.x = Math.PI / 2;
    rearLens.position.set(0, 0, -coreRadius - 0.003);
    group.add(rearLens);
    ledMeshes.push(rearLens);
  }

  // High-performance static batching: merge all sub-meshes within this rigid vertebra module
  const mergedMeshes = mergeAllGroupMeshesByMaterial(group, { namePrefix: group.name || `VertebraModule_0${index + 1}` });
  const mergedArmor = mergedMeshes.find((m) => m.material === materials.armor);
  const mergedJoint = mergedMeshes.find((m) => m.material === materials.joint);
  const mergedLed = mergedMeshes.find((m) => m.material === materials.purpleEmissive);
  if (mergedLed) {
    ledMeshes.push(mergedLed);
  }

  return { group, primaryMesh: mergedJoint || coreMesh, armorMesh: mergedArmor || armorMesh };
}

// ─── 3. HEAVY-DUTY HYDRAULIC ACTUATOR & TRIANGULATED LINKAGE ────────────────
interface ActuatorPoleParams {
  side: -1 | 1;
  name: string;
  upperMount: { x: number; y: number; z: number };
  lowerMount: { x: number; y: number; z: number };
  cylinderRadius: number;
  pistonRadius: number;
  hasStabilizerLink?: boolean;
}

/**
 * Creates a single precision hydraulic actuator pole assembly with complete
 * dark titanium cylinder barrel, illuminated violet power core, slotted cage,
 * gland seal collar, mirror-polished chrome telescoping piston rod, and uniball joints.
 */
function createSingleActuatorPole(
  params: ActuatorPoleParams,
  materials: RobotMaterialPalette,
  ledMeshes: THREE.Mesh[]
): { group: THREE.Group; barrelMesh: THREE.Mesh } {
  const { side, name, upperMount, lowerMount, cylinderRadius, pistonRadius, hasStabilizerLink } = params;
  const group = new THREE.Group();
  group.name = name;

  const startPt = new THREE.Vector3(side * upperMount.x, upperMount.y, upperMount.z);
  const endPt = new THREE.Vector3(side * lowerMount.x, lowerMount.y, lowerMount.z);
  const totalLen = startPt.distanceTo(endPt);

  const actGroup = new THREE.Group();
  actGroup.position.copy(startPt);
  const dir = new THREE.Vector3().subVectors(endPt, startPt).normalize();
  actGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);

  const barrelRadius = cylinderRadius;
  const rodRadius = pistonRadius;
  const barrelLen = totalLen * 0.48;

  // 1. Upper Spherical Rod-End Bearing (Uniball)
  const uniballGeo = geoCache.get(`ActuatorUniball_${barrelRadius.toFixed(4)}`, () => new THREE.SphereGeometry(barrelRadius * 1.08, 20, 16));
  const uniball = new THREE.Mesh(uniballGeo, materials.metallic);
  uniball.position.set(0, 0, 0);
  uniball.castShadow = true;
  actGroup.add(uniball);

  const uniballHousingGeo = geoCache.get(`ActuatorUniballHousing_${barrelRadius.toFixed(4)}`, () => new THREE.CylinderGeometry(barrelRadius * 1.18, barrelRadius * 1.18, 0.014, 24));
  const uniballHousing = new THREE.Mesh(uniballHousingGeo, materials.joint);
  uniballHousing.position.set(0, -0.006, 0);
  actGroup.add(uniballHousing);

  // 2. Heavy-Duty Cylinder Barrel Body (Dark Titanium)
  const barrelGeo = geoCache.get(`ActuatorBarrel_${barrelRadius.toFixed(4)}_${barrelLen.toFixed(4)}`, () => new THREE.CylinderGeometry(barrelRadius, barrelRadius, barrelLen, 32));
  const barrel = new THREE.Mesh(barrelGeo, materials.joint);
  barrel.position.set(0, -0.012 - barrelLen * 0.5, 0);
  barrel.castShadow = true;
  barrel.receiveShadow = true;
  actGroup.add(barrel);

  // Top and bottom machined lock rings
  const ringGeo = geoCache.get(`ActuatorRing_${barrelRadius.toFixed(4)}`, () => new THREE.CylinderGeometry(barrelRadius * 1.08, barrelRadius * 1.08, 0.004, 32));
  for (const pos of [-0.014, -0.010 - barrelLen]) {
    const ring = new THREE.Mesh(ringGeo, materials.metallic);
    ring.position.set(0, pos, 0);
    actGroup.add(ring);
  }

  // 3. Illuminated Violet Power Core (Single, seamless cylindrical glowing band - no vertical dividing bars)
  const coreLen = barrelLen * 0.44;
  const coreGeo = geoCache.get(`ActuatorCore_${barrelRadius.toFixed(4)}_${coreLen.toFixed(4)}`, () => new THREE.CylinderGeometry(barrelRadius * 1.015, barrelRadius * 1.015, coreLen, 32));
  const powerCore = new THREE.Mesh(coreGeo, materials.purpleEmissive);
  powerCore.name = `${name}_PowerCore`;
  powerCore.position.set(0, -0.012 - barrelLen * 0.5, 0);
  actGroup.add(powerCore);
  ledMeshes.push(powerCore);

  // Recessed metallic collar rings framing top and bottom of the single illuminated core
  const collarGeo = geoCache.get(`ActuatorCollar_${barrelRadius.toFixed(4)}`, () => new THREE.CylinderGeometry(barrelRadius * 1.035, barrelRadius * 1.035, 0.0022, 32));
  for (const cY of [-0.012 - barrelLen * 0.5 + coreLen * 0.5, -0.012 - barrelLen * 0.5 - coreLen * 0.5]) {
    const collar = new THREE.Mesh(collarGeo, materials.metallic);
    collar.position.set(0, cY, 0);
    actGroup.add(collar);
  }

  // High-pressure 90° hydraulic union elbow fitting
  const unionGeo = geoCache.get('ActuatorUnion', () => new THREE.BoxGeometry(0.0065, 0.0085, 0.0065));
  const unionMesh = new THREE.Mesh(unionGeo, materials.metallic);
  unionMesh.position.set(0, -0.016, -barrelRadius - 0.0018);
  actGroup.add(unionMesh);

  // Flexible Braided Hydraulic Hose leading back symmetrically into lower chest frame
  const hoseStart = new THREE.Vector3(startPt.x, startPt.y - 0.018, startPt.z - 0.004);
  const hoseMid = new THREE.Vector3(startPt.x * 0.85, startPt.y - 0.008, startPt.z - 0.010);
  const hoseEnd = new THREE.Vector3(startPt.x * 0.70, startPt.y + 0.008, startPt.z - 0.014);
  const hoseCurve = new THREE.CatmullRomCurve3([hoseStart, hoseMid, hoseEnd]);
  const hoseGeo = new THREE.TubeGeometry(hoseCurve, 16, 0.0018, 8, false);
  const hose = new THREE.Mesh(hoseGeo, materials.joint);
  hose.castShadow = true;
  group.add(hose);

  // 4. Heavy Gland Seal Collar at barrel base
  const sealGeo = geoCache.get(`ActuatorSeal_${barrelRadius.toFixed(4)}`, () => new THREE.CylinderGeometry(barrelRadius * 0.96, barrelRadius * 0.96, 0.006, 28));
  const seal = new THREE.Mesh(sealGeo, materials.joint);
  seal.position.set(0, -0.012 - barrelLen - 0.003, 0);
  actGroup.add(seal);

  // 5. Mirror-Polished Chrome Telescoping Piston Rod (Fully connects upper barrel down to lower waist mount)
  const rodStartY = -0.012 - barrelLen - 0.006;
  const rodLen = Math.abs(-totalLen - rodStartY);
  const rodGeo = geoCache.get(`ActuatorRod_${rodRadius.toFixed(4)}_${rodLen.toFixed(4)}`, () => new THREE.CylinderGeometry(rodRadius, rodRadius, rodLen, 24));
  const rod = new THREE.Mesh(rodGeo, materials.metallic);
  rod.name = `${name}_PistonRod`;
  rod.position.set(0, rodStartY - rodLen * 0.5, 0);
  rod.castShadow = true;
  actGroup.add(rod);

  // 6. Lower Spherical Uniball End Seating into Waist Plinth
  const lowerUniballGeo = geoCache.get(`ActuatorLowerUniball_${rodRadius.toFixed(4)}`, () => new THREE.SphereGeometry(rodRadius * 1.5, 18, 14));
  const lowerUniball = new THREE.Mesh(lowerUniballGeo, materials.metallic);
  lowerUniball.position.set(0, -totalLen + 0.008, 0);
  actGroup.add(lowerUniball);

  const lowerCuffGeo = geoCache.get(`ActuatorLowerCuff_${rodRadius.toFixed(4)}`, () => new THREE.CylinderGeometry(rodRadius * 1.55, rodRadius * 1.55, 0.004, 20));
  const lowerCuff = new THREE.Mesh(lowerCuffGeo, materials.joint);
  lowerCuff.position.set(0, -totalLen + 0.008, 0);
  actGroup.add(lowerCuff);

  group.add(actGroup);

  // 7. Optional Triangulated Stabilizing Torque Linkage (Tie-Rod) connecting mid-barrel to Vertebra 03
  if (hasStabilizerLink) {
    const linkStart = new THREE.Vector3(side * 0.096, -0.138, 0.025);
    const linkEnd = new THREE.Vector3(side * 0.049, -0.138, 0.010);
    const linkLen = linkStart.distanceTo(linkEnd);

    const linkGroup = new THREE.Group();
    linkGroup.name = `${name}_StabilizerTieRod`;
    linkGroup.position.copy(linkStart);
    const linkDir = new THREE.Vector3().subVectors(linkEnd, linkStart).normalize();
    linkGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), linkDir);

    const tieRodGeo = geoCache.get(`ActuatorTieRod_${linkLen.toFixed(4)}`, () => new THREE.CylinderGeometry(0.0034, 0.0034, linkLen * 0.72, 14));
    const tieRod = new THREE.Mesh(tieRodGeo, materials.metallic);
    tieRod.rotation.x = Math.PI / 2;
    tieRod.position.set(0, 0, linkLen * 0.5);
    linkGroup.add(tieRod);

    const ballGeo = geoCache.get('ActuatorBall', () => new THREE.SphereGeometry(0.0048, 12, 10));
    for (const zOffset of [0, linkLen]) {
      const ball = new THREE.Mesh(ballGeo, materials.joint);
      ball.position.set(0, 0, zOffset);
      linkGroup.add(ball);
    }
    group.add(linkGroup);
  }

  const mergedPole = mergeAllGroupMeshesByMaterial(group, { namePrefix: name });
  const barrelMerged = mergedPole.find((m) => m.material === materials.joint) || barrel;
  const poleLed = mergedPole.find((m) => m.material === materials.purpleEmissive);
  if (poleLed) {
    ledMeshes.push(poleLed);
  }

  return { group, barrelMesh: barrelMerged };
}

/**
 * Engineered dual hydraulic actuator cluster (outer + inner poles) per side,
 * forming the complete 4-pole abdominal kinematic support system.
 */
function createSideActuatorAssembly(
  side: -1 | 1,
  materials: RobotMaterialPalette,
  ledMeshes: THREE.Mesh[]
): { group: THREE.Group; primaryMesh: THREE.Mesh } {
  const clusterGroup = new THREE.Group();
  clusterGroup.name = side === -1 ? 'LeftActuatorClusterAssembly' : 'RightActuatorClusterAssembly';

  const cfg = TORSO_CONFIG.stomach;
  const dual = cfg.dualActuators || {
    outer: {
      upperMount: { x: 0.098, y: -0.066, z: 0.014 },
      lowerMount: { x: 0.076, y: -0.204, z: 0.016 },
      cylinderRadius: 0.0125,
      pistonRadius: 0.0068,
    },
    inner: {
      upperMount: { x: 0.068, y: -0.070, z: 0.006 },
      lowerMount: { x: 0.052, y: -0.204, z: 0.012 },
      cylinderRadius: 0.0090,
      pistonRadius: 0.0052,
    },
  };

  // Outer Actuator Pole (Single unified cylinder pole with tie-rod link)
  const outerPole = createSingleActuatorPole(
    {
      side,
      name: side === -1 ? 'OuterLeftActuatorPole' : 'OuterRightActuatorPole',
      upperMount: cfg.actuator?.upperMount || dual.outer.upperMount,
      lowerMount: cfg.actuator?.lowerMount || dual.outer.lowerMount,
      cylinderRadius: 0.0118,
      pistonRadius: 0.0064,
      hasStabilizerLink: true,
    },
    materials,
    ledMeshes
  );
  clusterGroup.add(outerPole.group);

  // Inner Actuator Pole (Single unified cylinder pole - completing all 4 single poles)
  const innerPole = createSingleActuatorPole(
    {
      side,
      name: side === -1 ? 'InnerLeftActuatorPole' : 'InnerRightActuatorPole',
      upperMount: dual.inner.upperMount,
      lowerMount: dual.inner.lowerMount,
      cylinderRadius: 0.0095,
      pistonRadius: 0.0052,
      hasStabilizerLink: false,
    },
    materials,
    ledMeshes
  );
  clusterGroup.add(innerPole.group);

  // High-performance static batching: merge outer and inner poles into shared meshes per material per side
  const mergedCluster = mergeAllGroupMeshesByMaterial(clusterGroup, { namePrefix: clusterGroup.name });
  const barrelMerged = mergedCluster.find((m) => m.material === materials.joint) || outerPole.barrelMesh;
  const clusterLed = mergedCluster.find((m) => m.material === materials.purpleEmissive);
  if (clusterLed) {
    ledMeshes.push(clusterLed);
  }

  return { group: clusterGroup, primaryMesh: barrelMerged as THREE.Mesh };
}

// ─── 4. SLEW BEARING WAIST TRANSITION DECK & PLINTHS ────────────────────────
/**
 * Precision lumbar-to-waist transition:
 * - Multi-tiered dark titanium turntable deck plate with precision bolt circle
 * - Lower lumbar socket receiver cup locking Vertebra 05
 * - Quadruple reinforced actuator receiver plinths (outer & inner lower mounts) with heavy-duty clevis pins
 * - Forward glowing purple neon arc bar with ceramic white clamp hoods
 */
function createWaistTransitionDeck(
  materials: RobotMaterialPalette,
  ledMeshes: THREE.Mesh[]
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'WaistTransitionDeckAssembly';

  const deckGroup = new THREE.Group();

  // 1. Primary Slew Bearing Turntable Deck Plate (Machined dark titanium)
  const deckY = -0.208;
  const deckGeo = geoCache.get('Waist_DeckPlate', () => new THREE.CylinderGeometry(0.086, 0.090, 0.012, 48));
  const deck = new THREE.Mesh(deckGeo, materials.joint);
  deck.scale.set(1.06, 1.0, 0.88);
  deck.position.set(0, deckY, 0);
  deckGroup.add(deck);

  // Concentric bearing race groove ring (mirror metallic)
  const rimGeo = geoCache.get('Waist_DeckRim', () => new THREE.TorusGeometry(0.085, 0.0014, 8, 48));
  const rim = new THREE.Mesh(rimGeo, materials.metallic);
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(1.06, 0.88, 1.0);
  rim.position.set(0, deckY + 0.0055, 0);
  group.add(rim);

  // Bolt Circle: 20 precision hex socket fasteners
  const boltCount = 20;
  const boltGeo = geoCache.get('Waist_DeckBolt', () => new THREE.CylinderGeometry(0.0016, 0.0016, 0.0024, 6));
  for (let b = 0; b < boltCount; b++) {
    const angle = (b / boltCount) * Math.PI * 2;
    if (Math.abs(Math.sin(angle)) > 0.82 && Math.cos(angle) > 0) continue; // Skip front clamp areas
    const bolt = new THREE.Mesh(boltGeo, materials.metallic);
    bolt.position.set(
      Math.sin(angle) * 0.080 * 1.05,
      deckY + 0.0065,
      Math.cos(angle) * 0.080 * 0.88
    );
    group.add(bolt);
  }

  // 2. Central Lower Lumbar Socket (Receiver cup for Vertebra 05)
  const socketGeo = geoCache.get('Waist_LumbarSocket', () => new THREE.CylinderGeometry(0.038, 0.042, 0.018, 32));
  const lumbarSocket = new THREE.Mesh(socketGeo, materials.joint);
  lumbarSocket.position.set(0, deckY + 0.006, 0);
  deckGroup.add(lumbarSocket);

  const socketRimGeo = geoCache.get('Waist_LumbarSocketRim', () => new THREE.TorusGeometry(0.039, 0.0014, 8, 32));
  const socketRim = new THREE.Mesh(socketRimGeo, materials.metallic);
  socketRim.rotation.x = Math.PI / 2;
  socketRim.position.set(0, deckY + 0.014, 0);
  group.add(socketRim);

  // 3. Quadruple Reinforced Actuator Anchor Plinths (Outer & Inner mounts for all 4 abdominal poles)
  const cfgAct = TORSO_CONFIG.stomach.actuator;
  const dualCfg = TORSO_CONFIG.stomach.dualActuators;
  
  const mountPositions = [
    { x: cfgAct.lowerMount.x, z: cfgAct.lowerMount.z, isOuter: true },
    { x: dualCfg?.inner.lowerMount.x || 0.052, z: dualCfg?.inner.lowerMount.z || 0.012, isOuter: false },
  ];

  const pinGeo = geoCache.get('Waist_PlinthPin', () => new THREE.CylinderGeometry(0.0032, 0.0032, 0.022, 16));
  const ribGeo = geoCache.get('Waist_PlinthRib', () => new THREE.BoxGeometry(0.020, 0.010, 0.007));

  for (const side of [-1, 1] as const) {
    for (const mount of mountPositions) {
      const pWidth = mount.isOuter ? 0.018 : 0.014;
      const plinthGeo = geoCache.get(`Waist_Plinth_${pWidth}`, () => new THREE.BoxGeometry(pWidth, 0.020, 0.020));
      const plinth = new THREE.Mesh(plinthGeo, materials.joint);
      plinth.position.set(side * mount.x, deckY + 0.008, mount.z);
      plinth.rotation.z = -side * (mount.isOuter ? 0.12 : 0.06);
      deckGroup.add(plinth);

      const pin = new THREE.Mesh(pinGeo, materials.metallic);
      pin.rotation.z = Math.PI / 2;
      pin.position.set(side * mount.x, deckY + 0.008, mount.z);
      deckGroup.add(pin);

      // Gusset rib anchoring plinth to central lumbar hub
      const rib = new THREE.Mesh(ribGeo, materials.joint);
      rib.position.set(side * (mount.x * 0.68), deckY + 0.004, mount.z * 0.68);
      rib.rotation.y = -side * 0.28;
      deckGroup.add(rib);
    }
  }

  const mergedDeck = mergeGroupMeshesByMaterial(deckGroup, materials.joint, 'WaistDeck_Merged', false)!;
  mergedDeck.castShadow = true;
  mergedDeck.receiveShadow = true;
  group.add(mergedDeck);

  // 4. Forward-Curving Horizontal Purple Neon Arc Bar & Recessed Bezel
  const ARC_R = 0.086;
  const ARC_Y = deckY + 0.002;
  const MAX_ANGLE = 0.74; // ~42.4 degrees
  const PTS_COUNT = 24;

  const arcPoints: THREE.Vector3[] = [];
  for (let i = 0; i <= PTS_COUNT; i++) {
    const t = i / PTS_COUNT;
    const angle = -MAX_ANGLE + t * (2 * MAX_ANGLE);
    arcPoints.push(new THREE.Vector3(
      Math.sin(angle) * ARC_R * 1.05,
      ARC_Y,
      Math.cos(angle) * ARC_R * 0.88
    ));
  }
  const arcCurve = new THREE.CatmullRomCurve3(arcPoints);

  const neonBarGeo = geoCache.get('Waist_NeonBar', () => new THREE.TubeGeometry(arcCurve, 32, 0.0026, 10, false));
  const neonBar = new THREE.Mesh(neonBarGeo, materials.purpleEmissive);
  neonBar.name = 'WaistFrontPurpleNeonBar';
  group.add(neonBar);
  ledMeshes.push(neonBar);

  // White Ceramic Clamp Hoods wrapping the neon bar ends
  const hoodGeo = geoCache.get('Waist_NeonHood', () => new THREE.BoxGeometry(0.016, 0.018, 0.018));
  for (const side of [-1, 1] as const) {
    const hood = new THREE.Mesh(hoodGeo, materials.armor);
    hood.name = side === -1 ? 'WaistNeonClampHood_Left' : 'WaistNeonClampHood_Right';
    const hX = side * Math.sin(MAX_ANGLE) * ARC_R * 1.05;
    const hZ = Math.cos(MAX_ANGLE) * ARC_R * 0.88;
    hood.position.set(hX, ARC_Y, hZ);
    hood.rotation.y = -side * (MAX_ANGLE + 0.18);
    hood.castShadow = true;
    group.add(hood);
  }

  // Continuous Neon Ring directly below deck
  const neonRingGeo = geoCache.get('Waist_NeonRing', () => new THREE.TorusGeometry(0.087, 0.0016, 8, 44));
  const neonRing = new THREE.Mesh(neonRingGeo, materials.purpleEmissive);
  neonRing.name = 'WaistTurntableNeonRing';
  neonRing.rotation.x = Math.PI / 2;
  neonRing.scale.set(1.06, 0.88, 1.0);
  neonRing.position.set(0, deckY - 0.006, 0);
  group.add(neonRing);
  ledMeshes.push(neonRing);

  const finalMergedDeck = mergeAllGroupMeshesByMaterial(group, { namePrefix: 'WaistTransitionDeck' });
  const deckLed = finalMergedDeck.find((m) => m.material === materials.purpleEmissive);
  if (deckLed) {
    ledMeshes.push(deckLed);
  }

  return group;
}

// ─── 5. COMPLETE STOMACH / ABDOMEN ASSEMBLY ──────────────────────────────────
export function createStomachAssembly(materials: RobotMaterialPalette): StomachAssemblyNodes {
  const abdomenGroup = new THREE.Group();
  abdomenGroup.name = 'AbdomenCore';

  const ledMeshes: THREE.Mesh[] = [];

  // 1. Torso Upper Structural Interface (mating with LowerChestFrame)
  const { group: upperConnectorGroup, ledMeshes: upperLeds } = createSpineUpperMount(materials);
  abdomenGroup.add(upperConnectorGroup);
  ledMeshes.push(...upperLeds);

  // 2. Central Mechanical Spine Column (5 Vertebral Modules)
  const spineGroup = new THREE.Group();
  spineGroup.name = 'ArticulatedSpineAssembly';

  // Central dark spine structural core shaft running continuously through all vertebrae
  const shaftGeo = new THREE.CylinderGeometry(0.018, 0.020, 0.155, 24);
  const spineCoreMesh = new THREE.Mesh(shaftGeo, materials.joint);
  spineCoreMesh.name = 'SpineCentralShaft';
  spineCoreMesh.position.set(0, -0.138, -0.004);
  spineCoreMesh.castShadow = true;
  spineGroup.add(spineCoreMesh);

  // Build the 5 articulated robotic vertebrae
  const vertebraGroups: THREE.Group[] = [];
  const primaryMeshes: THREE.Mesh[] = [];
  const armorPlates: THREE.Mesh[] = [];

  for (let i = 0; i < TORSO_CONFIG.stomach.vertebraCount; i++) {
    const v = createVertebraModule(i, materials, ledMeshes);
    spineGroup.add(v.group);
    vertebraGroups.push(v.group);
    primaryMeshes.push(v.primaryMesh);
    armorPlates.push(v.armorMesh);
  }

  // 3. Waist Transition Slew-Bearing Deck Assembly
  const waistDeck = createWaistTransitionDeck(materials, ledMeshes);
  spineGroup.add(waistDeck);

  abdomenGroup.add(spineGroup);

  // 4. Heavy-Duty Quadruple Hydraulic Actuators (4 Poles: Outer & Inner pairs for Left & Right)
  const leftActuator = createSideActuatorAssembly(-1, materials, ledMeshes);
  const rightActuator = createSideActuatorAssembly(1, materials, ledMeshes);
  abdomenGroup.add(leftActuator.group);
  abdomenGroup.add(rightActuator.group);

  // 5. Build rings[] array for TorsoAnimationController (mapped directly to the 5 vertebrae)
  const rings: StomachRingNodes[] = vertebraGroups.map((vg, idx) => {
    return {
      group: vg,
      outerRing: primaryMeshes[idx],
      innerCore: primaryMeshes[idx],
      frontPlate: armorPlates[idx],
    } satisfies StomachRingNodes;
  });

  const lowerConnectorGroup = new THREE.Group();
  lowerConnectorGroup.name = 'LowerConnector';
  lowerConnectorGroup.position.set(0, -0.208, 0);

  return {
    group: abdomenGroup,
    upperConnector: upperConnectorGroup,
    segment01: rings[0].group,
    segment02: rings[1].group,
    segment03: rings[2].group,
    segment04: rings[3].group,
    segment05: rings[4].group,
    rings,
    lowerAbdomen: lowerConnectorGroup,
    lowerConnector: lowerConnectorGroup,
    sideMechanismLeft: leftActuator.group,
    sideMechanismRight: rightActuator.group,
    internalSpine: spineGroup,
    spineCore: spineCoreMesh,
    vertebraeDiscs: primaryMeshes,
    ledMeshes,
    armorPlates,
  };
}

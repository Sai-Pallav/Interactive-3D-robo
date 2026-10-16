import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { LEG_CONFIG } from './LegConfig';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger';
import { geoCache } from '../utils/GeometryCache';

export interface FootNodes {
  group: THREE.Group;
  soleChassis: THREE.Mesh;
  dorsalArmor: THREE.Mesh;
  toePivot: THREE.Group;
  toeArmor: THREE.Mesh;
  heelArmor: THREE.Mesh;
  heelThruster: THREE.Mesh;
  treadPads: THREE.Mesh[];
  underglowStrip: THREE.Mesh;
  ledMeshes: THREE.Mesh[];
}

/**
 * Creates the aerodynamic sculpted white ceramic dorsal (top-of-foot) armor shield.
 * Features:
 * - Ergonomic bridge contour wider at metatarsal ball, tapering gracefully at ankle
 * - Longitudinal deflector crest with chamfered lateral facets
 * - Recessed maintenance panel seams catching specular highlights
 * - Beveled outer perimeter
 */
function createDorsalArmorGeometry(
  width: number,
  length: number,
  thickness: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfW = width * 0.5;

  // Ergonomic foot bridge contour: wider at metatarsal ball, tapered at ankle
  shape.moveTo(-halfW * 0.75, -length * 0.45);
  shape.lineTo(halfW * 0.75, -length * 0.45);
  shape.quadraticCurveTo(halfW, -length * 0.10, halfW * 0.98, length * 0.15);
  shape.lineTo(halfW * 0.88, length * 0.48);
  shape.lineTo(-halfW * 0.88, length * 0.48);
  shape.lineTo(-halfW * 0.98, length * 0.15);
  shape.quadraticCurveTo(-halfW, -length * 0.10, -halfW * 0.75, -length * 0.45);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.0025,
    bevelSegments: 3,
    curveSegments: 24,
  });
  geo.center();

  // Dorsal arch curve: peaks over middle bridge and slopes forward toward toes
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (z > 0) {
      const arch = Math.sin(((y + length * 0.45) / length) * Math.PI) * 0.007;
      const crown = Math.cos((x / halfW) * Math.PI * 0.45) * 0.0025;
      const isSeam = Math.abs(y - length * 0.10) < 0.0014;
      const seamIndent = isSeam ? -0.0015 : 0;
      pos.setZ(i, z + arch + crown + seamIndent);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates the sculpted white ceramic toe cap armor shield.
 */
function createToeCapGeometry(
  width: number,
  length: number,
  height: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfW = width * 0.5;

  shape.moveTo(-halfW * 0.90, -length * 0.5);
  shape.lineTo(halfW * 0.90, -length * 0.5);
  shape.quadraticCurveTo(halfW, 0, halfW * 0.75, length * 0.35);
  shape.quadraticCurveTo(0, length * 0.55, -halfW * 0.75, length * 0.35);
  shape.quadraticCurveTo(-halfW, 0, -halfW * 0.90, -length * 0.5);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.0025,
    bevelSegments: 3,
    curveSegments: 24,
  });
  geo.center();
  return geo;
}

/**
 * Creates the complete Robotic Foot & Boot assembly (RULE #8):
 * - Layered construction: high-traction sole, structural chassis, dorsal armor, toe guard, heel counter
 * - High-traction dark titanium sole chassis with multi-segment tread pads
 * - Ground-effect violet neon underglow along the sole perimeter
 * - Sculpted white ceramic dorsal metatarsal armor shield with panel seams and fasteners
 * - Articulated toe cap guard for natural floor planting
 * - Rear heel counter with Achilles clevis bracket and micro-thruster exhaust nozzle
 */
export function createFoot(
  side: -1 | 1,
  materials: RobotMaterialPalette
): FootNodes {
  const footGroup = new THREE.Group();
  footGroup.name = side === -1 ? 'LeftFoot' : 'RightFoot';

  const cfg = LEG_CONFIG.foot;
  const ledMeshes: THREE.Mesh[] = [];
  const treadPads: THREE.Mesh[] = [];

  // Group containing stationary joint components (sole, chassis, tread, thruster)
  const footJointGroup = new THREE.Group();
  footJointGroup.name = side === -1 ? 'FootJointCore_L' : 'FootJointCore_R';
  footGroup.add(footJointGroup);

  // Group containing metallic sub-assemblies
  const footMetallicGroup = new THREE.Group();
  footMetallicGroup.name = side === -1 ? 'FootMetallic_L' : 'FootMetallic_R';
  footGroup.add(footMetallicGroup);

  // ==========================================
  // 1. LAYER 1: SOLE CHASSIS (Dark Titanium Structural Base)
  // ==========================================
  const halfW = cfg.width * 0.5;

  const soleGeo = geoCache.get('Foot_SoleGeo', () => {
    const soleShape = new THREE.Shape();
    soleShape.moveTo(-halfW * 0.75, cfg.heelOffset);
    soleShape.lineTo(halfW * 0.75, cfg.heelOffset);
    soleShape.quadraticCurveTo(halfW * 0.85, 0, halfW, cfg.toeOffset * 0.55);
    soleShape.quadraticCurveTo(halfW * 0.95, cfg.toeOffset * 0.90, halfW * 0.65, cfg.toeOffset);
    soleShape.lineTo(-halfW * 0.65, cfg.toeOffset);
    soleShape.quadraticCurveTo(-halfW * 0.95, cfg.toeOffset * 0.90, -halfW, cfg.toeOffset * 0.55);
    soleShape.quadraticCurveTo(-halfW * 0.85, 0, -halfW * 0.75, cfg.heelOffset);
    soleShape.closePath();

    const g = new THREE.ExtrudeGeometry(soleShape, {
      depth: cfg.soleThickness,
      bevelEnabled: true,
      bevelThickness: 0.0025,
      bevelSize: 0.002,
      bevelSegments: 2,
      curveSegments: 24,
    });
    g.center();
    return g;
  });

  const soleChassis = new THREE.Mesh(soleGeo, materials.joint);
  soleChassis.name = side === -1 ? 'FootSole_L' : 'FootSole_R';
  soleChassis.rotation.x = Math.PI / 2;
  soleChassis.position.set(0, -cfg.height + cfg.soleThickness * 0.5, (cfg.toeOffset + cfg.heelOffset) * 0.5);
  soleChassis.castShadow = true;
  soleChassis.receiveShadow = true;
  footJointGroup.add(soleChassis);

  // ==========================================
  // 2. LAYER 2: SEGMENTED TREAD PADS (High-grip textured sole elements)
  // Distinct heel strike block, midfoot lateral stabilizer, and forefoot grip pads
  // ==========================================
  const padCount = cfg.treadPadsCount;
  const padSpacing = (cfg.toeOffset - cfg.heelOffset) / (padCount + 1);
  for (let i = 0; i < padCount; i++) {
    const padZ = cfg.heelOffset + (i + 1) * padSpacing;
    const padW = cfg.width * (0.65 + Math.sin((i / padCount) * Math.PI) * 0.25);
    const padGeo = geoCache.get(`Foot_PadGeo_${i}`, () => new THREE.BoxGeometry(padW, 0.0028, padSpacing * 0.55));
    const pad = new THREE.Mesh(padGeo, materials.joint);
    pad.position.set(0, -cfg.height + 0.0014, padZ);
    pad.castShadow = true;
    footJointGroup.add(pad);
    treadPads.push(pad);

    // Tread siping grooves
    const sipeGeo = geoCache.get(`Foot_SipeGeo_${i}`, () => new THREE.BoxGeometry(padW * 0.85, 0.0010, 0.0012));
    const sipe = new THREE.Mesh(sipeGeo, materials.joint);
    sipe.position.set(0, -cfg.height + 0.0005, padZ);
    footJointGroup.add(sipe);
  }

  // ==========================================
  // 3. LAYER 3: INTERNAL STRUCTURAL CHASSIS & ANKLE RECEIVER
  // Dark titanium skeleton bridging ankle gimbal to sole, heel, and toe pivot
  // ==========================================
  const chassisBoxGeo = geoCache.get('Foot_ChassisBoxGeo', () => new THREE.BoxGeometry(cfg.width * 0.62, cfg.height * 0.55, cfg.length * 0.65));
  const innerChassis = new THREE.Mesh(chassisBoxGeo, materials.joint);
  innerChassis.position.set(0, -cfg.height * 0.55, 0.012);
  innerChassis.castShadow = true;
  footJointGroup.add(innerChassis);

  // Ankle mounting socket atop foot chassis
  const ankleSocketGeo = geoCache.get('Foot_AnkleSocketGeo', () => new THREE.CylinderGeometry(0.016, 0.018, 0.008, 20));
  const ankleSocket = new THREE.Mesh(ankleSocketGeo, materials.joint);
  ankleSocket.position.set(0, -cfg.height * 0.22, 0);
  footJointGroup.add(ankleSocket);

  // ==========================================
  // 4. GROUND-EFFECT PURPLE NEON UNDERGLOW STRIP
  // ==========================================
  const underglowGeo = geoCache.get('Foot_UnderglowGeo', () => {
    const underglowShape = new THREE.Shape();
    const ugW = halfW * 0.92;
    underglowShape.moveTo(-ugW * 0.75, cfg.heelOffset + 0.004);
    underglowShape.lineTo(ugW * 0.75, cfg.heelOffset + 0.004);
    underglowShape.lineTo(ugW, cfg.toeOffset * 0.55);
    underglowShape.lineTo(ugW * 0.65, cfg.toeOffset - 0.004);
    underglowShape.lineTo(-ugW * 0.65, cfg.toeOffset - 0.004);
    underglowShape.lineTo(-ugW, cfg.toeOffset * 0.55);
    underglowShape.closePath();

    const ugHole = new THREE.Path();
    const ugIW = halfW * 0.82;
    ugHole.moveTo(-ugIW * 0.75, cfg.heelOffset + 0.008);
    ugHole.lineTo(ugIW * 0.75, cfg.heelOffset + 0.008);
    ugHole.lineTo(ugIW, cfg.toeOffset * 0.55);
    ugHole.lineTo(ugIW * 0.65, cfg.toeOffset - 0.008);
    ugHole.lineTo(-ugIW * 0.65, cfg.toeOffset - 0.008);
    ugHole.lineTo(-ugIW, cfg.toeOffset * 0.55);
    ugHole.closePath();
    underglowShape.holes.push(ugHole);

    const g = new THREE.ExtrudeGeometry(underglowShape, {
      depth: 0.0022,
      bevelEnabled: false,
      curveSegments: 16,
    });
    g.center();
    return g;
  });

  const tempFootLeds = new THREE.Group();

  const underglowStripRaw = new THREE.Mesh(underglowGeo, materials.purpleEmissive);
  underglowStripRaw.rotation.x = Math.PI / 2;
  underglowStripRaw.position.set(0, -cfg.height + 0.002, (cfg.toeOffset + cfg.heelOffset) * 0.5);
  tempFootLeds.add(underglowStripRaw);

  // Soft purple bloom ground reflection mesh
  const ugBloomGeo = geoCache.get('Foot_UgBloomGeo', () => new THREE.PlaneGeometry(cfg.width * 1.3, cfg.length * 1.15));
  const ugBloom = new THREE.Mesh(ugBloomGeo, materials.purpleBloom);
  ugBloom.rotation.x = -Math.PI / 2;
  ugBloom.position.set(0, -cfg.height + 0.0005, (cfg.toeOffset + cfg.heelOffset) * 0.5);
  footGroup.add(ugBloom);

  // ==========================================
  // 5. LAYER 4: SCULPTED WHITE CERAMIC DORSAL ARMOR SHIELD
  // ==========================================
  const dorsalGeo = geoCache.get('Foot_DorsalGeo', () => createDorsalArmorGeometry(
    cfg.dorsalPlate.width,
    cfg.dorsalPlate.length,
    cfg.dorsalPlate.thickness
  ));
  const dorsalArmor = new THREE.Mesh(dorsalGeo, materials.armor);
  dorsalArmor.name = side === -1 ? 'FootDorsalArmor_L' : 'FootDorsalArmor_R';
  dorsalArmor.rotation.x = Math.PI / 2 + 0.18; // Angled forward over the foot bridge
  dorsalArmor.position.set(0, -cfg.height * 0.42, 0.022);
  dorsalArmor.castShadow = true;
  dorsalArmor.receiveShadow = true;
  footGroup.add(dorsalArmor);

  // Tech groove with purple LED strip across dorsal armor with metallic bezel
  // Parented directly to dorsalArmor so it stays integrated during exploded view
  const dorsalFrontZ = cfg.dorsalPlate.thickness * 0.5;
  const dLedBezelGeo = geoCache.get('Foot_DLedBezelGeo', () => new THREE.BoxGeometry(0.0042, 0.054, 0.0022));
  const dLedBezel = new THREE.Mesh(dLedBezelGeo, materials.joint);
  dLedBezel.position.set(0, 0.005, dorsalFrontZ + 0.0010);
  dorsalArmor.add(dLedBezel);

  const dorsalLedGeo = geoCache.get('Foot_DorsalLedGeo', () => new THREE.BoxGeometry(0.0028, 0.052, 0.002));
  const dorsalLed = new THREE.Mesh(dorsalLedGeo, materials.purpleEmissive);
  dorsalLed.position.set(0, 0.005, dorsalFrontZ + 0.0018);
  dorsalArmor.add(dorsalLed);
  ledMeshes.push(dorsalLed);

  const dorsalCoreGeo = geoCache.get('Foot_DorsalCoreGeo', () => new THREE.BoxGeometry(0.0014, 0.048, 0.0015));
  const dorsalCore = new THREE.Mesh(dorsalCoreGeo, materials.whiteCoreEmissive);
  dorsalCore.position.set(0, 0.005, dorsalFrontZ + 0.0024);
  dorsalArmor.add(dorsalCore);

  // ==========================================
  // 6. LAYER 5: ARTICULATED TOE CAP ARMOR & PIVOT
  // ==========================================
  const toePivot = new THREE.Group();
  toePivot.name = side === -1 ? 'LeftToePivot' : 'RightToePivot';
  toePivot.position.set(0, -cfg.height + 0.016, cfg.toeOffset * 0.65);
  footGroup.add(toePivot);

  // Toe hinge knuckle connecting to foot chassis
  const toeHingeGeo = geoCache.get('Foot_ToeHingeGeo', () => new THREE.CylinderGeometry(0.0042, 0.0042, cfg.toeCap.width * 0.75, 16));
  const toeHinge = new THREE.Mesh(toeHingeGeo, materials.joint);
  toeHinge.rotation.z = Math.PI / 2;
  toeHinge.position.set(0, 0, 0);
  toePivot.add(toeHinge);

  const toeGeo = geoCache.get('Foot_ToeGeo', () => createToeCapGeometry(
    cfg.toeCap.width,
    cfg.toeCap.length,
    cfg.toeCap.height
  ));
  const toeArmor = new THREE.Mesh(toeGeo, materials.armor);
  toeArmor.name = side === -1 ? 'ToeArmor_L' : 'ToeArmor_R';
  toeArmor.rotation.x = Math.PI / 2;
  toeArmor.position.set(0, 0, cfg.toeCap.length * 0.35);
  toeArmor.castShadow = true;
  toeArmor.receiveShadow = true;
  toePivot.add(toeArmor);

  // ==========================================
  // 7. LAYER 6: REAR HEEL COUNTER & MICRO-THRUSTER NOZZLE
  // Matches reference screenshots 4 & 5 with rear circular purple thruster
  // ==========================================
  const heelGeo = geoCache.get('Foot_HeelGeo', () => {
    const heelShape = new THREE.Shape();
    heelShape.moveTo(-halfW * 0.72, 0);
    heelShape.lineTo(halfW * 0.72, 0);
    heelShape.quadraticCurveTo(halfW * 0.68, cfg.height * 0.65, 0, cfg.height * 0.72);
    heelShape.quadraticCurveTo(-halfW * 0.68, cfg.height * 0.65, -halfW * 0.72, 0);
    heelShape.closePath();

    const g = new THREE.ExtrudeGeometry(heelShape, {
      depth: 0.018,
      bevelEnabled: true,
      bevelThickness: 0.0025,
      bevelSize: 0.002,
      bevelSegments: 2,
    });
    g.center();
    return g;
  });

  const heelArmor = new THREE.Mesh(heelGeo, materials.armor);
  heelArmor.name = side === -1 ? 'HeelArmor_L' : 'HeelArmor_R';
  heelArmor.position.set(0, -cfg.height * 0.45, cfg.heelOffset + 0.002);
  heelArmor.castShadow = true;
  footGroup.add(heelArmor);

  // Achilles damper lower clevis bracket on rear heel counter
  const heelClevisGeo = geoCache.get('Foot_HeelClevisGeo', () => new THREE.BoxGeometry(0.012, 0.016, 0.014));
  const heelClevis = new THREE.Mesh(heelClevisGeo, materials.joint);
  heelClevis.position.set(0, -cfg.height * 0.28, cfg.heelOffset - 0.006);
  heelClevis.castShadow = true;
  footJointGroup.add(heelClevis);

  const heelPinGeo = geoCache.get('Foot_HeelPinGeo', () => new THREE.CylinderGeometry(0.0020, 0.0020, 0.016, 12));
  const heelPin = new THREE.Mesh(heelPinGeo, materials.metallic);
  heelPin.rotation.z = Math.PI / 2;
  heelPin.position.set(0, -cfg.height * 0.28, cfg.heelOffset - 0.006);
  footMetallicGroup.add(heelPin);

  // Micro-thruster exhaust nozzle at rear heel base (circular hub matching Images 4 & 5)
  const thrusterGeo = geoCache.get('Foot_ThrusterGeo', () => new THREE.CylinderGeometry(
    cfg.heelThruster.radius,
    cfg.heelThruster.radius * 1.18,
    cfg.heelThruster.depth,
    24
  ));
  const heelThruster = new THREE.Mesh(thrusterGeo, materials.joint);
  heelThruster.name = side === -1 ? 'HeelThruster_L' : 'HeelThruster_R';
  heelThruster.rotation.x = Math.PI / 2;
  heelThruster.position.set(0, -cfg.height + 0.016, cfg.heelOffset - 0.004);
  heelThruster.castShadow = true;
  footJointGroup.add(heelThruster);

  // Outer metallic nozzle bezel ring
  const nozzleRimGeo = geoCache.get('Foot_NozzleRimGeo', () => new THREE.TorusGeometry(cfg.heelThruster.radius * 1.12, 0.0016, 8, 24));
  const nozzleRim = new THREE.Mesh(nozzleRimGeo, materials.metallic);
  nozzleRim.position.set(0, -cfg.height + 0.016, cfg.heelOffset - 0.008);
  footMetallicGroup.add(nozzleRim);

  // Thruster interior purple glow ring (circular accent visible in Images 4 & 5)
  const nozzleGlowGeo = geoCache.get('Foot_NozzleGlowGeo', () => new THREE.TorusGeometry(cfg.heelThruster.radius * 0.68, 0.0018, 8, 24));
  const nozzleGlow = new THREE.Mesh(nozzleGlowGeo, materials.purpleEmissive);
  nozzleGlow.position.set(0, -cfg.height + 0.016, cfg.heelOffset - 0.010);
  tempFootLeds.add(nozzleGlow);

  // Central metallic exhaust cone inside thruster
  const exhaustConeGeo = geoCache.get('Foot_ExhaustConeGeo', () => new THREE.ConeGeometry(cfg.heelThruster.radius * 0.35, 0.006, 12));
  const exhaustCone = new THREE.Mesh(exhaustConeGeo, materials.metallic);
  exhaustCone.rotation.x = -Math.PI / 2;
  exhaustCone.position.set(0, -cfg.height + 0.016, cfg.heelOffset - 0.006);
  footMetallicGroup.add(exhaustCone);

  // Merge static joint sub-meshes in footJointGroup
  const mergedSole = mergeGroupMeshesByMaterial(footJointGroup, materials.joint, side === -1 ? 'FootJointMesh_L' : 'FootJointMesh_R', true) || soleChassis;

  const mergedFootMetallic = mergeGroupMeshesByMaterial(footMetallicGroup, materials.metallic, side === -1 ? 'FootMetallic_Merged_L' : 'FootMetallic_Merged_R', true);
  if (mergedFootMetallic) {
    footGroup.add(mergedFootMetallic);
  }

  const mergedFootLeds = mergeGroupMeshesByMaterial(tempFootLeds, materials.purpleEmissive, side === -1 ? 'FootLeds_Merged_L' : 'FootLeds_Merged_R', false, false) || underglowStripRaw;
  mergedFootLeds.name = side === -1 ? 'FootUnderglow_L' : 'FootUnderglow_R';
  footGroup.add(mergedFootLeds);
  ledMeshes.push(mergedFootLeds);

  return {
    group: footGroup,
    soleChassis: mergedSole,
    dorsalArmor,
    toePivot,
    toeArmor,
    heelArmor,
    heelThruster: mergedSole,
    treadPads,
    underglowStrip: mergedFootLeds,
    ledMeshes,
  };
}

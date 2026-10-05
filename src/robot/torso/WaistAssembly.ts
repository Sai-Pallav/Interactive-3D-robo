import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { TORSO_CONFIG } from './TorsoConfig';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger';

export interface HipConnectionNodes {
  group: THREE.Group;
  bracketArm: THREE.Mesh;
  rotaryHub: THREE.Mesh;
  accentRing: THREE.Mesh;
  hipCowl: THREE.Mesh;
  iliacCrestArmor?: THREE.Mesh;
  flankLight?: THREE.Mesh;
  ledMeshes: THREE.Mesh[];
}

export interface WaistActuatorNodes {
  group: THREE.Group;
  cylinder: THREE.Mesh;
  piston: THREE.Mesh;
  upperMount: THREE.Mesh;
  lowerMount: THREE.Mesh;
}

export interface WaistAssemblyNodes {
  group: THREE.Group;
  waistPivot: THREE.Group;
  upperWaistRing: THREE.Mesh;
  waistCore: THREE.Group;
  waistCoreHousing: THREE.Mesh;
  rotationalRing: THREE.Mesh;
  statorTeeth: THREE.Mesh[];
  lowerWaistRing: THREE.Mesh;
  leftActuator?: WaistActuatorNodes;
  rightActuator?: WaistActuatorNodes;
  hipConnection: THREE.Group;
  leftHipPivot: THREE.Group;
  rightHipPivot: THREE.Group;
  leftHip: HipConnectionNodes;
  rightHip: HipConnectionNodes;
  pelvicPlate: THREE.Mesh;
  pelvicAccentLight?: THREE.Mesh;
  ledMeshes: THREE.Mesh[];

  // Discrete nodes for mechanical & shell hierarchy
  pelvicIntakePocket?: THREE.Mesh;
  inguinalFlapLeft?: THREE.Mesh;
  inguinalFlapRight?: THREE.Mesh;
  subPelvisCradle?: THREE.Mesh;

  // Backward compatibility aliases
  waistCollar: THREE.Mesh;
  waistRing01: THREE.Mesh;
  waistRing02: THREE.Mesh;
  pelvicCore: THREE.Mesh;
}

/**
 * Creates smooth continuous collar contour geometry for waist rings.
 */
function createWaistCollarGeometry(
  rx: number,
  rz: number,
  height: number,
  thickness: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const frontW = rx * 0.55;
  const sideCornerX = rx * 0.90;
  const sideCornerZ = rz * 0.42;

  shape.moveTo(0, rz);
  shape.quadraticCurveTo(frontW * 0.40, rz * 0.99, frontW * 0.65, rz * 0.92);
  shape.quadraticCurveTo(sideCornerX * 0.92, sideCornerZ * 1.10, sideCornerX, sideCornerZ);
  shape.quadraticCurveTo(rx * 1.02, 0, rx * 0.96, -rz * 0.30);
  shape.quadraticCurveTo(rx * 0.85, -rz * 0.68, rx * 0.45, -rz * 0.86);
  shape.lineTo(0.024, -rz * 0.88);
  shape.quadraticCurveTo(0.012, -rz * 0.72, 0, -rz * 0.72);
  shape.quadraticCurveTo(-0.012, -rz * 0.72, -0.024, -rz * 0.88);
  shape.lineTo(-rx * 0.45, -rz * 0.86);
  shape.quadraticCurveTo(-rx * 0.85, -rz * 0.68, -rx * 0.96, -rz * 0.30);
  shape.quadraticCurveTo(-rx * 1.02, 0, -sideCornerX, sideCornerZ);
  shape.quadraticCurveTo(-sideCornerX * 0.92, sideCornerZ * 1.10, -frontW * 0.65, rz * 0.92);
  shape.quadraticCurveTo(-frontW * 0.40, rz * 0.99, 0, rz);
  shape.closePath();

  const hole = new THREE.Path();
  const irx = rx - thickness;
  const irz = rz - thickness;
  const ifrontW = frontW * 0.72;

  hole.moveTo(0, irz);
  hole.quadraticCurveTo(-ifrontW * 0.50, irz * 0.96, -irx * 0.82, irz * 0.35);
  hole.quadraticCurveTo(-irx * 0.95, -irz * 0.10, -irx * 0.78, -irz * 0.60);
  hole.lineTo(-0.018, -irz * 0.80);
  hole.lineTo(0.018, -irz * 0.80);
  hole.quadraticCurveTo(irx * 0.78, -irz * 0.60, irx * 0.95, -irz * 0.10);
  hole.quadraticCurveTo(irx * 0.82, irz * 0.35, ifrontW * 0.50, irz * 0.96);
  hole.closePath();
  shape.holes.push(hole);

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.0040,
    bevelSize: 0.0035,
    bevelSegments: 3,
    curveSegments: 32,
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.center();
  return geo;
}

/**
 * Creates an engineered hip connection point:
 * - Structural dark titanium bracket arm
 * - Dual-bearing rotary joint hub
 * - Concentric purple emissive accent ring
 * - Sculpted white ceramic hip cowl shield
 */
export function createSingleHipConnection(
  side: -1 | 1,
  materials: RobotMaterialPalette
): HipConnectionNodes {
  const group = new THREE.Group();
  group.name = side === -1 ? 'LeftHipPivot' : 'RightHipPivot';
  const cfg = TORSO_CONFIG.waist.hipConnector;
  group.position.set(side * cfg.mountX, cfg.mountY, cfg.mountZ);

  const ledMeshes: THREE.Mesh[] = [];

  // Structural wishbone mounting bracket
  const bracketShape = new THREE.Shape();
  bracketShape.moveTo(-side * 0.016, 0.022);
  bracketShape.lineTo(side * 0.010, 0.018);
  bracketShape.lineTo(side * 0.008, -0.012);
  bracketShape.lineTo(-side * 0.015, -0.014);
  bracketShape.closePath();

  const bracketHole = new THREE.Path();
  bracketHole.absarc(0, 0.003, 0.005, 0, Math.PI * 2, false);
  bracketShape.holes.push(bracketHole);

  const bracketGeo = new THREE.ExtrudeGeometry(bracketShape, {
    depth: 0.018,
    bevelEnabled: true,
    bevelThickness: 0.0022,
    bevelSize: 0.0018,
    bevelSegments: 2,
    curveSegments: 16,
  });
  bracketGeo.center();

  const tempJoint = new THREE.Group();

  const bracketArm = new THREE.Mesh(bracketGeo, materials.joint);
  bracketArm.name = 'HipBracketArm';
  bracketArm.castShadow = true;
  tempJoint.add(bracketArm);

  // Rotary Hub Joint
  const hubGeo = new THREE.CylinderGeometry(cfg.hubRadius, cfg.hubRadius, cfg.hubWidth, 24);
  const rotaryHub = new THREE.Mesh(hubGeo, materials.joint);
  rotaryHub.name = 'HipRotaryHub';
  rotaryHub.rotation.z = Math.PI / 2;
  rotaryHub.position.set(side * 0.014, -0.002, 0);
  rotaryHub.castShadow = true;
  tempJoint.add(rotaryHub);

  const mergedHipJoint = mergeGroupMeshesByMaterial(tempJoint, materials.joint, `HipRotary_Merged_${side < 0 ? 'L' : 'R'}`, false)!;
  mergedHipJoint.castShadow = true;
  group.add(mergedHipJoint);

  bracketGeo.dispose();
  hubGeo.dispose();

  // Purple Accent Ring
  const ringGeo = new THREE.TorusGeometry(cfg.accentRingRadius, 0.0016, 8, 28);
  const accentRing = new THREE.Mesh(ringGeo, materials.purpleEmissive);
  accentRing.name = 'HipAccentRing';
  accentRing.rotation.y = Math.PI / 2;
  accentRing.position.set(side * 0.023, -0.002, 0);
  group.add(accentRing);
  ledMeshes.push(accentRing);

  // White Ceramic Hip Cowl Armor Shield
  const cowlShape = new THREE.Shape();
  cowlShape.moveTo(0, 0.026);
  cowlShape.quadraticCurveTo(0.022, 0.020, 0.024, 0.004);
  cowlShape.lineTo(0.018, -0.034);
  cowlShape.quadraticCurveTo(0, -0.040, -0.014, -0.030);
  cowlShape.lineTo(-0.018, 0.010);
  cowlShape.closePath();

  const cowlGeo = new THREE.ExtrudeGeometry(cowlShape, {
    depth: 0.014,
    bevelEnabled: true,
    bevelThickness: 0.0035,
    bevelSize: 0.0028,
    bevelSegments: 3,
    curveSegments: 24,
  });
  cowlGeo.center();

  const hipCowl = new THREE.Mesh(cowlGeo, materials.armor);
  hipCowl.name = 'HipCowlArmor';
  hipCowl.position.set(side * 0.026, -0.004, 0.008);
  hipCowl.rotation.y = side * -0.22;
  hipCowl.castShadow = true;
  hipCowl.receiveShadow = true;
  group.add(hipCowl);

  return {
    group,
    bracketArm: mergedHipJoint,
    rotaryHub: mergedHipJoint,
    accentRing,
    hipCowl,
    ledMeshes,
  };
}

/**
 * REBUILT WAIST BEARING & PELVIS ASSEMBLY
 * - Solid physical mass that firmly supports the torso
 * - Upper waist plate mating with abdominal spine & actuators
 * - Substantial Rotational Bearing with outer white ceramic armor rim
 * - Polished metallic race track with gear stator teeth & continuous purple illuminated channel
 * - Lower bearing & pelvic cradle distributing load into hips and pelvis shield
 */
export function createWaistAssembly(materials: RobotMaterialPalette): WaistAssemblyNodes {
  const waistGroup = new THREE.Group();
  waistGroup.name = 'WaistAssembly';

  const waistPivot = new THREE.Group();
  waistPivot.name = 'WaistPivot';
  waistGroup.add(waistPivot);

  const cfg = TORSO_CONFIG.waist;
  const ledMeshes: THREE.Mesh[] = [];

  // ==========================================
  // 1. CENTRAL MECHANICAL WAIST CORE & BEARING
  // ==========================================
  const waistCoreGroup = new THREE.Group();
  waistCoreGroup.name = 'WaistCore';
  waistPivot.add(waistCoreGroup);

  const tempWaistCore = new THREE.Group();
  const tempMetallic = new THREE.Group();

  // Upper Waist Plate (Machined dark titanium mounting flange at y = -0.202)
  const urx = cfg.upperWaistRing.radiusX;
  const urz = cfg.upperWaistRing.radiusZ;
  const uGeo = createWaistCollarGeometry(urx, urz, cfg.upperWaistRing.height, 0.024);
  const upperWaistRing = new THREE.Mesh(uGeo, materials.joint);
  upperWaistRing.name = 'UpperWaistCollar';
  upperWaistRing.position.set(0, cfg.upperWaistRing.yOffset, -0.004);
  upperWaistRing.rotation.x = Math.PI / 2;
  tempWaistCore.add(upperWaistRing);

  // Lower Waist Plate (Spreads load into pelvic cradle at y = -0.228)
  const lrx = cfg.lowerWaistRing.radiusX;
  const lrz = cfg.lowerWaistRing.radiusZ;
  const lGeo = createWaistCollarGeometry(lrx, lrz, cfg.lowerWaistRing.height, 0.026);
  const lowerWaistRing = new THREE.Mesh(lGeo, materials.joint);
  lowerWaistRing.name = 'LowerWaistCollar';
  lowerWaistRing.position.set(0, cfg.lowerWaistRing.yOffset, -0.004);
  lowerWaistRing.rotation.x = Math.PI / 2;
  tempWaistCore.add(lowerWaistRing);

  // Stepped Conical Outer Housing (Smooth bearing core)
  const coreHousingGeo = new THREE.CylinderGeometry(
    cfg.waistCore.upperRadius,
    cfg.waistCore.lowerRadius,
    cfg.waistCore.height,
    36
  );
  const waistCoreHousing = new THREE.Mesh(coreHousingGeo, materials.joint);
  waistCoreHousing.name = 'WaistCoreHousing';
  waistCoreHousing.position.set(0, cfg.waistCore.yOffset, -0.004);
  waistCoreHousing.scale.set(1.05, 1.0, 0.88);
  tempWaistCore.add(waistCoreHousing);

  // Polished Metallic Rotational Bearing Race Track (Chrome Steel)
  const rotRingGeo = new THREE.TorusGeometry(cfg.waistCore.upperRadius * 1.06, 0.0045, 12, 36);
  const rotationalRing = new THREE.Mesh(rotRingGeo, materials.metallic);
  rotationalRing.name = 'WaistRotationalRing';
  rotationalRing.position.set(0, cfg.waistCore.yOffset, -0.004);
  rotationalRing.rotation.x = Math.PI / 2;
  rotationalRing.scale.set(1.05, 0.88, 1.0);
  tempMetallic.add(rotationalRing);

  // 18 Radial Stator Teeth around the bearing race
  const toothCount = 18;
  const statorR = cfg.waistCore.upperRadius * 1.06;
  const statorTeeth: THREE.Mesh[] = [];
  for (let i = 0; i < toothCount; i++) {
    const angle = (i / toothCount) * Math.PI * 2;
    const toothGeo = new THREE.BoxGeometry(0.0032, cfg.waistCore.height * 0.40, 0.0035);
    const tooth = new THREE.Mesh(toothGeo, materials.joint);
    tooth.position.set(
      Math.cos(angle) * statorR * 1.05,
      cfg.waistCore.yOffset,
      -0.004 + Math.sin(angle) * statorR * 0.88
    );
    tooth.rotation.y = -angle;
    tempWaistCore.add(tooth);
    statorTeeth.push(tooth);
  }

  // Central Inner Pass-through Spine Bore
  const innerBoreGeo = new THREE.CylinderGeometry(
    cfg.waistCore.innerBoreRadius,
    cfg.waistCore.innerBoreRadius,
    cfg.waistCore.height * 1.40,
    24
  );
  const innerBoreMesh = new THREE.Mesh(innerBoreGeo, materials.joint);
  innerBoreMesh.position.set(0, cfg.waistCore.yOffset, -0.004);
  tempWaistCore.add(innerBoreMesh);

  const waistCoreMerged = mergeGroupMeshesByMaterial(tempWaistCore, materials.joint, 'WaistCore_Merged', false, true)!;
  tempWaistCore.traverse((child) => {
    if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).geometry) {
      (child as THREE.Mesh).geometry.dispose();
    }
  });
  waistCoreGroup.add(waistCoreMerged);

  const waistMetallicMerged = mergeGroupMeshesByMaterial(tempMetallic, materials.metallic, 'WaistMetallic_Merged', false);
  if (waistMetallicMerged) {
    waistMetallicMerged.castShadow = true;
    waistMetallicMerged.receiveShadow = true;
    waistCoreGroup.add(waistMetallicMerged);
  }

  // ==========================================
  // 2. WAIST CORE ACCENT RINGS
  // ==========================================

  // Dual Purple Emissive Core Accent Rings inside the bearing channel
  const accentGroup = new THREE.Group();
  for (const yOff of [0.006, -0.006]) {
    const accentRaceGeo = new THREE.TorusGeometry(cfg.waistCore.upperRadius * 1.04, 0.0016, 8, 36);
    const accentRace = new THREE.Mesh(accentRaceGeo, materials.purpleEmissive);
    accentRace.rotation.x = Math.PI / 2;
    accentRace.position.set(0, cfg.waistCore.yOffset + yOff, -0.004);
    accentRace.scale.set(1.05, 0.88, 1.0);
    accentGroup.add(accentRace);
  }

  const mergedWaistAccents = mergeGroupMeshesByMaterial(accentGroup, materials.purpleEmissive, 'WaistCoreAccentRings_Merged', false, false);
  if (mergedWaistAccents) {
    waistCoreGroup.add(mergedWaistAccents);
    ledMeshes.push(mergedWaistAccents);
  }

  // ==========================================
  // 3. HIP CONNECTIONS & PELVIC SHIELD
  // ==========================================
  const hipConnectionGroup = new THREE.Group();
  hipConnectionGroup.name = 'HipConnection';
  waistPivot.add(hipConnectionGroup);

  const leftHip = createSingleHipConnection(-1, materials);
  hipConnectionGroup.add(leftHip.group);
  ledMeshes.push(...leftHip.ledMeshes);

  const rightHip = createSingleHipConnection(1, materials);
  hipConnectionGroup.add(rightHip.group);
  ledMeshes.push(...rightHip.ledMeshes);

  // Pelvic Front Armor Shield Plate (Multi-faceted groin shield)
  const pelvicPlateShape = new THREE.Shape();
  pelvicPlateShape.moveTo(-0.046, 0.026);
  pelvicPlateShape.quadraticCurveTo(0, 0.030, 0.046, 0.026);
  pelvicPlateShape.lineTo(0.040, -0.016);
  pelvicPlateShape.lineTo(0.024, -0.050);
  pelvicPlateShape.quadraticCurveTo(0, -0.062, -0.024, -0.050);
  pelvicPlateShape.lineTo(-0.040, -0.016);
  pelvicPlateShape.closePath();

  const intakeWindow = new THREE.Path();
  intakeWindow.moveTo(-0.022, 0.015);
  intakeWindow.lineTo(0.022, 0.015);
  intakeWindow.lineTo(0.020, 0.007);
  intakeWindow.lineTo(-0.020, 0.007);
  intakeWindow.closePath();
  pelvicPlateShape.holes.push(intakeWindow);

  const plateGeo = new THREE.ExtrudeGeometry(pelvicPlateShape, {
    depth: 0.016,
    bevelEnabled: true,
    bevelThickness: 0.0040,
    bevelSize: 0.0032,
    bevelSegments: 3,
    curveSegments: 28,
  });
  plateGeo.center();

  const pPos = plateGeo.attributes.position;
  for (let i = 0; i < pPos.count; i++) {
    const x = pPos.getX(i);
    const y = pPos.getY(i);
    const z = pPos.getZ(i);
    if (z > 0) {
      const keel = (1.0 - Math.min(1.0, Math.abs(x) / 0.046)) * 0.007;
      const thrust = (y < 0) ? Math.sin(-y * 18) * 0.003 : 0;
      pPos.setZ(i, z + keel + thrust);
    }
  }
  plateGeo.computeVertexNormals();

  const pelvicPlate = new THREE.Mesh(plateGeo, materials.armor);
  pelvicPlate.name = 'PelvicShieldPlate';
  pelvicPlate.position.set(0, -0.273, 0.046);
  pelvicPlate.rotation.x = -0.02;
  pelvicPlate.castShadow = true;
  pelvicPlate.receiveShadow = true;
  hipConnectionGroup.add(pelvicPlate);

  // Recessed dark titanium intake scoop pocket
  const intakePocketGeo = new THREE.BoxGeometry(0.042, 0.009, 0.008);
  const intakeGroup = new THREE.Group();
  const rawIntake = new THREE.Mesh(intakePocketGeo, materials.joint);
  intakeGroup.add(rawIntake);

  for (const lY of [-0.002, 0.002]) {
    const louverGeo = new THREE.BoxGeometry(0.038, 0.0008, 0.006);
    const louver = new THREE.Mesh(louverGeo, materials.joint);
    louver.position.set(0, lY, 0.002);
    intakeGroup.add(louver);
  }

  const pelvicIntakePocket = mergeGroupMeshesByMaterial(intakeGroup, materials.joint, 'PelvicIntake_Merged', false)!;
  pelvicIntakePocket.name = 'PelvicIntakePocket';
  pelvicIntakePocket.position.set(0, 0.011, 0.005);
  pelvicPlate.add(pelvicIntakePocket);

  // Violet emissive LED slit inside intake
  const pelvicLightGeo = new THREE.BoxGeometry(0.036, 0.0022, 0.003);
  const pelvicAccentLight = new THREE.Mesh(pelvicLightGeo, materials.purpleEmissive);
  pelvicAccentLight.name = 'PelvicAccentLight';
  pelvicAccentLight.position.set(0, 0.011, 0.009);
  pelvicPlate.add(pelvicAccentLight);
  ledMeshes.push(pelvicAccentLight);

  // Left & Right Inguinal Armor Flaps
  function createInguinalFlap(fSide: -1 | 1): THREE.Mesh {
    const flapShape = new THREE.Shape();
    flapShape.moveTo(0, 0.022);
    flapShape.quadraticCurveTo(0.018, 0.018, 0.020, 0.012);
    flapShape.lineTo(0.016, -0.028);
    flapShape.quadraticCurveTo(0.004, -0.036, -0.004, -0.034);
    flapShape.lineTo(-0.014, 0.010);
    flapShape.closePath();

    const flapGeo = new THREE.ExtrudeGeometry(flapShape, {
      depth: 0.009,
      bevelEnabled: true,
      bevelThickness: 0.0028,
      bevelSize: 0.0022,
      bevelSegments: 2,
      curveSegments: 20,
    });
    flapGeo.center();

    const flapMesh = new THREE.Mesh(flapGeo, materials.armor);
    flapMesh.name = `InguinalFlap_${fSide === -1 ? 'L' : 'R'}`;
    flapMesh.position.set(fSide * 0.046, -0.269, 0.038);
    flapMesh.rotation.y = fSide * -0.26;
    flapMesh.rotation.x = -0.04;
    flapMesh.castShadow = true;
    flapMesh.receiveShadow = true;

    const clevisGeo = new THREE.CylinderGeometry(0.0035, 0.0035, 0.010, 12);
    const clevis = new THREE.Mesh(clevisGeo, materials.joint);
    clevis.rotation.z = Math.PI / 2;
    clevis.position.set(0, 0.020, 0);
    flapMesh.add(clevis);

    return flapMesh;
  }

  const inguinalFlapLeft = createInguinalFlap(-1);
  hipConnectionGroup.add(inguinalFlapLeft);

  const inguinalFlapRight = createInguinalFlap(1);
  hipConnectionGroup.add(inguinalFlapRight);

  // Sub-Pelvic Mechanical Cradle (Dark Titanium Frame connecting lower waist to hips)
  const cradleGeo = new THREE.CylinderGeometry(0.046, 0.038, 0.036, 28);
  const cradleGroup = new THREE.Group();
  const rawCradle = new THREE.Mesh(cradleGeo, materials.joint);
  rawCradle.scale.set(1.15, 1.0, 0.85);
  cradleGroup.add(rawCradle);

  for (let i = 0; i < 3; i++) {
    const ribGeo = new THREE.BoxGeometry(0.042 - i * 0.006, 0.003, 0.006);
    const rib = new THREE.Mesh(ribGeo, materials.joint);
    rib.position.set(0, -0.008 - i * 0.008, 0.026);
    cradleGroup.add(rib);
  }

  const subPelvisCradle = mergeGroupMeshesByMaterial(cradleGroup, materials.joint, 'SubPelvisCradle_Merged', false)!;
  subPelvisCradle.name = 'SubPelvisCradle';
  subPelvisCradle.position.set(0, -0.259, 0.010);
  subPelvisCradle.castShadow = true;
  hipConnectionGroup.add(subPelvisCradle);

  return {
    group: waistGroup,
    waistPivot,
    upperWaistRing,
    waistCore: waistCoreGroup,
    waistCoreHousing,
    rotationalRing,
    statorTeeth,
    lowerWaistRing,
    hipConnection: hipConnectionGroup,
    leftHipPivot: leftHip.group,
    rightHipPivot: rightHip.group,
    leftHip,
    rightHip,
    pelvicPlate,
    pelvicAccentLight,
    pelvicIntakePocket,
    inguinalFlapLeft,
    inguinalFlapRight,
    subPelvisCradle,
    waistCollar: upperWaistRing,
    waistRing01: upperWaistRing,
    waistRing02: lowerWaistRing,
    pelvicCore: subPelvisCradle,
    ledMeshes,
  };
}

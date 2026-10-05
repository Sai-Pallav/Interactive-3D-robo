/**
 * ============================================================================
 * PART 4 — MULTI-AXIS SHOULDER JOINT & CIRCULAR BEARING MECHANISM (IMAGE 2 MASTER)
 * ============================================================================
 *
 * Exact mechanical reconstruction adhering strictly to IMAGE 2 and Corrections 01, 02, 04, 20-22:
 * - Substantial circular mechanical module extending outward from chest (D = 106mm, R = 53mm).
 * - Fully exposed stepped dark titanium bearing housing facing laterally outward.
 * - Concentric metallic crossed-roller bearing rings and 16 radial hex socket screws.
 * - Vibrant circular purple emissive LED halo ring nested inside the stepped bearing channel.
 * - Heavy-duty central axle hub with deep hollow bearing race and 12-bolt arm mounting flange.
 * - Black structural frame / yoke linking joint into the upper arm core.
 *
 * Visual Hierarchy:
 *   WHITE SHOULDER COWL (Overhead mantle)
 *         ↓
 *   DELIBERATE BLACK STRUCTURAL GAP (5mm clearance)
 *         ↓
 *   METALLIC CROSSED-ROLLER BEARING RINGS & PURPLE LED HALO
 *         ↓
 *   STEPPED DARK TITANIUM MECHANICAL CORE & AXLE
 *
 * Parametrically mirrored for Left (side = -1) and Right (side = 1).
 * ============================================================================
 */

import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { mergeAllGroupMeshesByMaterial } from '../utils/geometryMerger';
import { geoCache } from '../utils/GeometryCache';

export interface MultiAxisShoulderJointNodes {
  foundation: THREE.Group;
  shoulderJoint: THREE.Group;
  primaryAxisPivot: THREE.Group;
  secondaryAxisCarrier: THREE.Group;
  secondaryAxisPivot: THREE.Group;
  armMount: THREE.Group;
  armMountingFlange: THREE.Mesh;
  bearingHousing: THREE.Mesh;
  accentRing: THREE.Mesh;
  driveHub: THREE.Mesh;
  stationaryCollar: THREE.Mesh;
  upperLink: THREE.Group;
  lowerLink: THREE.Group;
  ledMeshes: THREE.Mesh[];
  blackPlateBetweenShellAndRotational?: THREE.Mesh | THREE.Group;
}

/**
 * Creates the stationary mounting collar and inboard anchor clevises.
 * Bridges the chest extension module (X ≈ ±0.19m) to the active shoulder joint (X ≈ ±0.24m).
 */
function createStationaryMountingCollar(
  side: -1 | 1,
  materials: RobotMaterialPalette,
  ledMeshes: THREE.Mesh[]
): {
  collarMesh: THREE.Mesh;
  anchorGroup: THREE.Group;
  upperAnchorPos: THREE.Vector3;
  lowerAnchorPos: THREE.Vector3;
} {
  const anchorGroup = new THREE.Group();
  anchorGroup.name = side === -1 ? 'StationaryAnchorGroup_L' : 'StationaryAnchorGroup_R';

  const collarR = 0.0460;
  const collarLen = 0.0400; // Progressively deeper sleeve extending into torso socket

  // 1. Heavy-duty dark titanium mounting collar sleeve seated in chest socket
  const collarGeo = geoCache.get('Shoulder_CollarGeo', () => {
    const g = new THREE.CylinderGeometry(collarR * 0.96, collarR, collarLen, 40);
    g.rotateZ(Math.PI / 2);
    return g;
  });
  const collarMesh = new THREE.Mesh(collarGeo, materials.joint);
  collarMesh.name = side === -1 ? 'StationaryShoulderCollar_L' : 'StationaryShoulderCollar_R';
  collarMesh.position.set(-side * 0.022, 0, 0);
  collarMesh.castShadow = true;
  collarMesh.receiveShadow = true;
  anchorGroup.add(collarMesh);

  // 2. Stepped inner metallic bearing seat ring
  const seatGeo = geoCache.get('Shoulder_SeatGeo', () => {
    const g = new THREE.CylinderGeometry(collarR * 0.91, collarR * 0.91, 0.008, 36);
    g.rotateZ(Math.PI / 2);
    return g;
  });
  const seatMesh = new THREE.Mesh(seatGeo, materials.metallic);
  seatMesh.position.set(-side * 0.026, 0, 0);
  anchorGroup.add(seatMesh);

  // Concentric signature purple accent ring inside the black neck
  const neckPurpleGeo = geoCache.get('Shoulder_NeckPurpleGeo', () => {
    const g = new THREE.TorusGeometry(collarR * 0.93, 0.0012, 8, 36);
    g.rotateY(Math.PI / 2);
    return g;
  });
  const neckPurple = new THREE.Mesh(neckPurpleGeo, materials.purpleEmissive);
  neckPurple.name = side === -1 ? 'LeftShoulderNeckLed' : 'RightShoulderNeckLed';
  neckPurple.position.set(-side * 0.019, 0, 0);
  anchorGroup.add(neckPurple);
  ledMeshes.push(neckPurple);

  const neckBloomGeo = geoCache.get('Shoulder_NeckBloomGeo', () => {
    const g = new THREE.TorusGeometry(collarR * 0.93, 0.0024, 6, 36);
    g.rotateY(Math.PI / 2);
    return g;
  });
  const neckBloom = new THREE.Mesh(neckBloomGeo, materials.purpleBloom);
  neckBloom.position.copy(neckPurple.position);
  anchorGroup.add(neckBloom);

  // 3. Perimeter socket cap screws (12 bolt pattern)
  const boltGeo = geoCache.get('Shoulder_CollarBoltGeo', () => {
    const g = new THREE.CylinderGeometry(0.0014, 0.0014, 0.005, 6);
    g.rotateZ(Math.PI / 2);
    return g;
  });
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const bolt = new THREE.Mesh(boltGeo, materials.joint);
    bolt.position.set(
      -side * 0.022,
      Math.sin(angle) * (collarR * 0.88),
      Math.cos(angle) * (collarR * 0.88)
    );
    anchorGroup.add(bolt);
  }

  // 4. Upper Link Anchor Clevis Lug (Top-Rear quadrant)
  const upperAnchorPos = new THREE.Vector3(-side * 0.014, 0.032, -0.020);
  const clevisGeo = geoCache.get('Shoulder_AnchorClevisGeo', () => new THREE.BoxGeometry(0.012, 0.014, 0.012));
  const clevisUpper = new THREE.Mesh(clevisGeo, materials.joint);
  clevisUpper.position.copy(upperAnchorPos);
  clevisUpper.castShadow = true;
  anchorGroup.add(clevisUpper);

  const pinGeo = geoCache.get('Shoulder_AnchorPinGeo', () => {
    const g = new THREE.CylinderGeometry(0.0028, 0.0028, 0.015, 16);
    g.rotateZ(Math.PI / 2);
    return g;
  });
  const pinUpper = new THREE.Mesh(pinGeo, materials.metallic);
  pinUpper.position.copy(clevisUpper.position);
  anchorGroup.add(pinUpper);

  // 5. Lower Link Anchor Clevis Lug (Bottom-Rear quadrant)
  const lowerAnchorPos = new THREE.Vector3(-side * 0.014, -0.030, -0.020);
  const clevisLower = new THREE.Mesh(clevisGeo, materials.joint);
  clevisLower.position.copy(lowerAnchorPos);
  clevisLower.castShadow = true;
  anchorGroup.add(clevisLower);

  const pinLower = new THREE.Mesh(pinGeo, materials.metallic);
  pinLower.position.copy(clevisLower.position);
  anchorGroup.add(pinLower);

  mergeAllGroupMeshesByMaterial(anchorGroup, {
    excludeNames: [neckPurple.name],
    namePrefix: anchorGroup.name,
  });
  const collarMeshRef = (anchorGroup.children.find(c => (c as THREE.Mesh).isMesh && (c as THREE.Mesh).name.includes('joint')) as THREE.Mesh) || collarMesh;

  return {
    collarMesh: collarMeshRef,
    anchorGroup,
    upperAnchorPos,
    lowerAnchorPos,
  };
}

/**
 * Creates the compact stepped dark titanium bearing housing & concentric purple emissive ring.
 * Scaled to precision engineered proportion (R = 46.5mm, Diameter = 93mm).
 */
function createBearingHousing(
  side: -1 | 1,
  materials: RobotMaterialPalette,
  ledMeshes: THREE.Mesh[]
): {
  housingGroup: THREE.Group;
  housingMesh: THREE.Mesh;
  accentRing: THREE.Mesh;
  blackPlate: THREE.Mesh;
} {
  const housingGroup = new THREE.Group();
  housingGroup.name = side === -1 ? 'BearingHousingGroup_L' : 'BearingHousingGroup_R';

  // 1. EXTENDED OUTBOARD ROTATIONAL ASSEMBLY (Prominence offset +0.0055m outward)
  const EXT = 0.0055;
  const outerRadius = 0.0465;
  const innerBoreRadius = 0.0300;
  const plateOuterR = 0.0488; // Matches inner curvature of the white pauldron hood

  // ─── TIER 1: OUTBOARD ROTATIONAL ASSEMBLY (Face extended to X ≈ ±0.0250) ───
  // Outer stepped retention collar with crisp chamfer
  const fwdGeo = geoCache.get('Shoulder_FwdHousingGeo', () => {
    const fwdShape = new THREE.Shape();
    fwdShape.absarc(0, 0, outerRadius * 0.94, 0, Math.PI * 2, false);
    const fwdHole = new THREE.Path();
    fwdHole.absarc(0, 0, innerBoreRadius, 0, Math.PI * 2, true);
    fwdShape.holes.push(fwdHole);

    const g = new THREE.ExtrudeGeometry(fwdShape, {
      depth: 0.014,
      bevelEnabled: true,
      bevelThickness: 0.0016,
      bevelSize: 0.0014,
      bevelSegments: 2,
      curveSegments: 44,
    });
    g.center();
    return g;
  });
  const housingMesh = new THREE.Mesh(fwdGeo, materials.joint);
  housingMesh.name = side === -1 ? 'BearingHousingMesh_L' : 'BearingHousingMesh_R';
  housingMesh.rotation.y = Math.PI / 2;
  housingMesh.position.set(side * (0.012 + EXT), 0, 0); // Positioned at side * 0.0175, spans to 0.0245
  housingMesh.castShadow = true;
  housingMesh.receiveShadow = true;
  housingGroup.add(housingMesh);

  // Polished metallic crossed-roller bearing race ring (outer rim)
  const lipGeo = geoCache.get('Shoulder_LipRaceGeo', () => {
    const g = new THREE.TorusGeometry(outerRadius * 0.95, 0.0018, 10, 44);
    g.rotateY(Math.PI / 2);
    return g;
  });
  const lip = new THREE.Mesh(lipGeo, materials.metallic);
  lip.position.set(side * (0.018 + EXT), 0, 0); // side * 0.0235
  housingGroup.add(lip);

  // Intermediate polished steel raceway ring
  const raceGeo = geoCache.get('Shoulder_SteelRaceGeo', () => {
    const g = new THREE.TorusGeometry(outerRadius * 0.82, 0.0015, 8, 40);
    g.rotateY(Math.PI / 2);
    return g;
  });
  const race = new THREE.Mesh(raceGeo, materials.metallic);
  race.position.set(side * (0.019 + EXT), 0, 0); // side * 0.0245
  housingGroup.add(race);

  // 16 Precision Radial Hex Socket Screws around the outer housing step
  const boltCount = 16;
  const boltPitch = outerRadius * 0.88;
  const screwGeo = geoCache.get('Shoulder_RadialScrewGeo', () => {
    const g = new THREE.CylinderGeometry(0.0012, 0.0012, 0.004, 6);
    g.rotateZ(Math.PI / 2);
    return g;
  });
  for (let s = 0; s < boltCount; s++) {
    const angle = (s / boltCount) * Math.PI * 2;
    const screw = new THREE.Mesh(screwGeo, materials.metallic);
    screw.position.set(
      side * (0.019 + EXT),
      Math.sin(angle) * boltPitch,
      Math.cos(angle) * boltPitch
    );
    housingGroup.add(screw);
  }

  // Concentric Vibrant Purple Emissive Energy Ring (Recessed inside stepped bearing channel)
  const ringRadius = 0.0385;
  const accentRingGeo = geoCache.get('Shoulder_AccentRingGeo', () => {
    const g = new THREE.TorusGeometry(ringRadius, 0.0030, 14, 44);
    g.rotateY(Math.PI / 2);
    return g;
  });
  const accentRing = new THREE.Mesh(accentRingGeo, materials.purpleEmissive);
  accentRing.name = side === -1 ? 'ShoulderEnergyRing_L' : 'ShoulderEnergyRing_R';
  accentRing.position.set(side * (0.0195 + EXT), 0, 0); // side * 0.0250
  housingGroup.add(accentRing);
  ledMeshes.push(accentRing);

  // 12 Radial encoder slots across the rotation ring channel
  const toothGeo = geoCache.get('Shoulder_ToothGeo', () => new THREE.BoxGeometry(0.0016, 0.0050, 0.0018));
  for (let t = 0; t < 12; t++) {
    const angle = (t / 12) * Math.PI * 2;
    const tooth = new THREE.Mesh(toothGeo, materials.joint);
    tooth.position.set(
      side * (0.0195 + EXT),
      Math.sin(angle) * ringRadius,
      Math.cos(angle) * ringRadius
    );
    tooth.rotation.x = angle;
    housingGroup.add(tooth);
  }

  // Outer Bloom Ring for high-intensity neon bloom glow
  const bloomGeo = geoCache.get('Shoulder_BloomRingGeo', () => {
    const g = new THREE.TorusGeometry(ringRadius, 0.0055, 8, 44);
    g.rotateY(Math.PI / 2);
    return g;
  });
  const bloom = new THREE.Mesh(bloomGeo, materials.purpleBloom);
  bloom.position.copy(accentRing.position);
  housingGroup.add(bloom);

  // Thin White Ceramic Pinstripe Ring
  const whitePinstripeGeo = geoCache.get('Shoulder_WhitePinstripeGeo', () => {
    const g = new THREE.TorusGeometry(ringRadius + 0.0034, 0.0009, 8, 44);
    g.rotateY(Math.PI / 2);
    return g;
  });
  const whitePinstripe = new THREE.Mesh(whitePinstripeGeo, materials.armor);
  whitePinstripe.position.set(side * (0.0192 + EXT), 0, 0); // side * 0.0247
  housingGroup.add(whitePinstripe);

  // Deep dark recessed backing trough for the purple ring
  const troughGeo = geoCache.get('Shoulder_TroughGeo', () => {
    const g = new THREE.TorusGeometry(ringRadius, 0.0040, 8, 44);
    g.rotateY(Math.PI / 2);
    return g;
  });
  const trough = new THREE.Mesh(troughGeo, materials.joint);
  trough.position.set(side * (0.0175 + EXT), 0, 0); // side * 0.0230
  housingGroup.add(trough);

  // ─── TIER 2: INTERMEDIATE STEPPED LABYRINTH SEAL HOUSING (X ≈ side * 0.010) ───
  const plateGeo = geoCache.get('Shoulder_LabyrinthPlateGeo', () => {
    const plateShape = new THREE.Shape();
    plateShape.absarc(0, 0, plateOuterR, 0, Math.PI * 2, false);
    const plateHole = new THREE.Path();
    plateHole.absarc(0, 0, innerBoreRadius, 0, Math.PI * 2, true);
    plateShape.holes.push(plateHole);

    const g = new THREE.ExtrudeGeometry(plateShape, {
      depth: 0.015,
      bevelEnabled: true,
      bevelThickness: 0.0016,
      bevelSize: 0.0014,
      bevelSegments: 2,
      curveSegments: 44,
    });
    g.center();
    return g;
  });
  const blackPlate = new THREE.Mesh(plateGeo, materials.joint);
  blackPlate.name = side === -1 ? 'LeftShoulderBlackPlateBetweenShellAndRotational' : 'RightShoulderBlackPlateBetweenShellAndRotational';
  blackPlate.rotation.y = Math.PI / 2;
  blackPlate.position.set(side * 0.010, 0, 0); // spans side * 0.0025 to side * 0.0175
  blackPlate.castShadow = true;
  blackPlate.receiveShadow = true;
  housingGroup.add(blackPlate);

  // Metallic Labyrinth Seal Ring on Tier 2
  const labGeo = geoCache.get('Shoulder_LabyrinthRingGeo', () => {
    const g = new THREE.TorusGeometry(outerRadius * 0.98, 0.0014, 8, 44);
    g.rotateY(Math.PI / 2);
    return g;
  });
  const labMesh = new THREE.Mesh(labGeo, materials.metallic);
  labMesh.position.set(side * 0.0145, 0, 0);
  housingGroup.add(labMesh);

  // ─── TIER 3: DEEP MECHANICAL ACTUATOR BARREL (X ≈ -side * 0.004, length 18mm) ───
  const barrelGeo = geoCache.get('Shoulder_ActuatorBarrelGeo', () => {
    const barrelShape = new THREE.Shape();
    barrelShape.absarc(0, 0, outerRadius * 0.99, 0, Math.PI * 2, false);
    const barrelHole = new THREE.Path();
    barrelHole.absarc(0, 0, innerBoreRadius, 0, Math.PI * 2, true);
    barrelShape.holes.push(barrelHole);

    const g = new THREE.ExtrudeGeometry(barrelShape, {
      depth: 0.018,
      bevelEnabled: true,
      bevelThickness: 0.0014,
      bevelSize: 0.0012,
      bevelSegments: 2,
      curveSegments: 44,
    });
    g.center();
    return g;
  });
  const barrelMesh = new THREE.Mesh(barrelGeo, materials.joint);
  barrelMesh.rotation.y = Math.PI / 2;
  barrelMesh.position.set(-side * 0.003, 0, 0); // spans -side * 0.012 to side * 0.006
  barrelMesh.castShadow = true;
  barrelMesh.receiveShadow = true;
  housingGroup.add(barrelMesh);

  // 16 Axial Cooling Flutes around the Tier 3 barrel
  const fluteGeo = geoCache.get('Shoulder_FluteGeo', () => new THREE.BoxGeometry(0.014, 0.0018, 0.0018));
  for (let f = 0; f < 16; f++) {
    const angle = (f / 16) * Math.PI * 2;
    const flute = new THREE.Mesh(fluteGeo, materials.jointDoubleSide);
    flute.position.set(
      -side * 0.003,
      Math.sin(angle) * (outerRadius * 0.975),
      Math.cos(angle) * (outerRadius * 0.975)
    );
    flute.rotation.x = angle;
    housingGroup.add(flute);
  }

  // ─── TIER 4: DEEP INBOARD STRUCTURAL TELESCOPING SLEEVE (X ≈ -side * 0.018, length 24mm) ───
  const deepGeo = geoCache.get('Shoulder_DeepSleeveGeo', () => {
    const g = new THREE.CylinderGeometry(outerRadius * 0.95, outerRadius * 0.93, 0.024, 40);
    g.rotateZ(Math.PI / 2);
    return g;
  });
  const deepMesh = new THREE.Mesh(deepGeo, materials.joint);
  deepMesh.position.set(-side * 0.018, 0, 0); // spans -side * 0.030 to -side * 0.006
  deepMesh.castShadow = true;
  deepMesh.receiveShadow = true;
  housingGroup.add(deepMesh);

  // Intermediate Metallic Bearing Seat Ring between Tier 3 & Tier 4
  const seatRingGeo = geoCache.get('Shoulder_IntermediateSeatRingGeo', () => {
    const g = new THREE.TorusGeometry(outerRadius * 0.94, 0.0016, 8, 40);
    g.rotateY(Math.PI / 2);
    return g;
  });
  const seatRing = new THREE.Mesh(seatRingGeo, materials.metallic);
  seatRing.position.set(-side * 0.008, 0, 0);
  housingGroup.add(seatRing);

  mergeAllGroupMeshesByMaterial(housingGroup, {
    excludeNames: [accentRing.name],
    namePrefix: housingGroup.name,
  });
  const housingMeshRef = (housingGroup.children.find(c => (c as THREE.Mesh).isMesh && (c as THREE.Mesh).name.includes('joint')) as THREE.Mesh) || housingMesh;

  return {
    housingGroup,
    housingMesh: housingMeshRef,
    accentRing,
    blackPlate: housingMeshRef,
  };
}

/**
 * Creates the central rotating hub & drive splines (Callout 3).
 * Includes the lateral pivot bracket with purple accent band matching the reference image.
 */
function createPrimaryRotationHub(
  side: -1 | 1,
  materials: RobotMaterialPalette,
  ledMeshes: THREE.Mesh[]
): { hubGroup: THREE.Group; driveHub: THREE.Mesh } {
  const hubGroup = new THREE.Group();
  hubGroup.name = side === -1 ? 'PrimaryHubGroup_L' : 'PrimaryHubGroup_R';

  const hubRadius = 0.0265;
  const hubDepth = 0.016;

  // 1. Central Rotating Journal Core (Extended with rotational face to X ≈ ±0.0250)
  const hubGeo = geoCache.get('Shoulder_PrimaryHubGeo', () => {
    const g = new THREE.CylinderGeometry(hubRadius, hubRadius * 0.96, hubDepth, 36);
    g.rotateZ(Math.PI / 2);
    return g;
  });
  const driveHub = new THREE.Mesh(hubGeo, materials.joint);
  driveHub.name = side === -1 ? 'PrimaryDriveHub_L' : 'PrimaryDriveHub_R';
  driveHub.position.set(side * 0.0245, 0, 0);
  driveHub.castShadow = true;
  driveHub.receiveShadow = true;
  hubGroup.add(driveHub);

  // 2. Polished Metallic Inner Bevel Ring
  const bevelRingGeo = geoCache.get('Shoulder_BevelRingGeo', () => {
    const g = new THREE.TorusGeometry(hubRadius * 0.94, 0.0013, 8, 32);
    g.rotateY(Math.PI / 2);
    return g;
  });
  const bevelRing = new THREE.Mesh(bevelRingGeo, materials.metallic);
  bevelRing.position.set(side * (0.0245 + hubDepth * 0.48), 0, 0);
  hubGroup.add(bevelRing);

  // 3. 16 Axial Rotary Drive Splines around the hub circumference
  const splineCount = 16;
  const splineGeo = geoCache.get('Shoulder_SplineGeo', () => new THREE.BoxGeometry(hubDepth * 0.85, 0.0018, 0.0028));
  for (let i = 0; i < splineCount; i++) {
    const angle = (i / splineCount) * Math.PI * 2;
    const spline = new THREE.Mesh(splineGeo, materials.joint);
    spline.position.set(
      side * 0.0245,
      Math.sin(angle) * (hubRadius * 0.98),
      Math.cos(angle) * (hubRadius * 0.98)
    );
    spline.rotation.x = angle;
    hubGroup.add(spline);
  }

  // 4. Central axle bore rim
  const innerBoreGeo = geoCache.get('Shoulder_InnerBoreGeo', () => {
    const g = new THREE.CylinderGeometry(0.014, 0.014, 0.018, 28);
    g.rotateZ(Math.PI / 2);
    return g;
  });
  const innerBore = new THREE.Mesh(innerBoreGeo, materials.metallic);
  innerBore.position.set(side * 0.018, 0, 0);
  hubGroup.add(innerBore);

  // 5. Lateral Pivot Bracket & Purple Accent Ring
  const pivotBlockGeo = geoCache.get('Shoulder_PivotBlockGeo', () => new THREE.CylinderGeometry(0.0048, 0.0048, 0.016, 18));
  const pivotBlock = new THREE.Mesh(pivotBlockGeo, materials.joint);
  pivotBlock.position.set(side * 0.0305, 0.002, 0.010);
  pivotBlock.castShadow = true;
  hubGroup.add(pivotBlock);

  const pivotRingGeo = geoCache.get('Shoulder_PivotRingGeo', () => new THREE.TorusGeometry(0.0052, 0.0011, 8, 20));
  const pivotRing = new THREE.Mesh(pivotRingGeo, materials.purpleEmissive);
  pivotRing.name = side === -1 ? 'PrimaryPivotRing_L' : 'PrimaryPivotRing_R';
  hubGroup.add(pivotRing);
  ledMeshes.push(pivotRing);

  mergeAllGroupMeshesByMaterial(hubGroup, {
    excludeNames: [pivotRing.name],
    namePrefix: hubGroup.name,
  });
  const driveHubRef = (hubGroup.children.find(c => (c as THREE.Mesh).isMesh && (c as THREE.Mesh).name.includes('joint')) as THREE.Mesh) || driveHub;

  return {
    hubGroup,
    driveHub: driveHubRef,
  };
}

/**
 * Creates the secondary axis gimbal carrier ring (Callout 4).
 */
function createSecondaryAxisCarrier(
  side: -1 | 1,
  materials: RobotMaterialPalette
): {
  carrierGroup: THREE.Group;
  upperTargetPos: THREE.Vector3;
  lowerTargetPos: THREE.Vector3;
} {
  const carrierGroup = new THREE.Group();
  carrierGroup.name = side === -1 ? 'SecondaryCarrierGroup_L' : 'SecondaryCarrierGroup_R';

  const carrierRadius = 0.0360;
  const carrierLength = 0.014;

  // Main Annular Gimbal Ring
  const ringGeo = geoCache.get('Shoulder_CarrierRingGeo', () => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, carrierRadius, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, carrierRadius * 0.84, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    const g = new THREE.ExtrudeGeometry(shape, {
      depth: carrierLength,
      bevelEnabled: true,
      bevelThickness: 0.0012,
      bevelSize: 0.0010,
      bevelSegments: 2,
      curveSegments: 36,
    });
    g.center();
    return g;
  });
  const ringMesh = new THREE.Mesh(ringGeo, materials.joint);
  ringMesh.rotation.y = Math.PI / 2;
  ringMesh.position.set(side * 0.018, 0, 0);
  ringMesh.castShadow = true;
  ringMesh.receiveShadow = true;
  carrierGroup.add(ringMesh);

  // Outer polished metallic gimbal retaining rim
  const rimGeo = geoCache.get('Shoulder_CarrierRimGeo', () => {
    const g = new THREE.TorusGeometry(carrierRadius * 0.98, 0.0012, 6, 36);
    g.rotateY(Math.PI / 2);
    return g;
  });
  const rim = new THREE.Mesh(rimGeo, materials.metallic);
  rim.position.set(side * (0.018 + carrierLength * 0.5), 0, 0);
  carrierGroup.add(rim);

  // Upper Link Receiving Clevis Lug on moving carrier
  const upperTargetPos = new THREE.Vector3(side * 0.018, 0.026, -0.016);
  const clevisGeo = geoCache.get('Shoulder_CarrierClevisGeo', () => new THREE.BoxGeometry(0.010, 0.012, 0.010));
  const clevisUpper = new THREE.Mesh(clevisGeo, materials.joint);
  clevisUpper.position.copy(upperTargetPos);
  carrierGroup.add(clevisUpper);

  // Lower Link Receiving Clevis Lug on moving carrier
  const lowerTargetPos = new THREE.Vector3(side * 0.018, -0.024, -0.016);
  const clevisLower = new THREE.Mesh(clevisGeo, materials.joint);
  clevisLower.position.copy(lowerTargetPos);
  carrierGroup.add(clevisLower);

  mergeAllGroupMeshesByMaterial(carrierGroup, {
    namePrefix: carrierGroup.name,
  });

  return {
    carrierGroup,
    upperTargetPos,
    lowerTargetPos,
  };
}

/**
 * Creates precision machined structural links connecting stationary collar to gimbal carrier.
 */
function createMachinedStructuralLink(
  length: number,
  headWidth: number,
  rodRadius: number,
  materials: RobotMaterialPalette,
  linkMaterial: THREE.MeshPhysicalMaterial
): THREE.Group {
  const group = new THREE.Group();

  // Central connecting rod
  const rodGeo = geoCache.get(`Shoulder_LinkRod_${length.toFixed(4)}_${headWidth.toFixed(4)}_${rodRadius.toFixed(4)}`, () =>
    new THREE.CylinderGeometry(rodRadius, rodRadius, Math.max(0.004, length - headWidth), 16)
  );
  const rod = new THREE.Mesh(rodGeo, linkMaterial);
  rod.castShadow = true;
  group.add(rod);

  // End eye lugs
  const eyeGeo = geoCache.get(`Shoulder_LinkEye_${headWidth.toFixed(4)}`, () => {
    const g = new THREE.CylinderGeometry(headWidth * 0.45, headWidth * 0.45, 0.007, 16);
    g.rotateZ(Math.PI / 2);
    return g;
  });
  const pinGeo = geoCache.get(`Shoulder_LinkPin_${headWidth.toFixed(4)}`, () => {
    const g = new THREE.CylinderGeometry(headWidth * 0.22, headWidth * 0.22, 0.009, 12);
    g.rotateZ(Math.PI / 2);
    return g;
  });
  for (const endY of [-length * 0.45, length * 0.45]) {
    const eye = new THREE.Mesh(eyeGeo, materials.joint);
    eye.position.set(0, endY, 0);
    group.add(eye);

    const pin = new THREE.Mesh(pinGeo, materials.metallic);
    pin.position.set(0, endY, 0);
    group.add(pin);
  }

  mergeAllGroupMeshesByMaterial(group, {
    namePrefix: 'StructuralLink',
  });

  return group;
}

function positionLinkBetweenPoints(
  link: THREE.Group,
  start: THREE.Vector3,
  end: THREE.Vector3,
  side: -1 | 1
): void {
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  link.position.copy(midpoint);

  const dir = new THREE.Vector3().subVectors(end, start).normalize();
  const up = new THREE.Vector3(side, 0, 0);
  const matrix = new THREE.Matrix4();
  const right = new THREE.Vector3().crossVectors(dir, up).normalize();
  const recomputedUp = new THREE.Vector3().crossVectors(right, dir).normalize();
  matrix.makeBasis(dir, right, recomputedUp);
  link.quaternion.setFromRotationMatrix(matrix);
}

/**
 * Creates the arm mounting flange interfacing into UpperArm.ts.
 * Centered directly at the shoulder joint's kinematic center (0, 0, 0),
 * extending downward (-Y) as a heavy-duty load-bearing trunnion mount.
 */
/**
 * Creates the shoulder socket receiver and mounting bridge on armMount.
 * Provides a precision trunnion socket at (0, 0, 0) to Y = -0.018 that receives the
 * rotating upper arm trunnion adapter with zero gap and continuous structural support.
 */
function createShoulderSocketReceiver(
  side: -1 | 1,
  materials: RobotMaterialPalette
): {
  socketGroup: THREE.Group;
  armMountingFlange: THREE.Mesh;
} {
  const socketGroup = new THREE.Group();
  socketGroup.name = side === -1 ? 'LeftShoulderSocketReceiver' : 'RightShoulderSocketReceiver';

  const bridgeOffset = side * 0.012; // 12mm bridge toward secondaryAxisPivot

  // 1. Structural bridge hub connecting from secondaryAxisPivot into the arm mount center
  const bridgeHubGeo = geoCache.get('Shoulder_SocketBridgeHubGeo', () => {
    const g = new THREE.CylinderGeometry(0.024, 0.024, 0.016, 32);
    g.rotateZ(Math.PI / 2);
    return g;
  });
  const bridgeHub = new THREE.Mesh(bridgeHubGeo, materials.joint);
  bridgeHub.position.set(bridgeOffset * 0.5, 0, 0);
  bridgeHub.castShadow = true;
  socketGroup.add(bridgeHub);

  // Polished metallic axle ring on the bridge
  const axleBushingGeo = geoCache.get('Shoulder_SocketAxleBushingGeo', () => {
    const g = new THREE.TorusGeometry(0.022, 0.0012, 6, 28);
    g.rotateY(Math.PI / 2);
    return g;
  });
  const axleBushing = new THREE.Mesh(axleBushingGeo, materials.metallic);
  axleBushing.position.set(bridgeOffset * 0.75, 0, 0);
  socketGroup.add(axleBushing);

  // 2. Downward-facing hemispherical/cylindrical socket cup at (0, 0, 0)
  // Receives the rotating trunnion boss of the upper arm adapter
  const socketCupGeo = geoCache.get('Shoulder_SocketCupGeo', () => new THREE.CylinderGeometry(0.0275, 0.0275, 0.016, 32));
  const socketCup = new THREE.Mesh(socketCupGeo, materials.joint);
  socketCup.name = 'ShoulderSocketCup';
  socketCup.position.set(0, -0.008, 0);
  socketCup.castShadow = true;
  socketGroup.add(socketCup);

  // Internal bore cavity
  const boreGeo = geoCache.get('Shoulder_SocketBoreGeo', () => new THREE.CylinderGeometry(0.0245, 0.0245, 0.014, 28));
  const boreMesh = new THREE.Mesh(boreGeo, materials.joint);
  boreMesh.position.set(0, -0.009, 0);
  socketGroup.add(boreMesh);

  // 3. Socket terminal mounting rim & flange at Y = -0.016
  const flangeGeo = geoCache.get('Shoulder_SocketFlangeGeo', () => new THREE.CylinderGeometry(0.0285, 0.0285, 0.0035, 32));
  const armMountingFlange = new THREE.Mesh(flangeGeo, materials.joint);
  armMountingFlange.name = 'ShoulderArmMountingFlange';
  armMountingFlange.position.set(0, -0.016, 0);
  armMountingFlange.castShadow = true;
  socketGroup.add(armMountingFlange);

  // Polished metallic retaining bezel ring
  const bezelGeo = geoCache.get('Shoulder_SocketBezelGeo', () => {
    const g = new THREE.TorusGeometry(0.0285, 0.0008, 6, 32);
    g.rotateX(Math.PI / 2);
    return g;
  });
  const bezel = new THREE.Mesh(bezelGeo, materials.metallic);
  bezel.position.set(0, -0.016, 0);
  socketGroup.add(bezel);

  // 8 radial fasteners on the socket rim
  const socketBoltCount = 8;
  const boltR = 0.0255;
  const boltGeo = geoCache.get('Shoulder_SocketBoltGeo', () => new THREE.CylinderGeometry(0.0008, 0.0008, 0.0016, 8));
  for (let b = 0; b < socketBoltCount; b++) {
    const angle = (b / socketBoltCount) * Math.PI * 2;
    const bolt = new THREE.Mesh(boltGeo, materials.metallic);
    bolt.position.set(Math.sin(angle) * boltR, -0.016, Math.cos(angle) * boltR);
    socketGroup.add(bolt);
  }

  mergeAllGroupMeshesByMaterial(socketGroup, {
    namePrefix: socketGroup.name,
  });
  const flangeRef = (socketGroup.children.find(c => (c as THREE.Mesh).isMesh && (c as THREE.Mesh).name.includes('joint')) as THREE.Mesh) || armMountingFlange;

  return { socketGroup, armMountingFlange: flangeRef };
}




/**
 * Creates the complete Part 4 Multi-Axis Shoulder Joint / Bearing Assembly.
 */
export function createMultiAxisShoulderJoint(
  side: -1 | 1,
  materials: RobotMaterialPalette,
  ledMeshes: THREE.Mesh[]
): MultiAxisShoulderJointNodes {
  const linkMaterial = materials.machinedLink;

  // 1. Stationary Shoulder Foundation (Grounds into Part 3 Housing at X = ±0.234, Y = 0.052, Z = 0.015)
  // Perfectly calibrated to provide clear visibility of the dark mounting collar and purple glow
  const foundation = new THREE.Group();
  foundation.name = side === -1 ? 'LeftShoulderFoundation' : 'RightShoulderFoundation';
  foundation.position.set(side * 0.234, 0.052, 0.015);

  // Stationary Mounting Collar & Anchor Clevises
  const { collarMesh, anchorGroup, upperAnchorPos, lowerAnchorPos } = createStationaryMountingCollar(side, materials, ledMeshes);
  foundation.add(anchorGroup);

  // 2. Active Shoulder Joint Origin
  const shoulderJoint = new THREE.Group();
  shoulderJoint.name = side === -1 ? 'LeftShoulderJoint' : 'RightShoulderJoint';
  // Natural forward-lateral orientation: subtle forward angle (~2.8°) to showcase bearing highlight
  shoulderJoint.rotation.set(0.01, -side * 0.05, 0);
  foundation.add(shoulderJoint);

  // 3. Primary Rotation Axis Pivot (Pitch around local X)
  const primaryAxisPivot = new THREE.Group();
  primaryAxisPivot.name = side === -1 ? 'LeftPrimaryAxisPivot' : 'RightPrimaryAxisPivot';
  shoulderJoint.add(primaryAxisPivot);

  // Outer Stepped Bearing Housing & Purple Energy Ring
  const { housingGroup, housingMesh, accentRing, blackPlate } = createBearingHousing(side, materials, ledMeshes);
  primaryAxisPivot.add(housingGroup);

  // Central Rotating Hub
  const { hubGroup, driveHub } = createPrimaryRotationHub(side, materials, ledMeshes);
  primaryAxisPivot.add(hubGroup);

  // 4. Secondary Axis Carrier & Pivot (Yaw/Roll Articulation)
  const secondaryAxisCarrier = new THREE.Group();
  secondaryAxisCarrier.name = side === -1 ? 'LeftSecondaryAxisCarrier' : 'RightSecondaryAxisCarrier';
  primaryAxisPivot.add(secondaryAxisCarrier);

  const { carrierGroup, upperTargetPos, lowerTargetPos } = createSecondaryAxisCarrier(side, materials);

  // 5. Dual Precision Machined Structural Links
  const upperSpan = upperAnchorPos.distanceTo(upperTargetPos);
  const upperLink = createMachinedStructuralLink(upperSpan, 0.0140, 0.0060, materials, linkMaterial);
  upperLink.name = side === -1 ? 'LeftShoulderUpperLink' : 'RightShoulderUpperLink';
  positionLinkBetweenPoints(upperLink, upperAnchorPos, upperTargetPos, side);

  const lowerSpan = lowerAnchorPos.distanceTo(lowerTargetPos);
  const lowerLink = createMachinedStructuralLink(lowerSpan, 0.0135, 0.0060, materials, linkMaterial);
  lowerLink.name = side === -1 ? 'LeftShoulderLowerLink' : 'RightShoulderLowerLink';
  positionLinkBetweenPoints(lowerLink, lowerAnchorPos, lowerTargetPos, side);

  // High-performance static batching: merge carrierGroup + upperLink + lowerLink by material
  const linkGroupContainer = new THREE.Group();
  linkGroupContainer.name = `${secondaryAxisCarrier.name}_LinksMerged`;
  linkGroupContainer.add(carrierGroup);
  linkGroupContainer.add(upperLink);
  linkGroupContainer.add(lowerLink);
  mergeAllGroupMeshesByMaterial(linkGroupContainer, { namePrefix: linkGroupContainer.name });
  secondaryAxisCarrier.add(linkGroupContainer);

  const secondaryAxisPivot = new THREE.Group();
  secondaryAxisPivot.name = side === -1 ? 'LeftSecondaryAxisPivot' : 'RightSecondaryAxisPivot';
  secondaryAxisCarrier.add(secondaryAxisPivot);

  // 6. Arm Mounting Interface Group & Refined Shoulder-to-Arm Connector
  const armMount = new THREE.Group();
  armMount.name = side === -1 ? 'LeftArmMount' : 'RightArmMount';
  // Move ONLY the arm mount and connection inward toward the chest/torso by 12mm (-side * 0.012)
  // Left side (side = -1): -(-1) * 0.012 = +0.012 (toward center/chest +X)
  // Right side (side = 1): -(1) * 0.012 = -0.012 (toward center/chest -X)
  armMount.position.set(-side * 0.012, 0, 0);
  secondaryAxisPivot.add(armMount);

  const { socketGroup, armMountingFlange } = createShoulderSocketReceiver(side, materials);
  armMount.add(socketGroup);

  return {
    foundation,
    shoulderJoint,
    primaryAxisPivot,
    secondaryAxisCarrier,
    secondaryAxisPivot,
    armMount,
    armMountingFlange,
    bearingHousing: housingMesh,
    accentRing,
    driveHub,
    stationaryCollar: collarMesh,
    upperLink: linkGroupContainer,
    lowerLink: linkGroupContainer,
    ledMeshes,
    blackPlateBetweenShellAndRotational: blackPlate,
  };
}

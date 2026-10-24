import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { LEG_CONFIG } from './LegConfig';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger';
import { geoCache } from '../utils/GeometryCache';

export interface AchillesDamperNodes {
  group: THREE.Group;
  cylinder: THREE.Mesh;
  piston: THREE.Mesh;
  update?: () => void;
}

export interface AnkleNodes {
  group: THREE.Group;
  sphericalCore: THREE.Mesh;
  clevisHousing: THREE.Mesh;
  malleolusLateral: THREE.Mesh;
  malleolusMedial: THREE.Mesh;
  accentRingLateral: THREE.Mesh;
  accentRingMedial: THREE.Mesh;
  achillesDamper?: AchillesDamperNodes;
  footPivot: THREE.Group;
  ledMeshes: THREE.Mesh[];
}

/**
 * Creates the high-fidelity articulated Ankle Joint assembly:
 * - Dual-axis clevis and spherical bearing core with high load capacity
 * - Malleolus armor discs (lateral and medial) with concentric violet LED rings,
 *   bearing perimeter bolts, and white ceramic center caps with hex socket details
 * - Posterior Achilles hydraulic shock damper with polished metallic piston rod
 * - Articulated Foot Pivot with sturdy foot-mounting cradle
 */
export function createAnkle(
  side: -1 | 1,
  materials: RobotMaterialPalette
): AnkleNodes {
  const ankleGroup = new THREE.Group();
  ankleGroup.name = side === -1 ? 'LeftAnkle' : 'RightAnkle';

  const cfg = LEG_CONFIG.ankle;
  const ledMeshes: THREE.Mesh[] = [];

  // Group containing stationary joint sub-meshes
  const ankleJointGroup = new THREE.Group();
  ankleJointGroup.name = side === -1 ? 'AnkleJointCore_L' : 'AnkleJointCore_R';
  ankleGroup.add(ankleJointGroup);

  // Group containing stationary metallic sub-meshes
  const ankleMetallicGroup = new THREE.Group();
  ankleMetallicGroup.name = side === -1 ? 'AnkleMetallicCore_L' : 'AnkleMetallicCore_R';
  ankleGroup.add(ankleMetallicGroup);

  // ==========================================
  // 1. CENTRAL MULTIAXIAL SPHERICAL BEARING & CLEVIS
  // ==========================================
  const sphereGeo = geoCache.get('Ankle_SphereGeo_v3', () => new THREE.SphereGeometry(cfg.housingRadius * 0.92, 24, 20));
  const sphericalCore = new THREE.Mesh(sphereGeo, materials.joint);
  sphericalCore.name = side === -1 ? 'AnkleBall_L' : 'AnkleBall_R';
  sphericalCore.castShadow = true;
  ankleJointGroup.add(sphericalCore);

  // Structural dark titanium clevis yoke clasping the spherical core
  const clevisShape = new THREE.Shape();
  clevisShape.moveTo(-0.016, 0.018);
  clevisShape.lineTo(0.016, 0.018);
  clevisShape.lineTo(0.020, -0.012);
  clevisShape.lineTo(0.012, -0.022);
  clevisShape.lineTo(-0.012, -0.022);
  clevisShape.lineTo(-0.020, -0.012);
  clevisShape.closePath();

  const clevisGeo = geoCache.get('Ankle_ClevisGeo_v3', () => {
    const g = new THREE.ExtrudeGeometry(clevisShape, {
      depth: 0.028,
      bevelEnabled: true,
      bevelThickness: 0.0025,
      bevelSize: 0.002,
      bevelSegments: 2,
    });
    g.center();
    return g;
  });

  const clevisHousing = new THREE.Mesh(clevisGeo, materials.joint);
  clevisHousing.name = side === -1 ? 'AnkleClevis_L' : 'AnkleClevis_R';
  clevisHousing.castShadow = true;
  ankleJointGroup.add(clevisHousing);

  // ==========================================
  // 2. MALLEOLUS DISCS (Lateral & Medial Ankle Bones)
  // ==========================================
  const discGeo = geoCache.get('Ankle_DiscGeo_v3', () => new THREE.CylinderGeometry(
    cfg.malleolusDiscRadius,
    cfg.malleolusDiscRadius,
    cfg.malleolusDiscWidth,
    28
  ));

  const discSpacing = 0.052;

  // Lateral malleolus disc
  const malleolusLateral = new THREE.Mesh(discGeo, materials.joint);
  malleolusLateral.name = side === -1 ? 'MalleolusLat_L' : 'MalleolusLat_R';
  malleolusLateral.rotation.z = Math.PI / 2;
  malleolusLateral.position.x = side * (discSpacing * 0.5);
  malleolusLateral.castShadow = true;
  ankleJointGroup.add(malleolusLateral);

  // Medial malleolus disc
  const malleolusMedial = new THREE.Mesh(discGeo, materials.joint);
  malleolusMedial.name = side === -1 ? 'MalleolusMed_L' : 'MalleolusMed_R';
  malleolusMedial.rotation.z = Math.PI / 2;
  malleolusMedial.position.x = -side * (discSpacing * 0.5);
  malleolusMedial.castShadow = true;
  ankleJointGroup.add(malleolusMedial);

  // Concentric purple emissive rings on lateral and medial malleolus
  const ringGeo = geoCache.getTorus(cfg.accentRingRadius, 0.0016, 8, 24);
  const accentRings = new THREE.InstancedMesh(ringGeo, materials.purpleEmissive, 2);
  accentRings.name = side === -1 ? 'AnkleAccents_L' : 'AnkleAccents_R';

  const dummy = new THREE.Object3D();
  dummy.rotation.y = Math.PI / 2;

  // Lateral ring instance
  dummy.position.set(side * (discSpacing * 0.5 + cfg.malleolusDiscWidth * 0.5 + 0.001), 0, 0);
  dummy.updateMatrix();
  accentRings.setMatrixAt(0, dummy.matrix);

  // Medial ring instance
  dummy.position.set(-side * (discSpacing * 0.5 + cfg.malleolusDiscWidth * 0.5 + 0.001), 0, 0);
  dummy.updateMatrix();
  accentRings.setMatrixAt(1, dummy.matrix);

  accentRings.instanceMatrix.needsUpdate = true;
  ankleGroup.add(accentRings);
  ledMeshes.push(accentRings);

  // White ceramic outer accent caps on the malleolus discs
  const malleolusCapGroup = new THREE.Group();
  const capGeo = geoCache.get('Ankle_CapGeo_v3', () => new THREE.CylinderGeometry(
    cfg.malleolusDiscRadius * 0.60,
    cfg.malleolusDiscRadius * 0.60,
    0.0022,
    24
  ));
  const capLat = new THREE.Mesh(capGeo, materials.armor);
  capLat.rotation.z = Math.PI / 2;
  capLat.position.x = side * (discSpacing * 0.5 + cfg.malleolusDiscWidth * 0.5 + 0.0018);
  malleolusCapGroup.add(capLat);

  const capMed = new THREE.Mesh(capGeo, materials.armor);
  capMed.rotation.z = Math.PI / 2;
  capMed.position.x = -side * (discSpacing * 0.5 + cfg.malleolusDiscWidth * 0.5 + 0.0018);
  malleolusCapGroup.add(capMed);

  // Center fastener socket on white malleolus cap
  const centerScrewGeo = geoCache.get('Ankle_CenterScrewGeo_v3', () => new THREE.CylinderGeometry(0.0022, 0.0022, 0.0028, 6));
  for (const mSide of [-1, 1]) {
    const sMesh = new THREE.Mesh(centerScrewGeo, materials.joint);
    sMesh.rotation.z = Math.PI / 2;
    sMesh.position.x = mSide * (discSpacing * 0.5 + cfg.malleolusDiscWidth * 0.5 + 0.0028);
    ankleJointGroup.add(sMesh);
  }

  // Polished chrome metallic arch guard cuffs crowning the malleolus discs matching reference
  const archGuardGeo = geoCache.get('Ankle_ArchGuardGeo_v2', () => {
    const g = new THREE.TorusGeometry(cfg.malleolusDiscRadius * 1.05, 0.0016, 8, 24, Math.PI * 0.92);
    g.rotateZ(Math.PI * 0.04);
    return g;
  });
  for (const mSide of [-1, 1]) {
    const archGuard = new THREE.Mesh(archGuardGeo, materials.metallic);
    archGuard.rotation.y = Math.PI / 2;
    archGuard.position.set(mSide * (discSpacing * 0.5 + cfg.malleolusDiscWidth * 0.5 + 0.0005), 0, 0);
    ankleMetallicGroup.add(archGuard);
  }

  const mergedAnkleCaps = mergeGroupMeshesByMaterial(malleolusCapGroup, materials.armor, side === -1 ? 'AnkleCaps_L' : 'AnkleCaps_R', false);
  if (mergedAnkleCaps) {
    ankleGroup.add(mergedAnkleCaps);
  }

  const mergedAnkle = mergeGroupMeshesByMaterial(ankleJointGroup, materials.joint, side === -1 ? 'AnkleJointMesh_L' : 'AnkleJointMesh_R', true) || sphericalCore;

  const mergedAnkleMetallic = mergeGroupMeshesByMaterial(ankleMetallicGroup, materials.metallic, side === -1 ? 'AnkleMetallicMesh_L' : 'AnkleMetallicMesh_R', true);
  if (mergedAnkleMetallic) {
    ankleGroup.add(mergedAnkleMetallic);
  }

  // ==========================================
  // 3. FOOT PIVOT
  // ==========================================
  const footPivot = new THREE.Group();
  footPivot.name = side === -1 ? 'LeftFootPivot' : 'RightFootPivot';
  footPivot.position.set(0, -0.016, 0);
  ankleGroup.add(footPivot);

  // ==========================================
  // 4. POSTERIOR ACHILLES HYDRAULIC DAMPER
  // ==========================================
  const aCfg = cfg.achillesDamper;
  const damperGroup = new THREE.Group();
  damperGroup.name = side === -1 ? 'AchillesDamper_L' : 'AchillesDamper_R';

  const aStart = new THREE.Vector3(0, aCfg.mountY, aCfg.mountZ);
  damperGroup.position.copy(aStart);
  ankleGroup.add(damperGroup);

  // Upper mounting eyelet
  const eyeletGeo = geoCache.get('Ankle_EyeletGeo_v3', () => new THREE.CylinderGeometry(0.0055, 0.0055, 0.008, 16));
  const upperEyelet = new THREE.Mesh(eyeletGeo, materials.joint);
  upperEyelet.rotation.z = Math.PI / 2;
  upperEyelet.position.set(0, 0, 0);
  damperGroup.add(upperEyelet);

  // Hydraulic cylinder casing
  // Calibrated: 0.034m ensures zero bottom-out warning at full plantarflexion (+0.60 rad)
  const cylLen = 0.034;
  const cylGeo = geoCache.get('Ankle_CylGeo_v6', () => new THREE.CylinderGeometry(aCfg.cylinderRadius, aCfg.cylinderRadius, cylLen, 16));
  const cylinder = new THREE.Mesh(cylGeo, materials.joint);
  cylinder.position.set(0, -cylLen * 0.5, 0);
  cylinder.castShadow = true;
  damperGroup.add(cylinder);

  // Cylinder fluid port collar
  const glandGeo = geoCache.get('Ankle_GlandGeo_v6', () => new THREE.CylinderGeometry(aCfg.cylinderRadius * 1.25, aCfg.cylinderRadius * 1.25, 0.005, 16));
  const gland = new THREE.Mesh(glandGeo, materials.joint);
  gland.position.set(0, -cylLen + 0.0025, 0);
  damperGroup.add(gland);

  // Articulated lower piston sub-assembly inside damperGroup
  const pistonGroup = new THREE.Group();
  pistonGroup.name = 'AchillesPistonGroup';
  damperGroup.add(pistonGroup);

  // Polished chrome metallic piston rod extending upward into cylinder
  // Calibrated: 0.052m ensures plenty of overlap (>5mm) at full dorsiflexion (-0.45 rad)
  const pistLen = 0.052;
  const pistGeo = geoCache.get('Ankle_PistGeo_v6', () => new THREE.CylinderGeometry(aCfg.pistonRadius, aCfg.pistonRadius, pistLen, 16));
  const piston = new THREE.Mesh(pistGeo, materials.metallic);
  piston.position.set(0, pistLen * 0.5, 0);
  piston.castShadow = true;
  pistonGroup.add(piston);

  // Lower spherical rod-end eyelet mounted directly onto the heel clevis pin
  const lowerEyelet = new THREE.Mesh(eyeletGeo, materials.joint);
  lowerEyelet.rotation.z = Math.PI / 2;
  lowerEyelet.position.set(0, 0, 0);
  pistonGroup.add(lowerEyelet);

  const aUp = new THREE.Vector3(0, -1, 0);
  const tempTargetLocal = new THREE.Vector3();
  const tempDir = new THREE.Vector3();

  const updateAchilles = () => {
    // Ensure world matrices are fresh before localToWorld / worldToLocal conversions
    footPivot.updateWorldMatrix(true, false);
    ankleGroup.updateWorldMatrix(true, false);

    // Exact heel pin position in footPivot local space: (0, -0.0154, -0.054)
    tempTargetLocal.set(0, aCfg.targetY - (-0.016), aCfg.targetZ);
    footPivot.localToWorld(tempTargetLocal);
    ankleGroup.worldToLocal(tempTargetLocal);

    tempDir.subVectors(tempTargetLocal, aStart);
    const len = tempDir.length();
    if (len > 0.005) {
      damperGroup.quaternion.setFromUnitVectors(aUp, tempDir.normalize());
      pistonGroup.position.set(0, -len, 0);
    }
  };

  // Run initial alignment
  updateAchilles();

  return {
    group: ankleGroup,
    sphericalCore: mergedAnkle,
    clevisHousing: mergedAnkle,
    malleolusLateral: mergedAnkle,
    malleolusMedial: mergedAnkle,
    accentRingLateral: accentRings,
    accentRingMedial: accentRings,
    achillesDamper: {
      group: damperGroup,
      cylinder,
      piston,
      update: updateAchilles,
    },
    footPivot,
    ledMeshes,
  };
}

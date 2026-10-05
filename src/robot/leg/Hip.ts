import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { LEG_CONFIG } from './LegConfig';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger';

export interface HipNodes {
  group: THREE.Group;
  gimbalHousing: THREE.Mesh;
  socketSkirt: THREE.Mesh;
  swivelBall: THREE.Mesh;
  accentRing: THREE.Mesh;
  thighMount: THREE.Group;
  interlockingCollar: THREE.Mesh;
  ledMeshes: THREE.Mesh[];
}

/**
 * REBUILDS THE HIP ROTATIONAL BEARING & STRUCTURAL THIGH MOUNT (RULE #1 & #5):
 *
 *   PELVIS CONNECTION
 *          │
 *          ▼
 *   HIP ROTATIONAL BEARING & HOUSING (Titanium Cylindrical Drive)
 *          │
 *          ▼
 *   OUTPUT COUPLING & TORQUE FLANGE (Hex Fasteners & Bearing Seal)
 *          │
 *          ▼
 *   STRUCTURAL THIGH MOUNT YOKE (Bilateral Interlocking Ears)
 *          │
 *          ▼
 *   THIGH STRUCTURAL FRAME (Receiving Collar & Femur Spine)
 *
 * Physically suspends the thigh directly from the hip with zero floating gap.
 */
export function createHip(
  side: -1 | 1,
  materials: RobotMaterialPalette
): HipNodes {
  const hipGroup = new THREE.Group();
  hipGroup.name = side === -1 ? 'LeftHip' : 'RightHip';

  const cfg = LEG_CONFIG.hip;
  const ledMeshes: THREE.Mesh[] = [];

  // Group containing the stationary hip actuator housing and bearing
  const housingGroup = new THREE.Group();
  housingGroup.name = side === -1 ? 'HipHousing_L' : 'HipHousing_R';
  hipGroup.add(housingGroup);

  // ==========================================
  // 1. HIP ROTATIONAL BEARING & HOUSING
  // Heavy-duty titanium cylindrical drive unit
  // ==========================================
  const actuatorGeo = new THREE.CylinderGeometry(
    cfg.actuatorRadius,
    cfg.actuatorRadius * 0.96,
    cfg.actuatorLength,
    28
  );
  const gimbalHousing = new THREE.Mesh(actuatorGeo, materials.joint);
  gimbalHousing.name = side === -1 ? 'HipActuator_L' : 'HipActuator_R';
  gimbalHousing.position.set(0, -cfg.actuatorLength * 0.45, 0);
  gimbalHousing.castShadow = true;
  gimbalHousing.receiveShadow = true;
  housingGroup.add(gimbalHousing);

  // Bearing seal ring at the upper pelvis interface
  const sealGeo = new THREE.CylinderGeometry(
    cfg.actuatorRadius * 1.08,
    cfg.actuatorRadius * 1.08,
    0.006,
    28
  );
  const socketSkirt = new THREE.Mesh(sealGeo, materials.joint);
  socketSkirt.position.set(0, -0.003, 0);
  socketSkirt.castShadow = true;
  housingGroup.add(socketSkirt);

  // Internal bearing pivot core
  const ballGeo = new THREE.SphereGeometry(cfg.actuatorRadius * 0.88, 24, 20);
  const swivelBall = new THREE.Mesh(ballGeo, materials.joint);
  swivelBall.position.set(0, -cfg.actuatorLength * 0.35, 0);
  swivelBall.castShadow = true;
  housingGroup.add(swivelBall);

  // Vertical structural gussets reinforcing the housing against bending moments
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const gussetGeo = new THREE.BoxGeometry(0.0045, 0.026, 0.007);
    const gusset = new THREE.Mesh(gussetGeo, materials.joint);
    gusset.position.set(
      Math.cos(angle) * (cfg.actuatorRadius * 0.92),
      -cfg.actuatorLength * 0.46,
      Math.sin(angle) * (cfg.actuatorRadius * 0.92)
    );
    gusset.rotation.y = -angle;
    housingGroup.add(gusset);
  }

  const mergedHousing = mergeGroupMeshesByMaterial(
    housingGroup,
    materials.joint,
    side === -1 ? 'HipHousingJoint_L' : 'HipHousingJoint_R',
    true
  ) || gimbalHousing;

  // Single functional status indicator ring inset flush into the actuator shoulder
  const accentRingGeo = new THREE.TorusGeometry(cfg.accentRingRadius, 0.0016, 8, 32);
  const accentRing = new THREE.Mesh(accentRingGeo, materials.purpleEmissive);
  accentRing.name = side === -1 ? 'HipAccentRing_L' : 'HipAccentRing_R';
  accentRing.rotation.x = Math.PI / 2;
  accentRing.position.set(0, -0.004, 0);
  hipGroup.add(accentRing);
  ledMeshes.push(accentRing);

  // ==========================================
  // 2. STRUCTURAL THIGH MOUNT
  // Engineered mechanical interface suspending the thigh directly from the hip
  // ==========================================
  const thighMount = new THREE.Group();
  thighMount.name = side === -1 ? 'ThighMount_L' : 'ThighMount_R';
  thighMount.position.set(0, cfg.yOffset, 0);
  hipGroup.add(thighMount);

  const mountGroup = new THREE.Group();

  // A. High-Torque Output Shaft Journal
  const journalGeo = new THREE.CylinderGeometry(0.020, 0.020, 0.014, 24);
  const journalMesh = new THREE.Mesh(journalGeo, materials.joint);
  journalMesh.position.set(0, 0.004, 0);
  mountGroup.add(journalMesh);

  // B. Circular Machined Mounting Flange with 6 Perimeter Bolts
  const flangeGeo = new THREE.CylinderGeometry(cfg.flangeRadius, cfg.flangeRadius, 0.006, 28);
  const flange = new THREE.Mesh(flangeGeo, materials.joint);
  flange.position.set(0, -0.002, 0);
  flange.castShadow = true;
  mountGroup.add(flange);

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const boltGeo = new THREE.CylinderGeometry(0.0022, 0.0022, 0.0045, 6);
    const bolt = new THREE.Mesh(boltGeo, materials.joint);
    bolt.position.set(
      Math.cos(angle) * (cfg.flangeRadius * 0.88),
      0.0015,
      Math.sin(angle) * (cfg.flangeRadius * 0.88)
    );
    mountGroup.add(bolt);
  }

  // C. Interlocking Structural Spigot Sleeve (Inserts into Thigh Frame Collar)
  const spigotGeo = new THREE.CylinderGeometry(
    cfg.collarRadius * 0.94,
    cfg.collarRadius * 0.90,
    cfg.collarHeight,
    28
  );
  const interlockingCollar = new THREE.Mesh(spigotGeo, materials.joint);
  interlockingCollar.name = side === -1 ? 'ThighMountCollar_L' : 'ThighMountCollar_R';
  interlockingCollar.position.set(0, -cfg.collarHeight * 0.5 - 0.002, 0);
  interlockingCollar.castShadow = true;
  interlockingCollar.receiveShadow = true;
  mountGroup.add(interlockingCollar);

  // D. Heavy Bilateral Structural Yoke Ears (Direct load path into thigh spine)
  for (const bSide of [-1, 1]) {
    const earGeo = new THREE.BoxGeometry(0.008, 0.024, 0.020);
    const ear = new THREE.Mesh(earGeo, materials.joint);
    ear.position.set(
      bSide * (cfg.collarRadius * 0.86),
      -cfg.collarHeight * 0.55,
      0
    );
    ear.castShadow = true;
    mountGroup.add(ear);

    // Cross clamp bolt through each yoke ear
    const earBoltGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.010, 6);
    const earBolt = new THREE.Mesh(earBoltGeo, materials.joint);
    earBolt.rotation.z = Math.PI / 2;
    earBolt.position.set(
      bSide * (cfg.collarRadius * 0.86),
      -cfg.collarHeight * 0.65,
      0
    );
    mountGroup.add(earBolt);
  }

  const mergedMount = mergeGroupMeshesByMaterial(
    mountGroup,
    materials.joint,
    side === -1 ? 'ThighMount_Merged_L' : 'ThighMount_Merged_R',
    true
  ) || interlockingCollar;
  thighMount.add(mergedMount);

  return {
    group: hipGroup,
    gimbalHousing: mergedHousing,
    socketSkirt: mergedHousing,
    swivelBall: mergedHousing,
    accentRing,
    thighMount,
    interlockingCollar: mergedMount,
    ledMeshes,
  };
}

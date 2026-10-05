import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { createHip, HipNodes } from './Hip';
import { createThigh, ThighNodes } from './Thigh';
import { createKnee, KneeNodes } from './Knee';
import { createShin, ShinNodes } from './Shin';
import { createAnkle, AnkleNodes } from './Ankle';
import { createFoot, FootNodes } from './Foot';
import { LEG_CONFIG } from './LegConfig';

export interface RobotLegNodes {
  root: THREE.Group;
  hip: HipNodes;
  thigh: ThighNodes;
  knee: KneeNodes;
  shin: ShinNodes;
  ankle: AnkleNodes;
  foot: FootNodes;
  ledMeshes: THREE.Mesh[];
  side: -1 | 1;
}

/**
 * Assembles the complete hierarchical robot leg assembly adhering to the modular humanoid specification:
 *
 * Robot
 *  └── Waist
 *       └── LeftHipPivot / RightHipPivot
 *            └── RobotLeg (LegRoot)
 *                 └── Hip (HipGimbal & Actuators)
 *                      └── ThighMount
 *                           └── Thigh (Anterior/Lateral Armor & Femur Core)
 *                                └── KneePivot
 *                                     └── Knee (Rotary Condyles & Patellar Shield)
 *                                          └── ShinPivot
 *                                               └── Shin (Keel Armor & Calf Thruster Vents)
 *                                                    └── AnklePivot
 *                                                         └── Ankle (Spherical Gimbal & Malleolus)
 *                                                              └── FootPivot
 *                                                                   └── Foot (Tread Sole & Underglow)
 */
export function createRobotLeg(
  side: -1 | 1,
  materials: RobotMaterialPalette
): RobotLegNodes {
  const legRoot = new THREE.Group();
  legRoot.name = side === -1 ? 'LeftLegRoot' : 'RightLegRoot';

  const ledMeshes: THREE.Mesh[] = [];

  // ==========================================
  // 1. HIP ARTICULATION JOINT
  // ==========================================
  const hip = createHip(side, materials);
  legRoot.add(hip.group);
  ledMeshes.push(...hip.ledMeshes);

  // ==========================================
  // 2. THIGH / UPPER LEG
  // (Attached hierarchically inside hip.thighMount)
  // ==========================================
  const thigh = createThigh(side, materials);
  hip.thighMount.add(thigh.group);
  ledMeshes.push(...thigh.ledMeshes);

  // ==========================================
  // 3. KNEE JOINT & PATELLAR SHIELD
  // (Attached hierarchically at distal end of thigh)
  // ==========================================
  const knee = createKnee(side, materials);
  thigh.kneePivot.add(knee.group);
  ledMeshes.push(...knee.ledMeshes);

  // ==========================================
  // 4. SHIN / CALF GAUNTLET
  // (Attached hierarchically to knee.shinPivot flush against lower knee structure)
  // ==========================================
  const shin = createShin(side, materials);
  knee.shinPivot.add(shin.group);
  shin.group.position.set(0, -LEG_CONFIG.knee.lowerStructureHeight, 0);
  ledMeshes.push(...shin.ledMeshes);

  // ==========================================
  // 5. ANKLE GIMBAL
  // (Attached hierarchically at distal end of shin)
  // ==========================================
  const ankle = createAnkle(side, materials);
  shin.anklePivot.add(ankle.group);
  ledMeshes.push(...ankle.ledMeshes);

  // ==========================================
  // 6. FOOT & BOOT ASSEMBLY
  // (Attached hierarchically to ankle.footPivot)
  // ==========================================
  const foot = createFoot(side, materials);
  ankle.footPivot.add(foot.group);
  ledMeshes.push(...foot.ledMeshes);

  // ==========================================
  // 7. DEFAULT ATHLETIC HEROIC STANDING STANCE
  // ==========================================
  const st = LEG_CONFIG.stance;
  const yaw = side === -1 ? (st.hipYawLeft ?? st.hipYaw) : (st.hipYawRight ?? st.hipYaw);

  // Hip orientation: slight outward abduction and subtle rotation
  hip.group.rotation.x = st.hipPitch;
  hip.group.rotation.z = side * st.hipRoll;
  hip.group.rotation.y = side * yaw;

  // Knee flexion: soft natural knee bend (~4.5°)
  knee.shinPivot.rotation.x = st.kneePitch;

  // Ankle compensation: keeps foot level and planted firmly on ground
  ankle.footPivot.rotation.x = st.anklePitch;
  ankle.footPivot.rotation.z = -side * st.ankleRoll;

  return {
    root: legRoot,
    hip,
    thigh,
    knee,
    shin,
    ankle,
    foot,
    ledMeshes,
    side,
  };
}

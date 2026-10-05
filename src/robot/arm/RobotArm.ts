/**
 * ============================================================================
 * ROBOT ARM MASTER ASSEMBLY (AAA PRODUCTION CAD SPECIFICATION)
 * ============================================================================
 *
 * Implements the authoritative hierarchical robotic arm system:
 *
 *   shoulderMount.armMount (X = ±0.0225m flange outer face)
 *     │
 *     ▼
 *   armRoot (Anchored flush to Shoulder Mounting Flange)
 *     │
 *     ▼
 *   upperArmAssembly
 *     ├── shoulderAdapter (Mating collar + 12 hex cap screws + central bore)
 *     ├── upperArmMechanicalCore (Faceted titanium I-beam spar + tricep actuator)
 *     ├── upperArmArmor (Sculpted ceramic white shell: anterior + posterior)
 *     ├── ventilationChannel & purpleAccent (Recessed channel + purple LED)
 *     │
 *     ▼
 *   elbowAssembly (Distal clevis + transverse hinge + dual actuator discs)
 *     │
 *     ▼
 *   elbowPivot (Dedicated Three.js rotation pivot for forearm flexion/extension)
 *     │
 *     ▼
 *   forearmAssembly
 *     ├── forearmMechanicalCore (Titanium spaceframe + dual flexor actuators)
 *     ├── forearmArmor (Sculpted ceramic gauntlet: anterior + dorsal fin)
 *     ├── ventilationChannel & purpleAccent (Recessed channel + purple LED)
 *     │
 *     ▼
 *   wristInterface (Precision machined titanium trunnion + 8 bolt pattern - STOP)
 *
 * ABSOLUTE STOP: Hand, palm, fingers, and gripper are NOT built.
 * ============================================================================
 */

import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { createUpperArm, UpperArmNodes } from './UpperArm';
import { createElbow, ElbowNodes } from './Elbow';
import { createForearm, ForearmNodes } from './Forearm';
import { createWrist, WristNodes } from './Wrist';
import { createHand, HandNodes } from './Hand';

export interface RobotArmNodes {
  root: THREE.Group;
  upperArm: UpperArmNodes;
  elbow: ElbowNodes;
  forearm: ForearmNodes;
  wrist: WristNodes;
  hand: HandNodes;
  elbowPivot: THREE.Group;
  wristPivot: THREE.Group;
  ledMeshes: THREE.Mesh[];
  side: -1 | 1;
  shoulder: any;
}

export function createRobotArm(
  side: -1 | 1,
  materials: RobotMaterialPalette
): RobotArmNodes {
  const armRoot = new THREE.Group();
  armRoot.name = side === -1 ? 'LeftRobotArmRoot' : 'RightRobotArmRoot';

  const ledMeshes: THREE.Mesh[] = [];

  // ==========================================================================
  // 1. UPPER ARM & SHOULDER ADAPTER
  // Attaches flush to the shoulder mounting flange interface.
  // Posture: Controlled athletic stance (~7.4° = 0.130 rad roll, -0.08 rad pitch)
  // Subtle internal yaw (side * 0.08 rad) aligns elbow flexion forward & inward
  // ==========================================================================
  const upperArm = createUpperArm(side, materials);
  upperArm.group.rotation.set(-0.08, -side * 0.08, side * 0.130);
  armRoot.add(upperArm.group);
  ledMeshes.push(...upperArm.ledMeshes);

  // ==========================================================================
  // 2. ARTICULATED ELBOW JOINT
  // Attached to upper arm distal clevis mount.
  // ==========================================================================
  const elbow = createElbow(side, materials);
  // Orthogonal mounting alignment with upper arm distal clevis mount (zero angular twist)
  elbow.group.rotation.set(0, 0, 0);
  upperArm.distalElbowMount.add(elbow.group);
  ledMeshes.push(...elbow.ledMeshes);

  // ==========================================================================
  // 3. TAPERED FOREARM GAUNTLET & MECHANICAL CORE
  // Parented directly to elbow.forearmPivot — follows true 1-DOF elbow flexion.
  // Posture: Elbow to hands inward return (-side * 0.070 rad = ~4.0° inward)
  // Creates authentic athletic chevron posture with natural clearance beside torso.
  // ==========================================================================
  const forearm = createForearm(side, materials);
  forearm.group.position.set(0, -0.0105, 0);
  forearm.group.rotation.set(0, 0, -side * 0.070);
  elbow.forearmPivot.add(forearm.group);
  ledMeshes.push(...forearm.ledMeshes);

  // ==========================================================================
  // 4. PRECISION WRIST MECHANICAL INTERFACE
  // Attached to forearm distal wrist mount.
  // Wrist collar sits flush against forearm transition collar (0 air gap)
  // and remains strictly coaxial with forearm cylinder (rotation.x = 0, rotation.z = 0).
  // Flexion/pitch and yaw pivot on the internal transverse axle pin via trunnionPivot.
  // ==========================================================================
  const wrist = createWrist(side, materials);
  wrist.group.position.set(0, 0.0000, 0);
  // Natural relaxed wrist resting posture (semi-pronated athletic stance):
  // Clean three-quarters anatomical hang with natural forearm pronation (dorsal LED and knuckle hoods visible)
  const wristRoll = side === -1 ? -0.72 : 0.72;
  wrist.group.rotation.set(0, wristRoll, 0);

  const wristPitch = 0.05;
  const wristYaw = side === -1 ? 0.015 : -0.015;
  wrist.trunnionPivot.rotation.set(wristPitch, 0, wristYaw);

  forearm.distalWristMount.add(wrist.group);
  ledMeshes.push(...wrist.ledMeshes);

  // ==========================================================================
  // 5. ARTICULATED HUMANOID MECHA HAND
  // Mounted directly to wrist.distalHandMount (flush against 8-bolt plate).
  // 4 articulated 3-phalanx digits + opposable thumb with thenar swivel.
  // ==========================================================================
  const hand = createHand(side, materials);
  wrist.distalHandMount.add(hand.group);
  ledMeshes.push(...hand.ledMeshes);

  // ==========================================================================
  // 6. DEFAULT ATHLETIC RESTING POSTURE
  // Elbow as true directional turning point, natural relaxed athletic flexion (~14.9° = -0.26 rad)
  // Strict 1-DOF orthogonal transverse hinge — zero internal knuckle shearing
  elbow.setAngle(-0.26);

  // Compatibility proxies for animation systems
  const shoulderCompat = {
    group: new THREE.Group(),
    armorGroup: new THREE.Group(),
    jointGroup: new THREE.Group(),
    upperArmConnector: new THREE.Group(),
    gimbalYoke: new THREE.Group(),
    cycloidalDrive: new THREE.Group(),
    faceplateHub: new THREE.Group(),
    accentRing: new THREE.Group(),
    damperPiston: new THREE.Group(),
    ledMeshes: [],
  };

  return {
    root: armRoot,
    upperArm,
    elbow,
    forearm,
    wrist,
    hand,
    elbowPivot: elbow.forearmPivot,
    wristPivot: wrist.wristPivot,
    ledMeshes,
    side,
    shoulder: shoulderCompat,
  };
}

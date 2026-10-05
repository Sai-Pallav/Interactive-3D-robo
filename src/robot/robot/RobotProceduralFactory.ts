import * as THREE from 'three';
import { ROBOT_ROTATION } from '../config';
import { createRobotMaterials } from '../materials/RobotMaterials';
import { createRobotHead } from '../head/RobotHead';
import { createRobotArm, RobotArmNodes } from '../arm/RobotArm';
import { createRobotTorso, RobotTorsoNodes } from '../torso/RobotTorso';
import { createRobotLeg, RobotLegNodes } from '../leg/RobotLeg';

export interface RobotNodes {
  root: THREE.Group;
  torso: THREE.Group;
  torsoNodes?: RobotTorsoNodes;
  chestLogo: THREE.Mesh;
  neck: THREE.Group;
  head: THREE.Group;
  faceVisor: THREE.Mesh;
  eyeTrackingGroup: THREE.Group;
  eyeLeft: THREE.Mesh;
  eyeRight: THREE.Mesh;
  visorLightBar: THREE.Mesh;
  earRingLeft: THREE.Mesh;
  earRingRight: THREE.Mesh;
  leftShoulder: THREE.Group;
  rightShoulder: THREE.Group;
  leftUpperArm: THREE.Group;
  rightUpperArm: THREE.Group;
  leftForearm: THREE.Group;
  rightForearm: THREE.Group;
  leftHand: THREE.Group;
  rightHand: THREE.Group;
  leftArmNodes?: RobotArmNodes;
  rightArmNodes?: RobotArmNodes;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftFoot: THREE.Group;
  rightFoot: THREE.Group;
  leftLegNodes?: RobotLegNodes;
  rightLegNodes?: RobotLegNodes;
  ledMeshes: THREE.Mesh[];
  materials: {
    armor: THREE.MeshPhysicalMaterial;
    joint: THREE.MeshPhysicalMaterial;
    visor: THREE.MeshPhysicalMaterial;
    eyeGlow: THREE.Material;
    earRingGlow: THREE.Material;
    chestGlow: THREE.Material;
    accentGlow: THREE.Material;
  };
}

/**
 * Creates the high-fidelity procedural 3D Robot model matching the uploaded reference image.
 * Sculpted with accurate anatomical proportions, glossy ceramic armor, dark titanium skeleton,
 * and illuminated neon violet/blue LED systems.
 */
export function createProceduralRobot(): RobotNodes {
  const root = new THREE.Group();
  root.name = 'RobotRoot';

  // Base orientation (3/4 heroic angle per Priority 6)
  root.rotation.y = ROBOT_ROTATION.yaw;
  root.rotation.x = ROBOT_ROTATION.pitch;
  root.rotation.z = ROBOT_ROTATION.roll;

  const ledMeshes: THREE.Mesh[] = [];

  // ==========================================
  // 1. UNIFIED PBR MATERIALS (Part 5, 13, 14, 15)
  // ==========================================
  const materials = createRobotMaterials();

  // ==========================================
  // 2. MODULAR PROCEDURAL ROBOT TORSO
  // (Adhering strictly to Master Torso Specification & Reference Image)
  // ==========================================
  const torsoNodes = createRobotTorso(materials);
  root.add(torsoNodes.group);
  const torso = torsoNodes.group;
  const chestLogo = torsoNodes.chestArmor.logo;
  ledMeshes.push(...torsoNodes.ledMeshes);

  // ==========================================
  // 3. MODULAR PROCEDURAL ROBOT HEAD & TELESCOPING NECK
  // (Precision sculpted per Reference Image, seated firmly in Chest Neck Collar per Section 2 & 9)
  // ==========================================
  const headAssembly = createRobotHead(materials);
  torsoNodes.upperTorsoFrame.group.add(headAssembly.neck);
  headAssembly.neck.position.set(0, 0.128, 0.004);

  const head = headAssembly.head;
  const neck = headAssembly.neck;
  const faceVisor = headAssembly.visorAssembly.visorMesh;
  const eyeTrackingGroup = headAssembly.visorLight.group;
  const visorLightBar = headAssembly.visorLight.ledMesh;
  const earRingLeftMesh = headAssembly.leftSideModule.emissiveRing;
  const earRingRightMesh = headAssembly.rightSideModule.emissiveRing;

  // Reference eye nodes for controller
  const eyeLeft = new THREE.Group() as unknown as THREE.Mesh;
  eyeLeft.name = 'EyeLeft';
  eyeTrackingGroup.add(eyeLeft);
  const eyeRight = new THREE.Group() as unknown as THREE.Mesh;
  eyeRight.name = 'EyeRight';
  eyeTrackingGroup.add(eyeRight);

  // Collect all head LED meshes for pulsing & animation
  ledMeshes.push(...headAssembly.ledMeshes);



  // ==========================================
  // 4. ARTICULATED ROBOT ARMS (SHOULDER TO WRIST INTERFACE)
  // Extending directly from the Shoulder Arm-Mounting Flange
  // ==========================================
  const leftArmNodes = createRobotArm(-1, materials);
  const leftMount = torsoNodes.shoulderMountLeft.extensionNodes?.armMount || torsoNodes.shoulderMountLeft.group;
  leftMount.add(leftArmNodes.root);

  const rightArmNodes = createRobotArm(1, materials);
  const rightMount = torsoNodes.shoulderMountRight.extensionNodes?.armMount || torsoNodes.shoulderMountRight.group;
  rightMount.add(rightArmNodes.root);

  ledMeshes.push(...leftArmNodes.ledMeshes, ...rightArmNodes.ledMeshes);

  const leftShoulder = torsoNodes.shoulderMountLeft.group;
  const rightShoulder = torsoNodes.shoulderMountRight.group;
  const leftUpperArm = leftArmNodes.upperArm.group;
  const rightUpperArm = rightArmNodes.upperArm.group;
  const leftForearm = leftArmNodes.elbowPivot;
  const rightForearm = rightArmNodes.elbowPivot;
  const leftHand = leftArmNodes.hand?.group ?? leftArmNodes.wristPivot;
  const rightHand = rightArmNodes.hand?.group ?? rightArmNodes.wristPivot;

  // ==========================================
  // 8. MODULAR ARTICULATED ROBOT LEGS & FEET
  // (Mounted directly into Waist Hip Pivots)
  // ==========================================
  const leftLeg = createRobotLeg(-1, materials);
  leftLeg.root.position.set(0, 0, 0);
  torsoNodes.waist.leftHipPivot.add(leftLeg.root);

  const rightLeg = createRobotLeg(1, materials);
  rightLeg.root.position.set(0, 0, 0);
  torsoNodes.waist.rightHipPivot.add(rightLeg.root);

  ledMeshes.push(...leftLeg.ledMeshes, ...rightLeg.ledMeshes);

  const leftFoot = leftLeg.foot.group;
  const rightFoot = rightLeg.foot.group;

  return {
    root,
    torso,
    torsoNodes,
    chestLogo,
    neck,
    head,
    faceVisor,
    eyeTrackingGroup,
    eyeLeft,
    eyeRight,
    visorLightBar,
    earRingLeft: earRingLeftMesh,
    earRingRight: earRingRightMesh,
    leftShoulder,
    rightShoulder,
    leftUpperArm,
    rightUpperArm,
    leftForearm,
    rightForearm,
    leftHand,
    rightHand,
    leftArmNodes,
    rightArmNodes,
    leftLeg: leftLeg.root,
    rightLeg: rightLeg.root,
    leftFoot,
    rightFoot,
    leftLegNodes: leftLeg,
    rightLegNodes: rightLeg,
    ledMeshes,
    materials: {
      armor: materials.armor,
      joint: materials.joint,
      visor: materials.visor,
      eyeGlow: materials.purpleEmissive,
      earRingGlow: materials.purpleEmissive,
      chestGlow: materials.purpleEmissive,
      accentGlow: materials.purpleEmissive,
    },
  };
}

import { RobotResourceManager } from './RobotResourceManager';

/**
 * Retrieves a fresh procedural robot instance from the resource manager asynchronously.
 */
export async function getProceduralRobotAsync(): Promise<RobotNodes> {
  return RobotResourceManager.getInstance().acquireRobotInstanceAsync();
}

/**
 * Retrieves a fresh procedural robot instance synchronously.
 */
export function getProceduralRobot(): RobotNodes {
  return RobotResourceManager.getInstance().acquireRobotInstanceSync();
}


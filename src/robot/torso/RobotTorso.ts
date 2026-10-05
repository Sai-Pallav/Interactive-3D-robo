import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import {
  createChestAssembly,
  ChestArmorNodes,
  UpperTorsoFrameNodes,
  ShoulderMountNodes,
} from './ChestAssembly';
import { createStomachAssembly, StomachAssemblyNodes } from './AbdomenAssembly';
import { createWaistAssembly, WaistAssemblyNodes } from './WaistAssembly';
import { TORSO_CONFIG } from './TorsoConfig';

export interface RobotTorsoNodes {
  group: THREE.Group;
  chestPivot: THREE.Group;
  stomachPivot: THREE.Group;
  abdomenPivot: THREE.Group;
  waistPivot: THREE.Group;
  chestArmor: ChestArmorNodes;
  upperTorsoFrame: UpperTorsoFrameNodes;
  shoulderMountLeft: ShoulderMountNodes;
  shoulderMountRight: ShoulderMountNodes;
  stomach: StomachAssemblyNodes;
  abdomen: StomachAssemblyNodes;
  waist: WaistAssemblyNodes;
  ledMeshes: THREE.Mesh[];
}

/**
 * Constructs the complete procedural RobotTorso adhering strictly to Section 2:
 *
 * RobotTorso
 *  ├── ChestArmor
 *  │    ├── ChestLeftPanel
 *  │    ├── ChestRightPanel
 *  │    ├── ChestCenterPanel
 *  │    └── ChestLogo
 *  │
 *  ├── ShoulderMountLeft
 *  ├── ShoulderMountRight
 *  │
 *  ├── UpperTorsoFrame
 *  │
 *  ├── StomachAssembly
 *  │    ├── StomachRing01
 *  │    ├── StomachRing02
 *  │    ├── StomachRing03
 *  │    ├── StomachRing04
 *  │    └── InternalSpine
 *  │
 *  └── WaistAssembly
 *       ├── WaistCollar
 *       ├── WaistRing01
 *       ├── WaistRing02
 *       └── HipConnection
 */
export function createRobotTorso(materials: RobotMaterialPalette): RobotTorsoNodes {
  const torsoRoot = new THREE.Group();
  torsoRoot.name = 'RobotTorso';
  torsoRoot.position.set(0, TORSO_CONFIG.baseY, 0);

  const ledMeshes: THREE.Mesh[] = [];

  // ==========================================
  // 1. CHEST PIVOT & CHEST HIERARCHY (Section 2)
  // ==========================================
  const chestPivot = new THREE.Group();
  chestPivot.name = 'ChestPivot';
  torsoRoot.add(chestPivot);

  const chest = createChestAssembly(materials);
  // Attach chest children directly into chestPivot maintaining exact logical hierarchy
  chestPivot.add(chest.chestArmor.group);
  chestPivot.add(chest.shoulderMountLeft.group);
  chestPivot.add(chest.shoulderMountRight.group);
  chestPivot.add(chest.upperTorsoFrame.group);
  ledMeshes.push(...chest.ledMeshes);

  // ==========================================
  // 2. STOMACH PIVOT & STOMACH ASSEMBLY (Section 2 & 7)
  // ==========================================
  const stomachPivot = new THREE.Group();
  stomachPivot.name = 'StomachPivot';
  torsoRoot.add(stomachPivot);

  const stomach = createStomachAssembly(materials);
  stomachPivot.add(stomach.group);
  ledMeshes.push(...stomach.ledMeshes);

  // ==========================================
  // 3. WAIST PIVOT & WAIST ASSEMBLY (Section 2 & 8)
  // ==========================================
  const waist = createWaistAssembly(materials);
  torsoRoot.add(waist.group);
  ledMeshes.push(...waist.ledMeshes);

  return {
    group: torsoRoot,
    chestPivot,
    stomachPivot,
    abdomenPivot: stomachPivot,
    waistPivot: waist.waistPivot,
    chestArmor: chest.chestArmor,
    upperTorsoFrame: chest.upperTorsoFrame,
    shoulderMountLeft: chest.shoulderMountLeft,
    shoulderMountRight: chest.shoulderMountRight,
    stomach,
    abdomen: stomach,
    waist,
    ledMeshes,
  };
}

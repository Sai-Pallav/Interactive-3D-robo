import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { geoCache } from '../utils/GeometryCache';
import { createRobotShell, ShellNodes } from './RobotShell';
import { createRobotVisor, VisorAssemblyNodes } from './RobotVisor';
import { createRobotVisorLight, VisorLightNodes } from './RobotVisorLight';
import { createRobotSideModule, SideModuleNodes } from './RobotSideModule';
import { createRobotJaw, JawNodes } from './RobotJaw';
import { createRobotNeck, NeckNodes } from './RobotNeck';

export interface HeadAssemblyNodes {
  head: THREE.Group;
  neck: THREE.Group;
  shell: ShellNodes;
  visorAssembly: VisorAssemblyNodes;
  visorLight: VisorLightNodes;
  leftSideModule: SideModuleNodes;
  rightSideModule: SideModuleNodes;
  jaw: JawNodes;
  neckAssembly: NeckNodes;
  ledMeshes: THREE.Mesh[];
}

/**
 * Assembles the complete procedural Robot Head and Neck per Part 1 hierarchy:
 * RobotHead
 * ├── OuterShell
 * ├── VisorAssembly (with PurpleVisorLED)
 * ├── LeftSideModule
 * ├── RightSideModule
 * ├── Jaw
 * └── Neck
 */
export function createRobotHead(materials: RobotMaterialPalette): HeadAssemblyNodes {
  // Head Root Group (Independently rotated by kinematic controller per Part 20)
  const head = new THREE.Group();
  head.name = 'RobotHead';
  head.position.set(0, 0.170, 0.004);
  // Calibrated head scale for consistent humanoid head-to-torso and head-to-shoulder proportions
  head.scale.setScalar(0.88);

  const ledMeshes: THREE.Mesh[] = [];

  // 1. Internal Structural Skull Core
  // Dark titanium interior volume preventing hollow see-through artifacts behind visor
  const innerSkullGeo = geoCache.get('InnerSkullGeo', () => new THREE.SphereGeometry(0.102, 24, 18));
  const innerSkull = new THREE.Mesh(innerSkullGeo, materials.joint);
  innerSkull.name = 'InnerSkullCore';
  innerSkull.position.set(0, 0.020, -0.012);
  innerSkull.scale.set(0.92, 0.96, 0.96);
  head.add(innerSkull);

  // 2. Outer White Ceramic Armor Shell (Part 2 & 3)
  const shell = createRobotShell(materials);
  head.add(shell.group);
  ledMeshes.push(shell.rearNapeLED);

  // 3. Glossy Obsidian Face Visor Assembly (Part 4 & 5)
  const visorAssembly = createRobotVisor(materials);
  head.add(visorAssembly.group);

  // 4. Purple Visor LED Blade (Part 6)
  const visorLight = createRobotVisorLight(materials);
  visorAssembly.group.add(visorLight.group);
  ledMeshes.push(visorLight.ledMesh);
  ledMeshes.push(visorLight.coreMesh);

  // 5. Circular Side Modules / Ear Hardware (Part 7 & 8)
  const leftSideModule = createRobotSideModule(-1, materials);
  head.add(leftSideModule.group);
  ledMeshes.push(leftSideModule.emissiveRing);
  ledMeshes.push(leftSideModule.coreRingWhite);

  const rightSideModule = createRobotSideModule(1, materials);
  head.add(rightSideModule.group);
  ledMeshes.push(rightSideModule.emissiveRing);
  ledMeshes.push(rightSideModule.coreRingWhite);

  // 6. Mechanical Jaw & Chin Prow (Part 9)
  const jaw = createRobotJaw(materials);
  head.add(jaw.group);

  // 7. Stacked Telescoping Mechanical Neck (Part 10)
  const neckAssembly = createRobotNeck(materials);
  // Head mounts directly onto neck upper cervical connector
  neckAssembly.group.add(head);

  return {
    head,
    neck: neckAssembly.group,
    shell,
    visorAssembly,
    visorLight,
    leftSideModule,
    rightSideModule,
    jaw,
    neckAssembly,
    ledMeshes,
  };
}

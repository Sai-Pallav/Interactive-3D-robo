import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { geoCache } from '../utils/GeometryCache';
import { createRobotShell, ShellNodes } from './RobotShell';
import { createRobotVisor, VisorAssemblyNodes } from './RobotVisor';
import { createRobotVisorLight, VisorLightNodes } from './RobotVisorLight';
import { createRobotSideModule, SideModuleNodes } from './RobotSideModule';
import { createRobotJaw, JawNodes } from './RobotJaw';
import { createRobotNeck, NeckNodes } from './RobotNeck';
import { createRearHeadAssembly, RearHeadAssemblyNodes } from './RearHeadAssembly';
import { createRearNeckAssembly, RearNeckAssemblyNodes } from './RearNeckAssembly';

export interface HeadAssemblyNodes {
  head: THREE.Group;
  neck: THREE.Group;
  shell: ShellNodes;
  rearHead?: RearHeadAssemblyNodes;
  rearNeck?: RearNeckAssemblyNodes;
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
  // Rotational pivot is placed at the anatomical & mechanical cervical articulation center
  // at the top of the neck column
  const head = new THREE.Group();
  head.name = 'RobotHead';
  head.position.set(0, 0.147, -0.010);
  head.scale.setScalar(0.88);

  // Cranial sub-group: preserves exact neutral-pose world coordinates for all facial & cranium armor
  // (0.172 - 0.147) / 0.88 = +0.02841, (-0.014 - (-0.010)) / 0.88 = -0.00455
  const headCranialGroup = new THREE.Group();
  headCranialGroup.name = 'HeadCranialGroup';
  headCranialGroup.position.set(0, 0.02841, -0.00455);
  head.add(headCranialGroup);

  const ledMeshes: THREE.Mesh[] = [];

  // 1. Internal Structural Skull Core
  // Dark titanium interior volume preventing hollow see-through artifacts behind visor
  const innerSkullGeo = geoCache.get('InnerSkullGeo', () => new THREE.SphereGeometry(0.102, 24, 18));
  const innerSkull = new THREE.Mesh(innerSkullGeo, materials.joint);
  innerSkull.name = 'InnerSkullCore';
  innerSkull.position.set(0, 0.020, -0.012);
  innerSkull.scale.set(0.92, 0.96, 0.96);
  headCranialGroup.add(innerSkull);

  // 2. Outer White Ceramic Armor Shell (Part 2 & 3)
  const shell = createRobotShell(materials);
  headCranialGroup.add(shell.group);
  ledMeshes.push(shell.rearNapeLED);

  // 2b. Sculpted Rear Cranial Armor Shell & Occipital Mechanism
  const rearHead = createRearHeadAssembly(materials);
  headCranialGroup.add(rearHead.group);
  ledMeshes.push(...rearHead.ledMeshes);

  // 3. Glossy Obsidian Face Visor Assembly (Part 4 & 5)
  const visorAssembly = createRobotVisor(materials);
  headCranialGroup.add(visorAssembly.group);

  // 4. Purple Visor LED Blade (Part 6)
  const visorLight = createRobotVisorLight(materials);
  visorAssembly.group.add(visorLight.group);
  ledMeshes.push(visorLight.ledMesh);
  ledMeshes.push(visorLight.coreMesh);

  // 5. Circular Side Modules / Ear Hardware (Part 7 & 8)
  const leftSideModule = createRobotSideModule(-1, materials);
  headCranialGroup.add(leftSideModule.group);
  ledMeshes.push(leftSideModule.emissiveRing);
  ledMeshes.push(leftSideModule.coreRingWhite);

  const rightSideModule = createRobotSideModule(1, materials);
  headCranialGroup.add(rightSideModule.group);
  ledMeshes.push(rightSideModule.emissiveRing);
  ledMeshes.push(rightSideModule.coreRingWhite);

  // 6. Mechanical Jaw & Chin Prow (Part 9)
  const jaw = createRobotJaw(materials);
  headCranialGroup.add(jaw.group);

  // 7. Stacked Telescoping Mechanical Neck & Posterior Cervical Mechanism
  const neckAssembly = createRobotNeck(materials);
  const rearNeck = createRearNeckAssembly(materials);
  neckAssembly.group.add(rearNeck.group);
  ledMeshes.push(...rearNeck.ledMeshes);

  // Head mounts directly onto neck upper cervical connector
  neckAssembly.group.add(head);

  return {
    head,
    neck: neckAssembly.group,
    shell,
    rearHead,
    rearNeck,
    visorAssembly,
    visorLight,
    leftSideModule,
    rightSideModule,
    jaw,
    neckAssembly,
    ledMeshes,
  };
}

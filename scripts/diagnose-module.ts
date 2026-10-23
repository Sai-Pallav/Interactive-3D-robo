import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createChestAssembly } from '../src/robot/torso/ChestAssembly';

const mats = createRobotMaterials();
const chest = createChestAssembly(mats);
const root = new THREE.Group();
root.add(chest.upperTorsoFrame.group);
root.add(chest.shoulderMountLeft.group);
root.add(chest.shoulderMountRight.group);
root.updateMatrixWorld(true);

const lModule = chest.shoulderMountLeft.group;
console.log('lModule local position:', lModule.position.toArray());
console.log('lModule children:', lModule.children.map(c => ({ name: c.name, pos: c.position.toArray() })));

const whiteAssembly = chest.shoulderMountLeft.extensionNodes?.whiteStructuralAssembly;
if (whiteAssembly) {
  console.log('whiteStructuralAssembly children:', whiteAssembly.children.map(c => ({ name: c.name, pos: c.position.toArray() })));
}

const foundation = chest.shoulderMountLeft.extensionNodes?.multiAxisJoint?.foundation;
if (foundation) {
  console.log('foundation children:', foundation.children.map(c => ({ name: c.name, pos: c.position.toArray() })));
}

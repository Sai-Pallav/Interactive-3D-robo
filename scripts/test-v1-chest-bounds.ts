import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotTorso } from '../src/robot/torso/RobotTorso';

const materials = createRobotMaterials();
const torso = createRobotTorso(materials);
torso.group.updateMatrixWorld(true);

console.log('=== VERTEBRA 01 DETAILED SUB-OBJECT BOUNDS ===');
const v1 = torso.stomach.segment01;
v1.traverse(obj => {
  const b = new THREE.Box3().setFromObject(obj);
  console.log(`${obj.name.padEnd(35)} Bounds: Y [${b.min.y.toFixed(4)}, ${b.max.y.toFixed(4)}] Z [${b.min.z.toFixed(4)}, ${b.max.z.toFixed(4)}] X [${b.min.x.toFixed(4)}, ${b.max.x.toFixed(4)}]`);
});

console.log('\n=== CHEST ARMOR SUB-OBJECT BOUNDS ===');
torso.chestArmor.group.traverse(obj => {
  const b = new THREE.Box3().setFromObject(obj);
  console.log(`${obj.name.padEnd(35)} Bounds: Y [${b.min.y.toFixed(4)}, ${b.max.y.toFixed(4)}] Z [${b.min.z.toFixed(4)}, ${b.max.z.toFixed(4)}] X [${b.min.x.toFixed(4)}, ${b.max.x.toFixed(4)}]`);
});

import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotTorso } from '../src/robot/torso/RobotTorso';

const materials = createRobotMaterials();
const torso = createRobotTorso(materials);
torso.group.updateMatrixWorld(true);

console.log('=== CHEST TO ABDOMEN INTERFACE CLEARANCES ===');

// Check Chest Armor bottom
let chestArmorMinY = Infinity;
let chestArmorMaxY = -Infinity;
torso.chestArmor.group.traverse(obj => {
  if ((obj as THREE.Mesh).isMesh) {
    const b = new THREE.Box3().setFromObject(obj);
    if (b.min.y < chestArmorMinY) chestArmorMinY = b.min.y;
    if (b.max.y > chestArmorMaxY) chestArmorMaxY = b.max.y;
  }
});
console.log(`ChestArmor Y range: [${chestArmorMinY.toFixed(4)}, ${chestArmorMaxY.toFixed(4)}]`);

// Check LowerChestFrame Y range
let lowerChestMinY = Infinity;
let lowerChestMaxY = -Infinity;
torso.upperTorsoFrame.group.traverse(obj => {
  if (obj.name && obj.name.includes('LowerChest')) {
    const b = new THREE.Box3().setFromObject(obj);
    if (b.min.y < lowerChestMinY) lowerChestMinY = b.min.y;
    if (b.max.y > lowerChestMaxY) lowerChestMaxY = b.max.y;
  }
});
console.log(`LowerChestFrame Y range: [${lowerChestMinY.toFixed(4)}, ${lowerChestMaxY.toFixed(4)}]`);

// Check Vertebra 01
const v1 = torso.stomach.segment01;
const bV1 = new THREE.Box3().setFromObject(v1);
console.log(`Vertebra 01 Y range: [${bV1.min.y.toFixed(4)}, ${bV1.max.y.toFixed(4)}] Z range: [${bV1.min.z.toFixed(4)}, ${bV1.max.z.toFixed(4)}]`);

// Check upper mount of actuators vs clevises
console.log('\n=== ACTUATOR UPPER MOUNT VS CHEST CLEVIS ===');
const cfg = torso.stomach;
// Let's check world positions of the upper uniballs of left & right actuators
torso.group.traverse(obj => {
  if (obj.name && (obj.name.includes('Outer') || obj.name.includes('Inner')) && obj.name.includes('Actuator')) {
    const wp = new THREE.Vector3(); obj.getWorldPosition(wp);
    console.log(`${obj.name.padEnd(30)} WPos: [${wp.x.toFixed(4)}, ${wp.y.toFixed(4)}, ${wp.z.toFixed(4)}]`);
  }
});

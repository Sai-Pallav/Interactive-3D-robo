import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotTorso } from '../src/robot/torso/RobotTorso';
import { TORSO_CONFIG } from '../src/robot/torso/TorsoConfig';

const materials = createRobotMaterials();
const torso = createRobotTorso(materials);
torso.group.updateMatrixWorld(true);

console.log('=== CHEST LOWER FRAME & CLEVIS BOXES ===');
torso.chestPivot.traverse(obj => {
  if (obj.name && (obj.name.toLowerCase().includes('lower') || obj.name.toLowerCase().includes('clevis') || obj.name.toLowerCase().includes('mount') || obj.name.toLowerCase().includes('subxiphoid'))) {
    const box = new THREE.Box3().setFromObject(obj);
    console.log(obj.name.padEnd(30), 'pos:', obj.position.toArray().map(v=>v.toFixed(4)), 'box:', box.min.toArray().map(v=>v.toFixed(4)), 'to', box.max.toArray().map(v=>v.toFixed(4)));
  }
});

console.log('\n=== ABDOMEN POLES UPPER AND LOWER POINTS ===');
const cfg = TORSO_CONFIG.stomach;
console.log('Inner upper mount:', cfg.dualActuators.inner.upperMount);
console.log('Inner lower mount:', cfg.dualActuators.inner.lowerMount);
console.log('Outer upper mount (actuator):', cfg.actuator.upperMount);
console.log('Outer lower mount (actuator):', cfg.actuator.lowerMount);
console.log('Outer upper mount (dual):', cfg.dualActuators.outer.upperMount);
console.log('Outer lower mount (dual):', cfg.dualActuators.outer.lowerMount);

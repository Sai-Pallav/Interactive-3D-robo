import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotTorso } from '../src/robot/torso/RobotTorso';

const materials = createRobotMaterials();
const torso = createRobotTorso(materials);
torso.group.updateMatrixWorld(true);

console.log('=== CHECKING ACTUAL 3D BOUNDS AND CLEARANCES OF WINGS & HORNS ===');

// Let's inspect each sub-object of Vertebra 01, 02, 03, 04, 05
for (let i = 0; i < 5; i++) {
  const v = torso.stomach.rings[i].group;
  console.log(`\n--- VERTEBRA 0${i + 1} CHILDREN ---`);
  v.traverse(obj => {
    if (obj !== v && obj.name) {
      const b = new THREE.Box3().setFromObject(obj);
      console.log(`  ${obj.name.padEnd(30)}: X [${b.min.x.toFixed(4)}, ${b.max.x.toFixed(4)}] Y [${b.min.y.toFixed(4)}, ${b.max.y.toFixed(4)}] Z [${b.min.z.toFixed(4)}, ${b.max.z.toFixed(4)}]`);
    }
  });
}

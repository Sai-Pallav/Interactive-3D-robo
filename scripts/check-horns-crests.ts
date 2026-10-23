import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotTorso } from '../src/robot/torso/RobotTorso';

const materials = createRobotMaterials();
const torso = createRobotTorso(materials);
torso.group.updateMatrixWorld(true);

console.log('=== CHECKING WINGS, HORNS, AND BRACES ===');

// Check Vertebra 03 horn vs Actuators
// In Vertebra 03, horn is at side * (halfW * 0.86 + 0.004), 0, 0.010
// In local stomach coords, V3 is at y = -0.134
const pCfg3 = torso.stomach.rings[2];
console.log('V3 position:', pCfg3.group.position.toArray());

// Let's test bounding box of V3 horn vs inner and outer actuators
const v3 = torso.stomach.rings[2].group;
const v3Box = new THREE.Box3().setFromObject(v3);
console.log('V3 Box:', v3Box.min.toArray().map(v=>v.toFixed(4)), 'to', v3Box.max.toArray().map(v=>v.toFixed(4)));

// Check Vertebra 01 thoracic transition crest vs LowerChestFrame
const crest = torso.stomach.rings[0].group.getObjectByName('ThoracicTransitionCrest');
if (crest) {
  const bCrest = new THREE.Box3().setFromObject(crest);
  console.log('ThoracicTransitionCrest Box:', bCrest.min.toArray().map(v=>v.toFixed(4)), 'to', bCrest.max.toArray().map(v=>v.toFixed(4)));
}

// Check SpineUpperMount gimbal ball vs socket
const ball = torso.stomach.upperConnector.getObjectByName('SpineUpperMount');
console.log('Upper connector group:', torso.stomach.upperConnector.name);
torso.stomach.upperConnector.traverse(c => {
  const b = new THREE.Box3().setFromObject(c);
  console.log(`  UpperConnector child ${c.name || 'unnamed'}: [${b.min.toArray().map(v=>v.toFixed(4))}] to [${b.max.toArray().map(v=>v.toFixed(4))}]`);
});

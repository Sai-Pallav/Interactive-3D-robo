import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotTorso } from '../src/robot/torso/RobotTorso';

const materials = createRobotMaterials();
const torso = createRobotTorso(materials);
torso.group.updateMatrixWorld(true);

console.log('=== CHECKING SEPARATOR BARS VS ACTUATORS COLLISION ===');

const v4 = torso.stomach.segment04;
const bV4 = new THREE.Box3().setFromObject(v4);
console.log('Vertebra 04 Box:', bV4.min.toArray().map(v=>v.toFixed(4)), 'to', bV4.max.toArray().map(v=>v.toFixed(4)));

// Check left actuator cluster
const leftCluster = torso.stomach.sideMechanismLeft;
const bLeft = new THREE.Box3().setFromObject(leftCluster);
console.log('Left Actuator Cluster Box:', bLeft.min.toArray().map(v=>v.toFixed(4)), 'to', bLeft.max.toArray().map(v=>v.toFixed(4)));

const rightCluster = torso.stomach.sideMechanismRight;
const bRight = new THREE.Box3().setFromObject(rightCluster);
console.log('Right Actuator Cluster Box:', bRight.min.toArray().map(v=>v.toFixed(4)), 'to', bRight.max.toArray().map(v=>v.toFixed(4)));

console.log('Left Cluster max X:', bLeft.max.x.toFixed(4));
console.log('Vertebra 04 min X:', bV4.min.x.toFixed(4));
console.log('Overlap (leftCluster.max.x - v4.min.x):', (bLeft.max.x - bV4.min.x).toFixed(4));

console.log('Right Cluster min X:', bRight.min.x.toFixed(4));
console.log('Vertebra 04 max X:', bV4.max.x.toFixed(4));
console.log('Overlap (v4.max.x - rightCluster.min.x):', (bV4.max.x - bRight.min.x).toFixed(4));

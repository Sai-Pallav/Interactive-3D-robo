import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotTorso } from '../src/robot/torso/RobotTorso';

const materials = createRobotMaterials();
const torso = createRobotTorso(materials);
torso.group.updateMatrixWorld(true);

console.log('=== CHECKING ALL VERTEBRAE VS ACTUATOR CLUSTERS ===');

const leftCluster = torso.stomach.sideMechanismLeft;
const bLeft = new THREE.Box3().setFromObject(leftCluster);
const rightCluster = torso.stomach.sideMechanismRight;
const bRight = new THREE.Box3().setFromObject(rightCluster);

for (let i = 0; i < 5; i++) {
  const v = torso.stomach.rings[i].group;
  const bV = new THREE.Box3().setFromObject(v);
  console.log(`\nVertebra 0${i + 1}:`);
  console.log(`  X bounds: [${bV.min.x.toFixed(4)}, ${bV.max.x.toFixed(4)}]`);
  console.log(`  Y bounds: [${bV.min.y.toFixed(4)}, ${bV.max.y.toFixed(4)}]`);
  console.log(`  Z bounds: [${bV.min.z.toFixed(4)}, ${bV.max.z.toFixed(4)}]`);
  
  // Calculate horizontal distance/overlap to Left Cluster and Right Cluster at this Y level:
  const leftOverlap = bLeft.max.x - bV.min.x;
  const rightOverlap = bV.max.x - bRight.min.x;
  console.log(`  Left Overlap: ${(leftOverlap * 1000).toFixed(2)} mm`);
  console.log(`  Right Overlap: ${(rightOverlap * 1000).toFixed(2)} mm`);
}

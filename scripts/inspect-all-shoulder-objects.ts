import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotTorso } from '../src/robot/torso/RobotTorso';
import { createRobotArm } from '../src/robot/arm/RobotArm';

const mats = createRobotMaterials();
const torso = createRobotTorso(mats);
const leftArm = createRobotArm(-1, mats);
const rightArm = createRobotArm(1, mats);

const leftMount = torso.shoulderMountLeft.extensionNodes?.armMount || torso.shoulderMountLeft.group;
leftMount.add(leftArm.root);

const rightMount = torso.shoulderMountRight.extensionNodes?.armMount || torso.shoulderMountRight.group;
rightMount.add(rightArm.root);

torso.group.updateMatrixWorld(true);

console.log('--- ALL OBJECTS NEAR RIGHT SHOULDER (X in [0.12, 0.35]) ---');
torso.group.traverse(obj => {
  if (obj.isMesh && obj.visible !== false) {
    const box = new THREE.Box3().setFromObject(obj);
    const c = new THREE.Vector3(); box.getCenter(c);
    const s = new THREE.Vector3(); box.getSize(s);
    if (c.x > 0.12 && c.x < 0.35 && c.y > 0.05 && c.y < 0.25) {
      console.log(obj.name.padEnd(45), 'Mat:', (obj.material?.name || 'unnamed').padEnd(20), 'Center:', c.toArray().map(v=>v.toFixed(4)), 'Size:', s.toArray().map(v=>v.toFixed(4)));
    }
  }
});

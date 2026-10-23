import * as THREE from 'three';
import { createProceduralRobot } from '../src/robot/robot/RobotProceduralFactory';

const robot = createProceduralRobot();
robot.root.rotation.set(0, 0, 0);
robot.root.position.set(0, 0, 0);
robot.root.updateMatrixWorld(true);

const neck = robot.neck;
const head = robot.head;

console.log('Original Neck pos:', neck.position);
console.log('Original Head pos:', head.position);

// Let's inspect the exact world position of the top of the neck:
const cervicalConnector = neck.getObjectByName('NeckCervicalConnector');
const gimbalPlate = neck.getObjectByName('OccipitalGimbalMountPlate');

console.log('cervicalConnector local pos:', cervicalConnector?.position);
console.log('gimbalPlate local pos:', gimbalPlate?.position);

// If head pivot is at the cervical connector center in Neck space:
// NeckCervicalConnector is at y=0.150, z=-0.005.
// OccipitalGimbalMountPlate is at y=0.144, z=-0.018.
// Center = (0, 0.147, -0.010)
const cervicalCenterInNeck = new THREE.Vector3(0, 0.147, -0.010);
console.log('Cervical joint center in Neck:', cervicalCenterInNeck);

// Distance from original head.position (0, 0.172, -0.014):
const offsetInNeck = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0.172, -0.014), cervicalCenterInNeck);
console.log('Offset in Neck:', offsetInNeck);
// In head local space (scaled by 0.88):
const offsetInHead = offsetInNeck.clone().divideScalar(0.88);
console.log('Offset in Head space:', offsetInHead);

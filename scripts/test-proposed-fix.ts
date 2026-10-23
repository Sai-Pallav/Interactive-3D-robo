import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotNeck } from '../src/robot/head/RobotNeck';
import { createRearNeckAssembly } from '../src/robot/head/RearNeckAssembly';
import { createRobotHead } from '../src/robot/head/RobotHead';

const materials = createRobotMaterials();
const headAssembly = createRobotHead(materials);

console.log('=== TEST PROPOSED PIVOT & MOUNT ALIGNMENT ===');

const neck = headAssembly.neck;
const head = headAssembly.head;

// Check current hierarchy
console.log('Head parent:', head.parent?.name);
console.log('Head current pos in neck:', head.position);

// The cervical connector is at:
const cervicalConnector = neck.getObjectByName('NeckCervicalConnector');
const gimbalPlate = neck.getObjectByName('OccipitalGimbalMountPlate');
console.log('cervicalConnector:', cervicalConnector?.position);
console.log('gimbalPlate:', gimbalPlate?.position);

// Cradle currently:
const cradle = head.getObjectByName('OccipitalNeckTransitionCradle');
console.log('cradle current pos in head:', cradle?.position, 'rot:', cradle?.rotation);

// Jaw socket currently:
const jawSocket = head.getObjectByName('JawNeckSocketGorget');
console.log('jawSocket current pos in head:', jawSocket?.position);

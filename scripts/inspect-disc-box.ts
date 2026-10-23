import * as THREE from 'three';
import { createProceduralRobot } from '../src/robot/robot/RobotProceduralFactory';

const robot = createProceduralRobot();
robot.root.updateMatrixWorld(true);

const kneeLatDisc = robot.leftLegNodes.knee.lateralDisc;
const kneeMedDisc = robot.leftLegNodes.knee.medialDisc;

console.log('kneeLatDisc parent:', kneeLatDisc.parent?.name);
console.log('kneeLatDisc position:', kneeLatDisc.position);
const bLatDisc = new THREE.Box3().setFromObject(kneeLatDisc);
console.log('bLatDisc min/max Y:', [bLatDisc.min.y, bLatDisc.max.y]);

const thighLat = robot.leftLegNodes.thigh.lateralArmor;
const bLat = new THREE.Box3().setFromObject(thighLat);
console.log('bLat min/max Y:', [bLat.min.y, bLat.max.y]);
console.log('lat gap:', (bLat.min.y - bLatDisc.max.y) * 1000);

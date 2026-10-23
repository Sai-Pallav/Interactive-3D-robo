import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createProceduralRobot } from '../src/robot/robot/RobotProceduralFactory';
import { LegAnimationController } from '../src/robot/leg/LegAnimationController';
import { LEG_CONFIG } from '../src/robot/leg/LegConfig';

// Temporarily test modified config values
const cfg = LEG_CONFIG;

// Test with full robot and kinematics controller
const robot = createProceduralRobot();
robot.root.updateMatrixWorld(true);

const controller = new LegAnimationController(robot.leftLegNodes, robot.rightLegNodes);

console.log('--- TEST WITH STANCE ROTATIONS (As in test-leg-kinematics.mjs) ---');
const thighAnt = robot.leftLegNodes.thigh.anteriorArmor;
const patella = robot.leftLegNodes.knee.patellaShield;
const shinKeel = robot.leftLegNodes.shin.anteriorKeelArmor;
const thighLat = robot.leftLegNodes.thigh.lateralArmor;
const thighMed = robot.leftLegNodes.thigh.medialArmor;
const kneeLatDisc = robot.leftLegNodes.knee.lateralDisc;
const kneeMedDisc = robot.leftLegNodes.knee.medialDisc;
const trochHood = robot.leftLegNodes.thigh.trochanterHood;

const bAnt = new THREE.Box3().setFromObject(thighAnt);
const bPat = new THREE.Box3().setFromObject(patella);
const bKeel = new THREE.Box3().setFromObject(shinKeel);
const bLat = new THREE.Box3().setFromObject(thighLat);
const bMed = new THREE.Box3().setFromObject(thighMed);
const bLatDisc = new THREE.Box3().setFromObject(kneeLatDisc);
const bMedDisc = new THREE.Box3().setFromObject(kneeMedDisc);
const bTroch = new THREE.Box3().setFromObject(trochHood);

const antToPatGap = (bAnt.min.y - bPat.max.y) * 1000;
console.log(`Thigh Anterior to Patella gap: ${antToPatGap.toFixed(2)} mm (Target: 3-8 mm)`);

const patToKeelGap = (bPat.min.y - bKeel.max.y) * 1000;
console.log(`Patella to Shin Keel gap: ${patToKeelGap.toFixed(2)} mm (Target: >= 2 mm)`);

const latToDiscGap = (bLat.min.y - bLatDisc.max.y) * 1000;
console.log(`Thigh Lateral to Disc gap: ${latToDiscGap.toFixed(2)} mm (Target: >= 2 mm)`);

const medToDiscGap = (bMed.min.y - bMedDisc.max.y) * 1000;
console.log(`Thigh Medial to Disc gap: ${medToDiscGap.toFixed(2)} mm (Target: >= 1.5 mm)`);

const trochToAntOverlap = (bTroch.min.y - bAnt.max.y) * 1000;
console.log(`Trochanter bottom Y vs Thigh Anterior top Y: ${trochToAntOverlap.toFixed(2)} mm (Target: -30 to 0 mm)`);

import * as THREE from 'three';
import { createProceduralRobot } from '../src/robot/robot/RobotProceduralFactory';
import { TORSO_CONFIG } from '../src/robot/torso/TorsoConfig';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotHead } from '../src/robot/head/RobotHead';
import { createRobotNeck } from '../src/robot/head/RobotNeck';
import { createRearNeckAssembly } from '../src/robot/head/RearNeckAssembly';
import { createRobotJaw } from '../src/robot/head/RobotJaw';
import { createRobotShell } from '../src/robot/head/RobotShell';

const materials = createRobotMaterials();
const headAssembly = createRobotHead(materials);
const neckAssembly = createRobotNeck(materials);
const rearNeck = createRearNeckAssembly(materials);
const jaw = createRobotJaw(materials);
const shell = createRobotShell(materials);

console.log('=== TORSO CONFIG COLLAR ===');
console.log(`collarY: ${TORSO_CONFIG.chest.collarY}, collarZ: ${TORSO_CONFIG.chest.collarZ}, collarRadius: ${TORSO_CONFIG.chest.collarRadius}`);

console.log('\n=== ROBOT PROCEDURAL FACTORY / RESOURCE MANAGER ATTACHMENT ===');
console.log('torsoNodes.upperTorsoFrame.group.add(headAssembly.neck)');
console.log('headAssembly.neck.position: (0, 0.128, 0.004)');
console.log('inside createRobotHead: neckAssembly.group.add(head)');
console.log('head.position: (0, 0.170, 0.004), head.scale: 0.88');

console.log('\n=== NECK INTERNAL OFFSETS (relative to Neck group) ===');
console.log('Neck group default position in RobotNeck.ts: (0, 0.145, -0.005)');
console.log('centralShaft position: (0, 0.095, 0)');
console.log('baseCollar position: (0, 0.010, 0)');
console.log('rings (01 to 04) centers in X and Z: (0, 0)');
console.log('ring Ys: 0.038, 0.068, 0.098, 0.126');
console.log('cervicalConnector position: (0, 0.150, -0.005)');
console.log('RearNeckAssembly OccipitalGimbalMountPlate: (0, 0.144, -0.018)');

console.log('\n=== HEAD LOWER MOUNTING AREA & JAW SOCKET ===');
// Let's inspect the JawNeckSocketGorget geometry and position in Jaw
const socketMesh = jaw.group.getObjectByName('JawNeckSocketGorget');
console.log('JawNeckSocketGorget in jaw.group:', socketMesh ? socketMesh.position : 'not found directly');

// Let's inspect JawShell vertices at v=1.0 (the enclosed socket rim)
// In createRobotJaw:
// v=1.0: socketRadius = 0.052, xSocket = socketRadius * sinA, ySocket = jawlineY - 0.010, zSocket = -0.008 + socketRadius * cosA
console.log('Jaw submental cowl socket center formula: Z = -0.008, radius = 0.052');
console.log('JawNeckSocketGorget position formula: position.set(0, -0.124, 0.010), radius = 0.054/0.050');

console.log('\n=== HEAD ROTATIONAL PIVOT & CENTER ===');
console.log('RobotHead group is at local (0, 0.170, 0.004) inside Neck group.');
console.log('When RobotHead rotates (yaw, pitch, roll), it rotates around its origin (0, 0, 0) in RobotHead local space.');
console.log('In Neck group coordinates, that pivot is at: (0, 0.170, 0.004).');
console.log('In RobotHead local space:');
console.log('- InnerSkullCore is at: (0, 0.020, -0.012)');
console.log('- JawAssembly is at: (0, 0, 0)');
console.log('- JawNeckSocketGorget is at: (0, -0.124, 0.010)');
console.log('- Crown apex is at: (0, 0.154, -0.016)');
console.log('- Visor center is roughly at: Z > 0');
console.log('- Ear modules (SideModules) are at: (±0.136, 0.020, -0.015)');

// Notice: In RobotHead local space, the ear modules are at Z = -0.015, InnerSkullCore is at Z = -0.012, Crown apex is at Z = -0.016!
console.log('\n=== CRITICAL OBSERVATION: CRANIAL CENTERLINE vs HEAD ORIGIN ===');
console.log('Ear modules Z: -0.015');
console.log('InnerSkullCore Z: -0.012');
console.log('Crown apex Z: -0.016');
console.log('Average cranium center Z in RobotHead local space: ~ -0.014');

// Now let's calculate what happens when Head is scaled by 0.88 and placed at (0, 0.170, 0.004) in Neck group:
const headScale = 0.88;
const headZInNeck = 0.004;
const earZInNeck = headZInNeck + (-0.015) * headScale;
const skullZInNeck = headZInNeck + (-0.012) * headScale;
const jawSocketZInNeck = headZInNeck + (0.010) * headScale;

console.log(`Ear Z in Neck space: ${earZInNeck.toFixed(5)}`);
console.log(`Skull center Z in Neck space: ${skullZInNeck.toFixed(5)}`);
console.log(`Jaw socket Z in Neck space: ${jawSocketZInNeck.toFixed(5)}`);

console.log('\n=== NECK CENTERLINE in Neck space ===');
console.log('Neck cylindrical shaft and rings center: (X = 0, Z = 0)');
console.log('Neck cervical connector center: (X = 0, Z = -0.005)');
console.log('Neck gimbal plate center: (X = 0, Z = -0.018)');

console.log('\n=== TORSO COLLAR in UpperTorsoFrame space ===');
console.log(`collarZ in TORSO_CONFIG: ${TORSO_CONFIG.chest.collarZ} (0.004)`);
console.log(`Neck group position in UpperTorsoFrame: (0, 0.128, 0.004)`);
console.log(`So Neck group Z = 0.004 matches TORSO_CONFIG.chest.collarZ = 0.004!`);
console.log(`In UpperTorsoFrame space, Neck rings are at Z = 0.004 + 0 = 0.004!`);
console.log(`In UpperTorsoFrame space, Torso Collar is at Z = 0.004!`);
console.log(`So the Neck rings ARE aligned with the Torso Collar in UpperTorsoFrame at Z = 0.004!`);

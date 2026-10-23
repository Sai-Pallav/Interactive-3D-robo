import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotHead } from '../src/robot/head/RobotHead';
import { createRobotNeck } from '../src/robot/head/RobotNeck';
import { createRearNeckAssembly } from '../src/robot/head/RearNeckAssembly';
import { createRobotJaw } from '../src/robot/head/RobotJaw';

const materials = createRobotMaterials();
const headAssembly = createRobotHead(materials);

// In Neck space:
// Neck base is at y = 0
// Torso collar bezel sits at y ≈ 0 to 0.018 (in UpperTorsoFrame, neck is at y=0.128, collar is at y=0.124)
console.log('=== NECK COMPONENT VERTICAL SPANS (Neck local Y) ===');
console.log('BaseCollar: y = 0.010, h = 0.024 -> span [ -0.002, 0.022 ]');
console.log('NeckRing01: y = 0.038, h = 0.026 -> span [  0.025, 0.051 ]');
console.log('NeckRing02: y = 0.068, h = 0.026 -> span [  0.055, 0.081 ]');
console.log('NeckRing03: y = 0.098, h = 0.024 -> span [  0.086, 0.110 ]');
console.log('NeckRing04: y = 0.126, h = 0.022 -> span [  0.115, 0.137 ]');
console.log('NeckCervicalConnector: y = 0.150, h = 0.028 -> span [ 0.136, 0.164 ]');
console.log('OccipitalGimbalMountPlate: y = 0.144, h = 0.014 -> span [ 0.137, 0.151 ]');

console.log('\n=== HEAD COMPONENT VERTICAL SPANS IN NECK SPACE ===');
// Head root is at local position in neck: (0, 0.170, 0.004), scale = 0.88
// A point at local Y in Head corresponds to: 0.170 + Y_head * 0.88
function headToNeckY(yHead: number) {
  return 0.170 + yHead * 0.88;
}
function headToNeckZ(zHead: number) {
  return 0.004 + zHead * 0.88;
}

console.log(`Head Root Pivot: y = 0.170, z = 0.004`);
console.log(`Ear Module center (y=0.020, z=-0.015): y = ${headToNeckY(0.020).toFixed(4)}, z = ${headToNeckZ(-0.015).toFixed(4)}`);
console.log(`InnerSkullCore center (y=0.020, z=-0.012): y = ${headToNeckY(0.020).toFixed(4)}, z = ${headToNeckZ(-0.012).toFixed(4)}`);
console.log(`Crown apex (y=0.154, z=-0.016): y = ${headToNeckY(0.154).toFixed(4)}, z = ${headToNeckZ(-0.016).toFixed(4)}`);
console.log(`Chin Apex (y=-0.118, z=0.150): y = ${headToNeckY(-0.118).toFixed(4)}, z = ${headToNeckZ(0.150).toFixed(4)}`);
console.log(`JawNeckSocketGorget (y=-0.124, z=0.010, h=0.020):`);
console.log(`  center: y = ${headToNeckY(-0.124).toFixed(4)}, z = ${headToNeckZ(0.010).toFixed(4)}`);
console.log(`  top: y = ${headToNeckY(-0.124 + 0.010).toFixed(4)}, bottom: y = ${headToNeckY(-0.124 - 0.010).toFixed(4)}`);
console.log(`Rear Nape LED (y=-0.034, z=-0.148): y = ${headToNeckY(-0.034).toFixed(4)}, z = ${headToNeckZ(-0.148).toFixed(4)}`);

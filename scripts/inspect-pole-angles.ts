import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { TORSO_CONFIG } from '../src/robot/torso/TorsoConfig';

const materials = createRobotMaterials();

// Let's create an unmerged side actuator assembly
const cfg = TORSO_CONFIG.stomach;
const dual = cfg.dualActuators;

console.log('=== DUAL ACTUATOR CONFIG ===');
console.log(JSON.stringify(dual, null, 2));

// Let's test the geometry of each pole directly
for (const side of [-1, 1] as const) {
  for (const poleType of ['outer', 'inner'] as const) {
    const pCfg = dual[poleType];
    const upper = new THREE.Vector3(side * pCfg.upperMount.x, pCfg.upperMount.y, pCfg.upperMount.z);
    const lower = new THREE.Vector3(side * pCfg.lowerMount.x, pCfg.lowerMount.y, pCfg.lowerMount.z);
    const dir = new THREE.Vector3().subVectors(lower, upper);
    const len = dir.length();
    const dirNorm = dir.clone().normalize();
    
    // Euler angles of rotation from (0, -1, 0)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dirNorm);
    const euler = new THREE.Euler().setFromQuaternion(q, 'YXZ');
    
    console.log(`\nSide ${side} ${poleType}:`);
    console.log(`  Upper mount: [${upper.x.toFixed(4)}, ${upper.y.toFixed(4)}, ${upper.z.toFixed(4)}]`);
    console.log(`  Lower mount: [${lower.x.toFixed(4)}, ${lower.y.toFixed(4)}, ${lower.z.toFixed(4)}]`);
    console.log(`  Length: ${(len * 1000).toFixed(2)} mm`);
    console.log(`  Direction: [${dirNorm.x.toFixed(4)}, ${dirNorm.y.toFixed(4)}, ${dirNorm.z.toFixed(4)}]`);
    console.log(`  Inclination (roll, pitch, yaw deg): [${(euler.z * 180 / Math.PI).toFixed(2)}, ${(euler.x * 180 / Math.PI).toFixed(2)}, ${(euler.y * 180 / Math.PI).toFixed(2)}]`);
  }
}

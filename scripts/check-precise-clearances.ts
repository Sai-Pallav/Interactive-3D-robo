import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { TORSO_CONFIG } from '../src/robot/torso/TorsoConfig';

const cfg = TORSO_CONFIG.stomach;
const innerMount = cfg.dualActuators.inner;
const upper = new THREE.Vector3(innerMount.upperMount.x, innerMount.upperMount.y, innerMount.upperMount.z);
const lower = new THREE.Vector3(innerMount.lowerMount.x, innerMount.lowerMount.y, innerMount.lowerMount.z);

console.log('=== PRECISE CLEARANCE ANALYSIS AT EACH VERTEBRAL LEVEL ===');
// baseY in robot root is 0.12, but inside stomach group, vertebra positions are in local stomach coordinates:
// vertebraY: [-0.082, -0.108, -0.134, -0.158, -0.182]
for (let i = 0; i < cfg.vertebraCount; i++) {
  const y = cfg.vertebraY[i];
  const pCfg = cfg.armorPlates[i];
  const w = pCfg.width;
  const halfW = w * 0.5;
  const botW = halfW * 0.88;
  const separatorW = w * 1.02;

  // At this Y, where is the centerline of the inner actuator pole?
  const t = (y - upper.y) / (lower.y - upper.y);
  const poleCenter = new THREE.Vector3().lerpVectors(upper, lower, t);
  const poleRadius = innerMount.cylinderRadius; // 0.009
  const poleInnerEdgeX = poleCenter.x - poleRadius;

  console.log(`\nVertebra 0${i + 1} (Y = ${y.toFixed(3)}):`);
  console.log(`  Inner Actuator Pole Center X: ${poleCenter.x.toFixed(4)}, Z: ${poleCenter.z.toFixed(4)}`);
  console.log(`  Inner Actuator Pole Inner Edge X: ${poleInnerEdgeX.toFixed(4)}`);
  console.log(`  Armor Max Half-Width (midW): ${halfW.toFixed(4)}`);
  console.log(`  Armor Bottom Half-Width (botW): ${botW.toFixed(4)}`);
  console.log(`  Separator Half-Width (separatorW/2): ${(separatorW * 0.5).toFixed(4)}`);
  
  const armorClearance = (poleInnerEdgeX - halfW) * 1000;
  const separatorClearance = (poleInnerEdgeX - separatorW * 0.5) * 1000;
  
  console.log(`  Armor-to-Pole Clearance: ${armorClearance.toFixed(2)} mm`);
  console.log(`  Separator-to-Pole Clearance: ${separatorClearance.toFixed(2)} mm ${separatorClearance < 0 ? '--> PENETRATION/COLLISION!' : ''}`);
}

import * as THREE from 'three';
import { TORSO_CONFIG } from '../src/robot/torso/TorsoConfig';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotTorso } from '../src/robot/torso/RobotTorso';

const mats = createRobotMaterials();
const torso = createRobotTorso(mats);
torso.group.updateMatrixWorld(true);

const cfg = TORSO_CONFIG.stomach;
const rearCfg = cfg.rearActuators;
const upper = new THREE.Vector3(rearCfg.upperMount.x, rearCfg.upperMount.y, rearCfg.upperMount.z);
const lower = new THREE.Vector3(rearCfg.lowerMount.x, rearCfg.lowerMount.y, rearCfg.lowerMount.z);
const poleRadius = rearCfg.cylinderRadius; // 0.0068

console.log('=== REAR ACTUATOR CLEARANCE ANALYSIS AT EACH VERTEBRAL LEVEL ===');
for (let i = 0; i < cfg.vertebraCount; i++) {
  const y = cfg.vertebraY[i];
  const t = (y - upper.y) / (lower.y - upper.y);
  const poleCenter = new THREE.Vector3().lerpVectors(upper, lower, t);
  const poleInnerEdgeX = poleCenter.x - poleRadius;

  // Find corresponding rear vertebra segment
  let segBox: THREE.Box3 | null = null;
  torso.group.traverse(o => {
    if (o.name === `RearVertebraSegment_${String(i + 1).padStart(2, '0')}`) {
      segBox = new THREE.Box3().setFromObject(o);
    }
  });

  console.log(`\nVertebra 0${i + 1} (Y = ${y.toFixed(3)}):`);
  console.log(`  Rear Pole Center: [${poleCenter.x.toFixed(4)}, ${poleCenter.y.toFixed(4)}, ${poleCenter.z.toFixed(4)}]`);
  if (segBox) {
    const sBox = segBox as THREE.Box3;
    console.log(`  Rear Segment Box: X: [${sBox.min.x.toFixed(4)}, ${sBox.max.x.toFixed(4)}], Y: [${sBox.min.y.toFixed(4)}, ${sBox.max.y.toFixed(4)}], Z: [${sBox.min.z.toFixed(4)}, ${sBox.max.z.toFixed(4)}]`);
    // Distance from pole center to segBox
    const clX = (poleInnerEdgeX - sBox.max.x) * 1000;
    console.log(`  Clearance in X: ${clX.toFixed(2)} mm ${clX < 0 ? '--> PENETRATION!' : '[OK]'}`);
  }
}

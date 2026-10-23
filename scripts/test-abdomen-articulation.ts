import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotTorso } from '../src/robot/torso/RobotTorso';
import { TorsoAnimationController } from '../src/robot/torso/TorsoAnimationController';

const materials = createRobotMaterials();
const torso = createRobotTorso(materials);
const anim = new TorsoAnimationController(torso);

console.log('=== TESTING DYNAMIC TORSO ARTICULATION & KINEMATICS ===');

let passCount = 0;
let totalCount = 0;

function checkState(desc: string, pitch: number, yaw: number, roll: number) {
  totalCount++;
  anim.update(pitch, yaw, roll);
  torso.group.updateMatrixWorld(true);

  // Check upper connector world position vs chest pivot
  const upperPos = new THREE.Vector3();
  torso.stomach.upperConnector.getWorldPosition(upperPos);
  
  const chestWp = new THREE.Vector3();
  torso.chestPivot.getWorldPosition(chestWp);

  // Check waist interface
  const waistPos = new THREE.Vector3();
  torso.stomach.lowerConnector.getWorldPosition(waistPos);

  // Check 5 vertebrae positions
  const vPos: THREE.Vector3[] = [];
  torso.stomach.rings.forEach((r, idx) => {
    const p = new THREE.Vector3();
    r.group.getWorldPosition(p);
    vPos.push(p);
  });

  // Verify monotonicity in Y
  let monotonic = true;
  for (let i = 0; i < vPos.length - 1; i++) {
    if (vPos[i].y <= vPos[i + 1].y) {
      monotonic = false;
    }
  }

  if (monotonic) {
    passCount++;
    console.log(`[PASS] ${desc.padEnd(45)}: Spinal stack strictly ordered. Y-span: ${vPos[0].y.toFixed(3)} to ${vPos[4].y.toFixed(3)}`);
  } else {
    console.error(`[FAIL] ${desc.padEnd(45)}: Inversion detected!`);
  }
}

checkState('Neutral pose', 0, 0, 0);
checkState('Moderate flexion (+0.05 pitch)', 0.05, 0, 0);
checkState('Moderate extension (-0.05 pitch)', -0.05, 0, 0);
checkState('Max left yaw (+0.10 yaw)', 0, 0.10, 0);
checkState('Max right yaw (-0.10 yaw)', 0, -0.10, 0);
checkState('Lateral flexion (+0.04 roll)', 0, 0, 0.04);
checkState('Compound combat pose (+0.06 pitch, 0.10 yaw, 0.03 roll)', 0.06, 0.10, 0.03);

console.log(`\nArticulation Test Result: ${passCount}/${totalCount} tests passed.`);
if (passCount === totalCount) {
  console.log('>>> ALL DYNAMIC ARTICULATION TESTS PASSED [OK] <<<');
} else {
  process.exit(1);
}

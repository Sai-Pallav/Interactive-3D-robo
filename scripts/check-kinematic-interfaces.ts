import * as THREE from 'three';
import { createProceduralRobot } from '../src/robot/robot/RobotProceduralFactory';

const robot = createProceduralRobot();
robot.root.rotation.set(0, 0, 0);
robot.root.updateMatrixWorld(true);

console.log('=== ROBOT MECHANICAL INTERFACE INTEGRITY AUDIT ===\n');

function checkDistance(nameA: string, objA: THREE.Object3D | null | undefined, nameB: string, objB: THREE.Object3D | null | undefined, thresholdM: number = 0.015) {
  if (!objA) {
    console.log(`[MISSING] ${nameA}`);
    return;
  }
  if (!objB) {
    console.log(`[MISSING] ${nameB}`);
    return;
  }
  const posA = new THREE.Vector3(); objA.getWorldPosition(posA);
  const posB = new THREE.Vector3(); objB.getWorldPosition(posB);
  const dist = posA.distanceTo(posB);
  const status = dist <= thresholdM ? 'OK' : 'MISALIGNED';
  console.log(`[${status}] ${nameA} -> ${nameB}: dist = ${(dist * 1000).toFixed(1)} mm (posA=[${posA.x.toFixed(3)}, ${posA.y.toFixed(3)}, ${posA.z.toFixed(3)}], posB=[${posB.x.toFixed(3)}, ${posB.y.toFixed(3)}, ${posB.z.toFixed(3)}])`);
}

// 1. Neck to Chest Collar
const neckCollar = robot.root.getObjectByName('NeckCollar');
checkDistance('Neck Base', robot.neck, 'Neck Collar', neckCollar, 0.020);

// 2. Spine Upper Mount to Lower Chest Frame
const spineBall = robot.root.getObjectByName('SpineUpperMount_Joint_Merged') || robot.root.getObjectByName('SpineUpperMount');
const chestSocket = robot.root.getObjectByName('LowerChestFrame_Merged') || robot.root.getObjectByName('LowerChestFrame');
checkDistance('Spine Upper Mount', spineBall, 'Chest Socket', chestSocket, 0.020);

// 3. Left Shoulder to Left Arm Mount
const leftArmMount = robot.root.getObjectByName('LeftArmMount');
const leftArmRoot = robot.root.getObjectByName('LeftRobotArmRoot');
checkDistance('Left Shoulder Mount', leftArmMount, 'Left Arm Root', leftArmRoot, 0.005);

// 4. Right Shoulder to Right Arm Mount
const rightArmMount = robot.root.getObjectByName('RightArmMount');
const rightArmRoot = robot.root.getObjectByName('RightRobotArmRoot');
checkDistance('Right Shoulder Mount', rightArmMount, 'Right Arm Root', rightArmRoot, 0.005);

// 5. Left Hip to Left Leg Root
const leftHipPivot = robot.root.getObjectByName('LeftHipPivot');
const leftLegRoot = robot.root.getObjectByName('LeftLegRoot');
checkDistance('Left Hip Pivot', leftHipPivot, 'Left Leg Root', leftLegRoot, 0.005);

// 6. Right Hip to Right Leg Root
const rightHipPivot = robot.root.getObjectByName('RightHipPivot');
const rightLegRoot = robot.root.getObjectByName('RightLegRoot');
checkDistance('Right Hip Pivot', rightHipPivot, 'Right Leg Root', rightLegRoot, 0.005);

// 7. Left Knee to Left Shin
const leftKnee = robot.root.getObjectByName('KneeCore_L');
const leftShin = robot.root.getObjectByName('ShinFrame_Merged_L');
checkDistance('Left Knee', leftKnee, 'Left Shin', leftShin, 0.060);

// 8. Right Knee to Right Shin
const rightKnee = robot.root.getObjectByName('KneeCore_R');
const rightShin = robot.root.getObjectByName('ShinFrame_Merged_R');
checkDistance('Right Knee', rightKnee, 'Right Shin', rightShin, 0.060);

// 9. Left Ankle to Left Foot
const leftAnkle = robot.root.getObjectByName('AnkleJointCore_L');
const leftFoot = robot.root.getObjectByName('FootJointCore_L');
checkDistance('Left Ankle', leftAnkle, 'Left Foot', leftFoot, 0.030);

// 10. Right Ankle to Right Foot
const rightAnkle = robot.root.getObjectByName('AnkleJointCore_R');
const rightFoot = robot.root.getObjectByName('FootJointCore_R');
checkDistance('Right Ankle', rightAnkle, 'Right Foot', rightFoot, 0.030);

console.log('\nAudit complete.');

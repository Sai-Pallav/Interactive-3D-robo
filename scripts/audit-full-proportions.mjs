import * as THREE from 'three';
import { createProceduralRobot } from '../src/robot/robot/RobotProceduralFactory.ts';
import { ROBOT_CONFIG } from '../src/robot/config.ts';
import { TORSO_CONFIG } from '../src/robot/torso/TorsoConfig.ts';
import { LEG_CONFIG } from '../src/robot/leg/LegConfig.ts';

const robot = createProceduralRobot();
robot.root.rotation.set(0, 0, 0); // neutral rotation
robot.root.updateMatrixWorld(true);

function getBox(obj, name = '') {
  if (!obj) return null;
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  return {
    name,
    min: [box.min.x, box.min.y, box.min.z],
    max: [box.max.x, box.max.y, box.max.z],
    width: size.x,
    height: size.y,
    depth: size.z,
    center: [center.x, center.y, center.z]
  };
}

console.log('=== ROBOT FULL BODY PROPORTION AUDIT ===\n');

// 1. Overall Robot
const rootBox = getBox(robot.root, 'Full Robot');
console.log(`FULL ROBOT: Height: ${(rootBox.height * 1000).toFixed(1)} mm, Width: ${(rootBox.width * 1000).toFixed(1)} mm, Depth: ${(rootBox.depth * 1000).toFixed(1)} mm`);
console.log(`   Y min: ${(rootBox.min[1] * 1000).toFixed(1)} mm, Y max: ${(rootBox.max[1] * 1000).toFixed(1)} mm\n`);

// 2. Head & Neck
const headBox = getBox(robot.head, 'Head');
const visorBox = getBox(robot.faceVisor, 'Visor');
const neckBox = getBox(robot.neck, 'Neck');
console.log(`HEAD: W: ${(headBox.width * 1000).toFixed(1)} mm, H: ${(headBox.height * 1000).toFixed(1)} mm, D: ${(headBox.depth * 1000).toFixed(1)} mm`);
console.log(`VISOR: W: ${(visorBox.width * 1000).toFixed(1)} mm, H: ${(visorBox.height * 1000).toFixed(1)} mm, D: ${(visorBox.depth * 1000).toFixed(1)} mm`);
console.log(`NECK: W: ${(neckBox.width * 1000).toFixed(1)} mm, H: ${(neckBox.height * 1000).toFixed(1)} mm, D: ${(neckBox.depth * 1000).toFixed(1)} mm\n`);

// 3. Torso: Chest, Abdomen, Waist, Pelvis
const chestBox = getBox(robot.torsoNodes.chestArmor.group, 'Chest Armor');
const chestCentralBox = getBox(robot.torsoNodes.chestArmor.centerPanel, 'Chest Central Panel');
const upperTorsoBox = getBox(robot.torsoNodes.upperTorsoFrame.group, 'Upper Torso Frame');
const stomachBox = getBox(robot.torsoNodes.stomach.group, 'Stomach / Abdomen');
const waistBox = getBox(robot.torsoNodes.waist.group, 'Waist Assembly');
const pelvicBox = getBox(robot.torsoNodes.waist.pelvicPlate, 'Pelvic Plate');
const leftHipBox = getBox(robot.torsoNodes.waist.leftHip.group, 'Left Hip Mount');
const rightHipBox = getBox(robot.torsoNodes.waist.rightHip.group, 'Right Hip Mount');

console.log(`CHEST ARMOR GROUP: W: ${(chestBox.width * 1000).toFixed(1)} mm, H: ${(chestBox.height * 1000).toFixed(1)} mm, D: ${(chestBox.depth * 1000).toFixed(1)} mm`);
console.log(`CHEST CENTRAL PANEL: W: ${(chestCentralBox.width * 1000).toFixed(1)} mm, H: ${(chestCentralBox.height * 1000).toFixed(1)} mm, D: ${(chestCentralBox.depth * 1000).toFixed(1)} mm`);
console.log(`UPPER TORSO FRAME: W: ${(upperTorsoBox.width * 1000).toFixed(1)} mm, H: ${(upperTorsoBox.height * 1000).toFixed(1)} mm, D: ${(upperTorsoBox.depth * 1000).toFixed(1)} mm`);
console.log(`ABDOMEN (STOMACH): W: ${(stomachBox.width * 1000).toFixed(1)} mm, H: ${(stomachBox.height * 1000).toFixed(1)} mm, D: ${(stomachBox.depth * 1000).toFixed(1)} mm`);
console.log(`WAIST ASSEMBLY: W: ${(waistBox.width * 1000).toFixed(1)} mm, H: ${(waistBox.height * 1000).toFixed(1)} mm, D: ${(waistBox.depth * 1000).toFixed(1)} mm`);
console.log(`PELVIC PLATE: W: ${(pelvicBox.width * 1000).toFixed(1)} mm, H: ${(pelvicBox.height * 1000).toFixed(1)} mm, D: ${(pelvicBox.depth * 1000).toFixed(1)} mm`);

// Measure hip span (distance between hip pivot centers)
const leftHipPos = new THREE.Vector3();
const rightHipPos = new THREE.Vector3();
robot.torsoNodes.waist.leftHipPivot.getWorldPosition(leftHipPos);
robot.torsoNodes.waist.rightHipPivot.getWorldPosition(rightHipPos);
console.log(`HIP PIVOT SPAN: ${((rightHipPos.x - leftHipPos.x) * 1000).toFixed(1)} mm (Left X: ${(leftHipPos.x * 1000).toFixed(1)}, Right X: ${(rightHipPos.x * 1000).toFixed(1)})\n`);

// 4. Arms & Hands
const leftShoulderBox = getBox(robot.leftShoulder, 'Left Shoulder Mount');
const leftUpperArmBox = getBox(robot.leftArmNodes.upperArm.group, 'Left Upper Arm');
const leftElbowBox = getBox(robot.leftArmNodes.elbow.group, 'Left Elbow');
const leftForearmBox = getBox(robot.leftArmNodes.forearm.group, 'Left Forearm');
const leftWristBox = getBox(robot.leftArmNodes.wrist.group, 'Left Wrist');
const leftHandBox = getBox(robot.leftHand, 'Left Hand');

// Shoulder span (between shoulder socket centers)
const leftShoulderPos = new THREE.Vector3();
const rightShoulderPos = new THREE.Vector3();
robot.leftArmNodes.upperArm.group.getWorldPosition(leftShoulderPos);
robot.rightArmNodes.upperArm.group.getWorldPosition(rightShoulderPos);
console.log(`SHOULDER SOCKET SPAN: ${((rightShoulderPos.x - leftShoulderPos.x) * 1000).toFixed(1)} mm (Left X: ${(leftShoulderPos.x * 1000).toFixed(1)}, Right X: ${(rightShoulderPos.x * 1000).toFixed(1)})`);

// Arm segment lengths
const leftElbowPos = new THREE.Vector3();
robot.leftArmNodes.elbowPivot.getWorldPosition(leftElbowPos);
const leftWristPos = new THREE.Vector3();
robot.leftArmNodes.wristPivot.getWorldPosition(leftWristPos);
const leftUpperArmLen = leftShoulderPos.distanceTo(leftElbowPos);
const leftForearmLen = leftElbowPos.distanceTo(leftWristPos);

console.log(`UPPER ARM: Length (pivot-to-pivot): ${(leftUpperArmLen * 1000).toFixed(1)} mm, Box W: ${(leftUpperArmBox.width * 1000).toFixed(1)} mm, D: ${(leftUpperArmBox.depth * 1000).toFixed(1)} mm`);
console.log(`FOREARM: Length (pivot-to-pivot): ${(leftForearmLen * 1000).toFixed(1)} mm, Box W: ${(leftForearmBox.width * 1000).toFixed(1)} mm, D: ${(leftForearmBox.depth * 1000).toFixed(1)} mm`);
console.log(`HAND: Box W: ${(leftHandBox.width * 1000).toFixed(1)} mm, H: ${(leftHandBox.height * 1000).toFixed(1)} mm, D: ${(leftHandBox.depth * 1000).toFixed(1)} mm`);
console.log(`WRIST: Box W: ${(leftWristBox.width * 1000).toFixed(1)} mm, H: ${(leftWristBox.height * 1000).toFixed(1)} mm, D: ${(leftWristBox.depth * 1000).toFixed(1)} mm\n`);

// 5. Legs & Feet
const leftThighBox = getBox(robot.leftLegNodes.thigh.group, 'Left Thigh');
const leftKneeBox = getBox(robot.leftLegNodes.knee.group, 'Left Knee');
const leftShinBox = getBox(robot.leftLegNodes.shin.group, 'Left Shin');
const leftAnkleBox = getBox(robot.leftLegNodes.ankle.group, 'Left Ankle');
const leftFootBox = getBox(robot.leftLegNodes.foot.group, 'Left Foot');

const leftKneePos = new THREE.Vector3();
robot.leftLegNodes.thigh.kneePivot.getWorldPosition(leftKneePos);
const leftAnklePos = new THREE.Vector3();
robot.leftLegNodes.shin.anklePivot.getWorldPosition(leftAnklePos);
const leftThighLen = leftHipPos.distanceTo(leftKneePos);
const leftShinLen = leftKneePos.distanceTo(leftAnklePos);

console.log(`THIGH: Length (hip-to-knee): ${(leftThighLen * 1000).toFixed(1)} mm, Box W: ${(leftThighBox.width * 1000).toFixed(1)} mm, D: ${(leftThighBox.depth * 1000).toFixed(1)} mm`);
console.log(`KNEE: Box W: ${(leftKneeBox.width * 1000).toFixed(1)} mm, H: ${(leftKneeBox.height * 1000).toFixed(1)} mm, D: ${(leftKneeBox.depth * 1000).toFixed(1)} mm`);
console.log(`SHIN: Length (knee-to-ankle): ${(leftShinLen * 1000).toFixed(1)} mm, Box W: ${(leftShinBox.width * 1000).toFixed(1)} mm, D: ${(leftShinBox.depth * 1000).toFixed(1)} mm`);
console.log(`ANKLE: Box W: ${(leftAnkleBox.width * 1000).toFixed(1)} mm, H: ${(leftAnkleBox.height * 1000).toFixed(1)} mm, D: ${(leftAnkleBox.depth * 1000).toFixed(1)} mm`);
console.log(`FOOT: Box W: ${(leftFootBox.width * 1000).toFixed(1)} mm, H: ${(leftFootBox.height * 1000).toFixed(1)} mm, D: ${(leftFootBox.depth * 1000).toFixed(1)} mm (Length along Z: ${(leftFootBox.depth * 1000).toFixed(1)} mm)\n`);

// 6. Proportions and Ratios
console.log('=== KEY RATIOS ===');
console.log(`Head W / Chest W: ${(headBox.width / chestBox.width).toFixed(3)} (Head: ${(headBox.width * 1000).toFixed(1)} mm, Chest: ${(chestBox.width * 1000).toFixed(1)} mm)`);
console.log(`Shoulder Span / Pelvis W: ${( (rightShoulderPos.x - leftShoulderPos.x) / pelvicBox.width ).toFixed(3)} (Shoulder Span: ${((rightShoulderPos.x - leftShoulderPos.x) * 1000).toFixed(1)} mm, Pelvis W: ${(pelvicBox.width * 1000).toFixed(1)} mm)`);
console.log(`Chest W / Abdomen W (Vertebra 05): ${(chestBox.width / 0.082).toFixed(2)}`);
console.log(`Chest W / Pelvis W: ${(chestBox.width / pelvicBox.width).toFixed(3)}`);
console.log(`Thigh Length / Shin Length: ${(leftThighLen / leftShinLen).toFixed(3)} (Thigh: ${(leftThighLen * 1000).toFixed(1)} mm, Shin: ${(leftShinLen * 1000).toFixed(1)} mm)`);
console.log(`Thigh Width / Shin Width: ${(leftThighBox.width / leftShinBox.width).toFixed(3)} (Thigh: ${(leftThighBox.width * 1000).toFixed(1)} mm, Shin: ${(leftShinBox.width * 1000).toFixed(1)} mm)`);
console.log(`Upper Arm Length / Forearm Length: ${(leftUpperArmLen / leftForearmLen).toFixed(3)} (Upper Arm: ${(leftUpperArmLen * 1000).toFixed(1)} mm, Forearm: ${(leftForearmLen * 1000).toFixed(1)} mm)`);
console.log(`Upper Arm Width / Forearm Width: ${(leftUpperArmBox.width / leftForearmBox.width).toFixed(3)} (Upper Arm: ${(leftUpperArmBox.width * 1000).toFixed(1)} mm, Forearm: ${(leftForearmBox.width * 1000).toFixed(1)} mm)`);
console.log(`Hand Length / Forearm Length: ${(leftHandBox.height / leftForearmLen).toFixed(3)} (Hand H: ${(leftHandBox.height * 1000).toFixed(1)} mm, Forearm Len: ${(leftForearmLen * 1000).toFixed(1)} mm)`);
console.log(`Foot Length / Total Height: ${(leftFootBox.depth / rootBox.height).toFixed(3)} (Foot: ${(leftFootBox.depth * 1000).toFixed(1)} mm, Total H: ${(rootBox.height * 1000).toFixed(1)} mm)`);
console.log(`Foot Width / Shin Width: ${(leftFootBox.width / leftShinBox.width).toFixed(3)} (Foot W: ${(leftFootBox.width * 1000).toFixed(1)} mm, Shin W: ${(leftShinBox.width * 1000).toFixed(1)} mm)`);

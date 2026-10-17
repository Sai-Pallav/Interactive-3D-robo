import * as THREE from 'three';
import { createProceduralRobot } from '../src/robot/robot/RobotProceduralFactory.ts';
import { LEG_CONFIG } from '../src/robot/leg/LegConfig.ts';
import { TORSO_CONFIG } from '../src/robot/torso/TorsoConfig.ts';

const robot = createProceduralRobot();
robot.root.rotation.set(0, 0, 0);
robot.root.updateMatrixWorld(true);

function getBox(obj) {
  if (!obj) return null;
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  return {
    min: box.min.toArray(),
    max: box.max.toArray(),
    size: size.toArray(),
    width: size.x * 1000,
    height: size.y * 1000,
    depth: size.z * 1000
  };
}

console.log('--- Current Robot Dimensions ---');
const rootBox = getBox(robot.root);
console.log(`Total Height: ${rootBox.height.toFixed(1)} mm, Width: ${rootBox.width.toFixed(1)} mm`);

const headBox = getBox(robot.head);
console.log(`Head: W=${headBox.width.toFixed(1)} mm, H=${headBox.height.toFixed(1)} mm`);

const chestBox = getBox(robot.torsoNodes.chestArmor.centerPanel);
console.log(`Chest Center Panel: W=${chestBox.width.toFixed(1)} mm, H=${chestBox.height.toFixed(1)} mm`);

const pelvisBox = getBox(robot.torsoNodes.waist.pelvicPlate);
console.log(`Pelvis Plate: W=${pelvisBox.width.toFixed(1)} mm, H=${pelvisBox.height.toFixed(1)} mm`);

const leftHipPos = new THREE.Vector3();
const rightHipPos = new THREE.Vector3();
robot.torsoNodes.waist.leftHipPivot.getWorldPosition(leftHipPos);
robot.torsoNodes.waist.rightHipPivot.getWorldPosition(rightHipPos);
console.log(`Hip Span: ${((rightHipPos.x - leftHipPos.x) * 1000).toFixed(1)} mm`);

const leftShoulderPos = new THREE.Vector3();
const rightShoulderPos = new THREE.Vector3();
robot.leftArmNodes.upperArm.group.getWorldPosition(leftShoulderPos);
robot.rightArmNodes.upperArm.group.getWorldPosition(rightShoulderPos);
console.log(`Shoulder Mount Span: ${((rightShoulderPos.x - leftShoulderPos.x) * 1000).toFixed(1)} mm`);

const leftElbowPos = new THREE.Vector3();
robot.leftArmNodes.elbowPivot.getWorldPosition(leftElbowPos);
const leftWristPos = new THREE.Vector3();
robot.leftArmNodes.wristPivot.getWorldPosition(leftWristPos);
console.log(`Upper Arm Pivot-to-Pivot: ${(leftShoulderPos.distanceTo(leftElbowPos) * 1000).toFixed(1)} mm`);
console.log(`Forearm Pivot-to-Pivot: ${(leftElbowPos.distanceTo(leftWristPos) * 1000).toFixed(1)} mm`);
const handBox = getBox(robot.leftHand);
console.log(`Hand: W=${handBox.width.toFixed(1)} mm, H=${handBox.height.toFixed(1)} mm, D=${handBox.depth.toFixed(1)} mm`);

const leftKneePos = new THREE.Vector3();
robot.leftLegNodes.thigh.kneePivot.getWorldPosition(leftKneePos);
const leftAnklePos = new THREE.Vector3();
robot.leftLegNodes.shin.anklePivot.getWorldPosition(leftAnklePos);
console.log(`Thigh Pivot-to-Pivot: ${(leftHipPos.distanceTo(leftKneePos) * 1000).toFixed(1)} mm`);
console.log(`Shin Pivot-to-Pivot: ${(leftKneePos.distanceTo(leftAnklePos) * 1000).toFixed(1)} mm`);
const thighBox = getBox(robot.leftLegNodes.thigh.group);
const shinBox = getBox(robot.leftLegNodes.shin.group);
console.log(`Thigh Box: W=${thighBox.width.toFixed(1)} mm, H=${thighBox.height.toFixed(1)} mm`);
console.log(`Shin Box: W=${shinBox.width.toFixed(1)} mm, H=${shinBox.height.toFixed(1)} mm`);

const footBox = getBox(robot.leftFoot);
console.log(`Foot: W=${footBox.width.toFixed(1)} mm, H=${footBox.height.toFixed(1)} mm, D=${footBox.depth.toFixed(1)} mm`);

const leftLegBox = new THREE.Box3().setFromObject(robot.leftLegNodes.root);
const rightLegBox = new THREE.Box3().setFromObject(robot.rightLegNodes.root);
console.log(`Left Foot Ground Y: ${(leftLegBox.min.y * 1000).toFixed(2)} mm`);
console.log(`Right Foot Ground Y: ${(rightLegBox.min.y * 1000).toFixed(2)} mm`);
console.log(`Symmetry Delta: ${(Math.abs(leftLegBox.min.y - rightLegBox.min.y) * 1000).toFixed(4)} mm`);

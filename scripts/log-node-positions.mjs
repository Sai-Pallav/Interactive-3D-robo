import * as THREE from 'three';
import { createProceduralRobot } from '../src/robot/robot/RobotProceduralFactory.ts';

const robot = createProceduralRobot();
robot.root.updateMatrixWorld(true);

const wp = (name, obj) => {
  if (!obj) { console.log(name, 'is null'); return; }
  const v = new THREE.Vector3();
  obj.getWorldPosition(v);
  console.log(name, 'World Pos:', v.toArray().map(n => Number(n.toFixed(4))));
};

console.log('=== ROBOT ARM NODES ===');
wp('Left Shoulder', robot.leftShoulder);
wp('Left UpperArm', robot.leftUpperArm);
wp('Left DistalElbowMount', robot.leftArmNodes.upperArm.distalElbowMount);
wp('Left Elbow Root', robot.leftArmNodes.elbow.group);
wp('Left ForearmPivot', robot.leftArmNodes.elbowPivot);
wp('Left Forearm Group', robot.leftArmNodes.forearm.group);
wp('Left DistalWristMount', robot.leftArmNodes.forearm.distalWristMount);
wp('Left Wrist Group', robot.leftArmNodes.wrist.group);
wp('Left Hand Group', robot.leftHand);

console.log('\n=== ROBOT LEG NODES ===');
wp('Left Hip', robot.leftLegNodes.hip.group);
wp('Left Thigh', robot.leftLegNodes.thigh.group);
wp('Left Knee', robot.leftLegNodes.knee.group);
wp('Left Shin', robot.leftLegNodes.shin.group);
wp('Left Ankle', robot.leftLegNodes.ankle.group);
wp('Left Foot', robot.leftFoot);

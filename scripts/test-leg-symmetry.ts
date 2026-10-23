import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotLeg } from '../src/robot/leg/RobotLeg';

const mats = createRobotMaterials();
const leftLeg = createRobotLeg(-1, mats);
const rightLeg = createRobotLeg(1, mats);

// Reset stance rotations to 0 to test pure geometry symmetry
leftLeg.hip.group.rotation.set(0, 0, 0);
rightLeg.hip.group.rotation.set(0, 0, 0);
leftLeg.knee.shinPivot.rotation.set(0, 0, 0);
rightLeg.knee.shinPivot.rotation.set(0, 0, 0);
leftLeg.ankle.footPivot.rotation.set(0, 0, 0);
rightLeg.ankle.footPivot.rotation.set(0, 0, 0);

leftLeg.root.updateMatrixWorld(true);
rightLeg.root.updateMatrixWorld(true);

console.log('=== UNPOSED LEG COMPONENT SYMMETRY CHECK ===');

const components = [
  ['ThighFrame_Merged_L', 'ThighFrame_Merged_R'],
  ['ThighAnteriorArmor_L', 'ThighAnteriorArmor_R'],
  ['ThighLateralArmor_L', 'ThighLateralArmor_R'],
  ['KneeCore_L', 'KneeCore_R'],
  ['PatellaShield_L', 'PatellaShield_R'],
  ['ShinFrame_Merged_L', 'ShinFrame_Merged_R'],
  ['ShinAnteriorKeel_L', 'ShinAnteriorKeel_R'],
  ['AnkleJointCore_L', 'AnkleJointCore_R'],
  ['FootJointCore_L', 'FootJointCore_R'],
  ['FootDorsalArmor_L', 'FootDorsalArmor_R'],
  ['ToeArmor_L', 'ToeArmor_R'],
  ['HeelArmor_L', 'HeelArmor_R'],
];

for (const [lName, rName] of components) {
  const lObj = leftLeg.root.getObjectByName(lName);
  const rObj = rightLeg.root.getObjectByName(rName);
  if (!lObj || !rObj) {
    console.log(`Missing: ${lName} or ${rName}`);
    continue;
  }
  const lBox = new THREE.Box3().setFromObject(lObj);
  const rBox = new THREE.Box3().setFromObject(rObj);
  const lSize = lBox.getSize(new THREE.Vector3());
  const rSize = rBox.getSize(new THREE.Vector3());
  const lPos = new THREE.Vector3(); lObj.getWorldPosition(lPos);
  const rPos = new THREE.Vector3(); rObj.getWorldPosition(rPos);

  const dx = Math.abs(rPos.x - (-lPos.x));
  const dy = Math.abs(rPos.y - lPos.y);
  const dz = Math.abs(rPos.z - lPos.z);
  const sdx = Math.abs(rSize.x - lSize.x);
  const sdy = Math.abs(rSize.y - lSize.y);
  const sdz = Math.abs(rSize.z - lSize.z);

  if (dx > 0.0005 || dy > 0.0005 || dz > 0.0005 || sdx > 0.0005 || sdy > 0.0005 || sdz > 0.0005) {
    console.log(`ASYMMETRY in ${lName}: posDiff=[${(dx*1000).toFixed(2)}, ${(dy*1000).toFixed(2)}, ${(dz*1000).toFixed(2)}] mm, sizeDiff=[${(sdx*1000).toFixed(2)}, ${(sdy*1000).toFixed(2)}, ${(sdz*1000).toFixed(2)}] mm`);
  } else {
    console.log(`OK: ${lName}`);
  }
}

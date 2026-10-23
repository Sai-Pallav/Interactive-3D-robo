import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createChestAssembly } from '../src/robot/torso/ChestAssembly';
import { createRobotArm } from '../src/robot/arm/RobotArm';

const materials = createRobotMaterials();
const chest = createChestAssembly(materials);

// Create root group without any rotation
const chestGroup = new THREE.Group();
chestGroup.add(chest.chestArmor.group);
chestGroup.add(chest.upperTorsoFrame.group);
chestGroup.add(chest.shoulderMountLeft.group);
chestGroup.add(chest.shoulderMountRight.group);

// Attach arm to mount
const leftMount = chest.shoulderMountLeft.extensionNodes?.armMount || chest.shoulderMountLeft.group;
const leftArm = createRobotArm(-1, materials);
leftMount.add(leftArm.root);

const rightMount = chest.shoulderMountRight.extensionNodes?.armMount || chest.shoulderMountRight.group;
const rightArm = createRobotArm(1, materials);
rightMount.add(rightArm.root);

chestGroup.updateMatrixWorld(true);

console.log('--- SHOULDER GEOMETRY & TRANSFORMS IN CHEST LOCAL SPACE ---');
const checkNames = [
  'RearShoulderTrunnionBrackets',
  'RearShoulderBrace_R',
  'RearShoulderBrace_L',
  'RightChestTransitionPanel',
  'RightMountingFrame',
  'RightUpperShoulderShell',
  'RightUpperShoulderHood',
  'RightShoulderFoundation',
  'RightShoulderJoint',
  'RightPrimaryAxisPivot',
  'BearingHousingGroup_R',
  'ShoulderEnergyRing_R',
  'PrimaryHubGroup_R',
  'RightSecondaryAxisCarrier',
  'RightArmMount',
  'RightShoulderSocketReceiver'
];

for (const name of checkNames) {
  const obj = chestGroup.getObjectByName(name);
  if (obj) {
    const box = new THREE.Box3().setFromObject(obj);
    const c = new THREE.Vector3(); box.getCenter(c);
    const s = new THREE.Vector3(); box.getSize(s);
    const wp = new THREE.Vector3(); obj.getWorldPosition(wp);
    console.log(`${obj.name.padEnd(35)} | WPos: [${wp.x.toFixed(4)}, ${wp.y.toFixed(4)}, ${wp.z.toFixed(4)}] | BoxCenter: [${c.x.toFixed(4)}, ${c.y.toFixed(4)}, ${c.z.toFixed(4)}] | BoxSize: [${s.x.toFixed(4)}, ${s.y.toFixed(4)}, ${s.z.toFixed(4)}]`);
  } else {
    console.log(`${name.padEnd(35)} | NOT FOUND`);
  }
}

import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotTorso } from '../src/robot/torso/RobotTorso';
import { createRobotArm } from '../src/robot/arm/RobotArm';

const mats = createRobotMaterials();
const torso = createRobotTorso(mats);
const leftArm = createRobotArm(-1, mats);
const rightArm = createRobotArm(1, mats);

const leftMount = torso.shoulderMountLeft.extensionNodes?.armMount || torso.shoulderMountLeft.group;
leftMount.add(leftArm.root);

const rightMount = torso.shoulderMountRight.extensionNodes?.armMount || torso.shoulderMountRight.group;
rightMount.add(rightArm.root);

torso.group.updateMatrixWorld(true);

function inspectSide(sideName: string, side: number) {
  console.log('=== ' + sideName + ' SHOULDER & MOUNTING HIERARCHY ===');
  const list = [
    side === 1 ? 'RightChestTransitionPanel' : 'LeftChestTransitionPanel',
    side === 1 ? 'RightMountingFrame' : 'LeftMountingFrame',
    side === 1 ? 'RightUpperShoulderShell' : 'LeftUpperShoulderShell',
    side === 1 ? 'RightUpperShoulderHood' : 'LeftUpperShoulderHood',
    side === 1 ? 'RightShoulderFoundation' : 'LeftShoulderFoundation',
    side === 1 ? 'RightShoulderJoint' : 'LeftShoulderJoint',
    side === 1 ? 'RightPrimaryAxisPivot' : 'LeftPrimaryAxisPivot',
    side === 1 ? 'BearingHousingGroup_R' : 'BearingHousingGroup_L',
    side === 1 ? 'BearingHousingMesh_R' : 'BearingHousingMesh_L',
    side === 1 ? 'ShoulderEnergyRing_R' : 'ShoulderEnergyRing_L',
    side === 1 ? 'RightShoulderBlackPlateBetweenShellAndRotational' : 'LeftShoulderBlackPlateBetweenShellAndRotational',
    side === 1 ? 'PrimaryHubGroup_R' : 'PrimaryHubGroup_L',
    side === 1 ? 'RightSecondaryAxisCarrier' : 'LeftSecondaryAxisCarrier',
    side === 1 ? 'RightArmMount' : 'LeftArmMount',
    side === 1 ? 'RightShoulderSocketReceiver' : 'LeftShoulderSocketReceiver',
    side === 1 ? 'RightRobotArmRoot' : 'LeftRobotArmRoot',
    side === 1 ? 'RightUpperArm' : 'LeftUpperArm',
    side === 1 ? 'RightShoulderArmAdapter' : 'LeftShoulderArmAdapter'
  ];

  for (const name of list) {
    const obj = torso.group.getObjectByName(name);
    if (!obj) {
      console.log(name.padEnd(45), 'NOT FOUND');
      continue;
    }
    const wp = new THREE.Vector3();
    obj.getWorldPosition(wp);
    const box = new THREE.Box3().setFromObject(obj);
    const sz = new THREE.Vector3(); box.getSize(sz);
    const ctr = new THREE.Vector3(); box.getCenter(ctr);
    console.log(name.padEnd(45), 'WPos:', wp.toArray().map(v=>v.toFixed(4)), 'Center:', ctr.toArray().map(v=>v.toFixed(4)), 'Z-range: [' + box.min.z.toFixed(4) + ', ' + box.max.z.toFixed(4) + ']');
  }
}

inspectSide('LEFT (-1)', -1);
inspectSide('RIGHT (+1)', 1);

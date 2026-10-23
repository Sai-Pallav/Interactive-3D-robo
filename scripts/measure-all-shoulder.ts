import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createChestAssembly } from '../src/robot/torso/ChestAssembly';

const mats = createRobotMaterials();
const chest = createChestAssembly(mats);
const root = new THREE.Group();
root.add(chest.chestArmor.group);
root.add(chest.upperTorsoFrame.group);
root.add(chest.shoulderMountLeft.group);
root.add(chest.shoulderMountRight.group);
root.updateMatrixWorld(true);

const targetNames = [
  'ChestPlate_Central',
  'ChestSidePanel_Right',
  'ChestFlankArmor_Right',
  'ScapularArmor_Right',
  'RearShoulderBrace_R',
  'RightChestTransitionPanel',
  'RightMountingFrame',
  'RightUpperShoulderHood',
  'StationaryAnchorGroup_R',
  'RightShoulderJoint',
  'BearingHousingGroup_R',
  'ShoulderEnergyRing_R',
  'PrimaryHubGroup_R'
];

targetNames.forEach(name => {
  const obj = root.getObjectByName(name);
  if (obj) {
    const box = new THREE.Box3().setFromObject(obj);
    const c = new THREE.Vector3(); box.getCenter(c);
    const s = new THREE.Vector3(); box.getSize(s);
    const wp = new THREE.Vector3(); obj.getWorldPosition(wp);
    console.log(
      name.padEnd(28),
      `WP: [${wp.x.toFixed(3)}, ${wp.y.toFixed(3)}, ${wp.z.toFixed(3)}]`,
      `Center: [${c.x.toFixed(3)}, ${c.y.toFixed(3)}, ${c.z.toFixed(3)}]`,
      `Z Range: [${box.min.z.toFixed(3)} to ${box.max.z.toFixed(3)}]`,
      `X Range: [${box.min.x.toFixed(3)} to ${box.max.x.toFixed(3)}]`
    );
  } else {
    console.log(name.padEnd(28), 'NOT FOUND');
  }
});

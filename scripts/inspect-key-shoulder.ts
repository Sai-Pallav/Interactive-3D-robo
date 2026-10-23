import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createChestAssembly } from '../src/robot/torso/ChestAssembly';

const mats = createRobotMaterials();
const chest = createChestAssembly(mats);
const root = new THREE.Group();
root.add(chest.upperTorsoFrame.group);
root.add(chest.shoulderMountLeft.group);
root.add(chest.shoulderMountRight.group);
root.updateMatrixWorld(true);

for (const side of [-1, 1] as const) {
  const prefix = side === -1 ? 'Left' : 'Right';
  const suffix = side === -1 ? '_L' : '_R';
  console.log(`=== ${prefix.toUpperCase()} SHOULDER ===`);

  const keyObjects = [
    `${prefix}ChestTransitionPanel`,
    `${prefix}MountingFrame`,
    `${prefix}UpperShoulderHood`,
    `${prefix}UpperShoulderShell`,
    `${prefix}ShoulderFoundation`,
    `${prefix}ShoulderJoint`,
    `BearingHousingGroup${suffix}`,
    `ShoulderEnergyRing${suffix}`,
    `PrimaryHubGroup${suffix}`,
    `${prefix}SecondaryAxisCarrier`,
    `${prefix}ShoulderSocketReceiver`,
    `${prefix}ArmMount`,
    `RearShoulderBrace${suffix}`
  ];

  for (const name of keyObjects) {
    const obj = root.getObjectByName(name);
    if (obj) {
      const box = new THREE.Box3().setFromObject(obj);
      const center = new THREE.Vector3(); box.getCenter(center);
      const wp = new THREE.Vector3(); obj.getWorldPosition(wp);
      console.log(
        name.padEnd(30),
        '| WP:', wp.toArray().map(v=>v.toFixed(4)).join(','),
        '| Ctr:', center.toArray().map(v=>v.toFixed(4)).join(','),
        '| Min:', box.min.toArray().map(v=>v.toFixed(4)).join(','),
        '| Max:', box.max.toArray().map(v=>v.toFixed(4)).join(',')
      );
    } else {
      console.log(name.padEnd(30), 'NOT FOUND');
    }
  }
}

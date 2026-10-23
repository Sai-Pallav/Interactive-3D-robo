import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotTorso } from '../src/robot/torso/RobotTorso';

const mats = createRobotMaterials();
const torso = createRobotTorso(mats);
torso.group.updateMatrixWorld(true);

console.log('=== THORACIC & CHEST PROFILE AROUND REAR UPPER MOUNT ===');

// Check the raycast or bounding boxes of Thoracic and Chest components at y ~ -0.048
const targets: { name: string; obj: THREE.Object3D }[] = [];
torso.chestPivot.traverse(o => {
  if (o.name && (
    o.name.includes('Thoracic') ||
    o.name.includes('Scapular') ||
    o.name.includes('Backbone') ||
    o.name.includes('LowerChest') ||
    o.name.includes('SubSternal') ||
    o.name.includes('ActuatorLug')
  )) {
    targets.push({ name: o.name, obj: o });
  }
});

for (const t of targets) {
  const box = new THREE.Box3().setFromObject(t.obj);
  console.log(t.name.padEnd(32), 'X:', [box.min.x.toFixed(4), box.max.x.toFixed(4)], 'Y:', [box.min.y.toFixed(4), box.max.y.toFixed(4)], 'Z:', [box.min.z.toFixed(4), box.max.z.toFixed(4)]);
}

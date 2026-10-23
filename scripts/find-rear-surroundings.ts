import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotTorso } from '../src/robot/torso/RobotTorso';

const mats = createRobotMaterials();
const torso = createRobotTorso(mats);
torso.group.updateMatrixWorld(true);

torso.group.traverse(o => {
  if (o.isMesh && o.visible !== false) {
    const box = new THREE.Box3().setFromObject(o);
    // Looking for anything around world y: 0.05 to 0.09, z: -0.09 to -0.03
    if (box.min.y <= 0.09 && box.max.y >= 0.05 && box.min.z <= -0.03 && box.max.z >= -0.09) {
      console.log((o.name || 'unnamed').padEnd(35), 'X:', [box.min.x.toFixed(4), box.max.x.toFixed(4)], 'Y:', [box.min.y.toFixed(4), box.max.y.toFixed(4)], 'Z:', [box.min.z.toFixed(4), box.max.z.toFixed(4)]);
    }
  }
});

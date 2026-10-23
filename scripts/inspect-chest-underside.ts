import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotTorso } from '../src/robot/torso/RobotTorso';

const mats = createRobotMaterials();
const torso = createRobotTorso(mats);
torso.group.updateMatrixWorld(true);

console.log('chestPivot local pos:', torso.chestPivot.position.toArray());
const chestWp = new THREE.Vector3();
torso.chestPivot.getWorldPosition(chestWp);
console.log('chestPivot world pos:', chestWp.toArray());

const stomachWp = new THREE.Vector3();
torso.stomachPivot.getWorldPosition(stomachWp);
console.log('stomachPivot world pos:', stomachWp.toArray());

console.log('=== ALL MESHES IN CHEST PIVOT ===');
torso.chestPivot.traverse(obj => {
  if ((obj as THREE.Mesh).isMesh) {
    const mesh = obj as THREE.Mesh;
    const box = new THREE.Box3().setFromObject(mesh);
    console.log(mesh.name.padEnd(35), 'world y: [', box.min.y.toFixed(3), ',', box.max.y.toFixed(3), '] x: [', box.min.x.toFixed(3), ',', box.max.x.toFixed(3), '] z: [', box.min.z.toFixed(3), ',', box.max.z.toFixed(3), ']');
  }
});

import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotTorso } from '../src/robot/torso/RobotTorso';

const mats = createRobotMaterials();
const torso = createRobotTorso(mats);
torso.group.updateMatrixWorld(true);

console.log('=== CHECKING UPPER MOUNT SEATING ===');
// Outer left pole top uniball:
const outerTopW = new THREE.Vector3(-0.098, -0.066, 0.014);
outerTopW.applyMatrix4(torso.stomachPivot.matrixWorld);
console.log('Outer pole top world pos:', outerTopW.toArray().map(v=>v.toFixed(4)));

// Let's check what chest meshes intersect or are near outerTopW
torso.chestPivot.traverse(obj => {
  if ((obj as THREE.Mesh).isMesh) {
    const mesh = obj as THREE.Mesh;
    const box = new THREE.Box3().setFromObject(mesh);
    if (box.containsPoint(outerTopW) || box.distanceToPoint(outerTopW) < 0.020) {
      console.log('  Near mesh:', mesh.name, 'distance:', (box.distanceToPoint(outerTopW)*1000).toFixed(1), 'mm', 'box:', box.min.toArray().map(v=>v.toFixed(4)), 'to', box.max.toArray().map(v=>v.toFixed(4)));
    }
  }
});

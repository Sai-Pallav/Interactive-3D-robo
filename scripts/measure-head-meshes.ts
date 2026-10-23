import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotHead } from '../src/robot/head/RobotHead';

const materials = createRobotMaterials();
const headAssembly = createRobotHead(materials);
const head = headAssembly.head;

// Detach head from neck temporarily to measure pure local bounds
head.removeFromParent();
head.position.set(0, 0, 0);
head.rotation.set(0, 0, 0);
head.scale.set(1, 1, 1);
head.updateMatrixWorld(true);

console.log('=== ROBOT HEAD LOCAL BOUNDS (unscaled, unpositioned) ===');

head.traverse((obj) => {
  if ((obj as THREE.Mesh).isMesh) {
    const mesh = obj as THREE.Mesh;
    mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox;
    if (bb) {
      const min = bb.min.clone().applyMatrix4(mesh.matrixWorld);
      const max = bb.max.clone().applyMatrix4(mesh.matrixWorld);
      const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
      const size = new THREE.Vector3().subVectors(max, min);
      console.log(`Mesh: ${mesh.name.padEnd(25)} Center: (${center.x.toFixed(4)}, ${center.y.toFixed(4)}, ${center.z.toFixed(4)}) Size: (${size.x.toFixed(4)}, ${size.y.toFixed(4)}, ${size.z.toFixed(4)}) Z range: [${min.z.toFixed(4)}, ${max.z.toFixed(4)}]`);
    }
  }
});

// Overall head bounding box
const overallBox = new THREE.Box3().setFromObject(head);
const overallCenter = new THREE.Vector3();
overallBox.getCenter(overallCenter);
const overallSize = new THREE.Vector3();
overallBox.getSize(overallSize);
console.log('\n=== OVERALL HEAD BOUNDS ===');
console.log(`Center: (${overallCenter.x.toFixed(4)}, ${overallCenter.y.toFixed(4)}, ${overallCenter.z.toFixed(4)})`);
console.log(`Size: (${overallSize.x.toFixed(4)}, ${overallSize.y.toFixed(4)}, ${overallSize.z.toFixed(4)})`);
console.log(`Z range: [${overallBox.min.z.toFixed(4)}, ${overallBox.max.z.toFixed(4)}]`);
console.log(`Y range: [${overallBox.min.y.toFixed(4)}, ${overallBox.max.y.toFixed(4)}]`);

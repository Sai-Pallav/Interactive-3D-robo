import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotHead } from '../src/robot/head/RobotHead';

const mats = createRobotMaterials();
const head = createRobotHead(mats);
head.neck.updateMatrixWorld(true);

console.log('=== HEAD & NECK SYMMETRY CHECK ===');

const allMeshes: THREE.Mesh[] = [];
head.neck.traverse(o => {
  if ((o as any).isMesh && o.name) allMeshes.push(o as THREE.Mesh);
});
console.log(`Found ${allMeshes.length} named meshes in Head/Neck`);

for (const mesh of allMeshes) {
  let rName = '';
  if (mesh.name.includes('_Left')) rName = mesh.name.replace('_Left', '_Right');
  else if (mesh.name.includes('_L')) rName = mesh.name.replace('_L', '_R');
  else if (mesh.name.includes('Left')) rName = mesh.name.replace('Left', 'Right');
  else continue;

  const rMesh = head.neck.getObjectByName(rName) as THREE.Mesh;
  if (!rMesh) {
    console.log(`Missing matching right mesh for: ${mesh.name}`);
    continue;
  }

  const lBox = new THREE.Box3().setFromObject(mesh);
  const rBox = new THREE.Box3().setFromObject(rMesh);
  const lSize = lBox.getSize(new THREE.Vector3());
  const rSize = rBox.getSize(new THREE.Vector3());
  const lPos = new THREE.Vector3(); mesh.getWorldPosition(lPos);
  const rPos = new THREE.Vector3(); rMesh.getWorldPosition(rPos);

  const dx = Math.abs(rPos.x - (-lPos.x));
  const dy = Math.abs(rPos.y - lPos.y);
  const dz = Math.abs(rPos.z - lPos.z);
  const sdx = Math.abs(rSize.x - lSize.x);
  const sdy = Math.abs(rSize.y - lSize.y);
  const sdz = Math.abs(rSize.z - lSize.z);

  if (dx > 0.001 || dy > 0.001 || dz > 0.001 || sdx > 0.001 || sdy > 0.001 || sdz > 0.001) {
    console.log(`ASYMMETRY in ${mesh.name} <-> ${rName}: posDiff=[${(dx*1000).toFixed(1)}, ${(dy*1000).toFixed(1)}, ${(dz*1000).toFixed(1)}] mm, sizeDiff=[${(sdx*1000).toFixed(1)}, ${(sdy*1000).toFixed(1)}, ${(sdz*1000).toFixed(1)}] mm`);
  }
}
console.log('Head symmetry check complete.');

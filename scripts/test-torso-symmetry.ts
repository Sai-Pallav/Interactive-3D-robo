import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotTorso } from '../src/robot/torso/RobotTorso';

const mats = createRobotMaterials();
const torso = createRobotTorso(mats);
torso.group.updateMatrixWorld(true);

console.log('=== TORSO & WAIST SYMMETRY CHECK ===');

const allMeshes: THREE.Mesh[] = [];
torso.group.traverse(o => {
  if ((o as any).isMesh && o.name) allMeshes.push(o as THREE.Mesh);
});
console.log(`Found ${allMeshes.length} named meshes in Torso/Waist`);

const checked = new Set<string>();

for (const mesh of allMeshes) {
  let rName = '';
  if (mesh.name.startsWith('Left')) rName = 'Right' + mesh.name.slice(4);
  else if (mesh.name.includes('_Left')) rName = mesh.name.replace('_Left', '_Right');
  else if (mesh.name.endsWith('_L')) rName = mesh.name.slice(0, -2) + '_R';
  else if (mesh.name.includes('_L_')) rName = mesh.name.replace('_L_', '_R_');
  else continue;

  if (checked.has(mesh.name)) continue;
  checked.add(mesh.name);

  const rMesh = torso.group.getObjectByName(rName) as THREE.Mesh;
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
console.log('Torso symmetry check complete.');

import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotArm } from '../src/robot/arm/RobotArm';

const mats = createRobotMaterials();
const leftArm = createRobotArm(-1, mats);
const rightArm = createRobotArm(1, mats);

// Reset athletic rotations to 0 to test pure geometry symmetry
leftArm.upperArm.group.rotation.set(0, 0, 0);
rightArm.upperArm.group.rotation.set(0, 0, 0);
leftArm.elbowPivot.rotation.set(0, 0, 0);
rightArm.elbowPivot.rotation.set(0, 0, 0);
leftArm.wristPivot.rotation.set(0, 0, 0);
rightArm.wristPivot.rotation.set(0, 0, 0);

leftArm.root.updateMatrixWorld(true);
rightArm.root.updateMatrixWorld(true);

console.log('=== UNPOSED ARM COMPONENT SYMMETRY CHECK ===');

// Check all mesh names in left arm and find matching in right arm
const lMeshes: THREE.Mesh[] = [];
leftArm.root.traverse(o => {
  if ((o as any).isMesh && o.name) lMeshes.push(o as THREE.Mesh);
});

console.log(`Found ${lMeshes.length} named meshes in Left Arm`);

for (const lMesh of lMeshes) {
  let rName = lMesh.name;
  if (rName.startsWith('Left')) rName = 'Right' + rName.slice(4);
  else if (rName.includes('_Left')) rName = rName.replace('_Left', '_Right');
  else if (rName.endsWith('_L')) rName = rName.slice(0, -2) + '_R';
  else if (rName.includes('_L_')) rName = rName.replace('_L_', '_R_');
  else continue;

  const rMesh = rightArm.root.getObjectByName(rName) as THREE.Mesh;
  if (!rMesh) {
    console.log(`Missing matching right mesh for: ${lMesh.name} (looked for ${rName})`);
    continue;
  }

  const lBox = new THREE.Box3().setFromObject(lMesh);
  const rBox = new THREE.Box3().setFromObject(rMesh);
  const lSize = lBox.getSize(new THREE.Vector3());
  const rSize = rBox.getSize(new THREE.Vector3());
  const lPos = new THREE.Vector3(); lMesh.getWorldPosition(lPos);
  const rPos = new THREE.Vector3(); rMesh.getWorldPosition(rPos);

  const dx = Math.abs(rPos.x - (-lPos.x));
  const dy = Math.abs(rPos.y - lPos.y);
  const dz = Math.abs(rPos.z - lPos.z);
  const sdx = Math.abs(rSize.x - lSize.x);
  const sdy = Math.abs(rSize.y - lSize.y);
  const sdz = Math.abs(rSize.z - lSize.z);

  if (dx > 0.001 || dy > 0.001 || dz > 0.001 || sdx > 0.001 || sdy > 0.001 || sdz > 0.001) {
    console.log(`ASYMMETRY in ${lMesh.name} <-> ${rName}: posDiff=[${(dx*1000).toFixed(1)}, ${(dy*1000).toFixed(1)}, ${(dz*1000).toFixed(1)}] mm, sizeDiff=[${(sdx*1000).toFixed(1)}, ${(sdy*1000).toFixed(1)}, ${(sdz*1000).toFixed(1)}] mm`);
  } else {
    // console.log(`OK: ${lMesh.name}`);
  }
}
console.log('Arm symmetry check complete.');

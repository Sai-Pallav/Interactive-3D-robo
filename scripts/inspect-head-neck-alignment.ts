import * as THREE from 'three';
import { createProceduralRobot } from '../src/robot/robot/RobotProceduralFactory';

const robot = createProceduralRobot();
// Set neutral pose (rotation = 0 so we inspect pure anatomical coordinates)
robot.root.rotation.set(0, 0, 0);
robot.root.position.set(0, 0, 0);
robot.root.updateMatrixWorld(true);

const targetNames = [
  'UpperTorsoFrame',
  'NeckCollar',
  'NeckCollarSleeve',
  'NeckCollarLightRing',
  'Neck',
  'NeckBaseCollar',
  'NeckBaseRim',
  'NeckCentralShaft',
  'NeckRing01',
  'NeckRing02',
  'NeckRing03',
  'NeckRing04',
  'NeckCervicalConnector',
  'RearNeckAssembly',
  'OccipitalGimbalMountPlate',
  'RobotHead',
  'InnerSkullCore',
  'OuterShell',
  'Crown',
  'JawAssembly',
  'JawShell',
  'JawNeckSocketGorget',
  'SubmentalVent',
  'ChinUnderBevel',
  'VisorAssembly',
  'Visor'
];

console.log('=== HIERARCHY TREE ===');
function printTree(node: THREE.Object3D, depth = 0) {
  const indent = '  '.repeat(depth);
  const localPos = node.position;
  const isTarget = targetNames.includes(node.name) || depth <= 3;
  if (isTarget) {
    console.log(`${indent}- ${node.name || '(unnamed)'} [type: ${node.type}] pos: (${localPos.x.toFixed(4)}, ${localPos.y.toFixed(4)}, ${localPos.z.toFixed(4)}) rot: (${node.rotation.x.toFixed(3)}, ${node.rotation.y.toFixed(3)}, ${node.rotation.z.toFixed(3)}) scale: (${node.scale.x.toFixed(3)}, ${node.scale.y.toFixed(3)}, ${node.scale.z.toFixed(3)})`);
  }
  for (const child of node.children) {
    printTree(child, depth + 1);
  }
}

// Print starting from chest / upperTorsoFrame
const upperTorso = robot.root.getObjectByName('UpperTorsoFrame');
if (upperTorso) {
  printTree(upperTorso, 0);
} else {
  printTree(robot.root, 0);
}

console.log('\n=== WORLD POSITIONS & BOUNDING BOXES (NEUTRAL POSE) ===');
const foundObjects = new Map<string, THREE.Object3D>();
robot.root.traverse((obj) => {
  if (obj.name) {
    foundObjects.set(obj.name, obj);
  }
});

for (const name of targetNames) {
  const obj = foundObjects.get(name);
  if (!obj) {
    console.log(`[NOT FOUND] ${name}`);
    continue;
  }
  const worldPos = new THREE.Vector3();
  obj.getWorldPosition(worldPos);

  const worldQuat = new THREE.Quaternion();
  obj.getWorldQuaternion(worldQuat);
  const worldEuler = new THREE.Euler().setFromQuaternion(worldQuat);

  let boxStr = 'no mesh';
  if ((obj as THREE.Mesh).isMesh) {
    const mesh = obj as THREE.Mesh;
    mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox;
    if (bb) {
      const min = bb.min.clone().applyMatrix4(mesh.matrixWorld);
      const max = bb.max.clone().applyMatrix4(mesh.matrixWorld);
      const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
      boxStr = `world center: (${center.x.toFixed(4)}, ${center.y.toFixed(4)}, ${center.z.toFixed(4)}) world bounds Y: [${min.y.toFixed(4)} to ${max.y.toFixed(4)}] Z: [${min.z.toFixed(4)} to ${max.z.toFixed(4)}]`;
    }
  }

  console.log(`Obj: ${name.padEnd(26)} WorldPos: (${worldPos.x.toFixed(4)}, ${worldPos.y.toFixed(4)}, ${worldPos.z.toFixed(4)}) Euler: (${worldEuler.x.toFixed(3)}, ${worldEuler.y.toFixed(3)}, ${worldEuler.z.toFixed(3)}) | ${boxStr}`);
}

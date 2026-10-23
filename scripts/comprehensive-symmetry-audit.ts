import * as THREE from 'three';
import { createProceduralRobot } from '../src/robot/robot/RobotProceduralFactory';

console.log('=== BILATERAL SYMMETRY & ALIGNMENT COMPREHENSIVE AUDIT ===\n');

const robot = createProceduralRobot();
robot.root.rotation.set(0, 0, 0);
robot.root.position.set(0, 0, 0);
robot.root.updateMatrixWorld(true);

const allObjects: THREE.Object3D[] = [];
robot.root.traverse((obj) => {
  allObjects.push(obj);
});

// Group objects by name
const objectMap = new Map<string, THREE.Object3D>();
for (const obj of allObjects) {
  if (obj.name) {
    objectMap.set(obj.name, obj);
  }
}

console.log(`Total objects in scene graph: ${allObjects.length}`);
console.log(`Total named objects: ${objectMap.size}\n`);

// Identify Left/Right pairs
const pairs: { leftName: string; rightName: string; leftObj: THREE.Object3D; rightObj: THREE.Object3D }[] = [];

for (const [name, obj] of objectMap.entries()) {
  let rightName: string | null = null;
  if (name.includes('Left')) {
    rightName = name.replace('Left', 'Right');
  } else if (name.startsWith('L_')) {
    rightName = 'R_' + name.slice(2);
  } else if (name.endsWith('_L')) {
    rightName = name.slice(0, -2) + '_R';
  }

  if (rightName && objectMap.has(rightName)) {
    pairs.push({
      leftName: name,
      rightName,
      leftObj: obj,
      rightObj: objectMap.get(rightName)!,
    });
  }
}

console.log(`Found ${pairs.length} corresponding Left/Right pairs to verify.\n`);

interface AsymmetryReport {
  pair: string;
  posDiff: { dx: number; dy: number; dz: number };
  centerDiff: { dx: number; dy: number; dz: number };
  sizeDiff: { dx: number; dy: number; dz: number };
  leftPos: number[];
  rightPos: number[];
}

const posAnomalies: AsymmetryReport[] = [];
const centerAnomalies: AsymmetryReport[] = [];
const sizeAnomalies: AsymmetryReport[] = [];

for (const { leftName, rightName, leftObj, rightObj } of pairs) {
  const lPos = new THREE.Vector3();
  const rPos = new THREE.Vector3();
  leftObj.getWorldPosition(lPos);
  rightObj.getWorldPosition(rPos);

  const lBox = new THREE.Box3().setFromObject(leftObj);
  const rBox = new THREE.Box3().setFromObject(rightObj);
  const lCenter = lBox.getCenter(new THREE.Vector3());
  const rCenter = rBox.getCenter(new THREE.Vector3());
  const lSize = lBox.getSize(new THREE.Vector3());
  const rSize = rBox.getSize(new THREE.Vector3());

  // Expected: rPos.x == -lPos.x, rPos.y == lPos.y, rPos.z == lPos.z
  const dx = Math.abs(rPos.x - (-lPos.x));
  const dy = Math.abs(rPos.y - lPos.y);
  const dz = Math.abs(rPos.z - lPos.z);

  const cdx = Math.abs(rCenter.x - (-lCenter.x));
  const cdy = Math.abs(rCenter.y - lCenter.y);
  const cdz = Math.abs(rCenter.z - lCenter.z);

  const sdx = Math.abs(rSize.x - lSize.x);
  const sdy = Math.abs(rSize.y - lSize.y);
  const sdz = Math.abs(rSize.z - lSize.z);

  const report: AsymmetryReport = {
    pair: `${leftName} <-> ${rightName}`,
    posDiff: { dx, dy, dz },
    centerDiff: { dx: cdx, dy: cdy, dz: cdz },
    sizeDiff: { dx: sdx, dy: sdy, dz: sdz },
    leftPos: [lPos.x, lPos.y, lPos.z],
    rightPos: [rPos.x, rPos.y, rPos.z],
  };

  // Tolerances: 0.5 mm = 0.0005
  if (dx > 0.001 || dy > 0.001 || dz > 0.001) {
    posAnomalies.push(report);
  } else if (cdx > 0.002 || cdy > 0.002 || cdz > 0.002) {
    centerAnomalies.push(report);
  }

  if (sdx > 0.002 || sdy > 0.002 || sdz > 0.002) {
    sizeAnomalies.push(report);
  }
}

console.log(`=== POSITION ASYMMETRIES (>1mm): ${posAnomalies.length} ===`);
for (const a of posAnomalies) {
  console.log(`- ${a.pair}`);
  console.log(`  L: [${a.leftPos.map(v => (v*1000).toFixed(1)).join(', ')}] mm`);
  console.log(`  R: [${a.rightPos.map(v => (v*1000).toFixed(1)).join(', ')}] mm`);
  console.log(`  Diff: dX=${(a.posDiff.dx*1000).toFixed(1)}mm, dY=${(a.posDiff.dy*1000).toFixed(1)}mm, dZ=${(a.posDiff.dz*1000).toFixed(1)}mm`);
}

console.log(`\n=== BOUNDING CENTER ASYMMETRIES (>2mm): ${centerAnomalies.length} ===`);
for (const a of centerAnomalies) {
  console.log(`- ${a.pair}`);
  console.log(`  Center Diff: dX=${(a.centerDiff.dx*1000).toFixed(1)}mm, dY=${(a.centerDiff.dy*1000).toFixed(1)}mm, dZ=${(a.centerDiff.dz*1000).toFixed(1)}mm`);
}

console.log(`\n=== BOUNDING SIZE DISCREPANCIES (>2mm): ${sizeAnomalies.length} ===`);
for (const a of sizeAnomalies) {
  console.log(`- ${a.pair}`);
  console.log(`  Size Diff: dW=${(a.sizeDiff.dx*1000).toFixed(1)}mm, dH=${(a.sizeDiff.dy*1000).toFixed(1)}mm, dD=${(a.sizeDiff.dz*1000).toFixed(1)}mm`);
}

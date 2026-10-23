import * as THREE from 'three';
import { createProceduralRobot } from '../src/robot/robot/RobotProceduralFactory';

const robot = createProceduralRobot();
robot.root.rotation.set(0, 0, 0);
robot.root.updateMatrixWorld(true);

const leftCarrier = robot.root.getObjectByName('LeftSecondaryAxisCarrier_LinksMerged')!;
const rightCarrier = robot.root.getObjectByName('RightSecondaryAxisCarrier_LinksMerged')!;

console.log('Left carrier children:', leftCarrier.children.map(c => c.name));
console.log('Right carrier children:', rightCarrier.children.map(c => c.name));

const lBox = new THREE.Box3().setFromObject(leftCarrier);
const rBox = new THREE.Box3().setFromObject(rightCarrier);

console.log('Left box min:', lBox.min.toArray().map(v=>v.toFixed(4)), 'max:', lBox.max.toArray().map(v=>v.toFixed(4)));
console.log('Right box min:', rBox.min.toArray().map(v=>v.toFixed(4)), 'max:', rBox.max.toArray().map(v=>v.toFixed(4)));

const lSize = lBox.getSize(new THREE.Vector3());
const rSize = rBox.getSize(new THREE.Vector3());
console.log('Left size:', lSize.toArray().map(v=>v.toFixed(4)));
console.log('Right size:', rSize.toArray().map(v=>v.toFixed(4)));

for (const c of leftCarrier.children) {
  if ((c as any).isMesh) {
    const cb = new THREE.Box3().setFromObject(c);
    console.log('  L mesh:', c.name, 'min:', cb.min.toArray().map(v=>v.toFixed(4)), 'max:', cb.max.toArray().map(v=>v.toFixed(4)));
  }
}
for (const c of rightCarrier.children) {
  if ((c as any).isMesh) {
    const cb = new THREE.Box3().setFromObject(c);
    console.log('  R mesh:', c.name, 'min:', cb.min.toArray().map(v=>v.toFixed(4)), 'max:', cb.max.toArray().map(v=>v.toFixed(4)));
  }
}

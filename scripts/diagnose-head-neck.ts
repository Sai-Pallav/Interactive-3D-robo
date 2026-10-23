import * as THREE from 'three';
import { createProceduralRobot } from '../src/robot/robot/RobotProceduralFactory';
import { RobotAnimationController } from '../src/robot/animation/RobotAnimationController';

const robot = createProceduralRobot();
robot.root.rotation.set(0, 0, 0);
robot.root.position.set(0, 0, 0);
robot.root.updateMatrixWorld(true);

console.log('=== ROBOT STRUCTURE CHECK ===');
const neck = robot.neck;
const head = robot.head;

console.log('Neck parent:', neck.parent?.name);
console.log('Head parent:', head.parent?.name);
console.log('Neck position:', neck.position);
console.log('Head position:', head.position);
console.log('Head scale:', head.scale);

const names = [
  'UpperTorsoFrame',
  'NeckCollar',
  'Neck',
  'NeckStructure_Merged',
  'NeckSpacers_Merged',
  'RearNeckAssembly',
  'OccipitalGimbalMountPlate',
  'OccipitalGimbalRace',
  'RobotHead',
  'InnerSkullCore',
  'OuterShell',
  'HelmetArmor_Merged',
  'BrowTrim',
  'JawAssembly',
  'JawShell',
  'JawJoint_Merged',
  'OccipitalNeckTransitionCradle',
  'RearHeadAssembly',
  'VisorAssembly',
];

for (const name of names) {
  const o = robot.root.getObjectByName(name);
  if (!o) {
    console.log(`[NOT FOUND] ${name}`);
    continue;
  }
  const wp = new THREE.Vector3();
  o.getWorldPosition(wp);
  let boundsStr = '';
  if ((o as THREE.Mesh).isMesh && (o as THREE.Mesh).geometry) {
    const m = o as THREE.Mesh;
    m.geometry.computeBoundingBox();
    if (m.geometry.boundingBox) {
      const b = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld);
      boundsStr = `bounds Y: [${b.min.y.toFixed(4)}, ${b.max.y.toFixed(4)}] Z: [${b.min.z.toFixed(4)}, ${b.max.z.toFixed(4)}]`;
    }
  }
  console.log(`${name.padEnd(30)} World: (${wp.x.toFixed(4)}, ${wp.y.toFixed(4)}, ${wp.z.toFixed(4)}) ${boundsStr}`);
}

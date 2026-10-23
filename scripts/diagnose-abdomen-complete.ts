import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotTorso } from '../src/robot/torso/RobotTorso';
import { TORSO_CONFIG } from '../src/robot/torso/TorsoConfig';

const materials = createRobotMaterials();
const torso = createRobotTorso(materials);
torso.group.updateMatrixWorld(true);

console.log('================================================================');
console.log('         ABDOMINAL ASSEMBLY COMPREHENSIVE AUDIT REPORT          ');
console.log('================================================================');

// 1. CHEST CLEVISES (UPPER MOUNTS)
console.log('\n--- 1. CHEST LOWER CLEVISES (Expected Upper Mounts) ---');
const chestClevises: Record<string, THREE.Vector3> = {};
torso.chestPivot.traverse(obj => {
  if (obj.name) {
    const wp = new THREE.Vector3();
    obj.getWorldPosition(wp);
    if (obj.name.includes('LowerChestFrame') || obj.name.includes('ChassisGirdle') || obj.name.includes('ThoracicSpineDock')) {
      const b = new THREE.Box3().setFromObject(obj);
      console.log(`[CHEST OBJ] ${obj.name.padEnd(30)} WPos: [${wp.x.toFixed(4)}, ${wp.y.toFixed(4)}, ${wp.z.toFixed(4)}] Bounds: min[${b.min.x.toFixed(4)}, ${b.min.y.toFixed(4)}, ${b.min.z.toFixed(4)}] max[${b.max.x.toFixed(4)}, ${b.max.y.toFixed(4)}, ${b.max.z.toFixed(4)}]`);
    }
  }
});

// Let's check config upper mounts:
const cfg = TORSO_CONFIG.stomach;
console.log('\nConfig Actuators:');
console.log('outer:', cfg.dualActuators?.outer);
console.log('inner:', cfg.dualActuators?.inner);

// 2. ABDOMINAL POLES IN DETAIL
console.log('\n--- 2. HYDRAULIC POLES AUDIT ---');
const poleNames = [
  'OuterLeftActuatorPole',
  'InnerLeftActuatorPole',
  'OuterRightActuatorPole',
  'InnerRightActuatorPole',
  'RearActuator_L',
  'RearActuator_R',
];

// Let's trace unmerged or merged poles. In createStomachAssembly, each actuator pole is built using createSingleActuatorPole, then merged into clusterGroup.
// Let's check the objects inside sideMechanismLeft, sideMechanismRight, internalSpine
function inspectPoles(name: string, rootObj: THREE.Object3D) {
  rootObj.traverse(obj => {
    if (obj.name && poleNames.some(p => obj.name.includes(p))) {
      const wp = new THREE.Vector3();
      obj.getWorldPosition(wp);
      const b = new THREE.Box3().setFromObject(obj);
      console.log(`POLE: ${obj.name.padEnd(28)} WPos: [${wp.x.toFixed(4)}, ${wp.y.toFixed(4)}, ${wp.z.toFixed(4)}] Bounds: min[${b.min.x.toFixed(4)}, ${b.min.y.toFixed(4)}, ${b.min.z.toFixed(4)}] max[${b.max.x.toFixed(4)}, ${b.max.y.toFixed(4)}, ${b.max.z.toFixed(4)}]`);
    }
  });
}
inspectPoles('stomach', torso.stomachPivot);

// 3. VERTEBRAE ARMOR & SEPARATORS
console.log('\n--- 3. VERTEBRAE & SEPARATOR BANDS AUDIT ---');
torso.stomachPivot.traverse(obj => {
  if (obj.name && (obj.name.includes('Vertebra') || obj.name.includes('Spine'))) {
    const wp = new THREE.Vector3();
    obj.getWorldPosition(wp);
    const b = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3(); b.getSize(size);
    console.log(`[VERTEBRA] ${obj.name.padEnd(30)} WPos: [${wp.x.toFixed(4)}, ${wp.y.toFixed(4)}, ${wp.z.toFixed(4)}] Size: [${size.x.toFixed(4)}, ${size.y.toFixed(4)}, ${size.z.toFixed(4)}] Z-range: [${b.min.z.toFixed(4)} to ${b.max.z.toFixed(4)}] Y-range: [${b.min.y.toFixed(4)} to ${b.max.y.toFixed(4)}]`);
  }
});

// 4. WAIST INTERFACE
console.log('\n--- 4. WAIST TRANSITION DECK & PLINTHS AUDIT ---');
torso.stomachPivot.traverse(obj => {
  if (obj.name && (obj.name.includes('Waist') || obj.name.includes('Plinth') || obj.name.includes('Deck'))) {
    const wp = new THREE.Vector3();
    obj.getWorldPosition(wp);
    const b = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3(); b.getSize(size);
    console.log(`[WAIST DECK] ${obj.name.padEnd(30)} WPos: [${wp.x.toFixed(4)}, ${wp.y.toFixed(4)}, ${wp.z.toFixed(4)}] Bounds: min[${b.min.x.toFixed(4)}, ${b.min.y.toFixed(4)}, ${b.min.z.toFixed(4)}] max[${b.max.x.toFixed(4)}, ${b.max.y.toFixed(4)}, ${b.max.z.toFixed(4)}]`);
  }
});

torso.waistPivot.traverse(obj => {
  if (obj.name && (obj.name.includes('Waist') || obj.name.includes('Ring') || obj.name.includes('Turntable'))) {
    const wp = new THREE.Vector3();
    obj.getWorldPosition(wp);
    const b = new THREE.Box3().setFromObject(obj);
    console.log(`[WAIST OBJ] ${obj.name.padEnd(30)} WPos: [${wp.x.toFixed(4)}, ${wp.y.toFixed(4)}, ${wp.z.toFixed(4)}] Bounds: min[${b.min.x.toFixed(4)}, ${b.min.y.toFixed(4)}, ${b.min.z.toFixed(4)}] max[${b.max.x.toFixed(4)}, ${b.max.y.toFixed(4)}, ${b.max.z.toFixed(4)}]`);
  }
});

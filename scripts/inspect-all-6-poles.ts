import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotTorso } from '../src/robot/torso/RobotTorso';
import { TORSO_CONFIG } from '../src/robot/torso/TorsoConfig';

const materials = createRobotMaterials();
const torso = createRobotTorso(materials);
torso.group.updateMatrixWorld(true);

console.log('=== TORSO CONFIG VALUES ===');
console.log('cfg.actuator:', TORSO_CONFIG.stomach.actuator);
console.log('cfg.dualActuators:', TORSO_CONFIG.stomach.dualActuators);

console.log('\n=== CHEST UPPER MOUNTS ===');
torso.chestPivot.traverse(obj => {
  if (obj.name && (obj.name.toLowerCase().includes('clevis') || obj.name.toLowerCase().includes('mount') || obj.name.toLowerCase().includes('lowerchestframe'))) {
    const wp = new THREE.Vector3();
    obj.getWorldPosition(wp);
    const box = new THREE.Box3().setFromObject(obj);
    const center = new THREE.Vector3(); box.getCenter(center);
    const size = new THREE.Vector3(); box.getSize(size);
    console.log(obj.name.padEnd(35), '| local pos:', obj.position.toArray().map(v => v.toFixed(4)), '| world pos:', wp.toArray().map(v => v.toFixed(4)), '| boxCenter:', center.toArray().map(v => v.toFixed(4)), '| boxSize:', size.toArray().map(v => v.toFixed(4)));
  }
});

console.log('\n=== ABDOMEN POLES & ATTACHMENTS ===');
const poleNames = [
  'OuterLeftActuatorPole',
  'InnerLeftActuatorPole',
  'RearActuator_L',
  'RearActuator_R',
  'InnerRightActuatorPole',
  'OuterRightActuatorPole'
];

torso.stomachPivot.traverse(obj => {
  for (const name of poleNames) {
    if (obj.name === name) {
      const wp = new THREE.Vector3();
      obj.getWorldPosition(wp);
      const rot = obj.rotation;
      const box = new THREE.Box3().setFromObject(obj);
      const center = new THREE.Vector3(); box.getCenter(center);
      const size = new THREE.Vector3(); box.getSize(size);
      console.log(name.padEnd(25), '| pos:', obj.position.toArray().map(v => v.toFixed(4)), '| rot (deg):', [rot.x, rot.y, rot.z].map(v => (v * 180 / Math.PI).toFixed(2)), '| center:', center.toArray().map(v => v.toFixed(4)), '| size:', size.toArray().map(v => v.toFixed(4)));
      
      // Look at children
      obj.children.forEach(c => {
        const cWp = new THREE.Vector3();
        c.getWorldPosition(cWp);
        const cRot = c.rotation;
        console.log('   child:', c.name.padEnd(28), '| pos:', c.position.toArray().map(v => v.toFixed(4)), '| rot (deg):', [cRot.x, cRot.y, cRot.z].map(v => (v * 180 / Math.PI).toFixed(2)), '| WPos:', cWp.toArray().map(v => v.toFixed(4)));
      });
    }
  }
});

console.log('\n=== WAIST LOWER MOUNTS & PLINTHS ===');
torso.group.traverse(obj => {
  if (obj.name && (obj.name.toLowerCase().includes('plinth') || obj.name.toLowerCase().includes('waistdeck'))) {
    const wp = new THREE.Vector3();
    obj.getWorldPosition(wp);
    const box = new THREE.Box3().setFromObject(obj);
    const center = new THREE.Vector3(); box.getCenter(center);
    console.log(obj.name.padEnd(30), '| pos:', obj.position.toArray().map(v => v.toFixed(4)), '| world pos:', wp.toArray().map(v => v.toFixed(4)), '| center:', center.toArray().map(v => v.toFixed(4)));
  }
});

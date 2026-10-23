import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRearThoracicAssembly } from '../src/robot/torso/RearThoracicAssembly';
import { createChestAssembly } from '../src/robot/torso/ChestAssembly';
import { createRearSpineAssembly } from '../src/robot/torso/RearSpineAssembly';
import { createRearLumbarAssembly } from '../src/robot/torso/RearLumbarAssembly';
import { createRobotTorso } from '../src/robot/torso/RobotTorso';
import { TORSO_CONFIG } from '../src/robot/torso/TorsoConfig';

const mats = createRobotMaterials();
const torso = createRobotTorso(mats);
torso.group.updateMatrixWorld(true);

console.log('=== ROBOT TORSO MOUNTING INSPECTION ===');

// Check world positions of all relevant objects
torso.group.traverse(o => {
  if (o.name && (
    o.name.includes('RearActuator') ||
    o.name.includes('ThoracicActuator') ||
    o.name.includes('LumbarActuator') ||
    o.name.includes('Outer') ||
    o.name.includes('Inner') ||
    o.name.includes('Bilateral') ||
    o.name.includes('Plinth') ||
    o.name.includes('Clevis')
  )) {
    const wp = new THREE.Vector3();
    o.getWorldPosition(wp);
    const box = new THREE.Box3().setFromObject(o);
    console.log(o.name.padEnd(35), 'WPos:', wp.toArray().map(v => v.toFixed(4)), 'Box min:', box.min.toArray().map(v => v.toFixed(4)), 'max:', box.max.toArray().map(v => v.toFixed(4)));
  }
});

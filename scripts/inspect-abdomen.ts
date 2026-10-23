import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createStomachAssembly } from '../src/robot/torso/AbdomenAssembly';
import { createChestAssembly } from '../src/robot/torso/ChestAssembly';
import { createWaistAssembly } from '../src/robot/torso/WaistAssembly';

const materials = createRobotMaterials();
const stomach = createStomachAssembly(materials);
const chest = createChestAssembly(materials);
const waist = createWaistAssembly(materials);

const root = new THREE.Group();
root.add(chest.group);
root.add(stomach.group);
root.add(waist.group);
root.updateMatrixWorld(true);

console.log('--- INSPECTING ALL POLES / ACTUATORS IN ABDOMEN / STOMACH ---');
stomach.group.traverse(obj => {
  if (obj.name && (obj.name.toLowerCase().includes('pole') || obj.name.toLowerCase().includes('actuator') || obj.name.toLowerCase().includes('cluster'))) {
    const wp = new THREE.Vector3();
    obj.getWorldPosition(wp);
    const box = new THREE.Box3().setFromObject(obj);
    const center = new THREE.Vector3(); box.getCenter(center);
    const size = new THREE.Vector3(); box.getSize(size);
    console.log(obj.name.padEnd(35), '| type:', obj.type.padEnd(10), '| Pos:', obj.position.toArray().map(v => v.toFixed(4)), '| WPos:', wp.toArray().map(v => v.toFixed(4)), '| BoxCenter:', center.toArray().map(v => v.toFixed(4)), '| BoxSize:', size.toArray().map(v => v.toFixed(4)));
  }
});

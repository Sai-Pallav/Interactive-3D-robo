import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createChestAssembly } from '../src/robot/torso/ChestAssembly';
import { createWaistAssembly } from '../src/robot/torso/WaistAssembly';
import { createStomachAssembly } from '../src/robot/torso/AbdomenAssembly';

const materials = createRobotMaterials();
const chest = createChestAssembly(materials);
const stomach = createStomachAssembly(materials);
const waist = createWaistAssembly(materials);

console.log('=== CHEST CHILDREN & GEOMETRIES ===');
chest.group.traverse(obj => {
  if (obj.name && (obj.name.includes('LowerChest') || obj.name.includes('Cowl'))) {
    console.log(obj.name, obj.type, obj.position.toArray());
  }
});

console.log('\n=== STOMACH CHILDREN ===');
stomach.group.children.forEach(c => {
  console.log(c.name, c.type, c.position.toArray());
});

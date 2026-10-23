import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createChestAssembly } from '../src/robot/torso/ChestAssembly';

const mats = createRobotMaterials();
const chest = createChestAssembly(mats);
const root = new THREE.Group();
root.add(chest.chestArmor.group);
root.add(chest.upperTorsoFrame.group);
root.add(chest.shoulderMountLeft.group);
root.add(chest.shoulderMountRight.group);
root.updateMatrixWorld(true);

const brace = root.getObjectByName('RearShoulderBrace_R')!;
const cap = brace.children.find(c => c.name === '' && (c as THREE.Mesh).geometry?.type === 'CylinderGeometry')!;
const collar = root.getObjectByName('StationaryAnchorGroup_R')!;

const capWp = new THREE.Vector3();
cap.getWorldPosition(capWp);
const collarWp = new THREE.Vector3();
collar.getWorldPosition(collarWp);

console.log('Cap world position:   ', capWp.toArray().map(v => v.toFixed(4)));
console.log('Collar world position:', collarWp.toArray().map(v => v.toFixed(4)));
console.log('Collar Box Center:    ', new THREE.Box3().setFromObject(collar).getCenter(new THREE.Vector3()).toArray().map(v => v.toFixed(4)));
console.log('Cap Box Center:       ', new THREE.Box3().setFromObject(cap).getCenter(new THREE.Vector3()).toArray().map(v => v.toFixed(4)));

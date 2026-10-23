import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotTorso } from '../src/robot/torso/RobotTorso';

const materials = createRobotMaterials();
const torso = createRobotTorso(materials);
torso.group.updateMatrixWorld(true);

torso.group.traverse(obj => {
  if (obj.name && (obj.name.includes('Cluster') || obj.name.includes('Actuator'))) {
    console.log(`\n=== ${obj.name} (${obj.type}) ===`);
    console.log('Position:', obj.position.toArray().map(v=>v.toFixed(4)));
    console.log('Rotation:', obj.rotation.toArray().slice(0,3).map(v=>((v as number)*180/Math.PI).toFixed(2)));
    if ((obj as THREE.Mesh).isMesh) {
      const geo = (obj as THREE.Mesh).geometry;
      geo.computeBoundingBox();
      console.log('  Mesh geometry box:', geo.boundingBox?.min.toArray().map(v=>v.toFixed(4)), 'to', geo.boundingBox?.max.toArray().map(v=>v.toFixed(4)));
    }
    obj.children.forEach(c => {
      console.log(`  child: ${c.name} (${c.type}) pos: ${c.position.toArray().map(v=>v.toFixed(4))}`);
    });
  }
});

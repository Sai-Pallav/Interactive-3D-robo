import * as THREE from 'three';
import { createProceduralRobot } from '../src/robot/robot/RobotProceduralFactory';

const robot = createProceduralRobot();
robot.root.rotation.set(0, 0, 0);
robot.root.position.set(0, 0, 0);
robot.root.updateMatrixWorld(true);

console.log('=== ALL MESHES IN NECK AND HEAD REGION ===');

const meshes: { name: string; parent: string; worldY: number; minY: number; maxY: number; minZ: number; maxZ: number; mat: string }[] = [];

robot.root.traverse((obj) => {
  if ((obj as THREE.Mesh).isMesh) {
    const m = obj as THREE.Mesh;
    if (m.geometry) {
      m.geometry.computeBoundingBox();
      if (m.geometry.boundingBox) {
        const b = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld);
        if (b.max.y >= 0.22 && b.min.y <= 0.45) {
          const wp = new THREE.Vector3();
          m.getWorldPosition(wp);
          const matName = Array.isArray(m.material) ? m.material.map(x => x.name || '(unnamed)').join(',') : (m.material.name || '(unnamed)');
          meshes.push({
            name: m.name || '(unnamed mesh)',
            parent: m.parent?.name || '(unnamed parent)',
            worldY: wp.y,
            minY: b.min.y,
            maxY: b.max.y,
            minZ: b.min.z,
            maxZ: b.max.z,
            mat: matName
          });
        }
      }
    }
  }
});

meshes.sort((a, b) => a.minY - b.minY);

for (const m of meshes) {
  console.log(`${m.name.padEnd(30)} parent: ${m.parent.padEnd(25)} Y: [${m.minY.toFixed(4)} to ${m.maxY.toFixed(4)}] Z: [${m.minZ.toFixed(4)} to ${m.maxZ.toFixed(4)}] mat: ${m.mat}`);
}

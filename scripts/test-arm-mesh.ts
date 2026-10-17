import * as THREE from 'three';
import { createProceduralRobot } from '../src/robot/robot/RobotProceduralFactory';

const robot = createProceduralRobot();
robot.root.updateMatrixWorld(true);

console.log('=== INSPECTING ARM ARMOR & ELBOW MESHES ===');
const leftArm = robot.leftArmNodes;

function inspectMesh(name: string, obj: THREE.Object3D) {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const m = child as THREE.Mesh;
      const geo = m.geometry;
      const pos = geo.attributes.position;
      const index = geo.index;
      let invertedNormals = 0;
      let nanNormals = 0;
      let nonPlanar = 0;

      if (pos && index) {
        const vA = new THREE.Vector3();
        const vB = new THREE.Vector3();
        const vC = new THREE.Vector3();
        const cb = new THREE.Vector3();
        const ab = new THREE.Vector3();
        const n = new THREE.Vector3();

        for (let i = 0; i < index.count; i += 3) {
          const a = index.getX(i);
          const b = index.getX(i + 1);
          const c = index.getX(i + 2);

          vA.fromBufferAttribute(pos, a);
          vB.fromBufferAttribute(pos, b);
          vC.fromBufferAttribute(pos, c);

          cb.subVectors(vC, vB);
          ab.subVectors(vA, vB);
          cb.cross(ab);

          if (Number.isNaN(cb.x) || Number.isNaN(cb.y) || Number.isNaN(cb.z)) {
            nanNormals++;
          }
        }
      }

      const box = new THREE.Box3().setFromObject(m);
      const size = new THREE.Vector3();
      box.getSize(size);
      console.log(
        `[${name}] ${m.name || 'unnamed'}`.padEnd(45),
        `verts: ${pos?.count || 0}`.padEnd(14),
        `tris: ${(index ? index.count / 3 : 0)}`.padEnd(12),
        `size: [${size.x.toFixed(3)}, ${size.y.toFixed(3)}, ${size.z.toFixed(3)}]`
      );
    }
  });
}

inspectMesh('UpperArm', leftArm.upperArm.group);
inspectMesh('Elbow', leftArm.elbow.group);

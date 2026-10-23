import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotArm } from '../src/robot/arm/RobotArm';

const mats = createRobotMaterials();
const leftArm = createRobotArm(-1, mats);
const rightArm = createRobotArm(1, mats);

console.log('=== ANALYZING UPPER ARM REAR OBJECTS ===');

function analyzeArm(name: string, arm: ReturnType<typeof createRobotArm>) {
  console.log(`\n--- ${name} ---`);
  const ua = arm.upperArm;
  const rear = arm.rearArm.upperArmRear;

  // Let's check bounding boxes in local upperArm space
  ua.group.updateMatrixWorld(true);

  rear.traverse(child => {
    if ((child as THREE.Mesh).isMesh) {
      const m = child as THREE.Mesh;
      const box = new THREE.Box3().setFromObject(m);
      console.log(`Rear Part: ${m.name || 'unnamed'}`.padEnd(35), 
        `min: [${box.min.x.toFixed(4)}, ${box.min.y.toFixed(4)}, ${box.min.z.toFixed(4)}]`,
        `max: [${box.max.x.toFixed(4)}, ${box.max.y.toFixed(4)}, ${box.max.z.toFixed(4)}]`
      );
    }
  });

  ua.armorGroup.traverse(child => {
    if ((child as THREE.Mesh).isMesh) {
      const m = child as THREE.Mesh;
      const box = new THREE.Box3().setFromObject(m);
      console.log(`Armor Part: ${m.name || 'unnamed'}`.padEnd(35), 
        `min: [${box.min.x.toFixed(4)}, ${box.min.y.toFixed(4)}, ${box.min.z.toFixed(4)}]`,
        `max: [${box.max.x.toFixed(4)}, ${box.max.y.toFixed(4)}, ${box.max.z.toFixed(4)}]`
      );
    }
  });
}

analyzeArm('Left Arm (side = -1)', leftArm);
analyzeArm('Right Arm (side = 1)', rightArm);

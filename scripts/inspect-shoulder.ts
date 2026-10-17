import * as THREE from 'three';
import { createProceduralRobot } from '../src/robot/robot/RobotProceduralFactory';

const robot = createProceduralRobot();
robot.root.updateMatrixWorld(true);

robot.root.traverse((obj) => {
  if (obj.name && (obj.name.includes('Hub') || obj.name.includes('Carrier') || obj.name.includes('Bearing') || obj.name.includes('Collar') || obj.name.includes('Mounting') || obj.name.includes('Shoulder'))) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    console.log(`${obj.name} | type: ${obj.type} | center: [${center.x.toFixed(3)}, ${center.y.toFixed(3)}, ${center.z.toFixed(3)}] | size: [${size.x.toFixed(3)}, ${size.y.toFixed(3)}, ${size.z.toFixed(3)}]`);
  }
});

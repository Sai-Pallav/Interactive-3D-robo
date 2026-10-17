import * as THREE from 'three';
import { createProceduralRobot } from '../src/robot/robot/RobotProceduralFactory';

const robot = createProceduralRobot();
robot.root.updateMatrixWorld(true);

robot.root.traverse((obj) => {
  if (obj.name === 'RightShoulderJoint' || obj.name === 'RightUpperShoulderHood' || obj.name === 'ShoulderEnergyRing_R') {
    const w = new THREE.Vector3();
    obj.getWorldPosition(w);
    console.log(`Obj: "${obj.name}" World Pos: [${w.x.toFixed(4)}, ${w.y.toFixed(4)}, ${w.z.toFixed(4)}]`);
  }
});

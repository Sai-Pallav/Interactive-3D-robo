import * as THREE from 'three';
import { createProceduralRobot } from '../src/robot/robot/RobotProceduralFactory';

const robot = createProceduralRobot();
robot.root.updateMatrixWorld(true);

console.log('=== ROBOT LEG ANATOMICAL COORDINATES & BOUNDING BOXES ===');

function logBox(name: string, obj: THREE.Object3D) {
  if (!obj) {
    console.log(`${name}: NOT FOUND`);
    return;
  }
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  console.log(`${name}:`);
  console.log(`  center: [${center.x.toFixed(4)}, ${center.y.toFixed(4)}, ${center.z.toFixed(4)}]`);
  console.log(`  size:   [${size.x.toFixed(4)}, ${size.y.toFixed(4)}, ${size.z.toFixed(4)}]`);
  console.log(`  min/max Y: [${box.min.y.toFixed(4)}, ${box.max.y.toFixed(4)}]`);
}

logBox('Robot Root', robot.root);
logBox('Pelvis / Waist', robot.torsoNodes.waist.group);
logBox('Left Hip Group', robot.leftLegNodes.hip.group);
logBox('Left Thigh Anterior', robot.leftLegNodes.thigh.anteriorArmor);
logBox('Left Thigh Skeleton', robot.leftLegNodes.thigh.femurSkeleton);
logBox('Left Knee Patella', robot.leftLegNodes.knee.patellaShield);
logBox('Left Knee Core', robot.leftLegNodes.knee.group);
logBox('Left Shin Keel', robot.leftLegNodes.shin.anteriorKeelArmor);
logBox('Left Shin Skeleton', robot.leftLegNodes.shin.tibiaSkeleton);
logBox('Left Ankle Core', robot.leftLegNodes.ankle.sphericalCore);
logBox('Left Foot Group', robot.leftLegNodes.foot.group);
logBox('Left Foot Sole', robot.leftLegNodes.foot.soleChassis);
logBox('Right Foot Sole', robot.rightLegNodes.foot.soleChassis);

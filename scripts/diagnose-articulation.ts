import * as THREE from 'three';
import { createProceduralRobot } from '../src/robot/robot/RobotProceduralFactory';
import { LookController } from '../src/robot/animation/LookController';
import { ANIMATION_CONFIG } from '../src/robot/animation/AnimationConfig';

const robot = createProceduralRobot();
robot.root.rotation.set(0, 0, 0);
robot.root.position.set(0, 0, 0);
robot.root.updateMatrixWorld(true);

const head = robot.head;
const neck = robot.neck;

console.log('=== TEST ARTICULATION POSES ===');

// Poses to test:
// 1. Neutral (headRot: 0, 0, 0, neckRot: 0, 0, 0)
// 2. Head Yaw +20° (Look right)
// 3. Head Yaw -20° (Look left)
// 4. Head Pitch +15° (Look down)
// 5. Head Pitch -15° (Look up)
// 6. Combined Pitch -15° and Yaw +20° (Look up-right, exactly like reference media_1792765775740_5352294e and media_1792765788937_7422790c!)

const poses = [
  { name: 'Neutral', yaw: 0, pitch: 0 },
  { name: 'Yaw +25°', yaw: (25 * Math.PI) / 180, pitch: 0 },
  { name: 'Yaw -25°', yaw: (-25 * Math.PI) / 180, pitch: 0 },
  { name: 'Pitch Up -15°', yaw: 0, pitch: (-15 * Math.PI) / 180 },
  { name: 'Pitch Down +15°', yaw: 0, pitch: (15 * Math.PI) / 180 },
  { name: 'Look Up-Right (Ref Media)', yaw: (25 * Math.PI) / 180, pitch: (-15 * Math.PI) / 180 },
];

const cfg = ANIMATION_CONFIG.look;
const pitchSum = cfg.headRatio + cfg.neckRatio + cfg.chestRatio;
const headPitchRatio = cfg.headRatio / pitchSum;
const neckPitchRatio = cfg.neckRatio / pitchSum;

for (const p of poses) {
  const neckPitch = p.pitch * neckPitchRatio;
  const neckYaw = p.yaw * cfg.neckRatio;
  const headPitch = p.pitch * headPitchRatio;
  const headYaw = p.yaw * cfg.headRatio;

  neck.rotation.set(neckPitch, neckYaw, 0, 'YXZ');
  head.rotation.set(headPitch, headYaw, 0, 'YXZ');
  robot.root.updateMatrixWorld(true);

  console.log(`\n--- Pose: ${p.name} ---`);
  console.log(`Neck rot: pitch ${(neckPitch * 180 / Math.PI).toFixed(1)}°, yaw ${(neckYaw * 180 / Math.PI).toFixed(1)}°`);
  console.log(`Head rot: pitch ${(headPitch * 180 / Math.PI).toFixed(1)}°, yaw ${(headYaw * 180 / Math.PI).toFixed(1)}°`);

  // Head world position and quaternion
  const headWPos = new THREE.Vector3();
  head.getWorldPosition(headWPos);
  const neckWPos = new THREE.Vector3();
  neck.getWorldPosition(neckWPos);

  console.log(`Neck world pos: (${neckWPos.x.toFixed(4)}, ${neckWPos.y.toFixed(4)}, ${neckWPos.z.toFixed(4)})`);
  console.log(`Head world pos: (${headWPos.x.toFixed(4)}, ${headWPos.y.toFixed(4)}, ${headWPos.z.toFixed(4)})`);

  // Measure key landmark positions:
  // 1. Chin apex (in JawShell)
  // In Jaw local: x=0, y=-0.118, z=0.150
  const jawShell = robot.root.getObjectByName('JawShell');
  const chinPt = new THREE.Vector3(0, -0.118, 0.150);
  if (jawShell) chinPt.applyMatrix4(jawShell.matrixWorld);

  // 2. Neck upper connector (in Neck)
  // In Neck local: x=0, y=0.150, z=-0.005
  const neckConnectorPt = new THREE.Vector3(0, 0.150, -0.005).applyMatrix4(neck.matrixWorld);

  // 3. Occipital gimbal mount plate (in RearNeckAssembly -> Neck)
  const gimbalPlate = robot.root.getObjectByName('OccipitalGimbalMountPlate');
  const gimbalPt = new THREE.Vector3();
  if (gimbalPlate) gimbalPlate.getWorldPosition(gimbalPt);

  // 4. Occipital neck transition cradle (in RearHeadAssembly -> Head)
  const cradle = robot.root.getObjectByName('OccipitalNeckTransitionCradle');
  const cradlePt = new THREE.Vector3();
  if (cradle) cradle.getWorldPosition(cradlePt);

  // 5. Jaw neck socket gorget
  // In Jaw local: x=0, y=-0.124, z=0.010
  const jawSocketPt = new THREE.Vector3(0, -0.124, 0.010);
  if (jawShell) jawSocketPt.applyMatrix4(jawShell.matrixWorld);

  console.log(`Chin apex World: (${chinPt.x.toFixed(4)}, ${chinPt.y.toFixed(4)}, ${chinPt.z.toFixed(4)})`);
  console.log(`Jaw socket World: (${jawSocketPt.x.toFixed(4)}, ${jawSocketPt.y.toFixed(4)}, ${jawSocketPt.z.toFixed(4)})`);
  console.log(`Neck cervical conn World: (${neckConnectorPt.x.toFixed(4)}, ${neckConnectorPt.y.toFixed(4)}, ${neckConnectorPt.z.toFixed(4)})`);
  console.log(`Distance NeckConn to JawSocket: ${neckConnectorPt.distanceTo(jawSocketPt).toFixed(4)}`);
  console.log(`Gimbal plate (Neck) World: (${gimbalPt.x.toFixed(4)}, ${gimbalPt.y.toFixed(4)}, ${gimbalPt.z.toFixed(4)})`);
  console.log(`Cradle (Head) World: (${cradlePt.x.toFixed(4)}, ${cradlePt.y.toFixed(4)}, ${cradlePt.z.toFixed(4)})`);
  console.log(`Distance Gimbal to Cradle: ${gimbalPt.distanceTo(cradlePt).toFixed(4)}`);
}

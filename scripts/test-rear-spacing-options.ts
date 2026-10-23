import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotTorso } from '../src/robot/torso/RobotTorso';
import { TORSO_CONFIG } from '../src/robot/torso/TorsoConfig';

const mats = createRobotMaterials();
const torso = createRobotTorso(mats);
torso.group.updateMatrixWorld(true);

const dual = TORSO_CONFIG.stomach.dualActuators;
const outerUpper = new THREE.Vector3(dual.outer.upperMount.x, dual.outer.upperMount.y, dual.outer.upperMount.z);
const outerLower = new THREE.Vector3(dual.outer.lowerMount.x, dual.outer.lowerMount.y, dual.outer.lowerMount.z);
const outerRadius = 0.0118;

const innerUpper = new THREE.Vector3(dual.inner.upperMount.x, dual.inner.upperMount.y, dual.inner.upperMount.z);
const innerLower = new THREE.Vector3(dual.inner.lowerMount.x, dual.inner.lowerMount.y, dual.inner.lowerMount.z);
const innerRadius = 0.0095;

const rearLower = new THREE.Vector3(0.056, -0.198, -0.040);
const rearRadius = 0.0068;

console.log('=== FRONT INNER & OUTER ACTUATORS STATS ===');
const outerDir = new THREE.Vector3().subVectors(outerLower, outerUpper);
const innerDir = new THREE.Vector3().subVectors(innerLower, innerUpper);

const outerAngleXY = Math.atan2(outerUpper.x - outerLower.x, outerUpper.y - outerLower.y) * 180 / Math.PI;
const innerAngleXY = Math.atan2(innerUpper.x - innerLower.x, innerUpper.y - innerLower.y) * 180 / Math.PI;

console.log(`Outer pole: Upper X=${outerUpper.x}, Lower X=${outerLower.x}, Spread diff=${((outerUpper.x - outerLower.x)*2*1000).toFixed(1)}mm, AngleXY=${outerAngleXY.toFixed(2)}°`);
console.log(`Inner pole: Upper X=${innerUpper.x}, Lower X=${innerLower.x}, Spread diff=${((innerUpper.x - innerLower.x)*2*1000).toFixed(1)}mm, AngleXY=${innerAngleXY.toFixed(2)}°`);

console.log('\n=== TESTING CANDIDATE REAR UPPER MOUNT X VALUES ===');

const candidateXs = [0.062, 0.072, 0.076, 0.078, 0.080, 0.082, 0.084, 0.088];

for (const candX of candidateXs) {
  const rearUpper = new THREE.Vector3(candX, -0.048, -0.056);
  const rearDir = new THREE.Vector3().subVectors(rearLower, rearUpper);
  const rearAngleXY = Math.atan2(rearUpper.x - rearLower.x, rearUpper.y - rearLower.y) * 180 / Math.PI;
  const spreadDiff = (rearUpper.x - rearLower.x) * 2 * 1000;
  const upperDist = rearUpper.x * 2 * 1000;
  const lowerDist = rearLower.x * 2 * 1000;

  // Compute clearance to outer pole along stroke
  let minOuterClearance = Infinity;
  for (let t = 0; t <= 1; t += 0.05) {
    const pRear = new THREE.Vector3().lerpVectors(rearUpper, rearLower, t);
    const pOuter = new THREE.Vector3().lerpVectors(outerUpper, outerLower, t);
    const dist = pRear.distanceTo(pOuter);
    const cl = dist - (rearRadius + outerRadius);
    if (cl < minOuterClearance) minOuterClearance = cl;
  }

  // Compute clearance to inner pole along stroke
  let minInnerClearance = Infinity;
  for (let t = 0; t <= 1; t += 0.05) {
    const pRear = new THREE.Vector3().lerpVectors(rearUpper, rearLower, t);
    const pInner = new THREE.Vector3().lerpVectors(innerUpper, innerLower, t);
    const dist = pRear.distanceTo(pInner);
    const cl = dist - (rearRadius + innerRadius);
    if (cl < minInnerClearance) minInnerClearance = cl;
  }

  // Compute clearance to spine center (x=0)
  let minSpineClearance = Infinity;
  for (let t = 0; t <= 1; t += 0.05) {
    const pRear = new THREE.Vector3().lerpVectors(rearUpper, rearLower, t);
    // Spine width at z=-0.04 is at most ~0.024 (half-width 0.024)
    const spineHalfW = 0.024;
    const cl = pRear.x - (spineHalfW + rearRadius);
    if (cl < minSpineClearance) minSpineClearance = cl;
  }

  console.log(`candX: ${candX.toFixed(3)} | UpperDist: ${upperDist.toFixed(1)}mm | LowerDist: ${lowerDist.toFixed(1)}mm | Spread: +${spreadDiff.toFixed(1)}mm | AngleXY: ${rearAngleXY.toFixed(2)}° | ClrToOuter: ${(minOuterClearance*1000).toFixed(1)}mm | ClrToInner: ${(minInnerClearance*1000).toFixed(1)}mm | ClrToSpine: ${(minSpineClearance*1000).toFixed(1)}mm`);
}

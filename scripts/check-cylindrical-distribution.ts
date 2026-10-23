import * as THREE from 'three';
import { TORSO_CONFIG } from '../src/robot/torso/TorsoConfig';

const dual = TORSO_CONFIG.stomach.dualActuators;

// Left side (positive X is right, negative X is left. Let's analyze Right side (+X)):
const poles = [
  { name: 'Front-Inner (Right)', upper: new THREE.Vector3(dual.inner.upperMount.x, dual.inner.upperMount.y, dual.inner.upperMount.z), lower: new THREE.Vector3(dual.inner.lowerMount.x, dual.inner.lowerMount.y, dual.inner.lowerMount.z) },
  { name: 'Side-Outer (Right)', upper: new THREE.Vector3(dual.outer.upperMount.x, dual.outer.upperMount.y, dual.outer.upperMount.z), lower: new THREE.Vector3(dual.outer.lowerMount.x, dual.outer.lowerMount.y, dual.outer.lowerMount.z) },
  { name: 'Rear-Original (Right)', upper: new THREE.Vector3(0.062, -0.048, -0.056), lower: new THREE.Vector3(0.056, -0.198, -0.040) },
  { name: 'Rear-Proposed (Right, 0.080)', upper: new THREE.Vector3(0.080, -0.048, -0.056), lower: new THREE.Vector3(0.056, -0.198, -0.040) },
];

console.log('=== POLE CYLINDRICAL DISTRIBUTION (around central spine axis x=0, z=0) ===\n');

for (const p of poles) {
  const rUpper = Math.hypot(p.upper.x, p.upper.z);
  const thetaUpper = Math.atan2(p.upper.z, p.upper.x) * 180 / Math.PI; // 0 = +X (right), 90 = +Z (front), -90 = -Z (rear)
  
  const rLower = Math.hypot(p.lower.x, p.lower.z);
  const thetaLower = Math.atan2(p.lower.z, p.lower.x) * 180 / Math.PI;

  const len = p.upper.distanceTo(p.lower);
  const dx = p.upper.x - p.lower.x;
  const dy = p.upper.y - p.lower.y;
  const dz = p.upper.z - p.lower.z;
  const angleCoronal = Math.atan2(dx, -dy) * 180 / Math.PI;
  const angleSagittal = Math.atan2(dz, -dy) * 180 / Math.PI;

  console.log(`--- ${p.name} ---`);
  console.log(`  Upper: [${p.upper.x.toFixed(4)}, ${p.upper.y.toFixed(4)}, ${p.upper.z.toFixed(4)}] -> R=${(rUpper*1000).toFixed(1)}mm, Angle=${thetaUpper.toFixed(1)}°`);
  console.log(`  Lower: [${p.lower.x.toFixed(4)}, ${p.lower.y.toFixed(4)}, ${p.lower.z.toFixed(4)}] -> R=${(rLower*1000).toFixed(1)}mm, Angle=${thetaLower.toFixed(1)}°`);
  console.log(`  Total length: ${(len*1000).toFixed(1)}mm`);
  console.log(`  Outward inclination (coronal): ${angleCoronal.toFixed(2)}°`);
  console.log(`  Depth inclination (sagittal): ${angleSagittal.toFixed(2)}°\n`);
}

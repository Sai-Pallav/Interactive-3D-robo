import * as THREE from 'three';

// Current pivot
const pivotOld = new THREE.Vector3(0, 0.172, -0.014);
// Proposed cervical articulation pivot
const pivotNew = new THREE.Vector3(0, 0.148, -0.008);

// Landmark: Chin apex (local to skull center: 0, -0.1038, +0.132)
// In Neck coords (neutral):
const chinNeutral = new THREE.Vector3(0, 0.172 - 0.1038, -0.014 + 0.132); // (0, 0.0682, 0.1180)
// Landmark: Jaw socket (local to skull center: 0, -0.1091, +0.0088)
const socketNeutral = new THREE.Vector3(0, 0.172 - 0.1091, -0.014 + 0.0088); // (0, 0.0629, -0.0052)
// Landmark: Rear cradle (local to skull center: 0, -0.0334, -0.0598)
const cradleNeutral = new THREE.Vector3(0, 0.172 - 0.0334, -0.014 - 0.0598); // (0, 0.1386, -0.0738)
// Landmark: Neck connector (top of neck)
const neckTop = new THREE.Vector3(0, 0.150, -0.005);

console.log('Neck top:', neckTop);
console.log('Chin neutral:', chinNeutral);
console.log('Socket neutral:', socketNeutral);
console.log('Cradle neutral:', cradleNeutral);

console.log('\n--- Relative to Old Pivot (mid-skull) ---');
console.log('NeckTop to PivotOld:', neckTop.clone().sub(pivotOld));
console.log('Chin to PivotOld:', chinNeutral.clone().sub(pivotOld));
console.log('Socket to PivotOld:', socketNeutral.clone().sub(pivotOld));
console.log('Cradle to PivotOld:', cradleNeutral.clone().sub(pivotOld));

console.log('\n--- Relative to New Pivot (cervical joint) ---');
console.log('NeckTop to PivotNew:', neckTop.clone().sub(pivotNew));
console.log('Chin to PivotNew:', chinNeutral.clone().sub(pivotNew));
console.log('Socket to PivotNew:', socketNeutral.clone().sub(pivotNew));
console.log('Cradle to PivotNew:', cradleNeutral.clone().sub(pivotNew));

// Let's test rotation: pitch = -15° (look up), yaw = 25°
const pitch = (-15 * Math.PI) / 180;
const yaw = (25 * Math.PI) / 180;
const euler = new THREE.Euler(pitch, yaw, 0, 'YXZ');

function testRot(pivot: THREE.Vector3, pt: THREE.Vector3) {
  const rel = pt.clone().sub(pivot);
  rel.applyEuler(euler);
  return pivot.clone().add(rel);
}

console.log('\n--- Pose Look Up-Right (-15° pitch, +25° yaw) ---');
console.log('Old Pivot:');
const chinOldRot = testRot(pivotOld, chinNeutral);
const cradleOldRot = testRot(pivotOld, cradleNeutral);
console.log('  Chin:', chinOldRot, 'dist from neutral:', chinOldRot.distanceTo(chinNeutral).toFixed(4));
console.log('  Cradle:', cradleOldRot, 'dist from neutral:', cradleOldRot.distanceTo(cradleNeutral).toFixed(4));

console.log('New Pivot:');
const chinNewRot = testRot(pivotNew, chinNeutral);
const cradleNewRot = testRot(pivotNew, cradleNeutral);
console.log('  Chin:', chinNewRot, 'dist from neutral:', chinNewRot.distanceTo(chinNeutral).toFixed(4));
console.log('  Cradle:', cradleNewRot, 'dist from neutral:', cradleNewRot.distanceTo(cradleNeutral).toFixed(4));

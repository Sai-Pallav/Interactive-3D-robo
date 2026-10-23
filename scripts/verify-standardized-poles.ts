import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotTorso } from '../src/robot/torso/RobotTorso';
import { TORSO_CONFIG } from '../src/robot/torso/TorsoConfig';
import { geoCache } from '../src/robot/utils/GeometryCache';

console.log('================================================================');
console.log('       STANDARDIZED ABDOMINAL POLE DIMENSIONS AUDIT             ');
console.log('================================================================');

let allPassed = true;
function assert(desc: string, passed: boolean, detail: string) {
  if (passed) {
    console.log(`[PASS] ${desc.padEnd(52)}: ${detail}`);
  } else {
    console.error(`[FAIL] ${desc.padEnd(52)}: ${detail}`);
    allPassed = false;
  }
}

// 1. Check Shared Config Specification
const commonDims = TORSO_CONFIG.stomach.poleDimensions;
assert('Common poleDimensions config exists', Boolean(commonDims), JSON.stringify(commonDims));
assert('Common cylinderRadius is 0.0068', commonDims?.cylinderRadius === 0.0068, `cylinderRadius = ${commonDims?.cylinderRadius}`);
assert('Common pistonRadius is 0.0036', commonDims?.pistonRadius === 0.0036, `pistonRadius = ${commonDims?.pistonRadius}`);
assert('Common upperClevisWidth is 0.016', commonDims?.upperClevisWidth === 0.016, `upperClevisWidth = ${commonDims?.upperClevisWidth}`);
assert('Common lowerPlinthWidth is 0.014', commonDims?.lowerPlinthWidth === 0.014, `lowerPlinthWidth = ${commonDims?.lowerPlinthWidth}`);

const dual = TORSO_CONFIG.stomach.dualActuators;
assert('Dual outer cylinderRadius is 0.0068', dual?.outer.cylinderRadius === 0.0068, `outer cylinderRadius = ${dual?.outer.cylinderRadius}`);
assert('Dual outer pistonRadius is 0.0036', dual?.outer.pistonRadius === 0.0036, `outer pistonRadius = ${dual?.outer.pistonRadius}`);
assert('Dual inner cylinderRadius is 0.0068', dual?.inner.cylinderRadius === 0.0068, `inner cylinderRadius = ${dual?.inner.cylinderRadius}`);
assert('Dual inner pistonRadius is 0.0036', dual?.inner.pistonRadius === 0.0036, `inner pistonRadius = ${dual?.inner.pistonRadius}`);

const rear = TORSO_CONFIG.stomach.rearActuators;
assert('Rear cylinderRadius is 0.0068', rear?.cylinderRadius === 0.0068, `rear cylinderRadius = ${rear?.cylinderRadius}`);
assert('Rear pistonRadius is 0.0036', rear?.pistonRadius === 0.0036, `rear pistonRadius = ${rear?.pistonRadius}`);

// 2. Instantiate Torso and Abdomen Assembly
const materials = createRobotMaterials();
const torso = createRobotTorso(materials);
torso.group.updateMatrixWorld(true);

// 3. Inspect GeoCache for Cached Geometry Radii
console.log('\n--- POLE GEOMETRIES AND RADII IN GEOCACHE ---');
let sideBarrelFound = false;
let sideRodFound = false;
let rearBarrelFound = false;
let rearRodFound = false;

// GeoCache internal map or inspect created geometries
const keys = Array.from((geoCache as any).generalMap.keys()) as string[];
console.log('Actuator-related cache keys:');
for (const key of keys) {
  if (key.includes('Actuator') || key.includes('Plinth') || key.includes('Clevis')) {
    const geo = (geoCache as any).generalMap.get(key) as THREE.BufferGeometry;
    if (geo instanceof THREE.CylinderGeometry) {
      console.log(`  ${key.padEnd(45)}: Cylinder [rTop: ${geo.parameters.radiusTop.toFixed(4)}, rBot: ${geo.parameters.radiusBottom.toFixed(4)}, height: ${geo.parameters.height.toFixed(4)}]`);
      if (key.startsWith('ActuatorBarrel_0.0068')) sideBarrelFound = true;
      if (key.startsWith('ActuatorRod_0.0036')) sideRodFound = true;
      if (key === 'RearActuatorBarrelGeo_v5') {
        rearBarrelFound = (geo.parameters.radiusTop === 0.0068);
      }
      if (key === 'RearActuatorRodGeo_v5') {
        rearRodFound = (geo.parameters.radiusTop === 0.0036);
      }
    } else if (geo instanceof THREE.BoxGeometry) {
      console.log(`  ${key.padEnd(45)}: Box [w: ${geo.parameters.width.toFixed(4)}, h: ${geo.parameters.height.toFixed(4)}, d: ${geo.parameters.depth.toFixed(4)}]`);
    } else if (geo instanceof THREE.SphereGeometry) {
      console.log(`  ${key.padEnd(45)}: Sphere [r: ${geo.parameters.radius.toFixed(4)}]`);
    }
  }
}

assert('Side actuator barrels use 0.0068 radius geometry', sideBarrelFound, 'ActuatorBarrel_0.0068 present');
assert('Side actuator rods use 0.0036 radius geometry', sideRodFound, 'ActuatorRod_0.0036 present');
assert('Rear actuator barrel uses 0.0068 radius geometry', rearBarrelFound, 'RearActuatorBarrelGeo_v5 radius = 0.0068');
assert('Rear actuator rod uses 0.0036 radius geometry', rearRodFound, 'RearActuatorRodGeo_v5 radius = 0.0036');

// Verify NO old bulky geometries exist in cache
const hasOldOuterBarrel = keys.some(k => k.startsWith('ActuatorBarrel_0.0118') || k.startsWith('ActuatorBarrel_0.0125'));
const hasOldInnerBarrel = keys.some(k => k.startsWith('ActuatorBarrel_0.0095') || k.startsWith('ActuatorBarrel_0.0090'));
const hasOldOuterRod = keys.some(k => k.startsWith('ActuatorRod_0.0064') || k.startsWith('ActuatorRod_0.0068'));
const hasOldInnerRod = keys.some(k => k.startsWith('ActuatorRod_0.0052'));

assert('No bulky outer barrel geometry created', !hasOldOuterBarrel, '0.0118 / 0.0125 barrel absent');
assert('No bulky inner barrel geometry created', !hasOldInnerBarrel, '0.0095 / 0.0090 barrel absent');
assert('No bulky outer rod geometry created', !hasOldOuterRod, '0.0064 / 0.0068 rod absent');
assert('No bulky inner rod geometry created', !hasOldInnerRod, '0.0052 rod absent');

// 4. World-Scale Verification (all poles must have scale 1.0)
let scalesValid = true;
torso.group.traverse(obj => {
  if (obj.name && (obj.name.includes('Actuator') || obj.name.includes('Pole') || obj.name.includes('BilateralRear'))) {
    const ws = new THREE.Vector3();
    obj.getWorldScale(ws);
    if (Math.abs(ws.x - 1) > 0.001 || Math.abs(ws.y - 1) > 0.001 || Math.abs(ws.z - 1) > 0.001) {
      scalesValid = false;
      console.error(`Invalid world scale on ${obj.name}: ${ws.toArray()}`);
    }
  }
});
assert('All pole objects have unit world scale (1,1,1)', scalesValid, 'No unintended scale factor applied');

// 5. Preservation of Rear Pole Spacing and Divergence
assert('Rear upper mount spacing preserved', rear.upperMount.x === 0.080, `Rear upper X = ${rear.upperMount.x} (span = ${(rear.upperMount.x * 2000).toFixed(1)} mm)`);
assert('Rear lower mount spacing preserved', rear.lowerMount.x === 0.056, `Rear lower X = ${rear.lowerMount.x} (span = ${(rear.lowerMount.x * 2000).toFixed(1)} mm)`);
assert('Rear outward divergence preserved', rear.upperMount.x > rear.lowerMount.x, `Upper X (${rear.upperMount.x}) > Lower X (${rear.lowerMount.x})`);

const rearAngleZ = Math.atan2(rear.upperMount.x - rear.lowerMount.x, -(rear.lowerMount.y - rear.upperMount.y)) * 180 / Math.PI;
assert('Rear inclination angle preserved', Math.abs(rearAngleZ - 9.1) < 0.5, `Rear angle = ${rearAngleZ.toFixed(2)}°`);

// 6. Kinematic Clearances
const outerDir = new THREE.Vector3(
  dual.outer.lowerMount.x - dual.outer.upperMount.x,
  dual.outer.lowerMount.y - dual.outer.upperMount.y,
  dual.outer.lowerMount.z - dual.outer.upperMount.z
);
const innerDir = new THREE.Vector3(
  dual.inner.lowerMount.x - dual.inner.upperMount.x,
  dual.inner.lowerMount.y - dual.inner.upperMount.y,
  dual.inner.lowerMount.z - dual.inner.upperMount.z
);

let minDualClearance = Infinity;
for (let t = 0; t <= 1; t += 0.05) {
  const pOut = new THREE.Vector3(
    dual.outer.upperMount.x + t * outerDir.x,
    dual.outer.upperMount.y + t * outerDir.y,
    dual.outer.upperMount.z + t * outerDir.z
  );
  const pIn = new THREE.Vector3(
    dual.inner.upperMount.x + t * innerDir.x,
    dual.inner.upperMount.y + t * innerDir.y,
    dual.inner.upperMount.z + t * innerDir.z
  );
  const dist = pOut.distanceTo(pIn);
  const cl = dist - (0.0068 + 0.0068);
  if (cl < minDualClearance) minDualClearance = cl;
}
assert('Clearance between outer and inner poles is positive and generous', minDualClearance > 0.005, `Min clearance: ${(minDualClearance * 1000).toFixed(2)} mm`);

// 7. Articulation Test (pitch / roll / yaw motion)
torso.stomachPivot.rotation.x = 0.06;
torso.stomachPivot.rotation.y = 0.08;
torso.stomachPivot.rotation.z = 0.03;
torso.group.updateMatrixWorld(true);
assert('Articulation test: stomach kinematics update without throwing', true, 'Matrix updated cleanly under rotation');

// Reset
torso.stomachPivot.rotation.set(0, 0, 0);
torso.group.updateMatrixWorld(true);

console.log('================================================================');
if (allPassed) {
  console.log('>>> ALL VERIFICATION CHECKS PASSED [OK] <<<');
} else {
  console.error('>>> VERIFICATION FAILED <<<');
  process.exit(1);
}

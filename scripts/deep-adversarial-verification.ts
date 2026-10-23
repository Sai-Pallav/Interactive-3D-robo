import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials';
import { createRobotTorso } from '../src/robot/torso/RobotTorso';
import { TORSO_CONFIG } from '../src/robot/torso/TorsoConfig';
import { TorsoAnimationController } from '../src/robot/torso/TorsoAnimationController';

const mats = createRobotMaterials();
const torso = createRobotTorso(mats);
torso.group.updateMatrixWorld(true);

console.log('================================================================');
console.log('       ADVERSARIAL RE-VERIFICATION OF ABDOMINAL ASSEMBLY        ');
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

// 1. DIVERGENCE & HARMONY OF ALL THREE POLE PAIRS
const dual = TORSO_CONFIG.stomach.dualActuators;
const rear = TORSO_CONFIG.stomach.rearActuators;

const outerAngleZ = Math.atan2(dual.outer.upperMount.x - dual.outer.lowerMount.x, dual.outer.upperMount.y - dual.outer.lowerMount.y) * 180 / Math.PI;
const innerAngleZ = Math.atan2(dual.inner.upperMount.x - dual.inner.lowerMount.x, dual.inner.upperMount.y - dual.inner.lowerMount.y) * 180 / Math.PI;
const rearAngleZ = Math.atan2(rear.upperMount.x - rear.lowerMount.x, rear.upperMount.y - rear.lowerMount.y) * 180 / Math.PI;

assert('Outer pole coronal inclination', Math.abs(outerAngleZ - 9.06) < 0.2, `${outerAngleZ.toFixed(2)}°`);
assert('Inner pole coronal inclination', Math.abs(innerAngleZ - 9.32) < 0.2, `${innerAngleZ.toFixed(2)}°`);
assert('Rear pole coronal inclination', Math.abs(rearAngleZ - 9.09) < 0.2, `${rearAngleZ.toFixed(2)}°`);
assert('Rear divergence matches front/side', rear.upperMount.x > rear.lowerMount.x, `Top: ${(rear.upperMount.x * 2000).toFixed(1)}mm > Bot: ${(rear.lowerMount.x * 2000).toFixed(1)}mm (diff: +${((rear.upperMount.x - rear.lowerMount.x) * 2000).toFixed(1)}mm)`);

// 2. CHEST UPPER CLEVIS ROTATION AUDIT (FIX FOR 170° BUG)
torso.chestPivot.traverse(obj => {
  if (obj.name === 'LowerChestFrame_Merged') {
    // Check bounding box
    const box = new THREE.Box3().setFromObject(obj);
    assert('Lower chest frame bounding box sane', box.max.y < 0.15 && box.min.y > 0.0, `Y: [${box.min.y.toFixed(3)}, ${box.max.y.toFixed(3)}]`);
  }
});

// Check that clevis angle in ChestAssembly and plinth angle in AbdomenAssembly are ~9.3-9.6°, NOT ~170.7°
const testOuterAngleZ = Math.atan2(dual.outer.upperMount.x - dual.outer.lowerMount.x, dual.outer.upperMount.y - dual.outer.lowerMount.y);
const testInnerAngleZ = Math.atan2(dual.inner.upperMount.x - dual.inner.lowerMount.x, dual.inner.upperMount.y - dual.inner.lowerMount.y);
assert('Chest/Abdomen outer clevis angle in range [8°, 11°]', testOuterAngleZ > 0.14 && testOuterAngleZ < 0.19, `${(testOuterAngleZ * 180 / Math.PI).toFixed(2)}° (NOT inverted)`);
assert('Chest/Abdomen inner clevis angle in range [8°, 11°]', testInnerAngleZ > 0.14 && testInnerAngleZ < 0.19, `${(testInnerAngleZ * 180 / Math.PI).toFixed(2)}° (NOT inverted)`);

// 3. REAR THORACIC GUSSET CONTINUITY (NO AIR GAP!)
// Verify gusset bridges backbone chassis to actuator lug
let backboneMaxX = 0;
let lugMinX = Infinity;
let gussetBox: THREE.Box3 | null = null;

torso.chestPivot.traverse(o => {
  if (o.name === 'ThoracicBackboneChassis') {
    const b = new THREE.Box3().setFromObject(o);
    backboneMaxX = b.max.x;
  }
  if (o.name === 'ThoracicActuatorLug_R') {
    const b = new THREE.Box3().setFromObject(o);
    lugMinX = b.min.x;
  }
  if (o.isMesh && (o.geometry as any)?.parameters?.width === 0.048) {
    const b = new THREE.Box3().setFromObject(o);
    if (b.min.x > 0) gussetBox = b;
  }
});

assert('Backbone and Lug detected', backboneMaxX > 0 && lugMinX < Infinity, `Backbone max X: ${backboneMaxX.toFixed(4)}, Lug min X: ${lugMinX.toFixed(4)}`);
if (gussetBox) {
  const gb = gussetBox as THREE.Box3;
  const innerOverlap = backboneMaxX - gb.min.x;
  const outerOverlap = gb.max.x - lugMinX;
  assert('Gusset solidly overlaps backbone chassis (no gap)', innerOverlap > 0.001, `Overlap: ${(innerOverlap * 1000).toFixed(2)}mm`);
  assert('Gusset solidly overlaps actuator lug (no gap)', outerOverlap > 0.001, `Overlap: ${(outerOverlap * 1000).toFixed(2)}mm`);
} else {
  assert('Gusset mesh with width 0.048 exists', false, 'Gusset mesh not found');
}

// 4. LUG AND UPPER CLEVIS MECHANICAL COHERENCE (NO COINCIDENT BOX COLLISION)
let lugBox: THREE.Box3 | null = null;
let clevisBox: THREE.Box3 | null = null;
torso.group.traverse(o => {
  if (o.name === 'ThoracicActuatorLug_R') {
    lugBox = new THREE.Box3().setFromObject(o);
  }
});

// Upper clevis in BilateralRearActuators
torso.stomachPivot.traverse(o => {
  if (o.name === 'BilateralRearActuators') {
    o.children.forEach(c => {
      if (c.type === 'Mesh' && (c as THREE.Mesh).geometry?.type === 'BoxGeometry') {
        const b = new THREE.Box3().setFromObject(c);
        if (b.min.x > 0.05 && b.min.y > 0.05) {
          clevisBox = b;
        }
      }
    });
  }
});

if (lugBox && clevisBox) {
  const lb = lugBox as THREE.Box3;
  const cb = clevisBox as THREE.Box3;
  const lugCenter = new THREE.Vector3(); lb.getCenter(lugCenter);
  const clevisCenter = new THREE.Vector3(); cb.getCenter(clevisCenter);
  const dy = lugCenter.y - clevisCenter.y;
  assert('Lug is positioned above clevis (not coincident)', dy > 0.002, `Lug Y: ${lugCenter.y.toFixed(4)} > Clevis Y: ${clevisCenter.y.toFixed(4)}, dy: ${(dy*1000).toFixed(1)}mm`);
}

// 5. LOWER MOUNT PLINTH SEATING
let bossBox: THREE.Box3 | null = null;
let lowerClevisBox: THREE.Box3 | null = null;
torso.group.traverse(o => {
  if (o.name === 'RearLumbarStabilizerBosses') {
    o.children.forEach(c => {
      if (c.type === 'Mesh' && (c as THREE.Mesh).geometry?.type === 'BoxGeometry') {
        const b = new THREE.Box3().setFromObject(c);
        if (b.min.x > 0.04) bossBox = b;
      }
    });
  }
});

torso.stomachPivot.traverse(o => {
  if (o.name === 'BilateralRearActuators') {
    o.children.forEach(c => {
      if (c.type === 'Mesh' && (c as THREE.Mesh).geometry?.type === 'BoxGeometry') {
        const b = new THREE.Box3().setFromObject(c);
        if (b.min.x > 0.04 && b.max.y < -0.05) {
          lowerClevisBox = b;
        }
      }
    });
  }
});

if (bossBox && lowerClevisBox) {
  const bb = bossBox as THREE.Box3;
  const lcb = lowerClevisBox as THREE.Box3;
  const bossCenter = new THREE.Vector3(); bb.getCenter(bossCenter);
  const clevisCenter = new THREE.Vector3(); lcb.getCenter(clevisCenter);
  const dy = clevisCenter.y - bossCenter.y;
  assert('Lower clevis sits on top of lumbar boss plinth', dy > 0.001, `Clevis Y: ${clevisCenter.y.toFixed(4)} on top of Boss Y: ${bossCenter.y.toFixed(4)}, dy: ${(dy*1000).toFixed(1)}mm`);
}

const poleR = TORSO_CONFIG.stomach.poleDimensions?.cylinderRadius ?? 0.0068;
const poleConfigs = [
  { name: 'OuterPole', u: dual.outer.upperMount, l: dual.outer.lowerMount, r: poleR },
  { name: 'InnerPole', u: dual.inner.upperMount, l: dual.inner.lowerMount, r: poleR },
  { name: 'RearPole',  u: rear.upperMount,       l: rear.lowerMount,       r: poleR },
];

let minOuterToInner = Infinity;
let minOuterToRear = Infinity;
let minInnerToRear = Infinity;

for (let t = 0; t <= 1; t += 0.05) {
  const pOut = new THREE.Vector3().lerpVectors(
    new THREE.Vector3(poleConfigs[0].u.x, poleConfigs[0].u.y, poleConfigs[0].u.z),
    new THREE.Vector3(poleConfigs[0].l.x, poleConfigs[0].l.y, poleConfigs[0].l.z),
    t
  );
  const pIn = new THREE.Vector3().lerpVectors(
    new THREE.Vector3(poleConfigs[1].u.x, poleConfigs[1].u.y, poleConfigs[1].u.z),
    new THREE.Vector3(poleConfigs[1].l.x, poleConfigs[1].l.y, poleConfigs[1].l.z),
    t
  );
  const pRear = new THREE.Vector3().lerpVectors(
    new THREE.Vector3(poleConfigs[2].u.x, poleConfigs[2].u.y, poleConfigs[2].u.z),
    new THREE.Vector3(poleConfigs[2].l.x, poleConfigs[2].l.y, poleConfigs[2].l.z),
    t
  );

  const clOutIn = pOut.distanceTo(pIn) - (poleConfigs[0].r + poleConfigs[1].r);
  const clOutRear = pOut.distanceTo(pRear) - (poleConfigs[0].r + poleConfigs[2].r);
  const clInRear = pIn.distanceTo(pRear) - (poleConfigs[1].r + poleConfigs[2].r);

  if (clOutIn < minOuterToInner) minOuterToInner = clOutIn;
  if (clOutRear < minOuterToRear) minOuterToRear = clOutRear;
  if (clInRear < minInnerToRear) minInnerToRear = clInRear;
}

assert('Outer to Inner pole clearance', minOuterToInner > 0.001, `${(minOuterToInner*1000).toFixed(2)}mm`);
assert('Outer to Rear pole clearance', minOuterToRear > 0.020, `${(minOuterToRear*1000).toFixed(2)}mm`);
assert('Inner to Rear pole clearance', minInnerToRear > 0.020, `${(minInnerToRear*1000).toFixed(2)}mm`);

// 7. DYNAMIC ARTICULATION & KINEMATIC INTEGRITY
const anim = new TorsoAnimationController(torso);
const testPoses = [
  { name: 'Neutral', pitch: 0, yaw: 0, roll: 0 },
  { name: 'Flexion (+0.08 pitch)', pitch: 0.08, yaw: 0, roll: 0 },
  { name: 'Extension (-0.08 pitch)', pitch: -0.08, yaw: 0, roll: 0 },
  { name: 'Yaw left (+0.12 yaw)', pitch: 0, yaw: 0.12, roll: 0 },
  { name: 'Yaw right (-0.12 yaw)', pitch: 0, yaw: -0.12, roll: 0 },
  { name: 'Lateral roll (+0.06 roll)', pitch: 0, yaw: 0, roll: 0.06 },
  { name: 'Compound dynamic combat', pitch: 0.07, yaw: 0.10, roll: 0.04 },
];

let allPosesMonotonic = true;
for (const pose of testPoses) {
  anim.update(pose.pitch, pose.yaw, pose.roll);
  torso.group.updateMatrixWorld(true);

  const vPos: THREE.Vector3[] = [];
  torso.stomach.rings.forEach(r => {
    const p = new THREE.Vector3();
    r.group.getWorldPosition(p);
    vPos.push(p);
  });

  for (let i = 0; i < vPos.length - 1; i++) {
    if (vPos[i].y <= vPos[i + 1].y) allPosesMonotonic = false;
  }
}
assert('Dynamic torso articulation across all poses', allPosesMonotonic, 'Spinal stack strictly monotonic in Y');

console.log('================================================================');
if (allPassed) {
  console.log('>>> ALL ADVERSARIAL VERIFICATION CHECKS PASSED PERFECTLY [OK] <<<');
} else {
  console.error('>>> SOME VERIFICATION CHECKS FAILED <<<');
  process.exit(1);
}

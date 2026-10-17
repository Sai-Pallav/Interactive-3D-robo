import * as THREE from 'three';
import { createProceduralRobot } from '../src/robot/robot/RobotProceduralFactory.ts';
import { LEG_CONFIG } from '../src/robot/leg/LegConfig.ts';
import { LegAnimationController } from '../src/robot/leg/LegAnimationController.ts';

const robot = createProceduralRobot();
robot.root.updateMatrixWorld(true);

const controller = new LegAnimationController(robot.leftLegNodes, robot.rightLegNodes);

let errors = [];
let warnings = [];

function check(label, cond, msg) {
  if (!cond) {
    errors.push(`[${label}] ${msg}`);
    console.error(`❌ [${label}] ${msg}`);
  } else {
    console.log(`✓ [${label}] OK`);
  }
}

function warn(label, cond, msg) {
  if (!cond) {
    warnings.push(`[${label}] ${msg}`);
    console.warn(`⚠️ [${label}] ${msg}`);
  } else {
    console.log(`✓ [${label}] OK`);
  }
}

console.log('=== COMPREHENSIVE KINEMATIC & CLEARANCE AUDIT ===\n');

// -------------------------------------------------------------
// 1. Static Clearances
// -------------------------------------------------------------
console.log('--- 1. Static Clearances ---');
const thighAnt = robot.leftLegNodes.thigh.anteriorArmor;
const patella = robot.leftLegNodes.knee.patellaShield;
const shinKeel = robot.leftLegNodes.shin.anteriorKeelArmor;
const thighLat = robot.leftLegNodes.thigh.lateralArmor;
const thighMed = robot.leftLegNodes.thigh.medialArmor;
const kneeLatDisc = robot.leftLegNodes.knee.lateralDisc;
const kneeMedDisc = robot.leftLegNodes.knee.medialDisc;
const thighHam = robot.leftLegNodes.thigh.posteriorPlate;
const calfArmor = robot.leftLegNodes.shin.posteriorCalfArmor;
const trochHood = robot.leftLegNodes.thigh.trochanterHood;

const bAnt = new THREE.Box3().setFromObject(thighAnt);
const bPat = new THREE.Box3().setFromObject(patella);
const bKeel = new THREE.Box3().setFromObject(shinKeel);
const bLat = new THREE.Box3().setFromObject(thighLat);
const bMed = new THREE.Box3().setFromObject(thighMed);
const bLatDisc = new THREE.Box3().setFromObject(kneeLatDisc);
const bMedDisc = new THREE.Box3().setFromObject(kneeMedDisc);
const bHam = new THREE.Box3().setFromObject(thighHam);
const bCalf = new THREE.Box3().setFromObject(calfArmor);
const bTroch = new THREE.Box3().setFromObject(trochHood);

const antToPatGap = (bAnt.min.y - bPat.max.y) * 1000;
console.log(`Thigh Anterior to Patella gap: ${antToPatGap.toFixed(2)} mm`);
check('ThighAnt-Patella', antToPatGap >= 3.0 && antToPatGap <= 8.0, `Gap is ${antToPatGap.toFixed(2)} mm (expected 3-8 mm)`);

const patToKeelGap = (bPat.min.y - bKeel.max.y) * 1000;
console.log(`Patella to Shin Keel gap: ${patToKeelGap.toFixed(2)} mm`);
check('Patella-ShinKeel', patToKeelGap >= 2.0, `Gap is ${patToKeelGap.toFixed(2)} mm (expected >= 2 mm)`);

const latToDiscGap = (bLat.min.y - bLatDisc.max.y) * 1000;
console.log(`Thigh Lateral to Disc gap: ${latToDiscGap.toFixed(2)} mm`);
check('ThighLat-Disc', latToDiscGap >= 2.0, `Gap is ${latToDiscGap.toFixed(2)} mm (expected >= 2 mm)`);

const medToDiscGap = (bMed.min.y - bMedDisc.max.y) * 1000;
console.log(`Thigh Medial to Disc gap: ${medToDiscGap.toFixed(2)} mm`);
check('ThighMed-Disc', medToDiscGap >= 1.5, `Gap is ${medToDiscGap.toFixed(2)} mm (expected >= 1.5 mm)`);

// Trochanter hood overlap with thigh anterior armor (should overlap cleanly without large vertical gap or deep clipping)
const trochToAntOverlap = (bTroch.min.y - bAnt.max.y) * 1000;
console.log(`Trochanter bottom Y vs Thigh Anterior top Y (negative means overlap): ${trochToAntOverlap.toFixed(2)} mm`);
check('Troch-ThighAnt-Overlap', trochToAntOverlap < 0 && trochToAntOverlap > -30, `Overlap is ${trochToAntOverlap.toFixed(2)} mm (expected 5-30 mm overlap)`);

// -------------------------------------------------------------
// 2. Ankle Damper Stroke & Range of Motion
// -------------------------------------------------------------
console.log('\n--- 2. Ankle Range of Motion & Damper Integrity ---');
const aCfg = LEG_CONFIG.ankle.achillesDamper;
const cylGeo = robot.leftLegNodes.ankle.achillesDamper.cylinder.geometry;
const pistGeo = robot.leftLegNodes.ankle.achillesDamper.piston.geometry;
cylGeo.computeBoundingBox();
pistGeo.computeBoundingBox();
const cylLen = cylGeo.boundingBox.max.y - cylGeo.boundingBox.min.y;
const pistLen = pistGeo.boundingBox.max.y - pistGeo.boundingBox.min.y;

function getDamperSpan(leg) {
  const aStart = new THREE.Vector3(0, aCfg.mountY, aCfg.mountZ);
  const tempTargetLocal = new THREE.Vector3(0, aCfg.targetY - (-0.016), aCfg.targetZ);
  leg.ankle.footPivot.localToWorld(tempTargetLocal);
  leg.ankle.group.worldToLocal(tempTargetLocal);
  return tempTargetLocal.distanceTo(aStart);
}

const anklePitchLimits = [
  LEG_CONFIG.limits.ankle.pitchMin, // Dorsiflexion (-0.45 rad)
  0,                                // Neutral
  LEG_CONFIG.limits.ankle.pitchMax  // Plantarflexion (+0.60 rad)
];

for (const ap of anklePitchLimits) {
  controller.setLeftLegPose({ anklePitch: ap });
  controller.update(0.016);
  robot.root.updateMatrixWorld(true);
  const span = getDamperSpan(robot.leftLegNodes);
  const overlap = (cylLen + pistLen - span) * 1000;
  console.log(`Ankle Pitch ${ap.toFixed(2)} rad: Damper span = ${(span * 1000).toFixed(2)} mm (Overlap = ${overlap.toFixed(2)} mm)`);
  check(`Damper @ pitch ${ap.toFixed(2)}`, span <= cylLen + pistLen, `Damper disengaged at pitch ${ap}! Span ${span*1000}mm > total length ${(cylLen+pistLen)*1000}mm`);
  warn(`Damper bottom-out @ pitch ${ap.toFixed(2)}`, span >= cylLen, `Piston bottoms out at pitch ${ap}! Span ${span*1000}mm < cylinder ${cylLen*1000}mm`);
}

// -------------------------------------------------------------
// 3. Knee Kinematic Arc
// -------------------------------------------------------------
console.log('\n--- 3. Knee Kinematic Arc ---');
controller.clearOverrides();

const kneePitchAngles = [
  LEG_CONFIG.limits.knee.pitchMin, // -0.05 rad
  0,
  0.5,
  1.0,
  1.5,
  LEG_CONFIG.limits.knee.pitchMax  // 2.10 rad
];

for (const kp of kneePitchAngles) {
  controller.setLeftLegPose({ kneePitch: kp });
  controller.update(0.016);
  robot.root.updateMatrixWorld(true);

  // Check if shin anterior keel collides into knee patella shield
  const curBPat = new THREE.Box3().setFromObject(robot.leftLegNodes.knee.patellaShield);
  const curBKeel = new THREE.Box3().setFromObject(robot.leftLegNodes.shin.anteriorKeelArmor);

  // When flexed, shin rotates backwards, so patella stays in front.
  // But at slight extension (pitchMin = -0.05), does keel hit patella?
  const intersects = curBPat.intersectsBox(curBKeel);
  console.log(`Knee Pitch ${kp.toFixed(2)} rad: Box intersect with patella? ${intersects}`);
  if (kp <= 0.1) {
    check(`KneePitch-${kp.toFixed(2)}-NoClip`, !intersects, `Knee Patella Shield intersects Shin Keel at kneePitch ${kp.toFixed(2)}!`);
  }
}

// -------------------------------------------------------------
// 4. Exploded View Integrity
// -------------------------------------------------------------
console.log('\n--- 4. Exploded View Integrity ---');
controller.clearOverrides();

const progressSteps = [0.0, 0.25, 0.5, 0.75, 1.0];
for (const p of progressSteps) {
  controller.setExplodedProgress(p);
  robot.root.updateMatrixWorld(true);

  const span = getDamperSpan(robot.leftLegNodes);
  console.log(`Exploded progress ${p.toFixed(2)}: Damper span = ${(span * 1000).toFixed(2)} mm`);
  check(`Exploded-${p.toFixed(2)}-Damper`, span <= cylLen + pistLen + 0.005, `Damper overstretched in exploded view: ${(span * 1000).toFixed(2)} mm`);
}

// Reset exploded
controller.setExplodedProgress(0.0);
robot.root.updateMatrixWorld(true);

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log('\n================================================');
console.log(`AUDIT SUMMARY: ${errors.length} errors, ${warnings.length} warnings`);
console.log('================================================');
if (errors.length > 0) {
  console.error('Errors found:\n' + errors.join('\n'));
  process.exit(1);
} else {
  console.log('All kinematic and clearance tests passed successfully!');
}

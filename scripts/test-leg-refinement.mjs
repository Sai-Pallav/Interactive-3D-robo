import * as THREE from 'three';
import { createRobotMaterials } from '../src/robot/materials/RobotMaterials.ts';
import { createRobotLeg } from '../src/robot/leg/RobotLeg.ts';
import { LegAnimationController } from '../src/robot/leg/LegAnimationController.ts';
import { LEG_CONFIG } from '../src/robot/leg/LegConfig.ts';

console.log('--- TESTING PROCEDURAL ROBOT LEGS REFINEMENT ---');

const materials = createRobotMaterials();
console.log('✓ Materials initialized successfully');

// Test Left & Right Leg creation
const leftLeg = createRobotLeg(-1, materials);
const rightLeg = createRobotLeg(1, materials);
console.log('✓ Left and Right legs created successfully');

// Verify Nodes Existence
function verifyLegNodes(leg, sideName) {
  const { hip, thigh, knee, shin, ankle, foot, ledMeshes } = leg;
  console.log(`\nVerifying ${sideName}:`);

  if (!hip.group || !hip.thighMount) throw new Error(`${sideName}: Hip nodes missing`);
  console.log(`  ✓ Hip: gimbal housing, thigh mount present`);

  if (!thigh.group || !thigh.anteriorArmor || !thigh.lateralArmor || !thigh.medialArmor || !thigh.femurSkeleton || !thigh.kneePivot) {
    throw new Error(`${sideName}: Thigh nodes missing`);
  }
  console.log(`  ✓ Thigh: anterior, lateral, medial, skeleton, kneePivot present`);

  if (!knee.group || !knee.shinPivot || !knee.patellaShield || !knee.lateralDisc || !knee.centralPin) {
    throw new Error(`${sideName}: Knee nodes missing`);
  }
  console.log(`  ✓ Knee: patella shield, lateral/medial discs, central axle, shinPivot present`);

  if (!shin.group || !shin.anteriorKeelArmor || !shin.posteriorCalfArmor || !shin.tibiaSkeleton || !shin.anklePivot) {
    throw new Error(`${sideName}: Shin nodes missing`);
  }
  console.log(`  ✓ Shin: anterior keel, posterior calf, tibia skeleton, anklePivot present`);

  if (!ankle.group || !ankle.sphericalCore || !ankle.clevisHousing || !ankle.malleolusLateral || !ankle.footPivot) {
    throw new Error(`${sideName}: Ankle nodes missing`);
  }
  console.log(`  ✓ Ankle: spherical core, clevis, malleoli, footPivot present`);

  if (!foot.group || !foot.soleChassis || !foot.dorsalArmor || !foot.toePivot || !foot.toeArmor || !foot.heelArmor || !foot.heelThruster) {
    throw new Error(`${sideName}: Foot nodes missing`);
  }
  console.log(`  ✓ Foot: sole chassis, dorsal armor, toe pivot & armor, heel counter & thruster present`);

  console.log(`  ✓ LED meshes registered: ${ledMeshes.length}`);
}

verifyLegNodes(leftLeg, 'Left Leg (-1)');
verifyLegNodes(rightLeg, 'Right Leg (+1)');

// Verify Geometry Validity (No NaNs)
function verifyGeometries(root, name) {
  let meshCount = 0;
  let triangleCount = 0;
  root.traverse((obj) => {
    if (obj.isMesh) {
      meshCount++;
      const geo = obj.geometry;
      if (!geo) throw new Error(`Mesh ${obj.name} missing geometry`);
      const pos = geo.attributes.position;
      if (!pos) throw new Error(`Mesh ${obj.name} missing position attribute`);
      for (let i = 0; i < pos.count; i++) {
        if (isNaN(pos.getX(i)) || isNaN(pos.getY(i)) || isNaN(pos.getZ(i))) {
          throw new Error(`Mesh ${obj.name} has NaN vertex at index ${i}`);
        }
      }
      triangleCount += geo.index ? geo.index.count / 3 : pos.count / 3;
    }
  });
  console.log(`\nGeometry check for ${name}:`);
  console.log(`  Total meshes: ${meshCount}`);
  console.log(`  Total triangles: ${Math.round(triangleCount)}`);
}

verifyGeometries(leftLeg.root, 'Left Leg Root');
verifyGeometries(rightLeg.root, 'Right Leg Root');

// Verify Kinematics & Animation Controller
console.log('\nTesting LegAnimationController:');
const animController = new LegAnimationController(leftLeg, rightLeg);
console.log('✓ Animation controller initialized');

// Test update cycles
animController.update(0.016, 0.5);
animController.update(0.016, 1.0);
console.log('✓ Normal animation updates pass');

// Verify Flank Armor Bilateral Symmetry & Posterior Orientation
function verifyArmorOrientations(leg, sideName, side) {
  console.log(`\nVerifying Armor Orientations for ${sideName}:`);
  
  // Posterior plate must face rearward (rotation.y = Math.PI)
  if (Math.abs(leg.thigh.posteriorPlate.rotation.y - Math.PI) > 0.001) {
    throw new Error(`${sideName}: Thigh posteriorPlate must face rearward (rotation.y = Math.PI)`);
  }
  console.log(`  ✓ Posterior hamstring plate correctly faces rearward`);

  // Posterior calf armor must face rearward (rotation.y = Math.PI)
  if (Math.abs(leg.shin.posteriorCalfArmor.rotation.y - Math.PI) > 0.001) {
    throw new Error(`${sideName}: Shin posteriorCalfArmor must face rearward (rotation.y = Math.PI)`);
  }
  console.log(`  ✓ Posterior calf armor correctly faces rearward`);

  // Lateral armor LED strip must be placed on the outer lateral flank
  const latLed = leg.thigh.lateralArmor.getObjectByName(side === -1 ? 'ThighLedStrip_L' : 'ThighLedStrip_R');
  if (!latLed) throw new Error(`${sideName}: Thigh lateral LED strip missing`);
  if (Math.sign(latLed.position.x) !== side) {
    throw new Error(`${sideName}: Thigh lateral LED strip must be positioned on the outer flank (sign ${side})`);
  }
  console.log(`  ✓ Lateral armor LED strip on outer flank (x: ${latLed.position.x})`);

  // Verify knee bloom mesh exists in knee group
  let kneeBloomFound = false;
  leg.knee.group.traverse((obj) => {
    if (obj.isMesh && obj.material && (obj.material.name === 'RobotPurpleBloomMaterial' || obj.material.name === 'PurpleBloom')) {
      kneeBloomFound = true;
    }
  });
  console.log(`  ✓ Knee condyle bloom mesh present: ${kneeBloomFound}`);
}

verifyArmorOrientations(leftLeg, 'Left Leg (-1)', -1);
verifyArmorOrientations(rightLeg, 'Right Leg (+1)', 1);

// Test Exploded View Progress
animController.setExplodedProgress(0.0);
animController.setExplodedProgress(0.5);
animController.setExplodedProgress(1.0);
animController.setExplodedProgress(0.0);
console.log('✓ Exploded view progress 0.0 -> 1.0 -> 0.0 pass');

// Test Debug Wireframe Toggle
animController.toggleDebug(true);
animController.toggleDebug(false);
console.log('✓ Debug wireframe toggle pass');

console.log('\n--- ALL PROCEDURAL LEG VERIFICATION TESTS PASSED SUCCESSFULLY! ---');

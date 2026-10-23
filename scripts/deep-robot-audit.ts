import * as THREE from 'three';
import { createProceduralRobot } from '../src/robot/robot/RobotProceduralFactory';
import { RobotController } from '../src/robot/robot/RobotController';

console.log('====================================================');
console.log('   COMPREHENSIVE AUTONOMOUS ROBOT AUDIT & DIAGNOSTIC');
console.log('====================================================\n');

const robot = createProceduralRobot();
robot.root.rotation.set(0, 0, 0); // Neutral alignment for audit
robot.root.updateMatrixWorld(true);

const issues: { severity: string; component: string; message: string; details?: any }[] = [];

// 1. Traverse all objects and check geometries for NaNs, bounding box validity, etc.
let totalMeshes = 0;
let totalVertices = 0;
let totalTriangles = 0;
const meshMap = new Map<string, THREE.Mesh>();

robot.root.traverse((obj) => {
  if (obj instanceof THREE.Mesh) {
    totalMeshes++;
    if (obj.name) {
      meshMap.set(obj.name, obj);
    }
    const geo = obj.geometry;
    if (!geo) {
      issues.push({ severity: 'Fatal', component: obj.name || 'UnnamedMesh', message: 'Mesh missing geometry' });
      return;
    }
    const pos = geo.attributes.position;
    if (!pos) {
      issues.push({ severity: 'Fatal', component: obj.name || 'UnnamedMesh', message: 'Geometry missing position attribute' });
      return;
    }
    totalVertices += pos.count;
    totalTriangles += geo.index ? geo.index.count / 3 : pos.count / 3;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (isNaN(x) || isNaN(y) || isNaN(z)) {
        issues.push({ severity: 'Fatal', component: obj.name || 'UnnamedMesh', message: `Position attribute contains NaN at index ${i}` });
        break;
      }
    }

    // Check scales
    if (obj.scale.x === 0 || obj.scale.y === 0 || obj.scale.z === 0) {
      issues.push({ severity: 'Warning', component: obj.name || 'UnnamedMesh', message: `Mesh has zero scale: [${obj.scale.x}, ${obj.scale.y}, ${obj.scale.z}]` });
    }
  }
});

console.log(`Audited ${totalMeshes} meshes, ${totalVertices} vertices, ${Math.round(totalTriangles)} triangles.\n`);

// 2. Audit Symmetry across Left & Right Assemblies
console.log('--- AUDITING BILATERAL SYMMETRY ---');
const symmetricPairs: [string, string][] = [
  // Shoulders
  ['LeftShoulderFoundation', 'RightShoulderFoundation'],
  ['LeftMountingFrame', 'RightMountingFrame'],
  ['LeftUpperShoulderShell', 'RightUpperShoulderShell'],
  ['LeftInnerCavityWalls', 'RightInnerCavityWalls'],
  ['LeftCavityBackplate', 'RightCavityBackplate'],
  ['LeftArmMount', 'RightArmMount'],
  ['LeftShoulderArmAdapter', 'RightShoulderArmAdapter'],
  ['BearingHousingGroup_L', 'BearingHousingGroup_R'],
  ['PrimaryHubGroup_L', 'PrimaryHubGroup_R'],
  ['ShoulderEnergyRing_L', 'ShoulderEnergyRing_R'],
  // Arms
  ['LeftUpperArmBody', 'RightUpperArmBody'],
  ['LeftForearmMain', 'RightForearmMain'],
  ['LeftElbowJoint', 'RightElbowJoint'],
  // Legs
  ['LeftThighCore', 'RightThighCore'],
  ['LeftKneeJoint', 'RightKneeJoint'],
  ['LeftShinBone', 'RightShinBone'],
  ['LeftAnkleJoint', 'RightAnkleJoint'],
  ['LeftFootMain', 'RightFootMain'],
  // Rear Thoracic Wishbones
  ['RearShoulderBrace_L', 'RearShoulderBrace_R'],
];

for (const [leftName, rightName] of symmetricPairs) {
  const leftObj = meshMap.get(leftName) || robot.root.getObjectByName(leftName);
  const rightObj = meshMap.get(rightName) || robot.root.getObjectByName(rightName);

  if (!leftObj) {
    issues.push({ severity: 'Missing', component: leftName, message: 'Component not found in hierarchy' });
    continue;
  }
  if (!rightObj) {
    issues.push({ severity: 'Missing', component: rightName, message: 'Component not found in hierarchy' });
    continue;
  }

  const leftWPos = new THREE.Vector3();
  const rightWPos = new THREE.Vector3();
  leftObj.getWorldPosition(leftWPos);
  rightObj.getWorldPosition(rightWPos);

  const leftBox = new THREE.Box3().setFromObject(leftObj);
  const rightBox = new THREE.Box3().setFromObject(rightObj);
  const leftSize = leftBox.getSize(new THREE.Vector3());
  const rightSize = rightBox.getSize(new THREE.Vector3());
  const leftCenter = leftBox.getCenter(new THREE.Vector3());
  const rightCenter = rightBox.getCenter(new THREE.Vector3());

  // Check X symmetry (right X should be approximately -left X)
  const xDiff = Math.abs(rightWPos.x - (-leftWPos.x));
  const yDiff = Math.abs(rightWPos.y - leftWPos.y);
  const zDiff = Math.abs(rightWPos.z - leftWPos.z);

  const centerXDiff = Math.abs(rightCenter.x - (-leftCenter.x));
  const centerYDiff = Math.abs(rightCenter.y - leftCenter.y);
  const centerZDiff = Math.abs(rightCenter.z - leftCenter.z);

  const widthDiff = Math.abs(rightSize.x - leftSize.x);
  const heightDiff = Math.abs(rightSize.y - leftSize.y);
  const depthDiff = Math.abs(rightSize.z - leftSize.z);

  if (xDiff > 0.005 || yDiff > 0.005 || zDiff > 0.005) {
    issues.push({
      severity: 'SymmetryDefect',
      component: `${leftName} vs ${rightName}`,
      message: `World position asymmetry: L=[${leftWPos.x.toFixed(4)}, ${leftWPos.y.toFixed(4)}, ${leftWPos.z.toFixed(4)}] R=[${rightWPos.x.toFixed(4)}, ${rightWPos.y.toFixed(4)}, ${rightWPos.z.toFixed(4)}] (dY=${(yDiff*1000).toFixed(1)}mm, dZ=${(zDiff*1000).toFixed(1)}mm)`,
    });
  } else if (centerYDiff > 0.008 || centerZDiff > 0.008) {
    issues.push({
      severity: 'BoundingCenterAsymmetry',
      component: `${leftName} vs ${rightName}`,
      message: `Bounding center asymmetry: L=[${leftCenter.x.toFixed(4)}, ${leftCenter.y.toFixed(4)}, ${leftCenter.z.toFixed(4)}] R=[${rightCenter.x.toFixed(4)}, ${rightCenter.y.toFixed(4)}, ${rightCenter.z.toFixed(4)}] (dY=${(centerYDiff*1000).toFixed(1)}mm, dZ=${(centerZDiff*1000).toFixed(1)}mm)`,
    });
  }

  if (widthDiff > 0.010 || heightDiff > 0.010 || depthDiff > 0.010) {
    issues.push({
      severity: 'SizeAsymmetry',
      component: `${leftName} vs ${rightName}`,
      message: `Bounding size discrepancy: L=[${leftSize.x.toFixed(4)}, ${leftSize.y.toFixed(4)}, ${leftSize.z.toFixed(4)}] R=[${rightSize.x.toFixed(4)}, ${rightSize.y.toFixed(4)}, ${rightSize.z.toFixed(4)}]`,
    });
  }
}

// 3. Inspect Specific Assemblies and Mounting Interfaces
console.log('\n--- AUDITING MOUNTING INTERFACES & CONNECTIONS ---');

// 3A. Head & Neck seating
const neck = robot.neck;
const head = robot.head;
const upperTorso = robot.torsoNodes?.upperTorsoFrame.group;
if (neck && upperTorso) {
  const neckWPos = new THREE.Vector3();
  neck.getWorldPosition(neckWPos);
  console.log(`Neck world position: [${neckWPos.x.toFixed(4)}, ${neckWPos.y.toFixed(4)}, ${neckWPos.z.toFixed(4)}]`);
}

// 3B. Abdomen Actuator Poles & Struts
const tConfig = robot.torsoNodes;
if (tConfig) {
  console.log(`Torso nodes verified: stomach rings count = ${tConfig.stomach.rings.length}`);
}

// 3C. Shoulder to Arm connection
for (const side of [-1, 1] as const) {
  const sideStr = side === -1 ? 'Left' : 'Right';
  const foundation = robot.root.getObjectByName(`${sideStr}ShoulderFoundation`);
  const armMount = robot.root.getObjectByName(`${sideStr}ArmMount`);
  const armRoot = robot.root.getObjectByName(`${sideStr}RobotArmRoot`);
  const armAdapter = robot.root.getObjectByName(`${sideStr}ShoulderArmAdapter`);
  const mountingFrame = robot.root.getObjectByName(`${sideStr}MountingFrame`);

  if (foundation && armMount && armRoot) {
    const fPos = new THREE.Vector3();
    const mPos = new THREE.Vector3();
    const rPos = new THREE.Vector3();
    const aPos = new THREE.Vector3();
    const mfPos = new THREE.Vector3();

    foundation.getWorldPosition(fPos);
    armMount.getWorldPosition(mPos);
    armRoot.getWorldPosition(rPos);
    if (armAdapter) armAdapter.getWorldPosition(aPos);
    if (mountingFrame) mountingFrame.getWorldPosition(mfPos);

    console.log(`\n${sideStr} Shoulder-Arm Interface:`);
    console.log(`  MountingFrame WPos: [${mfPos.x.toFixed(4)}, ${mfPos.y.toFixed(4)}, ${mfPos.z.toFixed(4)}]`);
    console.log(`  Foundation    WPos: [${fPos.x.toFixed(4)}, ${fPos.y.toFixed(4)}, ${fPos.z.toFixed(4)}]`);
    console.log(`  ArmMount      WPos: [${mPos.x.toFixed(4)}, ${mPos.y.toFixed(4)}, ${mPos.z.toFixed(4)}]`);
    console.log(`  ArmRoot       WPos: [${rPos.x.toFixed(4)}, ${rPos.y.toFixed(4)}, ${rPos.z.toFixed(4)}]`);
    if (armAdapter) console.log(`  ArmAdapter    WPos: [${aPos.x.toFixed(4)}, ${aPos.y.toFixed(4)}, ${aPos.z.toFixed(4)}]`);

    // Check distance between MountingFrame and Foundation
    const frameToFoundDistZ = Math.abs(mfPos.z - fPos.z);
    const frameToFoundDistY = Math.abs(mfPos.y - fPos.y);
    console.log(`  Frame-to-Foundation dZ: ${(frameToFoundDistZ * 1000).toFixed(1)} mm, dY: ${(frameToFoundDistY * 1000).toFixed(1)} mm`);
    if (frameToFoundDistZ > 0.005) {
      issues.push({
        severity: 'AlignmentWarning',
        component: `${sideStr} Shoulder Mounting Alignment`,
        message: `Mounting frame Z (${mfPos.z.toFixed(4)}) and shoulder foundation Z (${fPos.z.toFixed(4)}) differ by ${(frameToFoundDistZ*1000).toFixed(1)} mm`,
      });
    }
  }
}

// 3D. Check for Floating Meshes (distance from parent or root center)
console.log('\n--- AUDITING ALL REGISTERED OBJECTS FOR UNCONNECTED OR FLOATING MESHES ---');
robot.root.traverse((obj) => {
  if (obj instanceof THREE.Mesh) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    if (size.length() < 0.0001) {
      issues.push({
        severity: 'DegenerateMesh',
        component: obj.name || 'UnnamedMesh',
        message: `Zero bounding size mesh found: length = ${size.length()}`,
      });
    }
    const center = box.getCenter(new THREE.Vector3());
    if (Math.abs(center.x) > 1.0 || Math.abs(center.y) > 1.5 || Math.abs(center.z) > 1.0) {
      issues.push({
        severity: 'OutlierPosition',
        component: obj.name || 'UnnamedMesh',
        message: `Outlier world center: [${center.x.toFixed(3)}, ${center.y.toFixed(3)}, ${center.z.toFixed(3)}]`,
      });
    }
  }
});

// 4. Test Animation & Dynamic Articulation
console.log('\n--- TESTING KINEMATIC ARTICULATION & CONTROLLERS ---');
const robotController = new RobotController(robot as any);
console.log('Testing animation tick with 60 frames (1 second)...');
for (let f = 0; f < 60; f++) {
  robotController.update(1 / 60);
  const p = robot.root.position;
  if (isNaN(p.x) || isNaN(p.y) || isNaN(p.z)) {
    issues.push({ severity: 'Fatal', component: 'AnimationLoop', message: `Root position became NaN during update at frame ${f}` });
    break;
  }
}

// Test Exploded View expansion
console.log('Testing exploded view animation with torso, arm, leg sub-controllers...');
const torsoCtrl = robotController.getTorsoController();
const armCtrl = robotController.getArmController();
const legCtrl = robotController.getLegController();

if (torsoCtrl && armCtrl && legCtrl) {
  torsoCtrl.toggleExplodedView();
  armCtrl.setExplodedView(true);
  legCtrl.setExplodedProgress(1.0);
  
  // Update frames for damping
  for (let f = 0; f < 30; f++) {
    robotController.update(1 / 60);
  }
  robot.root.updateMatrixWorld(true);

  // Check for NaNs
  let nanFound = false;
  robot.root.traverse((obj) => {
    if (obj instanceof THREE.Mesh && !nanFound) {
      const wPos = new THREE.Vector3();
      obj.getWorldPosition(wPos);
      if (isNaN(wPos.x) || isNaN(wPos.y) || isNaN(wPos.z)) {
        issues.push({ severity: 'Fatal', component: obj.name, message: `World position became NaN in exploded view` });
        nanFound = true;
      }
    }
  });

  // Reset exploded view
  torsoCtrl.toggleExplodedView();
  armCtrl.setExplodedView(false);
  legCtrl.setExplodedProgress(0);
  for (let f = 0; f < 30; f++) {
    robotController.update(1 / 60);
  }
  robot.root.updateMatrixWorld(true);
}

console.log('\n====================================================');
console.log(`AUDIT COMPLETE. Identified ${issues.length} issues.`);
console.log('====================================================');
for (const iss of issues) {
  console.log(`[${iss.severity}] ${iss.component}: ${iss.message}`);
}

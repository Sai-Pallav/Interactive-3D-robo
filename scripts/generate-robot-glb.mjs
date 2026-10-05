import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Polyfill FileReader for Node.js environment
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        if (this.onload) this.onload({ target: this });
        if (this.onloadend) this.onloadend({ target: this });
      });
    }
    readAsDataURL(blob) {
      blob.arrayBuffer().then((buf) => {
        const b64 = Buffer.from(buf).toString('base64');
        this.result = `data:${blob.type || 'application/octet-stream'};base64,${b64}`;
        if (this.onload) this.onload({ target: this });
        if (this.onloadend) this.onloadend({ target: this });
      });
    }
  };
}

// Ensure public/models directory exists
const publicModelsDir = path.resolve(__dirname, '../public/models');
if (!fs.existsSync(publicModelsDir)) {
  fs.mkdirSync(publicModelsDir, { recursive: true });
}

console.log('Generating procedural robot for GLB export...');

const root = new THREE.Group();
root.name = 'RobotRoot';
root.rotation.y = 0.44;

const armorMat = new THREE.MeshStandardMaterial({
  color: 0xf3f5fa,
  roughness: 0.16,
  metalness: 0.04,
  name: 'ArmorWhite',
});

const jointMat = new THREE.MeshStandardMaterial({
  color: 0x14161c,
  roughness: 0.32,
  metalness: 0.92,
  name: 'JointDark',
});

const visorMat = new THREE.MeshStandardMaterial({
  color: 0x03050a,
  roughness: 0.03,
  metalness: 0.15,
  name: 'VisorDark',
});

const eyeMat = new THREE.MeshStandardMaterial({
  color: 0xc084fc,
  emissive: 0xc084fc,
  emissiveIntensity: 4.0,
  name: 'EyeGlow',
});

const violetMat = new THREE.MeshStandardMaterial({
  color: 0xb388ff,
  emissive: 0xb388ff,
  emissiveIntensity: 4.0,
  name: 'VioletGlow',
});

// Torso
const torso = new THREE.Group();
torso.name = 'Torso';
torso.position.set(0, 0.82, 0);
root.add(torso);

const spineCore = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.10, 0.46, 24), jointMat);
spineCore.name = 'SpineCore';
torso.add(spineCore);

// Sculpted Breastplate
const chestPlateShape = new THREE.Shape();
chestPlateShape.moveTo(-0.19, 0.02);
chestPlateShape.bezierCurveTo(-0.21, -0.04, -0.19, -0.14, -0.14, -0.22);
chestPlateShape.bezierCurveTo(-0.10, -0.28, -0.05, -0.30, 0, -0.30);
chestPlateShape.bezierCurveTo(0.05, -0.30, 0.10, -0.28, 0.14, -0.22);
chestPlateShape.bezierCurveTo(0.19, -0.14, 0.21, -0.04, 0.19, 0.02);
chestPlateShape.bezierCurveTo(0.12, 0.02, 0.06, -0.04, 0, -0.06);
chestPlateShape.bezierCurveTo(-0.06, -0.04, -0.12, 0.02, -0.19, 0.02);

const chestPlateGeo = new THREE.ExtrudeGeometry(chestPlateShape, {
  steps: 2,
  depth: 0.12,
  bevelEnabled: true,
  bevelThickness: 0.04,
  bevelSize: 0.03,
  bevelSegments: 4,
});
chestPlateGeo.center();
const chestPlate = new THREE.Mesh(chestPlateGeo, armorMat);
chestPlate.position.set(0, -0.04, 0.07);
chestPlate.rotation.x = -0.12;
chestPlate.name = 'ChestArmorPlate';
torso.add(chestPlate);

// Chest 'A' Logo
const chestLogo = new THREE.Group();
chestLogo.name = 'ChestLogoA';
chestLogo.position.set(0, -0.04, 0.165);
chestLogo.rotation.x = -0.12;

const leftStroke = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.08, 12), violetMat);
leftStroke.position.set(-0.016, 0.004, 0.006);
leftStroke.rotation.z = 0.32;
chestLogo.add(leftStroke);

const rightStroke = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.08, 12), violetMat);
rightStroke.position.set(0.016, 0.004, 0.006);
rightStroke.rotation.z = -0.32;
chestLogo.add(rightStroke);

const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.034, 12), violetMat);
crossbar.rotation.z = Math.PI / 2;
crossbar.position.set(0, -0.006, 0.007);
chestLogo.add(crossbar);

torso.add(chestLogo);

// Neck
const neck = new THREE.Group();
neck.name = 'Neck';
neck.position.set(0, 0.20, -0.01);
torso.add(neck);

const neckCore = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.082, 0.22, 24), jointMat);
neckCore.name = 'NeckCore';
neckCore.position.set(0, 0.11, 0);
neck.add(neckCore);

for (let r = 0; r < 4; r++) {
  const vRing = new THREE.Mesh(new THREE.TorusGeometry(0.080, 0.011, 12, 24), jointMat);
  vRing.rotation.x = Math.PI / 2;
  vRing.position.set(0, 0.04 + r * 0.045, 0);
  neck.add(vRing);
}

// Head
const head = new THREE.Group();
head.name = 'Head';
head.position.set(0, 0.24, 0.01);
neck.add(head);

const skullDome = new THREE.Mesh(
  new THREE.SphereGeometry(0.22, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.48),
  armorMat
);
skullDome.position.set(0, 0.04, -0.01);
skullDome.scale.set(0.96, 1.08, 1.12);
skullDome.name = 'CranialDome';
head.add(skullDome);

const rearShell = new THREE.Mesh(
  new THREE.SphereGeometry(0.22, 32, 24, 0, Math.PI, Math.PI * 0.45, Math.PI * 0.45),
  armorMat
);
rearShell.rotation.y = Math.PI / 2;
rearShell.position.set(0, 0.04, -0.01);
rearShell.scale.set(1.12, 1.08, 0.96);
head.add(rearShell);

const visorArc = Math.PI * 0.88;
const visorStart = Math.PI / 2 - visorArc / 2;
const faceVisor = new THREE.Mesh(
  new THREE.SphereGeometry(0.225, 32, 24, visorStart, visorArc, Math.PI * 0.34, Math.PI * 0.38),
  visorMat
);
faceVisor.position.set(0, 0.03, -0.005);
faceVisor.scale.set(0.97, 1.08, 1.13);
faceVisor.name = 'FaceVisor';
head.add(faceVisor);

// Chin Guard
const jawShape = new THREE.Shape();
jawShape.moveTo(-0.09, 0.0);
jawShape.bezierCurveTo(-0.07, -0.04, -0.04, -0.07, 0, -0.08);
jawShape.bezierCurveTo(0.04, -0.07, 0.07, -0.04, 0.09, 0.0);
jawShape.bezierCurveTo(0.05, -0.015, -0.05, -0.015, -0.09, 0.0);

const jawGeo = new THREE.ExtrudeGeometry(jawShape, {
  depth: 0.06,
  bevelEnabled: true,
  bevelThickness: 0.02,
  bevelSize: 0.015,
  bevelSegments: 4,
});
jawGeo.center();
const jaw = new THREE.Mesh(jawGeo, armorMat);
jaw.position.set(0, -0.11, 0.12);
jaw.rotation.x = 0.02;
head.add(jaw);

// Eye Elements
const eyeTrackingGroup = new THREE.Group();
eyeTrackingGroup.name = 'EyeTrackingGroup';
eyeTrackingGroup.position.set(0, 0.035, 0.208);
head.add(eyeTrackingGroup);

const eyeLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.008, 20), eyeMat);
eyeLeft.name = 'EyeLeft';
eyeLeft.rotation.x = Math.PI / 2;
eyeLeft.position.set(-0.060, 0, 0.002);
eyeTrackingGroup.add(eyeLeft);

const eyeRight = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.008, 20), eyeMat);
eyeRight.name = 'EyeRight';
eyeRight.rotation.x = Math.PI / 2;
eyeRight.position.set(0.060, 0, 0.002);
eyeTrackingGroup.add(eyeRight);

const visorLightBar = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.22, 16), eyeMat);
visorLightBar.rotation.z = Math.PI / 2;
visorLightBar.name = 'VisorLightBar';
eyeTrackingGroup.add(visorLightBar);

// Ear Rings
for (const side of [-1, 1]) {
  const earGroup = new THREE.Group();
  earGroup.name = side === -1 ? 'EarModuleLeft' : 'EarModuleRight';
  earGroup.position.set(side * 0.208, 0.05, -0.01);
  earGroup.rotation.y = side * (Math.PI * 0.44);
  head.add(earGroup);

  const earBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.074, 0.026, 32), jointMat);
  earBezel.rotation.x = Math.PI / 2;
  earGroup.add(earBezel);

  const earGlow = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.011, 20, 36), violetMat);
  earGlow.name = side === -1 ? 'EarRingLeft' : 'EarRingRight';
  earGlow.position.set(0, 0, 0.016);
  earGroup.add(earGlow);
}

// Shoulders & Arms
const leftShoulder = new THREE.Group();
leftShoulder.name = 'LeftShoulder';
leftShoulder.position.set(-0.24, 0.06, -0.02);
torso.add(leftShoulder);

const rightShoulder = new THREE.Group();
rightShoulder.name = 'RightShoulder';
rightShoulder.position.set(0.24, 0.06, -0.02);
torso.add(rightShoulder);

for (const [shoulder, side, prefix] of [[leftShoulder, -1, 'Left'], [rightShoulder, 1, 'Right']]) {
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.070, 24, 20), jointMat);
  ball.name = `${prefix}ShoulderJoint`;
  shoulder.add(ball);

  const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.096, 24, 20, 0, Math.PI * 2, 0, Math.PI * 0.58), armorMat);
  pauldron.name = `${prefix}Pauldron`;
  pauldron.rotation.x = -0.06;
  pauldron.rotation.z = side * 0.20;
  pauldron.position.set(side * 0.018, 0.012, 0.002);
  pauldron.scale.set(0.90, 1.32, 1.08);
  shoulder.add(pauldron);

  // Black plate between white shell (pauldron) and rotational ring
  const sBlackPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.008, 28), jointMat);
  sBlackPlate.name = `${prefix}ShoulderBlackPlate`;
  sBlackPlate.rotation.z = Math.PI / 2;
  sBlackPlate.position.set(side * 0.058, 0, 0);
  shoulder.add(sBlackPlate);

  // Concentric shoulder accent ring (rotational joint)
  const sAccent = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.003, 12, 24), violetMat);
  sAccent.rotation.y = Math.PI / 2;
  sAccent.position.set(side * 0.065, 0, 0);
  shoulder.add(sAccent);

  const upperArm = new THREE.Group();
  upperArm.name = `${prefix}UpperArm`;
  shoulder.add(upperArm);

  // Upper Arm Rotational Joint Assembly
  const bicepRotationalRing = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.016, 24), jointMat);
  bicepRotationalRing.name = `${prefix}BicepRotationalRing`;
  bicepRotationalRing.position.set(side * 0.008, -0.006, 0.008);
  upperArm.add(bicepRotationalRing);

  const bicepPurpleLine = new THREE.Mesh(new THREE.TorusGeometry(0.039, 0.0016, 8, 24), violetMat);
  bicepPurpleLine.rotation.x = Math.PI / 2;
  bicepPurpleLine.position.set(side * 0.008, -0.006, 0.008);
  upperArm.add(bicepPurpleLine);

  // Black plate between white shell (bicep) and rotational ring
  const bicepBlackPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.040, 0.008, 24), jointMat);
  bicepBlackPlate.name = `${prefix}BicepBlackPlateBetweenShellAndRotational`;
  bicepBlackPlate.position.set(side * 0.008, -0.016, 0.008);
  upperArm.add(bicepBlackPlate);

  // Sculpted Bicep with Scalloped Arch Cutout (White shell)
  const bicepGeo = new THREE.CylinderGeometry(0.040, 0.035, 0.17, 24);
  const bicep = new THREE.Mesh(bicepGeo, armorMat);
  bicep.position.set(side * 0.008, -0.100, 0.008);
  upperArm.add(bicep);

  // Dual Elbow Rotational Discs with Purple Emissive Rings (Reference: ELBOW OVERVIEW)
  const elbow = new THREE.Group();
  elbow.name = `${prefix}Elbow`;
  elbow.position.set(0, -0.20, 0);
  upperArm.add(elbow);

  const hingePin = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.082, 16), jointMat);
  hingePin.rotation.z = Math.PI / 2;
  elbow.add(hingePin);

  for (const dSide of [-1, 1]) {
    const discGroup = new THREE.Group();
    discGroup.position.set(dSide * 0.038, 0, 0);
    elbow.add(discGroup);

    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.006, 24), jointMat);
    disc.rotation.z = Math.PI / 2;
    discGroup.add(disc);

    const purpleRing = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.0022, 8, 24), violetMat);
    purpleRing.rotation.y = Math.PI / 2;
    purpleRing.position.set(dSide * 0.0035, 0, 0);
    discGroup.add(purpleRing);
  }

  const forearm = new THREE.Group();
  forearm.name = `${prefix}Forearm`;
  forearm.position.set(0, 0, 0.005);
  elbow.add(forearm);

  const forePlate = new THREE.Mesh(new THREE.CylinderGeometry(0.049, 0.038, 0.17, 24), armorMat);
  forePlate.position.set(0, -0.090, 0.005);
  forearm.add(forePlate);

  const foreLed = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.12, 8), violetMat);
  foreLed.position.set(side * 0.048, -0.090, 0.006);
  forearm.add(foreLed);

  const hand = new THREE.Group();
  hand.name = `${prefix}Hand`;
  hand.position.set(0, -0.185, 0.008);
  forearm.add(hand);

  const handMesh = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.054, 0.020), jointMat);
  handMesh.position.set(0, -0.032, 0);
  hand.add(handMesh);

  const dorsalPlate = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.048, 0.008), armorMat);
  dorsalPlate.position.set(0, -0.030, 0.012);
  hand.add(dorsalPlate);

  const dorsalLed = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.032, 0.004), violetMat);
  dorsalLed.position.set(0, -0.030, 0.016);
  hand.add(dorsalLed);

  // Fingers and Thumb
  for (let f = 0; f < 4; f++) {
    const fX = (f - 1.5) * 0.012 * side;
    const fGroup = new THREE.Group();
    fGroup.position.set(fX, -0.058, 0.004);
    hand.add(fGroup);

    const fProx = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0040, 0.026, 10), jointMat);
    fProx.position.set(0, -0.013, 0);
    fGroup.add(fProx);

    const fArmor = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.020, 0.005), armorMat);
    fArmor.position.set(0, -0.013, 0.003);
    fGroup.add(fArmor);
  }

  // Thumb
  const thumbGroup = new THREE.Group();
  thumbGroup.position.set(-side * 0.024, -0.028, 0.006);
  thumbGroup.rotation.set(0.2, -side * 0.3, -side * 0.15);
  hand.add(thumbGroup);

  const tBall = new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 10), jointMat);
  thumbGroup.add(tBall);

  const tProx = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.0045, 0.024, 10), jointMat);
  tProx.position.set(0, -0.014, 0);
  thumbGroup.add(tProx);
}

const exporter = new GLTFExporter();
try {
  const gltf = await exporter.parseAsync(root, { binary: true });
  const glbPath = path.join(publicModelsDir, 'robot.glb');
  const buffer = Buffer.from(gltf);
  fs.writeFileSync(glbPath, buffer);
  console.log(`Successfully generated and exported refined GLB model: ${glbPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
} catch (error) {
  console.error('An error occurred while exporting GLB:', error);
  process.exit(1);
}

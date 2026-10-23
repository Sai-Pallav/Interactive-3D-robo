import fs from 'fs';

let code = fs.readFileSync('src/robot/arm/UpperArm.ts', 'utf8');

// 1. Cache key
code = code.replace(
  'const cacheKey = `UpperArm_Armor_${shellType}_${side}_v3`;',
  'const cacheKey = `UpperArm_Armor_${shellType}_${side}_v4`;'
);

// Normalize line endings for replacement
const normalize = s => s.replace(/\r\n/g, '\n');
let codeNorm = normalize(code);

// 2. evaluateSurface
const oldEval = normalize(`    let rx = radius * 0.98; // Slightly increased width multiplier (was 0.95, original was 1.0)
    let rz = radius * 0.98;

    // Anterior Facet Crowning & 45° Corner Chamfers
    if (shellType === 'primaryOuter') {
      if (cosA > 0.50) {
        // Central anterior facet: crowned curvature
        const tCenter = (cosA - 0.50) / 0.50;
        rz -= (1.0 - Math.pow(tCenter, 1.4) * 0.35) * 0.0020;

        // Distinct recessed vertical panel line / seam down the front
        if (cosA > 0.95 && Math.abs(sinA) < 0.10) {
          const tSeam = 1.0 - Math.abs(sinA) / 0.10;
          rz -= tSeam * 0.0014;
        }
      } else if (cosA > 0.12) {
        // Crisp 45° chamfered corner bevel connecting front and lateral faces
        const tChamfer = (cosA - 0.12) / 0.38;
        rx -= Math.sin(tChamfer * Math.PI) * 0.0020;
        rz -= (1.0 - tChamfer) * 0.0020;
      }
    }

    // Posterior Tricep Contour with Lateral Chamfer
    if (shellType === 'secondaryInner') {
      if (cosA < -0.42) {
        const tPost = (-cosA - 0.42) / 0.58;
        rz += Math.pow(tPost, 1.3) * 0.0024 * Math.sin(v * Math.PI * 0.85);
      } else if (cosA < 0) {
        const tChamfer = (-cosA) / 0.42;
        rx -= Math.sin(tChamfer * Math.PI) * 0.0014;
      }
    }

    // Distal Upper Elbow Transition: maintain clean seating clearance over internal clevis cuff (R=0.0342m)
    // Physical wall thickness is 0.0030m, so outer surface radius is maintained >= 0.0375m so inner wall (>= 0.0345m)
    // seals cleanly over the internal elbow mount and cuff without any cut-through or jagged clipping.
    if (v > 0.82) {
      const minOuter = 0.0375;
      rx = Math.max(rx, minOuter);
      rz = Math.max(rz, minOuter);
    }

    const rFactor = layer === 0 ? 1.0 : (1.0 - thickness / Math.max(rx, rz));`);

const newEval = normalize(`    let rx = radius * 0.98; // Slightly increased width multiplier (was 0.95, original was 1.0)
    let rz = radius * 0.98;

    // Smooth distal transition into the cylindrical elbow cuff interface (v > 0.82)
    // Seamlessly blends corner chamfers and crowns into a clean circular socket rim (R=0.0340m)
    // Eliminates any artificial outward step, ledge, or bulbous collar.
    const chamferBlend = v > 0.82 ? Math.max(0, 1.0 - (v - 0.82) / 0.18) : 1.0;
    if (v > 0.82) {
      const tDistal = (v - 0.82) / 0.18;
      rx = THREE.MathUtils.lerp(rx, 0.0340, tDistal);
      rz = THREE.MathUtils.lerp(rz, 0.0340, tDistal);
    }

    // Anterior Facet Crowning & 45° Corner Chamfers
    if (shellType === 'primaryOuter') {
      if (cosA > 0.50) {
        // Central anterior facet: crowned curvature
        const tCenter = (cosA - 0.50) / 0.50;
        rz -= (1.0 - Math.pow(tCenter, 1.4) * 0.35) * 0.0020 * chamferBlend;

        // Distinct recessed vertical panel line / seam down the front
        if (cosA > 0.95 && Math.abs(sinA) < 0.10) {
          const tSeam = 1.0 - Math.abs(sinA) / 0.10;
          rz -= tSeam * 0.0014 * chamferBlend;
        }
      } else if (cosA > 0.12) {
        // Crisp 45° chamfered corner bevel connecting front and lateral faces
        const tChamfer = (cosA - 0.12) / 0.38;
        rx -= Math.sin(tChamfer * Math.PI) * 0.0020 * chamferBlend;
        rz -= (1.0 - tChamfer) * 0.0020 * chamferBlend;
      }
    }

    // Posterior Tricep Contour with Lateral Chamfer
    if (shellType === 'secondaryInner') {
      if (cosA < -0.42) {
        const tPost = (-cosA - 0.42) / 0.58;
        rz += Math.pow(tPost, 1.3) * 0.0024 * Math.sin(v * Math.PI * 0.85) * chamferBlend;
      } else if (cosA < 0) {
        const tChamfer = (-cosA) / 0.42;
        rx -= Math.sin(tChamfer * Math.PI) * 0.0014 * chamferBlend;
      }
    }

    // Distal internal seating rebate: maintains clean clearance over internal elbow spigot/spar
    const effectiveThickness = v > 0.85 ? THREE.MathUtils.lerp(thickness, 0.0012, (v - 0.85) / 0.15) : thickness;
    const rFactor = layer === 0 ? 1.0 : (1.0 - effectiveThickness / Math.max(rx, rz));`);

if (!codeNorm.includes(oldEval)) {
  console.error('Failed to find oldEval block!');
  process.exit(1);
}

let replacedNorm = codeNorm.replace(oldEval, newEval);

// 3. distalElbowMount
const oldCuff = normalize(`  // Mating CNC docking cuff extending from Y = +0.0220m down to +0.0060m (meeting white armor at Y = -0.1920m)
  const clevisCuffGeo = geoCache.get('UpperArm_ClevisCuffGeo', () => new THREE.CylinderGeometry(0.0342, 0.0328, 0.016, 32));
  const elbowSocketCuff = new THREE.Mesh(clevisCuffGeo, materials.joint);
  elbowSocketCuff.name = 'UpperArmElbowSocketCuff';
  elbowSocketCuff.position.set(0, 0.0140, 0);
  elbowSocketCuff.castShadow = true;
  elbowSocketCuff.receiveShadow = true;
  distalElbowMount.add(elbowSocketCuff);

  // Compression gasket seal at Y = +0.0220m meeting the white ceramic armor with 0.000mm air gap
  const cuffGasketGeo = geoCache.get('UpperArm_CuffGasketGeo', () => {
    const g = new THREE.TorusGeometry(0.0341, 0.0008, 6, 36);
    g.rotateX(Math.PI / 2);
    return g;
  });
  const cuffGasket = new THREE.Mesh(cuffGasketGeo, materials.joint);
  cuffGasket.position.set(0, 0.0220, 0);
  distalElbowMount.add(cuffGasket);

  // Metallic reveal accent ring
  const cuffBezelGeo = geoCache.get('UpperArm_CuffBezelGeo', () => {
    const g = new THREE.TorusGeometry(0.0338, 0.0006, 6, 36);
    g.rotateX(Math.PI / 2);
    return g;
  });
  const cuffBezel = new THREE.Mesh(cuffBezelGeo, materials.metallic);
  cuffBezel.position.set(0, 0.0210, 0);
  distalElbowMount.add(cuffBezel);

  // 8 radial fasteners on the cuff face
  const cuffBoltGeo = geoCache.get('UpperArm_CuffBoltGeo', () => new THREE.CylinderGeometry(0.0008, 0.0008, 0.0016, 8));
  for (let b = 0; b < 8; b++) {
    const angle = (b / 8) * Math.PI * 2;
    const bolt = new THREE.Mesh(cuffBoltGeo, materials.metallic);
    bolt.position.set(Math.sin(angle) * 0.0318, 0.0140, Math.cos(angle) * 0.0318);
    distalElbowMount.add(bolt);
  }`);

const newCuff = normalize(`  // Mating CNC docking cuff extending from Y = +0.0215m down to +0.0055m (meeting white armor at Y = -0.1920m)
  const clevisCuffGeo = geoCache.get('UpperArm_ClevisCuffGeo_v4', () => new THREE.CylinderGeometry(0.0338, 0.0328, 0.016, 32));
  const elbowSocketCuff = new THREE.Mesh(clevisCuffGeo, materials.joint);
  elbowSocketCuff.name = 'UpperArmElbowSocketCuff';
  elbowSocketCuff.position.set(0, 0.0135, 0);
  elbowSocketCuff.castShadow = true;
  elbowSocketCuff.receiveShadow = true;
  distalElbowMount.add(elbowSocketCuff);

  // Compression gasket seal seated flush with the white ceramic armor rim (top reaches Y = +0.0220m)
  const cuffGasketGeo = geoCache.get('UpperArm_CuffGasketGeo_v4', () => {
    const g = new THREE.TorusGeometry(0.0337, 0.0007, 6, 36);
    g.rotateX(Math.PI / 2);
    return g;
  });
  const cuffGasket = new THREE.Mesh(cuffGasketGeo, materials.joint);
  cuffGasket.position.set(0, 0.0213, 0);
  distalElbowMount.add(cuffGasket);

  // Metallic reveal accent ring
  const cuffBezelGeo = geoCache.get('UpperArm_CuffBezelGeo_v4', () => {
    const g = new THREE.TorusGeometry(0.0335, 0.0005, 6, 36);
    g.rotateX(Math.PI / 2);
    return g;
  });
  const cuffBezel = new THREE.Mesh(cuffBezelGeo, materials.metallic);
  cuffBezel.position.set(0, 0.0204, 0);
  distalElbowMount.add(cuffBezel);

  // 8 radial fasteners on the cuff face
  const cuffBoltGeo = geoCache.get('UpperArm_CuffBoltGeo_v4', () => new THREE.CylinderGeometry(0.0008, 0.0008, 0.0016, 8));
  for (let b = 0; b < 8; b++) {
    const angle = (b / 8) * Math.PI * 2;
    const bolt = new THREE.Mesh(cuffBoltGeo, materials.metallic);
    bolt.position.set(Math.sin(angle) * 0.0315, 0.0135, Math.cos(angle) * 0.0315);
    distalElbowMount.add(bolt);
  }`);

if (!replacedNorm.includes(oldCuff)) {
  console.error('Failed to find oldCuff block!');
  process.exit(1);
}
replacedNorm = replacedNorm.replace(oldCuff, newCuff);

// 4. evalUpperArmZ & antSeamLower
const oldSeam = normalize(`  // Helper function to evaluate exact anterior armor surface Z at Y
  function evalUpperArmZ(y: number): number {
    const yTop = -0.042;
    const totalLength = 0.150;
    const v = (yTop - y) / totalLength;
    let radius = 0.0386 - 0.0044 * v + 0.0024 * Math.sin(Math.pow(v, 0.72) * Math.PI);
    if (v < 0.10) {
      const tTop = (0.10 - v) / 0.10;
      radius -= tTop * 0.0008;
    } else if (v > 0.88) {
      const tBot = (v - 0.88) / 0.12;
      radius -= tBot * 0.0012;
    }
    let rz = radius * 0.98;
    rz -= (1.0 - 0.35) * 0.0020;
    return rz;
  }`);

const newSeam = normalize(`  // Helper function to evaluate exact anterior armor surface Z at Y
  function evalUpperArmZ(y: number): number {
    const yTop = -0.042;
    const totalLength = 0.150;
    const v = (yTop - y) / totalLength;
    let radius = 0.0386 - 0.0044 * v + 0.0024 * Math.sin(Math.pow(v, 0.72) * Math.PI);
    if (v < 0.10) {
      const tTop = (0.10 - v) / 0.10;
      radius -= tTop * 0.0008;
    }
    let rz = radius * 0.98;
    if (v > 0.82) {
      const tDistal = (v - 0.82) / 0.18;
      rz = THREE.MathUtils.lerp(rz, 0.0340, tDistal);
    }
    const chamferBlend = v > 0.82 ? Math.max(0, 1.0 - (v - 0.82) / 0.18) : 1.0;
    rz -= (1.0 - 0.35) * 0.0020 * chamferBlend;
    return rz;
  }`);

if (!replacedNorm.includes(oldSeam)) {
  console.error('Failed to find oldSeam block!');
  process.exit(1);
}
replacedNorm = replacedNorm.replace(oldSeam, newSeam);

// Update antSeamLower cache key
replacedNorm = replacedNorm.replace(
  "'UpperArm_AntSeamLowerGeo'",
  "'UpperArm_AntSeamLowerGeo_v4'"
);

// Convert back to CRLF
const finalCode = replacedNorm.replace(/\n/g, '\r\n');
fs.writeFileSync('src/robot/arm/UpperArm.ts', finalCode, 'utf8');
console.log('Successfully updated src/robot/arm/UpperArm.ts');

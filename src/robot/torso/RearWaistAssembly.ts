import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { geoCache } from '../utils/GeometryCache';
import { TORSO_CONFIG } from './TorsoConfig';

export interface RearWaistAssemblyNodes {
  group: THREE.Group;
  bearingHousing: THREE.Mesh;
  sacralArmor: THREE.Mesh;
  sacralChassis: THREE.Mesh;
  posteriorHipBrackets: THREE.Group;
  serviceCover: THREE.Mesh;
  ledMeshes: THREE.Mesh[];
}

/**
 * REFINED REAR WAIST & PELVIC INTEGRATION ASSEMBLY
 * Senior Mechanical Robotics & Three.js Procedural Modeling Engineering
 *
 * 1. Centered Circular Waist Mechanism:
 *    - Perfectly aligned with the robot's vertical axis (z = -0.004)
 *    - Clearly separated dark titanium bearing housing ring with distinct visible thickness
 *    - Polished metallic rotational bearing raceway track nested cleanly in the housing
 *    - Symmetrical semicircular bolt circle with precision hex socket fasteners
 *    - Believable upper mounting points receiving the lumbar frame tie-bolts
 *    - Structural gussets anchoring the lower bearing ring into the pelvic keel
 *    - Restrained purple status indicator arc flush inside the bearing channel
 *
 * 2. Rear Pelvic & Sacral Integration:
 *    - Structural dark titanium sacral chassis and central pelvic keel
 *    - Sculpted white ceramic composite sacral armor plate with compound beveled crest
 *    - Wishbone reinforcement brackets bridging the pelvis into the hip hubs
 *    - Recessed maintenance inspection hatch with M3 hex cap screws
 */
export function createRearWaistAssembly(materials: RobotMaterialPalette): RearWaistAssemblyNodes {
  const group = new THREE.Group();
  group.name = 'RearWaistAssembly';

  const ledMeshes: THREE.Mesh[] = [];
  const cfg = TORSO_CONFIG.waist;

  // The true vertical rotational axis of the waist core is at z = -0.004
  const waistCenterZ = -0.004;

  // =========================================================================
  // 1. REAR WAIST BEARING HOUSING & ROTATIONAL RACE (Centered at z = -0.004)
  // Semicircular turntable bearing housing enclosing the posterior waist core
  // =========================================================================
  const outerRx = cfg.waistCore.upperRadius * 1.10; // ~0.077
  const outerRz = cfg.waistCore.upperRadius * 0.94; // ~0.066
  const innerRx = cfg.waistCore.upperRadius * 0.92; // ~0.064
  const innerRz = cfg.waistCore.upperRadius * 0.76; // ~0.053

  const bearingArcShape = new THREE.Shape();
  // Posterior half arc (from -X to +X across negative Z relative to waist center)
  bearingArcShape.absellipse(0, 0, outerRx, outerRz, Math.PI, 0, false, 0);
  bearingArcShape.lineTo(innerRx, 0);
  bearingArcShape.absellipse(0, 0, innerRx, innerRz, 0, Math.PI, true, 0);
  bearingArcShape.closePath();

  const bearingHousingGeo = geoCache.get('RearWaistBearingHousingGeo_v5', () => {
    const g = new THREE.ExtrudeGeometry(bearingArcShape, {
      depth: 0.022,
      bevelEnabled: true,
      bevelThickness: 0.0022,
      bevelSize: 0.0018,
      bevelSegments: 2,
      curveSegments: 36,
    });
    // Center extrusion thickness along depth axis
    g.translate(0, 0, -0.011);
    return g;
  });

  const bearingHousing = new THREE.Mesh(bearingHousingGeo, materials.jointDoubleSide);
  bearingHousing.name = 'RearWaistBearingHousing';
  bearingHousing.rotation.x = Math.PI / 2;
  bearingHousing.position.set(0, cfg.waistCore.yOffset, waistCenterZ);
  bearingHousing.castShadow = true;
  bearingHousing.receiveShadow = true;
  group.add(bearingHousing);

  // Concentric polished metallic bearing raceway ring (separate non-coplanar layer)
  const rearRaceGeo = geoCache.get('RearWaistRaceGeo_v5', () => {
    return new THREE.TorusGeometry(outerRx * 0.93, 0.0018, 8, 36, Math.PI);
  });
  const rearRace = new THREE.Mesh(rearRaceGeo, materials.metallicDoubleSide);
  rearRace.rotation.x = Math.PI / 2;
  rearRace.rotation.z = Math.PI;
  rearRace.position.set(0, cfg.waistCore.yOffset + 0.008, waistCenterZ);
  group.add(rearRace);

  // Concentric subtle purple optical status indicator arc flush inside the raceway
  const waistLedArcGeo = geoCache.get('RearWaistLedArcGeo_v5', () => {
    return new THREE.TorusGeometry(outerRx * 0.88, 0.0011, 6, 32, Math.PI * 0.70);
  });
  const waistLedArc = new THREE.Mesh(waistLedArcGeo, materials.purpleEmissive);
  waistLedArc.name = 'RearWaistStatusLedArc';
  waistLedArc.rotation.x = Math.PI / 2;
  waistLedArc.rotation.z = Math.PI * 0.85;
  waistLedArc.position.set(0, cfg.waistCore.yOffset + 0.005, waistCenterZ);
  group.add(waistLedArc);
  ledMeshes.push(waistLedArc);

  // Semicircular Bolt Circle: 10 precision hex socket fasteners distributed evenly
  const boltGeo = geoCache.get('RearWaistBoltGeo_v5', () => {
    const g = new THREE.CylinderGeometry(0.0014, 0.0014, 0.0022, 6);
    return g;
  });

  const boltCount = 10;
  for (let b = 0; b < boltCount; b++) {
    const angle = Math.PI + ((b + 0.5) / boltCount) * Math.PI;
    const bX = Math.cos(angle) * outerRx * 0.90;
    const bZ = Math.sin(angle) * outerRz * 0.90 + waistCenterZ;
    const bolt = new THREE.Mesh(boltGeo, materials.metallicDoubleSide);
    bolt.position.set(bX, cfg.waistCore.yOffset + 0.012, bZ);
    group.add(bolt);
  }

  // Upper Mounting Connection Brackets: receiving the lumbar frame lower mounting feet
  const lumbarInterfaceLugGeo = geoCache.get('WaistLumbarMountLugGeo_v5', () => new THREE.BoxGeometry(0.014, 0.012, 0.016));
  for (const lSide of [-1, 1] as const) {
    const lug = new THREE.Mesh(lumbarInterfaceLugGeo, materials.jointDoubleSide);
    lug.position.set(lSide * 0.048, cfg.waistCore.yOffset + 0.014, -0.034);
    group.add(lug);

    const pin = new THREE.Mesh(boltGeo, materials.metallicDoubleSide);
    pin.position.set(lSide * 0.048, cfg.waistCore.yOffset + 0.020, -0.034);
    group.add(pin);
  }

  // Structural Support Gusset Brackets connecting Waist Bearing to Pelvic Chassis
  const waistToPelvisGussetGeo = geoCache.get('WaistToPelvisGussetGeo_v5', () => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0.016, -0.022);
    shape.lineTo(0, -0.022);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.007,
      bevelEnabled: true,
      bevelThickness: 0.0014,
      bevelSize: 0.0012,
      bevelSegments: 2,
    });
  });

  for (const gSide of [-1, 1] as const) {
    const gusset = new THREE.Mesh(waistToPelvisGussetGeo, materials.jointDoubleSide);
    gusset.scale.set(gSide, 1, 1);
    gusset.position.set(gSide * 0.036, cfg.waistCore.yOffset, -0.028);
    group.add(gusset);
  }

  // =========================================================================
  // 2. INNER STRUCTURAL SACRAL CHASSIS & CENTRAL PELVIC KEEL (Dark Titanium)
  // Structural backing plate and central load spine distributing forces to hip sockets
  // =========================================================================
  const chassisShape = new THREE.Shape();
  chassisShape.moveTo(-0.044, 0.034);
  chassisShape.lineTo(0.044, 0.034);
  chassisShape.lineTo(0.036, -0.042);
  chassisShape.lineTo(-0.036, -0.042);
  chassisShape.closePath();

  const chassisGeo = geoCache.get('SacralChassisGeo_v5', () => {
    const g = new THREE.ExtrudeGeometry(chassisShape, {
      depth: 0.013,
      bevelEnabled: true,
      bevelThickness: 0.0020,
      bevelSize: 0.0016,
      bevelSegments: 2,
    });
    g.center();
    return g;
  });

  const sacralChassis = new THREE.Mesh(chassisGeo, materials.joint);
  sacralChassis.name = 'SacralStructuralChassis';
  sacralChassis.position.set(0, -0.276, -0.040);
  sacralChassis.rotation.x = 0.04;
  sacralChassis.castShadow = true;
  group.add(sacralChassis);

  // Central vertical pelvic keel rib
  const keelGeo = geoCache.get('PelvicKeelGeo_v5', () => new THREE.BoxGeometry(0.009, 0.074, 0.014));
  const keelMesh = new THREE.Mesh(keelGeo, materials.joint);
  keelMesh.position.set(0, -0.276, -0.046);
  keelMesh.rotation.x = 0.04;
  group.add(keelMesh);

  // =========================================================================
  // 3. POSTERIOR HIP-JOINT REINFORCEMENT WISHBONE BRACKETS (Left & Right)
  // =========================================================================
  const posteriorHipBrackets = new THREE.Group();
  posteriorHipBrackets.name = 'PosteriorHipWishboneBrackets';

  const wishboneShape = new THREE.Shape();
  wishboneShape.moveTo(0, 0.016);
  wishboneShape.lineTo(0.052, 0.010);
  wishboneShape.lineTo(0.054, -0.012);
  wishboneShape.lineTo(0.012, -0.016);
  wishboneShape.lineTo(0, -0.006);
  wishboneShape.closePath();

  const wishboneGeo = geoCache.get('PosteriorHipWishboneGeo_v5', () => {
    const g = new THREE.ExtrudeGeometry(wishboneShape, {
      depth: 0.014,
      bevelEnabled: true,
      bevelThickness: 0.0020,
      bevelSize: 0.0018,
      bevelSegments: 2,
    });
    g.center();
    return g;
  });

  const hipPinGeo = geoCache.get('PosteriorHipPinGeo_v5', () => {
    const g = new THREE.CylinderGeometry(0.0026, 0.0026, 0.018, 14);
    g.rotateX(Math.PI / 2);
    return g;
  });

  for (const side of [-1, 1] as const) {
    const armGroup = new THREE.Group();
    armGroup.name = `PosteriorHipWishbone_${side === -1 ? 'L' : 'R'}`;
    armGroup.position.set(side * 0.042, -0.272, -0.024);
    armGroup.rotation.y = side * 0.30;

    const wishboneMesh = new THREE.Mesh(wishboneGeo, materials.jointDoubleSide);
    wishboneMesh.scale.set(side, 1, 1);
    wishboneMesh.castShadow = true;
    armGroup.add(wishboneMesh);

    // Rotary hub reinforcement bearing cap
    const capGeo = geoCache.get('HipRearCapGeo_v5', () => new THREE.CylinderGeometry(0.013, 0.013, 0.005, 20));
    const cap = new THREE.Mesh(capGeo, materials.jointDoubleSide);
    cap.rotation.z = Math.PI / 2;
    cap.position.set(side * 0.046, 0, 0);
    armGroup.add(cap);

    // Pivot pin into hip rotary hub
    const pin = new THREE.Mesh(hipPinGeo, materials.metallicDoubleSide);
    pin.position.set(side * 0.046, 0, 0);
    armGroup.add(pin);

    posteriorHipBrackets.add(armGroup);
  }

  group.add(posteriorHipBrackets);

  // =========================================================================
  // 4. SCULPTED SACRAL PELVIC ARMOR PLATE (White Ceramic Composite)
  // Clean compound beveled posterior plate mirroring the front pelvis
  // =========================================================================
  const sacralShape = new THREE.Shape();
  sacralShape.moveTo(-0.044, 0.036);
  sacralShape.quadraticCurveTo(0, 0.040, 0.044, 0.036);
  sacralShape.lineTo(0.040, -0.012);
  sacralShape.lineTo(0.026, -0.046);
  sacralShape.quadraticCurveTo(0, -0.056, -0.026, -0.046);
  sacralShape.lineTo(-0.040, -0.012);
  sacralShape.closePath();

  // Recessed central indicator window
  const ledWindow = new THREE.Path();
  ledWindow.moveTo(-0.018, 0.013);
  ledWindow.lineTo(0.018, 0.013);
  ledWindow.lineTo(0.016, 0.005);
  ledWindow.lineTo(-0.016, 0.005);
  ledWindow.closePath();
  sacralShape.holes.push(ledWindow);

  const sacralGeo = geoCache.get('SacralPelvicArmorGeo_v5', () => {
    const g = new THREE.ExtrudeGeometry(sacralShape, {
      depth: 0.015,
      bevelEnabled: true,
      bevelThickness: 0.0034,
      bevelSize: 0.0028,
      bevelSegments: 3,
      curveSegments: 28,
    });
    g.center();

    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      if (z > 0) {
        const crest = (1.0 - Math.min(1.0, Math.abs(x) / 0.044)) * 0.006;
        const taperZ = y < 0 ? Math.sin(-y * 16) * 0.003 : 0;
        pos.setZ(i, z + crest - taperZ);
      }
    }
    g.computeVertexNormals();
    return g;
  });

  const sacralArmor = new THREE.Mesh(sacralGeo, materials.armorDoubleSide);
  sacralArmor.name = 'SacralPelvicArmorPlate';
  sacralArmor.position.set(0, -0.276, -0.048);
  sacralArmor.rotation.x = 0.04;
  sacralArmor.castShadow = true;
  sacralArmor.receiveShadow = true;
  group.add(sacralArmor);

  // =========================================================================
  // 5. RECESSED SACRAL SERVICE HATCH & VIOLET STATUS LED SLIT
  // =========================================================================
  const ledGeo = geoCache.get('SacralLedGeo_v5', () => new THREE.BoxGeometry(0.030, 0.0024, 0.003));
  const sacralLed = new THREE.Mesh(ledGeo, materials.purpleEmissive);
  sacralLed.name = 'SacralAccentStatusLed';
  sacralLed.position.set(0, -0.259, -0.055);
  sacralLed.rotation.x = 0.04;
  group.add(sacralLed);
  ledMeshes.push(sacralLed);

  const ledBezelGeo = geoCache.get('SacralLedBezelGeo_v5', () => new THREE.BoxGeometry(0.034, 0.0050, 0.002));
  const ledBezel = new THREE.Mesh(ledBezelGeo, materials.metallicDoubleSide);
  ledBezel.position.set(0, -0.259, -0.054);
  ledBezel.rotation.x = 0.04;
  group.add(ledBezel);

  // Recessed Lower Sacral Maintenance Inspection Cover with 4 Hex Bolts
  const hatchGeo = geoCache.get('SacralHatchGeo_v5', () => new THREE.BoxGeometry(0.034, 0.016, 0.003));
  const serviceCover = new THREE.Mesh(hatchGeo, materials.jointDoubleSide);
  serviceCover.name = 'SacralServiceCover';
  serviceCover.position.set(0, -0.288, -0.055);
  serviceCover.rotation.x = 0.04;
  group.add(serviceCover);

  const hexBoltGeo = geoCache.get('SacralHexBoltGeo_v5', () => {
    const g = new THREE.CylinderGeometry(0.0011, 0.0011, 0.0020, 6);
    g.rotateX(Math.PI / 2);
    return g;
  });

  for (const bx of [-0.012, 0.012]) {
    for (const by of [-0.005, 0.005]) {
      const bolt = new THREE.Mesh(hexBoltGeo, materials.metallicDoubleSide);
      bolt.position.set(bx, -0.288 + by, -0.057);
      bolt.rotation.x = 0.04;
      group.add(bolt);
    }
  }

  return {
    group,
    bearingHousing,
    sacralArmor,
    sacralChassis,
    posteriorHipBrackets,
    serviceCover,
    ledMeshes,
  };
}

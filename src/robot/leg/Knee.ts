import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { LEG_CONFIG } from './LegConfig';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger';
import { geoCache } from '../utils/GeometryCache';

export interface KneeNodes {
  group: THREE.Group;
  shinPivot: THREE.Group;
  lateralDisc: THREE.Mesh;
  medialDisc: THREE.Mesh;
  accentRingLateral: THREE.Mesh;
  accentRingMedial?: THREE.Mesh;
  patellaShield: THREE.Mesh;
  patellaLed?: THREE.Mesh;
  centralPin: THREE.Mesh;
  statorTeeth: THREE.Mesh[];
  poplitealLinkage?: THREE.Group;
  ledMeshes: THREE.Mesh[];
}

/**
 * Creates the sculpted white ceramic central knee cover matching reference image.
 * Elongated faceted hexagonal silhouette with upward chevron peak nesting into
 * the thigh arch, crisp 3D midline crest, clean chamfers, and lower taper.
 */
function createCentralKneeCoverGeometry(
  width: number,
  height: number,
  thickness: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfW = width * 0.5;
  const halfH = height * 0.5;

  // Precision-machined faceted mecha knee cover contour matching reference image
  shape.moveTo(0, halfH); // Top chevron peak
  shape.lineTo(halfW * 0.70, halfH * 0.60); // Slanted upper facet
  shape.lineTo(halfW * 0.92, halfH * 0.20);
  shape.lineTo(halfW, 0.0); // Mid lateral edge
  shape.lineTo(halfW * 0.92, -halfH * 0.20);
  shape.lineTo(halfW * 0.65, -halfH * 0.65);
  shape.lineTo(0, -halfH); // Bottom chevron point
  shape.lineTo(-halfW * 0.65, -halfH * 0.65);
  shape.lineTo(-halfW * 0.92, -halfH * 0.20);
  shape.lineTo(-halfW, 0.0);
  shape.lineTo(-halfW * 0.92, halfH * 0.20);
  shape.lineTo(-halfW * 0.70, halfH * 0.60);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.0022,
    bevelSize: 0.0016,
    bevelSegments: 4,
    curveSegments: 24,
  });
  geo.center();

  // Multi-faceted 3D sculpting:
  // Central longitudinal ridge peaking at x = 0 with clean chamfered flanks
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (z > 0) {
      const nx = Math.min(1.0, Math.abs(x) / halfW);
      const ridge = Math.pow(1.0 - nx, 1.25) * 0.0040;
      const verticalCurve = Math.cos((y / halfH) * (Math.PI * 0.42)) * 0.0022;
      pos.setZ(i, z + ridge + verticalCurve);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates the upper dark knee structural housing fitting directly underneath
 * the angled thigh cutout.
 */
function createUpperKneeHousingGeometry(
  width: number,
  height: number,
  depth: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfWT = width * 0.38;
  const halfWB = width * 0.50;

  shape.moveTo(-halfWB, 0);
  shape.lineTo(halfWB, 0);
  shape.lineTo(halfWT * 1.10, height * 0.70);
  shape.lineTo(halfWT * 0.65, height);
  shape.lineTo(-halfWT * 0.65, height);
  shape.lineTo(-halfWT * 1.10, height * 0.70);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.0022,
    bevelSize: 0.0018,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

/**
 * Creates the lower dark knee structural clevis seating cleanly into
 * the shin tibial plateau.
 */
function createLowerKneeStructureGeometry(
  width: number,
  height: number,
  depth: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfWT = width * 0.50;
  const halfWB = width * 0.38;

  shape.moveTo(-halfWT, 0);
  shape.lineTo(halfWT, 0);
  shape.lineTo(halfWB, -height);
  shape.lineTo(-halfWB, -height);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.0020,
    bevelSize: 0.0016,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

/**
 * Creates the complete Knee Joint assembly matching the reference images:
 *
 *   WHITE THIGH ARMOR & DISTAL FEMUR FORK
 *                  │
 *                  ▼
 *   ┌─────────────────────────────┐
 *   │ UPPER DARK MOUNTING BRACKET │ (Titanium Housing, Flange Bolts, Side Plates)
 *   ├─────────────────────────────┤
 *   │ TRANSVERSE ROTARY BEARING   │ ──── [ROTARY CONDYLE BEARINGS] (Concentric Purple Rings,
 *   │ AXLE & HOUSING SLEEVE       │                                Perimeter Hex Bolts & Caps)
 *   ├─────────────────────────────┤
 *   │ WHITE PATELLAR SHIELD       │ ──── [REAR POPLITEAL LINKAGE] (Hydraulic Linkage & Bump Stop)
 *   ├─────────────────────────────┤
 *   │ ARTICULATED LOWER CLEVIS    │ (Dual-Shear Yoke, Thrust Washers, Receiver Collar)
 *   └──────────────┬──────────────┘
 *                  │
 *                  ▼
 *   SHIN TIBIAL PLATEAU
 */
export function createKnee(
  side: -1 | 1,
  materials: RobotMaterialPalette
): KneeNodes {
  const kneeGroup = new THREE.Group();
  kneeGroup.name = side === -1 ? 'LeftKnee' : 'RightKnee';

  const cfg = LEG_CONFIG.knee;
  const ledMeshes: THREE.Mesh[] = [];
  const statorTeeth: THREE.Mesh[] = [];

  // Group containing stationary upper joint components, axle, housing, and side bearings
  const condyleCoreGroup = new THREE.Group();
  condyleCoreGroup.name = side === -1 ? 'KneeCore_L' : 'KneeCore_R';
  kneeGroup.add(condyleCoreGroup);

  // Group containing stationary metallic accents
  const metallicCoreGroup = new THREE.Group();
  metallicCoreGroup.name = side === -1 ? 'KneeMetallic_L' : 'KneeMetallic_R';
  kneeGroup.add(metallicCoreGroup);

  // =========================================================================
  // 1. TRANSVERSE HINGE AXLE PIN & CENTRAL FRAME (Mechanical Rotational Core)
  // =========================================================================
  const pinGeo = geoCache.get('KneePinGeo', () => new THREE.CylinderGeometry(
    cfg.centralAxleRadius,
    cfg.centralAxleRadius,
    cfg.centralAxleLength,
    24
  ));
  const centralPin = new THREE.Mesh(pinGeo, materials.joint);
  centralPin.name = side === -1 ? 'KneeAxlePin_L' : 'KneeAxlePin_R';
  centralPin.rotation.z = Math.PI / 2;
  centralPin.castShadow = true;
  condyleCoreGroup.add(centralPin);

  // Central rotary bearing housing sleeve with oil seal grooves
  const sleeveGeo = geoCache.get('KneeSleeveGeo', () => new THREE.CylinderGeometry(
    cfg.centralAxleRadius * 1.75,
    cfg.centralAxleRadius * 1.75,
    cfg.centralAxleLength * 0.65,
    28
  ));
  const sleeveMesh = new THREE.Mesh(sleeveGeo, materials.joint);
  sleeveMesh.rotation.z = Math.PI / 2;
  sleeveMesh.castShadow = true;
  sleeveMesh.receiveShadow = true;
  condyleCoreGroup.add(sleeveMesh);

  // Oil seal rings on the bearing sleeve
  const sealGeo = geoCache.get('KneeSealRingGeo', () => new THREE.CylinderGeometry(
    cfg.centralAxleRadius * 1.85,
    cfg.centralAxleRadius * 1.85,
    0.0025,
    28
  ));
  for (const sDir of [-1, 1]) {
    const seal = new THREE.Mesh(sealGeo, materials.joint);
    seal.rotation.z = Math.PI / 2;
    seal.position.x = sDir * (cfg.centralAxleLength * 0.28);
    condyleCoreGroup.add(seal);
  }

  // Hex end caps on central axle ends with center socket detail
  const capGeo = geoCache.get('KneeAxleCapGeo', () => new THREE.CylinderGeometry(
    cfg.centralAxleRadius * 1.30,
    cfg.centralAxleRadius * 1.30,
    0.0025,
    6
  ));
  for (const dir of [-1, 1]) {
    const cap = new THREE.Mesh(capGeo, materials.joint);
    cap.rotation.z = Math.PI / 2;
    cap.position.x = dir * (cfg.centralAxleLength * 0.5 + 0.001);
    condyleCoreGroup.add(cap);
  }

  // =========================================================================
  // 2. UPPER DARK KNEE STRUCTURE (Supporting Thigh directly above joint)
  // Compact, load-bearing dark titanium housing fitting under angled thigh cutout
  // =========================================================================
  const upperHousingGeo = geoCache.get('KneeUpperHousingGeo', () => createUpperKneeHousingGeometry(
    cfg.housingWidth,
    cfg.upperStructureHeight,
    cfg.housingDepth
  ));
  const upperHousing = new THREE.Mesh(upperHousingGeo, materials.joint);
  upperHousing.position.set(0, cfg.upperStructureHeight * 0.5, -0.001);
  upperHousing.castShadow = true;
  upperHousing.receiveShadow = true;
  condyleCoreGroup.add(upperHousing);

  // Beveled transition flange interfacing with thigh frame mount
  const upperFlangeGeo = geoCache.get('KneeUpperFlangeGeo', () => new THREE.BoxGeometry(
    cfg.housingWidth * 0.85,
    0.006,
    cfg.housingDepth * 1.08
  ));
  const upperFlange = new THREE.Mesh(upperFlangeGeo, materials.joint);
  upperFlange.position.set(0, cfg.upperStructureHeight - 0.003, -0.001);
  upperFlange.castShadow = true;
  condyleCoreGroup.add(upperFlange);

  // =========================================================================
  // 3. INTEGRATED ROTARY CONDYLE BEARINGS (Flush with outer leg architecture)
  // Clean, precision-engineered rotary condyle discs with concentric purple glowing rings
  // and recessed metallic central axle hubs
  // =========================================================================
  const discGeo = geoCache.get('KneeDiscGeo', () => new THREE.CylinderGeometry(
    cfg.discRadius,
    cfg.discRadius,
    cfg.discWidth,
    32
  ));

  // Outer (lateral) rotary disc
  const lateralDisc = new THREE.Mesh(discGeo, materials.joint);
  lateralDisc.name = side === -1 ? 'KneeLateralDisc_L' : 'KneeLateralDisc_R';
  lateralDisc.rotation.z = Math.PI / 2;
  lateralDisc.position.x = side * (cfg.outerDiscSpacing * 0.5);
  lateralDisc.castShadow = true;
  lateralDisc.receiveShadow = true;
  condyleCoreGroup.add(lateralDisc);

  // Inner (medial) rotary disc
  const medialDisc = new THREE.Mesh(discGeo, materials.joint);
  medialDisc.name = side === -1 ? 'KneeMedialDisc_L' : 'KneeMedialDisc_R';
  medialDisc.rotation.z = Math.PI / 2;
  medialDisc.position.x = -side * (cfg.outerDiscSpacing * 0.5);
  medialDisc.castShadow = true;
  medialDisc.receiveShadow = true;
  condyleCoreGroup.add(medialDisc);

  // Recessed dark caps and central metallic bosses
  const centerCapGeo = geoCache.get('KneeCenterCapGeo', () => new THREE.CylinderGeometry(
    cfg.centerCapRadius,
    cfg.centerCapRadius,
    0.0024,
    24
  ));
  const bossGeo = geoCache.get('KneeBossGeo', () => new THREE.CylinderGeometry(0.0055, 0.0055, 0.0025, 16));

  for (const discX of [side * (cfg.outerDiscSpacing * 0.5), -side * (cfg.outerDiscSpacing * 0.5)]) {
    // Recessed dark metal center cap inside purple ring
    const cap = new THREE.Mesh(centerCapGeo, materials.joint);
    cap.rotation.z = Math.PI / 2;
    cap.position.x = discX + Math.sign(discX) * (cfg.discWidth * 0.5 + 0.0012);
    cap.castShadow = true;
    condyleCoreGroup.add(cap);

    // Central circular dark metallic axle boss
    const boss = new THREE.Mesh(bossGeo, materials.metallic);
    boss.rotation.z = Math.PI / 2;
    boss.position.x = discX + Math.sign(discX) * (cfg.discWidth * 0.5 + 0.0024);
    metallicCoreGroup.add(boss);
  }

  // Popliteal fossa rear mechanical knuckle & flexion limit stop (Images 4 & 5)
  const rearKnuckleGeo = geoCache.get('KneeRearKnuckleGeo', () => new THREE.BoxGeometry(0.026, 0.016, 0.012));
  const rearKnuckle = new THREE.Mesh(rearKnuckleGeo, materials.joint);
  rearKnuckle.position.set(0, 0.004, -cfg.housingDepth * 0.48);
  rearKnuckle.castShadow = true;
  condyleCoreGroup.add(rearKnuckle);

  const mergedCondyle = mergeGroupMeshesByMaterial(
    condyleCoreGroup,
    materials.joint,
    side === -1 ? 'KneeCondyleMesh_L' : 'KneeCondyleMesh_R',
    true
  ) || centralPin;

  const mergedMetallic = mergeGroupMeshesByMaterial(
    metallicCoreGroup,
    materials.metallic,
    side === -1 ? 'KneeMetallic_Merged_L' : 'KneeMetallic_Merged_R',
    true
  );
  if (mergedMetallic) {
    kneeGroup.add(mergedMetallic);
  }

  // =========================================================================
  // 4. CONCENTRIC PURPLE EMISSIVE ACCENT RINGS (Bilateral Rotary Face Indicators)
  // =========================================================================
  const kneeAccentGroup = new THREE.Group();
  const ringGeo = geoCache.get('KneeRingGeo', () => new THREE.TorusGeometry(cfg.accentRingRadius, 0.0016, 12, 32));
  const ringBloomGeo = geoCache.get('KneeRingBloomGeo', () => new THREE.TorusGeometry(cfg.accentRingRadius, 0.0022, 12, 32));

  // Lateral accent ring (Outer Flank)
  const accentRingLateral = new THREE.Mesh(ringGeo, materials.purpleEmissive);
  accentRingLateral.name = side === -1 ? 'KneeAccentRingLat_L' : 'KneeAccentRingLat_R';
  accentRingLateral.rotation.y = Math.PI / 2;
  accentRingLateral.position.x = side * (cfg.outerDiscSpacing * 0.5 + cfg.discWidth * 0.5 + 0.0008);
  kneeAccentGroup.add(accentRingLateral);

  const ringBloomLat = new THREE.Mesh(ringBloomGeo, materials.purpleBloom);
  ringBloomLat.rotation.y = Math.PI / 2;
  ringBloomLat.position.copy(accentRingLateral.position);
  kneeAccentGroup.add(ringBloomLat);

  // Medial accent ring (Inner Flank)
  const accentRingMedial = new THREE.Mesh(ringGeo, materials.purpleEmissive);
  accentRingMedial.name = side === -1 ? 'KneeAccentRingMed_L' : 'KneeAccentRingMed_R';
  accentRingMedial.rotation.y = Math.PI / 2;
  accentRingMedial.position.x = -side * (cfg.outerDiscSpacing * 0.5 + cfg.discWidth * 0.5 + 0.0008);
  kneeAccentGroup.add(accentRingMedial);

  const ringBloomMed = new THREE.Mesh(ringBloomGeo, materials.purpleBloom);
  ringBloomMed.rotation.y = Math.PI / 2;
  ringBloomMed.position.copy(accentRingMedial.position);
  kneeAccentGroup.add(ringBloomMed);

  const mergedKneeAccents = mergeGroupMeshesByMaterial(
    kneeAccentGroup,
    materials.purpleEmissive,
    side === -1 ? 'KneeAccents_L' : 'KneeAccents_R',
    false,
    false
  ) || accentRingLateral;
  kneeGroup.add(mergedKneeAccents);
  ledMeshes.push(mergedKneeAccents);

  const mergedKneeBloom = mergeGroupMeshesByMaterial(
    kneeAccentGroup,
    materials.purpleBloom,
    side === -1 ? 'KneeBloom_L' : 'KneeBloom_R',
    false,
    false
  );
  if (mergedKneeBloom) {
    kneeGroup.add(mergedKneeBloom);
  }

  // =========================================================================
  // 5. CENTRAL WHITE KNEE COVER (Primary Visual Feature from Reference)
  // Compact, faceted white ceramic cover centered on knee axis with purple LED slit
  // =========================================================================
  const coverGeo = geoCache.get('KneePatellaCoverGeo', () => createCentralKneeCoverGeometry(
    cfg.patella.width,
    cfg.patella.height,
    cfg.patella.thickness
  ));
  const rotX = (cfg.patella as any).rotX || 0;
  const patellaShield = new THREE.Mesh(coverGeo, materials.armor);
  patellaShield.name = side === -1 ? 'PatellaShield_L' : 'PatellaShield_R';
  patellaShield.position.set(0, cfg.patella.yOffset, cfg.patella.offsetZ);
  patellaShield.rotation.x = rotX;
  patellaShield.castShadow = true;
  patellaShield.receiveShadow = true;
  kneeGroup.add(patellaShield);

  // Patella mounting standoffs connecting shield securely to knee axle housing
  const patellaStandoffGeo = geoCache.get('KneePatellaStandoffGeo_v2', () => new THREE.CylinderGeometry(0.0035, 0.0035, 0.015, 8));
  for (const pY of [0.010, -0.010]) {
    const standoff = new THREE.Mesh(patellaStandoffGeo, materials.joint);
    standoff.rotation.x = Math.PI / 2;
    standoff.position.set(0, pY, -0.0075);
    patellaShield.add(standoff);
  }

  // Precision Horizontal Capsule / Pill Purple Glowing LED Slit in Dark Recessed Bezel
  const frontZ = cfg.patella.thickness * 0.5 + 0.0084; // 0.0129m
  const bezelGeo = geoCache.get('KneePatellaBezelGeo', () => new THREE.BoxGeometry(0.0130, 0.0034, 0.0022));
  const patellaBezel = new THREE.Mesh(bezelGeo, materials.joint);
  patellaBezel.name = 'PatellaLedBezel';
  patellaBezel.position.set(0, -0.0065, frontZ - 0.0004);
  patellaShield.add(patellaBezel);

  // Capsule geometry with smooth hemispherical ends matching reference crop
  const ledCapsuleGeo = geoCache.get('KneeLedCapsuleGeo', () => {
    const g = new THREE.CapsuleGeometry(0.0011, 0.0075, 8, 16);
    g.rotateZ(Math.PI / 2); // Orient horizontally
    return g;
  });
  const patellaLed = new THREE.Mesh(ledCapsuleGeo, materials.purpleEmissive);
  patellaLed.name = side === -1 ? 'PatellaLed_L' : 'PatellaLed_R';
  patellaLed.position.set(0, -0.0065, frontZ + 0.0008);
  patellaShield.add(patellaLed);
  ledMeshes.push(patellaLed);

  // Glowing hot core matching high-intensity emissive line in reference
  const coreCapsuleGeo = geoCache.get('KneeCoreCapsuleGeo', () => {
    const g = new THREE.CapsuleGeometry(0.0006, 0.0065, 8, 16);
    g.rotateZ(Math.PI / 2);
    return g;
  });
  const patellaCore = new THREE.Mesh(coreCapsuleGeo, materials.whiteCoreEmissive);
  patellaCore.position.set(0, -0.0065, frontZ + 0.0011);
  patellaShield.add(patellaCore);

  const bloomCapsuleGeo = geoCache.get('KneeBloomCapsuleGeo', () => {
    const g = new THREE.CapsuleGeometry(0.0020, 0.0085, 8, 16);
    g.rotateZ(Math.PI / 2);
    return g;
  });
  const patellaBloom = new THREE.Mesh(bloomCapsuleGeo, materials.purpleBloom);
  patellaBloom.position.set(0, -0.0065, frontZ + 0.0010);
  patellaShield.add(patellaBloom);

  // =========================================================================
  // 6. SHIN PIVOT & LOWER DARK STRUCTURE (Articulated lower connection)
  // Substantial dark titanium clevis anchoring cleanly into the tibial plateau
  // =========================================================================
  const shinPivot = new THREE.Group();
  shinPivot.name = side === -1 ? 'LeftShinPivot' : 'RightShinPivot';
  shinPivot.position.set(0, 0, 0);
  kneeGroup.add(shinPivot);

  const clevisGroup = new THREE.Group();

  // Solid dark titanium lower neck connecting joint core into shin
  const lowerNeckGeo = geoCache.get('KneeLowerNeckGeo', () => createLowerKneeStructureGeometry(
    cfg.housingWidth * 0.78,
    cfg.lowerStructureHeight,
    cfg.housingDepth * 0.90
  ));
  const lowerNeck = new THREE.Mesh(lowerNeckGeo, materials.joint);
  lowerNeck.position.set(0, -cfg.lowerStructureHeight * 0.5, -0.001);
  lowerNeck.castShadow = true;
  lowerNeck.receiveShadow = true;
  clevisGroup.add(lowerNeck);

  // Dual-shear clevis ears wrapping around the central axle housing
  const clevisEarGeo = geoCache.get('KneeClevisEarGeo', () => new THREE.BoxGeometry(0.005, 0.024, 0.024));
  for (const cSide of [-1, 1]) {
    const cEar = new THREE.Mesh(clevisEarGeo, materials.joint);
    cEar.position.set(cSide * (cfg.centralAxleLength * 0.22), -0.005, 0);
    cEar.castShadow = true;
    clevisGroup.add(cEar);
  }

  // Lower mounting collar seating flush into shin tibial plateau
  const lowerCollarGeo = geoCache.get('KneeLowerCollarGeo', () => new THREE.CylinderGeometry(0.018, 0.022, 0.014, 20));
  const lowerCollar = new THREE.Mesh(lowerCollarGeo, materials.joint);
  lowerCollar.position.set(0, -cfg.lowerStructureHeight + 0.007, -0.001);
  lowerCollar.castShadow = true;
  clevisGroup.add(lowerCollar);

  const mergedClevis = mergeGroupMeshesByMaterial(
    clevisGroup,
    materials.joint,
    side === -1 ? 'KneeLowerStructure_L' : 'KneeLowerStructure_R',
    true
  ) || lowerNeck;
  shinPivot.add(mergedClevis);

  // Popliteal fossa rear mechanical linkage strut & hydraulic assist
  // Properly parented to shinPivot so it renders with high-spec PBR materials and moves with joint
  const linkageGroup = new THREE.Group();
  linkageGroup.name = side === -1 ? 'PoplitealLinkage_L' : 'PoplitealLinkage_R';

  // Hydraulic cylinder casing mounted to lower clevis
  const rearLinkGeo = geoCache.get('KneeRearLinkGeo', () => new THREE.CylinderGeometry(0.0036, 0.0036, 0.024, 16));
  const rearLink = new THREE.Mesh(rearLinkGeo, materials.machinedLink);
  rearLink.rotation.x = 0.22;
  rearLink.position.set(0, -cfg.lowerStructureHeight * 0.55, -cfg.housingDepth * 0.42);
  rearLink.castShadow = true;
  linkageGroup.add(rearLink);

  // Polished chrome metallic piston rod extending upward toward rearKnuckle
  const rearPistonGeo = geoCache.get('KneeRearPistonGeo', () => new THREE.CylinderGeometry(0.0022, 0.0022, 0.020, 16));
  const rearPiston = new THREE.Mesh(rearPistonGeo, materials.metallic);
  rearPiston.rotation.x = 0.22;
  rearPiston.position.set(0, -cfg.lowerStructureHeight * 0.20, -cfg.housingDepth * 0.44);
  rearPiston.castShadow = true;
  linkageGroup.add(rearPiston);

  // Linkage pivot mounting pin
  const linkPinGeo = geoCache.get('KneeLinkPinGeo', () => new THREE.CylinderGeometry(0.0018, 0.0018, 0.012, 12));
  const linkPin = new THREE.Mesh(linkPinGeo, materials.joint);
  linkPin.rotation.z = Math.PI / 2;
  linkPin.position.set(0, -cfg.lowerStructureHeight * 0.70, -cfg.housingDepth * 0.40);
  linkageGroup.add(linkPin);

  shinPivot.add(linkageGroup);

  return {
    group: kneeGroup,
    shinPivot,
    lateralDisc: mergedCondyle,
    medialDisc: mergedCondyle,
    accentRingLateral: mergedKneeAccents,
    accentRingMedial: mergedKneeAccents,
    patellaShield,
    patellaLed,
    centralPin: mergedCondyle,
    statorTeeth,
    poplitealLinkage: linkageGroup,
    ledMeshes,
  };
}

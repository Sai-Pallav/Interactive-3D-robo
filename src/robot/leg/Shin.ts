import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { LEG_CONFIG } from './LegConfig';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger';
import { geoCache } from '../utils/GeometryCache';

export interface ShinNodes {
  group: THREE.Group;
  tibiaSkeleton: THREE.Mesh;
  fibulaStrut: THREE.Mesh;
  anteriorKeelArmor: THREE.Mesh;
  posteriorCalfArmor: THREE.Mesh;
  calfVents: THREE.Mesh[];
  ledStrip: THREE.Mesh;
  anklePivot: THREE.Group;
  ledMeshes: THREE.Mesh[];
}

/**
 * Creates the segmented white ceramic anterior shin keel armor gauntlet.
 * Features:
 * - Controlled athletic taper toward the ankle
 * - Sharp central deflector crest with chamfered lateral/medial facets
 * - Open upper articulation shelf leaving calibrated clearance below the knee
 * - Substantial composite armor thickness with precision bevels
 * - Recessed maintenance panel seams and side mounting tabs
 */
function createSegmentedKeelGeometry(
  widthTop: number,
  widthBottom: number,
  length: number,
  thickness: number,
  keelProtrusion: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfWT = widthTop * 0.5;
  const halfWB = widthBottom * 0.5;
  const halfL = length * 0.5;

  // Sculpted upper shoulders flanking the dark neck, with central articulation notch
  shape.moveTo(0, halfL - 0.012); // Central articulation notch
  shape.quadraticCurveTo(halfWT * 0.20, halfL - 0.011, halfWT * 0.40, halfL - 0.004);
  shape.lineTo(halfWT * 0.65, halfL); // High sculpted shoulder peak flanking the joint
  shape.lineTo(halfWT * 0.95, halfL * 0.78);
  shape.lineTo(halfWT, halfL * 0.70);
  shape.lineTo(halfWT * 0.85, -halfL * 0.18);

  // Graceful ergonomic calf taper toward supramalleolar region
  shape.quadraticCurveTo(halfWT * 0.65, -halfL * 0.48, halfWB * 0.92, -halfL * 0.72);

  // Flared supramalleolar ankle guard wrapping cleanly toward malleoli
  shape.quadraticCurveTo(halfWB * 0.96, -halfL * 0.86, halfWB * 1.08, -halfL * 0.95);
  shape.lineTo(halfWB * 1.04, -halfL); // Distal lateral tip

  // Inverted anterior ankle articulation arch (provides natural foot dorsiflexion clearance over collar)
  shape.quadraticCurveTo(halfWB * 0.45, -halfL + 0.0075, 0, -halfL + 0.0095);
  shape.quadraticCurveTo(-halfWB * 0.45, -halfL + 0.0075, -halfWB * 1.04, -halfL);

  // Symmetrical return up medial side
  shape.lineTo(-halfWB * 1.08, -halfL * 0.95);
  shape.quadraticCurveTo(-halfWB * 0.96, -halfL * 0.86, -halfWB * 0.92, -halfL * 0.72);
  shape.quadraticCurveTo(-halfWT * 0.65, -halfL * 0.48, -halfWT * 0.85, -halfL * 0.18);
  shape.lineTo(-halfWT, halfL * 0.70);
  shape.lineTo(-halfWT * 0.95, halfL * 0.78);
  shape.lineTo(-halfWT * 0.65, halfL);
  shape.quadraticCurveTo(-halfWT * 0.40, halfL - 0.004, -halfWT * 0.20, halfL - 0.011);
  shape.lineTo(0, halfL - 0.012);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.0032,
    bevelSize: 0.0026,
    bevelSegments: 4,
    curveSegments: 28,
  });
  geo.center();

  // Multi-faceted 3D Sculpting:
  // Forward keel ridge: vertices along center x = 0 thrust forward with sharp chamfered flanks
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (z > 0) {
      const nx = Math.min(1.0, Math.abs(x) / halfWT);
      const keelFactor = Math.pow(1.0 - nx, 1.30);
      const yNorm = (y + halfL) / length;
      const keelCurve = keelFactor * keelProtrusion * (0.50 + 0.50 * Math.sin(yNorm * Math.PI * 0.90));
      const flankSlope = -Math.pow(nx, 1.8) * 0.006;

      // Recessed maintenance seams along facet transitions
      const isFacetSeam = Math.abs(Math.abs(x) - halfWT * 0.42) < 0.0015;
      const seamIndent = isFacetSeam ? -0.0015 : 0;

      pos.setZ(i, z + keelCurve + flankSlope + seamIndent);
    } else {
      const nx = Math.min(1.0, Math.abs(x) / halfWT);
      pos.setZ(i, z - Math.pow(nx, 2.0) * 0.008);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates the posterior calf muscle armor cowl with anatomical volume.
 */
function createPosteriorCalfGeometry(
  width: number,
  height: number,
  depth: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfW = width * 0.5;
  const halfH = height * 0.5;

  shape.moveTo(-halfW * 0.72, halfH);
  shape.lineTo(halfW * 0.72, halfH);
  shape.quadraticCurveTo(halfW * 1.02, halfH * 0.50, halfW * 0.94, 0);
  shape.quadraticCurveTo(halfW * 0.72, -halfH * 0.60, halfW * 0.45, -halfH);
  shape.lineTo(-halfW * 0.45, -halfH);
  shape.quadraticCurveTo(-halfW * 0.72, -halfH * 0.60, -halfW * 0.94, 0);
  shape.quadraticCurveTo(-halfW * 1.02, halfH * 0.50, -halfW * 0.72, halfH);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depth,
    bevelEnabled: true,
    bevelThickness: 0.0034,
    bevelSize: 0.0026,
    bevelSegments: 3,
    curveSegments: 20,
  });
  geo.center();

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (z > 0) {
      const calfBulge = Math.sin(((y + halfH) / height) * Math.PI) * 0.008;
      pos.setZ(i, z + calfBulge);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * REBUILDS THE SHIN (LOWER LEG & CALF) WITH AUTHENTIC MECHANICAL CONTINUITY:
 *
 *   KNEE LOWER BRACKET (Tibial Double-Shear Clevis)
 *          │
 *          ▼
 *   TIBIAL PLATEAU STRUCTURAL RECEIVER (Machined Titanium Receiver Block & Socket Bolts)
 *          │
 *          ▼
 *   SHIN STRUCTURAL CORE (Titanium Tibia Spine, CNC Pockets, Bulkheads, Fibula Bracing, Conduit)
 *          │
 *          ▼
 *   ARMOR MOUNTING STANDOFFS (Machined Bosses & Fastener Screws)
 *          │
 *          ▼
 *   WHITE SHIN ARMOR (Segmented Keel Gauntlet & Posterior Calf Fairing)
 *          │
 *          ▼
 *   DISTAL CLAMP COLLAR & ACHILLES UPPER MOUNT
 */
export function createShin(
  side: -1 | 1,
  materials: RobotMaterialPalette
): ShinNodes {
  const shinGroup = new THREE.Group();
  shinGroup.name = side === -1 ? 'LeftShin' : 'RightShin';

  const cfg = LEG_CONFIG.shin;
  const ledMeshes: THREE.Mesh[] = [];
  const calfVents: THREE.Mesh[] = [];

  // Group containing the load-bearing titanium frame components
  const frameGroup = new THREE.Group();
  frameGroup.name = side === -1 ? 'ShinFrame_L' : 'ShinFrame_R';
  shinGroup.add(frameGroup);

  // Group containing metallic structural details
  const metallicGroup = new THREE.Group();
  metallicGroup.name = side === -1 ? 'ShinMetallic_L' : 'ShinMetallic_R';
  shinGroup.add(metallicGroup);

  // =========================================================================
  // 1. KNEE-TO-SHIN STRUCTURAL INTERFACE (Tibial Plateau Collar & Receiver)
  // Engineered titanium socket receiver nested inside the flanking shin shoulders
  // =========================================================================
  const plateauShape = new THREE.Shape();
  const halfPW = cfg.frame.upperPlateauWidth * 0.5;
  const halfPD = cfg.frame.upperPlateauDepth * 0.5;
  plateauShape.moveTo(-halfPW * 0.85, -halfPD);
  plateauShape.lineTo(halfPW * 0.85, -halfPD);
  plateauShape.lineTo(halfPW, -halfPD * 0.70);
  plateauShape.lineTo(halfPW, halfPD * 0.70);
  plateauShape.lineTo(halfPW * 0.85, halfPD);
  plateauShape.lineTo(-halfPW * 0.85, halfPD);
  plateauShape.lineTo(-halfPW, halfPD * 0.70);
  plateauShape.lineTo(-halfPW, -halfPD * 0.70);
  plateauShape.closePath();

  const plateauGeo = geoCache.get('Shin_PlateauGeo_v3', () => {
    const g = new THREE.ExtrudeGeometry(plateauShape, {
      depth: cfg.frame.upperPlateauHeight,
      bevelEnabled: true,
      bevelThickness: 0.0016,
      bevelSize: 0.0012,
      bevelSegments: 2,
    });
    g.center();
    return g;
  });

  const tibialPlateau = new THREE.Mesh(plateauGeo, materials.joint);
  tibialPlateau.name = side === -1 ? 'TibialPlateau_L' : 'TibialPlateau_R';
  tibialPlateau.rotation.x = Math.PI / 2;
  tibialPlateau.position.set(0, -cfg.frame.upperPlateauHeight * 0.5, 0);
  tibialPlateau.castShadow = true;
  tibialPlateau.receiveShadow = true;
  frameGroup.add(tibialPlateau);

  // =========================================================================
  // 2. CENTRAL TIBIA STRUCTURAL SPINE (Load-Bearing Backbone)
  // Continuous titanium column from tibial plateau down to ankle collar
  // =========================================================================
  const spineGeo = geoCache.get('Shin_SpineGeo_v4', () => new THREE.BoxGeometry(
    cfg.frame.spineWidth,
    0.230,
    cfg.frame.spineDepth
  ));
  const tibiaSkeleton = new THREE.Mesh(spineGeo, materials.joint);
  tibiaSkeleton.name = side === -1 ? 'TibiaSkeleton_L' : 'TibiaSkeleton_R';
  tibiaSkeleton.position.set(0, -0.134, 0);
  tibiaSkeleton.castShadow = true;
  tibiaSkeleton.receiveShadow = true;
  frameGroup.add(tibiaSkeleton);

  // Armor mounting standoffs projecting forward from tibia spine
  const bossGeo = geoCache.get('Shin_BossGeo_v4', () => new THREE.CylinderGeometry(0.004, 0.004, 0.016, 12));
  for (const bY of [-0.052, -0.116, -0.180, -0.222]) {
    const boss = new THREE.Mesh(bossGeo, materials.joint);
    boss.rotation.x = Math.PI / 2;
    boss.position.set(0, bY, cfg.frame.spineDepth * 0.5 + 0.005);
    frameGroup.add(boss);
  }

  // Distal Ankle Gauntlet Collar (Machined titanium structural hub meeting ankle pivot)
  const collarGeo = geoCache.get('Shin_CollarGeo_v4', () => new THREE.CylinderGeometry(
    cfg.frame.lowerCollarRadius,
    cfg.frame.lowerCollarRadius * 1.06,
    0.014,
    24
  ));
  const lowerCollar = new THREE.Mesh(collarGeo, materials.joint);
  lowerCollar.position.set(0, -0.251, 0);
  lowerCollar.castShadow = true;
  frameGroup.add(lowerCollar);

  // Upper receiver sleeve mating collar to lower spine
  const receiverSleeveGeo = geoCache.get('Shin_ReceiverSleeveGeo_v4', () => new THREE.CylinderGeometry(0.0245, 0.0245, 0.008, 24));
  const receiverSleeve = new THREE.Mesh(receiverSleeveGeo, materials.joint);
  receiverSleeve.position.set(0, -0.241, 0);
  receiverSleeve.castShadow = true;
  frameGroup.add(receiverSleeve);

  // Stepped lower clevis flange directly capping the ankle clevis
  const lowerLipGeo = geoCache.get('Shin_LowerLipGeo_v4', () => new THREE.CylinderGeometry(
    cfg.frame.lowerCollarRadius * 1.06,
    cfg.frame.lowerCollarRadius * 1.08,
    0.004,
    24
  ));
  const lowerLip = new THREE.Mesh(lowerLipGeo, materials.joint);
  lowerLip.position.set(0, -0.258, 0);
  lowerLip.castShadow = true;
  frameGroup.add(lowerLip);

  // Polished metallic docking trim rim catching specular highlights at the junction
  const collarTrimGeo = geoCache.get('Shin_CollarTrimGeo_v4', () => new THREE.CylinderGeometry(0.0272, 0.0272, 0.003, 24));
  const collarTrim = new THREE.Mesh(collarTrimGeo, materials.metallic);
  collarTrim.position.set(0, -0.245, 0);
  collarTrim.castShadow = true;
  metallicGroup.add(collarTrim);

  // Perimeter hex socket fastener screws on the collar ring
  const collarBoltGeo = geoCache.get('Shin_CollarBoltGeo_v4', () => new THREE.CylinderGeometry(0.0016, 0.0016, 0.0025, 6));
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const bolt = new THREE.Mesh(collarBoltGeo, materials.joint);
    bolt.rotation.x = Math.PI / 2;
    bolt.rotation.z = angle;
    bolt.position.set(
      Math.sin(angle) * (cfg.frame.lowerCollarRadius * 1.02),
      -0.251,
      Math.cos(angle) * (cfg.frame.lowerCollarRadius * 1.02)
    );
    frameGroup.add(bolt);
  }

  // Sleek low-profile structural fibula reinforcement ribs integrated directly onto the titanium tibia frame
  const fibulaRibGeo = geoCache.get('Shin_FibulaRibGeo_v5', () => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.0035, 0.028);
    shape.lineTo(0.0035, 0.028);
    shape.lineTo(0.0045, -0.028);
    shape.lineTo(-0.0045, -0.028);
    shape.closePath();

    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.0035,
      bevelEnabled: true,
      bevelThickness: 0.0010,
      bevelSize: 0.0010,
      bevelSegments: 2,
    });
    g.center();
    return g;
  });

  for (const sSide of [-1, 1]) {
    const sX = sSide * 0.018;
    const sZ = -0.003;
    const rib = new THREE.Mesh(fibulaRibGeo, materials.joint);
    rib.position.set(sX, -0.214, sZ);
    rib.castShadow = true;
    frameGroup.add(rib);
  }

  // Achilles damper upper mounting bracket (on rear of lower shin frame)
  const achillesBracketGeo = geoCache.get('Shin_AchillesBracketGeo_v3', () => new THREE.BoxGeometry(0.014, 0.018, 0.016));
  const achillesBracket = new THREE.Mesh(achillesBracketGeo, materials.joint);
  achillesBracket.position.set(0, -0.210, -cfg.frame.spineDepth * 0.5 - 0.008);
  achillesBracket.castShadow = true;
  frameGroup.add(achillesBracket);

  const achillesPinGeo = geoCache.get('Shin_AchillesPinGeo_v3', () => new THREE.CylinderGeometry(0.0022, 0.0022, 0.018, 12));
  const achillesPin = new THREE.Mesh(achillesPinGeo, materials.metallic);
  achillesPin.rotation.z = Math.PI / 2;
  achillesPin.position.set(0, -0.210, -cfg.frame.spineDepth * 0.5 - 0.012);
  metallicGroup.add(achillesPin);

  const mergedFrame = mergeGroupMeshesByMaterial(
    frameGroup,
    materials.joint,
    side === -1 ? 'ShinFrame_Merged_L' : 'ShinFrame_Merged_R',
    true
  ) || tibiaSkeleton;

  const mergedShinMetallic = mergeGroupMeshesByMaterial(
    metallicGroup,
    materials.metallic,
    side === -1 ? 'ShinMetallic_Merged_L' : 'ShinMetallic_Merged_R',
    true
  );
  if (mergedShinMetallic) {
    shinGroup.add(mergedShinMetallic);
  }

  // =========================================================================
  // 3. SEGMENTED SCULPTED ANTERIOR SHIN KEEL ARMOR
  // Mounted directly under the knee with calibrated mechanical clearance
  // =========================================================================
  const keelGeo = geoCache.get('Shin_KeelGeo_v4', () => createSegmentedKeelGeometry(
    cfg.anteriorKeel.widthTop,
    cfg.anteriorKeel.widthBottom,
    cfg.anteriorKeel.length,
    cfg.anteriorKeel.thickness,
    cfg.anteriorKeel.keelProtrusion
  ));
  const anteriorKeelArmor = new THREE.Mesh(keelGeo, materials.armor);
  anteriorKeelArmor.name = side === -1 ? 'ShinAnteriorKeel_L' : 'ShinAnteriorKeel_R';
  anteriorKeelArmor.position.set(
    0,
    -0.130,
    cfg.frame.spineDepth * 0.5 + cfg.anteriorKeel.thickness * 0.4
  );
  anteriorKeelArmor.castShadow = true;
  anteriorKeelArmor.receiveShadow = true;
  shinGroup.add(anteriorKeelArmor);

  // Longitudinal purple neon LED strip along the front keel crest with metallic bezel
  const keelFrontZ = cfg.anteriorKeel.thickness * 0.5;
  const ledY = 0.012;
  const ledBezelGeo = geoCache.get('Shin_LedBezelGeo_v4', () => new THREE.BoxGeometry(cfg.ledStrip.width * 1.8, cfg.ledStrip.length, cfg.ledStrip.depth * 1.4));
  const ledBezel = new THREE.Mesh(ledBezelGeo, materials.joint);
  ledBezel.position.set(0, ledY, keelFrontZ + 0.0010);
  anteriorKeelArmor.add(ledBezel);

  const ledGeo = geoCache.get('Shin_LedGeo_v4', () => new THREE.BoxGeometry(cfg.ledStrip.width, cfg.ledStrip.length, cfg.ledStrip.depth));
  const ledStrip = new THREE.Mesh(ledGeo, materials.purpleEmissive);
  ledStrip.name = side === -1 ? 'ShinLedStrip_L' : 'ShinLedStrip_R';
  ledStrip.position.set(0, ledY, keelFrontZ + 0.0022);
  anteriorKeelArmor.add(ledStrip);
  ledMeshes.push(ledStrip);

  const coreGeo = geoCache.get('Shin_CoreGeo_v4', () => new THREE.BoxGeometry(cfg.ledStrip.width * 0.5, cfg.ledStrip.length * 0.96, cfg.ledStrip.depth * 0.6));
  const coreMesh = new THREE.Mesh(coreGeo, materials.whiteCoreEmissive);
  coreMesh.position.set(0, ledY, keelFrontZ + 0.0028);
  anteriorKeelArmor.add(coreMesh);

  const bloomGeo = geoCache.get('Shin_BloomGeo_v4', () => new THREE.BoxGeometry(
    cfg.ledStrip.width * 2.0,
    cfg.ledStrip.length,
    cfg.ledStrip.depth * 1.5
  ));
  const bloomMesh = new THREE.Mesh(bloomGeo, materials.purpleBloom);
  bloomMesh.position.copy(ledStrip.position);
  anteriorKeelArmor.add(bloomMesh);

  // =========================================================================
  // 4. POSTERIOR CALF MUSCLE ARMOR FAIRING & COOLING LOUVERS
  // =========================================================================
  const calfGeo = geoCache.get('Shin_CalfGeo_v3', () => createPosteriorCalfGeometry(
    cfg.posteriorCalf.width,
    cfg.posteriorCalf.height,
    cfg.posteriorCalf.depth
  ));
  const posteriorCalfArmor = new THREE.Mesh(calfGeo, materials.armor);
  posteriorCalfArmor.name = side === -1 ? 'CalfArmor_L' : 'CalfArmor_R';
  posteriorCalfArmor.position.set(0, -0.096, -cfg.frame.spineDepth * 0.5 - 0.008);
  posteriorCalfArmor.rotation.y = Math.PI;
  posteriorCalfArmor.castShadow = true;
  posteriorCalfArmor.receiveShadow = true;
  shinGroup.add(posteriorCalfArmor);

  // Calf cooling vents
  const ventCount = cfg.posteriorCalf.ventCount;
  const ventGroup = new THREE.Group();
  const ventGlowGroup = new THREE.Group();

  const louverGeo = geoCache.get('Shin_LouverGeo_v3', () => new THREE.BoxGeometry(cfg.posteriorCalf.ventWidth, cfg.posteriorCalf.ventHeight, 0.006));
  const glowGeo = geoCache.get('Shin_GlowGeo_v3', () => new THREE.BoxGeometry(cfg.posteriorCalf.ventWidth * 0.75, 0.0014, 0.002));
  for (let i = 0; i < ventCount; i++) {
    const localY = 0.020 - i * 0.016;

    const louver = new THREE.Mesh(louverGeo, materials.joint);
    louver.position.set(0, localY, cfg.posteriorCalf.depth * 0.5 + 0.004);
    louver.rotation.x = 0.28;
    louver.castShadow = true;
    ventGroup.add(louver);
    calfVents.push(louver);

    const glowMesh = new THREE.Mesh(glowGeo, materials.purpleEmissive);
    glowMesh.position.set(0, localY - 0.001, cfg.posteriorCalf.depth * 0.5 + 0.003);
    ventGlowGroup.add(glowMesh);
  }

  const mergedVents = mergeGroupMeshesByMaterial(
    ventGroup,
    materials.joint,
    side === -1 ? 'CalfVents_L' : 'CalfVents_R',
    true
  );
  if (mergedVents) {
    posteriorCalfArmor.add(mergedVents);
  }

  const mergedGlow = mergeGroupMeshesByMaterial(
    ventGlowGroup,
    materials.purpleEmissive,
    side === -1 ? 'CalfGlows_L' : 'CalfGlows_R',
    false
  );
  if (mergedGlow) {
    posteriorCalfArmor.add(mergedGlow);
    ledMeshes.push(mergedGlow);
  }

  // =========================================================================
  // 5. ANKLE ARTICULATION PIVOT (At distal end of shin)
  // =========================================================================
  const anklePivot = new THREE.Group();
  anklePivot.name = side === -1 ? 'LeftAnklePivot' : 'RightAnklePivot';
  anklePivot.position.set(0, -0.266, 0);
  shinGroup.add(anklePivot);

  return {
    group: shinGroup,
    tibiaSkeleton: mergedFrame,
    fibulaStrut: mergedFrame,
    anteriorKeelArmor,
    posteriorCalfArmor,
    calfVents,
    ledStrip,
    anklePivot,
    ledMeshes,
  };
}

import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { LEG_CONFIG } from './LegConfig';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger';
import { geoCache } from '../utils/GeometryCache';

export interface ThighNodes {
  group: THREE.Group;
  femurSkeleton: THREE.Mesh;
  trochanterHood: THREE.Mesh;
  anteriorArmor: THREE.Mesh;
  lateralArmor: THREE.Mesh;
  medialArmor: THREE.Mesh;
  posteriorPlate: THREE.Mesh;
  ledStrip: THREE.Mesh;
  kneePivot: THREE.Group;
  ledMeshes: THREE.Mesh[];
}

/**
 * Creates the multi-faceted segmented white ceramic anterior quad armor plate.
 * Features:
 * - Controlled athletic taper: broader at upper thigh, tapering gracefully toward knee
 * - Aerodynamic central keel ridge with 35° chamfered lateral/medial facets
 * - Recessed longitudinal and transverse panel seams catching specular highlights
 * - Open suprapatellar articulation arch leaving calibrated 5mm clearance above the knee
 * - Substantial composite armor thickness with precision bevels
 */
function createSegmentedAnteriorArmorGeometry(
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

  // Engineered quad plate silhouette with controlled taper and suprapatellar arch
  shape.moveTo(0, halfL);
  shape.quadraticCurveTo(halfWT * 0.55, halfL - 0.004, halfWT * 0.90, halfL - 0.015);
  shape.quadraticCurveTo(halfWT * 1.04, halfL * 0.35, halfWT * 0.96, 0);
  shape.quadraticCurveTo(halfWT * 0.88, -halfL * 0.45, halfWB * 1.06, -halfL * 0.78);
  shape.lineTo(halfWB, -halfL);
  // Suprapatellar articulation arch - curves upward to guarantee knee flexion clearance
  shape.quadraticCurveTo(halfWB * 0.45, -halfL + 0.016, 0, -halfL + 0.018);
  shape.quadraticCurveTo(-halfWB * 0.45, -halfL + 0.016, -halfWB, -halfL);
  // Symmetrical return
  shape.lineTo(-halfWB * 1.06, -halfL * 0.78);
  shape.quadraticCurveTo(-halfWT * 0.88, -halfL * 0.45, -halfWT * 0.96, 0);
  shape.quadraticCurveTo(-halfWT * 1.04, halfL * 0.35, -halfWT * 0.90, -halfL * 0.015);
  shape.quadraticCurveTo(-halfWT * 0.55, halfL - 0.004, 0, halfL);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.0038,
    bevelSize: 0.0030,
    bevelSegments: 4,
    curveSegments: 28,
  });
  geo.center();

  // Multi-faceted 3D Sculpting:
  // 1. Central longitudinal keel ridge peaking along x = 0
  // 2. Chamfered lateral facets
  // 3. Recessed maintenance panel seams
  // 4. Flank curvature wrapping backward toward the structural frame
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    if (z > 0) {
      const nx = Math.min(1.0, Math.abs(x) / halfWT);
      const keel = (1.0 - Math.pow(nx, 1.35)) * keelProtrusion;
      const yNorm = (y + halfL) / length;
      const muscleBulge = Math.sin(yNorm * Math.PI * 0.92) * 0.0055;
      const flankWrap = -Math.pow(nx, 1.8) * 0.007;

      // Recessed panel seam lines along longitudinal facet boundaries and mid-height service groove
      const isFacetSeam = Math.abs(Math.abs(x) - halfWT * 0.48) < 0.0016 && Math.abs(y) < halfL * 0.85;
      const isServiceSeam = Math.abs(y - halfL * 0.18) < 0.0014 && Math.abs(x) > halfWT * 0.22;
      const seamIndent = (isFacetSeam || isServiceSeam) ? -0.0015 : 0;

      pos.setZ(i, z + keel + muscleBulge + flankWrap + seamIndent);
    } else {
      const nx = Math.min(1.0, Math.abs(x) / halfWT);
      pos.setZ(i, z - Math.pow(nx, 2.0) * 0.004);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates the sculpted flank armor cowl (lateral vastus lateralis & medial protector).
 * Oriented with absolute bilateral symmetry:
 * - Anterior high facet consistently meets anterior quad armor at +Z
 * - Posterior lower facet meets hamstring cover at -Z
 * - Supracondylar relief arch cleanly frames the knee rotary condyle disc at -Y
 * - Subtle recessed panel line dividing upper and lower sections
 */
function createThighFlankArmorGeometry(
  length: number,
  width: number,
  thickness: number,
  facingSign: 1 | -1
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfW = width * 0.5;
  const halfL = length * 0.5;

  const antDir = facingSign === -1 ? 1 : -1;
  const antZ = antDir * halfW * 0.72;
  const postZ = -antDir * halfW * 0.68;

  shape.moveTo(antZ, halfL); // Anterior upper corner
  shape.lineTo(postZ, halfL * 0.88); // Posterior upper slope
  shape.quadraticCurveTo(-antDir * halfW * 1.02, 0, -antDir * halfW * 0.65, -halfL * 0.85);
  shape.lineTo(-antDir * halfW * 0.50, -halfL);
  // Supracondylar relief arch — curves upward to cleanly frame the rotary condyle bearing
  shape.quadraticCurveTo(0, -halfL + 0.012, antDir * halfW * 0.50, -halfL);
  shape.lineTo(antDir * halfW * 0.65, -halfL * 0.85);
  shape.quadraticCurveTo(antDir * halfW * 1.02, 0, antZ, halfL);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.0030,
    bevelSize: 0.0024,
    bevelSegments: 3,
    curveSegments: 24,
  });
  geo.center();

  // Subtle curved hard-surface flank contour with recessed horizontal divide seam
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i);

    if (z > 0) {
      const isSeam = Math.abs(y - halfL * 0.05) < 0.0015;
      const seamIndent = isSeam ? -0.0014 : 0;
      const flankCrown = Math.cos((y / halfL) * Math.PI * 0.45) * 0.0024;
      pos.setZ(i, z + flankCrown + seamIndent);
    }
  }

  // Pure 3D rigid rotation: maps 2D shape so exterior crowned face faces facingSign * X and anterior faces +Z
  geo.rotateY((facingSign * Math.PI) / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates the sculpted white ceramic posterior hamstring armor cowl.
 * Features a unified, continuous hard-surface armor shell wrapping the rear femur
 * spine with bilateral symmetry, chamfered lateral facets, subtle vertical panel seam,
 * and a lower popliteal relief arch providing clean knee articulation clearance.
 */
function createUnifiedHamstringArmorGeometry(
  length: number,
  width: number,
  thickness: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfW = width * 0.5;
  const halfL = length * 0.5;

  shape.moveTo(-halfW * 0.70, halfL);
  shape.lineTo(halfW * 0.70, halfL);
  shape.quadraticCurveTo(halfW * 1.02, halfL * 0.40, halfW * 0.95, 0);
  shape.quadraticCurveTo(halfW * 0.88, -halfL * 0.45, halfW * 0.65, -halfL * 0.82);
  shape.lineTo(halfW * 0.42, -halfL);
  // Deep sculpted popliteal relief arch above knee (clears rear condyles cleanly)
  shape.quadraticCurveTo(halfW * 0.22, -halfL + 0.022, 0, -halfL + 0.025);
  shape.quadraticCurveTo(-halfW * 0.22, -halfL + 0.022, -halfW * 0.42, -halfL);
  shape.lineTo(-halfW * 0.60, -halfL * 0.80);
  shape.quadraticCurveTo(-halfW * 0.88, -halfL * 0.45, -halfW * 0.95, 0);
  shape.quadraticCurveTo(-halfW * 1.02, halfL * 0.40, -halfW * 0.70, halfL);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.0028,
    bevelSize: 0.0022,
    bevelSegments: 3,
    curveSegments: 24,
  });
  geo.center();

  // Curvature wrapping toward the femur spine and flank cowls with subtle midline seam
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (z > 0) {
      const crown = Math.cos((y / halfL) * Math.PI * 0.40) * 0.0030;
      const wrap = -Math.pow(Math.abs(x) / halfW, 1.8) * 0.0038;
      const isSeam = Math.abs(x) < 0.0012 && Math.abs(y) < halfL * 0.88;
      const seamIndent = isSeam ? -0.0014 : 0;
      pos.setZ(i, z + crown + wrap + seamIndent);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates the articulated white ceramic trochanter armor cowl wrapping the upper femur neck.
 * Bridges the cylindrical hip socket flange smoothly down into the anterior quad plate,
 * eliminating bare rectangular neck gaps while preserving mechanical clearance.
 */
function createTrochanterArmorGeometry(
  radius: number,
  height: number,
  thickness: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfH = height * 0.5;
  const halfW = radius * 1.05;

  // Sleek faceted mecha trochanter cowl cupping the hip socket
  shape.moveTo(0, halfH);
  shape.quadraticCurveTo(halfW * 0.95, halfH - 0.004, halfW, halfH * 0.35);
  shape.lineTo(halfW * 0.82, -halfH * 0.65);
  shape.quadraticCurveTo(halfW * 0.45, -halfH, 0, -halfH + 0.004);
  shape.quadraticCurveTo(-halfW * 0.45, -halfH, -halfW * 0.82, -halfH * 0.65);
  shape.lineTo(-halfW, halfH * 0.35);
  shape.quadraticCurveTo(-halfW * 0.95, halfH - 0.004, 0, halfH);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.0030,
    bevelSize: 0.0022,
    bevelSegments: 3,
    curveSegments: 24,
  });
  geo.center();

  // Gentle 3D cylindrical curvature wrapping the femur collar
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const wrap = Math.cos((x / halfW) * (Math.PI * 0.45)) * 0.0055;
    pos.setZ(i, z + wrap);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * REBUILDS THE VISIBLE THIGH:
 *
 *   HIP MOUNT YOKE
 *          │
 *          ▼
 * ┌────────────────────────┐
 * │ UPPER THIGH COLLAR     │ (Titanium Socket Collar, Trochanter Armor Shell)
 * └──────────┬─────────────┘
 *            │
 * ┌──────────▼─────────────┐
 * │ STRUCTURAL FEMUR CHASSIS│ (Titanium Spine, CNC Pockets, Distal Fork Interface)
 * └──────────┬─────────────┘
 *            │
 *       ┌────▼────┐
 *       │  ARMOR  │ (Segmented White Ceramic Quad Plate, Flank Cowls & Unified Hamstring Shell)
 *       │  SHELL  │ (Precision-fit armor over structural titanium backbone)
 *       └────┬────┘
 *            │
 *            ▼
 *       KNEE JOINT
 */
export function createThigh(
  side: -1 | 1,
  materials: RobotMaterialPalette
): ThighNodes {
  const thighGroup = new THREE.Group();
  thighGroup.name = side === -1 ? 'LeftThigh' : 'RightThigh';

  const cfg = LEG_CONFIG.thigh;
  const ledMeshes: THREE.Mesh[] = [];

  // Group containing the load-bearing titanium frame components
  const frameGroup = new THREE.Group();
  frameGroup.name = side === -1 ? 'ThighFrame_L' : 'ThighFrame_R';
  thighGroup.add(frameGroup);

  // =========================================================================
  // 1. ENGINEERED UPPER THIGH COLLAR (Receives Hip Mount Spigot Sleeve Cleanly)
  // Consolidated receiving collar sleeve with zero duplicate overlapping flanges
  // =========================================================================
  const collarSocketGeo = geoCache.get('Thigh_CollarSocketGeo_v3', () => new THREE.CylinderGeometry(
    cfg.frame.upperCollarRadius * 0.96,
    cfg.frame.upperCollarRadius * 0.92,
    cfg.frame.upperCollarHeight * 0.65,
    28
  ));
  const collarSocket = new THREE.Mesh(collarSocketGeo, materials.joint);
  collarSocket.position.set(0, -cfg.frame.upperCollarHeight * 0.45, 0);
  collarSocket.castShadow = true;
  collarSocket.receiveShadow = true;
  frameGroup.add(collarSocket);

  // Upper trochanteric neck gusset bridging collar to spine and eliminating hollow gaps
  const neckBridgeGeo = geoCache.get('Thigh_NeckBridgeGeo_v5', () => new THREE.BoxGeometry(
    cfg.frame.spineWidth * 0.96,
    0.028,
    cfg.frame.spineDepth * 0.88
  ));
  const neckBridge = new THREE.Mesh(neckBridgeGeo, materials.joint);
  neckBridge.position.set(0, -cfg.frame.upperCollarHeight * 0.85, 0);
  neckBridge.castShadow = true;
  frameGroup.add(neckBridge);

  // =========================================================================
  // 2. CENTRAL TITANIUM BOX-SECTION BACKBONE SPINE & CNC POCKETS
  // Continuous load-bearing column running directly to the distal mount
  // =========================================================================
  const spineGeo = geoCache.get('Thigh_SpineGeo_v3', () => new THREE.BoxGeometry(
    cfg.frame.spineWidth,
    0.175,
    cfg.frame.spineDepth
  ));
  const spineMesh = new THREE.Mesh(spineGeo, materials.joint);
  spineMesh.position.set(0, -0.1035, 0);
  spineMesh.castShadow = true;
  spineMesh.receiveShadow = true;
  frameGroup.add(spineMesh);

  // =========================================================================
  // 3. DISTAL FEMUR FRAME INTERFACE & DUAL-SHEAR KNEE FORK
  // Precision-machined titanium interface mount cradling the knee upper housing
  // =========================================================================
  const distalMountGeo = geoCache.get('Thigh_DistalMountGeo_v3', () => {
    const mountShape = new THREE.Shape();
    const halfMW = (cfg.frame.spineWidth * 1.05) * 0.5;
    const halfMD = (cfg.frame.spineDepth * 0.90) * 0.5;
    mountShape.moveTo(-halfMW * 0.85, -halfMD);
    mountShape.lineTo(halfMW * 0.85, -halfMD);
    mountShape.lineTo(halfMW, -halfMD * 0.70);
    mountShape.lineTo(halfMW, halfMD * 0.70);
    mountShape.lineTo(halfMW * 0.85, halfMD);
    mountShape.lineTo(-halfMW * 0.85, halfMD);
    mountShape.lineTo(-halfMW, halfMD * 0.70);
    mountShape.lineTo(-halfMW, -halfMD * 0.70);
    mountShape.closePath();

    const g = new THREE.ExtrudeGeometry(mountShape, {
      depth: 0.018,
      bevelEnabled: true,
      bevelThickness: 0.0018,
      bevelSize: 0.0014,
      bevelSegments: 2,
    });
    g.center();
    return g;
  });

  const distalMount = new THREE.Mesh(distalMountGeo, materials.joint);
  distalMount.rotation.x = Math.PI / 2;
  distalMount.position.set(0, -0.200, 0);
  distalMount.castShadow = true;
  distalMount.receiveShadow = true;
  frameGroup.add(distalMount);

  // Dual-shear clevis fork ears cradling the knee upper housing
  const forkEarGeo = geoCache.get('Thigh_ForkEarGeo_v3', () => new THREE.BoxGeometry(0.006, 0.022, 0.026));
  for (const fSide of [-1, 1]) {
    const ear = new THREE.Mesh(forkEarGeo, materials.joint);
    ear.position.set(fSide * (cfg.frame.spineWidth * 0.44), -0.214, 0);
    ear.castShadow = true;
    frameGroup.add(ear);

    // Cross-clamp bolt through clevis fork ear
    const forkBoltGeo = geoCache.get('Thigh_ForkBoltGeo_v3', () => new THREE.CylinderGeometry(0.0020, 0.0020, 0.008, 6));
    const forkBolt = new THREE.Mesh(forkBoltGeo, materials.joint);
    forkBolt.rotation.z = Math.PI / 2;
    forkBolt.position.set(fSide * (cfg.frame.spineWidth * 0.44), -0.216, 0);
    frameGroup.add(forkBolt);
  }

  // Armor mounting standoffs/bosses along the spine
  const bossGeo = geoCache.get('Thigh_BossGeo_v3', () => new THREE.CylinderGeometry(0.0042, 0.0042, 0.018, 12));
  for (const bY of [-0.058, -0.108, -0.158]) {
    const boss = new THREE.Mesh(bossGeo, materials.joint);
    boss.rotation.x = Math.PI / 2;
    boss.position.set(0, bY, cfg.frame.spineDepth * 0.5 + 0.005);
    frameGroup.add(boss);
  }

  const mergedFrame = mergeGroupMeshesByMaterial(
    frameGroup,
    materials.joint,
    side === -1 ? 'ThighFrame_Merged_L' : 'ThighFrame_Merged_R',
    true
  ) || spineMesh;

  // =========================================================================
  // 4. ENGINEERED WHITE CERAMIC TROCHANTER SHELL COLLAR
  // Sculpted transition cowl cupping upper femur neck and bridging hip flange into quad armor
  // =========================================================================
  const trochanterGeo = geoCache.get('Thigh_TrochanterGeo_v5', () => createTrochanterArmorGeometry(
    cfg.frame.upperCollarRadius,
    cfg.trochanter?.height ?? 0.052,
    cfg.trochanter?.thickness ?? 0.015
  ));
  const trochanterHood = new THREE.Mesh(trochanterGeo, materials.armor);
  trochanterHood.name = side === -1 ? 'TrochanterHood_L' : 'TrochanterHood_R';
  trochanterHood.position.set(
    side * (cfg.frame.upperCollarRadius * 0.52),
    -cfg.frame.upperCollarHeight * 0.82,
    cfg.frame.spineDepth * 0.36
  );
  trochanterHood.rotation.y = side * -0.20;
  trochanterHood.rotation.x = -0.05;
  trochanterHood.castShadow = true;
  trochanterHood.receiveShadow = true;
  thighGroup.add(trochanterHood);

  // =========================================================================
  // 5. SEGMENTED SCULPTED WHITE CERAMIC ANTERIOR QUAD ARMOR
  // Segmented length: leaves visible frame & calibrated 5mm clearance above knee
  // =========================================================================
  const antGeo = geoCache.get('Thigh_AnteriorArmorGeo_v4', () => createSegmentedAnteriorArmorGeometry(
    cfg.anteriorArmor.widthTop,
    cfg.anteriorArmor.widthBottom,
    cfg.anteriorArmor.length,
    cfg.anteriorArmor.thickness,
    cfg.anteriorArmor.keelProtrusion
  ));
  const anteriorArmor = new THREE.Mesh(antGeo, materials.armor);
  anteriorArmor.name = side === -1 ? 'ThighAnteriorArmor_L' : 'ThighAnteriorArmor_R';
  // Positioned so suprapatellar arch cleanly clears patella by calibrated 5.0mm
  anteriorArmor.position.set(
    0,
    -0.119,
    cfg.frame.spineDepth * 0.5 + cfg.anteriorArmor.thickness * 0.4
  );
  anteriorArmor.castShadow = true;
  anteriorArmor.receiveShadow = true;
  thighGroup.add(anteriorArmor);

  // =========================================================================
  // 6. SCULPTED LATERAL ARMOR COWL (Vastus Lateralis) WITH PURPLE LED CONDUIT
  // =========================================================================
  const latFacing: 1 | -1 = side === -1 ? -1 : 1;
  const latGeo = geoCache.get(`Thigh_LateralArmorGeo_v4_${side}`, () => createThighFlankArmorGeometry(
    cfg.lateralArmor.cowlLength,
    cfg.lateralArmor.width,
    cfg.lateralArmor.thickness,
    latFacing
  ));
  const lateralArmor = new THREE.Mesh(latGeo, materials.armor);
  lateralArmor.name = side === -1 ? 'ThighLateralArmor_L' : 'ThighLateralArmor_R';
  lateralArmor.position.set(
    side * (cfg.frame.spineWidth * 0.5 + cfg.lateralArmor.thickness * 0.5),
    -0.130,
    0.002
  );
  lateralArmor.rotation.set(0, 0, 0);
  lateralArmor.castShadow = true;
  lateralArmor.receiveShadow = true;
  thighGroup.add(lateralArmor);

  // Recessed purple neon LED conduit along the outer crowned lateral armor face
  const ledGeo = geoCache.get('Thigh_LedGeo_v4', () => new THREE.BoxGeometry(cfg.ledStrip.width, cfg.ledStrip.length, cfg.ledStrip.depth));
  const ledStrip = new THREE.Mesh(ledGeo, materials.purpleEmissive);
  ledStrip.name = side === -1 ? 'ThighLedStrip_L' : 'ThighLedStrip_R';
  ledStrip.position.set(
    side * (cfg.lateralArmor.thickness * 0.5 + 0.001),
    0,
    0.002
  );
  lateralArmor.add(ledStrip);
  ledMeshes.push(ledStrip);

  // Subtle bloom glow
  const bloomGeo = geoCache.get('Thigh_BloomGeo_v4', () => new THREE.BoxGeometry(
    cfg.ledStrip.width * 2.0,
    cfg.ledStrip.length,
    cfg.ledStrip.depth * 1.5
  ));
  const bloomMesh = new THREE.Mesh(bloomGeo, materials.purpleBloom);
  bloomMesh.position.copy(ledStrip.position);
  lateralArmor.add(bloomMesh);

  // =========================================================================
  // 7. MEDIAL PROTECTOR PLATE
  // Preserves inner leg clearance while shielding internal wiring
  // =========================================================================
  const medFacing: 1 | -1 = side === -1 ? 1 : -1;
  const medGeo = geoCache.get(`Thigh_MedialArmorGeo_v4_${side}`, () => createThighFlankArmorGeometry(
    cfg.medialArmor.cowlLength,
    cfg.medialArmor.width,
    cfg.medialArmor.thickness,
    medFacing
  ));
  const medialArmor = new THREE.Mesh(medGeo, materials.armor);
  medialArmor.name = side === -1 ? 'ThighMedialArmor_L' : 'ThighMedialArmor_R';
  medialArmor.position.set(
    -side * (cfg.frame.spineWidth * 0.5 + cfg.medialArmor.thickness * 0.5),
    -0.130,
    0.002
  );
  medialArmor.rotation.set(0, 0, 0);
  medialArmor.castShadow = true;
  medialArmor.receiveShadow = true;
  thighGroup.add(medialArmor);

  // =========================================================================
  // 8. UNIFIED SCULPTED WHITE CERAMIC POSTERIOR HAMSTRING ARMOR
  // Consolidates fragmented rear plates into a clean, cohesive rear armor shell
  // =========================================================================
  const hamCfg = cfg.posteriorHamstring || { width: 0.052, length: 0.122, thickness: 0.014 };
  const unifiedHamWidth = cfg.frame.spineWidth * 1.38;
  const hamGeo = geoCache.get('Thigh_UnifiedHamstringGeo_v5', () => createUnifiedHamstringArmorGeometry(
    hamCfg.length,
    unifiedHamWidth,
    hamCfg.thickness
  ));

  const posteriorPlate = new THREE.Mesh(hamGeo, materials.armor);
  posteriorPlate.name = side === -1 ? 'ThighPosteriorPlate_L' : 'ThighPosteriorPlate_R';
  posteriorPlate.position.set(
    0,
    -0.124,
    -cfg.frame.spineDepth * 0.5 - hamCfg.thickness * 0.40
  );
  // Face rearward so the sculpted midline panel seam and popliteal arch face the rear camera
  posteriorPlate.rotation.y = Math.PI;
  posteriorPlate.castShadow = true;
  posteriorPlate.receiveShadow = true;
  thighGroup.add(posteriorPlate);

  // =========================================================================
  // 9. DISTAL KNEE ARTICULATION PIVOT (Attached hierarchically at knee axis)
  // Perfectly positioned so knee upper housing meets distalMount with zero gap
  // and patella shield nests right into the suprapatellar arch cutout
  // =========================================================================
  const kneePivot = new THREE.Group();
  kneePivot.name = side === -1 ? 'KneePivot_L' : 'KneePivot_R';
  kneePivot.position.set(0, -0.2316, 0);
  thighGroup.add(kneePivot);

  return {
    group: thighGroup,
    femurSkeleton: mergedFrame,
    trochanterHood,
    anteriorArmor,
    lateralArmor,
    medialArmor,
    posteriorPlate,
    ledStrip,
    kneePivot,
    ledMeshes,
  };
}

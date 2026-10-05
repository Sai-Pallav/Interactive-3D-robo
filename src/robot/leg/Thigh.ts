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
 * - Open suprapatellar articulation arch leaving generous clearance above the knee
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
  shape.quadraticCurveTo(halfWT * 0.55, halfL - 0.005, halfWT * 0.90, halfL - 0.018);
  shape.quadraticCurveTo(halfWT * 1.04, halfL * 0.35, halfWT * 0.96, 0);
  shape.quadraticCurveTo(halfWT * 0.88, -halfL * 0.45, halfWB * 1.06, -halfL * 0.78);
  shape.lineTo(halfWB, -halfL);
  // Suprapatellar articulation arch - curves upward to guarantee knee flexion clearance
  shape.quadraticCurveTo(halfWB * 0.45, -halfL + 0.020, 0, -halfL + 0.022);
  shape.quadraticCurveTo(-halfWB * 0.45, -halfL + 0.020, -halfWB, -halfL);
  // Symmetrical return
  shape.lineTo(-halfWB * 1.06, -halfL * 0.78);
  shape.quadraticCurveTo(-halfWT * 0.88, -halfL * 0.45, -halfWT * 0.96, 0);
  shape.quadraticCurveTo(-halfWT * 1.04, halfL * 0.35, -halfWT * 0.90, -halfL * 0.018);
  shape.quadraticCurveTo(-halfWT * 0.55, halfL - 0.005, 0, halfL);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.0042,
    bevelSize: 0.0034,
    bevelSegments: 4,
    curveSegments: 28,
  });
  geo.center();

  // Multi-faceted 3D Sculpting:
  // 1. Central longitudinal keel ridge peaking along x = 0
  // 2. Chamfered lateral facets
  // 3. Flank curvature wrapping backward toward the structural frame
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    if (z > 0) {
      const nx = Math.min(1.0, Math.abs(x) / halfWT);
      const keel = (1.0 - Math.pow(nx, 1.35)) * keelProtrusion;
      const yNorm = (y + halfL) / length;
      const muscleBulge = Math.sin(yNorm * Math.PI * 0.92) * 0.006;
      const flankWrap = -Math.pow(nx, 1.8) * 0.008;
      pos.setZ(i, z + keel + muscleBulge + flankWrap);
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
 */
function createThighFlankArmorGeometry(
  length: number,
  width: number,
  thickness: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfW = width * 0.5;
  const halfL = length * 0.5;

  // In 2D shape coordinates:
  // +X is ANTERIOR (+Z in local 3D thigh frame)
  // -X is POSTERIOR (-Z in local 3D thigh frame)
  // +Y is SUPERIOR (+Y in local 3D thigh frame)
  // -Y is INFERIOR (-Y in local 3D thigh frame)
  const antZ = halfW * 0.72;
  const postZ = -halfW * 0.68;

  shape.moveTo(antZ, halfL); // Anterior upper corner
  shape.lineTo(postZ, halfL * 0.88); // Posterior upper slope
  shape.quadraticCurveTo(-halfW * 1.02, 0, -halfW * 0.65, -halfL * 0.85);
  shape.lineTo(-halfW * 0.50, -halfL);
  // Supracondylar relief arch — curves upward to cleanly frame the rotary condyle bearing
  shape.quadraticCurveTo(0, -halfL + 0.012, halfW * 0.50, -halfL);
  shape.lineTo(halfW * 0.65, -halfL * 0.85);
  shape.quadraticCurveTo(halfW * 1.02, 0, antZ, halfL);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.0032,
    bevelSize: 0.0026,
    bevelSegments: 3,
    curveSegments: 24,
  });
  geo.center();

  // Rotate so 2D +X maps directly to 3D +Z (anterior) and 2D thickness maps along X
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates the articulated white ceramic trochanter armor cowl wrapping the upper femur neck.
 * Bridges the cylindrical hip socket flange smoothly down into the anterior quad plate,
 * eliminating bare rectangular neck gaps while preserving mechanical clearance.
 */
function createTrochanterArmorGeometry(
  side: -1 | 1,
  radius: number,
  height: number,
  thickness: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfH = height * 0.5;
  const halfW = radius * 1.08;

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
    bevelThickness: 0.0032,
    bevelSize: 0.0024,
    bevelSegments: 3,
    curveSegments: 24,
  });
  geo.center();

  // Gentle 3D cylindrical curvature wrapping the femur collar
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const wrap = Math.cos((x / halfW) * (Math.PI * 0.45)) * 0.006;
    pos.setZ(i, z + wrap);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * REBUILDS THE VISIBLE THIGH (RULES #1, #2, #3):
 *
 *   HIP MOUNT YOKE
 *          │
 *          ▼
 * ┌────────────────────────┐
 * │ UPPER THIGH COLLAR     │ (Titanium Socket Flange, Bolts, Trochanter Shell)
 * └──────────┬─────────────┘
 *            │
 * ┌──────────▼─────────────┐
 * │ STRUCTURAL FEMUR CHASSIS│ (Titanium Spine, Transverse Ribs, Distal Fork)
 * └──────────┬─────────────┘
 *            │
 *       ┌────▼────┐
 *       │  ARMOR  │ (Segmented White Ceramic Quad Plate & Flank Cowls)
 *       │  SHELL  │ (Mounted around chassis; exposes ~60mm frame & knee clearance)
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

  // Group containing secondary static armor parts
  const staticArmorGroup = new THREE.Group();
  staticArmorGroup.name = side === -1 ? 'ThighStaticArmorGroup_L' : 'ThighStaticArmorGroup_R';

  // =========================================================================
  // 1. ENGINEERED UPPER THIGH COLLAR (Direct Mechanical Bridge from Hip Mount)
  // =========================================================================

  // A. Titanium Receiving Socket Flange (Bolts flush to Hip Mount Flange)
  const collarSocketGeo = geoCache.get('Thigh_CollarSocketGeo', () => new THREE.CylinderGeometry(
    cfg.frame.upperCollarRadius * 1.08,
    cfg.frame.upperCollarRadius * 1.02,
    cfg.frame.upperCollarHeight * 0.45,
    28
  ));
  const collarSocket = new THREE.Mesh(collarSocketGeo, materials.joint);
  collarSocket.position.set(0, -cfg.frame.upperCollarHeight * 0.22, 0);
  collarSocket.castShadow = true;
  collarSocket.receiveShadow = true;
  frameGroup.add(collarSocket);

  // Perimeter coupling bolts through the receiving flange
  const boltGeo = geoCache.get('Thigh_FlangeBoltGeo', () => new THREE.CylinderGeometry(0.0020, 0.0020, 0.004, 6));
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const bolt = new THREE.Mesh(boltGeo, materials.joint);
    bolt.position.set(
      Math.cos(angle) * (cfg.frame.upperCollarRadius * 0.96),
      -0.002,
      Math.sin(angle) * (cfg.frame.upperCollarRadius * 0.96)
    );
    frameGroup.add(bolt);
  }

  // B. Lower Clamping Sleeve (Clamps the titanium femur spine)
  const lowerCollarGeo = geoCache.get('Thigh_LowerCollarGeo', () => new THREE.CylinderGeometry(
    cfg.frame.upperCollarRadius * 0.98,
    cfg.frame.upperCollarRadius * 0.92,
    cfg.frame.upperCollarHeight * 0.55,
    28
  ));
  const lowerCollar = new THREE.Mesh(lowerCollarGeo, materials.joint);
  lowerCollar.position.set(0, -cfg.frame.upperCollarHeight * 0.72, 0);
  lowerCollar.castShadow = true;
  lowerCollar.receiveShadow = true;
  frameGroup.add(lowerCollar);

  // Structural diagonal side gussets (outriggers transferring torque to femur flanks)
  const gussetGeo = geoCache.get('Thigh_GussetGeo', () => new THREE.BoxGeometry(0.006, 0.024, 0.018));
  for (const bSide of [-1, 1]) {
    const gusset = new THREE.Mesh(gussetGeo, materials.joint);
    gusset.position.set(
      bSide * (cfg.frame.upperCollarRadius * 0.85),
      -cfg.frame.upperCollarHeight * 0.65,
      0
    );
    gusset.castShadow = true;
    frameGroup.add(gusset);
  }

  // =========================================================================
  // 2. CENTRAL TITANIUM BOX-SECTION BACKBONE SPINE
  // Continuous load-bearing column running directly to the distal mount
  // =========================================================================
  const spineGeo = geoCache.get('Thigh_SpineGeo', () => new THREE.BoxGeometry(
    cfg.frame.spineWidth,
    0.204,
    cfg.frame.spineDepth
  ));
  const spineMesh = new THREE.Mesh(spineGeo, materials.joint);
  spineMesh.position.set(0, -0.118, 0);
  spineMesh.castShadow = true;
  spineMesh.receiveShadow = true;
  frameGroup.add(spineMesh);

  // CNC transverse reinforcement bulkheads along the femur spine
  const ribGeo = geoCache.get('Thigh_BulkheadRibGeo', () => new THREE.BoxGeometry(
    cfg.frame.spineWidth * 1.25,
    0.007,
    cfg.frame.spineDepth * 1.15
  ));
  for (const bY of [-0.050, -0.095, -0.140, -0.185]) {
    const rib = new THREE.Mesh(ribGeo, materials.joint);
    rib.position.set(0, bY, 0);
    rib.castShadow = true;
    frameGroup.add(rib);
  }

  // =========================================================================
  // 3. DISTAL FEMUR FRAME INTERFACE
  // Precision-machined titanium interface mount with chamfers meeting knee upper housing
  // =========================================================================
  const distalMountGeo = geoCache.get('Thigh_DistalMountGeo', () => {
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
      depth: 0.016,
      bevelEnabled: true,
      bevelThickness: 0.0016,
      bevelSize: 0.0012,
      bevelSegments: 2,
    });
    g.center();
    return g;
  });

  const distalMount = new THREE.Mesh(distalMountGeo, materials.joint);
  distalMount.rotation.x = Math.PI / 2;
  distalMount.position.set(0, -0.228, 0);
  distalMount.castShadow = true;
  distalMount.receiveShadow = true;
  frameGroup.add(distalMount);

  // Armor mounting standoffs/bosses along the spine
  const bossGeo = geoCache.get('Thigh_BossGeo', () => new THREE.CylinderGeometry(0.0045, 0.0045, 0.018, 12));
  for (const bY of [-0.065, -0.125, -0.185]) {
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
  const trochanterGeo = geoCache.get('Thigh_TrochanterGeo', () => createTrochanterArmorGeometry(
    side,
    cfg.frame.upperCollarRadius,
    0.036,
    0.012
  ));
  const trochanterHood = new THREE.Mesh(trochanterGeo, materials.armor);
  trochanterHood.name = side === -1 ? 'TrochanterHood_L' : 'TrochanterHood_R';
  trochanterHood.position.set(
    side * (cfg.frame.upperCollarRadius * 0.28),
    -cfg.frame.upperCollarHeight * 0.95,
    cfg.frame.spineDepth * 0.42
  );
  trochanterHood.rotation.y = side * -0.16;
  trochanterHood.rotation.x = -0.06;
  trochanterHood.castShadow = true;
  trochanterHood.receiveShadow = true;
  staticArmorGroup.add(trochanterHood);

  // =========================================================================
  // 5. SEGMENTED SCULPTED WHITE CERAMIC ANTERIOR QUAD ARMOR
  // Segmented length: leaves ~60mm of visible frame & clearance above knee!
  // =========================================================================
  const antGeo = geoCache.get('Thigh_AnteriorArmorGeo', () => createSegmentedAnteriorArmorGeometry(
    cfg.anteriorArmor.widthTop,
    cfg.anteriorArmor.widthBottom,
    cfg.anteriorArmor.length,
    cfg.anteriorArmor.thickness,
    cfg.anteriorArmor.keelProtrusion
  ));
  const anteriorArmor = new THREE.Mesh(antGeo, materials.armor);
  anteriorArmor.name = side === -1 ? 'ThighAnteriorArmor_L' : 'ThighAnteriorArmor_R';
  // Positioned over the spine standoffs, leaving upper collar and lower fork exposed
  anteriorArmor.position.set(
    0,
    -cfg.length * 0.48,
    cfg.frame.spineDepth * 0.5 + cfg.anteriorArmor.thickness * 0.4
  );
  anteriorArmor.castShadow = true;
  anteriorArmor.receiveShadow = true;
  thighGroup.add(anteriorArmor);

  // =========================================================================
  // 6. SCULPTED LATERAL ARMOR COWL (Vastus Lateralis)
  // Mounted flush to outer flank with verified bilateral mirror symmetry
  // =========================================================================
  const latGeo = geoCache.get('Thigh_LateralArmorGeo', () => createThighFlankArmorGeometry(
    cfg.lateralArmor.cowlLength,
    cfg.lateralArmor.width,
    cfg.lateralArmor.thickness
  ));
  const lateralArmor = new THREE.Mesh(latGeo, materials.armor);
  lateralArmor.name = side === -1 ? 'ThighLateralArmor_L' : 'ThighLateralArmor_R';
  lateralArmor.position.set(
    side * (cfg.frame.spineWidth * 0.5 + cfg.lateralArmor.thickness * 0.5),
    -cfg.length * 0.48,
    0.002
  );
  lateralArmor.rotation.set(0, 0, 0);
  lateralArmor.castShadow = true;
  lateralArmor.receiveShadow = true;
  thighGroup.add(lateralArmor);

  // Recessed purple neon LED conduit along the lateral armor edge
  const ledGeo = geoCache.get('Thigh_LedGeo', () => new THREE.BoxGeometry(cfg.ledStrip.width, cfg.ledStrip.length, cfg.ledStrip.depth));
  const ledStrip = new THREE.Mesh(ledGeo, materials.purpleEmissive);
  ledStrip.name = side === -1 ? 'ThighLedStrip_L' : 'ThighLedStrip_R';
  ledStrip.position.set(
    side * (cfg.frame.spineWidth * 0.5 + cfg.lateralArmor.thickness * 0.8),
    -cfg.length * 0.48,
    0.004
  );
  thighGroup.add(ledStrip);
  ledMeshes.push(ledStrip);

  // Subtle bloom glow
  const bloomGeo = geoCache.get('Thigh_BloomGeo', () => new THREE.BoxGeometry(
    cfg.ledStrip.width * 2.0,
    cfg.ledStrip.length,
    cfg.ledStrip.depth * 1.5
  ));
  const bloomMesh = new THREE.Mesh(bloomGeo, materials.purpleBloom);
  bloomMesh.position.copy(ledStrip.position);
  thighGroup.add(bloomMesh);

  // =========================================================================
  // 7. MEDIAL PROTECTOR PLATE
  // Preserves inner leg clearance while shielding internal wiring
  // =========================================================================
  const medGeo = geoCache.get('Thigh_MedialArmorGeo', () => createThighFlankArmorGeometry(
    cfg.medialArmor.cowlLength,
    cfg.medialArmor.width,
    cfg.medialArmor.thickness
  ));
  const medialArmor = new THREE.Mesh(medGeo, materials.armor);
  medialArmor.name = side === -1 ? 'ThighMedialArmor_L' : 'ThighMedialArmor_R';
  medialArmor.position.set(
    -side * (cfg.frame.spineWidth * 0.5 + cfg.medialArmor.thickness * 0.5),
    -cfg.length * 0.48,
    0.002
  );
  medialArmor.rotation.set(0, 0, 0);
  staticArmorGroup.add(medialArmor);

  // =========================================================================
  // 8. POSTERIOR HAMSTRING COVER PLATE
  // =========================================================================
  const postGeo = geoCache.get('Thigh_PosteriorPlateGeo', () => {
    const postShape = new THREE.Shape();
    const postH = cfg.anteriorArmor.length * 0.38;
    postShape.moveTo(-0.020, postH);
    postShape.lineTo(0.020, postH);
    postShape.lineTo(0.016, -postH);
    postShape.lineTo(-0.016, -postH);
    postShape.closePath();

    const g = new THREE.ExtrudeGeometry(postShape, {
      depth: 0.010,
      bevelEnabled: true,
      bevelThickness: 0.0025,
      bevelSize: 0.0020,
      bevelSegments: 2,
    });
    g.center();
    return g;
  });

  const posteriorPlate = new THREE.Mesh(postGeo, materials.armor);
  posteriorPlate.name = side === -1 ? 'ThighPosteriorPlate_L' : 'ThighPosteriorPlate_R';
  posteriorPlate.position.set(0, -cfg.length * 0.48, -cfg.frame.spineDepth * 0.5 - 0.005);
  staticArmorGroup.add(posteriorPlate);

  const mergedStaticArmor = mergeGroupMeshesByMaterial(
    staticArmorGroup,
    materials.armor,
    side === -1 ? 'ThighStaticArmor_L' : 'ThighStaticArmor_R',
    false,
    true
  ) || trochanterHood;
  thighGroup.add(mergedStaticArmor);

  // =========================================================================
  // 9. DISTAL KNEE ARTICULATION PIVOT (Attached hierarchically at knee axis)
  // Perfectly positioned so knee upper housing meets distalMount with zero gap
  // and patella shield nests right into the suprapatellar arch cutout
  // =========================================================================
  const kneePivot = new THREE.Group();
  kneePivot.name = side === -1 ? 'KneePivot_L' : 'KneePivot_R';
  kneePivot.position.set(0, -0.2596, 0);
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

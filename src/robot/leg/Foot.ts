import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { LEG_CONFIG } from './LegConfig';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger';
import { geoCache } from '../utils/GeometryCache';

export interface FootNodes {
  group: THREE.Group;
  soleChassis: THREE.Mesh;
  dorsalArmor: THREE.Mesh;
  toePivot: THREE.Group;
  toeArmor: THREE.Mesh;
  heelArmor: THREE.Mesh;
  heelThruster: THREE.Mesh;
  treadPads: THREE.Mesh[];
  underglowStrip: THREE.Mesh;
  ledMeshes: THREE.Mesh[];
}

/**
 * Creates the aerodynamic sculpted white ceramic foot armor body shell.
 * Features:
 * - Solid 3D casing extending all the way down to the sole chassis
 * - Continuous lateral and medial flank walls with recessed runner light grooves
 * - Ergonomic dorsal bridge with central deflector crest and forward slope
 * - Semicircular cradle framing the ankle gimbal collar
 * - Precision rear heel deck supporting the Achilles damper clevis mount
 */
function createDorsalArmorGeometry(
  width: number,
  heelOffset: number,
  toeJunctionZ: number,
  deckHeight: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const hw = width * 0.5;

  // 2D footprint profile in XZ plane
  shape.moveTo(-hw * 0.72, heelOffset);
  shape.lineTo(hw * 0.72, heelOffset);
  shape.quadraticCurveTo(hw * 0.85, 0.0, hw * 0.95, 0.042);
  shape.quadraticCurveTo(hw * 0.98, 0.060, hw * 0.78, toeJunctionZ);
  shape.lineTo(-hw * 0.78, toeJunctionZ);
  shape.quadraticCurveTo(-hw * 0.98, 0.060, -hw * 0.95, 0.042);
  shape.quadraticCurveTo(-hw * 0.85, 0.0, -hw * 0.72, heelOffset);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: deckHeight,
    bevelEnabled: true,
    bevelThickness: 0.0022,
    bevelSize: 0.0018,
    bevelSegments: 3,
    curveSegments: 28,
  });

  // Rotate so 2D (x, y) becomes 3D (x, z), and extrusion depth becomes Y (upward)
  geo.rotateX(Math.PI / 2);
  geo.translate(0, deckHeight, 0);

  // Sculpt vertices
  const pos = geo.attributes.position;
  const topY = deckHeight;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    if (y > topY * 0.4) {
      // Upper deck
      let newY = topY;
      const nx = Math.min(1.0, Math.abs(x) / hw);

      if (z > 0.016) {
        // Forward bridge sloping down toward toe
        const zNorm = Math.min(1.0, (z - 0.016) / (toeJunctionZ - 0.016));
        newY = topY - zNorm * 0.0080;
        // Central deflector crest
        const crest = Math.pow(1.0 - nx, 1.3) * 0.0035;
        // Chamfered flank drop
        const flankDrop = -Math.pow(nx, 1.8) * 0.0025;
        newY += crest + flankDrop;
      } else if (z < -0.016) {
        // Rear heel deck
        const zNorm = Math.min(1.0, (-0.016 - z) / (-0.016 - (heelOffset + 0.004)));
        newY = topY - 0.0030 - zNorm * 0.0020;
        const flankDrop = -Math.pow(nx, 1.8) * 0.0020;
        newY += flankDrop;
      } else {
        // Ankle cradle region
        const saddleDish = -Math.cos((z / 0.016) * Math.PI * 0.5) * 0.0022;
        newY += saddleDish;
      }
      pos.setY(i, newY);
    }
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates the sculpted white ceramic toe cap armor shield with beveled facets.
 */
function createToeCapGeometry(
  width: number,
  length: number,
  height: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfW = width * 0.5;

  // Angular, beveled mecha toe silhouette matching technical wireframe
  shape.moveTo(-halfW * 0.88, -length * 0.5);
  shape.lineTo(halfW * 0.88, -length * 0.5);
  shape.lineTo(halfW * 0.95, -length * 0.10);
  shape.lineTo(halfW * 0.72, length * 0.38);
  shape.lineTo(halfW * 0.45, length * 0.50);
  shape.lineTo(-halfW * 0.45, length * 0.50);
  shape.lineTo(-halfW * 0.72, length * 0.38);
  shape.lineTo(-halfW * 0.95, -length * 0.10);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.0028,
    bevelSize: 0.0022,
    bevelSegments: 3,
    curveSegments: 24,
  });
  geo.center();
  return geo;
}

/**
 * Creates the complete Robotic Foot & Boot assembly:
 * - Layered construction: high-traction sole, structural chassis, dorsal armor, toe guard, heel counter
 * - High-traction dark titanium sole chassis with multi-segment tread pads
 * - Ground-effect violet neon underglow along the sole perimeter
 * - Sculpted white ceramic dorsal metatarsal armor shield with panel seams and fasteners
 * - Articulated toe cap guard for natural floor planting
 * - Rear heel counter with Achilles clevis bracket and micro-thruster exhaust nozzle
 */
export function createFoot(
  side: -1 | 1,
  materials: RobotMaterialPalette
): FootNodes {
  const footGroup = new THREE.Group();
  footGroup.name = side === -1 ? 'LeftFoot' : 'RightFoot';

  const cfg = LEG_CONFIG.foot;
  const ledMeshes: THREE.Mesh[] = [];
  const treadPads: THREE.Mesh[] = [];

  // Group containing stationary joint components (sole, chassis, tread, thruster)
  const footJointGroup = new THREE.Group();
  footJointGroup.name = side === -1 ? 'FootJointCore_L' : 'FootJointCore_R';
  footGroup.add(footJointGroup);

  // Group containing metallic sub-assemblies
  const footMetallicGroup = new THREE.Group();
  footMetallicGroup.name = side === -1 ? 'FootMetallic_L' : 'FootMetallic_R';
  footGroup.add(footMetallicGroup);

  // ==========================================
  // 1. LAYER 1: SOLE CHASSIS (Dark Titanium Structural Base)
  // ==========================================
  const halfW = cfg.width * 0.5;

  const soleGeo = geoCache.get('Foot_SoleGeo_v3', () => {
    const soleShape = new THREE.Shape();
    soleShape.moveTo(-halfW * 0.75, cfg.heelOffset);
    soleShape.lineTo(halfW * 0.75, cfg.heelOffset);
    soleShape.quadraticCurveTo(halfW * 0.85, 0, halfW, cfg.toeOffset * 0.55);
    soleShape.quadraticCurveTo(halfW * 0.95, cfg.toeOffset * 0.90, halfW * 0.65, cfg.toeOffset);
    soleShape.lineTo(-halfW * 0.65, cfg.toeOffset);
    soleShape.quadraticCurveTo(-halfW * 0.95, cfg.toeOffset * 0.90, -halfW, cfg.toeOffset * 0.55);
    soleShape.quadraticCurveTo(-halfW * 0.85, 0, -halfW * 0.75, cfg.heelOffset);
    soleShape.closePath();

    const g = new THREE.ExtrudeGeometry(soleShape, {
      depth: cfg.soleThickness,
      bevelEnabled: true,
      bevelThickness: 0.0025,
      bevelSize: 0.0020,
      bevelSegments: 2,
      curveSegments: 24,
    });
    g.center();
    return g;
  });

  const soleChassis = new THREE.Mesh(soleGeo, materials.joint);
  soleChassis.name = side === -1 ? 'FootSole_L' : 'FootSole_R';
  soleChassis.rotation.x = Math.PI / 2;
  soleChassis.position.set(0, -cfg.height + cfg.soleThickness * 0.5, (cfg.toeOffset + cfg.heelOffset) * 0.5);
  soleChassis.castShadow = true;
  soleChassis.receiveShadow = true;
  footJointGroup.add(soleChassis);

  // ==========================================
  // 2. LAYER 2: SEGMENTED TREAD PADS (High-grip textured sole elements)
  // Distinct heel strike block, midfoot lateral stabilizer, and forefoot grip pads
  // ==========================================
  const padCount = cfg.treadPadsCount;
  const padSpacing = (cfg.toeOffset - cfg.heelOffset) / (padCount + 1);
  for (let i = 0; i < padCount; i++) {
    const padZ = cfg.heelOffset + (i + 1) * padSpacing;
    const padW = cfg.width * (0.65 + Math.sin((i / padCount) * Math.PI) * 0.25);
    const padGeo = geoCache.get(`Foot_PadGeo_v3_${i}`, () => new THREE.BoxGeometry(padW, 0.0028, padSpacing * 0.55));
    const pad = new THREE.Mesh(padGeo, materials.joint);
    pad.position.set(0, -cfg.height + 0.0014, padZ);
    pad.castShadow = true;
    footJointGroup.add(pad);
    treadPads.push(pad);

    // Tread siping grooves
    const sipeGeo = geoCache.get(`Foot_SipeGeo_v3_${i}`, () => new THREE.BoxGeometry(padW * 0.85, 0.0010, 0.0012));
    const sipe = new THREE.Mesh(sipeGeo, materials.joint);
    sipe.position.set(0, -cfg.height + 0.0005, padZ);
    footJointGroup.add(sipe);
  }

  // ==========================================
  // 3. LAYER 3: INTERNAL STRUCTURAL CHASSIS & ANKLE RECEIVER
  // Dark titanium skeleton bridging ankle gimbal to sole, heel, and toe pivot
  // ==========================================
  const chassisBoxGeo = geoCache.get('Foot_ChassisBoxGeo_v5', () => new THREE.BoxGeometry(
    cfg.width * 0.56,
    cfg.height * 0.35,
    cfg.length * 0.50
  ));
  const innerChassis = new THREE.Mesh(chassisBoxGeo, materials.joint);
  innerChassis.position.set(0, -cfg.height * 0.65, 0.014);
  innerChassis.castShadow = true;
  footJointGroup.add(innerChassis);

  // Precision-machined Ankle Gimbal Receiver Socket Collar
  const ankleSocketGeo = geoCache.get('Foot_AnkleSocketGeo_v5', () => new THREE.CylinderGeometry(
    cfg.width * 0.34,
    cfg.width * 0.38,
    0.012,
    24
  ));
  const ankleSocket = new THREE.Mesh(ankleSocketGeo, materials.joint);
  ankleSocket.position.set(0, -cfg.height * 0.36, 0);
  ankleSocket.castShadow = true;
  footJointGroup.add(ankleSocket);

  // Socket metallic trim ring
  const socketTrimGeo = geoCache.get('Foot_SocketTrimGeo_v5', () => new THREE.TorusGeometry(
    cfg.width * 0.35,
    0.0016,
    8,
    24
  ));
  const socketTrim = new THREE.Mesh(socketTrimGeo, materials.metallic);
  socketTrim.rotation.x = Math.PI / 2;
  socketTrim.position.set(0, -cfg.height * 0.30, 0);
  footMetallicGroup.add(socketTrim);

  // ==========================================
  // 4. GROUND-EFFECT PURPLE NEON UNDERGLOW STRIP
  // ==========================================
  const underglowGeo = geoCache.get('Foot_UnderglowGeo_v3', () => {
    const underglowShape = new THREE.Shape();
    const ugW = halfW * 0.92;
    underglowShape.moveTo(-ugW * 0.75, cfg.heelOffset + 0.004);
    underglowShape.lineTo(ugW * 0.75, cfg.heelOffset + 0.004);
    underglowShape.lineTo(ugW, cfg.toeOffset * 0.55);
    underglowShape.lineTo(ugW * 0.65, cfg.toeOffset - 0.004);
    underglowShape.lineTo(-ugW * 0.65, cfg.toeOffset - 0.004);
    underglowShape.lineTo(-ugW, cfg.toeOffset * 0.55);
    underglowShape.closePath();

    const ugHole = new THREE.Path();
    const ugIW = halfW * 0.82;
    ugHole.moveTo(-ugIW * 0.75, cfg.heelOffset + 0.008);
    ugHole.lineTo(ugIW * 0.75, cfg.heelOffset + 0.008);
    ugHole.lineTo(ugIW, cfg.toeOffset * 0.55);
    ugHole.lineTo(ugIW * 0.65, cfg.toeOffset - 0.008);
    ugHole.lineTo(-ugIW * 0.65, cfg.toeOffset - 0.008);
    ugHole.lineTo(-ugIW, cfg.toeOffset * 0.55);
    ugHole.closePath();
    underglowShape.holes.push(ugHole);

    const g = new THREE.ExtrudeGeometry(underglowShape, {
      depth: 0.0022,
      bevelEnabled: false,
      curveSegments: 16,
    });
    g.center();
    return g;
  });

  const tempFootLeds = new THREE.Group();

  const underglowStripRaw = new THREE.Mesh(underglowGeo, materials.purpleEmissive);
  underglowStripRaw.rotation.x = Math.PI / 2;
  underglowStripRaw.position.set(0, -cfg.height + 0.002, (cfg.toeOffset + cfg.heelOffset) * 0.5);
  tempFootLeds.add(underglowStripRaw);

  // Soft purple bloom ground reflection mesh
  const ugBloomGeo = geoCache.get('Foot_UgBloomGeo_v3', () => new THREE.PlaneGeometry(cfg.width * 1.3, cfg.length * 1.15));
  const ugBloom = new THREE.Mesh(ugBloomGeo, materials.purpleBloom);
  ugBloom.rotation.x = -Math.PI / 2;
  ugBloom.position.set(0, -cfg.height + 0.0005, (cfg.toeOffset + cfg.heelOffset) * 0.5);
  footGroup.add(ugBloom);

  // ==========================================
  // 5. LAYER 4: SCULPTED WHITE CERAMIC FOOT ARMOR BODY
  // ==========================================
  const deckHeight = 0.021;
  const dorsalGeo = geoCache.get('Foot_DorsalGeo_v7', () => createDorsalArmorGeometry(
    cfg.width,
    cfg.heelOffset,
    cfg.toeOffset * 0.65,
    deckHeight
  ));
  const dorsalArmor = new THREE.Mesh(dorsalGeo, materials.armor);
  dorsalArmor.name = side === -1 ? 'FootDorsalArmor_L' : 'FootDorsalArmor_R';
  // Base sits flush on top of the sole chassis (-cfg.height + cfg.soleThickness)
  dorsalArmor.position.set(0, -cfg.height + cfg.soleThickness, 0);
  dorsalArmor.castShadow = true;
  dorsalArmor.receiveShadow = true;
  footGroup.add(dorsalArmor);

  // Tech groove with purple LED strip across dorsal armor with metallic bezel
  const dLedY = deckHeight - 0.004;
  const dLedZ = 0.046;
  const dLedBezelGeo = geoCache.get('Foot_DLedBezelGeo_v6', () => new THREE.BoxGeometry(0.0042, 0.0022, 0.046));
  const dLedBezel = new THREE.Mesh(dLedBezelGeo, materials.joint);
  dLedBezel.position.set(0, dLedY, dLedZ);
  dLedBezel.rotation.x = -0.14; // Matches forward deck slope
  dorsalArmor.add(dLedBezel);

  const dorsalLedGeo = geoCache.get('Foot_DorsalLedGeo_v6', () => new THREE.BoxGeometry(0.0028, 0.0020, 0.044));
  const dorsalLed = new THREE.Mesh(dorsalLedGeo, materials.purpleEmissive);
  dorsalLed.position.set(0, dLedY + 0.0006, dLedZ);
  dorsalLed.rotation.x = -0.14;
  dorsalArmor.add(dorsalLed);
  ledMeshes.push(dorsalLed);

  const dorsalCoreGeo = geoCache.get('Foot_DorsalCoreGeo_v6', () => new THREE.BoxGeometry(0.0014, 0.0015, 0.040));
  const dorsalCore = new THREE.Mesh(dorsalCoreGeo, materials.whiteCoreEmissive);
  dorsalCore.position.set(0, dLedY + 0.0012, dLedZ);
  dorsalCore.rotation.x = -0.14;
  dorsalArmor.add(dorsalCore);

  // Lateral and Medial Ground-Effect Violet Neon Runner Strips embedded along lower foot armor
  const latAccentCfg = (cfg as any).lateralAccent ?? { width: 0.0024, length: 0.088, depth: 0.0022 };
  const latAccentGeo = geoCache.get('Foot_LatAccentGeo_v7', () => new THREE.BoxGeometry(
    latAccentCfg.depth,
    latAccentCfg.width,
    latAccentCfg.length
  ));
  const latBezelGeo = geoCache.get('Foot_LatBezelGeo_v7', () => new THREE.BoxGeometry(
    latAccentCfg.depth * 1.5,
    latAccentCfg.width * 1.7,
    latAccentCfg.length * 1.04
  ));

  for (const fSide of [-1, 1]) {
    const latX = fSide * (halfW * 0.92);
    const latBezel = new THREE.Mesh(latBezelGeo, materials.joint);
    latBezel.position.set(
      latX,
      -cfg.height + cfg.soleThickness + 0.0060,
      cfg.heelOffset + latAccentCfg.length * 0.58
    );
    footGroup.add(latBezel);

    const latAccentMesh = new THREE.Mesh(latAccentGeo, materials.purpleEmissive);
    latAccentMesh.name = fSide === -1 ? 'FootLatAccent_L' : 'FootLatAccent_R';
    latAccentMesh.position.set(
      latX + fSide * 0.0014,
      -cfg.height + cfg.soleThickness + 0.0060,
      cfg.heelOffset + latAccentCfg.length * 0.58
    );
    footGroup.add(latAccentMesh);
    ledMeshes.push(latAccentMesh);

    const latBloom = new THREE.Mesh(latAccentGeo, materials.purpleBloom);
    latBloom.position.copy(latAccentMesh.position);
    latBloom.scale.set(1.4, 1.6, 1.0);
    footGroup.add(latBloom);
  }

  // ==========================================
  // 6. LAYER 5: ARTICULATED TOE CAP ARMOR & PIVOT
  // ==========================================
  const toePivot = new THREE.Group();
  toePivot.name = side === -1 ? 'LeftToePivot' : 'RightToePivot';
  toePivot.position.set(0, -cfg.height + 0.010, cfg.toeOffset * 0.65);
  footGroup.add(toePivot);

  // Toe hinge knuckle connecting to foot chassis
  const toeHingeGeo = geoCache.get('Foot_ToeHingeGeo_v5', () => new THREE.CylinderGeometry(0.0042, 0.0042, cfg.toeCap.width * 0.75, 16));
  const toeHinge = new THREE.Mesh(toeHingeGeo, materials.joint);
  toeHinge.rotation.z = Math.PI / 2;
  toeHinge.position.set(0, 0, 0);
  toePivot.add(toeHinge);

  const toeGeo = geoCache.get('Foot_ToeGeo_v6', () => createToeCapGeometry(
    cfg.toeCap.width,
    cfg.toeCap.length,
    cfg.toeCap.height
  ));
  const toeArmor = new THREE.Mesh(toeGeo, materials.armor);
  toeArmor.name = side === -1 ? 'ToeArmor_L' : 'ToeArmor_R';
  toeArmor.rotation.x = Math.PI / 2;
  toeArmor.position.set(0, 0, cfg.toeCap.length * 0.35);
  toeArmor.castShadow = true;
  toeArmor.receiveShadow = true;
  toePivot.add(toeArmor);

  // Front Toe Bumper with Horizontal Recessed Purple Slot LED
  const toeBumperGeo = geoCache.get('Foot_ToeBumperGeo_v6', () => new THREE.BoxGeometry(
    cfg.toeCap.width * 0.62,
    0.006,
    0.004
  ));
  const toeBumper = new THREE.Mesh(toeBumperGeo, materials.joint);
  toeBumper.position.set(0, 0.002, cfg.toeCap.length * 0.65);
  toePivot.add(toeBumper);

  const toeSlotGeo = geoCache.get('Foot_ToeSlotGeo_v5', () => new THREE.BoxGeometry(
    0.022,
    0.0022,
    0.0025
  ));
  const toeLed = new THREE.Mesh(toeSlotGeo, materials.purpleEmissive);
  toeLed.name = side === -1 ? 'FootToeLed_L' : 'FootToeLed_R';
  toeLed.position.set(0, 0.002, cfg.toeCap.length * 0.65 + 0.002);
  toePivot.add(toeLed);
  ledMeshes.push(toeLed);

  const toeBloom = new THREE.Mesh(toeSlotGeo, materials.purpleBloom);
  toeBloom.scale.set(1.4, 1.8, 1.2);
  toeBloom.position.copy(toeLed.position);
  toePivot.add(toeBloom);

  // ==========================================
  // 7. LAYER 6: REAR HEEL COUNTER & MICRO-THRUSTER NOZZLE
  // ==========================================
  const heelAssemblyGroup = new THREE.Group();
  heelAssemblyGroup.name = side === -1 ? 'HeelAssembly_L' : 'HeelAssembly_R';
  footGroup.add(heelAssemblyGroup);

  const heelGeo = geoCache.get('Foot_HeelGeo_v6', () => {
    const heelShape = new THREE.Shape();
    heelShape.moveTo(-halfW * 0.72, 0);
    heelShape.lineTo(halfW * 0.72, 0);
    heelShape.quadraticCurveTo(halfW * 0.68, cfg.height * 0.58, 0, cfg.height * 0.64);
    heelShape.quadraticCurveTo(-halfW * 0.68, cfg.height * 0.58, -halfW * 0.72, 0);
    heelShape.closePath();

    const g = new THREE.ExtrudeGeometry(heelShape, {
      depth: 0.016,
      bevelEnabled: true,
      bevelThickness: 0.0025,
      bevelSize: 0.0020,
      bevelSegments: 2,
    });
    g.center();
    return g;
  });

  // Dark structural heel counter matching technical wireframe FOOT CONNECTOR & ANKLE HOUSING
  const footTargetY = LEG_CONFIG.ankle.achillesDamper.targetY - (-0.016);
  const heelArmor = new THREE.Mesh(heelGeo, materials.joint);
  heelArmor.name = side === -1 ? 'HeelArmor_L' : 'HeelArmor_R';
  heelArmor.position.set(0, footTargetY - 0.004, cfg.heelOffset + 0.004);
  heelArmor.castShadow = true;
  heelAssemblyGroup.add(heelArmor);

  // Achilles damper lower clevis bracket seated neatly atop rear heel platform
  // Aligned precisely with damper piston eyelet in foot local coordinates
  const heelClevisGeo = geoCache.get('Foot_HeelClevisGeo_v7', () => new THREE.BoxGeometry(0.012, 0.016, 0.014));
  const heelClevis = new THREE.Mesh(heelClevisGeo, materials.joint);
  heelClevis.position.set(0, footTargetY, LEG_CONFIG.ankle.achillesDamper.targetZ);
  heelClevis.castShadow = true;
  heelAssemblyGroup.add(heelClevis);

  const heelPinGeo = geoCache.get('Foot_HeelPinGeo_v7', () => new THREE.CylinderGeometry(0.0020, 0.0020, 0.015, 12));
  const heelPin = new THREE.Mesh(heelPinGeo, materials.metallic);
  heelPin.rotation.z = Math.PI / 2;
  heelPin.position.set(0, footTargetY, LEG_CONFIG.ankle.achillesDamper.targetZ);
  heelAssemblyGroup.add(heelPin);

  // Micro-thruster exhaust nozzle at rear heel base
  const thrusterGeo = geoCache.get('Foot_ThrusterGeo_v5', () => new THREE.CylinderGeometry(
    cfg.heelThruster.radius,
    cfg.heelThruster.radius * 1.15,
    cfg.heelThruster.depth,
    24
  ));
  const heelThruster = new THREE.Mesh(thrusterGeo, materials.joint);
  heelThruster.name = side === -1 ? 'HeelThruster_L' : 'HeelThruster_R';
  heelThruster.rotation.x = Math.PI / 2;
  heelThruster.position.set(0, -cfg.height + 0.014, cfg.heelOffset - 0.004);
  heelThruster.castShadow = true;
  heelAssemblyGroup.add(heelThruster);

  // Outer metallic nozzle bezel ring
  const nozzleRimGeo = geoCache.get('Foot_NozzleRimGeo_v5', () => new THREE.TorusGeometry(cfg.heelThruster.radius * 1.10, 0.0015, 8, 24));
  const nozzleRim = new THREE.Mesh(nozzleRimGeo, materials.metallic);
  nozzleRim.position.set(0, -cfg.height + 0.014, cfg.heelOffset - 0.008);
  heelAssemblyGroup.add(nozzleRim);

  // Thruster interior purple glow ring
  const nozzleGlowGeo = geoCache.get('Foot_NozzleGlowGeo_v5', () => new THREE.TorusGeometry(cfg.heelThruster.radius * 0.65, 0.0016, 8, 24));
  const nozzleGlow = new THREE.Mesh(nozzleGlowGeo, materials.purpleEmissive);
  nozzleGlow.position.set(0, -cfg.height + 0.014, cfg.heelOffset - 0.010);
  heelAssemblyGroup.add(nozzleGlow);
  ledMeshes.push(nozzleGlow);

  // Central metallic exhaust cone inside thruster
  const exhaustConeGeo = geoCache.get('Foot_ExhaustConeGeo_v5', () => new THREE.ConeGeometry(cfg.heelThruster.radius * 0.35, 0.005, 12));
  const exhaustCone = new THREE.Mesh(exhaustConeGeo, materials.metallic);
  exhaustCone.rotation.x = -Math.PI / 2;
  exhaustCone.position.set(0, -cfg.height + 0.014, cfg.heelOffset - 0.006);
  heelAssemblyGroup.add(exhaustCone);

  const mergedSole = mergeGroupMeshesByMaterial(footJointGroup, materials.joint, side === -1 ? 'FootJointMesh_L' : 'FootJointMesh_R', true) || soleChassis;

  const mergedFootMetallic = mergeGroupMeshesByMaterial(footMetallicGroup, materials.metallic, side === -1 ? 'FootMetallic_Merged_L' : 'FootMetallic_Merged_R', true);
  if (mergedFootMetallic) {
    footGroup.add(mergedFootMetallic);
  }

  const mergedFootLeds = mergeGroupMeshesByMaterial(tempFootLeds, materials.purpleEmissive, side === -1 ? 'FootLeds_Merged_L' : 'FootLeds_Merged_R', false, false) || underglowStripRaw;
  mergedFootLeds.name = side === -1 ? 'FootUnderglow_L' : 'FootUnderglow_R';
  footGroup.add(mergedFootLeds);
  ledMeshes.push(mergedFootLeds);

  return {
    group: footGroup,
    soleChassis: mergedSole,
    dorsalArmor,
    toePivot,
    toeArmor,
    heelArmor,
    heelThruster: mergedSole,
    treadPads,
    underglowStrip: mergedFootLeds,
    ledMeshes,
  };
}

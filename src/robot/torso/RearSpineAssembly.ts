import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { geoCache } from '../utils/GeometryCache';
import { TORSO_CONFIG } from './TorsoConfig';

export interface RearSpineSegmentNodes {
  group: THREE.Group;
  spinousProcess: THREE.Mesh;
  dorsalShield: THREE.Mesh;
  transverseWings: THREE.Mesh;
  pivotPin: THREE.Mesh;
  cableSaddles: THREE.Mesh[];
}

export interface RearSpineAssemblyNodes {
  segments: RearSpineSegmentNodes[];
  dampersGroup: THREE.Group;
  cableTrunksGroup: THREE.Group;
  ledMeshes: THREE.Mesh[];
}

/**
 * REFINED REAR SPINAL & ACTUATOR ASSEMBLY
 * Senior Mechanical Robotics & Three.js Procedural Modeling Engineering
 *
 * 1. Central Articulated Spine:
 *    - 5 independently articulated vertebral modules with compound beveled ceramic armor plates
 *    - Consistent inter-segment spacing and depth revealing the dark titanium articulation knuckle
 *    - Continuous narrow central structural backbone column with precision metallic bearing races
 *    - Streamlined transverse articulation bosses replacing bulky overlapping wings
 *    - Engineered upper thoracic gimbal collar and lower lumbar trunnion load-transfer knuckle
 *
 * 2. Paired Diagonal Hydraulic Actuators:
 *    - Balanced left-right pair flanking the spine with generous clearance
 *    - Distinct dark titanium cylinder housings, chrome telescoping rods, and machined end caps
 *    - Dual-flange structural clevis brackets with transverse pivot pins anchored into thoracic and lumbar bulkheads
 *    - Restrained, recessed purple optical status indicator bands in metallic bezels
 */
export function createRearSpineAssembly(
  vertebraGroups: THREE.Group[],
  materials: RobotMaterialPalette
): RearSpineAssemblyNodes {
  const ledMeshes: THREE.Mesh[] = [];
  const segments: RearSpineSegmentNodes[] = [];

  const cfg = TORSO_CONFIG.stomach;
  const vertebraCount = cfg.vertebraCount;

  // Shared precision fasteners and hardware
  const boltGeo = geoCache.get('SpineRefinedBoltGeo_v5', () => {
    const g = new THREE.CylinderGeometry(0.0013, 0.0013, 0.0022, 6);
    g.rotateZ(Math.PI / 2);
    return g;
  });

  const pinGeo = geoCache.get('SpineRefinedPinGeo_v5', () => {
    const g = new THREE.CylinderGeometry(0.0025, 0.0025, 0.024, 16);
    g.rotateZ(Math.PI / 2);
    return g;
  });

  // Build the 5 articulated rear vertebral segments
  for (let i = 0; i < vertebraCount; i++) {
    const segGroup = new THREE.Group();
    segGroup.name = `RearVertebraSegment_${String(i + 1).padStart(2, '0')}`;

    // Taper progression from upper thoracic (segment 0) down to lumbar base (segment 4)
    const t = i / (vertebraCount - 1);

    // Refined anatomical proportions
    const plateWidth = 0.046 - t * 0.010; // 0.046 down to 0.036
    const plateHeight = 0.018 - t * 0.002; // 0.018 down to 0.016
    const plateDepth = 0.0065;

    const knuckleWidth = 0.024 - t * 0.004;
    const knuckleHeight = 0.015 - t * 0.002;
    const knuckleDepth = 0.020 - t * 0.003;

    // Smooth continuous rearward trajectory along negative Z
    const zOffset = -0.025 - (1.0 - t * 0.5) * 0.006;

    // =======================================================================
    // 1. Continuous Central Structural Backbone Column (Dark Titanium)
    // =======================================================================
    const colRadius = 0.013 - t * 0.0025;
    const colHeight = 0.024;
    const coreColumnGeo = geoCache.get(`SpineRefinedCoreColGeo_v5_${i}`, () => {
      return new THREE.CylinderGeometry(colRadius, colRadius * 0.96, colHeight, 20);
    });
    const coreColumn = new THREE.Mesh(coreColumnGeo, materials.joint);
    coreColumn.name = `SpineColumnCore_${i + 1}`;
    coreColumn.position.set(0, 0, zOffset + 0.010);
    segGroup.add(coreColumn);

    // Ground metallic bearing race ring for visual depth and mechanical separation
    const raceGeo = geoCache.get(`SpineRefinedRaceGeo_v5_${i}`, () => {
      return new THREE.TorusGeometry(colRadius * 1.05, 0.0009, 6, 20);
    });
    const raceMesh = new THREE.Mesh(raceGeo, materials.metallic);
    raceMesh.rotation.x = Math.PI / 2;
    raceMesh.position.set(0, 0, zOffset + 0.010);
    segGroup.add(raceMesh);

    // =======================================================================
    // 2. Interlocking Articulation Knuckle & Gimbal Clevis Ears
    // =======================================================================
    const spinousShape = new THREE.Shape();
    spinousShape.moveTo(-knuckleWidth * 0.5, knuckleHeight * 0.5);
    spinousShape.lineTo(knuckleWidth * 0.5, knuckleHeight * 0.5);
    spinousShape.lineTo(knuckleWidth * 0.36, -knuckleHeight * 0.5);
    spinousShape.lineTo(-knuckleWidth * 0.36, -knuckleHeight * 0.5);
    spinousShape.closePath();

    const spinousGeo = geoCache.get(`RearRefinedSpinousGeo_v5_${i}`, () => {
      const g = new THREE.ExtrudeGeometry(spinousShape, {
        depth: knuckleDepth,
        bevelEnabled: true,
        bevelThickness: 0.0018,
        bevelSize: 0.0014,
        bevelSegments: 2,
      });
      g.center();
      return g;
    });

    const spinousProcess = new THREE.Mesh(spinousGeo, materials.joint);
    spinousProcess.name = `SpinousProcess_${i + 1}`;
    spinousProcess.position.set(0, 0, zOffset);
    spinousProcess.castShadow = true;
    spinousProcess.receiveShadow = true;
    segGroup.add(spinousProcess);

    // Transverse axle pin through spinous knuckle
    const pivotPin = new THREE.Mesh(pinGeo, materials.metallic);
    pivotPin.position.set(0, 0, zOffset - knuckleDepth * 0.25);
    segGroup.add(pivotPin);

    // Inter-segment elastomeric damper ring between vertebrae
    if (i < vertebraCount - 1) {
      const damperGeo = geoCache.get(`SpineRefinedDamperGeo_v5_${i}`, () => {
        return new THREE.CylinderGeometry(colRadius * 0.82, colRadius * 0.82, 0.006, 16);
      });
      const interDamper = new THREE.Mesh(damperGeo, materials.jointDoubleSide);
      interDamper.position.set(0, -knuckleHeight * 0.5 - 0.003, zOffset + 0.005);
      segGroup.add(interDamper);
    }

    // =======================================================================
    // 3. Sculpted White Ceramic Dorsal Armor Plate (Refined Shape & Bevels)
    // =======================================================================
    const halfW = plateWidth * 0.5;
    const halfH = plateHeight * 0.5;

    const shieldShape = new THREE.Shape();
    // Top crest with subtle chevron peak
    shieldShape.moveTo(-halfW * 0.88, halfH);
    shieldShape.lineTo(-halfW * 0.28, halfH + 0.0010);
    shieldShape.lineTo(0, halfH + 0.0018); // Central apex peak
    shieldShape.lineTo(halfW * 0.28, halfH + 0.0010);
    shieldShape.lineTo(halfW * 0.88, halfH);
    // Chamfered shoulder
    shieldShape.lineTo(halfW, halfH * 0.60);
    // Lateral flank tapering downward
    shieldShape.lineTo(halfW * 0.76, -halfH * 0.60);
    // Bottom chamfer
    shieldShape.lineTo(halfW * 0.62, -halfH);
    // Inferior articulation notch (revealing underlying mechanism)
    shieldShape.lineTo(halfW * 0.22, -halfH + 0.0012);
    shieldShape.lineTo(0, -halfH + 0.0020);
    shieldShape.lineTo(-halfW * 0.22, -halfH + 0.0012);
    shieldShape.lineTo(-halfW * 0.62, -halfH);
    shieldShape.lineTo(-halfW * 0.76, -halfH * 0.60);
    shieldShape.lineTo(-halfW, halfH * 0.60);
    shieldShape.closePath();

    const shieldGeo = geoCache.get(`RearRefinedShieldGeo_v5_${i}`, () => {
      const g = new THREE.ExtrudeGeometry(shieldShape, {
        depth: plateDepth,
        bevelEnabled: true,
        bevelThickness: 0.0016,
        bevelSize: 0.0014,
        bevelSegments: 3,
      });
      g.center();
      return g;
    });

    const dorsalShield = new THREE.Mesh(shieldGeo, materials.armorDoubleSide);
    dorsalShield.name = `DorsalSpineShield_${i + 1}`;
    dorsalShield.position.set(0, 0, zOffset - knuckleDepth * 0.5 - plateDepth * 0.5);
    dorsalShield.castShadow = true;
    dorsalShield.receiveShadow = true;
    segGroup.add(dorsalShield);

    // Central countersunk hex fastener retaining the plate into the titanium knuckle
    const shieldBoltGeo = geoCache.get('SpineRefinedShieldBoltGeo_v5', () => {
      const g = new THREE.CylinderGeometry(0.0014, 0.0014, 0.0018, 6);
      g.rotateX(Math.PI / 2);
      return g;
    });
    const shieldBolt = new THREE.Mesh(shieldBoltGeo, materials.metallic);
    shieldBolt.position.set(0, 0, zOffset - knuckleDepth * 0.5 - plateDepth - 0.0008);
    segGroup.add(shieldBolt);

    // =======================================================================
    // 4. Streamlined Transverse Articulation Bosses (Compact & Clean)
    // =======================================================================
    const bossSpan = plateWidth * 0.95;
    const bossGeo = geoCache.get(`TransverseBossGeo_v5_${i}`, () => {
      return new THREE.BoxGeometry(bossSpan, 0.006, 0.010);
    });
    const transverseWings = new THREE.Mesh(bossGeo, materials.joint);
    transverseWings.name = `TransverseBosses_${i + 1}`;
    transverseWings.position.set(0, 0, zOffset + 0.004);
    transverseWings.castShadow = true;
    segGroup.add(transverseWings);

    // Cable saddles on lateral flanks of the knuckle
    const cableSaddles: THREE.Mesh[] = [];
    const saddleGeo = geoCache.get('SpineRefinedSaddleGeo_v5', () => new THREE.BoxGeometry(0.0035, 0.005, 0.005));
    for (const sSide of [-1, 1] as const) {
      const saddle = new THREE.Mesh(saddleGeo, materials.metallic);
      saddle.position.set(sSide * (knuckleWidth * 0.5 + 0.004), 0, zOffset);
      segGroup.add(saddle);
      cableSaddles.push(saddle);
    }

    // =======================================================================
    // 5. Upper Thoracic Transition Docking Tongue (Segment 0)
    // =======================================================================
    if (i === 0) {
      const thoracicDockGeo = geoCache.get('SpineThoracicDockGeo_v5', () => new THREE.BoxGeometry(0.024, 0.020, 0.022));
      const thoracicDock = new THREE.Mesh(thoracicDockGeo, materials.jointDoubleSide);
      thoracicDock.name = 'SpineThoracicDockTongue';
      thoracicDock.position.set(0, 0.020, -0.056);
      segGroup.add(thoracicDock);

      const dockPin = new THREE.Mesh(pinGeo, materials.metallicDoubleSide);
      dockPin.position.set(0, 0.020, -0.056);
      segGroup.add(dockPin);

      // Articulated gimbal transition collar wrapping the junction
      const collarGimbalGeo = geoCache.get('SpineThoracicGimbalCollarGeo_v5', () => {
        return new THREE.CylinderGeometry(0.018, 0.020, 0.014, 24);
      });
      const gimbalCollar = new THREE.Mesh(collarGimbalGeo, materials.jointDoubleSide);
      gimbalCollar.position.set(0, 0.016, -0.054);
      segGroup.add(gimbalCollar);
    }

    // =======================================================================
    // 6. Lower Lumbar Load-Transfer Docking Trunnion (Segment 4)
    // =======================================================================
    if (i === vertebraCount - 1) {
      const lumbarDockGeo = geoCache.get('SpineLumbarDockGeo_v5', () => {
        const g = new THREE.CylinderGeometry(0.010, 0.012, 0.014, 20);
        g.rotateZ(Math.PI / 2);
        return g;
      });
      const lumbarDock = new THREE.Mesh(lumbarDockGeo, materials.jointDoubleSide);
      lumbarDock.name = 'SpineLumbarDockKnuckle';
      lumbarDock.position.set(0, -knuckleHeight * 0.5 - 0.006, zOffset + 0.004);
      segGroup.add(lumbarDock);
    }

    // Kinematic hierarchy: parent segment into corresponding vertebraGroup
    if (vertebraGroups[i]) {
      vertebraGroups[i].add(segGroup);
    }

    segments.push({
      group: segGroup,
      spinousProcess,
      dorsalShield,
      transverseWings,
      pivotPin,
      cableSaddles,
    });
  }

  // =========================================================================
  // 7. PAIRED DIAGONAL HYDRAULIC ACTUATORS (Left & Right)
  // Balanced left-right arrangement flanking the spine with generous clearance.
  // Distinct dark titanium cylinder housings, chrome telescoping piston rods,
  // precision clevis brackets, and restrained purple optical status indicator bands.
  // =========================================================================
  const dampersGroup = new THREE.Group();
  dampersGroup.name = 'BilateralRearActuators';

  const rearCfg = TORSO_CONFIG.stomach.rearActuators;
  const commonDims = TORSO_CONFIG.stomach.poleDimensions;
  const barrelRadius = rearCfg?.cylinderRadius ?? commonDims?.cylinderRadius ?? 0.0068;
  const rodRadius = rearCfg?.pistonRadius ?? commonDims?.pistonRadius ?? 0.0036;
  const clevisWidth = commonDims?.upperClevisWidth ?? 0.016;
  const lowerPlinthWidth = commonDims?.lowerPlinthWidth ?? 0.014;
  const pinRadius = commonDims?.pinRadius ?? 0.0032;

  const rearDamperBarrelGeo = geoCache.get('RearActuatorBarrelGeo_v5', () => new THREE.CylinderGeometry(barrelRadius, barrelRadius, 0.066, 24));
  const uniballGeo = geoCache.get(`RearActuatorUniballGeo_${rodRadius.toFixed(4)}`, () => new THREE.SphereGeometry(0.0055, 18, 14));

  const upperClevisBracketGeo = geoCache.get(`RearActuatorUpperClevis_${clevisWidth}`, () => new THREE.BoxGeometry(clevisWidth, 0.016, 0.018));
  const upperClevisPinGeo = geoCache.get(`RearActuatorUpperPin_${pinRadius}_${clevisWidth}`, () => {
    const g = new THREE.CylinderGeometry(pinRadius, pinRadius, clevisWidth + 0.004, 16);
    g.rotateZ(Math.PI / 2);
    return g;
  });

  const lowerClevisBracketGeo = geoCache.get(`RearActuatorLowerClevis_${lowerPlinthWidth}`, () => new THREE.BoxGeometry(lowerPlinthWidth, 0.016, 0.018));
  const lowerClevisPinGeo = geoCache.get(`RearActuatorLowerPin_${pinRadius}_${lowerPlinthWidth}`, () => {
    const g = new THREE.CylinderGeometry(pinRadius, pinRadius, lowerPlinthWidth + 0.004, 16);
    g.rotateZ(Math.PI / 2);
    return g;
  });

  const collarGeo = geoCache.get(`RearActuatorCollar_${barrelRadius.toFixed(4)}`, () => new THREE.CylinderGeometry(barrelRadius * 1.10, barrelRadius * 1.02, 0.006, 24));
  const endCapGeo = geoCache.get(`RearActuatorEndCap_${barrelRadius.toFixed(4)}`, () => new THREE.CylinderGeometry(barrelRadius * 1.06, barrelRadius * 1.06, 0.0035, 24));
  const indicatorGeo = geoCache.get(`RearActuatorLed_${barrelRadius.toFixed(4)}`, () => new THREE.CylinderGeometry(barrelRadius * 1.048, barrelRadius * 1.048, 0.0032, 24));
  const bezelGeo = geoCache.get(`RearActuatorBezel_${barrelRadius.toFixed(4)}`, () => new THREE.CylinderGeometry(barrelRadius * 1.04, barrelRadius * 1.04, 0.0060, 24));
  const fluidPortGeo = geoCache.get('RearActuatorPortGeo_v6', () => new THREE.BoxGeometry(0.0050, 0.0065, 0.0050));

  const rearUpper = rearCfg?.upperMount ?? { x: 0.080, y: -0.048, z: -0.056 };
  const rearLower = rearCfg?.lowerMount ?? { x: 0.056, y: -0.198, z: -0.040 };
  const rearAngleZ = Math.atan2(rearUpper.x - rearLower.x, rearUpper.y - rearLower.y);

  for (const side of [-1, 1] as const) {
    const actGroup = new THREE.Group();
    actGroup.name = `RearActuator_${side === -1 ? 'L' : 'R'}`;

    // Structural coordinates: from thoracic lower frame bulkhead lugs down to lumbar chassis
    // Symmetrical, clear line of action with balanced outward divergence matching front/side poles
    const topPt = new THREE.Vector3(side * rearUpper.x, rearUpper.y, rearUpper.z);
    const botPt = new THREE.Vector3(side * rearLower.x, rearLower.y, rearLower.z);
    const dist = topPt.distanceTo(botPt);

    // 7.1 Upper Mounting Bracket (mating seamlessly with thoracic bulkhead lug)
    const upperClevis = new THREE.Mesh(upperClevisBracketGeo, materials.jointDoubleSide);
    upperClevis.position.copy(topPt);
    upperClevis.rotation.z = -side * rearAngleZ;
    upperClevis.rotation.x = 0.04;
    dampersGroup.add(upperClevis);

    const upperPin = new THREE.Mesh(upperClevisPinGeo, materials.metallicDoubleSide);
    upperPin.position.copy(topPt);
    upperPin.rotation.z = -side * rearAngleZ;
    upperPin.rotation.x = 0.04;
    dampersGroup.add(upperPin);

    // 7.2 Lower Mounting Bracket (anchoring firmly into lumbar chassis lateral receiver boss)
    const lowerClevis = new THREE.Mesh(lowerClevisBracketGeo, materials.jointDoubleSide);
    lowerClevis.position.copy(botPt);
    lowerClevis.rotation.z = -side * rearAngleZ;
    lowerClevis.rotation.x = -0.05;
    dampersGroup.add(lowerClevis);

    const lowerPin = new THREE.Mesh(lowerClevisPinGeo, materials.metallicDoubleSide);
    lowerPin.position.copy(botPt);
    lowerPin.rotation.z = -side * rearAngleZ;
    lowerPin.rotation.x = -0.05;
    dampersGroup.add(lowerPin);

    // 7.3 Actuator Body along line of action
    actGroup.position.copy(topPt);
    const dir = new THREE.Vector3().subVectors(botPt, topPt).normalize();
    actGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);

    // Top rod-end uniball
    const topBall = new THREE.Mesh(uniballGeo, materials.metallicDoubleSide);
    topBall.position.set(0, 0, 0);
    actGroup.add(topBall);

    // Dark titanium cylinder barrel
    const barrelLen = 0.066;
    const barrelCenterY = -dist * 0.30;
    const barrel = new THREE.Mesh(rearDamperBarrelGeo, materials.jointDoubleSide);
    barrel.position.set(0, barrelCenterY, 0);
    barrel.castShadow = true;
    actGroup.add(barrel);

    // Stepped end caps
    for (const cY of [barrelCenterY + barrelLen * 0.5, barrelCenterY - barrelLen * 0.5]) {
      const cap = new THREE.Mesh(endCapGeo, materials.metallicDoubleSide);
      cap.position.set(0, cY, 0);
      actGroup.add(cap);
    }

    // Hydraulic fluid port fitting on barrel upper end
    const fluidPort = new THREE.Mesh(fluidPortGeo, materials.metallicDoubleSide);
    fluidPort.position.set(0, barrelCenterY + barrelLen * 0.36, barrelRadius + 0.001);
    actGroup.add(fluidPort);

    // Restrained purple optical status indicator band in flush metallic bezel
    const bezel = new THREE.Mesh(bezelGeo, materials.metallicDoubleSide);
    bezel.position.set(0, barrelCenterY + barrelLen * 0.18, 0);
    actGroup.add(bezel);

    const indicator = new THREE.Mesh(indicatorGeo, materials.purpleEmissive);
    indicator.name = `RearActuator_StatusLed_${side === -1 ? 'L' : 'R'}`;
    indicator.position.set(0, barrelCenterY + barrelLen * 0.18, 0);
    actGroup.add(indicator);
    ledMeshes.push(indicator);

    // Gland seal collar at barrel lower base
    const collar = new THREE.Mesh(collarGeo, materials.jointDoubleSide);
    collar.position.set(0, barrelCenterY - barrelLen * 0.5 - 0.003, 0);
    actGroup.add(collar);

    // Mirror-polished chrome telescoping rod extending continuously to lower uniball
    const rodStartY = barrelCenterY - barrelLen * 0.5 + 0.006;
    const rodEndY = -dist;
    const rodLen = Math.abs(rodEndY - rodStartY);
    const rodCenterY = (rodStartY + rodEndY) * 0.5;

    const rearDamperRodGeo = geoCache.get('RearActuatorRodGeo_v5', () => new THREE.CylinderGeometry(rodRadius, rodRadius, rodLen, 24));
    const rod = new THREE.Mesh(rearDamperRodGeo, materials.metallicDoubleSide);
    rod.position.set(0, rodCenterY, 0);
    rod.castShadow = true;
    actGroup.add(rod);

    // Bottom rod-end uniball
    const botBall = new THREE.Mesh(uniballGeo, materials.metallicDoubleSide);
    botBall.position.set(0, -dist, 0);
    actGroup.add(botBall);

    dampersGroup.add(actGroup);
  }

  // =========================================================================
  // 8. Streamlined Posterior Spinal Cable Trunks
  // Clean braided conduit bundles routed down lateral spinal conduits
  // =========================================================================
  const cableTrunksGroup = new THREE.Group();
  cableTrunksGroup.name = 'PosteriorSpinalCableTrunks';

  for (const side of [-1, 1] as const) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < vertebraCount; i++) {
      const y = cfg.vertebraY[i];
      const z = -0.030 - (1.0 - i / 4) * 0.005;
      pts.push(new THREE.Vector3(side * 0.018, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const cableGeo = geoCache.get(`PosteriorSpinalCableGeo_v5_${side}`, () => new THREE.TubeGeometry(curve, 20, 0.0016, 8, false));
    const cableMesh = new THREE.Mesh(cableGeo, materials.joint);
    cableMesh.castShadow = true;
    cableTrunksGroup.add(cableMesh);

    // Discrete retaining P-clamps
    for (let i = 0; i < vertebraCount; i++) {
      const clampGeo = geoCache.get('SpineRefinedCableClampGeo_v5', () => new THREE.BoxGeometry(0.004, 0.003, 0.0025));
      const clamp = new THREE.Mesh(clampGeo, materials.metallic);
      clamp.position.copy(pts[i]);
      cableTrunksGroup.add(clamp);
    }
  }

  return {
    segments,
    dampersGroup,
    cableTrunksGroup,
    ledMeshes,
  };
}

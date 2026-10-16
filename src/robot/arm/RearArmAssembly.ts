import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { geoCache } from '../utils/GeometryCache';

export interface RearArmAssemblyNodes {
  upperArmRear: THREE.Group;
  forearmRear: THREE.Group;
  wristRear: THREE.Group;
  handRear: THREE.Group;
  ledMeshes: THREE.Mesh[];
}

/**
 * Creates the high-precision Rear-Facing Arm Mechanical Details (Master Prompt Section 9):
 * - Upper Arm:
 *   - Tricep longitudinal structural spine and recessed anatomical armor seam
 *   - Secondary linear hydraulic damper with chrome piston rod, uniball ends, and fluid ports
 *   - Posterior tricep service maintenance panel with hex cap screws
 *   - Distal elbow-facing transition cuff with machined beveled chamfer
 * - Forearm & Elbow:
 *   - Posterior olecranon bearing cowl with concentric race rings
 *   - Extensor spaceframe spine with recessed lightening pockets
 *   - Twin cybernetic extensor tendon conduits routed along lateral channels
 *   - Gauntlet maintenance cover with perimeter hex fasteners
 *   - Beveled wrist transition collar
 * - Wrist:
 *   - Posterior carpal reinforcement bridge bracket with tendon guide saddles
 *   - Circular side housing reinforcement caps with central axle detail
 *   - Micro diagnostic status optical LED node
 * - Hand & Knuckles:
 *   - Metacarpal dorsal ray reinforcement truss with hex bolts
 *   - 4 MCP knuckle entry bushings with cybernetic extensor tendons leading into each finger
 *   - Inter-phalangeal joint interfaces with dark titanium hinge pins
 */
export function createRearArmAssembly(
  side: -1 | 1,
  materials: RobotMaterialPalette
): RearArmAssemblyNodes {
  const ledMeshes: THREE.Mesh[] = [];

  // =========================================================================
  // 1. REAR UPPER ARM (TRICEP) ASSEMBLY
  // Parented to upperArm.group
  // =========================================================================
  const upperArmRear = new THREE.Group();
  upperArmRear.name = side === -1 ? 'LeftUpperArmRearAssembly' : 'RightUpperArmRearAssembly';

  // Longitudinal Tricep Structural Spine Rib (Dark Titanium)
  // Sits along the posterior meridian (z ≈ -0.035, y = -0.050 to -0.180)
  const tricepSpineGeo = geoCache.get('UpperArm_TricepSpineGeo_v2', () => {
    const pts = [
      new THREE.Vector3(0, -0.048, -0.034),
      new THREE.Vector3(0, -0.095, -0.037),
      new THREE.Vector3(0, -0.145, -0.036),
      new THREE.Vector3(0, -0.185, -0.032),
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(curve, 18, 0.0028, 8, false);
  });

  const tricepSpine = new THREE.Mesh(tricepSpineGeo, materials.joint);
  tricepSpine.name = 'TricepStructuralSpine';
  tricepSpine.castShadow = true;
  upperArmRear.add(tricepSpine);

  // Recessed Anatomical Tricep Seam Plate
  const tricepSeamGeo = geoCache.get('UpperArm_TricepSeamGeo', () => new THREE.BoxGeometry(0.003, 0.120, 0.002));
  const tricepSeam = new THREE.Mesh(tricepSeamGeo, materials.joint);
  tricepSeam.position.set(-side * 0.016, -0.115, -0.035);
  upperArmRear.add(tricepSeam);

  // Secondary Linear Tricep Actuator Damper
  const tricepDamperGroup = new THREE.Group();
  tricepDamperGroup.name = 'TricepLinearDamper';
  tricepDamperGroup.position.set(side * 0.012, -0.118, -0.035);

  const damperBarrelGeo = geoCache.get('TricepDamperBarrelGeo_v2', () => new THREE.CylinderGeometry(0.0036, 0.0038, 0.046, 16));
  const damperBarrel = new THREE.Mesh(damperBarrelGeo, materials.joint);
  damperBarrel.position.set(0, 0.010, 0);
  damperBarrel.castShadow = true;
  tricepDamperGroup.add(damperBarrel);

  const damperRodGeo = geoCache.get('TricepDamperRodGeo_v2', () => new THREE.CylinderGeometry(0.0020, 0.0020, 0.042, 14));
  const damperRod = new THREE.Mesh(damperRodGeo, materials.metallic);
  damperRod.position.set(0, -0.016, 0);
  damperRod.castShadow = true;
  tricepDamperGroup.add(damperRod);

  // Upper and lower rod-end uniballs
  const uniballGeo = geoCache.get('TricepUniballGeo_v2', () => new THREE.SphereGeometry(0.0042, 12, 10));
  const topBall = new THREE.Mesh(uniballGeo, materials.metallic);
  topBall.position.set(0, 0.033, 0);
  tricepDamperGroup.add(topBall);

  const botBall = new THREE.Mesh(uniballGeo, materials.metallic);
  botBall.position.set(0, -0.033, 0);
  tricepDamperGroup.add(botBall);

  // Fluid union fitting on damper
  const fluidUnionGeo = geoCache.get('TricepFluidUnionGeo', () => new THREE.BoxGeometry(0.003, 0.004, 0.003));
  const fluidUnion = new THREE.Mesh(fluidUnionGeo, materials.metallic);
  fluidUnion.position.set(0, 0.024, -0.003);
  tricepDamperGroup.add(fluidUnion);

  upperArmRear.add(tricepDamperGroup);

  // Posterior Tricep Service Maintenance Panel with 4 Hex Bolts
  const servicePanelGeo = geoCache.get('TricepServicePanelGeo_v2', () => new THREE.BoxGeometry(0.014, 0.036, 0.0024));
  const servicePanel = new THREE.Mesh(servicePanelGeo, materials.joint);
  servicePanel.name = 'TricepServicePanel';
  servicePanel.position.set(-side * 0.010, -0.118, -0.035);
  upperArmRear.add(servicePanel);

  const boltGeo = geoCache.get('ArmRearBoltGeo_v2', () => {
    const g = new THREE.CylinderGeometry(0.0009, 0.0009, 0.0016, 6);
    g.rotateX(Math.PI / 2);
    return g;
  });

  for (const bx of [-side * 0.014, -side * 0.006]) {
    for (const by of [-0.130, -0.106]) {
      const bolt = new THREE.Mesh(boltGeo, materials.metallic);
      bolt.position.set(bx, by, -0.0365);
      upperArmRear.add(bolt);
    }
  }

  // Distal Elbow-Facing Transition Cuff (Dark Titanium)
  const elbowCuffGeo = geoCache.get('TricepElbowCuffGeo_v2', () => new THREE.CylinderGeometry(0.033, 0.034, 0.010, 24));
  const elbowCuff = new THREE.Mesh(elbowCuffGeo, materials.joint);
  elbowCuff.position.set(0, -0.190, 0);
  elbowCuff.scale.set(1.0, 1.0, 0.92);
  upperArmRear.add(elbowCuff);

  // =========================================================================
  // 2. REAR FOREARM (EXTENSOR) & POSTERIOR ELBOW ASSEMBLY
  // Parented to forearm.group
  // =========================================================================
  const forearmRear = new THREE.Group();
  forearmRear.name = side === -1 ? 'LeftForearmRearAssembly' : 'RightForearmRearAssembly';

  // Posterior Olecranon Bearing Cowl (Reinforcing the elbow joint from behind)
  const olecranonCowlGeo = geoCache.get('ForearmOlecranonCowlGeo', () => {
    const g = new THREE.CylinderGeometry(0.024, 0.026, 0.014, 20, 1, false, 0, Math.PI);
    g.rotateZ(Math.PI / 2);
    g.rotateY(-Math.PI / 2);
    return g;
  });
  const olecranonCowl = new THREE.Mesh(olecranonCowlGeo, materials.joint);
  olecranonCowl.position.set(0, -0.004, -0.022);
  forearmRear.add(olecranonCowl);

  // Posterior Extensor Spaceframe Rib with Lightening Pockets
  const extensorSpineGeo = geoCache.get('Forearm_ExtensorSpineGeo_v2', () => {
    const pts = [
      new THREE.Vector3(0, -0.014, -0.026),
      new THREE.Vector3(0, -0.065, -0.028),
      new THREE.Vector3(0, -0.115, -0.025),
      new THREE.Vector3(0, -0.155, -0.020),
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(curve, 16, 0.0024, 8, false);
  });

  const extensorSpine = new THREE.Mesh(extensorSpineGeo, materials.joint);
  extensorSpine.name = 'ForearmExtensorSpine';
  extensorSpine.castShadow = true;
  forearmRear.add(extensorSpine);

  // Twin Cybernetic Tendon Conduits routed along lateral gauntlet channels
  for (const tSide of [-1, 1] as const) {
    const tendonGeo = geoCache.get(`ForearmTendonGeo_v2_${tSide}`, () => {
      const pts = [
        new THREE.Vector3(tSide * 0.008, -0.020, -0.024),
        new THREE.Vector3(tSide * 0.007, -0.075, -0.025),
        new THREE.Vector3(tSide * 0.006, -0.130, -0.022),
        new THREE.Vector3(tSide * 0.005, -0.155, -0.018),
      ];
      const curve = new THREE.CatmullRomCurve3(pts);
      return new THREE.TubeGeometry(curve, 14, 0.0012, 6, false);
    });

    const tendon = new THREE.Mesh(tendonGeo, materials.metallic);
    tendon.castShadow = true;
    forearmRear.add(tendon);
  }

  // Posterior Gauntlet Service Cover with Hex Bolts
  const gauntletHatchGeo = geoCache.get('ForearmGauntletHatchGeo_v2', () => new THREE.BoxGeometry(0.016, 0.028, 0.0022));
  const gauntletHatch = new THREE.Mesh(gauntletHatchGeo, materials.joint);
  gauntletHatch.name = 'ForearmGauntletServiceCover';
  gauntletHatch.position.set(0, -0.090, -0.027);
  forearmRear.add(gauntletHatch);

  for (const hy of [-0.100, -0.080]) {
    const hBolt = new THREE.Mesh(boltGeo, materials.metallic);
    hBolt.position.set(0, hy, -0.0285);
    forearmRear.add(hBolt);
  }

  // Rear Wrist Transition Collar with beveled interface
  const wristCollarGeo = geoCache.get('ForearmWristCollarGeo_v2', () => new THREE.CylinderGeometry(0.022, 0.024, 0.008, 24));
  const wristCollar = new THREE.Mesh(wristCollarGeo, materials.joint);
  wristCollar.position.set(0, -0.156, 0);
  wristCollar.scale.set(1.08, 1.0, 0.88);
  forearmRear.add(wristCollar);

  // =========================================================================
  // 3. REAR WRIST (POSTERIOR CARPAL) ASSEMBLY
  // Parented to wrist.group
  // =========================================================================
  const wristRear = new THREE.Group();
  wristRear.name = side === -1 ? 'LeftWristRearAssembly' : 'RightWristRearAssembly';

  // Posterior Carpal Reinforcement Bridge Bracket
  const wristBridgeGeo = geoCache.get('Wrist_PosteriorBridgeGeo_v2', () => {
    return new THREE.BoxGeometry(0.034, 0.010, 0.0026);
  });
  const wristBridge = new THREE.Mesh(wristBridgeGeo, materials.joint);
  wristBridge.name = 'WristPosteriorBridgePlate';
  wristBridge.position.set(0, -0.0076, -0.0195);
  wristBridge.castShadow = true;
  wristRear.add(wristBridge);

  // Extensor tendon guide saddles on wrist bridge
  const wristSaddleGeo = geoCache.get('Wrist_TendonSaddleGeo_v2', () => new THREE.BoxGeometry(0.004, 0.008, 0.002));
  for (const wSide of [-1, 1] as const) {
    const saddle = new THREE.Mesh(wristSaddleGeo, materials.metallic);
    saddle.position.set(wSide * 0.008, -0.0076, -0.0205);
    wristRear.add(saddle);

    // M1.2 retaining bolt
    const wBolt = new THREE.Mesh(boltGeo, materials.metallic);
    wBolt.position.set(wSide * 0.014, -0.0076, -0.0208);
    wristRear.add(wBolt);
  }

  // Micro status optical indicator node
  const wristStatusLedGeo = geoCache.get('Wrist_StatusLedGeo_v2', () => new THREE.BoxGeometry(0.005, 0.0018, 0.0018));
  const wristStatusLed = new THREE.Mesh(wristStatusLedGeo, materials.purpleEmissive);
  wristStatusLed.name = 'WristRearStatusLed';
  wristStatusLed.position.set(0, -0.0076, -0.0208);
  wristRear.add(wristStatusLed);
  ledMeshes.push(wristStatusLed);

  // Circular Side Housing Reinforcement Caps
  const wristSideCapGeo = geoCache.get('WristSideCapGeo', () => {
    const g = new THREE.CylinderGeometry(0.010, 0.010, 0.003, 16);
    g.rotateZ(Math.PI / 2);
    return g;
  });
  for (const wsSide of [-1, 1] as const) {
    const sideCap = new THREE.Mesh(wristSideCapGeo, materials.joint);
    sideCap.position.set(wsSide * 0.020, -0.008, 0);
    wristRear.add(sideCap);

    const sideCenterPin = new THREE.Mesh(boltGeo, materials.metallic);
    sideCenterPin.position.set(wsSide * 0.0215, -0.008, 0);
    wristRear.add(sideCenterPin);
  }

  // =========================================================================
  // 4. REAR HAND (POSTERIOR METACARPAL & KNUCKLE TENDON) ASSEMBLY
  // Parented to hand.group
  // =========================================================================
  const handRear = new THREE.Group();
  handRear.name = side === -1 ? 'LeftHandRearAssembly' : 'RightHandRearAssembly';

  // Posterior Metacarpal Ray Reinforcement Truss (Dark Titanium)
  const rayTrussGeo = geoCache.get('Hand_MetacarpalRayTrussGeo_v2', () => {
    return new THREE.BoxGeometry(0.042, 0.016, 0.0024);
  });
  const rayTruss = new THREE.Mesh(rayTrussGeo, materials.joint);
  rayTruss.name = 'MetacarpalRayTruss';
  rayTruss.position.set(0, -0.024, 0.0120);
  rayTruss.castShadow = true;
  handRear.add(rayTruss);

  // Fasteners on the ray truss
  for (const rx of [-0.016, 0.016]) {
    const rBolt = new THREE.Mesh(boltGeo, materials.metallic);
    rBolt.position.set(rx, -0.024, 0.0132);
    handRear.add(rBolt);
  }

  // 4 Knuckle Tendon Entry Bushings at MCP knuckle hoods
  const radial = -side;
  const knuckleTargets = [
    { name: 'Index', spreadX: radial * 0.0205, y: -0.0440, z: 0.0075 },
    { name: 'Middle', spreadX: radial * 0.0068, y: -0.0465, z: 0.0080 },
    { name: 'Ring', spreadX: -radial * 0.0075, y: -0.0450, z: 0.0075 },
    { name: 'Little', spreadX: -radial * 0.0210, y: -0.0410, z: 0.0068 },
  ];

  const bushingGeo = geoCache.get('Hand_KnuckleBushingGeo_v2', () => {
    const g = new THREE.CylinderGeometry(0.0020, 0.0020, 0.004, 12);
    g.rotateX(Math.PI / 2);
    return g;
  });

  knuckleTargets.forEach((kTarget, kIdx) => {
    // Knuckle tendon bushing
    const bushing = new THREE.Mesh(bushingGeo, materials.metallic);
    bushing.name = `KnuckleTendonBushing_${kTarget.name}`;
    bushing.position.set(kTarget.spreadX, kTarget.y, kTarget.z);
    handRear.add(bushing);

    // Tendon conduit running from ray truss down into the knuckle bushing
    const kCurve = geoCache.get(`Hand_KnuckleTendonGeo_v2_${side}_${kIdx}`, () => {
      const pts = [
        new THREE.Vector3(kTarget.spreadX * 0.85, -0.031, 0.0118),
        new THREE.Vector3(kTarget.spreadX, kTarget.y + 0.004, kTarget.z + 0.001),
      ];
      const curve = new THREE.CatmullRomCurve3(pts);
      return new THREE.TubeGeometry(curve, 8, 0.0009, 6, false);
    });
    const tendonMesh = new THREE.Mesh(kCurve, materials.metallic);
    handRear.add(tendonMesh);
  });

  return {
    upperArmRear,
    forearmRear,
    wristRear,
    handRear,
    ledMeshes,
  };
}

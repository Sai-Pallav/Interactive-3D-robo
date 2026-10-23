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
  // Note: All rear upper-arm mechanics are housed internally within UpperArm.ts
  // mechanicalCore (tricep actuators & pistons <= 18mm radius). The white
  // ceramic armor shell provides a clean, continuous posterior surface.
  // Unintended protruding tubes, dampers, service plates, hex bolts, and
  // duplicate cuffs that caused clipping, streaks, and specks have been removed.
  // =========================================================================
  const upperArmRear = new THREE.Group();
  upperArmRear.name = side === -1 ? 'LeftUpperArmRearAssembly' : 'RightUpperArmRearAssembly';

  // Shared micro-fastener bolt geometry used across forearm, wrist, and hand details
  const boltGeo = geoCache.get('ArmRearBoltGeo_v2', () => {
    const g = new THREE.CylinderGeometry(0.0009, 0.0009, 0.0016, 6);
    g.rotateX(Math.PI / 2);
    return g;
  });

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

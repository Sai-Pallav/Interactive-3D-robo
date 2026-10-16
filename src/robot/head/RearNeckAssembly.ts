import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { geoCache } from '../utils/GeometryCache';

export interface RearNeckAssemblyNodes {
  group: THREE.Group;
  vertebralColumn: THREE.Group;
  posteriorStruts: THREE.Group;
  cableConduits: THREE.Group;
  gimbalPlate: THREE.Mesh;
  ledMeshes: THREE.Mesh[];
}

/**
 * Creates the posterior cervical mechanical column and articulation mechanism:
 * - 4 Articulated posterior cervical vertebral knuckles matching neck collar rings
 * - Left and right posterior cervical hydraulic stabilizer struts
 * - Dual flexible shielded cable conduits with CNC retaining clamps
 * - Substantial head mounting gimbal load plate
 */
export function createRearNeckAssembly(materials: RobotMaterialPalette): RearNeckAssemblyNodes {
  const group = new THREE.Group();
  group.name = 'RearNeckAssembly';

  const ledMeshes: THREE.Mesh[] = [];

  // =========================================================================
  // 1. POSTERIOR CERVICAL VERTEBRAL COLUMN (C1 to C4)
  // Stacked articulated vertebral knuckles in dark titanium with metallic pivot pins
  // =========================================================================
  const vertebralColumn = new THREE.Group();
  vertebralColumn.name = 'CervicalVertebralColumn';

  const knuckleSpecs = [
    { y: 0.038, radius: 0.024, depth: 0.022, z: -0.052 },
    { y: 0.068, radius: 0.022, depth: 0.021, z: -0.050 },
    { y: 0.098, radius: 0.020, depth: 0.020, z: -0.048 },
    { y: 0.122, radius: 0.018, depth: 0.017, z: -0.044 },
  ];

  const pinGeo = geoCache.get('CervicalPinGeo', () => {
    const g = new THREE.CylinderGeometry(0.0028, 0.0028, 0.028, 16);
    g.rotateZ(Math.PI / 2);
    return g;
  });

  for (let i = 0; i < knuckleSpecs.length; i++) {
    const spec = knuckleSpecs[i];
    const kGroup = new THREE.Group();
    kGroup.name = `CervicalKnuckle_C${i + 1}`;
    kGroup.position.set(0, spec.y, spec.z);

    // Dark titanium vertebral process body with chamfered clearance
    const kGeo = geoCache.get(`CervicalKnuckleGeo_${i}`, () => {
      const h = i === 3 ? 0.015 : 0.018;
      const g = new THREE.BoxGeometry(0.026, h, spec.depth);
      return g;
    });
    const kMesh = new THREE.Mesh(kGeo, materials.joint);
    kMesh.castShadow = true;
    kMesh.receiveShadow = true;
    kGroup.add(kMesh);

    // Transverse axle pivot pin
    const pin = new THREE.Mesh(pinGeo, materials.metallic);
    pin.position.set(0, 0, spec.depth * 0.25);
    kGroup.add(pin);

    // Beveled end caps on pivot pin
    const capGeo = geoCache.get('CervicalCapGeo', () => {
      const g = new THREE.CylinderGeometry(0.0038, 0.0038, 0.0016, 12);
      g.rotateZ(Math.PI / 2);
      return g;
    });
    for (const capSide of [-1, 1]) {
      const cap = new THREE.Mesh(capGeo, materials.metallic);
      cap.position.set(capSide * 0.0145, 0, spec.depth * 0.25);
      kGroup.add(cap);
    }

    // Inter-vertebral damper ring between segments
    if (i < knuckleSpecs.length - 1) {
      const damperGeo = geoCache.get('CervicalDamperGeo', () => new THREE.CylinderGeometry(0.009, 0.009, 0.008, 16));
      const damper = new THREE.Mesh(damperGeo, materials.jointDoubleSide);
      damper.position.set(0, 0.015, -0.002);
      kGroup.add(damper);
    }

    vertebralColumn.add(kGroup);
  }

  group.add(vertebralColumn);

  // =========================================================================
  // 2. BILATERAL POSTERIOR CERVICAL HYDRAULIC STRUTS
  // Stabilizing telescopic dampers flanking the vertebral column
  // =========================================================================
  const posteriorStruts = new THREE.Group();
  posteriorStruts.name = 'PosteriorCervicalStruts';

  const strutCylGeo = geoCache.get('CervicalStrutCylGeo', () => new THREE.CylinderGeometry(0.0042, 0.0046, 0.068, 16));
  const strutRodGeo = geoCache.get('CervicalStrutRodGeo', () => new THREE.CylinderGeometry(0.0024, 0.0024, 0.065, 14));
  const uniballGeo = geoCache.get('CervicalStrutUniballGeo', () => new THREE.SphereGeometry(0.0052, 14, 12));

  for (const side of [-1, 1] as const) {
    const strutGroup = new THREE.Group();
    strutGroup.name = `PosteriorStrut_${side === -1 ? 'L' : 'R'}`;

    // Anchor at lower collar, angling slightly outward and upward to skull mount
    const startPt = new THREE.Vector3(side * 0.030, 0.022, -0.040);
    const endPt = new THREE.Vector3(side * 0.026, 0.138, -0.038);
    const totalDist = startPt.distanceTo(endPt);

    strutGroup.position.copy(startPt);
    const dir = new THREE.Vector3().subVectors(endPt, startPt).normalize();
    strutGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

    // Cylinder barrel (lower half)
    const barrel = new THREE.Mesh(strutCylGeo, materials.joint);
    barrel.position.set(0, totalDist * 0.32, 0);
    barrel.castShadow = true;
    strutGroup.add(barrel);

    // Chrome telescoping rod (upper half)
    const rod = new THREE.Mesh(strutRodGeo, materials.metallic);
    rod.position.set(0, totalDist * 0.72, 0);
    rod.castShadow = true;
    strutGroup.add(rod);

    // Spherical uniballs at both ends
    const ballBottom = new THREE.Mesh(uniballGeo, materials.metallic);
    ballBottom.position.set(0, 0, 0);
    strutGroup.add(ballBottom);

    const ballTop = new THREE.Mesh(uniballGeo, materials.metallic);
    ballTop.position.set(0, totalDist, 0);
    strutGroup.add(ballTop);

    posteriorStruts.add(strutGroup);
  }

  group.add(posteriorStruts);

  // =========================================================================
  // 3. FLEXIBLE REAR CABLE CONDUIT BUNDLES
  // Braided lines routing power and data from torso collar to skull
  // =========================================================================
  const cableConduits = new THREE.Group();
  cableConduits.name = 'PosteriorNeckCableConduits';

  for (const side of [-1, 1] as const) {
    const pts: THREE.Vector3[] = [
      new THREE.Vector3(side * 0.016, 0.018, -0.044),
      new THREE.Vector3(side * 0.018, 0.056, -0.052),
      new THREE.Vector3(side * 0.017, 0.098, -0.050),
      new THREE.Vector3(side * 0.015, 0.138, -0.042),
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    const conduitGeo = geoCache.get(`PosteriorNeckConduitGeo_${side}`, () => new THREE.TubeGeometry(curve, 20, 0.0022, 10, false));
    const conduitMesh = new THREE.Mesh(conduitGeo, materials.joint);
    conduitMesh.castShadow = true;
    cableConduits.add(conduitMesh);

    // CNC Aluminum P-clamps holding the cables
    const clampGeo = geoCache.get('NeckCableClampGeo', () => new THREE.BoxGeometry(0.006, 0.004, 0.003));
    for (const cY of [0.056, 0.098]) {
      const clamp = new THREE.Mesh(clampGeo, materials.metallic);
      clamp.position.set(side * 0.018, cY, -0.052);
      cableConduits.add(clamp);
    }
  }

  group.add(cableConduits);

  // =========================================================================
  // 4. OCCIPITAL GIMBAL LOAD PLATE
  // Substantial titanium head mounting platform
  // =========================================================================
  const gimbalGeo = geoCache.get('OccipitalGimbalPlateGeo', () => {
    const g = new THREE.CylinderGeometry(0.048, 0.044, 0.014, 32);
    g.scale(1.0, 1.0, 0.88);
    return g;
  });
  const gimbalPlate = new THREE.Mesh(gimbalGeo, materials.joint);
  gimbalPlate.name = 'OccipitalGimbalMountPlate';
  gimbalPlate.position.set(0, 0.144, -0.018);
  gimbalPlate.rotation.x = 0.08;
  gimbalPlate.castShadow = true;
  group.add(gimbalPlate);

  const gimbalRaceGeo = geoCache.get('OccipitalGimbalRaceGeo', () => new THREE.TorusGeometry(0.045, 0.0016, 8, 32));
  const gimbalRace = new THREE.Mesh(gimbalRaceGeo, materials.metallic);
  gimbalRace.position.set(0, 0.148, -0.018);
  gimbalRace.rotation.x = Math.PI / 2 + 0.08;
  group.add(gimbalRace);

  return {
    group,
    vertebralColumn,
    posteriorStruts,
    cableConduits,
    gimbalPlate,
    ledMeshes,
  };
}

import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { geoCache } from '../utils/GeometryCache';

export interface RearLumbarAssemblyNodes {
  group: THREE.Group;
  lumbarFrame: THREE.Mesh;
  centralYoke: THREE.Mesh;
  bilateralStabilizers: THREE.Group;
  maintenanceHatch: THREE.Mesh;
  conduitPassage: THREE.Mesh;
  ledMeshes: THREE.Mesh[];
}

/**
 * REFINED REAR LUMBAR & LOWER-BACK MECHANISM
 * Senior Mechanical Robotics & Three.js Procedural Modeling Engineering
 *
 * 1. Compact, Clearly Integrated Lumbar Frame:
 *    - Unified dark titanium structural arch transferring spinal and actuator loads directly to the waist turntable deck
 *    - Left and right structural diagonal support wings providing clean, rigid lower mounting bosses for the paired diagonal actuators
 *    - Symmetrical downward mounting feet anchoring into the waist transition deck
 *
 * 2. Central Load-Transfer Connection:
 *    - Machined titanium gimbal yoke cradling the 5th vertebra's trunnion knuckle
 *    - Concentric ground chrome bearing race rim with heavy transverse trunnion axle pin and retaining caps
 *
 * 3. Recessed Mechanical Detailing & Clean Spacing:
 *    - Recessed central maintenance panel with flush M3 hex cap screws
 *    - Protected conduit pass-through glands receiving spinal cable trunks into the waist core
 *    - Eliminates duplicate brackets, redundant rods, and cluttered geometry
 *    - Preserves open space around moving components for visual clarity
 */
export function createRearLumbarAssembly(materials: RobotMaterialPalette): RearLumbarAssemblyNodes {
  const group = new THREE.Group();
  group.name = 'RearLumbarAssembly';

  const ledMeshes: THREE.Mesh[] = [];

  // =========================================================================
  // 1. UNIFIED STRUCTURAL LUMBAR CHASSIS (Dark Titanium)
  // Engineered arch transferring spinal and actuator loads down to the waist deck
  // =========================================================================
  const frameShape = new THREE.Shape();
  // Central arch cradle
  frameShape.moveTo(-0.022, 0.016);
  frameShape.lineTo(-0.012, 0.020);
  frameShape.lineTo(0.012, 0.020);
  frameShape.lineTo(0.022, 0.016);
  // Left and right structural diagonal wing profiles extending to actuator mounts
  frameShape.lineTo(0.058, 0.008);
  frameShape.lineTo(0.062, -0.012);
  frameShape.lineTo(0.048, -0.018);
  frameShape.lineTo(-0.048, -0.018);
  frameShape.lineTo(-0.062, -0.012);
  frameShape.lineTo(-0.058, 0.008);
  frameShape.closePath();

  const frameGeo = geoCache.get('RearRefinedLumbarFrameGeo_v5', () => {
    const g = new THREE.ExtrudeGeometry(frameShape, {
      depth: 0.034,
      bevelEnabled: true,
      bevelThickness: 0.0024,
      bevelSize: 0.0020,
      bevelSegments: 2,
    });
    g.center();
    return g;
  });

  const lumbarFrame = new THREE.Mesh(frameGeo, materials.joint);
  lumbarFrame.name = 'RearLumbarSupportFrame';
  lumbarFrame.position.set(0, -0.198, -0.034);
  lumbarFrame.rotation.x = -0.05;
  lumbarFrame.castShadow = true;
  lumbarFrame.receiveShadow = true;
  group.add(lumbarFrame);

  // Structural stiffening gussets on left and right wings
  const gussetGeo = geoCache.get('LumbarRefinedWingGussetGeo_v5', () => new THREE.BoxGeometry(0.014, 0.008, 0.018));
  for (const side of [-1, 1] as const) {
    const gusset = new THREE.Mesh(gussetGeo, materials.joint);
    gusset.position.set(side * 0.048, -0.198, -0.034);
    gusset.rotation.z = -side * 0.18;
    group.add(gusset);
  }

  // =========================================================================
  // 2. CENTRAL LOAD-TRANSFER GIMBAL YOKE & TRUNNION
  // Machined titanium yoke cradling Vertebra 05 with transverse trunnion axle
  // =========================================================================
  const yokeGeo = geoCache.get('RearRefinedLumbarYokeGeo_v5', () => {
    const g = new THREE.CylinderGeometry(0.022, 0.026, 0.016, 24);
    g.scale(1.10, 1.0, 0.88);
    return g;
  });

  const centralYoke = new THREE.Mesh(yokeGeo, materials.joint);
  centralYoke.name = 'RearLumbarCentralYoke';
  centralYoke.position.set(0, -0.192, -0.026);
  centralYoke.castShadow = true;
  group.add(centralYoke);

  // Concentric polished metallic bearing race rim
  const yokeRimGeo = geoCache.get('RearRefinedLumbarYokeRimGeo_v5', () => new THREE.TorusGeometry(0.024, 0.0014, 8, 24));
  const yokeRim = new THREE.Mesh(yokeRimGeo, materials.metallic);
  yokeRim.rotation.x = Math.PI / 2;
  yokeRim.position.set(0, -0.184, -0.026);
  group.add(yokeRim);

  // Subtle purple optical indicator slit inside the load-transfer housing
  const yokeLedGeo = geoCache.get('LumbarYokeLedGeo_v5', () => new THREE.BoxGeometry(0.018, 0.0018, 0.003));
  const yokeLed = new THREE.Mesh(yokeLedGeo, materials.purpleEmissive);
  yokeLed.name = 'LumbarLoadTransferLed';
  yokeLed.position.set(0, -0.190, -0.037);
  group.add(yokeLed);
  ledMeshes.push(yokeLed);

  // Transverse trunnion pivot axle pin through yoke
  const trunnionPinGeo = geoCache.get('LumbarRefinedTrunnionPinGeo_v5', () => {
    const g = new THREE.CylinderGeometry(0.0028, 0.0028, 0.046, 16);
    g.rotateZ(Math.PI / 2);
    return g;
  });
  const trunnionPin = new THREE.Mesh(trunnionPinGeo, materials.metallic);
  trunnionPin.position.set(0, -0.192, -0.026);
  group.add(trunnionPin);

  // End retaining caps on trunnion pin
  const capGeo = geoCache.get('LumbarRefinedPinCapGeo_v5', () => {
    const g = new THREE.CylinderGeometry(0.0038, 0.0038, 0.0025, 16);
    g.rotateZ(Math.PI / 2);
    return g;
  });
  for (const cSide of [-1, 1] as const) {
    const cap = new THREE.Mesh(capGeo, materials.joint);
    cap.position.set(cSide * 0.024, -0.192, -0.026);
    group.add(cap);
  }

  // =========================================================================
  // 3. INTEGRATED ACTUATOR ATTACHMENT BOSSES & DOWNWARD WAIST TIE-INS
  // Preserves bilateralStabilizers group node for strict interface compatibility,
  // while keeping geometry compact, robust, and free of clutter.
  // =========================================================================
  const bilateralStabilizers = new THREE.Group();
  bilateralStabilizers.name = 'RearLumbarStabilizerBosses';

  // Dedicated structural lower clevis mounting bosses integrated on the lumbar wings
  const actuatorMountBossGeo = geoCache.get('LumbarActuatorMountBossGeo_v5', () => new THREE.BoxGeometry(0.016, 0.014, 0.016));
  for (const side of [-1, 1] as const) {
    const boss = new THREE.Mesh(actuatorMountBossGeo, materials.joint);
    boss.position.set(side * 0.056, -0.198, -0.040);
    boss.rotation.z = -side * 0.10;
    bilateralStabilizers.add(boss);

    // Structural vertical tie-bolt securing lumbar frame into waist deck
    const tieBoltGeo = geoCache.get('LumbarWaistTieBoltGeo_v5', () => new THREE.CylinderGeometry(0.0018, 0.0018, 0.014, 8));
    const tieBolt = new THREE.Mesh(tieBoltGeo, materials.metallic);
    tieBolt.position.set(side * 0.048, -0.206, -0.034);
    bilateralStabilizers.add(tieBolt);
  }
  group.add(bilateralStabilizers);

  // =========================================================================
  // 4. RECESSED LUMBAR MAINTENANCE COVER & FLUSH FASTENERS
  // =========================================================================
  const hatchGeo = geoCache.get('LumbarRefinedMaintenanceHatchGeo_v5', () => new THREE.BoxGeometry(0.032, 0.012, 0.0035));
  const maintenanceHatch = new THREE.Mesh(hatchGeo, materials.joint);
  maintenanceHatch.name = 'LumbarMaintenanceHatch';
  maintenanceHatch.position.set(0, -0.202, -0.052);
  maintenanceHatch.castShadow = true;
  group.add(maintenanceHatch);

  const boltGeo = geoCache.get('LumbarRefinedBoltGeo_v5', () => {
    const g = new THREE.CylinderGeometry(0.0012, 0.0012, 0.0020, 6);
    g.rotateX(Math.PI / 2);
    return g;
  });

  for (const bx of [-0.012, 0.012]) {
    for (const by of [-0.0035, 0.0035]) {
      const bolt = new THREE.Mesh(boltGeo, materials.metallic);
      bolt.position.set(bx, -0.202 + by, -0.054);
      group.add(bolt);
    }
  }

  // =========================================================================
  // 5. PROTECTED CONDUIT PASS-THROUGH GLANDS
  // Sealed pass-through for spinal conduits entering the waist mechanism
  // =========================================================================
  const passageGeo = geoCache.get('LumbarRefinedConduitPassageGeo_v5', () => new THREE.CylinderGeometry(0.011, 0.013, 0.010, 16));
  const conduitPassage = new THREE.Mesh(passageGeo, materials.joint);
  conduitPassage.name = 'LumbarConduitPassageGland';
  conduitPassage.position.set(0, -0.210, -0.036);
  group.add(conduitPassage);

  // Dual metallic pass-through collars matching the twin spinal cables
  const glandRingGeo = geoCache.get('LumbarRefinedGlandRingGeo_v5', () => new THREE.TorusGeometry(0.0048, 0.0011, 6, 16));
  for (const gSide of [-1, 1] as const) {
    const glandRing = new THREE.Mesh(glandRingGeo, materials.metallic);
    glandRing.rotation.x = Math.PI / 2;
    glandRing.position.set(gSide * 0.007, -0.210, -0.036);
    group.add(glandRing);
  }

  return {
    group,
    lumbarFrame,
    centralYoke,
    bilateralStabilizers,
    maintenanceHatch,
    conduitPassage,
    ledMeshes,
  };
}

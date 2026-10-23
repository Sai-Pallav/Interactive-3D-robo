import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { geoCache } from '../utils/GeometryCache';
import { TORSO_CONFIG } from './TorsoConfig';

export interface RearThoracicAssemblyNodes {
  group: THREE.Group;
  backboneChassis: THREE.Mesh;
  scapularArmorLeft: THREE.Mesh;
  scapularArmorRight: THREE.Mesh;
  coolingCore: THREE.Group;
  powerDistributionUnit: THREE.Group;
  shoulderBrackets: THREE.Group;
  cableHarnesses: THREE.Group;
  serviceHatch: THREE.Mesh;
  ledMeshes: THREE.Mesh[];
}

/**
 * Creates the high-precision Rear Thoracic & Scapular Assembly (Master Prompt Sections 1-9):
 * 1. Centered dark titanium backbone chassis column with silky-smooth tapered CAD silhouette
 * 2. Left and right sculpted solid 3D white ceramic composite scapular armor panels:
 *    - Aerodynamic silhouette with smooth suprascapular crest and controlled chamfered bevels
 *    - Constant, uniform 3mm panel gaps framing the central housing and shoulder joints
 *    - Clean continuous armor surface with shallow recessed maintenance hatch
 * 3. Integrated dual-tier recessed ventilation systems:
 *    - Upper primary recessed heat-exchanger louvers with perimeter CNC bezel, angled aerofoil blades,
 *      and high-density radiator matrix
 *    - Lower auxiliary recessed intake cavity with protective slats, recessed impeller turbine, and clean backing
 * 4. Central vertical PDU housing with signature violet diagnostic power-bus LED strip
 * 5. Lower thoracic actuator mounting bulkheads providing rigid structural anchors for diagonal dampers
 * 6. Rear shoulder wishbone trunnion braces with concentric bearing raceways and deltoid transition fairings
 * 7. Shielded cable harnesses with CNC machined P-clamps
 */
export function createRearThoracicAssembly(materials: RobotMaterialPalette): RearThoracicAssemblyNodes {
  const group = new THREE.Group();
  group.name = 'RearThoracicAssembly';

  const ledMeshes: THREE.Mesh[] = [];

  // =========================================================================
  // 1. CENTRAL STRUCTURAL BACKBONE CHASSIS (Dark Titanium)
  // Continuous smooth tapered load-bearing column centered on X=0
  // =========================================================================
  const backboneShape = new THREE.Shape();
  backboneShape.moveTo(-0.024, 0.125);
  backboneShape.lineTo(0.024, 0.125);
  backboneShape.lineTo(0.028, 0.065);
  backboneShape.lineTo(0.026, 0.005);
  backboneShape.lineTo(0.020, -0.060);
  backboneShape.lineTo(-0.020, -0.060);
  backboneShape.lineTo(-0.026, 0.005);
  backboneShape.lineTo(-0.028, 0.065);
  backboneShape.closePath();

  // Central recessed structural channel pocket
  const channelHole = new THREE.Path();
  channelHole.moveTo(-0.016, 0.114);
  channelHole.lineTo(0.016, 0.114);
  channelHole.lineTo(0.013, -0.050);
  channelHole.lineTo(-0.013, -0.050);
  channelHole.closePath();
  backboneShape.holes.push(channelHole);

  const backboneGeo = geoCache.get('ThoracicBackboneChassisGeo_v7', () => {
    const g = new THREE.ExtrudeGeometry(backboneShape, {
      depth: 0.032,
      bevelEnabled: true,
      bevelThickness: 0.0035,
      bevelSize: 0.0028,
      bevelSegments: 3,
    });
    g.translate(0, 0, -0.016);
    return g;
  });

  const backboneChassis = new THREE.Mesh(backboneGeo, materials.joint);
  backboneChassis.name = 'ThoracicBackboneChassis';
  backboneChassis.position.set(0, 0, -0.076);
  backboneChassis.rotation.x = 0.04;
  backboneChassis.castShadow = true;
  backboneChassis.receiveShadow = true;
  group.add(backboneChassis);

  // Structural transverse ribs located behind solid armor sections
  const ribGeoUpper = geoCache.get('ThoracicRibGeo_Upper_v7', () => new THREE.BoxGeometry(0.136, 0.008, 0.014));
  const ribUpper = new THREE.Mesh(ribGeoUpper, materials.joint);
  ribUpper.position.set(0, 0.100, -0.072);
  ribUpper.rotation.x = 0.04;
  ribUpper.castShadow = true;
  group.add(ribUpper);

  const ribGeoMid = geoCache.get('ThoracicRibGeo_Mid_v7', () => new THREE.BoxGeometry(0.128, 0.008, 0.014));
  const ribMid = new THREE.Mesh(ribGeoMid, materials.joint);
  ribMid.position.set(0, 0.038, -0.072); // Behind solid white dividing armor bridge
  ribMid.rotation.x = 0.04;
  ribMid.castShadow = true;
  group.add(ribMid);

  // 1b. Lower Thoracic Frame Docking Clevis (Anchors Spine Vertebra 01)
  const dockClevisGeo = geoCache.get('ThoracicSpineDockClevisGeo_v7', () => new THREE.BoxGeometry(0.034, 0.022, 0.026));
  const dockClevis = new THREE.Mesh(dockClevisGeo, materials.joint);
  dockClevis.name = 'ThoracicSpineDockClevis';
  dockClevis.position.set(0, -0.056, -0.064);
  dockClevis.rotation.x = 0.04;
  dockClevis.castShadow = true;
  group.add(dockClevis);

  const dockClevisPinGeo = geoCache.get('ThoracicSpineDockPinGeo_v7', () => {
    const g = new THREE.CylinderGeometry(0.0032, 0.0032, 0.040, 16);
    g.rotateZ(Math.PI / 2);
    return g;
  });
  const dockPin = new THREE.Mesh(dockClevisPinGeo, materials.metallicDoubleSide);
  dockPin.position.set(0, -0.056, -0.064);
  dockPin.rotation.x = 0.04;
  group.add(dockPin);

  // 1c. Structural Upper Actuator Mounting Bulkhead Lugs (Anchoring paired diagonal actuators)
  const actuatorMountLugGeo = geoCache.get('ThoracicActuatorMountLugGeo_v7', () => new THREE.BoxGeometry(0.016, 0.016, 0.020));
  // Continuous medial reinforcement gusset bridging from central backbone chassis (x ≈ ±0.026) to actuator lug (x = ±0.080)
  const actuatorGussetGeo = geoCache.get('ThoracicActuatorGussetGeo_v8', () => new THREE.BoxGeometry(0.048, 0.008, 0.014));

  const rearCfg = TORSO_CONFIG.stomach.rearActuators;
  const rearUpper = rearCfg?.upperMount ?? { x: 0.080, y: -0.048, z: -0.056 };
  const rearLower = rearCfg?.lowerMount ?? { x: 0.056, y: -0.198, z: -0.040 };
  const rearAngleZ = Math.atan2(rearUpper.x - rearLower.x, rearUpper.y - rearLower.y);

  for (const side of [-1, 1] as const) {
    const lug = new THREE.Mesh(actuatorMountLugGeo, materials.joint);
    lug.name = `ThoracicActuatorLug_${side === -1 ? 'L' : 'R'}`;
    // Anchor directly on thoracic chassis frame bulkhead above and behind the clevis pin (y = -0.048, z = -0.056)
    lug.position.set(side * rearUpper.x, -0.045, -0.058);
    lug.rotation.z = -side * rearAngleZ;
    lug.rotation.x = 0.04;
    lug.castShadow = true;
    group.add(lug);

    const gusset = new THREE.Mesh(actuatorGussetGeo, materials.joint);
    // Centered at x = ±0.050 with width 0.048, solidly bridging from x = ±0.026 (backbone) to x = ±0.074 (lug inner flank)
    gusset.position.set(side * 0.050, -0.045, -0.060);
    gusset.rotation.z = -side * (rearAngleZ * 0.5);
    gusset.rotation.x = 0.04;
    group.add(gusset);
  }

  // =========================================================================
  // 2. LAYERED SCAPULAR ARMOR PANELS & RECESSED VENTILATION MODULES
  // Continuous white shell, precision recessed vent openings, smooth curvature
  // =========================================================================
  const coolingCore = new THREE.Group();
  coolingCore.name = 'RearCoolingSystemsGroup';
  coolingCore.position.set(0, 0, -0.076);
  coolingCore.rotation.x = 0.04;

  // Geometry definitions for recessed ventilation modules
  const ventFrameGeo = geoCache.get('ScapularVentFrameGeo_v8', () => {
    const frameShape = new THREE.Shape();
    const W = 0.064 * 0.5;
    const H = 0.040 * 0.5;
    frameShape.moveTo(-W, H);
    frameShape.lineTo(W, H);
    frameShape.lineTo(W, -H);
    frameShape.lineTo(-W, -H);
    frameShape.closePath();

    const hole = new THREE.Path();
    const iW = 0.052 * 0.5;
    const iH = 0.028 * 0.5;
    hole.moveTo(-iW, iH);
    hole.lineTo(iW, iH);
    hole.lineTo(iW, -iH);
    hole.lineTo(-iW, -iH);
    hole.closePath();
    frameShape.holes.push(hole);

    const g = new THREE.ExtrudeGeometry(frameShape, {
      depth: 0.003,
      bevelEnabled: true,
      bevelThickness: 0.0016,
      bevelSize: 0.0014,
      bevelSegments: 3,
    });
    g.center();
    return g;
  });

  const ventWallHGeo = geoCache.get('VentWallHGeo_v8', () => new THREE.BoxGeometry(0.052, 0.0018, 0.012));
  const ventWallVGeo = geoCache.get('VentWallVGeo_v8', () => new THREE.BoxGeometry(0.0018, 0.028, 0.012));
  const ventBackplateGeo = geoCache.get('ScapularVentBackplateGeo_v8', () => new THREE.BoxGeometry(0.052, 0.028, 0.002));
  const louverSlatGeo = geoCache.get('ScapularLouverSlatGeo_v8', () => new THREE.BoxGeometry(0.050, 0.0024, 0.0050));
  const finGeo = geoCache.get('RadiatorFinGeo_v8', () => new THREE.BoxGeometry(0.0010, 0.022, 0.003));

  // Access Panel Geometry definitions
  const accessSeamGeo = geoCache.get('AccessSeamGeo_v8', () => new THREE.BoxGeometry(0.0432, 0.0192, 0.0008));
  const accessPanelGeo = geoCache.get('AccessPanelGeo_v8', () => {
    const shape = new THREE.Shape();
    const W = 0.042 * 0.5;
    const H = 0.018 * 0.5;
    shape.moveTo(-W, H);
    shape.lineTo(W, H);
    shape.lineTo(W, -H);
    shape.lineTo(-W, -H);
    shape.closePath();

    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.0016,
      bevelEnabled: true,
      bevelThickness: 0.0006,
      bevelSize: 0.0006,
      bevelSegments: 2,
    });
    g.center();
    return g;
  });

  const hexScrewGeo = geoCache.get('ScapularHexScrewGeo_v8', () => {
    const g = new THREE.CylinderGeometry(0.0009, 0.0009, 0.0016, 6);
    g.rotateX(Math.PI / 2);
    return g;
  });

  function createSolidScapularArmor(side: -1 | 1): THREE.Mesh {
    const scapularShape = new THREE.Shape();
    // Medial edge along central vertical housing maintaining constant ~3mm gap
    scapularShape.moveTo(0.026, 0.124);
    // Suprascapular crest curving smoothly outward toward shoulder pauldron
    scapularShape.lineTo(0.065, 0.122);
    scapularShape.bezierCurveTo(0.095, 0.120, 0.135, 0.110, 0.152, 0.098);
    scapularShape.bezierCurveTo(0.160, 0.092, 0.166, 0.084, 0.166, 0.076);
    // Lateral ribcage flank sweeping smoothly around shoulder socket
    scapularShape.bezierCurveTo(0.166, 0.040, 0.160, 0.005, 0.150, -0.015);
    scapularShape.bezierCurveTo(0.142, -0.032, 0.128, -0.048, 0.110, -0.056);
    // Inferior border tapering medially to the lower spine dock
    scapularShape.lineTo(0.060, -0.056);
    scapularShape.lineTo(0.023, -0.056);
    // Medial return following backbone taper
    scapularShape.lineTo(0.028, 0.005);
    scapularShape.lineTo(0.030, 0.065);
    scapularShape.closePath();

    // 2.1 Cutout: Upper Primary Ventilation Module Window ONLY
    const ventWindow = new THREE.Path();
    ventWindow.moveTo(0.054, 0.083);
    ventWindow.lineTo(0.114, 0.083);
    ventWindow.lineTo(0.114, 0.047);
    ventWindow.lineTo(0.054, 0.047);
    ventWindow.closePath();
    scapularShape.holes.push(ventWindow);

    const key = `SolidScapularArmorGeo_v8_${side}`;
    const scapularGeo = geoCache.get(key, () => {
      const g = new THREE.ExtrudeGeometry(scapularShape, {
        depth: 0.0075, // Solid 7.5mm ceramic composite armor
        bevelEnabled: true,
        bevelThickness: 0.0022,
        bevelSize: 0.0018,
        bevelSegments: 4,
        curveSegments: 36,
      });

      // Smooth compound anatomical curvature
      const pos = g.attributes.position;
      const xMin = 0.023;
      const xMax = 0.166;
      const yMin = -0.056;
      const yMax = 0.124;

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);

        const u = Math.max(0, Math.min(1, (x - xMin) / (xMax - xMin)));
        const v = Math.max(0, Math.min(1, (yMax - y) / (yMax - yMin)));

        const camber = -Math.sin(u * Math.PI * 0.75) * 0.010 * (1.0 - 0.20 * v);
        const lateralSweep = -Math.pow(u, 2.2) * 0.012;

        pos.setZ(i, z + camber + lateralSweep);
      }

      // Mirror left side geometry across X=0 plane with rigorous non-indexed triangle winding swap
      if (side === -1) {
        g.scale(-1, 1, 1);
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i += 3) {
          const x0 = p.getX(i), y0 = p.getY(i), z0 = p.getZ(i);
          const x1 = p.getX(i + 1), y1 = p.getY(i + 1), z1 = p.getZ(i + 1);
          p.setXYZ(i, x1, y1, z1);
          p.setXYZ(i + 1, x0, y0, z0);
        }
      }
      g.computeVertexNormals();

      return g;
    });

    const scapularArmor = new THREE.Mesh(scapularGeo, materials.armorDoubleSide);
    scapularArmor.name = side === -1 ? 'ScapularArmor_Left' : 'ScapularArmor_Right';
    scapularArmor.position.set(0, 0, -0.076);
    scapularArmor.rotation.x = 0.04;
    scapularArmor.castShadow = true;
    scapularArmor.receiveShadow = true;

    // 2.2 Matching Flush-Mounted Lower Armor Access Panel
    // Symmetrical, intentional maintenance panel replacing unfinished gray cutouts
    const accessGroup = new THREE.Group();
    accessGroup.name = `ScapularAccessPanel_${side === -1 ? 'L' : 'R'}`;
    accessGroup.position.set(side * 0.084, 0.016, -0.0093);
    accessGroup.rotation.y = side * 0.145;

    // Dark perimeter seam channel
    const seam = new THREE.Mesh(accessSeamGeo, materials.jointDoubleSide);
    seam.position.set(0, 0, -0.0003);
    accessGroup.add(seam);

    // Flush ceramic access cover plate
    const cover = new THREE.Mesh(accessPanelGeo, materials.armorDoubleSide);
    cover.position.set(0, 0, -0.0008);
    cover.castShadow = true;
    accessGroup.add(cover);

    // 4 Corner hex fasteners
    for (const hx of [-0.015, 0.015]) {
      for (const hy of [-0.0055, 0.0055]) {
        const screw = new THREE.Mesh(hexScrewGeo, materials.metallicDoubleSide);
        screw.position.set(hx, hy, -0.0016);
        accessGroup.add(screw);
      }
    }
    scapularArmor.add(accessGroup);

    // 2.3 Structural Perimeter Hardpoint Fasteners
    const bossFastenerGeo = geoCache.get('ScapularBossFastenerGeo_v8', () => {
      const g = new THREE.CylinderGeometry(0.0014, 0.0014, 0.0024, 6);
      g.rotateX(Math.PI / 2);
      return g;
    });

    const bossLocations = [
      { x: 0.038, y: 0.118 }, // Medial upper
      { x: 0.145, y: 0.092 }, // Lateral upper
      { x: 0.036, y: -0.046 }, // Medial lower
      { x: 0.115, y: -0.046 }, // Lateral lower
    ];

    for (const bLoc of bossLocations) {
      const fastener = new THREE.Mesh(bossFastenerGeo, materials.metallicDoubleSide);
      fastener.position.set(side * bLoc.x, bLoc.y, -0.0035);
      scapularArmor.add(fastener);

      const washerGeo = geoCache.get('ScapularWasherGeo_v8', () => new THREE.TorusGeometry(0.0022, 0.0005, 6, 16));
      const washer = new THREE.Mesh(washerGeo, materials.jointDoubleSide);
      washer.position.set(side * bLoc.x, bLoc.y, -0.0033);
      scapularArmor.add(washer);
    }

    // 2.4 Rear Deltoid Transition Collar (cradling shoulder joint smoothly)
    const deltoidCollarGeo = geoCache.get('ScapularDeltoidCollarGeo_v8', () => {
      const g = new THREE.CylinderGeometry(0.038, 0.042, 0.012, 24, 1, false, 0, Math.PI * 0.90);
      g.rotateZ(Math.PI / 2);
      g.rotateY(-Math.PI / 2);
      return g;
    });
    const deltoidCollar = new THREE.Mesh(deltoidCollarGeo, materials.armorDoubleSide);
    deltoidCollar.position.set(side * 0.160, 0.045, -0.004);
    deltoidCollar.scale.set(side, 1.15, 0.85);
    scapularArmor.add(deltoidCollar);

    return scapularArmor;
  }

  // 2.5 REFINED INTEGRATED RECESSED VENTILATION MODULES
  function createVentilationModule(side: -1 | 1): THREE.Group {
    const ventAssembly = new THREE.Group();
    ventAssembly.name = `PrimaryVentAssembly_${side === -1 ? 'L' : 'R'}`;
    ventAssembly.position.set(side * 0.084, 0.065, -0.0095);
    ventAssembly.rotation.y = side * 0.145;

    // Beveled CNC metallic outer frame
    const bezel = new THREE.Mesh(ventFrameGeo, materials.metallicDoubleSide);
    bezel.position.set(0, 0, -0.0012);
    bezel.castShadow = true;
    ventAssembly.add(bezel);

    // Recessed Cavity Inner Walls (providing visible depth and sidewalls)
    const wallTop = new THREE.Mesh(ventWallHGeo, materials.jointDoubleSide);
    wallTop.position.set(0, 0.014, 0.005);
    ventAssembly.add(wallTop);

    const wallBottom = new THREE.Mesh(ventWallHGeo, materials.jointDoubleSide);
    wallBottom.position.set(0, -0.014, 0.005);
    ventAssembly.add(wallBottom);

    const wallLeft = new THREE.Mesh(ventWallVGeo, materials.jointDoubleSide);
    wallLeft.position.set(-0.026, 0, 0.005);
    ventAssembly.add(wallLeft);

    const wallRight = new THREE.Mesh(ventWallVGeo, materials.jointDoubleSide);
    wallRight.position.set(0.026, 0, 0.005);
    ventAssembly.add(wallRight);

    // 5 Evenly spaced horizontal graphite grille slats (louvers) inside the recessed cavity
    const slatCount = 5;
    for (let s = 0; s < slatCount; s++) {
      const sY = -0.009 + s * 0.0045;
      const slat = new THREE.Mesh(louverSlatGeo, materials.jointDoubleSide);
      slat.position.set(0, sY, 0.0025);
      slat.rotation.x = 0.38; // ~22° downward directional slats
      slat.castShadow = true;
      ventAssembly.add(slat);
    }

    // High-density internal radiator matrix core behind the slats
    const finCount = 7;
    for (let f = 0; f < finCount; f++) {
      const fX = -0.018 + f * 0.006;
      const fin = new THREE.Mesh(finGeo, materials.metallicDoubleSide);
      fin.position.set(fX, 0, 0.0075);
      ventAssembly.add(fin);
    }

    // Dark titanium backplate
    const backplate = new THREE.Mesh(ventBackplateGeo, materials.jointDoubleSide);
    backplate.position.set(0, 0, 0.010);
    ventAssembly.add(backplate);

    return ventAssembly;
  }

  const scapularArmorLeft = createSolidScapularArmor(-1);
  group.add(scapularArmorLeft);

  const scapularArmorRight = createSolidScapularArmor(1);
  group.add(scapularArmorRight);

  // Add Left & Right Ventilation Modules to coolingCore
  const ventLeft = createVentilationModule(-1);
  coolingCore.add(ventLeft);

  const ventRight = createVentilationModule(1);
  coolingCore.add(ventRight);

  group.add(coolingCore);

  // =========================================================================
  // 4. CENTRAL POWER DISTRIBUTION UNIT (PDU) & DIAGNOSTIC LED BAR
  // Deeply integrated into the narrow structural channel of the backbone
  // =========================================================================
  const powerDistributionUnit = new THREE.Group();
  powerDistributionUnit.name = 'PowerDistributionUnit';
  powerDistributionUnit.position.set(0, 0.075, -0.078);
  powerDistributionUnit.rotation.x = 0.04;

  const pduBoxGeo = geoCache.get('PDUBoxGeo_v7', () => new THREE.BoxGeometry(0.034, 0.030, 0.016));
  const pduBox = new THREE.Mesh(pduBoxGeo, materials.joint);
  pduBox.castShadow = true;
  powerDistributionUnit.add(pduBox);

  // CNC Machined Metallic Perimeter Rim
  const pduRimGeo = geoCache.get('PDURimGeo_v7', () => new THREE.BoxGeometry(0.036, 0.032, 0.002));
  const pduRim = new THREE.Mesh(pduRimGeo, materials.metallic);
  pduRim.position.set(0, 0, -0.0085);
  powerDistributionUnit.add(pduRim);

  // Signature Horizontal Violet Power-Bus Diagnostic LED Strip
  const pduLedGeo = geoCache.get('PDULedGeo_v7', () => new THREE.BoxGeometry(0.026, 0.0026, 0.003));
  const pduLed = new THREE.Mesh(pduLedGeo, materials.purpleEmissive);
  pduLed.name = 'PDU_DiagnosticStatusLed';
  pduLed.position.set(0, 0.006, -0.009);
  powerDistributionUnit.add(pduLed);
  ledMeshes.push(pduLed);

  // Multi-pin high-current bus terminal connectors
  const terminalGeo = geoCache.get('PDUTerminalGeo_v7', () => new THREE.CylinderGeometry(0.0022, 0.0022, 0.006, 12));
  for (const tX of [-0.008, 0, 0.008]) {
    const term = new THREE.Mesh(terminalGeo, materials.metallic);
    term.rotation.x = Math.PI / 2;
    term.position.set(tX, -0.007, -0.009);
    powerDistributionUnit.add(term);
  }

  group.add(powerDistributionUnit);

  // =========================================================================
  // 5. REAR SHOULDER MOUNTING WISHBONE TRUNNION BRACKETS
  // Structural dark titanium trunnions supporting shoulders from behind
  // =========================================================================
  const shoulderBrackets = new THREE.Group();
  shoulderBrackets.name = 'RearShoulderTrunnionBrackets';

  const bracketShape = new THREE.Shape();
  bracketShape.moveTo(0, 0.024);
  bracketShape.lineTo(0.052, 0.016);
  bracketShape.lineTo(0.054, -0.018);
  bracketShape.lineTo(0.012, -0.024);
  bracketShape.lineTo(0, -0.010);
  bracketShape.closePath();

  const bracketGeo = geoCache.get('RearShoulderBracketGeo_v7', () => {
    const g = new THREE.ExtrudeGeometry(bracketShape, {
      depth: 0.022,
      bevelEnabled: true,
      bevelThickness: 0.0030,
      bevelSize: 0.0024,
      bevelSegments: 2,
    });
    g.center();
    return g;
  });

  const shoulderBearingCapGeo = geoCache.get('RearShoulderBearingCapGeo_v7', () => {
    const g = new THREE.CylinderGeometry(0.038, 0.042, 0.016, 28);
    g.rotateZ(Math.PI / 2);
    return g;
  });

  const shoulderRaceRingGeo = geoCache.get('RearShoulderRaceRingGeo_v7', () => {
    const g = new THREE.TorusGeometry(0.035, 0.0016, 8, 28);
    g.rotateY(Math.PI / 2);
    return g;
  });

  for (const side of [-1, 1] as const) {
    const armBraceGroup = new THREE.Group();
    armBraceGroup.name = `RearShoulderBrace_${side === -1 ? 'L' : 'R'}`;
    // Anchors thoracic spine at side * 0.165 and extends forward-lateral to seat into shoulder mounting bulkhead
    armBraceGroup.position.set(side * 0.165, 0.052, -0.034);
    armBraceGroup.rotation.y = side * 0.10;

    const wishbone = new THREE.Mesh(bracketGeo, materials.jointDoubleSide);
    wishbone.scale.set(side, 1, 1);
    wishbone.castShadow = true;
    armBraceGroup.add(wishbone);

    const cap = new THREE.Mesh(shoulderBearingCapGeo, materials.jointDoubleSide);
    cap.position.set(side * 0.024, 0, 0.018);
    armBraceGroup.add(cap);

    const raceRing = new THREE.Mesh(shoulderRaceRingGeo, materials.metallicDoubleSide);
    raceRing.position.set(side * 0.029, 0, 0.018);
    armBraceGroup.add(raceRing);

    const boltGeo = geoCache.get('RearShoulderBoltGeo_v7', () => {
      const g = new THREE.CylinderGeometry(0.0016, 0.0016, 0.0035, 6);
      g.rotateZ(Math.PI / 2);
      return g;
    });

    for (let b = 0; b < 6; b++) {
      const bAngle = (b / 6) * Math.PI * 2;
      const bolt = new THREE.Mesh(boltGeo, materials.metallic);
      bolt.position.set(
        side * (0.024 + 0.006),
        Math.sin(bAngle) * 0.026,
        0.018 + Math.cos(bAngle) * 0.026
      );
      armBraceGroup.add(bolt);
    }

    shoulderBrackets.add(armBraceGroup);
  }

  group.add(shoulderBrackets);

  // =========================================================================
  // 6. REAR MID-THORACIC SERVICE MAINTENANCE HATCH
  // Precision recessed inspection cover with M3 hex fasteners
  // =========================================================================
  const hatchShape = new THREE.Shape();
  hatchShape.moveTo(-0.020, 0.015);
  hatchShape.lineTo(0.020, 0.015);
  hatchShape.lineTo(0.018, -0.015);
  hatchShape.lineTo(-0.018, -0.015);
  hatchShape.closePath();

  const serviceHatchGeo = geoCache.get('RearThoracicServiceHatchGeo_v7', () => {
    const g = new THREE.ExtrudeGeometry(hatchShape, {
      depth: 0.005,
      bevelEnabled: true,
      bevelThickness: 0.0018,
      bevelSize: 0.0015,
      bevelSegments: 2,
    });
    g.center();
    return g;
  });

  const serviceHatch = new THREE.Mesh(serviceHatchGeo, materials.joint);
  serviceHatch.name = 'RearThoracicServiceHatch';
  serviceHatch.position.set(0, -0.015, -0.084);
  serviceHatch.rotation.x = 0.04;
  serviceHatch.castShadow = true;
  group.add(serviceHatch);

  const hatchRimGeo = geoCache.get('RearHatchRimGeo_v7', () => new THREE.BoxGeometry(0.044, 0.034, 0.002));
  const hatchRim = new THREE.Mesh(hatchRimGeo, materials.metallic);
  hatchRim.position.set(0, -0.015, -0.082);
  hatchRim.rotation.x = 0.04;
  group.add(hatchRim);

  const hexBoltGeo = geoCache.get('ThoracicHexBoltGeo_v7', () => {
    const g = new THREE.CylinderGeometry(0.0012, 0.0012, 0.0020, 6);
    g.rotateX(Math.PI / 2);
    return g;
  });

  for (const hx of [-0.015, 0.015]) {
    for (const hy of [-0.009, 0.009]) {
      const bolt = new THREE.Mesh(hexBoltGeo, materials.metallic);
      bolt.position.set(hx, -0.015 + hy, -0.085);
      bolt.rotation.x = 0.04;
      group.add(bolt);
    }
  }

  // =========================================================================
  // 7. SHIELDED REAR CABLE HARNESSES WITH CNC P-CLAMPS
  // =========================================================================
  const cableHarnesses = new THREE.Group();
  cableHarnesses.name = 'RearThoracicCableHarnesses';

  for (const side of [-1, 1] as const) {
    const pts = [
      new THREE.Vector3(side * 0.016, 0.072, -0.076),
      new THREE.Vector3(side * 0.034, 0.066, -0.070),
      new THREE.Vector3(side * 0.115, 0.052, -0.060),
      new THREE.Vector3(side * 0.158, 0.050, -0.044),
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    const cableGeo = geoCache.get(`ThoracicCableHarnessGeo_v8_${side}`, () => new THREE.TubeGeometry(curve, 20, 0.0022, 8, false));
    const cableMesh = new THREE.Mesh(cableGeo, materials.joint);
    cableMesh.castShadow = true;
    cableHarnesses.add(cableMesh);

    const clampGeo = geoCache.get('ThoracicCableClampGeo_v8', () => new THREE.BoxGeometry(0.005, 0.005, 0.004));
    const clamp1 = new THREE.Mesh(clampGeo, materials.metallic);
    clamp1.position.copy(pts[1]);
    cableHarnesses.add(clamp1);

    const clamp2 = new THREE.Mesh(clampGeo, materials.metallic);
    clamp2.position.copy(pts[2]);
    cableHarnesses.add(clamp2);
  }

  group.add(cableHarnesses);

  return {
    group,
    backboneChassis,
    scapularArmorLeft,
    scapularArmorRight,
    coolingCore,
    powerDistributionUnit,
    shoulderBrackets,
    cableHarnesses,
    serviceHatch,
    ledMeshes,
  };
}

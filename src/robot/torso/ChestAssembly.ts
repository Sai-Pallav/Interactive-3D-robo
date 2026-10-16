import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { TORSO_CONFIG } from './TorsoConfig';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger';
import { ROBOT_ACCENT } from '../config';
import { createChestShoulderExtension, ShoulderExtensionNodes } from '../shoulder/ChestShoulderExtension';
import { geoCache } from '../utils/GeometryCache';
import { createRearThoracicAssembly, RearThoracicAssemblyNodes } from './RearThoracicAssembly';

// ─── Public interfaces (strictly preserved for animation controller compatibility) ──

export interface ChestArmorNodes {
  group: THREE.Group;
  centerPanel: THREE.Mesh;
  leftPanel: THREE.Mesh;
  rightPanel: THREE.Mesh;
  logo: THREE.Mesh;
  leftLightStrip?: THREE.Mesh;
  rightLightStrip?: THREE.Mesh;
  flankArmorLeft?: THREE.Mesh;
  flankArmorRight?: THREE.Mesh;
  lowerUnderside?: THREE.Mesh;
}

export interface UpperTorsoFrameNodes {
  group: THREE.Group;
  frameSpine: THREE.Mesh;
  frameClavicleLeft: THREE.Mesh;
  frameClavicleRight: THREE.Mesh;
  neckCollar: THREE.Mesh;
  neckCollarSleeve: THREE.Mesh;
  neckCollarLightRing?: THREE.Mesh;
  neckCollarLightSlit?: THREE.Mesh;
  backArmor: THREE.Mesh;
  backLightBar: THREE.Mesh;
  rearThoracic?: RearThoracicAssemblyNodes;
  lowerFrame: THREE.Group;
  ledMeshes: THREE.Mesh[];
}

export interface ShoulderMountNodes {
  group: THREE.Group;
  socketHousing: THREE.Mesh;
  rotaryTrunnion: THREE.Mesh;
  accentRing: THREE.Mesh;
  ledMeshes: THREE.Mesh[];
  extensionNodes?: ShoulderExtensionNodes;
}

export interface ChestAssemblyNodes {
  chestArmor: ChestArmorNodes;
  upperTorsoFrame: UpperTorsoFrameNodes;
  shoulderMountLeft: ShoulderMountNodes;
  shoulderMountRight: ShoulderMountNodes;
  rearThoracic?: RearThoracicAssemblyNodes;
  ledMeshes: THREE.Mesh[];
}

// ─── 1. CENTRAL LOGO "A" ─────────────────────────────────────────────────────
function createChestLogo(materials: RobotMaterialPalette): THREE.Mesh {
  const geo = geoCache.get('ChestLogoGeo', () => {
    const shape = new THREE.Shape();
    const W = TORSO_CONFIG.chest.logoWidth * 0.5;
    const H = TORSO_CONFIG.chest.logoHeight * 0.5;

    shape.moveTo(0, H);
    shape.lineTo(W, -H);
    shape.lineTo(W * 0.62, -H);
    shape.lineTo(0, -H * 0.18);
    shape.lineTo(-W * 0.62, -H);
    shape.lineTo(-W, -H);
    shape.closePath();

    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.005,
      bevelEnabled: true,
      bevelThickness: 0.0016,
      bevelSize: 0.0012,
      bevelSegments: 2,
    });
    g.center();
    return g;
  });

  const logo = new THREE.Mesh(geo, materials.purpleEmissive);
  logo.name = 'ChestLogo_A';
  logo.castShadow = false;
  return logo;
}

// ─── 2. CENTRAL CHEST PLATE ─────────────────────────────────────────────────
/**
 * Engineered hard-surface central chest armor matching Reference Images:
 * - Defined suprasternal / jugular V-notch at center neckline (framing neck collar LED)
 * - Sculpted clavicle crests (peaking at x = ±0.088, y = 0.178)
 * - Angular shoulder descent (tapering to y = 0.156 at x = ±0.172)
 * - Upper collar chamfer facet sloping into the neck socket
 * - Recessed triangular sternal hollow beneath the notch catching purple glow
 * - Controlled diagonal seams tapering toward sternum
 * - Clean horizontal lower edge terminating at y = -0.040
 * - High-precision hard-surface beveled perimeter and athletic pectoral compound curvature
 */
function createCentralChestPlate(materials: RobotMaterialPalette): {
  mesh: THREE.Mesh;
  frontZ: number;
} {
  const geo = geoCache.get('CentralChestPlateGeo', () => {
    const shape = new THREE.Shape();
    // Expanded & refined upper chest neckline rising smoothly to cup the neck collar
    shape.moveTo(0, 0.178);
    // Curve smoothly up from suprasternal notch to left clavicle peak
    shape.bezierCurveTo(-0.024, 0.180, -0.054, 0.185, -0.088, 0.190);
    // Clavicle shoulder ridge sloping out toward left shoulder mount
    shape.bezierCurveTo(-0.124, 0.185, -0.152, 0.172, -0.172, 0.156);
    // Upper pectoral outer contour
    shape.quadraticCurveTo(-0.188, 0.118, -0.178, 0.072);
    // Outer flank sweeps smoothly down and arches cleanly into the sculpted lower chest contour
    shape.bezierCurveTo(-0.168, 0.038, -0.150, 0.008, -0.125, -0.008);
    // Dips into the sculpted lower pectoral contour (deeper at sides around x = -0.075 to -0.095)
    shape.bezierCurveTo(-0.105, -0.018, -0.075, -0.022, -0.045, -0.014);
    // Gently tapers upward toward the center sub-xiphoid arch/notch framing purple status LED
    shape.bezierCurveTo(-0.026, -0.008, -0.012, 0.000, 0.000, 0.004);
    // Symmetrically on the right side
    shape.bezierCurveTo(0.012, 0.000, 0.026, -0.008, 0.045, -0.014);
    shape.bezierCurveTo(0.075, -0.022, 0.105, -0.018, 0.125, -0.008);
    shape.bezierCurveTo(0.150, 0.008, 0.168, 0.038, 0.178, 0.072);
    shape.quadraticCurveTo(0.188, 0.118, 0.172, 0.156);
    shape.bezierCurveTo(0.152, 0.172, 0.124, 0.185, 0.088, 0.190);
    shape.bezierCurveTo(0.054, 0.185, 0.024, 0.180, 0, 0.178);
    shape.closePath();

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.026,
      bevelEnabled: true,
      bevelThickness: 0.0065,
      bevelSize: 0.0050,
      bevelSegments: 5,
      curveSegments: 48,
    };

    const g = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    g.center();

    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      if (z > 0) {
        const ax = Math.abs(x);

        // 1. Clavicle crest Y position as a function of |x| in centered coordinates
        let yCrest: number;
        if (ax <= 0.088) {
          const t = ax / 0.088;
          yCrest = 0.094 + (0.106 - 0.094) * Math.sin(t * (Math.PI / 2));
        } else {
          const t = Math.min(1.0, (ax - 0.088) / (0.172 - 0.088));
          yCrest = 0.106 - (0.106 - 0.072) * t;
        }

        // 2. Clavicle bone ridge elevation (raised proud along the crest line)
        const distToCrest = y - yCrest;
        let ridgeElev = 0;
        if (Math.abs(distToCrest) < 0.024) {
          ridgeElev = Math.cos((distToCrest / 0.024) * (Math.PI / 2)) * 0.008;
        }

        // 3. Upper collar chamfer facet (sloping back towards neck socket above the crest)
        let chamferSlope = 0;
        if (y > yCrest - 0.015) {
          const chamferT = Math.min(1.0, (y - (yCrest - 0.015)) / 0.035);
          chamferSlope = -chamferT * 0.022;
        }

        // 4. Suprasternal notch triangular recessed facet (sternal depression)
        let notchRecess = 0;
        if (ax < 0.036 && y > 0.070) {
          const tX = 1.0 - ax / 0.036;
          const tY = Math.min(1.0, (y - 0.070) / 0.024);
          notchRecess = -tX * tY * 0.005;
        }

        // 5. Pectoral muscle dome curvature (athletic forward bulge below the clavicle)
        let pectoralBulge = 0;
        if (y < yCrest) {
          const nx = Math.min(1.0, ax / 0.175);
          const ny = Math.min(1.0, Math.max(0, (y + 0.080) / 0.140));
          pectoralBulge = Math.cos(nx * (Math.PI / 2)) * Math.sin(ny * Math.PI) * 0.018;
        }

        // 6. Lateral aerodynamic wrap towards side panels
        const wrapNx = Math.min(1.0, ax / 0.175);
        const lateralWrap = -Math.pow(wrapNx, 2.2) * 0.012;

        // 7. Sculpted lower armor lip (Requirement 4C)
        let lowerLip = 0;
        if (y < -0.030) {
          const tLip = Math.min(1.0, (-y - 0.030) / 0.065);
          lowerLip = Math.sin(tLip * Math.PI) * 0.0042;
        }

        pos.setZ(i, z + ridgeElev + chamferSlope + notchRecess + pectoralBulge + lateralWrap + lowerLip);
      } else {
        // Recessed underside transition (Requirement 4C & 4F)
        if (y < -0.030) {
          const tUnder = Math.min(1.0, (-y - 0.030) / 0.065);
          pos.setZ(i, z + Math.sin(tUnder * (Math.PI / 2)) * 0.0075);
          pos.setY(i, y + tUnder * 0.0040);
        }
      }
    }
    g.computeVertexNormals();
    return g;
  });

  const mesh = new THREE.Mesh(geo, materials.armor);
  mesh.name = 'ChestPlate_Central';
  mesh.position.set(0, 0.0338, 0.048);
  mesh.rotation.x = -0.04;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return { mesh, frontZ: 0.026 * 0.5 + 0.0065 + 0.018 };
}

// ─── 3. CHEST SIDE PANELS & DIAGONAL PURPLE LIGHT STRIPS ────────────────────
function createChestSidePanel(
  side: -1 | 1,
  materials: RobotMaterialPalette
): { panel: THREE.Mesh; lightStrip: THREE.Mesh } {
  const geo = geoCache.get(`ChestSidePanelGeo_${side}`, () => {
    const shape = new THREE.Shape();
    // Sculpted side panel framing the diagonal purple light strip and meeting the extension seam cleanly
    shape.moveTo(side * 0.156, 0.082);
    shape.bezierCurveTo(side * 0.144, 0.010, side * 0.118, -0.028, side * 0.072, -0.046);
    shape.lineTo(side * 0.134, -0.048);
    shape.bezierCurveTo(side * 0.152, -0.015, side * 0.162, 0.050, side * 0.158, 0.142);
    shape.lineTo(side * 0.144, 0.144);
    shape.closePath();

    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.022,
      bevelEnabled: true,
      bevelThickness: 0.0052,
      bevelSize: 0.0040,
      bevelSegments: 4,
      curveSegments: 32,
    });
    g.center();

    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      if (z > 0) {
        const d = Math.abs(x) / 0.16;
        pos.setZ(i, z + Math.sin(d * Math.PI) * 0.010);
      }
    }
    g.computeVertexNormals();
    return g;
  });

  const panel = new THREE.Mesh(geo, materials.armor);
  panel.name = side === -1 ? 'ChestSidePanel_Left' : 'ChestSidePanel_Right';
  panel.position.set(side * 0.118, 0.003, 0.040);
  panel.rotation.y = -side * 0.14;
  panel.rotation.x = -0.04;
  panel.castShadow = true;
  panel.receiveShadow = true;

  // Diagonal Purple Emissive Light Strip aligned flush with side panel
  const stripGeo = geoCache.get('ChestLightStripGeo', () => new THREE.CylinderGeometry(0.0032, 0.0032, 0.128, 14));
  const lightStrip = new THREE.Mesh(stripGeo, materials.purpleEmissive);
  lightStrip.name = side === -1 ? 'ChestLightStrip_Left' : 'ChestLightStrip_Right';
  lightStrip.position.set(side * 0.124, 0.029, 0.064);
  lightStrip.rotation.y = -side * 0.14;
  lightStrip.rotation.z = -side * 0.46;
  lightStrip.rotation.x = -0.04;

  return { panel, lightStrip };
}

// ─── 4. LOWER FLANK ARMOR WITH ARCHED UNDER-COWL ───────────────────────────
// ─── 4. FULL MID-AXILLARY FLANK ARMOR & RIB VENTILATION GILLS ──────────────
/**
 * Engineered mid-axillary lateral ribcage armor panels (Rule 4: Torso & Back Profile).
 * Completely eliminates the hollow, see-through cavity under the armpit:
 * - Spans along Z from the chest side panel (Z = +0.024) back to the rear thoracic scapula (Z = -0.065)
 * - Contours smoothly underneath the shoulder socket bearing with calibrated 5mm articulation clearance arch
 * - Docks flush into the lower thoracic sub-costal arch at Y = -0.046
 * - Features recessed dark titanium heat-exchange louvers and beveled ceramic armor edges
 */
function createChestFlankArmor(
  side: -1 | 1,
  materials: RobotMaterialPalette
): THREE.Mesh {
  const geo = geoCache.get(`ChestFlankArmorGeo_v3_${side}`, () => {
    const shape = new THREE.Shape();
    // 2D Shape Coordinates: X maps to 3D Z, Y maps to 3D Y
    // Anterior top corner meeting chest side panel
    shape.moveTo(0.024, 0.016);
    // Sub-shoulder concave articulation relief arch
    shape.bezierCurveTo(0.010, -0.002, -0.020, -0.002, -0.038, 0.014);
    // Sweeps up-rear to meet the suprascapular return crest
    shape.lineTo(-0.065, 0.032);
    // Posterior vertical boundary framing the rear thoracic scapula panel
    shape.lineTo(-0.065, -0.046);
    // Lower boundary meeting the sub-sternal arch and abdominal transition ring
    shape.bezierCurveTo(-0.042, -0.048, -0.010, -0.048, 0.024, -0.046);
    // Anterior vertical boundary meeting chest side panel
    shape.closePath();

    // Recessed mid-axillary cooling louver window
    const louverWindow = new THREE.Path();
    louverWindow.moveTo(-0.012, -0.016);
    louverWindow.lineTo(-0.050, -0.016);
    louverWindow.lineTo(-0.050, -0.028);
    louverWindow.lineTo(-0.012, -0.028);
    louverWindow.closePath();
    shape.holes.push(louverWindow);

    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.008,
      bevelEnabled: true,
      bevelThickness: 0.0022,
      bevelSize: 0.0018,
      bevelSegments: 3,
      curveSegments: 24,
    });
    g.center();

    // Rotate 2D shape so X maps to 3D Z and extrusion depth maps to 3D X
    g.rotateY(-Math.PI / 2);

    // Anatomical lateral ribcage crowning: subtle outward curvature along mid-axillary line
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const x = pos.getX(i);

      // Crown curvature peaking at center of panel
      const zNorm = (z + 0.020) / 0.045;
      const yNorm = (y + 0.010) / 0.035;
      const crown = Math.cos(Math.max(-1, Math.min(1, zNorm)) * Math.PI * 0.5) *
                    Math.cos(Math.max(-1, Math.min(1, yNorm)) * Math.PI * 0.5) * 0.0035;
      pos.setX(i, x + (side === -1 ? -crown : crown));
    }

    g.computeVertexNormals();
    return g;
  });

  const mesh = new THREE.Mesh(geo, materials.armor);
  mesh.name = side === -1 ? 'ChestFlankArmor_Left' : 'ChestFlankArmor_Right';
  mesh.position.set(side * 0.148, -0.006, -0.020);
  mesh.rotation.y = -side * 0.05;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Inset dark titanium radiator louver core inside the ventilation window
  const louverCoreGeo = geoCache.get(`FlankLouverCoreGeo_v3_${side}`, () => {
    const box = new THREE.BoxGeometry(0.003, 0.011, 0.036);
    return box;
  });
  const louverCore = new THREE.Mesh(louverCoreGeo, materials.joint);
  louverCore.name = side === -1 ? 'FlankLouverCore_L' : 'FlankLouverCore_R';
  louverCore.position.set(-side * 0.0015, -0.022, -0.011);
  mesh.add(louverCore);

  // Louver slats inside the window
  for (let s = 0; s < 3; s++) {
    const slatGeo = geoCache.get('FlankLouverSlatGeo_v3', () => new THREE.BoxGeometry(0.004, 0.0016, 0.034));
    const slat = new THREE.Mesh(slatGeo, materials.metallic);
    slat.position.set(0, -0.018 - s * 0.004, -0.011);
    slat.rotation.z = side * 0.20;
    mesh.add(slat);
  }

  return mesh;
}

// ─── 4B. SCULPTED WHITE LOWER CHEST UNDERSIDE TRANSITION COWL ───────────────
/**
 * Controlled sculpted white ceramic underside return surface (Requirement 4C & 4F).
 * Bridges smoothly from the curved lower pectoral armor lip backward and upward into the
 * chassis frame and rib mechanism with visible depth, compound curvature, and clean clearance.
 */
function createChestLowerUndersideCowl(materials: RobotMaterialPalette): THREE.Mesh {
  const geo = geoCache.get('ChestLowerUndersideCowlGeo', () => {
    const xSegs = 36;
    const ySegs = 14;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let iy = 0; iy <= ySegs; iy++) {
      const ty = iy / ySegs; // 0 = front lip, 1 = recessed underside rear
      for (let ix = 0; ix <= xSegs; ix++) {
        const tx = (ix / xSegs) * 2 - 1; // -1 to +1 across chest
        const x = tx * 0.128;
        const ax = Math.abs(x);

        // Pectoral lower edge compound curve in local centered space
        let edgeY: number;
        if (ax < 0.025) {
          edgeY = -0.098 + 0.003 * (1 - ax / 0.025);
        } else if (ax < 0.085) {
          const t = (ax - 0.025) / 0.060;
          edgeY = -0.098 - 0.012 * Math.sin(t * (Math.PI / 2));
        } else {
          const t = Math.min(1.0, (ax - 0.085) / 0.043);
          edgeY = -0.110 + 0.022 * t;
        }

        // Front lip: starts proud at Z = 0.022 (flush with lower armor lip)
        // Recessed back: sweeps backward to Z = -0.008, angling upward to Y + 0.012
        const curX = x * (1 - ty * 0.06); // gentle side taper toward abdomen
        const curY = edgeY + ty * 0.014;
        const curZ = 0.022 * (1 - ty) - 0.008 * ty - Math.pow(ax / 0.128, 2.0) * 0.006;

        positions.push(curX, curY, curZ);
        uvs.push(ix / xSegs, iy / ySegs);
      }
    }

    for (let iy = 0; iy < ySegs; iy++) {
      for (let ix = 0; ix < xSegs; ix++) {
        const a = iy * (xSegs + 1) + ix;
        const b = a + 1;
        const c = a + (xSegs + 1);
        const d = c + 1;
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  });

  const mesh = new THREE.Mesh(geo, materials.armorDoubleSide);
  mesh.name = 'ChestLowerUndersideCowl';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// ─── 5. CHEST ARMOR ASSEMBLY ─────────────────────────────────────────────────
export function createChestArmor(materials: RobotMaterialPalette): ChestArmorNodes & {
  ledMeshes: THREE.Mesh[];
} {
  const group = new THREE.Group();
  group.name = 'ChestArmor';

  const ledMeshes: THREE.Mesh[] = [];

  // Central Pectoral Shell
  const { mesh: centerPanel } = createCentralChestPlate(materials);
  group.add(centerPanel);

  // Purple Logo "A"
  const logo = createChestLogo(materials);
  logo.position.set(0, -0.016, 0.036);
  logo.rotation.x = -0.04;
  centerPanel.add(logo);
  ledMeshes.push(logo);

  // Sculpted White Ceramic Lower Underside Cowl (Requirement 4C & 4F)
  const lowerUnderside = createChestLowerUndersideCowl(materials);
  centerPanel.add(lowerUnderside);

  // Left & Right Pectoral Panels with Diagonal Light Strips
  const leftSide = createChestSidePanel(-1, materials);
  const rightSide = createChestSidePanel(1, materials);
  group.add(leftSide.panel);
  group.add(rightSide.panel);
  group.add(leftSide.lightStrip);
  group.add(rightSide.lightStrip);
  ledMeshes.push(leftSide.lightStrip, rightSide.lightStrip);

  // Flank Rib Armor Wings
  const flankLeft = createChestFlankArmor(-1, materials);
  const flankRight = createChestFlankArmor(1, materials);
  group.add(flankLeft);
  group.add(flankRight);

  return {
    group,
    centerPanel,
    leftPanel: leftSide.panel,
    rightPanel: rightSide.panel,
    logo,
    leftLightStrip: leftSide.lightStrip,
    rightLightStrip: rightSide.lightStrip,
    flankArmorLeft: flankLeft,
    flankArmorRight: flankRight,
    lowerUnderside,
    ledMeshes,
  };
}


// ─── 6. UPPER TORSO FRAME & LOWER CHEST INTERFACE ───────────────────────────
/**
 * Structural dark titanium chassis carrying the chest, collar, back armor,
 * and the engineered Lower Chest Frame per Reference Image 1 & 2.
 */
export function createUpperTorsoFrame(materials: RobotMaterialPalette): UpperTorsoFrameNodes {
  const group = new THREE.Group();
  group.name = 'UpperTorsoFrame';

  const ledMeshes: THREE.Mesh[] = [];
  const frameJointGroup = new THREE.Group();

  // Central dark spinal column inside chest — sized to terminate cleanly at the sub-sternal chassis bulkhead
  const spineGeo = geoCache.get('ChestSpineGeo', () => new THREE.CylinderGeometry(0.064, 0.052, 0.180, 24));
  const frameSpine = new THREE.Mesh(spineGeo, materials.joint);
  frameSpine.name = 'ChestFrameSpine';
  frameSpine.position.set(0, 0.032, -0.020);
  frameSpine.scale.set(1.08, 1.0, 0.88);
  frameSpine.castShadow = true;
  frameSpine.receiveShadow = true;
  frameJointGroup.add(frameSpine);

  // Transverse Clavicle Beams — wider span (0.160 → 0.200) matching expanded shoulders
  const clavicleBeamGeo = geoCache.get('ChestClavicleBeamGeo', () => new THREE.CylinderGeometry(0.018, 0.018, 0.200, 14));

  const frameClavicleLeft = new THREE.Mesh(clavicleBeamGeo, materials.joint);
  frameClavicleLeft.rotation.z = Math.PI / 2;
  frameClavicleLeft.position.set(-0.126, TORSO_CONFIG.chest.shoulderMountY, 0.008);
  frameJointGroup.add(frameClavicleLeft);

  const frameClavicleRight = new THREE.Mesh(clavicleBeamGeo, materials.joint);
  frameClavicleRight.rotation.z = Math.PI / 2;
  frameClavicleRight.position.set(0.126, TORSO_CONFIG.chest.shoulderMountY, 0.008);
  frameJointGroup.add(frameClavicleRight);

  // 3. Sculpted White Ceramic Collar Bezel (Mantle cupping the neck base flush)
  const collarExtrude = geoCache.get('NeckCollarExtrudeGeo', () => {
    const collarShape = new THREE.Shape();
    const cOuterRx = 0.088;
    const cOuterRz = 0.084;
    collarShape.absellipse(0, 0, cOuterRx, cOuterRz, 0, Math.PI * 2, false, 0);

    const collarHole = new THREE.Path();
    const cInnerRx = 0.0745;
    const cInnerRz = 0.0745;
    collarHole.absellipse(0, 0, cInnerRx, cInnerRz, 0, Math.PI * 2, true, 0);
    collarShape.holes.push(collarHole);

    const g = new THREE.ExtrudeGeometry(collarShape, {
      depth: 0.018,
      bevelEnabled: true,
      bevelThickness: 0.0035,
      bevelSize: 0.0030,
      bevelSegments: 4,
      curveSegments: 36,
    });
    g.center();
    return g;
  });

  const neckCollar = new THREE.Mesh(collarExtrude, materials.armor);
  neckCollar.name = 'NeckCollar';
  neckCollar.rotation.x = Math.PI / 2;
  neckCollar.position.set(0, TORSO_CONFIG.chest.collarY, TORSO_CONFIG.chest.collarZ);
  neckCollar.castShadow = true;
  neckCollar.receiveShadow = true;
  group.add(neckCollar);

  // Stepped internal dark titanium mounting sleeve
  const collarSleeveGeo = geoCache.get('NeckCollarSleeveGeo', () => new THREE.CylinderGeometry(0.073, 0.070, 0.024, 32));
  const neckCollarSleeve = new THREE.Mesh(collarSleeveGeo, materials.joint);
  neckCollarSleeve.position.set(0, TORSO_CONFIG.chest.collarY - 0.008, TORSO_CONFIG.chest.collarZ);
  neckCollarSleeve.castShadow = true;
  frameJointGroup.add(neckCollarSleeve);

  const mergedFrameJoint = mergeGroupMeshesByMaterial(frameJointGroup, materials.joint, 'UpperChestFrameJoint_Merged', false);
  if (mergedFrameJoint) {
    mergedFrameJoint.castShadow = true;
    mergedFrameJoint.receiveShadow = true;
    group.add(mergedFrameJoint);
  }

  // 4 & 5. Horizontal Glowing Purple Light Ring and Suprasternal Light Slit at Collar
  const tempCollarLights = new THREE.Group();
  const lightRingGeo = geoCache.get('NeckLightRingGeo', () => new THREE.TorusGeometry(0.0745, 0.0016, 10, 40));
  const neckCollarLightRing = new THREE.Mesh(lightRingGeo, materials.purpleEmissive);
  neckCollarLightRing.name = 'NeckCollarLightRing';
  neckCollarLightRing.rotation.x = Math.PI / 2;
  neckCollarLightRing.position.set(0, TORSO_CONFIG.chest.collarY + 0.008, TORSO_CONFIG.chest.collarZ);
  tempCollarLights.add(neckCollarLightRing);

  const slitGeo = geoCache.get('NeckLightSlitGeo', () => new THREE.BoxGeometry(0.0032, 0.012, 0.004));
  const neckCollarLightSlit = new THREE.Mesh(slitGeo, materials.purpleEmissive);
  neckCollarLightSlit.name = 'NeckCollarLightSlit';
  neckCollarLightSlit.position.set(0, 0.124, 0.058);
  neckCollarLightSlit.rotation.x = -0.04;
  tempCollarLights.add(neckCollarLightSlit);

  const mergedCollarLights = mergeGroupMeshesByMaterial(tempCollarLights, materials.purpleEmissive, 'NeckCollarLights_Merged', false, false);
  if (mergedCollarLights) {
    group.add(mergedCollarLights);
    ledMeshes.push(mergedCollarLights);
  }

  // Localized subtle purple bounce light illuminating suprasternal notch & chin
  const neckGlowLight = new THREE.PointLight(ROBOT_ACCENT, 0.65, 0.16, 2.0);
  neckGlowLight.position.set(0, TORSO_CONFIG.chest.collarY + 0.008, 0.045);
  group.add(neckGlowLight);


  // Sculpted White Upper Back Armor (Reference Blueprint: "BACK VIEW")
  const backGeo = geoCache.get('ChestBackGeo', () => {
    const backShape = new THREE.Shape();
    backShape.moveTo(-0.120, 0.104);
    backShape.quadraticCurveTo(-0.074, 0.120, -0.066, 0.120);
    backShape.quadraticCurveTo(0, 0.106, 0.066, 0.120);
    backShape.quadraticCurveTo(0.074, 0.120, 0.120, 0.104);
    backShape.bezierCurveTo(0.130, 0.045, 0.118, -0.020, 0.082, -0.048);
    backShape.lineTo(0.036, -0.054);
    // Trapezoidal opening exposing internal spinal column
    backShape.lineTo(0.016, -0.018);
    backShape.lineTo(-0.016, -0.018);
    backShape.lineTo(-0.036, -0.054);
    backShape.lineTo(-0.082, -0.048);
    backShape.bezierCurveTo(-0.118, -0.020, -0.130, 0.045, -0.120, 0.104);
    backShape.closePath();

    const g = new THREE.ExtrudeGeometry(backShape, {
      depth: 0.020,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.004,
      bevelSegments: 3,
    });
    g.center();
    return g;
  });

  const backArmor = new THREE.Mesh(backGeo, materials.armor);
  backArmor.name = 'ChestBackArmor';
  backArmor.position.set(0, -0.032, -0.080);
  backArmor.rotation.x = 0.05;
  backArmor.castShadow = false;
  backArmor.receiveShadow = false;
  backArmor.visible = false; // Superseded by high-precision RearThoracicAssembly scapular armor & backbone

  // Obsolete placeholder back light bar (superseded by PDU diagnostic status LED in RearThoracicAssembly)
  const backLightGeo = geoCache.get('ChestBackLightGeo', () => new THREE.BoxGeometry(0.100, 0.0050, 0.006));
  const backLightBar = new THREE.Mesh(backLightGeo, materials.purpleEmissive);
  backLightBar.name = 'BackLightBar';
  backLightBar.position.set(0, 0.001, -0.094);
  backLightBar.visible = false;

  // Complete Rear Thoracic & Scapular Mechanical Assembly
  const rearThoracic = createRearThoracicAssembly(materials);
  group.add(rearThoracic.group);
  ledMeshes.push(...rearThoracic.ledMeshes);

  // ==============================================================
  // LOWER CHEST FRAME — SUB-STERNAL TRANSITION GIRDLE & GIMBAL BRIDGE
  // ==============================================================
  const lowerFrame = new THREE.Group();
  lowerFrame.name = 'LowerChestFrame';
  group.add(lowerFrame);

  const tempLower = new THREE.Group();
  const tempMetallic = new THREE.Group();

  // 1. Sub-Sternal Structural Girdle (Dark Titanium)
  // Engineered sub-costal arch frame that:
  // - Precisely cradles the upper abdominal transition module (Vertebra 01, width 0.148)
  // - Bridges smoothly to the bilateral actuator clevises at x = ±0.118
  // - Houses a central docking receiver collar for the spine knuckle
  // - Eliminates excessive empty gap and floating plates
  const archFrameShape = new THREE.Shape();
  archFrameShape.moveTo(0, -0.014);
  archFrameShape.lineTo(0.074, -0.014);
  archFrameShape.bezierCurveTo(0.088, -0.012, 0.102, -0.004, 0.118, 0.010);
  archFrameShape.lineTo(0.118, 0.022);
  archFrameShape.lineTo(-0.118, 0.022);
  archFrameShape.lineTo(-0.118, 0.010);
  archFrameShape.bezierCurveTo(-0.102, -0.004, -0.088, -0.012, -0.074, -0.014);
  archFrameShape.closePath();

  const archFrameGeo = new THREE.ExtrudeGeometry(archFrameShape, {
    depth: 0.032,
    bevelEnabled: true,
    bevelThickness: 0.0028,
    bevelSize: 0.0024,
    bevelSegments: 3,
  });
  archFrameGeo.center();

  const chassisGirdle = new THREE.Mesh(archFrameGeo, materials.joint);
  chassisGirdle.name = 'SubSternalChassisGirdle';
  chassisGirdle.position.set(0, -0.066, 0.018);
  chassisGirdle.rotation.x = -0.04;
  tempLower.add(chassisGirdle);

  // 2. Sub-Costal Structural Mounting Shoulders & Gussets (Section 4 & 7)
  // Carries structural load from the chest armor flanks into the central spine
  for (const side of [-1, 1] as const) {
    const shoulderGeo = new THREE.BoxGeometry(0.028, 0.016, 0.020);
    const shoulder = new THREE.Mesh(shoulderGeo, materials.joint);
    shoulder.position.set(side * 0.082, -0.062, 0.024);
    shoulder.rotation.z = -side * 0.15;
    tempLower.add(shoulder);

    // Precision CNC metallic clamping brackets with twin cap screws
    const bracketGeo = new THREE.BoxGeometry(0.010, 0.014, 0.012);
    const bracket = new THREE.Mesh(bracketGeo, materials.metallic);
    bracket.position.set(side * 0.076, -0.063, 0.034);
    bracket.rotation.y = -side * 0.12;
    tempMetallic.add(bracket);

    for (const bOff of [-0.0035, 0.0035]) {
      const boltGeo = new THREE.CylinderGeometry(0.0016, 0.0016, 0.003, 6);
      const bolt = new THREE.Mesh(boltGeo, materials.joint);
      bolt.rotation.x = Math.PI / 2;
      bolt.position.set(side * 0.076, -0.063 + bOff, 0.040);
      tempLower.add(bolt);
    }
  }

  const tempEmissive = new THREE.Group();

  // 3. Central Sub-Xiphoid Status LED nestled in the xiphoid notch
  const xiphoidLedGeo = geoCache.get('XiphoidLedGeo', () => new THREE.BoxGeometry(0.0032, 0.007, 0.004));
  const xiphoidLed = new THREE.Mesh(xiphoidLedGeo, materials.purpleEmissive);
  xiphoidLed.name = 'SubXiphoidStatusLed';
  xiphoidLed.position.set(0, -0.066, 0.046);
  tempEmissive.add(xiphoidLed);

  // 4. Central Structural Backbone Keel (Section 9)
  const keelGeo = new THREE.BoxGeometry(0.046, 0.034, 0.050);
  const centralKeel = new THREE.Mesh(keelGeo, materials.joint);
  centralKeel.position.set(0, -0.072, 0.006);
  tempLower.add(centralKeel);

  // 5. Central Vertebral Gimbal Yoke Housing (Receives SpineUpperMount)
  const socketGeo = new THREE.CylinderGeometry(0.038, 0.034, 0.018, 32);
  const socket = new THREE.Mesh(socketGeo, materials.joint);
  socket.position.set(0, -0.076, 0.008);
  tempLower.add(socket);

  // Stepped internal bearing race inside the gimbal housing
  const bearingRaceGeo = new THREE.CylinderGeometry(0.031, 0.031, 0.006, 28);
  const bearingRace = new THREE.Mesh(bearingRaceGeo, materials.metallic);
  bearingRace.position.set(0, -0.080, 0.008);
  tempMetallic.add(bearingRace);

  // 6. Bilateral Actuator Clevis Housings (Outer & Inner upper mounts for all 4 abdominal poles)
  const upperMounts = [
    { x: 0.118, y: -0.066, z: 0.024, isOuter: true },
    { x: 0.068, y: -0.070, z: 0.006, isOuter: false },
  ];

  for (const side of [-1, 1] as const) {
    for (const mount of upperMounts) {
      const cWidth = mount.isOuter ? 0.022 : 0.016;
      const clevisGeo = new THREE.BoxGeometry(cWidth, 0.022, 0.022);
      const clevis = new THREE.Mesh(clevisGeo, materials.joint);
      clevis.position.set(side * mount.x, mount.y, mount.z);
      clevis.rotation.z = side * (mount.isOuter ? 0.28 : 0.14);
      tempLower.add(clevis);

      // Hardened pivot pin with hex fastener head
      const pinGeo = new THREE.CylinderGeometry(0.0036, 0.0036, cWidth + 0.006, 16);
      const pin = new THREE.Mesh(pinGeo, materials.metallic);
      pin.rotation.z = Math.PI / 2;
      pin.position.set(side * mount.x, mount.y, mount.z);
      tempMetallic.add(pin);

      for (const pHeadSide of [-1, 1] as const) {
        const headGeo = new THREE.CylinderGeometry(0.0048, 0.0048, 0.0024, 6);
        const pinHead = new THREE.Mesh(headGeo, materials.joint);
        pinHead.rotation.z = Math.PI / 2;
        pinHead.position.set(side * mount.x + pHeadSide * (cWidth * 0.5 + 0.002), mount.y, mount.z);
        tempLower.add(pinHead);
      }

      // Angled sub-costal reinforcement truss spar linking clevis upward into chest frame
      if (mount.isOuter) {
        const sparGeo = new THREE.BoxGeometry(0.036, 0.012, 0.016);
        const spar = new THREE.Mesh(sparGeo, materials.joint);
        spar.position.set(side * 0.088, -0.058, 0.020);
        spar.rotation.z = -side * 0.20;
        tempLower.add(spar);
      }
    }
  }

  const mergedLower = mergeGroupMeshesByMaterial(tempLower, materials.joint, 'LowerChestFrame_Merged')!;
  tempLower.traverse((child) => {
    if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).geometry && !geoCache.isCached((child as THREE.Mesh).geometry)) {
      (child as THREE.Mesh).geometry.dispose();
    }
  });
  lowerFrame.add(mergedLower);

  const mergedMetallic = mergeGroupMeshesByMaterial(tempMetallic, materials.metallic, 'LowerChestMetallic_Merged', false);
  if (mergedMetallic) {
    tempMetallic.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).geometry && !geoCache.isCached((child as THREE.Mesh).geometry)) {
        (child as THREE.Mesh).geometry.dispose();
      }
    });
    lowerFrame.add(mergedMetallic);
  }

  // Purple Emissive Accent Ring recessed inside the lower gimbal housing
  const lowerAccentGeo = geoCache.get('LowerAccentRingGeo', () => new THREE.TorusGeometry(0.034, 0.0016, 8, 32));
  const lowerAccentRing = new THREE.Mesh(lowerAccentGeo, materials.purpleEmissive);
  lowerAccentRing.rotation.x = Math.PI / 2;
  lowerAccentRing.position.set(0, -0.080, 0.008);
  tempEmissive.add(lowerAccentRing);

  // Lateral optical indicators on clevis mounts
  for (const side of [-1, 1] as const) {
    const indGeo = new THREE.BoxGeometry(0.0024, 0.008, 0.003);
    const ind = new THREE.Mesh(indGeo, materials.purpleEmissive);
    ind.position.set(side * 0.128, -0.066, 0.024);
    tempEmissive.add(ind);
  }

  const mergedEmissive = mergeGroupMeshesByMaterial(tempEmissive, materials.purpleEmissive, 'LowerChestEmissive_Merged', false, false);
  if (mergedEmissive) {
    lowerFrame.add(mergedEmissive);
    ledMeshes.push(mergedEmissive);
  }

  return {
    group,
    frameSpine,
    frameClavicleLeft,
    frameClavicleRight,
    neckCollar,
    neckCollarSleeve,
    neckCollarLightRing: mergedCollarLights || neckCollarLightRing,
    neckCollarLightSlit: mergedCollarLights || neckCollarLightSlit,
    backArmor,
    backLightBar,
    rearThoracic,
    lowerFrame,
    ledMeshes,
  };
}

// ─── 7. SHOULDER / UPPER TORSO GIRDLE ───────────────────────────────────────
export function createShoulderMount(
  side: -1 | 1,
  materials: RobotMaterialPalette
): ShoulderMountNodes {
  const extension = createChestShoulderExtension(side, materials);

  return {
    group: extension.group,
    socketHousing: extension.recessHousing,
    rotaryTrunnion: extension.driveHub,
    accentRing: extension.accentRing,
    ledMeshes: extension.ledMeshes,
    extensionNodes: extension,
  };
}

// ─── 8. MAIN CHEST ASSEMBLY ENTRY POINT ─────────────────────────────────────
export function createChestAssembly(materials: RobotMaterialPalette): ChestAssemblyNodes {
  const ledMeshes: THREE.Mesh[] = [];

  const chestArmor = createChestArmor(materials);
  ledMeshes.push(...chestArmor.ledMeshes);

  const upperTorsoFrame = createUpperTorsoFrame(materials);
  ledMeshes.push(...upperTorsoFrame.ledMeshes);

  const shoulderMountLeft = createShoulderMount(-1, materials);
  const shoulderMountRight = createShoulderMount(1, materials);
  ledMeshes.push(...shoulderMountLeft.ledMeshes, ...shoulderMountRight.ledMeshes);

  return {
    chestArmor,
    upperTorsoFrame,
    shoulderMountLeft,
    shoulderMountRight,
    rearThoracic: upperTorsoFrame.rearThoracic,
    ledMeshes,
  };
}

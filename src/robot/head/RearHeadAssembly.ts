import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { geoCache } from '../utils/GeometryCache';

export interface RearHeadAssemblyNodes {
  group: THREE.Group;
  parietalArmorLeft: THREE.Mesh;
  parietalArmorRight: THREE.Mesh;
  sagittalSpine: THREE.Mesh;
  servicePanel: THREE.Mesh;
  ventilationGrille: THREE.Group;
  diagnosticNodes: THREE.Mesh[];
  neckTransitionCradle: THREE.Mesh;
  ledMeshes: THREE.Mesh[];
}

/**
 * Evaluates the exact aerodynamic cranial surface coordinate matching RobotShell's Crown dome:
 * - Continuous athletic ellipsoidal sweep conforming to the robot's cranial silhouette
 * - Smooth sagittal center crest transitioning down to the occipital rim
 * - Zero flaring horns, fangs, or protruding corners
 */
function getCranialSurfacePoint(angle: number, v: number): THREE.Vector3 {
  const sinA = Math.sin(angle);
  const cosA = Math.cos(angle);
  const rearFactor = Math.max(0, -sinA); // Active for rear cranium (sinA <= 0)

  // Calibrated rim coordinates matching RobotShell.ts Crown geometry
  const rimY = 0.056 - 0.086 * Math.pow(rearFactor, 0.78);
  const rimX = (0.128 - 0.014 * rearFactor) * cosA;
  const rimZ = 0.008 * (1.0 - rearFactor) - 0.150 * rearFactor;

  const apexY = 0.154;
  const apexZ = -0.016;

  // Non-linear athletic profile curve identical to Crown
  const curveT = Math.pow(Math.sin(v * Math.PI * 0.5), 0.88);
  const heightT = Math.cos(v * Math.PI * 0.5);

  let x = rimX * curveT;
  let y = rimY + (apexY - rimY) * heightT;
  let z = apexZ + (rimZ - apexZ) * curveT;

  // Aerodynamic sagittal center crest
  if (Math.abs(cosA) < 0.24 && v < 0.82) {
    const crest = (1.0 - Math.abs(cosA) / 0.24) * Math.sin(v * Math.PI);
    y += 0.0038 * crest;
    z += 0.0020 * crest;
  }

  return new THREE.Vector3(x, y, z);
}

/**
 * Computes the outward-facing cranial surface normal vector at (angle, v)
 */
function getCranialNormal(angle: number, v: number): THREE.Vector3 {
  const dAngle = 0.008;
  const dV = 0.008;
  const pA1 = getCranialSurfacePoint(angle + dAngle, v);
  const pA0 = getCranialSurfacePoint(angle - dAngle, v);
  const pV1 = getCranialSurfacePoint(angle, v + dV);
  const pV0 = getCranialSurfacePoint(angle, v - dV);

  const tAngle = pA1.sub(pA0);
  const tV = pV1.sub(pV0);
  const n = new THREE.Vector3().crossVectors(tAngle, tV).normalize();

  // Validate that normal points outward from cranial center (0, 0.022, -0.022)
  const centerToPt = getCranialSurfacePoint(angle, v).sub(new THREE.Vector3(0, 0.022, -0.022));
  if (n.dot(centerToPt) < 0) {
    n.negate();
  }
  return n;
}

/**
 * Creates the high-precision Rear Head & Cranial Housing:
 * - Solid, sculpted white ceramic composite parietal-occipital armor shells with compound curvature,
 *   strictly conforming to cranial silhouette without flared wings, horns, or floating corners.
 * - Split structural dark titanium sagittal spine ribs (upper and lower segments) framing the maintenance hatch.
 * - Recessed trapezoidal occipital maintenance hatch with perimeter gasket, corner fasteners, and latch.
 * - Symmetrical left and right directional heat-dissipation ventilation louvers.
 * - Dual telemetry diagnostic status LED nodes with polished metallic bezels.
 * - Engineered dark titanium occipital neck-transition cradle eliminating skull-to-neck voids.
 */
export function createRearHeadAssembly(materials: RobotMaterialPalette): RearHeadAssemblyNodes {
  const group = new THREE.Group();
  group.name = 'RearHeadAssembly';

  const ledMeshes: THREE.Mesh[] = [];

  // =========================================================================
  // 1. SCULPTED REAR CRANIAL ARMOR SHELLS (Left & Right Parietal-Occipital)
  // Precision solid 3D composite armor plates with chamfered perimeter bevels
  // strictly conforming to the cranial radius without flaring fangs or horns
  // =========================================================================
  function createRearParietalArmorGeo(side: -1 | 1): THREE.BufferGeometry {
    const key = `RearParietalArmorGeo_ConformalSolid_v4_${side}`;
    return geoCache.get(key, () => {
      const uSegs = 20;
      const vSegs = 28;
      const stride = uSegs + 1;

      const outerPositions: number[] = [];
      const innerPositions: number[] = [];
      const outerUvs: number[] = [];
      const innerUvs: number[] = [];
      const indices: number[] = [];

      const vTop = 0.18; // Sleek apex ridge emergence
      const vBottom = 0.94; // Terminates cleanly above the nape purple LED accent bar

      for (let iv = 0; iv <= vSegs; iv++) {
        const vGrid = iv / vSegs;
        const vCranial = vTop + vGrid * (vBottom - vTop);

        // Medial gap along central sagittal spine channel
        let xMedial = 0.0110;
        // Precision trapezoidal pocket framing the occipital maintenance hatch
        if (vGrid > 0.34 && vGrid < 0.74) {
          const tHatch = Math.sin(((vGrid - 0.34) / 0.40) * Math.PI);
          xMedial += 0.0155 * Math.pow(tHatch, 0.85);
        }

        const curveT = Math.pow(Math.sin(vCranial * Math.PI * 0.5), 0.88);
        const effRadiusX = 0.114 * Math.max(0.18, curveT);
        const dAngleMedial = Math.asin(Math.min(0.48, xMedial / effRadiusX));

        // Aerodynamic lateral boundary:
        // Compact at crown apex, expanding smoothly across parietal lobes,
        // and tapering gracefully inward to hug the nape collar and LED bar
        const tExpand = Math.sin(Math.pow(vGrid, 0.72) * Math.PI);
        const dAngleLateral = 0.42 + 0.36 * tExpand;

        for (let iu = 0; iu <= uSegs; iu++) {
          const u = iu / uSegs;
          const dAngle = dAngleMedial + u * (dAngleLateral - dAngleMedial);
          const angle = 1.5 * Math.PI + side * dAngle;

          const basePt = getCranialSurfacePoint(angle, vCranial);
          const normal = getCranialNormal(angle, vCranial);

          // Sculpted compound thickness with perimeter chamfered bevels
          const uMargin = 0.14;
          const vMargin = 0.10;
          const uEdge = Math.min(u / uMargin, (1.0 - u) / uMargin, 1.0);
          const vEdge = Math.min(vGrid / vMargin, (1.0 - vGrid) / vMargin, 1.0);
          const edgeFactor = Math.min(uEdge, vEdge);
          const tBevel = edgeFactor * edgeFactor * (3.0 - 2.0 * edgeFactor);

          const maxThickness = 0.0032; // 3.2mm ceramic armor plate
          const minThickness = 0.0006; // 0.6mm reveal step at seams
          const baseThickness = minThickness + (maxThickness - minThickness) * tBevel;

          // Subtle athletic crest sculpting across the plate body
          const crestBulge = Math.sin(u * Math.PI) * Math.sin(vGrid * Math.PI) * 0.0007;
          const totalThickness = baseThickness + crestBulge;

          // Outer vertex
          const outerPt = basePt.clone().addScaledVector(normal, totalThickness);
          outerPositions.push(outerPt.x, outerPt.y, outerPt.z);
          outerUvs.push(u, vGrid);

          // Inner vertex (seated firmly against base cranium dome)
          const innerPt = basePt.clone().addScaledVector(normal, 0.0003);
          innerPositions.push(innerPt.x, innerPt.y, innerPt.z);
          innerUvs.push(u, vGrid);
        }
      }

      const innerOffset = stride * (vSegs + 1);
      const positions = outerPositions.concat(innerPositions);
      const uvs = outerUvs.concat(innerUvs);

      // 1. Outer Face
      for (let iv = 0; iv < vSegs; iv++) {
        for (let iu = 0; iu < uSegs; iu++) {
          const a = iv * stride + iu;
          const b = (iv + 1) * stride + iu;
          const c = (iv + 1) * stride + (iu + 1);
          const d = iv * stride + (iu + 1);

          if (side === 1) {
            indices.push(a, b, d);
            indices.push(b, c, d);
          } else {
            indices.push(a, d, b);
            indices.push(b, d, c);
          }
        }
      }

      // 2. Inner Face (Inward winding)
      for (let iv = 0; iv < vSegs; iv++) {
        for (let iu = 0; iu < uSegs; iu++) {
          const a = innerOffset + iv * stride + iu;
          const b = innerOffset + (iv + 1) * stride + iu;
          const c = innerOffset + (iv + 1) * stride + (iu + 1);
          const d = innerOffset + iv * stride + (iu + 1);

          if (side === 1) {
            indices.push(a, d, b);
            indices.push(b, d, c);
          } else {
            indices.push(a, b, d);
            indices.push(b, c, d);
          }
        }
      }

      // 3. Top Perimeter Wall (iv = 0)
      for (let iu = 0; iu < uSegs; iu++) {
        const o1 = iu;
        const o2 = iu + 1;
        const i1 = innerOffset + iu;
        const i2 = innerOffset + iu + 1;
        if (side === 1) {
          indices.push(o1, i1, o2);
          indices.push(o2, i1, i2);
        } else {
          indices.push(o1, o2, i1);
          indices.push(o2, i2, i1);
        }
      }

      // 4. Bottom Perimeter Wall (iv = vSegs)
      for (let iu = 0; iu < uSegs; iu++) {
        const o1 = vSegs * stride + iu;
        const o2 = vSegs * stride + iu + 1;
        const i1 = innerOffset + vSegs * stride + iu;
        const i2 = innerOffset + vSegs * stride + iu + 1;
        if (side === 1) {
          indices.push(o1, o2, i1);
          indices.push(o2, i2, i1);
        } else {
          indices.push(o1, i1, o2);
          indices.push(o2, i1, i2);
        }
      }

      // 5. Medial Perimeter Wall (iu = 0)
      for (let iv = 0; iv < vSegs; iv++) {
        const o1 = iv * stride;
        const o2 = (iv + 1) * stride;
        const i1 = innerOffset + iv * stride;
        const i2 = innerOffset + (iv + 1) * stride;
        if (side === 1) {
          indices.push(o1, o2, i1);
          indices.push(o2, i2, i1);
        } else {
          indices.push(o1, i1, o2);
          indices.push(o2, i1, i2);
        }
      }

      // 6. Lateral Perimeter Wall (iu = uSegs)
      for (let iv = 0; iv < vSegs; iv++) {
        const o1 = iv * stride + uSegs;
        const o2 = (iv + 1) * stride + uSegs;
        const i1 = innerOffset + iv * stride + uSegs;
        const i2 = innerOffset + (iv + 1) * stride + uSegs;
        if (side === 1) {
          indices.push(o1, i1, o2);
          indices.push(o2, i1, i2);
        } else {
          indices.push(o1, o2, i1);
          indices.push(o2, i2, i1);
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      return geo;
    });
  }

  const parietalArmorLeft = new THREE.Mesh(createRearParietalArmorGeo(-1), materials.armorDoubleSide);
  parietalArmorLeft.name = 'RearParietalArmor_Left';
  parietalArmorLeft.castShadow = true;
  parietalArmorLeft.receiveShadow = true;
  group.add(parietalArmorLeft);

  const parietalArmorRight = new THREE.Mesh(createRearParietalArmorGeo(1), materials.armorDoubleSide);
  parietalArmorRight.name = 'RearParietalArmor_Right';
  parietalArmorRight.castShadow = true;
  parietalArmorRight.receiveShadow = true;
  group.add(parietalArmorRight);

  // =========================================================================
  // 2. CENTRAL SAGITTAL SPINE RIDGES (Upper and Lower Segments)
  // Structural hard-surface titanium ribs cleanly framing the service hatch
  // =========================================================================
  function buildSpineSegment(vStart: number, vEnd: number, steps: number, taperStart: boolean, taperEnd: boolean) {
    const pos: number[] = [];
    const idx: number[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const v = vStart + t * (vEnd - vStart);
      const p = getCranialSurfacePoint(1.5 * Math.PI, v);
      const n = getCranialNormal(1.5 * Math.PI, v);

      let h = 0.0046;
      if (taperStart && i < 4) {
        h = 0.0010 + (0.0046 - 0.0010) * (i / 4);
      }
      if (taperEnd && i > steps - 4) {
        h = 0.0010 + (0.0046 - 0.0010) * ((steps - i) / 4);
      }

      const wTop = 0.010;
      const wBase = 0.014;
      const minH = 0.0006;

      // 4 Cross-section vertices:
      // 0: Top-Left, 1: Top-Right, 2: Bottom-Right, 3: Bottom-Left
      const v0 = p.clone().addScaledVector(n, h).add(new THREE.Vector3(-wTop * 0.5, 0, 0));
      const v1 = p.clone().addScaledVector(n, h).add(new THREE.Vector3(wTop * 0.5, 0, 0));
      const v2 = p.clone().addScaledVector(n, minH).add(new THREE.Vector3(wBase * 0.5, 0, 0));
      const v3 = p.clone().addScaledVector(n, minH).add(new THREE.Vector3(-wBase * 0.5, 0, 0));

      pos.push(v0.x, v0.y, v0.z);
      pos.push(v1.x, v1.y, v1.z);
      pos.push(v2.x, v2.y, v2.z);
      pos.push(v3.x, v3.y, v3.z);
    }

    for (let i = 0; i < steps; i++) {
      const c = i * 4;
      const next = (i + 1) * 4;

      // Top face
      idx.push(c + 0, c + 1, next + 1);
      idx.push(c + 0, next + 1, next + 0);

      // Right flank
      idx.push(c + 1, c + 2, next + 2);
      idx.push(c + 1, next + 2, next + 1);

      // Bottom face
      idx.push(c + 2, c + 3, next + 3);
      idx.push(c + 2, next + 3, next + 2);

      // Left flank
      idx.push(c + 3, c + 0, next + 0);
      idx.push(c + 3, next + 0, next + 3);
    }

    // Start Cap
    idx.push(0, 3, 2);
    idx.push(0, 2, 1);

    // End Cap
    const last = steps * 4;
    idx.push(last + 0, last + 1, last + 2);
    idx.push(last + 0, last + 2, last + 3);

    return { pos, idx };
  }

  const spineGeo = geoCache.get('RearHeadSpineRibGeo_ConformalLoft_v4', () => {
    // Upper Segment: apex to top frame of maintenance hatch
    const upper = buildSpineSegment(0.18, 0.40, 16, true, false);
    // Lower Segment: bottom frame of maintenance hatch to nape
    const lower = buildSpineSegment(0.72, 0.94, 16, false, false);

    const positions = upper.pos.concat(lower.pos);
    const offset = upper.pos.length / 3;
    const shiftedLowerIdx = lower.idx.map((i) => i + offset);
    const indices = upper.idx.concat(shiftedLowerIdx);

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  });

  const sagittalSpine = new THREE.Mesh(spineGeo, materials.joint);
  sagittalSpine.name = 'RearHeadSagittalSpine';
  sagittalSpine.castShadow = true;
  sagittalSpine.receiveShadow = true;
  group.add(sagittalSpine);

  // Precision M2.5 Hex Cap Fasteners along the sagittal spine
  const boltGeo = geoCache.get('RearHeadSpineBoltGeo_v4', () => {
    const g = new THREE.CylinderGeometry(0.0016, 0.0016, 0.0022, 6);
    g.rotateX(Math.PI / 2);
    return g;
  });

  // Fastener positions: 1 upper, 2 lower (skipping hatch region)
  const boltVs = [0.28, 0.80, 0.88];
  for (const v of boltVs) {
    const pt = getCranialSurfacePoint(1.5 * Math.PI, v);
    const n = getCranialNormal(1.5 * Math.PI, v);
    const bolt = new THREE.Mesh(boltGeo, materials.metallic);
    bolt.position.copy(pt).addScaledVector(n, 0.0050);
    bolt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    group.add(bolt);
  }

  // Sculpted beveled titanium terminal anchor fitting at nape
  const spineTerminalGeo = geoCache.get('RearHeadSpineTerminalGeo_Sculpted_v4', () => {
    const tShape = new THREE.Shape();
    tShape.moveTo(-0.008, -0.004);
    tShape.lineTo(0.008, -0.004);
    tShape.lineTo(0.006, 0.004);
    tShape.lineTo(-0.006, 0.004);
    tShape.closePath();

    const g = new THREE.ExtrudeGeometry(tShape, {
      depth: 0.005,
      bevelEnabled: true,
      bevelThickness: 0.0012,
      bevelSize: 0.0010,
      bevelSegments: 2,
    });
    g.center();
    return g;
  });

  const spineTerminal = new THREE.Mesh(spineTerminalGeo, materials.joint);
  const endPt = getCranialSurfacePoint(1.5 * Math.PI, 0.94);
  const endNorm = getCranialNormal(1.5 * Math.PI, 0.94);
  spineTerminal.position.copy(endPt).addScaledVector(endNorm, 0.0025);
  spineTerminal.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), endNorm);

  const terminalBolt = new THREE.Mesh(boltGeo, materials.metallic);
  terminalBolt.position.set(0, 0, 0.0035);
  spineTerminal.add(terminalBolt);
  group.add(spineTerminal);

  // =========================================================================
  // 3. RECESSED OCCIPITAL SERVICE ACCESS PANEL
  // Central maintenance hatch nestled flush inside the widened armor bezel
  // =========================================================================
  const vHatchCenter = 0.56;
  const hatchPt = getCranialSurfacePoint(1.5 * Math.PI, vHatchCenter);
  const hatchNorm = getCranialNormal(1.5 * Math.PI, vHatchCenter);

  const panelShape = new THREE.Shape();
  panelShape.moveTo(-0.021, 0.022);
  panelShape.lineTo(0.021, 0.022);
  panelShape.lineTo(0.017, -0.022);
  panelShape.lineTo(-0.017, -0.022);
  panelShape.closePath();

  const servicePanelGeo = geoCache.get('OccipitalServicePanelGeo_Precision_v4', () => {
    const g = new THREE.ExtrudeGeometry(panelShape, {
      depth: 0.004,
      bevelEnabled: true,
      bevelThickness: 0.0012,
      bevelSize: 0.0010,
      bevelSegments: 2,
    });
    g.center();
    return g;
  });

  const servicePanel = new THREE.Mesh(servicePanelGeo, materials.joint);
  servicePanel.name = 'OccipitalServicePanel';
  servicePanel.position.copy(hatchPt).addScaledVector(hatchNorm, 0.0018);
  servicePanel.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), hatchNorm);
  servicePanel.castShadow = true;
  servicePanel.receiveShadow = true;

  // Perimeter Gasket Seal Rim (Metallic)
  const gasketGeo = geoCache.get('OccipitalGasketGeo_Precision_v4', () => new THREE.BoxGeometry(0.046, 0.048, 0.002));
  const gasketMesh = new THREE.Mesh(gasketGeo, materials.metallic);
  gasketMesh.position.set(0, 0, -0.001);
  servicePanel.add(gasketMesh);

  // 4 Corner Service Panel Hex Fasteners
  for (const sx of [-0.015, 0.015]) {
    for (const sy of [-0.015, 0.015]) {
      const pBolt = new THREE.Mesh(boltGeo, materials.metallic);
      pBolt.position.set(sx, sy, 0.0026);
      servicePanel.add(pBolt);
    }
  }

  // Latch release handle in center of service panel
  const latchGeo = geoCache.get('OccipitalLatchGeo_Precision_v4', () => new THREE.BoxGeometry(0.011, 0.0035, 0.0025));
  const latchMesh = new THREE.Mesh(latchGeo, materials.metallic);
  latchMesh.position.set(0, 0, 0.0028);
  servicePanel.add(latchMesh);

  group.add(servicePanel);

  // =========================================================================
  // 4. CRANIAL HEAT-DISSIPATION VENTILATION GRILLES (Left & Right)
  // Directional louvers integrated flush into parietal armor contours
  // =========================================================================
  const ventGroup = new THREE.Group();
  ventGroup.name = 'CranialVentilationGroup';

  const louverHousingGeo = geoCache.get('CranialLouverHousingGeo_v4', () => {
    const g = new THREE.BoxGeometry(0.025, 0.022, 0.003);
    return g;
  });

  const louverGeo = geoCache.get('CranialLouverGeo_Precision_v4', () => {
    const g = new THREE.BoxGeometry(0.020, 0.0016, 0.004);
    g.rotateX(0.35); // Angled directional louvers
    return g;
  });

  const vVent = 0.64;
  const dAngleVent = 0.52;

  for (const side of [-1, 1] as const) {
    const ventSub = new THREE.Group();
    const ventPt = getCranialSurfacePoint(1.5 * Math.PI + side * dAngleVent, vVent);
    const ventNorm = getCranialNormal(1.5 * Math.PI + side * dAngleVent, vVent);

    ventSub.position.copy(ventPt).addScaledVector(ventNorm, 0.0022);
    ventSub.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), ventNorm);

    // Beveled housing flush with ceramic armor
    const housing = new THREE.Mesh(louverHousingGeo, materials.joint);
    ventSub.add(housing);

    // 4 Directional louvers inside the housing
    for (let l = -1.5; l <= 1.5; l += 1) {
      const louver = new THREE.Mesh(louverGeo, materials.metallic);
      louver.position.set(0, l * 0.0042, 0.0015);
      ventSub.add(louver);
    }

    ventGroup.add(ventSub);
  }

  group.add(ventGroup);

  // =========================================================================
  // 5. DIAGNOSTIC SENSOR HOUSINGS & VIOLET STATUS INDICATORS
  // Small integrated diagnostic nodes with polished metallic bezels
  // =========================================================================
  const diagnosticNodes: THREE.Mesh[] = [];
  const sensorBezelGeo = geoCache.get('CranialSensorBezelGeo_v4', () => {
    const g = new THREE.CylinderGeometry(0.0040, 0.0050, 0.0035, 16);
    g.rotateX(Math.PI / 2);
    return g;
  });
  const sensorLensGeo = geoCache.get('CranialSensorLensGeo_v4', () => {
    const g = new THREE.CylinderGeometry(0.0026, 0.0026, 0.0042, 16);
    g.rotateX(Math.PI / 2);
    return g;
  });

  const vSensor = 0.80;
  const dAngleSensor = 0.44;

  for (const side of [-1, 1] as const) {
    const sensorGroup = new THREE.Group();
    sensorGroup.name = `CranialDiagnosticSensor_${side === -1 ? 'L' : 'R'}`;

    const sensorPt = getCranialSurfacePoint(1.5 * Math.PI + side * dAngleSensor, vSensor);
    const sensorNorm = getCranialNormal(1.5 * Math.PI + side * dAngleSensor, vSensor);

    sensorGroup.position.copy(sensorPt).addScaledVector(sensorNorm, 0.0025);
    sensorGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), sensorNorm);

    const bezel = new THREE.Mesh(sensorBezelGeo, materials.metallic);
    sensorGroup.add(bezel);

    const lens = new THREE.Mesh(sensorLensGeo, materials.purpleEmissive);
    lens.position.set(0, 0, 0.0008);
    sensorGroup.add(lens);

    diagnosticNodes.push(lens);
    ledMeshes.push(lens);
    group.add(sensorGroup);
  }

  // =========================================================================
  // 6. OCCIPITAL-TO-NECK TRANSITION CRADLE
  // Engineered dark titanium cervical mount collar closing skull-to-neck gap
  // =========================================================================
  const cradleShape = new THREE.Shape();
  cradleShape.absarc(0, 0, 0.050, 0, Math.PI, false);
  cradleShape.lineTo(-0.050, -0.018);
  cradleShape.lineTo(0.050, -0.018);
  cradleShape.closePath();

  const cradleGeo = geoCache.get('OccipitalNeckCradleGeo_v5', () => {
    const g = new THREE.ExtrudeGeometry(cradleShape, {
      depth: 0.024,
      bevelEnabled: true,
      bevelThickness: 0.0030,
      bevelSize: 0.0022,
      bevelSegments: 2,
    });
    g.center();
    return g;
  });

  const neckTransitionCradle = new THREE.Mesh(cradleGeo, materials.joint);
  neckTransitionCradle.name = 'OccipitalNeckTransitionCradle';
  neckTransitionCradle.position.set(0, -0.034, -0.014);
  neckTransitionCradle.rotation.x = 0.08;
  neckTransitionCradle.castShadow = true;
  neckTransitionCradle.receiveShadow = true;
  group.add(neckTransitionCradle);

  // Stepped metallic bearing rim at the cradle transition
  const cradleRimGeo = geoCache.get('OccipitalCradleRimGeo_v5', () => new THREE.TorusGeometry(0.048, 0.0022, 8, 32));
  const cradleRim = new THREE.Mesh(cradleRimGeo, materials.metallic);
  cradleRim.position.set(0, -0.040, -0.014);
  cradleRim.rotation.x = Math.PI / 2 + 0.08;
  group.add(cradleRim);

  return {
    group,
    parietalArmorLeft,
    parietalArmorRight,
    sagittalSpine,
    servicePanel,
    ventilationGrille: ventGroup,
    diagnosticNodes,
    neckTransitionCradle,
    ledMeshes,
  };
}

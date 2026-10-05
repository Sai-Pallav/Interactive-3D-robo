import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { ROBOT_CONFIG, ROBOT_ACCENT } from '../config';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger';
import { geoCache } from '../utils/GeometryCache';

export interface ShellNodes {
  group: THREE.Group;
  crown: THREE.Mesh;
  leftTemplePanel: THREE.Mesh;
  rightTemplePanel: THREE.Mesh;
  rearShell: THREE.Mesh;
  rearNapeLED: THREE.Mesh;
  browTrim: THREE.Mesh;
}

/**
 * Creates the aerodynamic, precision-sculpted white ceramic armor shell panels:
 * - Low-profile, athletic cranium silhouette with subtle sagittal center crest
 * - Sweeping, beveled brow cowl cleanly framing the obsidian visor
 * - Compound-curved temporal panels with sculpted circular bezels hugging ear modules
 * - Streamlined rear occipital sweep tapering down to neck nape
 * - Recessed rear horizontal purple LED bar
 * - Zero bulbous mushroom or egg shapes, zero blunt flat cutoffs
 */
export function createRobotShell(materials: RobotMaterialPalette): ShellNodes {
  const group = new THREE.Group();
  group.name = 'OuterShell';

  // 1. Aerodynamic Crown & Cranium Armor Dome
  function createCrownGeometry(): THREE.BufferGeometry {
    const uSegments = 64;
    const vSegments = 36;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let iv = 0; iv <= vSegments; iv++) {
      const v = iv / vSegments; // 0 = apex, 1 = lower rim

      for (let iu = 0; iu <= uSegments; iu++) {
        const u = iu / uSegments;
        const angle = u * Math.PI * 2;
        const sinA = Math.sin(angle); // +Z is front, -Z is rear
        const cosA = Math.cos(angle); // +X is left, -X is right

        let rimY: number;
        let rimX: number;
        let rimZ: number;

        if (sinA >= 0) {
          // Front brow & temple curve: sleek, athletic forward sweep framing visor
          const frontFactor = sinA;
          rimY = 0.056 + 0.036 * frontFactor; // Peaks at y ≈ +0.092 in center brow
          rimX = 0.128 * cosA;
          rimZ = 0.008 * cosA * cosA + 0.150 * frontFactor;
        } else {
          // Rear occiput & parietal curve: streamlined sweep tapering down to nape
          const rearFactor = -sinA;
          rimY = 0.056 - 0.086 * Math.pow(rearFactor, 0.78);
          rimX = (0.128 - 0.014 * rearFactor) * cosA;
          rimZ = 0.008 * (1 - rearFactor) - 0.150 * rearFactor;
        }

        // Sleeker apex height: 0.154 (avoids tall bulbous mushroom dome)
        const apexY = 0.154;
        const apexZ = -0.016;

        // Non-linear profile curve giving an athletic, sculpted contour rather than a plain sphere
        const curveT = Math.pow(Math.sin(v * Math.PI * 0.5), 0.88);
        const heightT = Math.cos(v * Math.PI * 0.5);

        let x = rimX * curveT;
        let y = rimY + (apexY - rimY) * heightT;
        let z = apexZ + (rimZ - apexZ) * curveT;

        // Subtle aerodynamic sagittal center crest along the top crown
        if (Math.abs(cosA) < 0.24 && v < 0.82) {
          const crest = (1.0 - Math.abs(cosA) / 0.24) * Math.sin(v * Math.PI);
          y += 0.0038 * crest;
          z += 0.0020 * crest;
        }

        positions.push(x, y, z);
        uvs.push(u, v);
      }
    }

    for (let iv = 0; iv < vSegments; iv++) {
      for (let iu = 0; iu < uSegments; iu++) {
        const a = iv * (uSegments + 1) + iu;
        const b = (iv + 1) * (uSegments + 1) + iu;
        const c = (iv + 1) * (uSegments + 1) + (iu + 1);
        const d = iv * (uSegments + 1) + (iu + 1);
        indices.push(a, d, b);
        indices.push(b, d, c);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  const armorShellGroup = new THREE.Group();

  const crownGeo = geoCache.get('HelmetCrownGeo', () => createCrownGeometry());
  const crown = new THREE.Mesh(crownGeo, materials.armorDoubleSide);
  crown.name = 'Crown';
  crown.castShadow = true;
  crown.receiveShadow = true;
  armorShellGroup.add(crown);

  // 2. Forehead Brow Trim / Visor Cowl Gasket
  // Recessed dark titanium trim tracing the sweeping brow arch above visor
  const browTrimGeo = geoCache.get('HelmetBrowTrimGeo', () => {
    const browTrimCurvePoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 36; i++) {
      const t = i / 36;
      const angle = (t - 0.5) * 2.10;
      const cosPhi = Math.cos(angle);
      const sinPhi = Math.sin(angle);
      const x = 0.128 * sinPhi;
      const y = 0.092 - 0.036 * (1.0 - cosPhi);
      const z = -0.008 + 0.152 * cosPhi;
      browTrimCurvePoints.push(new THREE.Vector3(x, y, z));
    }
    const browTrimCurve = new THREE.CatmullRomCurve3(browTrimCurvePoints);
    return new THREE.TubeGeometry(browTrimCurve, 36, 0.0028, 8, false);
  });
  const browTrim = new THREE.Mesh(browTrimGeo, materials.joint);
  browTrim.name = 'BrowTrim';
  group.add(browTrim);

  // 3. Left & Right Sculpted Temple Panels
  // Seamlessly hugs lateral cranium and frames circular ear modules
  let leftTemple!: THREE.Mesh;
  let rightTemple!: THREE.Mesh;

  for (const side of [-1, 1]) {
    const templeGeo = geoCache.get(`HelmetTempleGeo_${side}`, () => {
      const templeShape = new THREE.Shape();
      // Above ear module
      templeShape.moveTo(0.006, 0.062);
      // Sweeps towards occipital rear
      templeShape.quadraticCurveTo(-0.035, 0.055, -0.062, 0.044);
      // Down towards nape
      templeShape.lineTo(-0.062, -0.040);
      // Under ear towards jawline
      templeShape.quadraticCurveTo(-0.025, -0.040, -0.012, -0.038);
      templeShape.lineTo(0.006, -0.022);
      // Smooth circular arch cutout framing ear module (radius = 0.045)
      templeShape.absarc(0.0, 0.020, 0.045, -Math.PI * 0.44, Math.PI * 0.54, false);
      templeShape.closePath();

      const g = new THREE.ExtrudeGeometry(templeShape, {
        depth: 0.010,
        bevelEnabled: true,
        bevelThickness: 0.0035,
        bevelSize: 0.0025,
        bevelSegments: 3,
      });
      g.center();

      if (side === -1) {
        g.scale(-1, 1, 1);
        // Invert triangle winding for non-indexed geometry to preserve outward-facing normals
        const pos = g.attributes.position;
        for (let i = 0; i < pos.count; i += 3) {
          const x1 = pos.getX(i + 1);
          const y1 = pos.getY(i + 1);
          const z1 = pos.getZ(i + 1);
          pos.setXYZ(i + 1, pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2));
          pos.setXYZ(i + 2, x1, y1, z1);
        }
      }

      // Curve temple panel to hug the rounded side of the head
      const tPos = g.attributes.position;
      for (let i = 0; i < tPos.count; i++) {
        const px = tPos.getX(i);
        const pz = tPos.getZ(i);
        // Subtle spherical curvature
        tPos.setZ(i, pz - (px * px) * 0.85);
      }
      g.computeVertexNormals();
      return g;
    });

    const templeMesh = new THREE.Mesh(templeGeo, materials.armorDoubleSide);
    templeMesh.name = side === -1 ? 'LeftTemplePanel' : 'RightTemplePanel';
    templeMesh.position.set(side * 0.128, 0.020, -0.014);
    templeMesh.rotation.y = side * (Math.PI / 2) + side * 0.04;
    templeMesh.castShadow = true;
    templeMesh.receiveShadow = true;
    armorShellGroup.add(templeMesh);

    if (side === -1) leftTemple = templeMesh;
    else rightTemple = templeMesh;
  }

  // 4. Rear Occipital Shell (Tapered sweep to neck nape, bilaterally symmetric)
  // Right occipital shell (phi: 0.5π -> 1.5π)
  const rearShellGeo = geoCache.get('HelmetRearShellGeo_R', () => new THREE.SphereGeometry(
    0.136,
    32,
    20,
    Math.PI * 0.5,
    Math.PI,
    Math.PI * 0.30,
    Math.PI * 0.50
  ));
  const rearShell = new THREE.Mesh(rearShellGeo, materials.armorDoubleSide);
  rearShell.name = 'RearShell';
  rearShell.position.set(0, 0.022, -0.022);
  rearShell.scale.set(0.95, 1.02, 0.96);
  rearShell.castShadow = true;
  rearShell.receiveShadow = true;
  armorShellGroup.add(rearShell);

  // Left occipital shell (phi: 1.5π -> 2.5π) closing the missing white shell behind the left ear
  const leftRearShellGeo = geoCache.get('HelmetRearShellGeo_L', () => new THREE.SphereGeometry(
    0.136,
    32,
    20,
    Math.PI * 1.5,
    Math.PI,
    Math.PI * 0.30,
    Math.PI * 0.50
  ));
  const leftRearShell = new THREE.Mesh(leftRearShellGeo, materials.armorDoubleSide);
  leftRearShell.name = 'LeftRearShell';
  leftRearShell.position.set(0, 0.022, -0.022);
  leftRearShell.scale.set(0.95, 1.02, 0.96);
  leftRearShell.castShadow = true;
  leftRearShell.receiveShadow = true;
  armorShellGroup.add(leftRearShell);

  // Merge outer helmet ceramic armor pieces
  const cachedMergedHelmetArmorGeo = geoCache.get('HelmetArmorMergedGeo', () => {
    const merged = mergeGroupMeshesByMaterial(armorShellGroup, materials.armorDoubleSide, 'HelmetArmor_Merged', false);
    return merged ? merged.geometry : null;
  });
  if (cachedMergedHelmetArmorGeo) {
    const mergedHelmetArmor = new THREE.Mesh(cachedMergedHelmetArmorGeo, materials.armorDoubleSide);
    mergedHelmetArmor.name = 'HelmetArmor_Merged';
    mergedHelmetArmor.castShadow = true;
    mergedHelmetArmor.receiveShadow = true;
    group.add(mergedHelmetArmor);
  }

  // 5. Rear Nape Purple LED Accent Bar
  const napeLEDGroup = new THREE.Group();
  napeLEDGroup.name = 'RearNapeLEDGroup';

  const napePoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = (i / 16 - 0.5) * 2; // -1 to 1
    const x = t * 0.036;
    const y = -0.034 - t * t * 0.002;
    const z = -0.148 + t * t * 0.004;
    napePoints.push(new THREE.Vector3(x, y, z));
  }
  const napeCurve = new THREE.CatmullRomCurve3(napePoints);

  const napeBloomGeo = geoCache.get('HelmetNapeBloomGeo', () => new THREE.TubeGeometry(napeCurve, 16, 0.0036, 8, false));
  const napeBloom = new THREE.Mesh(napeBloomGeo, materials.purpleBloom);
  napeLEDGroup.add(napeBloom);

  const napeLEDGeo = geoCache.get('HelmetNapeLEDGeo', () => new THREE.TubeGeometry(napeCurve, 16, 0.0018, 8, false));
  const rearNapeLED = new THREE.Mesh(napeLEDGeo, materials.purpleEmissive);
  rearNapeLED.name = 'RearNapeLED';
  napeLEDGroup.add(rearNapeLED);

  const napeCoreGeo = geoCache.get('HelmetNapeCoreGeo', () => new THREE.TubeGeometry(napeCurve, 16, 0.0008, 6, false));
  const napeCore = new THREE.Mesh(napeCoreGeo, materials.whiteCoreEmissive);
  napeLEDGroup.add(napeCore);

  group.add(napeLEDGroup);

  return {
    group,
    crown,
    leftTemplePanel: leftTemple,
    rightTemplePanel: rightTemple,
    rearShell,
    rearNapeLED,
    browTrim,
  };
}

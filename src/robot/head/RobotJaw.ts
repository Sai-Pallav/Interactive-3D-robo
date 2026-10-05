import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { getVisorSurfacePoint } from './RobotVisor';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger';
import { geoCache } from '../utils/GeometryCache';

export interface JawNodes {
  group: THREE.Group;
  jawShell: THREE.Mesh;
  chinUnderBevel: THREE.Mesh;
  submentalVent: THREE.Mesh;
}

/**
 * Creates the high-precision engineered mechanical jaw and chin assembly:
 * - Beautifully extended, chiseled robotic mandible framing the entire lower visor
 * - Extended downward by a calibrated amount for heroic, balanced facial proportions
 * - Single continuous compound-curved ceramic armor geometry with crisp planar chin facet
 * - Enclosed under-chin submental cowl that seamlessly meets the neck collar
 * - Dark titanium recessed intake vent and underside chamfer trim
 */
export function createRobotJaw(materials: RobotMaterialPalette): JawNodes {
  const group = new THREE.Group();
  group.name = 'JawAssembly';

  // 1. Unified Sculpted White Ceramic Mandible Shell with Integrated Extended Chin
  function createJawGeometry(): THREE.BufferGeometry {
    const uSegments = 54;
    const vSegments = 30;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let iv = 0; iv <= vSegments; iv++) {
      const v = iv / vSegments; // 0 = upper rim meeting visor, 0.72 = extended jawline, 1.0 = enclosed neck socket

      for (let iu = 0; iu <= uSegments; iu++) {
        const u = iu / uSegments;
        const angle = (u - 0.5) * 2 * 1.08; // -1.08 to +1.08 radians (~62° each side)
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        // Top rim: aligns flush with bottom rim of visor glass (+2.2mm proud clearance)
        const topPt = getVisorSurfacePoint(u, 1.0, 0.0022);

        // Extended, heroic mandible rim contour:
        // Chin apex extended down to Y ≈ -0.118 (calibrated extension per user request)
        // gracefully curving up to Y ≈ -0.076 near the ear modules
        const xLower = 0.126 * sinA;
        const chinApexY = -0.118;
        const earJunctionY = -0.076;
        const jawlineY = chinApexY + (earJunctionY - chinApexY) * (1.0 - Math.pow(cosA, 1.4));
        const zLower = -0.004 + 0.154 * cosA;

        let x: number;
        let y: number;
        let z: number;

        if (v <= 0.72) {
          // Anterior-lateral face of the jaw shell
          const t = v / 0.72;
          x = topPt.x + t * (xLower - topPt.x);
          y = topPt.y + t * (jawlineY - topPt.y);
          z = topPt.z + t * (zLower - topPt.z);

          // Sculpted planar chin facet at center front (phi < 0.35 rad)
          const phi = Math.abs(angle);
          if (t > 0.25 && phi < 0.35) {
            const blend = (1.0 - phi / 0.35) * ((t - 0.25) / 0.75);
            // Forward prow projection and sculpted beveled chin facet
            z += 0.0075 * blend * Math.cos(phi * 3.0);
            y -= 0.0035 * blend;
            x *= 1.0 - 0.12 * blend;
          }
        } else {
          // Continuous enclosed under-chin submental cowl
          // Smoothly sweeps inward and down to enclose the neck junction
          const tShelf = (v - 0.72) / 0.28;
          const socketRadius = 0.052;
          const xSocket = socketRadius * sinA;
          const ySocket = jawlineY - 0.010 * tShelf;
          const zSocket = -0.008 + socketRadius * cosA;

          // Smooth hermite-style easing to eliminate sharp triangular creases
          const easeT = tShelf * tShelf * (3 - 2 * tShelf);
          x = xLower + easeT * (xSocket - xLower);
          y = jawlineY + easeT * (ySocket - jawlineY);
          z = zLower + easeT * (zSocket - zLower);
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
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  const jawGeo = geoCache.get('JawGeometry', () => createJawGeometry());
  const jawShell = new THREE.Mesh(jawGeo, materials.armorDoubleSide);
  jawShell.name = 'JawShell';
  jawShell.castShadow = true;
  jawShell.receiveShadow = true;
  group.add(jawShell);

  const jawJointGroup = new THREE.Group();

  // 2. Lower Dark Titanium Sub-Chin Undercut Chamfer Trim
  const underBevelGeo = geoCache.get('ChinUnderBevelGeo', () => new THREE.BoxGeometry(0.038, 0.007, 0.020));
  const chinUnderBevel = new THREE.Mesh(underBevelGeo, materials.joint);
  chinUnderBevel.name = 'ChinUnderBevel';
  chinUnderBevel.position.set(0, -0.116, 0.132);
  chinUnderBevel.rotation.x = 0.32;
  chinUnderBevel.castShadow = true;
  jawJointGroup.add(chinUnderBevel);

  // 3. Dark Titanium Submental Intake Vent (Recessed neatly underneath chin)
  const ventGeo = geoCache.get('SubmentalVentGeo', () => new THREE.CylinderGeometry(0.018, 0.024, 0.016, 24));
  const submentalVent = new THREE.Mesh(ventGeo, materials.joint);
  submentalVent.name = 'SubmentalVent';
  submentalVent.position.set(0, -0.122, 0.096);
  submentalVent.rotation.x = 0.20;
  submentalVent.castShadow = true;
  jawJointGroup.add(submentalVent);

  // 4. Dark Titanium Neck Socket Gorget Collar (Underneath the jaw)
  const socketGeo = geoCache.get('JawNeckSocketGeo', () => new THREE.CylinderGeometry(0.054, 0.050, 0.020, 32));
  const neckSocket = new THREE.Mesh(socketGeo, materials.joint);
  neckSocket.name = 'JawNeckSocketGorget';
  neckSocket.position.set(0, -0.124, 0.010);
  neckSocket.castShadow = true;
  neckSocket.receiveShadow = true;
  jawJointGroup.add(neckSocket);

  const cachedMergedJawJointGeo = geoCache.get('JawJointMergedGeo', () => {
    const merged = mergeGroupMeshesByMaterial(jawJointGroup, materials.joint, 'JawJoint_Merged', false);
    return merged ? merged.geometry : null;
  });
  if (cachedMergedJawJointGeo) {
    const mergedJawJoint = new THREE.Mesh(cachedMergedJawJointGeo, materials.joint);
    mergedJawJoint.name = 'JawJoint_Merged';
    mergedJawJoint.castShadow = true;
    mergedJawJoint.receiveShadow = true;
    group.add(mergedJawJoint);
  }

  return {
    group,
    jawShell,
    chinUnderBevel,
    submentalVent,
  };
}

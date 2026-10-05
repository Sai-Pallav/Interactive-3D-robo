import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { geoCache } from '../utils/GeometryCache';

export interface VisorAssemblyNodes {
  group: THREE.Group;
  visorMesh: THREE.Mesh;
  outerFrame: THREE.Mesh;
  getSurfacePoint: (u: number, v: number, offset?: number) => THREE.Vector3;
}

/**
 * Evaluates points on the expansive panoramic compound-curved face visor.
 * Matching the reference image:
 * - Broad panoramic visor spanning from brow arch (y ≈ +0.092) down to jaw/chin (y ≈ -0.062)
 * - Horizontal LED line at v = 0.46 corresponds exactly to y ≈ +0.020 (aligned with ear module center)
 * - Sweeps back towards the ears (z from +0.158 back to -0.010)
 * - Smooth compound spherical/cylindrical curvature with liquid reflections
 */
export function getVisorSurfacePoint(u: number, v: number, offset: number = 0): THREE.Vector3 {
  // phi spans from right ear (-halfAngle) to left ear (+halfAngle)
  const angleSpan = 1.08; // ~62 degrees each side
  const phi = (u - 0.5) * 2 * angleSpan;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  // Top brow arch (higher at center phi=0, curves down at temples)
  const topY = 0.092 - 0.038 * (1.0 - cosPhi);
  // Bottom jaw contour (tapers inward towards chin)
  const bottomY = -0.062 - 0.012 * cosPhi;

  // Vertical interpolation between top brow and bottom jaw
  const y = topY + v * (bottomY - topY);

  // Curvature dynamics: bulges forward at mid-face
  const vProfile = Math.sin(v * Math.PI);
  const rx = 0.132 + 0.008 * vProfile + offset;
  const rz = 0.156 + 0.012 * vProfile + offset;
  const zCenter = -0.010 - 0.010 * v;

  const x = rx * sinPhi;
  // Compound forward bulge creating rich liquid reflections
  const z = zCenter + rz * cosPhi + 0.008 * Math.cos(phi * 1.5) * vProfile;

  return new THREE.Vector3(x, y, z);
}

/**
 * Creates the glossy obsidian face visor and recessed dark outer frame.
 * Matches Reference Image: expansive, tall, curved face shield with mirror clearcoat.
 */
export function createRobotVisor(materials: RobotMaterialPalette): VisorAssemblyNodes {
  const group = new THREE.Group();
  group.name = 'VisorAssembly';

  const uSegments = 54;
  const vSegments = 36;

  // 1. Glossy Black Face Visor Surface (Part 4 & 5)
  const visorGeo = geoCache.get('BlackVisorGeo', () => {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let iv = 0; iv <= vSegments; iv++) {
      const v = iv / vSegments;
      for (let iu = 0; iu <= uSegments; iu++) {
        const u = iu / uSegments;
        const pt = getVisorSurfacePoint(u, v, 0.0);
        positions.push(pt.x, pt.y, pt.z);
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

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  });

  const visorMesh = new THREE.Mesh(visorGeo, materials.visor);
  visorMesh.name = 'BlackVisor';
  visorMesh.castShadow = true;
  visorMesh.receiveShadow = true;
  group.add(visorMesh);

  // 2. Visor Outer Frame / Gasket Rim (Part 4 Layering)
  // Thin dark titanium perimeter frame sealing the visor into the white armor
  // Filleted corners eliminate sharp tangent turnarounds and duplicate-knot spikes
  const frameGeo = geoCache.get('VisorOuterFrameGeo', () => {
    const frameCurvePoints: THREE.Vector3[] = [];
    const cu = 0.045; // Corner radius in u parameter space
    const cv = 0.065; // Corner radius in v parameter space
    const cornerSteps = 6;
    const edgeStepsU = 24;
    const edgeStepsV = 14;

    // Top brow edge (u: cu -> 1 - cu, v = 0)
    for (let i = 0; i <= edgeStepsU; i++) {
      const t = i / edgeStepsU;
      const u = cu + t * (1 - 2 * cu);
      frameCurvePoints.push(getVisorSurfacePoint(u, 0.0, -0.001));
    }
    // Top-left corner (u: 1 - cu -> 1, v: 0 -> cv)
    for (let i = 1; i <= cornerSteps; i++) {
      const angle = (i / cornerSteps) * (Math.PI * 0.5);
      const u = (1 - cu) + cu * Math.sin(angle);
      const v = cv * (1 - Math.cos(angle));
      frameCurvePoints.push(getVisorSurfacePoint(u, v, -0.001));
    }
    // Left temple down (u = 1, v: cv -> 1 - cv)
    for (let i = 1; i <= edgeStepsV; i++) {
      const t = i / edgeStepsV;
      const v = cv + t * (1 - 2 * cv);
      frameCurvePoints.push(getVisorSurfacePoint(1.0, v, -0.001));
    }
    // Bottom-left corner (u: 1 -> 1 - cu, v: 1 - cv -> 1)
    for (let i = 1; i <= cornerSteps; i++) {
      const angle = (i / cornerSteps) * (Math.PI * 0.5);
      const u = 1.0 - cu * (1 - Math.cos(angle));
      const v = (1 - cv) + cv * Math.sin(angle);
      frameCurvePoints.push(getVisorSurfacePoint(u, v, -0.001));
    }
    // Bottom jaw edge (u: 1 - cu -> cu, v = 1)
    for (let i = 1; i <= edgeStepsU; i++) {
      const t = i / edgeStepsU;
      const u = (1 - cu) - t * (1 - 2 * cu);
      frameCurvePoints.push(getVisorSurfacePoint(u, 1.0, -0.001));
    }
    // Bottom-right corner (u: cu -> 0, v: 1 -> 1 - cv)
    for (let i = 1; i <= cornerSteps; i++) {
      const angle = (i / cornerSteps) * (Math.PI * 0.5);
      const u = cu * (1 - Math.sin(angle));
      const v = 1.0 - cv * (1 - Math.cos(angle));
      frameCurvePoints.push(getVisorSurfacePoint(u, v, -0.001));
    }
    // Right temple up (u = 0, v: 1 - cv -> cv)
    for (let i = 1; i <= edgeStepsV; i++) {
      const t = i / edgeStepsV;
      const v = (1 - cv) - t * (1 - 2 * cv);
      frameCurvePoints.push(getVisorSurfacePoint(0.0, v, -0.001));
    }
    // Top-right corner (u: 0 -> cu, v: cv -> 0)
    for (let i = 1; i < cornerSteps; i++) {
      const angle = (i / cornerSteps) * (Math.PI * 0.5);
      const u = cu * (1 - Math.cos(angle));
      const v = cv * (1 - Math.sin(angle));
      frameCurvePoints.push(getVisorSurfacePoint(u, v, -0.001));
    }

    const frameCurve = new THREE.CatmullRomCurve3(frameCurvePoints, true, 'centripetal');
    return new THREE.TubeGeometry(frameCurve, 100, 0.0028, 8, true);
  });
  const outerFrame = new THREE.Mesh(frameGeo, materials.visorOuterFrame);
  outerFrame.name = 'VisorOuterFrame';
  outerFrame.castShadow = true;
  group.add(outerFrame);

  return {
    group,
    visorMesh,
    outerFrame,
    getSurfacePoint: getVisorSurfacePoint,
  };
}

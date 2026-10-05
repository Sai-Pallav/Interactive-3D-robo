import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { ROBOT_ACCENT } from '../config';
import { getVisorSurfacePoint } from './RobotVisor';
import { geoCache } from '../utils/GeometryCache';

export interface VisorLightNodes {
  group: THREE.Group;
  ledMesh: THREE.Mesh;
  coreMesh: THREE.Mesh;
  bloomMesh: THREE.Mesh;
  pointLight: THREE.PointLight;
}

/**
 * Creates the thin horizontal purple emissive LED blade across the visor.
 * Part 6: Thin horizontal purple line, actual 3D geometry, restrained bloom.
 * Aligned with the center axis of the side ear modules at y ≈ +0.020.
 */
export function createRobotVisorLight(materials: RobotMaterialPalette): VisorLightNodes {
  const group = new THREE.Group();
  group.name = 'PurpleVisorLED';

  const steps = 36;
  const points: THREE.Vector3[] = [];

  // Spans horizontally across the expansive visor (u from 0.08 to 0.92, v = 0.46)
  // Stops cleanly within the front visor aperture, preventing side protrusion
  for (let i = 0; i <= steps; i++) {
    const u = 0.08 + (i / steps) * 0.84;
    const v = 0.46; // Aligned with the ear module center axis (y ≈ +0.020)
    // Offset 1.8mm proud of the glossy visor surface to prevent Z-fighting
    const pt = getVisorSurfacePoint(u, v, 0.0018);
    points.push(pt);
  }

  const curve = new THREE.CatmullRomCurve3(points);

  // 1. Soft Volumetric Purple Bloom Tube (Restrained glow halo)
  const bloomGeo = geoCache.get('VisorLightBloomGeo', () => new THREE.TubeGeometry(curve, 44, 0.0036, 12, false));
  const bloomMesh = new THREE.Mesh(bloomGeo, materials.purpleBloom);
  bloomMesh.name = 'VisorLEDBloom';
  bloomMesh.renderOrder = 900;
  group.add(bloomMesh);

  // 2. Vibrant Brand Purple Neon Tube (Part 6 & 15: ROBOT_ACCENT)
  const ledGeo = geoCache.get('VisorLightLedGeo', () => new THREE.TubeGeometry(curve, 44, 0.0024, 12, false));
  const ledMesh = new THREE.Mesh(ledGeo, materials.purpleEmissive);
  ledMesh.name = 'VisorLEDBar';
  ledMesh.renderOrder = 901;
  group.add(ledMesh);

  // 3. Incandescent Pure White Laser Center Core (Gives crisp hardware optical core)
  const coreGeo = geoCache.get('VisorLightCoreGeo', () => new THREE.TubeGeometry(curve, 44, 0.0011, 10, false));
  const coreMesh = new THREE.Mesh(coreGeo, materials.whiteCoreEmissive);
  coreMesh.name = 'VisorLEDCore';
  coreMesh.renderOrder = 902;
  coreMesh.position.set(0, 0, 0.0006);
  group.add(coreMesh);

  // 4. Localized Specular Point Light casting restrained purple sheen across visor (hardware look)
  const pointLight = new THREE.PointLight(ROBOT_ACCENT, 1.4, 0.50);
  pointLight.position.set(0, 0.020, 0.20);
  group.add(pointLight);

  return {
    group,
    ledMesh,
    coreMesh,
    bloomMesh,
    pointLight,
  };
}

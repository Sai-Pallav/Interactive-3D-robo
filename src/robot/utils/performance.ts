import * as THREE from 'three';

/**
 * Utility functions for WebGL performance optimization and resource disposal.
 */

export function getOptimalPixelRatio(maxRatio: number = 2.0): number {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.devicePixelRatio || 1, maxRatio);
}

/**
 * Safely dispose of Three.js objects, geometries, materials, and textures without double-disposal.
 */
export function deepDispose(root: THREE.Object3D | null | undefined): void {
  if (!root) return;

  const disposedGeometries = new Set<number | string>();
  const disposedMaterials = new Set<string>();

  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh || (child as THREE.Line).isLine || (child as THREE.Points).isPoints) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry && !disposedGeometries.has(mesh.geometry.id)) {
        disposedGeometries.add(mesh.geometry.id);
        mesh.geometry.dispose();
      }

      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => {
            if (!disposedMaterials.has(mat.uuid)) {
              disposedMaterials.add(mat.uuid);
              disposeMaterial(mat);
            }
          });
        } else if (!disposedMaterials.has(mesh.material.uuid)) {
          disposedMaterials.add(mesh.material.uuid);
          disposeMaterial(mesh.material);
        }
      }
    }
  });

  if (root.parent) {
    root.parent.remove(root);
  }
}

function disposeMaterial(material: THREE.Material): void {
  // Dispose all potential texture maps
  const anyMat = material as any;
  const textureProperties = [
    'map',
    'alphaMap',
    'roughnessMap',
    'metalnessMap',
    'normalMap',
    'bumpMap',
    'emissiveMap',
    'clearcoatMap',
    'clearcoatRoughnessMap',
    'clearcoatNormalMap',
    'envMap',
  ];

  for (const prop of textureProperties) {
    if (anyMat[prop] && typeof anyMat[prop].dispose === 'function') {
      anyMat[prop].dispose();
    }
  }

  material.dispose();
}

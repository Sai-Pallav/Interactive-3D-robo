import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { geoCache } from './GeometryCache';

export interface GeometryTransformItem {
  geometry: THREE.BufferGeometry;
  matrix?: THREE.Matrix4;
}

/**
 * Safely merges an array of BufferGeometries (with optional local transform matrices)
 * into a single unified indexed BufferGeometry.
 * Ensures consistent attributes, normal computation, and memory cleanup.
 */
export function safeMergeGeometries(
  items: (THREE.BufferGeometry | GeometryTransformItem)[]
): THREE.BufferGeometry | null {
  if (!items || items.length === 0) return null;

  const prepared: THREE.BufferGeometry[] = [];

  for (const item of items) {
    let geo: THREE.BufferGeometry;
    let mat: THREE.Matrix4 | undefined;

    if ('geometry' in item) {
      geo = item.geometry;
      mat = item.matrix;
    } else {
      geo = item;
    }

    if (!geo || !geo.attributes || !geo.attributes.position) continue;

    // Convert to non-indexed clone to guarantee uniform attributes
    const normalized = geo.index ? geo.toNonIndexed() : geo.clone();

    if (mat) {
      normalized.applyMatrix4(mat);
    }

    // Ensure normal attribute exists
    if (!normalized.attributes.normal) {
      normalized.computeVertexNormals();
    }

    // Ensure consistent UV attribute (add zero UVs if missing)
    if (!normalized.attributes.uv) {
      const posCount = normalized.attributes.position.count;
      normalized.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(posCount * 2), 2));
    }

    prepared.push(normalized);
  }

  if (prepared.length === 0) return null;

  if (prepared.length === 1) {
    const single = mergeVertices(prepared[0]);
    prepared[0].dispose();
    return single;
  }

  const merged = mergeGeometries(prepared, false);
  prepared.forEach((g) => g.dispose());

  if (!merged) return null;

  const indexed = mergeVertices(merged);
  merged.dispose();
  return indexed;
}

/**
 * Traverses an Object3D hierarchy and merges all descendant meshes sharing the specified material
 * into a single unified mesh with baked local transforms relative to `root`.
 * If `replaceInRoot` is true, removes the matched sub-meshes and adds the merged mesh to `root`.
 */
export function mergeGroupMeshesByMaterial(
  root: THREE.Object3D,
  targetMaterial: THREE.Material,
  name?: string,
  replaceInRoot: boolean = false,
  castShadow?: boolean
): THREE.Mesh | null {
  root.updateMatrixWorld(true);
  const invRootMat = root.matrixWorld.clone().invert();
  const items: GeometryTransformItem[] = [];
  const meshesToRemove: THREE.Mesh[] = [];

  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material === targetMaterial) {
      const mesh = child as THREE.Mesh;
      const localMat = mesh.matrixWorld.clone().premultiply(invRootMat);
      items.push({
        geometry: mesh.geometry,
        matrix: localMat,
      });
      meshesToRemove.push(mesh);
    }
  });

  if (items.length === 0) return null;

  const mergedGeo = safeMergeGeometries(items);
  if (!mergedGeo) return null;

  const mergedMesh = new THREE.Mesh(mergedGeo, targetMaterial);
  if (name) mergedMesh.name = name;

  const isEmissive = (targetMaterial as any).isMeshBasicMaterial ||
    Boolean((targetMaterial as any).emissive && (targetMaterial as any).roughness === undefined);
  const shouldCast = castShadow !== undefined ? castShadow : !isEmissive;

  mergedMesh.castShadow = shouldCast;
  mergedMesh.receiveShadow = true;
  mergedMesh.matrixAutoUpdate = false;
  mergedMesh.updateMatrix();

  if (replaceInRoot) {
    for (const m of meshesToRemove) {
      if (m.parent) {
        m.parent.remove(m);
      }
    }
    root.add(mergedMesh);
  }

  return mergedMesh;
}

export interface MergeAllOptions {
  excludeNames?: string[];
  namePrefix?: string;
  castShadow?: boolean;
}

/**
 * Traverses a rigid sub-assembly root and merges ALL meshes grouped by their material.
 * Replaces the disparate sub-meshes with a minimal set of merged meshes (one per material),
 * completely preserving world positions, orientations, normals, UVs, and visual appearance
 * while slashing draw calls and GPU buffer overhead.
 */
export function mergeAllGroupMeshesByMaterial(
  root: THREE.Object3D,
  options: MergeAllOptions = {}
): THREE.Mesh[] {
  root.updateMatrixWorld(true);
  const invRootMat = root.matrixWorld.clone().invert();

  const excludeSet = new Set(options.excludeNames || []);
  const materialGroups = new Map<THREE.Material, { geometry: THREE.BufferGeometry; matrix: THREE.Matrix4 }[]>();
  const meshesToRemove: THREE.Mesh[] = [];

  root.traverse((child) => {
    if (child === root) return;
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (excludeSet.has(mesh.name)) return;
      if (!mesh.geometry || !mesh.material) return;
      if (Array.isArray(mesh.material)) return;

      const localMat = mesh.matrixWorld.clone().premultiply(invRootMat);
      let list = materialGroups.get(mesh.material);
      if (!list) {
        list = [];
        materialGroups.set(mesh.material, list);
      }
      list.push({ geometry: mesh.geometry, matrix: localMat });
      meshesToRemove.push(mesh);
    }
  });

  const mergedMeshes: THREE.Mesh[] = [];
  const prefix = options.namePrefix || root.name || 'Merged';

  for (const [mat, items] of materialGroups.entries()) {
    if (items.length === 0) continue;

    const mergedGeo = safeMergeGeometries(items);
    if (!mergedGeo) continue;

    const matName = (mat as any).name || 'Material';
    const mergedMesh = new THREE.Mesh(mergedGeo, mat);
    mergedMesh.name = `${prefix}_${matName}_Merged`;

    const isEmissive = (mat as any).isMeshBasicMaterial ||
      Boolean((mat as any).emissive && (mat as any).roughness === undefined);
    const shouldCast = options.castShadow !== undefined ? options.castShadow : !isEmissive;

    mergedMesh.castShadow = shouldCast;
    mergedMesh.receiveShadow = true;
    mergedMesh.matrixAutoUpdate = false;
    mergedMesh.updateMatrix();

    mergedMeshes.push(mergedMesh);
  }

  // Remove old meshes and dispose their old geometries (preserving shared cached geometries)
  for (const m of meshesToRemove) {
    if (m.geometry && !geoCache.isCached(m.geometry)) {
      m.geometry.dispose();
    }
    if (m.parent) {
      m.parent.remove(m);
    }
  }

  // Add the unified merged meshes into root
  for (const mm of mergedMeshes) {
    root.add(mm);
  }

  return mergedMeshes;
}

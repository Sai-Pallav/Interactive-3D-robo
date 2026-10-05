import * as THREE from 'three';

export interface DebugStats {
  triangleCount: number;
  armTriangleCount: number;
  vertexCount: number;
  meshCount: number;
  drawCallEstimate: number;
  geometryCount: number;
  instancedMeshCount: number;
  materialCount: number;
}

/**
 * Developer Debug Mode Manager adhering to Section 9 & 12:
 * - Wireframe overlay toggle
 * - Joint pivot axes visualization (THREE.AxesHelper)
 * - Polygon / Triangle count measurement
 * - Diagnostic profiling (mesh count, draw call estimate, geometry count, material count)
 * - toggleDebugMode()
 */
export class DebugManager {
  private targetGroup: THREE.Group;
  private isEnabled: boolean = false;
  private axesHelpers: THREE.AxesHelper[] = [];
  private originalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]> = new Map();
  private debugArmorMaterial = new THREE.MeshBasicMaterial({ wireframe: true, color: 0xc8d6e5, name: 'DebugWireframeArmor' });
  private debugJointMaterial = new THREE.MeshBasicMaterial({ wireframe: true, color: 0x5a6578, name: 'DebugWireframeJoint' });
  private debugMetallicMaterial = new THREE.MeshBasicMaterial({ wireframe: true, color: 0x82b1ff, name: 'DebugWireframeMetallic' });
  private debugAccentMaterial = new THREE.MeshBasicMaterial({ wireframe: true, color: 0xa855f7, name: 'DebugWireframeAccent' });

  constructor(targetGroup: THREE.Group) {
    this.targetGroup = targetGroup;
  }

  private getDebugWireframeMaterial(orig: THREE.Material | THREE.Material[] | undefined): THREE.Material {
    const mat = Array.isArray(orig) ? orig[0] : orig;
    const name = mat?.name || '';
    if (name.includes('Armor')) {
      return this.debugArmorMaterial;
    }
    if (name.includes('Metallic') || name.includes('Machined')) {
      return this.debugMetallicMaterial;
    }
    if (name.includes('Purple') || name.includes('Emissive') || name.includes('Bloom')) {
      return this.debugAccentMaterial;
    }
    return this.debugJointMaterial;
  }

  /**
   * Calculates total triangle, vertex, and mesh count in the robot model and per-arm,
   * along with diagnostic draw call estimates and geometry/material uniqueness.
   */
  public getStats(): DebugStats {
    let triangleCount = 0;
    let armTriangleCount = 0;
    let vertexCount = 0;
    let meshCount = 0;
    let instancedMeshCount = 0;
    let shadowCasters = 0;
    const geometries = new Set<string | number>();
    const materials = new Set<string | number>();

    this.targetGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        meshCount++;
        if ((child as any).isInstancedMesh) {
          instancedMeshCount++;
        }
        if (mesh.castShadow) {
          shadowCasters++;
        }
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => materials.add(m.uuid));
          } else {
            materials.add(mesh.material.uuid);
          }
        }
        const geo = mesh.geometry;
        if (geo) {
          geometries.add(geo.id);
          let count = 0;
          if (geo.index) {
            count = geo.index.count / 3;
          } else if (geo.attributes.position) {
            count = geo.attributes.position.count / 3;
          }
          triangleCount += count;
          if (geo.attributes.position) {
            vertexCount += geo.attributes.position.count;
          }

          // Check if mesh is in Left Arm
          let parent: THREE.Object3D | null = mesh.parent;
          let isInLeftArm = false;
          while (parent) {
            if (parent.name === 'LeftArmRoot') {
              isInLeftArm = true;
              break;
            }
            parent = parent.parent;
          }
          if (isInLeftArm) {
            armTriangleCount += count;
          }
        }
      }
    });

    // Draw call estimate: camera visible mesh pass + directional shadow map pass
    const drawCallEstimate = meshCount + shadowCasters;

    return {
      triangleCount: Math.round(triangleCount),
      armTriangleCount: Math.round(armTriangleCount),
      vertexCount,
      meshCount,
      drawCallEstimate,
      geometryCount: geometries.size,
      instancedMeshCount,
      materialCount: materials.size,
    };
  }

  /**
   * Diagnostic utility to print model metrics to console table on demand (development-only).
   */
  public printDiagnostics(): void {
    const stats = this.getStats();
    console.table({
      'Mesh Count': stats.meshCount,
      'Draw-Call Estimate': stats.drawCallEstimate,
      'Geometry Count': stats.geometryCount,
      'InstancedMesh Count': stats.instancedMeshCount,
      'Triangle Count': stats.triangleCount,
      'Material Count': stats.materialCount,
    });
  }

  /**
   * Toggles debug visuals (wireframe overlay + joint pivot axes).
   */
  public toggleDebugMode(): boolean {
    this.setDebugMode(!this.isEnabled);
    return this.isEnabled;
  }

  public setDebugMode(enabled: boolean): void {
    if (this.isEnabled === enabled) return;
    this.isEnabled = enabled;

    if (enabled) {
      this.enableWireframe();
      this.attachAxesHelpers();
    } else {
      this.disableWireframe();
      this.removeAxesHelpers();
    }
  }

  public isDebugEnabled(): boolean {
    return this.isEnabled;
  }

  private enableWireframe(): void {
    this.targetGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (!this.originalMaterials.has(mesh)) {
          this.originalMaterials.set(mesh, mesh.material);
        }
        mesh.material = this.getDebugWireframeMaterial(this.originalMaterials.get(mesh));
      }
    });
  }

  private disableWireframe(): void {
    this.targetGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const orig = this.originalMaterials.get(mesh);
        if (orig) {
          mesh.material = orig;
        }
      }
    });
    this.originalMaterials.clear();
  }

  private attachAxesHelpers(): void {
    this.removeAxesHelpers();

    // Attach sleek axes helper (0.035m length) to primary articulation pivot groups
    this.targetGroup.traverse((child) => {
      if (
        child.type === 'Group' &&
        child.name &&
        !child.name.includes('Mesh') &&
        (child.name.includes('Pivot') || child.name.includes('Joint') || child.name.includes('Root'))
      ) {
        const axes = new THREE.AxesHelper(0.035);
        axes.name = `DebugAxes_${child.name}`;
        axes.renderOrder = 999;
        (axes.material as THREE.Material).depthTest = false;
        child.add(axes);
        this.axesHelpers.push(axes);
      }
    });
  }

  private removeAxesHelpers(): void {
    this.axesHelpers.forEach((axes) => {
      if (axes.parent) {
        axes.parent.remove(axes);
      }
      axes.dispose();
    });
    this.axesHelpers = [];
  }

  public dispose(): void {
    this.setDebugMode(false);
    this.debugArmorMaterial.dispose();
    this.debugJointMaterial.dispose();
    this.debugMetallicMaterial.dispose();
    this.debugAccentMaterial.dispose();
    this.originalMaterials.clear();
  }
}

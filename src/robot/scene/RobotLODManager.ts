import * as THREE from 'three';

export enum RobotLODLevel {
  LOD0 = 0, // Full detail close-up (dist <= 2.8m): 100% components visible
  LOD1 = 1, // Medium detail (dist > 3.0m, returns at < 2.7m): sub-pixel finger & hand sensor jewels culled
  LOD2 = 2, // Far detail (dist > 4.2m, returns at < 3.8m): sub-pixel micro-bezels & fine accent slits culled
}

export interface RobotLODStats {
  currentLevel: RobotLODLevel;
  distance: number;
  lod1MeshCount: number;
  lod2MeshCount: number;
  culledMeshCount: number;
}

/**
 * RobotLODManager
 *
 * Distance-based Level of Detail (LOD) controller for the procedural Three.js humanoid robot.
 * Features:
 * - Hysteresis buffer to prevent rapid switching / flickering / popping near threshold boundaries
 * - Preserves 100% kinematic articulation, bone hierarchy, and controller attachments
 * - Compatible with Exploded View, Debug Mode wireframe swaps, and look-at tracking
 * - Supports manual override for benchmarking (LOD0, LOD1, LOD2)
 */
export class RobotLODManager {
  private currentLevel: RobotLODLevel = RobotLODLevel.LOD0;
  private forcedLevel: RobotLODLevel | null = null;

  // Hysteresis distance thresholds (measured in world units)
  private readonly enterLOD1Dist = 3.00;
  private readonly exitLOD1Dist = 2.70;
  private readonly enterLOD2Dist = 4.20;
  private readonly exitLOD2Dist = 3.80;

  private lod1Meshes: THREE.Mesh[] = [];
  private lod2Meshes: THREE.Mesh[] = [];

  private robotRoot: THREE.Object3D | null = null;
  private tempWorldPos = new THREE.Vector3();

  constructor(robotRoot?: THREE.Object3D) {
    if (robotRoot) {
      this.init(robotRoot);
    }
  }

  public init(robotRoot: THREE.Object3D): void {
    this.robotRoot = robotRoot;
    this.lod1Meshes = [];
    this.lod2Meshes = [];

    // Traverse robot hierarchy and index candidates by semantic naming
    robotRoot.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const name = mesh.name || '';

        // LOD 1 Candidates: Sub-pixel finger sensor jewels, bloom dots, hand telemetry accents
        if (
          name.includes('SensorJewel') ||
          name.includes('ThumbTelemetryLed') ||
          name.includes('HandTelemetryLED') ||
          name.includes('HandTelemetryBloom')
        ) {
          this.lod1Meshes.push(mesh);
        }

        // LOD 2 Candidates: Sub-pixel knee bezels, small accent slits, micro underglow details
        else if (
          name.includes('PatellaLedBezel') ||
          name.includes('AnkleAccents') ||
          name.includes('ShinLedStrip') ||
          name.includes('ThighLedStrip')
        ) {
          this.lod2Meshes.push(mesh);
        }
      }
    });

    this.applyLevel(this.currentLevel);
  }

  /**
   * Updates LOD state based on distance from camera to robot root, applying hysteresis.
   */
  public update(camera: THREE.Camera): RobotLODLevel {
    if (!this.robotRoot) return this.currentLevel;

    if (this.forcedLevel !== null) {
      if (this.currentLevel !== this.forcedLevel) {
        this.applyLevel(this.forcedLevel);
      }
      return this.currentLevel;
    }

    this.robotRoot.getWorldPosition(this.tempWorldPos);
    const dist = camera.position.distanceTo(this.tempWorldPos);

    let nextLevel = this.currentLevel;

    switch (this.currentLevel) {
      case RobotLODLevel.LOD0:
        if (dist > this.enterLOD1Dist) {
          nextLevel = dist > this.enterLOD2Dist ? RobotLODLevel.LOD2 : RobotLODLevel.LOD1;
        }
        break;

      case RobotLODLevel.LOD1:
        if (dist < this.exitLOD1Dist) {
          nextLevel = RobotLODLevel.LOD0;
        } else if (dist > this.enterLOD2Dist) {
          nextLevel = RobotLODLevel.LOD2;
        }
        break;

      case RobotLODLevel.LOD2:
        if (dist < this.exitLOD1Dist) {
          nextLevel = RobotLODLevel.LOD0;
        } else if (dist < this.exitLOD2Dist) {
          nextLevel = RobotLODLevel.LOD1;
        }
        break;
    }

    if (nextLevel !== this.currentLevel) {
      this.applyLevel(nextLevel);
    }

    return this.currentLevel;
  }

  /**
   * Applies visibility states to collected candidate groups.
   */
  public applyLevel(level: RobotLODLevel): void {
    this.currentLevel = level;

    const showLOD1 = level === RobotLODLevel.LOD0;
    const showLOD2 = level === RobotLODLevel.LOD0 || level === RobotLODLevel.LOD1;

    for (let i = 0; i < this.lod1Meshes.length; i++) {
      this.lod1Meshes[i].visible = showLOD1;
    }

    for (let i = 0; i < this.lod2Meshes.length; i++) {
      this.lod2Meshes[i].visible = showLOD2;
    }
  }

  /**
   * Explicit level override for benchmarking or debug visualization.
   */
  public setForcedLevel(level: RobotLODLevel | null): void {
    this.forcedLevel = level;
    if (level !== null) {
      this.applyLevel(level);
    }
  }

  public getForcedLevel(): RobotLODLevel | null {
    return this.forcedLevel;
  }

  public getCurrentLevel(): RobotLODLevel {
    return this.currentLevel;
  }

  public getStats(camera?: THREE.Camera): RobotLODStats {
    let distance = 0;
    if (camera && this.robotRoot) {
      this.robotRoot.getWorldPosition(this.tempWorldPos);
      distance = Math.round(camera.position.distanceTo(this.tempWorldPos) * 100) / 100;
    }

    let culledMeshCount = 0;
    if (this.currentLevel === RobotLODLevel.LOD1) {
      culledMeshCount = this.lod1Meshes.length;
    } else if (this.currentLevel === RobotLODLevel.LOD2) {
      culledMeshCount = this.lod1Meshes.length + this.lod2Meshes.length;
    }

    return {
      currentLevel: this.currentLevel,
      distance,
      lod1MeshCount: this.lod1Meshes.length,
      lod2MeshCount: this.lod2Meshes.length,
      culledMeshCount,
    };
  }

  public dispose(): void {
    this.applyLevel(RobotLODLevel.LOD0);
    this.lod1Meshes = [];
    this.lod2Meshes = [];
    this.robotRoot = null;
  }
}

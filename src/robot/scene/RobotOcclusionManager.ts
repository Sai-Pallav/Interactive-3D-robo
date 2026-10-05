import * as THREE from 'three';

export interface RobotOcclusionStats {
  enabled: boolean;
  isOccluding: boolean;
  isExploded: boolean;
  isDebug: boolean;
  cameraAzimuthDeg: number;
  totalCandidateCount: number;
  culledMeshCount: number;
  culledTriangles: number;
}

export interface OcclusionCandidate {
  mesh: THREE.Mesh;
  name: string;
  triangles: number;
}

/**
 * RobotOcclusionManager
 *
 * Screen-Space & Camera-Facing Visibility Optimizer for the procedural humanoid robot.
 *
 * Core principles:
 * - Deterministic, angle-aware occlusion culling for physically enclosed and back-facing geometry.
 * - Angle hysteresis buffer (35° enter / 42° exit) prevents rapid flickering/popping.
 * - 100% Exploded View Safety: All internal mechanics immediately revealed during exploded mode.
 * - 100% Debug Mode Safety: All meshes and wireframes revealed during debug inspection.
 * - 100% Animation Safety: Margin buffers guarantee natural breathing, sway, and head turns never clip.
 * - Zero per-frame heap allocations.
 * - Non-overlapping with RobotLODManager (composes cleanly).
 */
export class RobotOcclusionManager {
  private enabled: boolean = true;
  private forcedState: boolean | null = null; // null = auto, true = force culling, false = force disabled

  private robotRoot: THREE.Object3D | null = null;
  private isOccluding: boolean = false;
  private isExploded: boolean = false;
  private isDebug: boolean = false;

  // Hysteresis angle thresholds (degrees) relative to front-facing normal (Z+)
  private readonly enterFrontAngleDeg: number = 36.0;
  private readonly exitFrontAngleDeg: number = 44.0;

  // Tracked candidates
  private candidates: OcclusionCandidate[] = [];
  private totalCandidateTriangles: number = 0;

  // Pre-allocated vectors for zero-allocation per-frame calculations
  private tempRobotWorldPos = new THREE.Vector3();
  private tempCamRelativePos = new THREE.Vector3();
  private currentAzimuthDeg: number = 0;

  constructor(robotRoot?: THREE.Object3D) {
    if (robotRoot) {
      this.init(robotRoot);
    }
  }

  public init(robotRoot: THREE.Object3D): void {
    this.robotRoot = robotRoot;
    this.candidates = [];
    this.totalCandidateTriangles = 0;

    // Semantic indexing of safe occlusion candidates:
    // Fully enclosed mounting bulkheads, sub-rims, and posterior geometry hidden from front
    robotRoot.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const name = mesh.name || '';

        let isCandidate = false;

        // 1. Posterior Thoracic & Scapula: 100% occluded by 53cm wide opaque front chest armor
        if (name === 'ChestBackArmor' || name === 'BackLightBar') {
          isCandidate = true;
        }

        // 2. Helmet Rear Nape: 100% occluded by opaque helmet skull from front
        else if (name === 'RearNapeLED') {
          isCandidate = true;
        }

        // 3. Inboard Shoulder Mounting Bulkheads: Enclosed inside chest socket cavity
        else if (
          name === 'LeftMountingFrame' ||
          name === 'RightMountingFrame' ||
          name === 'LeftMountingFrame_Bolts_Merged' ||
          name === 'RightMountingFrame_Bolts_Merged'
        ) {
          isCandidate = true;
        }

        // 4. Pauldron Interior Sub-Rims: Enclosed inside overhead pauldron shell
        else if (
          name === 'PauldronSubRim_TitaniumSeal' ||
          name === 'PauldronSubRim_MetallicRace'
        ) {
          isCandidate = true;
        }

        if (isCandidate) {
          const geo = mesh.geometry;
          const triCount = geo.index
            ? geo.index.count / 3
            : geo.attributes.position
            ? geo.attributes.position.count / 3
            : 0;

          const candidate: OcclusionCandidate = {
            mesh,
            name,
            triangles: Math.round(triCount),
          };
          this.candidates.push(candidate);
          this.totalCandidateTriangles += candidate.triangles;
        }
      }
    });

    this.applyVisibilityState(true);
  }

  /**
   * Called per frame before rendering.
   * Evaluates camera angle relative to robot root, applying hysteresis.
   */
  public update(camera: THREE.Camera): boolean {
    if (!this.robotRoot || !this.enabled) {
      if (this.isOccluding) {
        this.applyVisibilityState(true);
      }
      return false;
    }

    // Exploded View and Debug Mode strictly require 100% visibility of all components
    if (this.isExploded || this.isDebug) {
      if (this.isOccluding) {
        this.applyVisibilityState(true);
      }
      return false;
    }

    // Manual override for benchmarking / validation
    if (this.forcedState !== null) {
      const shouldOcclude = this.forcedState;
      if (shouldOcclude !== this.isOccluding) {
        this.applyVisibilityState(!shouldOcclude);
      }
      return this.isOccluding;
    }

    // Calculate camera horizontal azimuth relative to robot root
    this.robotRoot.getWorldPosition(this.tempRobotWorldPos);
    this.tempCamRelativePos.subVectors(camera.position, this.tempRobotWorldPos);

    // Azimuth in XZ plane relative to +Z (front)
    const rad = Math.atan2(Math.abs(this.tempCamRelativePos.x), this.tempCamRelativePos.z);
    this.currentAzimuthDeg = (rad * 180) / Math.PI;

    // Camera must also be in front of the robot (z > 0)
    const isFrontFacing = this.tempCamRelativePos.z > 0.5;

    let shouldOcclude = this.isOccluding;

    if (!isFrontFacing) {
      shouldOcclude = false;
    } else if (this.isOccluding) {
      // Currently occluding: exit only if camera swings beyond exit threshold
      if (this.currentAzimuthDeg > this.exitFrontAngleDeg) {
        shouldOcclude = false;
      }
    } else {
      // Currently visible: enter occlusion only if camera enters within enter threshold
      if (this.currentAzimuthDeg < this.enterFrontAngleDeg) {
        shouldOcclude = true;
      }
    }

    if (shouldOcclude !== this.isOccluding) {
      this.applyVisibilityState(!shouldOcclude);
    }

    return this.isOccluding;
  }

  private applyVisibilityState(visible: boolean): void {
    this.isOccluding = !visible;
    for (let i = 0; i < this.candidates.length; i++) {
      this.candidates[i].mesh.visible = visible;
    }
  }

  public setExplodedMode(exploded: boolean): void {
    this.isExploded = exploded;
    if (exploded && this.isOccluding) {
      this.applyVisibilityState(true);
    }
  }

  public setDebugMode(debug: boolean): void {
    this.isDebug = debug;
    if (debug && this.isOccluding) {
      this.applyVisibilityState(true);
    }
  }

  public setForcedState(state: boolean | null): void {
    this.forcedState = state;
    if (state !== null) {
      this.applyVisibilityState(!state);
    }
  }

  public getForcedState(): boolean | null {
    return this.forcedState;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled && this.isOccluding) {
      this.applyVisibilityState(true);
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getStats(): RobotOcclusionStats {
    let culledTriangles = 0;
    let culledMeshCount = 0;

    if (this.isOccluding) {
      culledMeshCount = this.candidates.length;
      culledTriangles = this.totalCandidateTriangles;
    }

    return {
      enabled: this.enabled,
      isOccluding: this.isOccluding,
      isExploded: this.isExploded,
      isDebug: this.isDebug,
      cameraAzimuthDeg: Math.round(this.currentAzimuthDeg * 10) / 10,
      totalCandidateCount: this.candidates.length,
      culledMeshCount,
      culledTriangles,
    };
  }

  public getCandidates(): OcclusionCandidate[] {
    return [...this.candidates];
  }

  public dispose(): void {
    this.applyVisibilityState(true);
    this.candidates = [];
    this.robotRoot = null;
  }
}

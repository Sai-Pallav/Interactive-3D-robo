import * as THREE from 'three';
import { RobotTorsoNodes } from './RobotTorso';
import { TORSO_CONFIG } from './TorsoConfig';

export interface TorsoControlOverrides {
  chestPitch?: number;
  chestYaw?: number;
  chestRoll?: number;
  abdomenBend?: number;
  waistPitch?: number;
  waistYaw?: number;
  waistRoll?: number;
}

/**
 * Kinematics, animation controller, and developer inspection system for the Robot Torso.
 * Adheres strictly to Section 14, 15, 16 of the Master Prompt:
 * - Coordinated breathing micro-movement with hierarchical damping (Chest 100% -> Stomach 65% -> Waist 35%)
 * - Articulated cascaded flexure across the 4 mechanical stomach rings
 * - Wireframe debug mode for geometry inspection
 * - Exploded view inspection mode separating chest shell, flank panels, back armor, stomach rings, and waist
 */
export class TorsoAnimationController {
  private torso: RobotTorsoNodes;
  private time: number = 0;

  // Base transforms for interpolation and damping
  private baseChestRot: THREE.Euler;
  private baseStomachRot: THREE.Euler;
  private baseWaistRot: THREE.Euler;
  private baseRingYs: number[] = [];

  // Base waist positions for exploded view
  private baseUpperWaistRingY: number;
  private baseLowerWaistRingY: number;
  private baseInguinalFlapLeftPos: THREE.Vector3;
  private baseInguinalFlapRightPos: THREE.Vector3;
  private baseSubPelvisCradleY: number;
  private baseLeftIliacCrestX: number;
  private baseRightIliacCrestX: number;

  // Exploded view state
  private explodedProgress: number = 0;
  private isExploded: boolean = false;

  // Manual overrides
  private overrides: TorsoControlOverrides = {};

  // Debug wireframe state
  private isDebugWireframe: boolean = false;
  private originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();

  constructor(torso: RobotTorsoNodes) {
    this.torso = torso;
    this.baseChestRot = torso.chestPivot.rotation.clone();
    this.baseStomachRot = torso.stomachPivot.rotation.clone();
    this.baseWaistRot = torso.waistPivot.rotation.clone();

    torso.stomach.rings.forEach((ring) => {
      this.baseRingYs.push(ring.group.position.y);
    });

    // Cache waist base resting positions for exploded open view
    this.baseUpperWaistRingY = torso.waist.upperWaistRing.position.y;
    this.baseLowerWaistRingY = torso.waist.lowerWaistRing.position.y;
    this.baseInguinalFlapLeftPos = torso.waist.inguinalFlapLeft
      ? torso.waist.inguinalFlapLeft.position.clone()
      : new THREE.Vector3(-0.046, -0.274, 0.038);
    this.baseInguinalFlapRightPos = torso.waist.inguinalFlapRight
      ? torso.waist.inguinalFlapRight.position.clone()
      : new THREE.Vector3(0.046, -0.274, 0.038);
    this.baseSubPelvisCradleY = torso.waist.subPelvisCradle ? torso.waist.subPelvisCradle.position.y : -0.262;
    this.baseLeftIliacCrestX = torso.waist.leftHip.iliacCrestArmor ? torso.waist.leftHip.iliacCrestArmor.position.x : -0.008;
    this.baseRightIliacCrestX = torso.waist.rightHip.iliacCrestArmor ? torso.waist.rightHip.iliacCrestArmor.position.x : 0.008;

    // Cache original materials for wireframe toggling
    torso.group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        this.originalMaterials.set(mesh, mesh.material);
      }
    });
  }

  // ==============================================================
  // PROGRAMMATIC CONTROLS & OVERRIDES
  // ==============================================================

  public setChestRotation(pitch?: number, yaw?: number, roll?: number): void {
    this.overrides.chestPitch = pitch;
    this.overrides.chestYaw = yaw;
    this.overrides.chestRoll = roll;
  }

  public setAbdomenBend(bend?: number): void {
    this.overrides.abdomenBend = bend;
  }

  public setWaistRotation(pitch?: number, yaw?: number, roll?: number): void {
    this.overrides.waistPitch = pitch;
    this.overrides.waistYaw = yaw;
    this.overrides.waistRoll = roll;
  }

  public clearOverrides(): void {
    this.overrides = {};
  }

  // ==============================================================
  // DEVELOPER INSPECTION MODES
  // ==============================================================

  /**
   * Toggles development wireframe mode for all torso components.
   */
  public toggleDebug(enabled?: boolean): boolean {
    this.isDebugWireframe = enabled !== undefined ? enabled : !this.isDebugWireframe;

    this.torso.group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const mat = mesh.material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => {
            if ('wireframe' in m) (m as any).wireframe = this.isDebugWireframe;
          });
        } else if (mat && 'wireframe' in mat) {
          (mat as any).wireframe = this.isDebugWireframe;
        }
      }
    });

    return this.isDebugWireframe;
  }

  /**
   * Sets the exploded inspection view separating components along their natural axes.
   */
  public setExplodedView(enabled: boolean): void {
    this.isExploded = enabled;
  }

  public toggleExplodedView(): boolean {
    this.isExploded = !this.isExploded;
    return this.isExploded;
  }

  public isExplodedActive(): boolean {
    return this.isExploded;
  }

  // ==============================================================
  // REAL-TIME UPDATE
  // ==============================================================

  public update(dt: number, breathOffset: number = 0, lookYaw: number = 0, lookPitch: number = 0): void {
    this.time += dt;

    // 1. Exploded view animation interpolation
    const targetExploded = this.isExploded ? 1.0 : 0.0;
    const diff = Math.abs(this.explodedProgress - targetExploded);
    if (diff > 0.0001) {
      this.explodedProgress = THREE.MathUtils.damp(this.explodedProgress, targetExploded, 6.0, dt);
      if (Math.abs(this.explodedProgress - targetExploded) <= 0.0001) {
        this.explodedProgress = targetExploded;
      }

      const exp = this.explodedProgress;
      // Explode offsets:
      // - Front chest plate moves +Z (forward, carrying the embedded logo cleanly)
      this.torso.chestArmor.centerPanel.position.z = 0.070 + exp * 0.12;
      // - Left & Right flank panels move ±X
      this.torso.chestArmor.leftPanel.position.x = -0.134 - exp * 0.08;
      this.torso.chestArmor.rightPanel.position.x = 0.134 + exp * 0.08;
      // - Back armor moves -Z (backward)
      this.torso.upperTorsoFrame.backArmor.position.z = -0.085 - exp * 0.10;
      this.torso.upperTorsoFrame.backLightBar.position.z = -0.100 - exp * 0.10;
      // - Stomach rings spread vertically along spine
      const ringCount = this.torso.stomach.rings.length;
      const midIdx = (ringCount - 1) / 2;
      this.torso.stomach.rings.forEach((ring, idx) => {
        const spread = (idx - midIdx) * 0.024 * exp;
        ring.group.position.y = this.baseRingYs[idx] + spread;
      });

      // - Abdominal side mechanism clusters (bilateral actuators) expand laterally in ±X during exploded view
      if (this.torso.stomach.sideMechanismLeft && this.torso.stomach.sideMechanismRight) {
        this.torso.stomach.sideMechanismLeft.position.x = -exp * 0.045;
        this.torso.stomach.sideMechanismLeft.position.z = exp * 0.020;
        this.torso.stomach.sideMechanismRight.position.x = exp * 0.045;
        this.torso.stomach.sideMechanismRight.position.z = exp * 0.020;
      }
      // - Waist and hips drop slightly in -Y
      this.torso.waist.waistPivot.position.y = -exp * 0.06;

      // - Upper and Lower Waist Collars separate vertically, exposing the central turntable bearing core & stator teeth!
      this.torso.waist.upperWaistRing.position.y = this.baseUpperWaistRingY + exp * 0.032;
      this.torso.waist.lowerWaistRing.position.y = this.baseLowerWaistRingY - exp * 0.032;

      // - Pelvic shield (carrying nested intake vent & violet optical sensor) moves forward in +Z
      this.torso.waist.pelvicPlate.position.z = 0.046 + exp * 0.09;

      // - Left & Right Inguinal Flaps slide diagonally outward and forward in ±X, +Z
      if (this.torso.waist.inguinalFlapLeft && this.torso.waist.inguinalFlapRight) {
        this.torso.waist.inguinalFlapLeft.position.set(
          this.baseInguinalFlapLeftPos.x - exp * 0.038,
          this.baseInguinalFlapLeftPos.y,
          this.baseInguinalFlapLeftPos.z + exp * 0.045
        );
        this.torso.waist.inguinalFlapRight.position.set(
          this.baseInguinalFlapRightPos.x + exp * 0.038,
          this.baseInguinalFlapRightPos.y,
          this.baseInguinalFlapRightPos.z + exp * 0.045
        );
      }

      // - Iliac Crest pauldron cowls slide laterally outward from hip hubs
      if (this.torso.waist.leftHip.iliacCrestArmor && this.torso.waist.rightHip.iliacCrestArmor) {
        this.torso.waist.leftHip.iliacCrestArmor.position.x = this.baseLeftIliacCrestX - exp * 0.024;
        this.torso.waist.rightHip.iliacCrestArmor.position.x = this.baseRightIliacCrestX + exp * 0.024;
      }

      // - Left & Right Hip assemblies separate laterally along ±X
      const hipCfg = TORSO_CONFIG.waist.hipConnector;
      this.torso.waist.leftHip.group.position.x = -hipCfg.mountX - exp * 0.055;
      this.torso.waist.rightHip.group.position.x = hipCfg.mountX + exp * 0.055;

      // - Sub-Pelvic Mechanical Cradle drops downward in -Y to reveal lower spine connection
      if (this.torso.waist.subPelvisCradle) {
        this.torso.waist.subPelvisCradle.position.y = this.baseSubPelvisCradleY - exp * 0.042;
      }
    }

    // If fully exploded for inspection, pause kinematic rotations
    if (this.explodedProgress > 0.85) return;

    // 2. Natural Breathing & Damping Kinematics (Section 14 & 15)
    // Chest leads: 100% motion
    const chestPitchDelta =
      Math.sin(this.time * 0.42) * 0.012 + breathOffset * 0.06 + lookPitch * 0.03;
    const chestYawDelta = Math.sin(this.time * 0.30) * 0.010 + lookYaw * 0.04;
    const chestRollDelta = Math.cos(this.time * 0.36) * 0.008;

    this.torso.chestPivot.rotation.set(
      this.overrides.chestPitch ?? (this.baseChestRot.x + chestPitchDelta),
      this.overrides.chestYaw ?? (this.baseChestRot.y + chestYawDelta),
      this.overrides.chestRoll ?? (this.baseChestRot.z + chestRollDelta)
    );

    // Stomach follows with phase delay: 65% motion
    const stPitchDelta = chestPitchDelta * 0.65;
    const stYawDelta = chestYawDelta * 0.65;
    const stRollDelta = chestRollDelta * 0.65;

    this.torso.stomachPivot.rotation.set(
      this.baseStomachRot.x + stPitchDelta,
      this.baseStomachRot.y + stYawDelta,
      this.baseStomachRot.z + stRollDelta
    );

    // Subtle cascaded compression across the articulated stomach rings
    const ringBend = this.overrides.abdomenBend ?? Math.sin(this.time * 0.42 + 0.3) * 0.014;
    const ringCount = this.torso.stomach.rings.length || 1;
    this.torso.stomach.rings.forEach((ring, idx) => {
      const ringWeight = (idx + 1) / ringCount;
      ring.group.rotation.x = ringBend * ringWeight * 0.4;
      ring.group.rotation.y = stYawDelta * ringWeight * 0.3;
    });

    // Waist follows with heavy mechanical damping: 35% motion
    const waistPitchDelta = chestPitchDelta * 0.35;
    const waistYawDelta = chestYawDelta * 0.35;
    const waistRollDelta = chestRollDelta * 0.35;

    const limits = TORSO_CONFIG.limits;
    this.torso.waistPivot.rotation.set(
      this.overrides.waistPitch ??
        THREE.MathUtils.clamp(this.baseWaistRot.x + waistPitchDelta, -limits.waistPitch, limits.waistPitch),
      this.overrides.waistYaw ??
        THREE.MathUtils.clamp(this.baseWaistRot.y + waistYawDelta, -limits.waistYaw, limits.waistYaw),
      this.overrides.waistRoll ??
        THREE.MathUtils.clamp(this.baseWaistRot.z + waistRollDelta, -limits.waistRoll, limits.waistRoll)
    );
  }
}

import * as THREE from 'three';
import { RobotLegNodes } from './RobotLeg';
import { LEG_CONFIG } from './LegConfig';

export interface LegPoseOverrides {
  hipPitch?: number;
  hipYaw?: number;
  hipRoll?: number;
  kneePitch?: number;
  anklePitch?: number;
  ankleRoll?: number;
}

/**
 * Kinematics, animation controller, and developer inspection system for the Robot Legs & Feet.
 * - Coordinated breathing micro-compliance synchronized with the torso
 * - Subtle organic weight-shift and idle ground contact stabilization
 * - Programmatic joint angle overrides for posing and walking cycles
 * - Developer debug wireframe inspection mode
 * - Exploded view inspection mode separating armor shells from mechanical skeleton
 */
export class LegAnimationController {
  private leftLeg: RobotLegNodes;
  private rightLeg: RobotLegNodes;
  private time: number = 0;

  // Base transforms for resting stance
  private baseLeftHipRot: THREE.Euler;
  private baseRightHipRot: THREE.Euler;
  private baseLeftKneeRot: THREE.Euler;
  private baseRightKneeRot: THREE.Euler;
  private baseLeftAnkleRot: THREE.Euler;
  private baseRightAnkleRot: THREE.Euler;

  // Manual overrides
  private leftOverrides: LegPoseOverrides = {};
  private rightOverrides: LegPoseOverrides = {};

  // Debug wireframe state
  private isDebugWireframe: boolean = false;
  private originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();

  // Exploded view state
  private explodedProgress: number = 0;

  constructor(leftLeg: RobotLegNodes, rightLeg: RobotLegNodes) {
    this.leftLeg = leftLeg;
    this.rightLeg = rightLeg;

    this.baseLeftHipRot = leftLeg.hip.group.rotation.clone();
    this.baseRightHipRot = rightLeg.hip.group.rotation.clone();

    this.baseLeftKneeRot = leftLeg.knee.shinPivot.rotation.clone();
    this.baseRightKneeRot = rightLeg.knee.shinPivot.rotation.clone();

    this.baseLeftAnkleRot = leftLeg.ankle.footPivot.rotation.clone();
    this.baseRightAnkleRot = rightLeg.ankle.footPivot.rotation.clone();

    // Cache original materials for wireframe toggling
    const cacheMaterials = (leg: RobotLegNodes) => {
      leg.root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          this.originalMaterials.set(mesh, mesh.material);
        }
      });
    };
    cacheMaterials(leftLeg);
    cacheMaterials(rightLeg);
  }

  // ==============================================================
  // PROGRAMMATIC CONTROLS & OVERRIDES
  // ==============================================================

  public setLeftLegPose(overrides: LegPoseOverrides): void {
    this.leftOverrides = { ...this.leftOverrides, ...overrides };
  }

  public setRightLegPose(overrides: LegPoseOverrides): void {
    this.rightOverrides = { ...this.rightOverrides, ...overrides };
  }

  public clearOverrides(): void {
    this.leftOverrides = {};
    this.rightOverrides = {};
  }

  // ==============================================================
  // DEVELOPER INSPECTION MODES
  // ==============================================================

  /**
   * Toggles developer wireframe mode for all leg and foot components.
   */
  public toggleDebug(enabled?: boolean): boolean {
    this.isDebugWireframe = enabled !== undefined ? enabled : !this.isDebugWireframe;

    const toggleLeg = (leg: RobotLegNodes) => {
      leg.root.traverse((obj) => {
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
    };

    toggleLeg(this.leftLeg);
    toggleLeg(this.rightLeg);
    return this.isDebugWireframe;
  }

  /**
   * Exploded view inspection separating armor panels from structural skeleton.
   */
  public setExplodedProgress(progress: number): void {
    this.explodedProgress = Math.max(0, Math.min(1, progress));
    const p = this.explodedProgress;

    const applyExplodedToLeg = (leg: RobotLegNodes, side: -1 | 1) => {
      // Anterior Thigh armor slides forward (+Z) and outward (+X)
      leg.thigh.anteriorArmor.position.z = 0.027 + p * 0.045;
      leg.thigh.lateralArmor.position.x = side * (0.024 + p * 0.040);

      // Patellar shield pops forward
      leg.knee.patellaShield.position.z = LEG_CONFIG.knee.patella.offsetZ + p * 0.040;

      // Shin anterior keel plate pushes forward
      leg.shin.anteriorKeelArmor.position.z = 0.025 + p * 0.045;

      // Calf armor moves backward (-Z)
      leg.shin.posteriorCalfArmor.position.z = -0.025 - p * 0.040;

      // Foot dorsal plate lifts upward
      leg.foot.dorsalArmor.position.y = -LEG_CONFIG.foot.height * 0.42 + p * 0.030;

      // Toe armor slides forward
      leg.foot.toeArmor.position.z = LEG_CONFIG.foot.toeCap.length * 0.35 + p * 0.035;
    };

    applyExplodedToLeg(this.leftLeg, -1);
    applyExplodedToLeg(this.rightLeg, 1);
  }

  // ==============================================================
  // KINEMATICS & IDLE ANIMATION UPDATE
  // ==============================================================

  /**
   * Updates subtle kinematic compliance, breathing synchronization, and weight shift.
   */
  public update(deltaTime: number, breathingPhase: number = 0): void {
    this.time += deltaTime;

    // 1. Coordinated breathing micro-compliance (~0.004 rad knee flexion)
    // Breathing cycle drives micro knee & ankle elasticity, giving organic life
    const breathKnee = Math.sin(breathingPhase) * 0.005;
    const breathAnkle = -breathKnee * 0.85;

    // 2. Slow subtle weight shift between left and right leg (period ~6.5s)
    const weightShiftPhase = this.time * 0.95;
    const weightShift = Math.sin(weightShiftPhase) * 0.0035;

    // Update Left Leg
    const lHip = this.leftLeg.hip.group;
    lHip.rotation.x = this.baseLeftHipRot.x + (this.leftOverrides.hipPitch ?? breathKnee * 0.3);
    lHip.rotation.y = this.baseLeftHipRot.y + (this.leftOverrides.hipYaw ?? 0);
    lHip.rotation.z = this.baseLeftHipRot.z + (this.leftOverrides.hipRoll ?? -weightShift);

    const lKnee = this.leftLeg.knee.shinPivot;
    lKnee.rotation.x = this.baseLeftKneeRot.x + (this.leftOverrides.kneePitch ?? breathKnee);

    const lAnkle = this.leftLeg.ankle.footPivot;
    lAnkle.rotation.x = this.baseLeftAnkleRot.x + (this.leftOverrides.anklePitch ?? breathAnkle);
    lAnkle.rotation.z = this.baseLeftAnkleRot.z + (this.leftOverrides.ankleRoll ?? weightShift * 0.7);

    // Update Right Leg
    const rHip = this.rightLeg.hip.group;
    rHip.rotation.x = this.baseRightHipRot.x + (this.rightOverrides.hipPitch ?? breathKnee * 0.3);
    rHip.rotation.y = this.baseRightHipRot.y + (this.rightOverrides.hipYaw ?? 0);
    rHip.rotation.z = this.baseRightHipRot.z + (this.rightOverrides.hipRoll ?? weightShift);

    const rKnee = this.rightLeg.knee.shinPivot;
    rKnee.rotation.x = this.baseRightKneeRot.x + (this.rightOverrides.kneePitch ?? breathKnee);

    const rAnkle = this.rightLeg.ankle.footPivot;
    rAnkle.rotation.x = this.baseRightAnkleRot.x + (this.rightOverrides.anklePitch ?? breathAnkle);
    rAnkle.rotation.z = this.baseRightAnkleRot.z + (this.rightOverrides.ankleRoll ?? -weightShift * 0.7);
  }
}

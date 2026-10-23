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
  private leftRestPositions: any;
  private rightRestPositions: any;

  constructor(leftLeg: RobotLegNodes, rightLeg: RobotLegNodes) {
    this.leftLeg = leftLeg;
    this.rightLeg = rightLeg;

    this.baseLeftHipRot = leftLeg.hip.group.rotation.clone();
    this.baseRightHipRot = rightLeg.hip.group.rotation.clone();

    this.baseLeftKneeRot = leftLeg.knee.shinPivot.rotation.clone();
    this.baseRightKneeRot = rightLeg.knee.shinPivot.rotation.clone();

    this.baseLeftAnkleRot = leftLeg.ankle.footPivot.rotation.clone();
    this.baseRightAnkleRot = rightLeg.ankle.footPivot.rotation.clone();

    // Cache rest positions of articulated armor shells for seamless exploded view
    const cacheRestPositions = (leg: RobotLegNodes) => ({
      thighAntZ: leg.thigh.anteriorArmor.position.z,
      thighLatX: leg.thigh.lateralArmor.position.x,
      thighMedX: leg.thigh.medialArmor.position.x,
      thighTrochY: leg.thigh.trochanterHood.position.y,
      thighPostZ: leg.thigh.posteriorPlate.position.z,
      kneePatellaZ: leg.knee.patellaShield.position.z,
      shinKeelZ: leg.shin.anteriorKeelArmor.position.z,
      shinCalfZ: leg.shin.posteriorCalfArmor.position.z,
      footDorsalY: leg.foot.dorsalArmor.position.y,
      footToeZ: leg.foot.toeArmor.position.z,
      footHeelZ: leg.foot.heelArmor.position.z,
    });
    this.leftRestPositions = cacheRestPositions(leftLeg);
    this.rightRestPositions = cacheRestPositions(rightLeg);

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

    const applyExplodedToLeg = (leg: RobotLegNodes, side: -1 | 1, rest: any) => {
      // Anterior Thigh armor slides forward (+Z)
      leg.thigh.anteriorArmor.position.z = rest.thighAntZ + p * 0.045;
      // Lateral and medial thigh cowls separate symmetrically
      leg.thigh.lateralArmor.position.x = rest.thighLatX + side * (p * 0.040);
      leg.thigh.medialArmor.position.x = rest.thighMedX - side * (p * 0.035);
      // Trochanter hood slides upward
      leg.thigh.trochanterHood.position.y = rest.thighTrochY + p * 0.020;
      // Posterior hamstring plates move backward (-Z)
      leg.thigh.posteriorPlate.position.z = rest.thighPostZ - p * 0.040;

      // Patellar shield pops forward
      leg.knee.patellaShield.position.z = rest.kneePatellaZ + p * 0.040;

      // Shin anterior keel plate pushes forward
      leg.shin.anteriorKeelArmor.position.z = rest.shinKeelZ + p * 0.045;
      // Calf armor moves backward (-Z)
      leg.shin.posteriorCalfArmor.position.z = rest.shinCalfZ - p * 0.040;

      // Foot dorsal plate lifts upward
      leg.foot.dorsalArmor.position.y = rest.footDorsalY + p * 0.030;
      // Toe armor slides forward
      leg.foot.toeArmor.position.z = rest.footToeZ + p * 0.035;
      // Heel armor and integrated thruster/clevis assembly slides backward
      if (leg.foot.heelArmor.parent && leg.foot.heelArmor.parent !== leg.foot.group) {
        leg.foot.heelArmor.parent.position.z = -p * 0.030;
      } else {
        leg.foot.heelArmor.position.z = rest.footHeelZ - p * 0.030;
      }

      // Dynamically track Achilles hydraulic damper
      leg.ankle.achillesDamper?.update?.();
    };

    applyExplodedToLeg(this.leftLeg, -1, this.leftRestPositions);
    applyExplodedToLeg(this.rightLeg, 1, this.rightRestPositions);
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
    lHip.rotation.x = this.leftOverrides.hipPitch !== undefined ? this.leftOverrides.hipPitch : (this.baseLeftHipRot.x + breathKnee * 0.3);
    lHip.rotation.y = this.leftOverrides.hipYaw !== undefined ? this.leftOverrides.hipYaw : this.baseLeftHipRot.y;
    lHip.rotation.z = this.leftOverrides.hipRoll !== undefined ? this.leftOverrides.hipRoll : (this.baseLeftHipRot.z - weightShift);

    const lKnee = this.leftLeg.knee.shinPivot;
    lKnee.rotation.x = this.leftOverrides.kneePitch !== undefined ? this.leftOverrides.kneePitch : (this.baseLeftKneeRot.x + breathKnee);

    const lAnkle = this.leftLeg.ankle.footPivot;
    lAnkle.rotation.x = this.leftOverrides.anklePitch !== undefined ? this.leftOverrides.anklePitch : (this.baseLeftAnkleRot.x + breathAnkle);
    lAnkle.rotation.z = this.leftOverrides.ankleRoll !== undefined ? this.leftOverrides.ankleRoll : (this.baseLeftAnkleRot.z + weightShift * 0.7);

    // Update Right Leg
    const rHip = this.rightLeg.hip.group;
    rHip.rotation.x = this.rightOverrides.hipPitch !== undefined ? this.rightOverrides.hipPitch : (this.baseRightHipRot.x + breathKnee * 0.3);
    rHip.rotation.y = this.rightOverrides.hipYaw !== undefined ? this.rightOverrides.hipYaw : this.baseRightHipRot.y;
    rHip.rotation.z = this.rightOverrides.hipRoll !== undefined ? this.rightOverrides.hipRoll : (this.baseRightHipRot.z + weightShift);

    const rKnee = this.rightLeg.knee.shinPivot;
    rKnee.rotation.x = this.rightOverrides.kneePitch !== undefined ? this.rightOverrides.kneePitch : (this.baseRightKneeRot.x + breathKnee);

    const rAnkle = this.rightLeg.ankle.footPivot;
    rAnkle.rotation.x = this.rightOverrides.anklePitch !== undefined ? this.rightOverrides.anklePitch : (this.baseRightAnkleRot.x + breathAnkle);
    rAnkle.rotation.z = this.rightOverrides.ankleRoll !== undefined ? this.rightOverrides.ankleRoll : (this.baseRightAnkleRot.z - weightShift * 0.7);

    // 3. Dynamic telescoping compliance for Achilles dampers
    this.leftLeg.ankle.achillesDamper?.update?.();
    this.rightLeg.ankle.achillesDamper?.update?.();
  }
}

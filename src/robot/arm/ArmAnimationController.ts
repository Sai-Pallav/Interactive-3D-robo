import * as THREE from 'three';
import { RobotArmNodes } from './RobotArm';
import { FingerNodes, ThumbNodes } from './Finger';

export interface ArmControlOverrides {
  shoulder?: { x?: number; y?: number; z?: number };
  shoulderJoint?: { x?: number; y?: number; z?: number };
  upperArm?: { x?: number; y?: number; z?: number };
  elbowBend?: number;
  elbowRoll?: number;
  elbow?: { x?: number; y?: number; z?: number };
  wrist?: { pitch?: number; yaw?: number; roll?: number };
  thumb?: { proxCurl?: number; distCurl?: number; splay?: number };
  fingers?: Array<{ proxCurl?: number; midCurl?: number; distCurl?: number; splay?: number }>;
}

export type HandPoseName = 'relaxed' | 'fist' | 'open' | 'point' | 'grip' | 'pinch' | 'peace';

export interface FingerPoseTarget {
  prox: number;
  mid: number;
  dist: number;
  splay: number;
}

export interface ThumbPoseTarget {
  pitch: number;
  yaw: number;
  roll: number;
  prox: number;
  dist: number;
}

export interface HandPosePreset {
  fingers: [FingerPoseTarget, FingerPoseTarget, FingerPoseTarget, FingerPoseTarget]; // Index, Middle, Ring, Little
  thumb: ThumbPoseTarget;
}

export const HAND_POSES: Record<HandPoseName, HandPosePreset> = {
  // 1. Signature anatomical resting athletic cascade (Natural relaxed humanoid hand matching Reference Images 1 & 2)
  relaxed: {
    fingers: [
      { prox: 0.26, mid: 0.38, dist: 0.24, splay:  0.018 }, // Index: graceful forward extension & gentle curve, fanned outward
      { prox: 0.32, mid: 0.46, dist: 0.28, splay:  0.000 }, // Middle: progressive athletic curve, central anchor
      { prox: 0.38, mid: 0.54, dist: 0.32, splay: -0.016 }, // Ring: progressive cascade tuck, fanned outward
      { prox: 0.44, mid: 0.62, dist: 0.36, splay: -0.035 }, // Little: cascading tuck into palm, fanned outward
    ],
    thumb: {
      pitch: 0.32,
      yaw: 0.18,
      roll: 0.26,
      prox: 0.28,
      dist: 0.32,
    },
  },
  // 2. Powerful mecha combat fist (full closure against palmar elastomer pads)
  fist: {
    fingers: [
      { prox: 1.38, mid: 1.48, dist: 1.22, splay: -0.015 },
      { prox: 1.40, mid: 1.50, dist: 1.25, splay:  0.000 },
      { prox: 1.38, mid: 1.48, dist: 1.22, splay:  0.018 },
      { prox: 1.35, mid: 1.45, dist: 1.18, splay:  0.035 },
    ],
    thumb: {
      pitch: 0.68,
      yaw: 0.50,
      roll: 0.26,
      prox: 0.60,
      dist: 0.80,
    },
  },
  // 3. Heroic flat open hand with wide transverse finger splay
  open: {
    fingers: [
      { prox: 0.04, mid: 0.05, dist: 0.04, splay: -0.080 },
      { prox: 0.02, mid: 0.03, dist: 0.02, splay: -0.015 },
      { prox: 0.03, mid: 0.04, dist: 0.03, splay:  0.050 },
      { prox: 0.06, mid: 0.07, dist: 0.06, splay:  0.120 },
    ],
    thumb: {
      pitch: 0.18,
      yaw: 0.10,
      roll: 0.28,
      prox: 0.08,
      dist: 0.10,
    },
  },
  // 4. Precision pointing gesture (Index extended, others locked in palm)
  point: {
    fingers: [
      { prox: 0.02, mid: 0.03, dist: 0.02, splay: -0.020 }, // Index straight
      { prox: 1.38, mid: 1.48, dist: 1.22, splay:  0.005 }, // Middle curled
      { prox: 1.40, mid: 1.50, dist: 1.25, splay:  0.020 }, // Ring curled
      { prox: 1.36, mid: 1.46, dist: 1.18, splay:  0.040 }, // Little curled
    ],
    thumb: {
      pitch: 0.65,
      yaw: 0.48,
      roll: 0.24,
      prox: 0.55,
      dist: 0.75,
    },
  },
  // 5. Cylindrical power grip (holding equipment, rods, handles)
  grip: {
    fingers: [
      { prox: 0.95, mid: 1.15, dist: 0.85, splay: -0.020 },
      { prox: 0.98, mid: 1.18, dist: 0.88, splay:  0.000 },
      { prox: 0.96, mid: 1.16, dist: 0.86, splay:  0.022 },
      { prox: 0.92, mid: 1.12, dist: 0.82, splay:  0.045 },
    ],
    thumb: {
      pitch: 0.52,
      yaw: 0.40,
      roll: 0.22,
      prox: 0.48,
      dist: 0.58,
    },
  },
  // 6. Dexterous fine-manipulation pinch (Thumb tip to index tip)
  pinch: {
    fingers: [
      { prox: 0.68, mid: 0.92, dist: 0.70, splay:  0.010 }, // Index meets thumb tip
      { prox: 0.42, mid: 0.65, dist: 0.48, splay:  0.020 },
      { prox: 0.95, mid: 1.15, dist: 0.85, splay:  0.045 },
      { prox: 1.15, mid: 1.28, dist: 0.98, splay:  0.070 },
    ],
    thumb: {
      pitch: 0.60,
      yaw: 0.48,
      roll: 0.20,
      prox: 0.52,
      dist: 0.62,
    },
  },
  // 7. Iconic victory / peace V-sign
  peace: {
    fingers: [
      { prox: 0.04, mid: 0.05, dist: 0.03, splay: -0.090 }, // Index spread V
      { prox: 0.04, mid: 0.05, dist: 0.03, splay:  0.090 }, // Middle spread V
      { prox: 1.40, mid: 1.50, dist: 1.25, splay:  0.020 }, // Ring tucked
      { prox: 1.38, mid: 1.48, dist: 1.22, splay:  0.040 }, // Little tucked
    ],
    thumb: {
      pitch: 0.70,
      yaw: 0.52,
      roll: 0.26,
      prox: 0.60,
      dist: 0.80,
    },
  },
};

/**
 * Kinematics and animation controller for procedural robot arms and hands.
 * Adheres to Section 5:
 * - Independent control for shoulder, upper arm, elbow, wrist, thumb, and each finger segment.
 * - Dynamic hand moulding: smooth transition between any hand poses (relaxed, fist, open, point, grip, pinch, peace).
 * - Hierarchical bending where rotating a joint moves its children naturally.
 * - Organic idle kinematics with breathing coupling and cascading finger waves.
 */
export class ArmAnimationController {
  private leftArm: RobotArmNodes;
  private rightArm: RobotArmNodes;
  private time: number = 0;

  // Base resting rotations
  private baseLeftShoulderRot: THREE.Euler;
  private baseRightShoulderRot: THREE.Euler;
  private baseLeftUpperRot: THREE.Euler;
  private baseRightUpperRot: THREE.Euler;
  private baseLeftElbowRot: THREE.Euler;
  private baseRightElbowRot: THREE.Euler;
  private baseLeftWristRot: THREE.Euler;
  private baseRightWristRot: THREE.Euler;
  private baseLeftWristTrunnionRot: THREE.Euler;
  private baseRightWristTrunnionRot: THREE.Euler;

  // Exploded View State (Technical Reference Exploded Views: Shoulder & Elbow)
  private isExploded: boolean = false;
  private explodedProgress: number = 0;

  private leftBaseShoulderArmorPos: THREE.Vector3;
  private rightBaseShoulderArmorPos: THREE.Vector3;
  private leftBaseShoulderJointPos: THREE.Vector3;
  private rightBaseShoulderJointPos: THREE.Vector3;
  private leftBaseConnectorPos: THREE.Vector3;
  private rightBaseConnectorPos: THREE.Vector3;
  private leftBaseGimbalYokePos: THREE.Vector3;
  private rightBaseGimbalYokePos: THREE.Vector3;
  private leftBaseCycloidalPos: THREE.Vector3;
  private rightBaseCycloidalPos: THREE.Vector3;
  private leftBaseFaceplatePos: THREE.Vector3;
  private rightBaseFaceplatePos: THREE.Vector3;
  private leftBaseAccentRingPos: THREE.Vector3;
  private rightBaseAccentRingPos: THREE.Vector3;
  private leftBaseDamperPistonPos: THREE.Vector3;
  private rightBaseDamperPistonPos: THREE.Vector3;
  private leftBaseBicepSubGroupPos: THREE.Vector3;
  private rightBaseBicepSubGroupPos: THREE.Vector3;

  private leftBaseLatDiscPos: THREE.Vector3;
  private rightBaseLatDiscPos: THREE.Vector3;
  private leftBaseMedDiscPos: THREE.Vector3;
  private rightBaseMedDiscPos: THREE.Vector3;
  private leftBasePinPos: THREE.Vector3;
  private rightBasePinPos: THREE.Vector3;
  private leftBaseForearmPivotPos: THREE.Vector3;
  private rightBaseForearmPivotPos: THREE.Vector3;

  private leftBaseRamPos: THREE.Vector3;
  private rightBaseRamPos: THREE.Vector3;
  private leftBaseRamPistonPos: THREE.Vector3;
  private rightBaseRamPistonPos: THREE.Vector3;
  private leftBaseOlecranonPos: THREE.Vector3;
  private rightBaseOlecranonPos: THREE.Vector3;

  private leftBaseForearmArmorPos: THREE.Vector3;
  private rightBaseForearmArmorPos: THREE.Vector3;
  private leftBaseBrachioPos: THREE.Vector3;
  private rightBaseBrachioPos: THREE.Vector3;

  private leftBaseWristStyloidLPos: THREE.Vector3;
  private rightBaseWristStyloidLPos: THREE.Vector3;
  private leftBaseWristStyloidRPos: THREE.Vector3;
  private rightBaseWristStyloidRPos: THREE.Vector3;
  private leftBaseWristDorsalPos: THREE.Vector3;
  private rightBaseWristDorsalPos: THREE.Vector3;
  private leftBaseWristClevisPos: THREE.Vector3;
  private rightBaseWristClevisPos: THREE.Vector3;
  private leftBaseWristSwivelPos: THREE.Vector3;
  private rightBaseWristSwivelPos: THREE.Vector3;

  // Manual overrides for programmatic posing
  private leftOverrides: ArmControlOverrides = {};
  private rightOverrides: ArmControlOverrides = {};

  // Hand pose dynamic moulding system
  private activePoseLeft: HandPoseName = 'relaxed';
  private targetPoseLeft: HandPoseName = 'relaxed';
  private poseTransitionLeft: number = 1.0;
  private poseDurationLeft: number = 0.4;

  private activePoseRight: HandPoseName = 'relaxed';
  private targetPoseRight: HandPoseName = 'relaxed';
  private poseTransitionRight: number = 1.0;
  private poseDurationRight: number = 0.4;

  // Persistent target pools to eliminate per-frame allocations (600 allocs/sec saved)
  private fingerTargetPool: [FingerPoseTarget[], FingerPoseTarget[]] = [
    [
      { prox: 0, mid: 0, dist: 0, splay: 0 },
      { prox: 0, mid: 0, dist: 0, splay: 0 },
      { prox: 0, mid: 0, dist: 0, splay: 0 },
      { prox: 0, mid: 0, dist: 0, splay: 0 },
    ],
    [
      { prox: 0, mid: 0, dist: 0, splay: 0 },
      { prox: 0, mid: 0, dist: 0, splay: 0 },
      { prox: 0, mid: 0, dist: 0, splay: 0 },
      { prox: 0, mid: 0, dist: 0, splay: 0 },
    ],
  ];

  private thumbTargetPool: [ThumbPoseTarget, ThumbPoseTarget] = [
    { pitch: 0, yaw: 0, roll: 0, prox: 0, dist: 0 },
    { pitch: 0, yaw: 0, roll: 0, prox: 0, dist: 0 },
  ];

  constructor(leftArm: RobotArmNodes, rightArm: RobotArmNodes) {
    this.leftArm = leftArm;
    this.rightArm = rightArm;

    this.baseLeftShoulderRot = leftArm.shoulder.group.rotation.clone();
    this.baseRightShoulderRot = rightArm.shoulder.group.rotation.clone();
    this.baseLeftUpperRot = leftArm.upperArm.group.rotation.clone();
    this.baseRightUpperRot = rightArm.upperArm.group.rotation.clone();
    this.baseLeftElbowRot = (leftArm.elbow.forearmPivot || leftArm.elbow.group).rotation.clone();
    this.baseRightElbowRot = (rightArm.elbow.forearmPivot || rightArm.elbow.group).rotation.clone();
    this.baseLeftWristRot = leftArm.wrist.group.rotation.clone();
    this.baseRightWristRot = rightArm.wrist.group.rotation.clone();
    this.baseLeftWristTrunnionRot = leftArm.wrist.trunnionPivot.rotation.clone();
    this.baseRightWristTrunnionRot = rightArm.wrist.trunnionPivot.rotation.clone();

    // Cache initial resting positions for exploded view components
    this.leftBaseShoulderArmorPos = leftArm.shoulder.armorGroup.position.clone();
    this.rightBaseShoulderArmorPos = rightArm.shoulder.armorGroup.position.clone();
    this.leftBaseShoulderJointPos = leftArm.shoulder.jointGroup.position.clone();
    this.rightBaseShoulderJointPos = rightArm.shoulder.jointGroup.position.clone();
    this.leftBaseConnectorPos = leftArm.shoulder.upperArmConnector.position.clone();
    this.rightBaseConnectorPos = rightArm.shoulder.upperArmConnector.position.clone();

    this.leftBaseGimbalYokePos = (leftArm.shoulder.gimbalYoke || leftArm.shoulder.group).position.clone();
    this.rightBaseGimbalYokePos = (rightArm.shoulder.gimbalYoke || rightArm.shoulder.group).position.clone();
    this.leftBaseCycloidalPos = (leftArm.shoulder.cycloidalDrive || leftArm.shoulder.jointGroup).position.clone();
    this.rightBaseCycloidalPos = (rightArm.shoulder.cycloidalDrive || rightArm.shoulder.jointGroup).position.clone();
    this.leftBaseFaceplatePos = (leftArm.shoulder.faceplateHub || leftArm.shoulder.jointGroup).position.clone();
    this.rightBaseFaceplatePos = (rightArm.shoulder.faceplateHub || rightArm.shoulder.jointGroup).position.clone();
    this.leftBaseAccentRingPos = (leftArm.shoulder.accentRing || leftArm.shoulder.jointGroup).position.clone();
    this.rightBaseAccentRingPos = (rightArm.shoulder.accentRing || rightArm.shoulder.jointGroup).position.clone();
    this.leftBaseDamperPistonPos = (leftArm.shoulder.damperPiston || leftArm.shoulder.jointGroup).position.clone();
    this.rightBaseDamperPistonPos = (rightArm.shoulder.damperPiston || rightArm.shoulder.jointGroup).position.clone();
    this.leftBaseBicepSubGroupPos = leftArm.upperArm.bicepSubGroup.position.clone();
    this.rightBaseBicepSubGroupPos = rightArm.upperArm.bicepSubGroup.position.clone();

    this.leftBaseLatDiscPos = leftArm.elbow.lateralDisc.position.clone();
    this.rightBaseLatDiscPos = rightArm.elbow.lateralDisc.position.clone();
    this.leftBaseMedDiscPos = leftArm.elbow.medialDisc.position.clone();
    this.rightBaseMedDiscPos = rightArm.elbow.medialDisc.position.clone();
    this.leftBasePinPos = leftArm.elbow.centralPin.position.clone();
    this.rightBasePinPos = rightArm.elbow.centralPin.position.clone();
    this.leftBaseForearmPivotPos = leftArm.elbow.forearmPivot.position.clone();
    this.rightBaseForearmPivotPos = rightArm.elbow.forearmPivot.position.clone();

    this.leftBaseRamPos = leftArm.elbow.hydraulicRam ? leftArm.elbow.hydraulicRam.position.clone() : new THREE.Vector3();
    this.rightBaseRamPos = rightArm.elbow.hydraulicRam ? rightArm.elbow.hydraulicRam.position.clone() : new THREE.Vector3();
    this.leftBaseRamPistonPos = leftArm.elbow.ramPiston ? leftArm.elbow.ramPiston.position.clone() : new THREE.Vector3();
    this.rightBaseRamPistonPos = rightArm.elbow.ramPiston ? rightArm.elbow.ramPiston.position.clone() : new THREE.Vector3();
    this.leftBaseOlecranonPos = leftArm.elbow.olecranonMesh ? leftArm.elbow.olecranonMesh.position.clone() : new THREE.Vector3();
    this.rightBaseOlecranonPos = rightArm.elbow.olecranonMesh ? rightArm.elbow.olecranonMesh.position.clone() : new THREE.Vector3();

    this.leftBaseForearmArmorPos = leftArm.forearm.armorGroup ? leftArm.forearm.armorGroup.position.clone() : new THREE.Vector3();
    this.rightBaseForearmArmorPos = rightArm.forearm.armorGroup ? rightArm.forearm.armorGroup.position.clone() : new THREE.Vector3();
    this.leftBaseBrachioPos = leftArm.forearm.brachioradialis ? leftArm.forearm.brachioradialis.position.clone() : new THREE.Vector3();
    this.rightBaseBrachioPos = rightArm.forearm.brachioradialis ? rightArm.forearm.brachioradialis.position.clone() : new THREE.Vector3();

    this.leftBaseWristStyloidLPos = leftArm.wrist.styloidArmorLeft ? leftArm.wrist.styloidArmorLeft.position.clone() : new THREE.Vector3();
    this.rightBaseWristStyloidLPos = rightArm.wrist.styloidArmorLeft ? rightArm.wrist.styloidArmorLeft.position.clone() : new THREE.Vector3();
    this.leftBaseWristStyloidRPos = leftArm.wrist.styloidArmorRight ? leftArm.wrist.styloidArmorRight.position.clone() : new THREE.Vector3();
    this.rightBaseWristStyloidRPos = rightArm.wrist.styloidArmorRight ? rightArm.wrist.styloidArmorRight.position.clone() : new THREE.Vector3();
    this.leftBaseWristDorsalPos = leftArm.wrist.dorsalCowl ? leftArm.wrist.dorsalCowl.position.clone() : new THREE.Vector3();
    this.rightBaseWristDorsalPos = rightArm.wrist.dorsalCowl ? rightArm.wrist.dorsalCowl.position.clone() : new THREE.Vector3();
    this.leftBaseWristClevisPos = leftArm.wrist.distalClevis ? leftArm.wrist.distalClevis.position.clone() : new THREE.Vector3();
    this.rightBaseWristClevisPos = rightArm.wrist.distalClevis ? rightArm.wrist.distalClevis.position.clone() : new THREE.Vector3();
    this.leftBaseWristSwivelPos = leftArm.wrist.swivelCollar ? leftArm.wrist.swivelCollar.position.clone() : new THREE.Vector3();
    this.rightBaseWristSwivelPos = rightArm.wrist.swivelCollar ? rightArm.wrist.swivelCollar.position.clone() : new THREE.Vector3();

    // Cache disc subnode X positions
    [leftArm, rightArm].forEach((arm) => {

      if (arm.elbow.lateralDiscNodes) {
        const l = arm.elbow.lateralDiscNodes;
        l.bearingRace.userData.baseX = l.bearingRace.position.x;
        l.accentRing.userData.baseX = l.accentRing.position.x;
        l.outerBezel.userData.baseX = l.outerBezel.position.x;
        l.innerDisc.userData.baseX = l.innerDisc.position.x;
        l.hubCap.userData.baseX = l.hubCap.position.x;
      }
      if (arm.elbow.medialDiscNodes) {
        const m = arm.elbow.medialDiscNodes;
        m.bearingRace.userData.baseX = m.bearingRace.position.x;
        m.accentRing.userData.baseX = m.accentRing.position.x;
        m.outerBezel.userData.baseX = m.outerBezel.position.x;
        m.innerDisc.userData.baseX = m.innerDisc.position.x;
        m.hubCap.userData.baseX = m.hubCap.position.x;
      }
    });
  }

  // ==============================================================
  // EXPLODED VIEW CONTROLS (Technical Reference Drawings)
  // ==============================================================

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
  // PROGRAMMATIC KINEMATIC CONTROLS (Section 5)
  // ==============================================================

  public setShoulderRotation(side: -1 | 1, x?: number, y?: number, z?: number): void {
    const overrides = side === -1 ? this.leftOverrides : this.rightOverrides;
    overrides.shoulder = { x, y, z };
  }

  public setShoulderJointRotation(side: -1 | 1, x?: number, y?: number, z?: number): void {
    const overrides = side === -1 ? this.leftOverrides : this.rightOverrides;
    overrides.shoulderJoint = { x, y, z };
  }

  public setUpperArmRotation(side: -1 | 1, x?: number, y?: number, z?: number): void {
    const overrides = side === -1 ? this.leftOverrides : this.rightOverrides;
    overrides.upperArm = { x, y, z };
  }

  public setElbowBend(side: -1 | 1, bendAngle: number): void {
    const overrides = side === -1 ? this.leftOverrides : this.rightOverrides;
    overrides.elbowBend = bendAngle;
  }

  public setElbowRoll(side: -1 | 1, rollAngle: number): void {
    const overrides = side === -1 ? this.leftOverrides : this.rightOverrides;
    overrides.elbowRoll = rollAngle;
  }

  public setWristRotation(side: -1 | 1, pitch?: number, yaw?: number, roll?: number): void {
    const overrides = side === -1 ? this.leftOverrides : this.rightOverrides;
    overrides.wrist = { pitch, yaw, roll };
  }

  public setPoseOverrides(side: 'left' | 'right' | -1 | 1, overrides: ArmControlOverrides): void {
    const isLeft = side === 'left' || side === -1;
    if (isLeft) {
      this.leftOverrides = { ...this.leftOverrides, ...overrides };
    } else {
      this.rightOverrides = { ...this.rightOverrides, ...overrides };
    }
  }

  public clearOverrides(side?: -1 | 1): void {
    if (side === -1 || side === undefined) this.leftOverrides = {};
    if (side === 1 || side === undefined) this.rightOverrides = {};
  }

  // ==============================================================
  // HAND POSE MOULDING API
  // Dynamic transitions to any hand pose: relaxed, fist, open, point, grip, pinch, peace
  // ==============================================================

  public setHandPose(
    side: 'left' | 'right' | 'both' | -1 | 1,
    pose: HandPoseName,
    durationSec: number = 0.4
  ): void {
    if (!HAND_POSES[pose]) return;
    if (side === 'left' || side === -1 || side === 'both') {
      if (this.targetPoseLeft !== pose) {
        this.activePoseLeft = this.poseTransitionLeft < 1.0 ? this.targetPoseLeft : this.activePoseLeft;
        this.targetPoseLeft = pose;
        this.poseTransitionLeft = 0;
        this.poseDurationLeft = durationSec;
      }
    }
    if (side === 'right' || side === 1 || side === 'both') {
      if (this.targetPoseRight !== pose) {
        this.activePoseRight = this.poseTransitionRight < 1.0 ? this.targetPoseRight : this.activePoseRight;
        this.targetPoseRight = pose;
        this.poseTransitionRight = 0;
        this.poseDurationRight = durationSec;
      }
    }
  }

  public getHandPose(side: 'left' | 'right' | -1 | 1): HandPoseName {
    return (side === 'left' || side === -1) ? this.targetPoseLeft : this.targetPoseRight;
  }

  // ==============================================================
  // REAL-TIME KINEMATICS UPDATE
  // ==============================================================

  public update(
    dt: number,
    breathOffset: number = 0,
    lookYaw: number = 0,
    lookPitch: number = 0
  ): void {
    this.time += dt;

    // Update hand pose transitions
    if (this.poseTransitionLeft < 1.0) {
      this.poseTransitionLeft = Math.min(1.0, this.poseTransitionLeft + dt / Math.max(0.01, this.poseDurationLeft));
      if (this.poseTransitionLeft >= 1.0) {
        this.activePoseLeft = this.targetPoseLeft;
      }
    }
    if (this.poseTransitionRight < 1.0) {
      this.poseTransitionRight = Math.min(1.0, this.poseTransitionRight + dt / Math.max(0.01, this.poseDurationRight));
      if (this.poseTransitionRight >= 1.0) {
        this.activePoseRight = this.targetPoseRight;
      }
    }

    // Exploded View smooth damping interpolation
    const targetExploded = this.isExploded ? 1.0 : 0.0;
    const diff = Math.abs(this.explodedProgress - targetExploded);
    if (diff > 0.0001) {
      this.explodedProgress = THREE.MathUtils.damp(this.explodedProgress, targetExploded, 6.0, dt);
      if (Math.abs(this.explodedProgress - targetExploded) <= 0.0001) {
        this.explodedProgress = targetExploded;
      }
      this.applyExplodedOffsets(this.leftArm, -1, this.explodedProgress);
      this.applyExplodedOffsets(this.rightArm, 1, this.explodedProgress);
    }

    this.updateArmKinematics(
      this.leftArm,
      this.baseLeftShoulderRot,
      this.baseLeftUpperRot,
      this.baseLeftElbowRot,
      this.baseLeftWristRot,
      this.leftOverrides,
      -1,
      breathOffset,
      lookYaw,
      lookPitch
    );

    this.updateArmKinematics(
      this.rightArm,
      this.baseRightShoulderRot,
      this.baseRightUpperRot,
      this.baseRightElbowRot,
      this.baseRightWristRot,
      this.rightOverrides,
      1,
      breathOffset,
      lookYaw,
      lookPitch
    );
  }

  /**
   * Separates components along their natural engineering axes adhering strictly to
   * the provided "SHOULDER OVERVIEW -> EXPLODED VIEW" and "ELBOW OVERVIEW -> EXPLODED VIEW".
   */
  private applyExplodedOffsets(
    arm: RobotArmNodes,
    side: -1 | 1,
    exp: number
  ): void {
    const isLeft = side === -1;
    const baseShoulderArmor = isLeft ? this.leftBaseShoulderArmorPos : this.rightBaseShoulderArmorPos;
    const baseShoulderJoint = isLeft ? this.leftBaseShoulderJointPos : this.rightBaseShoulderJointPos;
    const baseConnector = isLeft ? this.leftBaseConnectorPos : this.rightBaseConnectorPos;

    const baseLatDisc = isLeft ? this.leftBaseLatDiscPos : this.rightBaseLatDiscPos;
    const baseMedDisc = isLeft ? this.leftBaseMedDiscPos : this.rightBaseMedDiscPos;
    const basePin = isLeft ? this.leftBasePinPos : this.rightBasePinPos;
    const baseForearmPivot = isLeft ? this.leftBaseForearmPivotPos : this.rightBaseForearmPivotPos;

    // 1. SHOULDER & BICEP MULTI-STAGE MECHANICAL OPEN VIEW (CAD Engineering Hierarchy)
    // Stage A: Shoulder Pauldron Armor Shell lifts upward & out to reveal internal mechanism
    arm.shoulder.armorGroup.position.set(
      baseShoulderArmor.x + side * exp * 0.012,
      baseShoulderArmor.y + exp * 0.024,
      baseShoulderArmor.z + exp * 0.006
    );

    // Stage B: Structural Gimbal Yoke lifts smoothly within armor (never punches through top!)
    if (arm.shoulder.gimbalYoke) {
      const baseYoke = isLeft ? this.leftBaseGimbalYokePos : this.rightBaseGimbalYokePos;
      arm.shoulder.gimbalYoke.position.set(
        baseYoke.x + side * exp * 0.008,
        baseYoke.y + exp * 0.016,
        baseYoke.z + exp * 0.004
      );
    }

    // Stage C: Hydraulic Damper Actuator extends chrome piston rod
    if (arm.shoulder.damperPiston) {
      const basePiston = isLeft ? this.leftBaseDamperPistonPos : this.rightBaseDamperPistonPos;
      arm.shoulder.damperPiston.position.y = basePiston.y - exp * 0.012;
    }

    // Stage D: Rotational Joint Core separates along X axis
    arm.shoulder.jointGroup.position.set(
      baseShoulderJoint.x + side * exp * 0.008,
      baseShoulderJoint.y,
      baseShoulderJoint.z
    );

    // Stage E: Cycloidal Planetary Drive Ring separates cleanly along X (Concentric Layer 1)
    if (arm.shoulder.cycloidalDrive) {
      const baseCyclo = isLeft ? this.leftBaseCycloidalPos : this.rightBaseCycloidalPos;
      arm.shoulder.cycloidalDrive.position.x = baseCyclo.x + side * exp * 0.016;
    }

    // Stage F: Purple Reactor Accent Ring separates along X from cached base (Concentric Layer 2)
    if (arm.shoulder.accentRing) {
      const baseAccent = isLeft ? this.leftBaseAccentRingPos : this.rightBaseAccentRingPos;
      arm.shoulder.accentRing.position.x = baseAccent.x + side * exp * 0.024;
    }

    // Stage G: Precision Billet Faceplate & Fasteners separates along X (Concentric Layer 3)
    if (arm.shoulder.faceplateHub) {
      const baseFace = isLeft ? this.leftBaseFaceplatePos : this.rightBaseFaceplatePos;
      arm.shoulder.faceplateHub.position.x = baseFace.x + side * exp * 0.034;
    }

    // Stage H: Articulated Clevis & Trunnion drops downward along -Y
    arm.shoulder.upperArmConnector.position.set(
      baseConnector.x,
      baseConnector.y - exp * 0.020,
      baseConnector.z
    );

    // Stage H: Bicep Armor Shell slides downward and outward along -Y and +Z,
    // uncovering the internal dark titanium bone armature core!
    if (arm.upperArm.bicepSubGroup) {
      const baseBicep = isLeft ? this.leftBaseBicepSubGroupPos : this.rightBaseBicepSubGroupPos;
      arm.upperArm.bicepSubGroup.position.set(
        baseBicep.x + side * exp * 0.015,
        baseBicep.y - exp * 0.046,
        baseBicep.z + exp * 0.028
      );
    }

    // 2. ELBOW & FOREARM MULTI-STAGE MECHANICAL OPEN VIEW (CAD Engineering Hierarchy)
    // Stage A: Central Hinge Axle Pin slides outward along transverse X axis
    const latSign = side === 1 ? 1 : -1;
    arm.elbow.centralPin.position.set(
      basePin.x + latSign * exp * 0.032,
      basePin.y,
      basePin.z
    );

    // Stage B: Dual Rotational Side Discs slide laterally along ±X
    arm.elbow.lateralDisc.position.set(
      baseLatDisc.x + latSign * exp * 0.038,
      baseLatDisc.y,
      baseLatDisc.z
    );
    arm.elbow.medialDisc.position.set(
      baseMedDisc.x - latSign * exp * 0.038,
      baseMedDisc.y,
      baseMedDisc.z
    );

    // Stage C: Concentric Disassembly of the Lateral & Medial Rotational Discs
    // Bearing Race -> Purple LED Halo -> Outer Bezel with Hex Screws -> Hub Cap
    if (arm.elbow.lateralDiscNodes) {
      const l = arm.elbow.lateralDiscNodes;
      const bRace = l.bearingRace.userData.baseX ?? l.bearingRace.position.x;
      const bAccent = l.accentRing.userData.baseX ?? l.accentRing.position.x;
      const bBezel = l.outerBezel.userData.baseX ?? l.outerBezel.position.x;
      const bHub = l.hubCap.userData.baseX ?? l.hubCap.position.x;

      l.bearingRace.position.x = bRace + latSign * exp * 0.014;
      l.accentRing.position.x = bAccent + latSign * exp * 0.026;
      l.outerBezel.position.x = bBezel + latSign * exp * 0.040;
      l.hubCap.position.x = bHub + latSign * exp * 0.055;
    }

    if (arm.elbow.medialDiscNodes) {
      const m = arm.elbow.medialDiscNodes;
      const medSign = -latSign;
      const bRace = m.bearingRace.userData.baseX ?? m.bearingRace.position.x;
      const bAccent = m.accentRing.userData.baseX ?? m.accentRing.position.x;
      const bBezel = m.outerBezel.userData.baseX ?? m.outerBezel.position.x;
      const bHub = m.hubCap.userData.baseX ?? m.hubCap.position.x;

      m.bearingRace.position.x = bRace + medSign * exp * 0.014;
      m.accentRing.position.x = bAccent + medSign * exp * 0.026;
      m.outerBezel.position.x = bBezel + medSign * exp * 0.040;
      m.hubCap.position.x = bHub + medSign * exp * 0.055;
    }

    // Stage D: Posterior Hydraulic Flexion Ram extends piston rod & pivots back
    if (arm.elbow.hydraulicRam) {
      const baseRam = isLeft ? this.leftBaseRamPos : this.rightBaseRamPos;
      arm.elbow.hydraulicRam.position.set(
        baseRam.x,
        baseRam.y + exp * 0.014,
        baseRam.z - exp * 0.022
      );
    }
    if (arm.elbow.ramPiston) {
      const basePiston = isLeft ? this.leftBaseRamPistonPos : this.rightBaseRamPistonPos;
      arm.elbow.ramPiston.position.y = basePiston.y - exp * 0.018;
    }

    // Stage E: Posterior Olecranon Armor Shield separates backward along -Z & +Y
    if (arm.elbow.olecranonMesh) {
      const baseOle = isLeft ? this.leftBaseOlecranonPos : this.rightBaseOlecranonPos;
      arm.elbow.olecranonMesh.position.set(
        baseOle.x,
        baseOle.y + exp * 0.018,
        baseOle.z - exp * 0.038
      );
    }

    // Stage F: Lower Clevis Housing & Forearm Pivot drops downward along -Y
    arm.elbow.forearmPivot.position.set(
      baseForearmPivot.x,
      baseForearmPivot.y - exp * 0.048,
      baseForearmPivot.z
    );

    // Stage G: Forearm Outer Armor Shell slides downward and forward along -Y and +Z,
    // uncovering the internal dark titanium bone armature sleeve!
    if (arm.forearm.armorGroup) {
      const baseForearmArmor = isLeft ? this.leftBaseForearmArmorPos : this.rightBaseForearmArmorPos;
      arm.forearm.armorGroup.position.set(
        baseForearmArmor.x,
        baseForearmArmor.y - exp * 0.036,
        baseForearmArmor.z + exp * 0.022
      );
    }

    // Stage H: Contoured Brachioradialis Accent Plate slides laterally outward
    if (arm.forearm.brachioradialis) {
      const baseBrachio = isLeft ? this.leftBaseBrachioPos : this.rightBaseBrachioPos;
      arm.forearm.brachioradialis.position.x = baseBrachio.x + side * exp * 0.026;
    }

    // 2.5 WRIST EXPLODED VIEW (Open view exposing internal harmonic drive, trunnion hinge pin & bearing)
    if (arm.wrist.styloidArmorLeft && arm.wrist.styloidArmorRight) {
      const baseStyL = isLeft ? this.leftBaseWristStyloidLPos : this.rightBaseWristStyloidLPos;
      const baseStyR = isLeft ? this.leftBaseWristStyloidRPos : this.rightBaseWristStyloidRPos;
      // White ceramic lateral styloid armor cowls separate laterally outward
      arm.wrist.styloidArmorLeft.position.x = baseStyL.x - exp * 0.024;
      arm.wrist.styloidArmorRight.position.x = baseStyR.x + exp * 0.024;
    }

    if (arm.wrist.dorsalCowl) {
      const baseDorsalW = isLeft ? this.leftBaseWristDorsalPos : this.rightBaseWristDorsalPos;
      // White ceramic dorsal bridge cowl moves forward in +Z
      arm.wrist.dorsalCowl.position.z = baseDorsalW.z + exp * 0.022;
    }

    if (arm.wrist.distalClevis) {
      const baseClevis = isLeft ? this.leftBaseWristClevisPos : this.rightBaseWristClevisPos;
      // Machined dark titanium dual-fork clevis yoke slides downward in -Y towards hand
      arm.wrist.distalClevis.position.y = baseClevis.y - exp * 0.016;
    }

    if (arm.wrist.swivelCollar) {
      const baseSwivel = isLeft ? this.leftBaseWristSwivelPos : this.rightBaseWristSwivelPos;
      // Swivel collar sleeve moves slightly upward in +Y towards forearm
      arm.wrist.swivelCollar.position.y = baseSwivel.y + exp * 0.008;
    }
  }

  private updateArmKinematics(
    arm: RobotArmNodes,
    baseShoulder: THREE.Euler,
    baseUpper: THREE.Euler,
    baseElbow: THREE.Euler,
    baseWrist: THREE.Euler,
    overrides: ArmControlOverrides,
    side: -1 | 1,
    breathOffset: number,
    lookYaw: number,
    lookPitch: number
  ): void {
    const isLeft = side === -1;
    const timePhase = isLeft ? 0 : 2.4;

    // 1. Shoulder Kinematics
    if (overrides.shoulder) {
      if (overrides.shoulder.x !== undefined) arm.shoulder.group.rotation.x = overrides.shoulder.x;
      if (overrides.shoulder.y !== undefined) arm.shoulder.group.rotation.y = overrides.shoulder.y;
      if (overrides.shoulder.z !== undefined) arm.shoulder.group.rotation.z = overrides.shoulder.z;
    } else {
      arm.shoulder.group.rotation.set(
        baseShoulder.x,
        baseShoulder.y,
        baseShoulder.z + (isLeft ? -breathOffset * 0.04 : breathOffset * 0.04)
      );
    }

    // 1b. Shoulder Joint Rotational Mechanism (rotates independently from shoulder armor per Section 4)
    if (overrides.shoulderJoint) {
      if (overrides.shoulderJoint.x !== undefined) arm.shoulder.jointGroup.rotation.x = overrides.shoulderJoint.x;
      if (overrides.shoulderJoint.y !== undefined) arm.shoulder.jointGroup.rotation.y = overrides.shoulderJoint.y;
      if (overrides.shoulderJoint.z !== undefined) arm.shoulder.jointGroup.rotation.z = overrides.shoulderJoint.z;
    }

    // 2. Upper Arm Kinematics
    if (overrides.upperArm) {
      if (overrides.upperArm.x !== undefined) arm.upperArm.group.rotation.x = overrides.upperArm.x;
      if (overrides.upperArm.y !== undefined) arm.upperArm.group.rotation.y = overrides.upperArm.y;
      if (overrides.upperArm.z !== undefined) arm.upperArm.group.rotation.z = overrides.upperArm.z;
    } else {
      const upperSway = Math.sin(this.time * 0.40 + timePhase) * 0.015 + breathOffset * 0.05;
      arm.upperArm.group.rotation.set(
        baseUpper.x + upperSway,
        baseUpper.y,
        baseUpper.z
      );
    }

    // 3. Elbow Kinematics (articulates forearmPivot around the central horizontal hinge axis & carrying angle)
    const elbowPivot = arm.elbow.forearmPivot || arm.elbow.group;
    const targetRoll =
      overrides.elbowRoll !== undefined
        ? overrides.elbowRoll
        : (overrides.elbow?.z !== undefined ? overrides.elbow.z : baseElbow.z);
    const targetYaw =
      overrides.elbow?.y !== undefined ? overrides.elbow.y : baseElbow.y;

    if (overrides.elbowBend !== undefined || overrides.elbowRoll !== undefined || overrides.elbow !== undefined) {
      const bend =
        overrides.elbowBend !== undefined
          ? overrides.elbowBend
          : (overrides.elbow?.x !== undefined ? overrides.elbow.x : baseElbow.x);
      elbowPivot.rotation.set(bend, targetYaw, targetRoll);
    } else {
      const elbowDelta =
        Math.sin(this.time * 0.36 + timePhase) * 0.018 +
        breathOffset * 0.06 +
        lookPitch * 0.02;
      elbowPivot.rotation.set(
        baseElbow.x + elbowDelta,
        baseElbow.y,
        targetRoll
      );
    }

    // 4. Wrist Kinematics (Pitch, Yaw, Roll)
    // Note: wrist.group remains coaxial with forearm (rotation.x=0, rotation.z=0) so the cuff
    // sits perfectly flush against the gauntlet. Pronation (roll) rotates wrist.group.rotation.y.
    // Flexion (pitch) and deviation (yaw) articulate the internal trunnionPivot around the axle pin.
    const baseTrunnion = isLeft ? this.baseLeftWristTrunnionRot : this.baseRightWristTrunnionRot;
    if (overrides.wrist) {
      if (overrides.wrist.pitch !== undefined) arm.wrist.trunnionPivot.rotation.x = baseTrunnion.x + overrides.wrist.pitch;
      if (overrides.wrist.yaw !== undefined) arm.wrist.trunnionPivot.rotation.z = baseTrunnion.z + overrides.wrist.yaw;
      if (overrides.wrist.roll !== undefined) arm.wrist.group.rotation.y = baseWrist.y + overrides.wrist.roll;
      arm.wrist.group.rotation.x = baseWrist.x;
      arm.wrist.group.rotation.z = baseWrist.z;
    } else {
      const wPitch = Math.cos(this.time * 0.55 + timePhase) * 0.022 + breathOffset * 0.08 - lookPitch * 0.02;
      const wRoll = Math.sin(this.time * 0.42 + timePhase) * 0.015 + lookYaw * 0.03;
      const wYaw = Math.cos(this.time * 0.30 + timePhase) * 0.012;
      arm.wrist.trunnionPivot.rotation.x = baseTrunnion.x + wPitch;
      arm.wrist.trunnionPivot.rotation.z = baseTrunnion.z + wYaw;
      arm.wrist.group.rotation.y = baseWrist.y + wRoll;
      arm.wrist.group.rotation.x = baseWrist.x;
      arm.wrist.group.rotation.z = baseWrist.z;
    }

    // 5. Hand Fingers Kinematics (Guarded if arm terminates at wrist interface)
    if (arm.hand && arm.hand.indexFinger) {
      const fingers = [
        arm.hand.indexFinger,
        arm.hand.middleFinger,
        arm.hand.ringFinger,
        arm.hand.littleFinger,
      ];

      fingers.forEach((finger, idx) => {
        if (finger) {
          this.updateFingerKinematics(
            finger,
            idx,
            overrides.fingers ? overrides.fingers[idx] : undefined,
            side,
            timePhase,
            breathOffset
          );
        }
      });
    }

    // 6. Thumb Kinematics
    if (arm.hand && arm.hand.thumb && arm.hand.thumb.proximal) {
      this.updateThumbKinematics(
        arm.hand.thumb,
        overrides.thumb,
        side,
        timePhase,
        breathOffset
      );
    }
  }

  private getInterpolatedFingerTarget(side: -1 | 1, idx: number): FingerPoseTarget {
    const isLeft = side === -1;
    const sideIdx = isLeft ? 0 : 1;
    const activePose = isLeft ? this.activePoseLeft : this.activePoseRight;
    const targetPose = isLeft ? this.targetPoseLeft : this.targetPoseRight;
    const progress = isLeft ? this.poseTransitionLeft : this.poseTransitionRight;

    const fromTarget = HAND_POSES[activePose]?.fingers[idx] ?? HAND_POSES.relaxed.fingers[idx];
    const toTarget = HAND_POSES[targetPose]?.fingers[idx] ?? HAND_POSES.relaxed.fingers[idx];

    if (progress >= 1.0 || activePose === targetPose) {
      return toTarget;
    }

    const s = progress * progress * (3.0 - 2.0 * progress);
    const res = this.fingerTargetPool[sideIdx][idx];
    res.prox = THREE.MathUtils.lerp(fromTarget.prox, toTarget.prox, s);
    res.mid = THREE.MathUtils.lerp(fromTarget.mid, toTarget.mid, s);
    res.dist = THREE.MathUtils.lerp(fromTarget.dist, toTarget.dist, s);
    res.splay = THREE.MathUtils.lerp(fromTarget.splay, toTarget.splay, s);
    return res;
  }

  private getInterpolatedThumbTarget(side: -1 | 1): ThumbPoseTarget {
    const isLeft = side === -1;
    const sideIdx = isLeft ? 0 : 1;
    const activePose = isLeft ? this.activePoseLeft : this.activePoseRight;
    const targetPose = isLeft ? this.targetPoseLeft : this.targetPoseRight;
    const progress = isLeft ? this.poseTransitionLeft : this.poseTransitionRight;

    const fromTarget = HAND_POSES[activePose]?.thumb ?? HAND_POSES.relaxed.thumb;
    const toTarget = HAND_POSES[targetPose]?.thumb ?? HAND_POSES.relaxed.thumb;

    if (progress >= 1.0 || activePose === targetPose) {
      return toTarget;
    }

    const s = progress * progress * (3.0 - 2.0 * progress);
    const res = this.thumbTargetPool[sideIdx];
    res.pitch = THREE.MathUtils.lerp(fromTarget.pitch, toTarget.pitch, s);
    res.yaw = THREE.MathUtils.lerp(fromTarget.yaw, toTarget.yaw, s);
    res.roll = THREE.MathUtils.lerp(fromTarget.roll, toTarget.roll, s);
    res.prox = THREE.MathUtils.lerp(fromTarget.prox, toTarget.prox, s);
    res.dist = THREE.MathUtils.lerp(fromTarget.dist, toTarget.dist, s);
    return res;
  }

  private updateFingerKinematics(
    finger: FingerNodes,
    idx: number,
    override: { proxCurl?: number; midCurl?: number; distCurl?: number; splay?: number } | undefined,
    side: -1 | 1,
    timePhase: number,
    breathOffset: number
  ): void {
    if (!finger || !finger.proximal || !finger.proximal.group) return;
    const radial = -side;

    const target = this.getInterpolatedFingerTarget(side, idx);
    const isTightPose = target.prox > 0.8;
    const microScale = isTightPose ? 0.25 : 1.0;

    // Procedural organic resting micro-motion
    const speed = 0.45 + idx * 0.06;
    const phase = idx * 0.42 + timePhase;
    const amp = (0.006 - idx * 0.001) * microScale;

    const wave =
      Math.sin(this.time * speed + phase) * amp +
      Math.sin(this.time * speed * 2.0 + phase * 0.7) * (amp * 0.25) +
      breathOffset * 0.003 * microScale;

    const addProx = (override?.proxCurl !== undefined ? override.proxCurl : wave * 0.3) * microScale;
    const addMid = (override?.midCurl !== undefined ? override.midCurl : wave * 0.5) * microScale;
    const addDist = (override?.distCurl !== undefined ? override.distCurl : wave * 0.4) * microScale;
    const addSplay = override?.splay !== undefined ? override.splay : Math.sin(this.time * 0.25 + phase) * 0.001 * microScale;

    finger.proximal.group.rotation.x = THREE.MathUtils.clamp(target.prox + addProx, 0, 1.65);
    finger.middle.group.rotation.x = THREE.MathUtils.clamp(target.mid + addMid, 0, 1.65);
    finger.distal.group.rotation.x = THREE.MathUtils.clamp(target.dist + addDist, 0, 1.60);
    finger.proximal.group.rotation.z = radial * (target.splay + addSplay);
  }

  private updateThumbKinematics(
    thumb: ThumbNodes,
    override: { proxCurl?: number; distCurl?: number; splay?: number } | undefined,
    side: -1 | 1,
    timePhase: number,
    breathOffset: number
  ): void {
    if (!thumb || !thumb.proximal || !thumb.proximal.group) return;
    const radial = -side;

    const target = this.getInterpolatedThumbTarget(side);
    const isTightPose = target.prox > 0.5;
    const microScale = isTightPose ? 0.25 : 1.0;

    const wave =
      (Math.cos(this.time * 0.40 + timePhase) * 0.005 +
      Math.sin(this.time * 0.80 + timePhase) * 0.003 +
      breathOffset * 0.002) * microScale;

    const addProx = (override?.proxCurl !== undefined ? override.proxCurl : wave * 0.04) * microScale;
    const addDist = (override?.distCurl !== undefined ? override.distCurl : wave * 0.04) * microScale;
    const addSplay = override?.splay !== undefined ? override.splay : 0;

    thumb.group.rotation.set(
      target.pitch + wave * 0.015,
      -radial * (target.yaw + addSplay * 0.15),
      radial * (target.roll + addSplay)
    );
    thumb.proximal.group.rotation.x = THREE.MathUtils.clamp(target.prox + addProx, 0, 1.55);
    thumb.proximal.group.rotation.z = 0;
    thumb.distal.group.rotation.x = THREE.MathUtils.clamp(target.dist + addDist, 0, 1.55);
    thumb.distal.group.rotation.z = -radial * 0.09;
    if (thumb.middle) thumb.middle.group.rotation.x = THREE.MathUtils.clamp(target.dist + addDist, 0, 1.55);
  }
}


import * as THREE from 'three';
import { ArmPoseAngles, WristOffset } from './AnimationTypes';
import { ANIMATION_CONFIG } from './AnimationConfig';

interface ActiveArmState {
  leftElbow: number;
  rightElbow: number;
  leftUpperPitch: number;
  rightUpperPitch: number;
  leftUpperRoll: number;
  rightUpperRoll: number;
  leftElbowRoll: number;
  rightElbowRoll: number;
}

export class ArmElbowController {
  private currentPoseKey: 'poseA' | 'poseB' | 'poseC' = 'poseA';
  private targetPoseKey: 'poseA' | 'poseB' | 'poseC' = 'poseB';
  private transitionTimer: number = 0;
  private nextTransitionTime: number = 16.0;
  private isTransitioning: boolean = false;
  private transitionProgress: number = 1.0;

  private currentPoseState: ActiveArmState;
  private startPoseState: ActiveArmState;

  // Smoothed output states for elbows and upper arms
  private smoothedLeftElbow: number;
  private smoothedRightElbow: number;
  private smoothedLeftUpperPitch: number;
  private smoothedRightUpperPitch: number;
  private smoothedLeftUpperRoll: number;
  private smoothedRightUpperRoll: number;
  private smoothedLeftElbowRoll: number;
  private smoothedRightElbowRoll: number;

  // Wrist stabilization states
  private leftWristPitch: number = 0;
  private leftWristRoll: number = 0;
  private leftWristYaw: number = 0;
  private rightWristPitch: number = 0;
  private rightWristRoll: number = 0;
  private rightWristYaw: number = 0;

  private result = {
    pose: {
      leftElbowBend: 0,
      rightElbowBend: 0,
      leftUpperPitch: 0,
      rightUpperPitch: 0,
      leftUpperRoll: 0,
      rightUpperRoll: 0,
      leftElbowRoll: 0,
      rightElbowRoll: 0,
    },
    leftWrist: {
      pitch: 0,
      roll: 0,
      yaw: 0,
    },
    rightWrist: {
      pitch: 0,
      roll: 0,
      yaw: 0,
    },
  };

  private copyState(dst: ActiveArmState, src: ActiveArmState): void {
    dst.leftElbow = src.leftElbow;
    dst.rightElbow = src.rightElbow;
    dst.leftUpperPitch = src.leftUpperPitch;
    dst.rightUpperPitch = src.rightUpperPitch;
    dst.leftUpperRoll = src.leftUpperRoll;
    dst.rightUpperRoll = src.rightUpperRoll;
    dst.leftElbowRoll = src.leftElbowRoll;
    dst.rightElbowRoll = src.rightElbowRoll;
  }

  constructor() {
    const pA = ANIMATION_CONFIG.arm.poses.poseA;
    this.currentPoseState = {
      leftElbow: pA.leftElbow,
      rightElbow: pA.rightElbow,
      leftUpperPitch: pA.leftUpperPitch,
      rightUpperPitch: pA.rightUpperPitch,
      leftUpperRoll: pA.leftUpperRoll,
      rightUpperRoll: pA.rightUpperRoll,
      leftElbowRoll: pA.leftElbowRoll,
      rightElbowRoll: pA.rightElbowRoll,
    };
    this.startPoseState = { ...this.currentPoseState };

    this.smoothedLeftElbow = pA.leftElbow;
    this.smoothedRightElbow = pA.rightElbow;
    this.smoothedLeftUpperPitch = pA.leftUpperPitch;
    this.smoothedRightUpperPitch = pA.rightUpperPitch;
    this.smoothedLeftUpperRoll = pA.leftUpperRoll;
    this.smoothedRightUpperRoll = pA.rightUpperRoll;
    this.smoothedLeftElbowRoll = pA.leftElbowRoll;
    this.smoothedRightElbowRoll = pA.rightElbowRoll;

    this.scheduleNextTransition();
  }

  private scheduleNextTransition(): void {
    const cfg = ANIMATION_CONFIG.arm;
    this.nextTransitionTime =
      cfg.poseIntervalMin + Math.random() * (cfg.poseIntervalMax - cfg.poseIntervalMin);
    this.transitionTimer = 0;
  }

  private selectNextPose(): 'poseA' | 'poseB' | 'poseC' {
    const keys: Array<'poseA' | 'poseB' | 'poseC'> = ['poseA', 'poseB', 'poseC'];
    const candidates = keys.filter((k) => k !== this.currentPoseKey);
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  public update(
    dt: number,
    time: number,
    breathOffset: number,
    lookYaw: number,
    lookPitch: number,
    reducedMotion: boolean
  ): {
    pose: ArmPoseAngles;
    leftWrist: WristOffset;
    rightWrist: WristOffset;
  } {
    const cfg = ANIMATION_CONFIG.arm;
    const wristCfg = ANIMATION_CONFIG.wrist;

    // 1. Manage Infrequent S-curve Pose Transitions
    if (!reducedMotion) {
      if (!this.isTransitioning) {
        this.transitionTimer += dt;
        if (this.transitionTimer >= this.nextTransitionTime) {
          this.targetPoseKey = this.selectNextPose();
          this.copyState(this.startPoseState, this.currentPoseState);
          this.isTransitioning = true;
          this.transitionProgress = 0;
        }
      } else {
        this.transitionProgress += dt / cfg.transitionDuration;
        if (this.transitionProgress >= 1.0) {
          this.transitionProgress = 1.0;
          this.isTransitioning = false;
          this.currentPoseKey = this.targetPoseKey;
          this.scheduleNextTransition();
        }

        // Smoothstep / S-curve easing
        const t = this.transitionProgress;
        const ease = t * t * (3 - 2 * t);

        const targetPose = cfg.poses[this.targetPoseKey];
        this.currentPoseState.leftElbow =
          this.startPoseState.leftElbow + (targetPose.leftElbow - this.startPoseState.leftElbow) * ease;
        this.currentPoseState.rightElbow =
          this.startPoseState.rightElbow + (targetPose.rightElbow - this.startPoseState.rightElbow) * ease;
        this.currentPoseState.leftUpperPitch =
          this.startPoseState.leftUpperPitch +
          (targetPose.leftUpperPitch - this.startPoseState.leftUpperPitch) * ease;
        this.currentPoseState.rightUpperPitch =
          this.startPoseState.rightUpperPitch +
          (targetPose.rightUpperPitch - this.startPoseState.rightUpperPitch) * ease;
        this.currentPoseState.leftUpperRoll =
          this.startPoseState.leftUpperRoll +
          (targetPose.leftUpperRoll - this.startPoseState.leftUpperRoll) * ease;
        this.currentPoseState.rightUpperRoll =
          this.startPoseState.rightUpperRoll +
          (targetPose.rightUpperRoll - this.startPoseState.rightUpperRoll) * ease;
        this.currentPoseState.leftElbowRoll =
          this.startPoseState.leftElbowRoll +
          (targetPose.leftElbowRoll - this.startPoseState.leftElbowRoll) * ease;
        this.currentPoseState.rightElbowRoll =
          this.startPoseState.rightElbowRoll +
          (targetPose.rightElbowRoll - this.startPoseState.rightElbowRoll) * ease;
      }
    }

    // 2. Micro-motion and Mechanical Settling for Elbows
    // Layer 4 idle adjustment: gentle symmetrical breathing & look pitch offset
    const elbowIdle = -(Math.sin(time * 0.30) * 0.008 + breathOffset * 0.04 - lookPitch * 0.02);

    const targetLeftElbow = THREE.MathUtils.clamp(
      this.currentPoseState.leftElbow + elbowIdle,
      -0.85, // ~ -48.7° maximum natural flexion
      -0.45  // ~ -25.8° minimum natural flexion
    );
    const targetRightElbow = THREE.MathUtils.clamp(
      this.currentPoseState.rightElbow + elbowIdle,
      -0.85,
      -0.45
    );

    // Damped interpolation for mechanical inertia
    const damp = 1.0 - Math.exp(-5.0 * dt);
    this.smoothedLeftElbow += (targetLeftElbow - this.smoothedLeftElbow) * damp;
    this.smoothedRightElbow += (targetRightElbow - this.smoothedRightElbow) * damp;

    // Elbow roll (inward angle) settling
    const targetLeftElbowRoll = this.currentPoseState.leftElbowRoll;
    const targetRightElbowRoll = this.currentPoseState.rightElbowRoll;
    this.smoothedLeftElbowRoll += (targetLeftElbowRoll - this.smoothedLeftElbowRoll) * damp;
    this.smoothedRightElbowRoll += (targetRightElbowRoll - this.smoothedRightElbowRoll) * damp;

    // Upper Arm follow-through (symmetrically mirrored around centerline)
    const armFollowYaw = lookYaw * 0.035;
    const targetLeftPitch = this.currentPoseState.leftUpperPitch + breathOffset * 0.05;
    const targetRightPitch = this.currentPoseState.rightUpperPitch + breathOffset * 0.05;
    const targetLeftRoll = this.currentPoseState.leftUpperRoll - armFollowYaw * 0.5;
    const targetRightRoll = this.currentPoseState.rightUpperRoll + armFollowYaw * 0.5;

    this.smoothedLeftUpperPitch += (targetLeftPitch - this.smoothedLeftUpperPitch) * damp;
    this.smoothedRightUpperPitch += (targetRightPitch - this.smoothedRightUpperPitch) * damp;
    this.smoothedLeftUpperRoll += (targetLeftRoll - this.smoothedLeftUpperRoll) * damp;
    this.smoothedRightUpperRoll += (targetRightRoll - this.smoothedRightUpperRoll) * damp;

    // 3. Wrist Stabilization & Micro-reaction (±2-5°)
    const wSmooth = 1.0 - Math.exp(-wristCfg.damping * dt);

    const wristPitchOsc = Math.sin(time * 0.38) * 0.012 + breathOffset * 0.05 - lookPitch * wristCfg.cursorReactFactor;
    const wristRollOsc = Math.sin(time * 0.32) * 0.008;
    const wristYawOsc = Math.cos(time * 0.26) * 0.006;

    const targetLeftWPitch = THREE.MathUtils.clamp(wristPitchOsc, -wristCfg.pitchLimit, wristCfg.pitchLimit);
    const targetRightWPitch = targetLeftWPitch;

    const targetLeftWRoll = THREE.MathUtils.clamp(wristRollOsc - lookYaw * wristCfg.cursorReactFactor, -wristCfg.rollLimit, wristCfg.rollLimit);
    const targetRightWRoll = THREE.MathUtils.clamp(-wristRollOsc + lookYaw * wristCfg.cursorReactFactor, -wristCfg.rollLimit, wristCfg.rollLimit);

    const targetLeftWYaw = THREE.MathUtils.clamp(wristYawOsc, -wristCfg.yawLimit, wristCfg.yawLimit);
    const targetRightWYaw = THREE.MathUtils.clamp(-wristYawOsc, -wristCfg.yawLimit, wristCfg.yawLimit);

    this.leftWristPitch += (targetLeftWPitch - this.leftWristPitch) * wSmooth;
    this.leftWristRoll += (targetLeftWRoll - this.leftWristRoll) * wSmooth;
    this.leftWristYaw += (targetLeftWYaw - this.leftWristYaw) * wSmooth;

    this.rightWristPitch += (targetRightWPitch - this.rightWristPitch) * wSmooth;
    this.rightWristRoll += (targetRightWRoll - this.rightWristRoll) * wSmooth;
    this.rightWristYaw += (targetRightWYaw - this.rightWristYaw) * wSmooth;

    const res = this.result;
    const p = res.pose;
    p.leftElbowBend = this.smoothedLeftElbow;
    p.rightElbowBend = this.smoothedRightElbow;
    p.leftUpperPitch = this.smoothedLeftUpperPitch;
    p.rightUpperPitch = this.smoothedRightUpperPitch;
    p.leftUpperRoll = this.smoothedLeftUpperRoll;
    p.rightUpperRoll = this.smoothedRightUpperRoll;
    p.leftElbowRoll = this.smoothedLeftElbowRoll;
    p.rightElbowRoll = this.smoothedRightElbowRoll;

    const lw = res.leftWrist;
    lw.pitch = this.leftWristPitch;
    lw.roll = this.leftWristRoll;
    lw.yaw = this.leftWristYaw;

    const rw = res.rightWrist;
    rw.pitch = this.rightWristPitch;
    rw.roll = this.rightWristRoll;
    rw.yaw = this.rightWristYaw;

    return res;
  }
}

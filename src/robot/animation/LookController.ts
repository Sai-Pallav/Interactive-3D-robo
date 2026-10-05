import * as THREE from 'three';
import { NormalizedInputState, HierarchicalGazeAngles } from './AnimationTypes';
import { ANIMATION_CONFIG } from './AnimationConfig';
import { ROBOT_ROTATION } from '../config';

/**
 * Symmetric soft-knee compression curve (C1 continuous):
 * - Exactly linear 1:1 up to knee threshold
 * - Smoothly approaches max limit using tanh beyond knee with zero jerk or mechanical snapping
 */
function softKnee(angle: number, knee: number, max: number): number {
  const sign = Math.sign(angle);
  const abs = Math.abs(angle);
  if (abs <= knee) return angle;
  const excess = abs - knee;
  const range = max - knee;
  if (range <= 0.0001) return sign * max;
  return sign * (knee + range * Math.tanh(excess / range));
}

/**
 * Asymmetric soft-knee compression curve for pitch (head can pitch down more than up):
 */
function softKneeAsymmetric(
  angle: number,
  kneeNeg: number,
  maxNeg: number,
  kneePos: number,
  maxPos: number
): number {
  if (angle < 0) {
    const abs = -angle;
    if (abs <= kneeNeg) return angle;
    const excess = abs - kneeNeg;
    const range = maxNeg - kneeNeg;
    if (range <= 0.0001) return -maxNeg;
    return -(kneeNeg + range * Math.tanh(excess / range));
  } else {
    if (angle <= kneePos) return angle;
    const excess = angle - kneePos;
    const range = maxPos - kneePos;
    if (range <= 0.0001) return maxPos;
    return kneePos + range * Math.tanh(excess / range);
  }
}

export class LookController {
  // Current smoothed kinematic state
  private currentYaw: number = -ROBOT_ROTATION.yaw; // Start initialized facing camera forward
  private currentPitch: number = (12.6 * Math.PI) / 180;
  private currentRoll: number = 0;

  // Context for true 3D spatial unprojection
  private camera?: THREE.Camera;
  private container?: HTMLElement;
  private headNode?: THREE.Object3D;
  private neckParentNode?: THREE.Object3D;

  // Real-time cursor state
  private clientX: number = 0;
  private clientY: number = 0;
  private hasPointer: boolean = false;
  private isHovered: boolean = false;
  private speed: number = 0;

  // Virtual gaze plane in front of the robot (in world units)
  private readonly targetPlaneZ: number = 0.85;

  // Pre-allocated scratch objects for zero runtime garbage collection
  private tempRayOrigin = new THREE.Vector3();
  private tempTargetPt = new THREE.Vector3();
  private tempRayDir = new THREE.Vector3();
  private tempHeadPos = new THREE.Vector3();
  private tempDirWorld = new THREE.Vector3();
  private tempDirLocal = new THREE.Vector3();
  private tempParentQuat = new THREE.Quaternion();
  private tempInvParentQuat = new THREE.Quaternion();

  private resultAngles: HierarchicalGazeAngles = {
    headYaw: 0,
    headPitch: 0,
    headRoll: 0,
    neckYaw: 0,
    neckPitch: 0,
    chestYaw: 0,
    chestPitch: 0,
    shouldersYaw: 0,
    waistYaw: 0,
    waistPitch: 0,
  };

  private cachedRect: DOMRect | null = null;
  private boundUpdateRect = () => {
    if (this.container) {
      this.cachedRect = this.container.getBoundingClientRect();
    }
  };

  /**
   * Registers the 3D scene camera and container element to enable 100% physically accurate
   * 3D raycast gaze tracking.
   */
  public setRaycastContext(
    camera: THREE.Camera,
    container: HTMLElement,
    head: THREE.Object3D,
    neckParent?: THREE.Object3D
  ): void {
    this.camera = camera;
    this.container = container;
    this.headNode = head;
    this.neckParentNode = neckParent;
    this.cachedRect = container.getBoundingClientRect();
    window.addEventListener('resize', this.boundUpdateRect, { passive: true });
    window.addEventListener('scroll', this.boundUpdateRect, { passive: true });
  }

  /**
   * Updates real-time viewport client coordinates from pointer events.
   */
  public setPointerTarget(
    clientX: number,
    clientY: number,
    isHovered: boolean,
    speed: number = 0
  ): void {
    this.clientX = clientX;
    this.clientY = clientY;
    this.hasPointer = isHovered;
    this.isHovered = isHovered;
    this.speed = speed;
  }

  public update(input: NormalizedInputState, dt: number): HierarchicalGazeAngles {
    const cfg = ANIMATION_CONFIG.look;
    const motionScale = input.reducedMotion ? ANIMATION_CONFIG.reducedMotion.scale : 1.0;

    // Sync input state if provided from external caller
    if (input.hasPointer !== undefined) {
      this.hasPointer = input.hasPointer;
    }
    if (input.clientX !== undefined && input.clientY !== undefined) {
      this.clientX = input.clientX;
      this.clientY = input.clientY;
    }
    if (input.isHovered !== undefined) {
      this.isHovered = input.isHovered;
    }
    if (input.speed !== undefined) {
      this.speed = input.speed;
    }

    let rawYaw = 0;
    let rawPitch = 0;

    const idleYaw = -ROBOT_ROTATION.yaw; // ~+10° local yaw cancels root's -10° yaw

    // 1. Compute target angles via 3D Raycasting or fallback 2D mapping
    if (this.camera && this.container && this.headNode) {
      this.headNode.getWorldPosition(this.tempHeadPos);

      const parentObj = this.neckParentNode || this.headNode.parent?.parent || this.headNode.parent;
      if (parentObj) {
        parentObj.getWorldQuaternion(this.tempParentQuat);
      } else {
        this.tempParentQuat.identity();
      }
      this.tempInvParentQuat.copy(this.tempParentQuat).invert();

      if (this.isHovered && this.hasPointer && !input.reducedMotion) {
        // True 3D raycast unprojection through camera viewport (cached rect prevents layout thrashing)
        if (!this.cachedRect) {
          this.cachedRect = this.container.getBoundingClientRect();
        }
        const rect = this.cachedRect;
        const ndcX = ((this.clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -(((this.clientY - rect.top) / rect.height) * 2 - 1);

        this.tempRayOrigin.copy(this.camera.position);
        this.tempTargetPt.set(ndcX, ndcY, 0.5).unproject(this.camera);
        this.tempRayDir.copy(this.tempTargetPt).sub(this.tempRayOrigin).normalize();

        // Intersect ray with target depth plane
        const t = (this.targetPlaneZ - this.tempRayOrigin.z) / this.tempRayDir.z;
        this.tempTargetPt.copy(this.tempRayOrigin).addScaledVector(this.tempRayDir, t);

        // Compute gaze direction in local joint space
        this.tempDirWorld.copy(this.tempTargetPt).sub(this.tempHeadPos).normalize();
        this.tempDirLocal.copy(this.tempDirWorld).applyQuaternion(this.tempInvParentQuat);

        rawYaw = Math.atan2(this.tempDirLocal.x, this.tempDirLocal.z);
        rawPitch = Math.atan2(
          -this.tempDirLocal.y,
          Math.sqrt(this.tempDirLocal.x * this.tempDirLocal.x + this.tempDirLocal.z * this.tempDirLocal.z)
        );
      } else {
        // Natural eye-contact with user: look directly at camera lens
        this.tempDirWorld.copy(this.camera.position).sub(this.tempHeadPos).normalize();
        this.tempDirLocal.copy(this.tempDirWorld).applyQuaternion(this.tempInvParentQuat);

        rawYaw = Math.atan2(this.tempDirLocal.x, this.tempDirLocal.z);
        rawPitch = Math.atan2(
          -this.tempDirLocal.y,
          Math.sqrt(this.tempDirLocal.x * this.tempDirLocal.x + this.tempDirLocal.z * this.tempDirLocal.z)
        );
      }
    } else {
      // Offline fallback: symmetrical calibrated normalized mapping
      const basePitchOffset = (12.0 * Math.PI) / 180;
      rawYaw = idleYaw + input.targetX * (cfg.headYawLimit * 0.95);
      rawPitch = basePitchOffset - input.targetY * (cfg.headPitchLimit * 0.85);
    }

    // 2. Cursor Speed Anticipation Boost (smooth, clamped)
    let speedBoost = 0;
    if (this.speed > cfg.speedThreshold && !input.reducedMotion) {
      speedBoost = Math.min((this.speed - cfg.speedThreshold) * cfg.speedAnticipation, 0.08);
    }

    // 3. Soft-knee Sigmoidal Clamping
    const maxYaw = (cfg.headYawLimit + speedBoost) * motionScale;
    const clampedYaw = softKnee(rawYaw, cfg.yawKnee * motionScale, maxYaw);
    const clampedPitch = softKneeAsymmetric(
      rawPitch,
      cfg.pitchUpKnee * motionScale,
      cfg.headPitchUpLimit * motionScale,
      cfg.pitchDownKnee * motionScale,
      cfg.headPitchLimit * motionScale
    );

    // Natural lateral head tilt (roll)
    const targetRoll = Math.max(
      -cfg.headRollLimit,
      Math.min(cfg.headRollLimit, (clampedYaw - idleYaw) * 0.10)
    );

    // 4. Critically Damped Smoothing (Eliminates jitter and mechanical snaps)
    const damp = cfg.headDamping;
    const dampFactor = 1.0 - Math.exp(-damp * dt);

    this.currentYaw += (clampedYaw - this.currentYaw) * dampFactor;
    this.currentPitch += (clampedPitch - this.currentPitch) * dampFactor;
    this.currentRoll += (targetRoll - this.currentRoll) * dampFactor;

    // 5. Exact Hierarchical Look Distribution:
    // Head (72%), Neck (22%), Chest (6%) -> Exact 100% sum!
    const pitchSum = cfg.headRatio + cfg.neckRatio + cfg.chestRatio;
    const headPitchRatio = cfg.headRatio / pitchSum;
    const neckPitchRatio = cfg.neckRatio / pitchSum;
    const chestPitchRatio = cfg.chestRatio / pitchSum;

    // Relative yaw displacement from idle forward orientation for torso reaction
    const yawDeltaFromIdle = this.currentYaw - idleYaw;

    const res = this.resultAngles;
    res.headYaw = this.currentYaw * cfg.headRatio;
    res.headPitch = this.currentPitch * headPitchRatio;
    res.headRoll = this.currentRoll * 0.70;

    res.neckYaw = this.currentYaw * cfg.neckRatio;
    res.neckPitch = this.currentPitch * neckPitchRatio;

    res.chestYaw = this.currentYaw * cfg.chestRatio;
    res.chestPitch = this.currentPitch * chestPitchRatio;

    res.shouldersYaw = yawDeltaFromIdle * cfg.shouldersRatio;
    res.waistYaw = yawDeltaFromIdle * cfg.waistRatio;
    res.waistPitch = this.currentPitch * cfg.waistRatio;

    return res;
  }

  public getCurrentHeadYaw(): number {
    return this.currentYaw;
  }

  public getCurrentHeadPitch(): number {
    return this.currentPitch;
  }

  public dispose(): void {
    window.removeEventListener('resize', this.boundUpdateRect);
    window.removeEventListener('scroll', this.boundUpdateRect);
  }
}

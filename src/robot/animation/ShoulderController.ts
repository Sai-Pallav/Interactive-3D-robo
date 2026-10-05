import { ShoulderOffset } from './AnimationTypes';
import { ANIMATION_CONFIG } from './AnimationConfig';

export class ShoulderController {
  private currentLeftPitch: number = 0;
  private currentLeftYaw: number = 0;
  private currentLeftRoll: number = 0;
  private currentLeftPosY: number = 0;

  private currentRightPitch: number = 0;
  private currentRightYaw: number = 0;
  private currentRightRoll: number = 0;
  private currentRightPosY: number = 0;

  private result: ShoulderOffset = {
    leftPitch: 0,
    leftYaw: 0,
    leftRoll: 0,
    leftPosY: 0,
    rightPitch: 0,
    rightYaw: 0,
    rightRoll: 0,
    rightPosY: 0,
  };

  public update(headYaw: number, headPitch: number, dt: number, breathOffset: number): ShoulderOffset {
    const cfg = ANIMATION_CONFIG.shoulder;
    const smooth = 1.0 - Math.exp(-cfg.smoothing * dt);

    // Asymmetric Mechanical Articulation:
    // When cursor/head moves RIGHT (headYaw > 0):
    // - Left shoulder: shifts slightly backward in Z, dips slightly down in Y (-pitch, -Y)
    // - Right shoulder: shifts slightly forward in Z, raises slightly up in Y (+pitch, +Y)
    // When cursor/head moves LEFT (headYaw < 0):
    // - Left shoulder: shifts slightly forward in Z, raises slightly up in Y
    // - Right shoulder: shifts slightly backward in Z, dips slightly down in Y

    const targetLeftPitch = -headYaw * cfg.pitchFactor;
    const targetLeftYaw = headYaw * cfg.yawFactor;
    const targetLeftRoll = -0.02 - headYaw * cfg.zReaction * 0.5;
    const targetLeftPosY = breathOffset * 0.16 - headYaw * 0.003;

    const targetRightPitch = headYaw * cfg.pitchFactor;
    const targetRightYaw = headYaw * cfg.yawFactor;
    const targetRightRoll = 0.02 - headYaw * cfg.zReaction * 0.5;
    const targetRightPosY = breathOffset * 0.15 + headYaw * 0.003;

    // Smooth mechanical interpolation (prevents armor detachment and jitter)
    this.currentLeftPitch += (targetLeftPitch - this.currentLeftPitch) * smooth;
    this.currentLeftYaw += (targetLeftYaw - this.currentLeftYaw) * smooth;
    this.currentLeftRoll += (targetLeftRoll - this.currentLeftRoll) * smooth;
    this.currentLeftPosY += (targetLeftPosY - this.currentLeftPosY) * smooth;

    this.currentRightPitch += (targetRightPitch - this.currentRightPitch) * smooth;
    this.currentRightYaw += (targetRightYaw - this.currentRightYaw) * smooth;
    this.currentRightRoll += (targetRightRoll - this.currentRightRoll) * smooth;
    this.currentRightPosY += (targetRightPosY - this.currentRightPosY) * smooth;

    const res = this.result;
    res.leftPitch = this.currentLeftPitch;
    res.leftYaw = this.currentLeftYaw;
    res.leftRoll = this.currentLeftRoll;
    res.leftPosY = this.currentLeftPosY;
    res.rightPitch = this.currentRightPitch;
    res.rightYaw = this.currentRightYaw;
    res.rightRoll = this.currentRightRoll;
    res.rightPosY = this.currentRightPosY;

    return res;
  }
}

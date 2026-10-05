import { HierarchicalGazeAngles, WaistSuspensionOffsets } from './AnimationTypes';
import { ANIMATION_CONFIG } from './AnimationConfig';

export class TorsoWaistController {
  // Smoothed chest output
  private currentChestPitch: number = 0;
  private currentChestYaw: number = 0;
  private currentChestRoll: number = 0;

  // Smoothed waist output
  private currentWaistPitch: number = 0;
  private currentWaistYaw: number = 0;
  private currentWaistRoll: number = 0;

  // Abdominal segment offsets
  private segmentPitches: number[] = [0, 0, 0, 0, 0];

  private result = {
    chestPitch: 0,
    chestYaw: 0,
    chestRoll: 0,
    waistOffsets: {
      segment01Pitch: 0,
      segment02Pitch: 0,
      segment03Pitch: 0,
      segment04Pitch: 0,
      segment05Pitch: 0,
      waistPivotPitch: 0,
      waistPivotYaw: 0,
      waistPivotRoll: 0,
    },
  };

  public update(
    gaze: HierarchicalGazeAngles,
    time: number,
    dt: number,
    breathOffset: number,
    reducedMotion: boolean
  ): {
    chestPitch: number;
    chestYaw: number;
    chestRoll: number;
    waistOffsets: WaistSuspensionOffsets;
  } {
    const cfg = ANIMATION_CONFIG.waist;
    const motionScale = reducedMotion ? ANIMATION_CONFIG.reducedMotion.scale : 1.0;

    // 1. CHEST MICRO-MOVEMENT (Section 12)
    // Idle slow micro-adjustment + cursor hierarchical follow (chestYaw, chestPitch)
    const chestIdlePitch = Math.sin(time * 0.36) * 0.005 + breathOffset * 0.04;
    const chestIdleYaw = Math.cos(time * 0.28) * 0.004;
    const chestIdleRoll = Math.sin(time * 0.32 + 0.6) * 0.003;

    const targetChestPitch = (gaze.chestPitch + chestIdlePitch) * motionScale;
    const targetChestYaw = (gaze.chestYaw + chestIdleYaw) * motionScale;
    const targetChestRoll = (-gaze.chestYaw * 0.08 + chestIdleRoll) * motionScale;

    // Damping (smooth, eliminating wobble)
    const chestDamp = 1.0 - Math.exp(-4.8 * dt);
    this.currentChestPitch += (targetChestPitch - this.currentChestPitch) * chestDamp;
    this.currentChestYaw += (targetChestYaw - this.currentChestYaw) * chestDamp;
    this.currentChestRoll += (targetChestRoll - this.currentChestRoll) * chestDamp;

    // 2. ABDOMEN MECHANICAL SUSPENSION (Section 13)
    // Segment offsets:
    // Upper segment: +0.5° (0.0087 rad)
    // Middle segment: +0.3° (0.0052 rad)
    // Lower segment: -0.2° (-0.0035 rad)
    // Lower waist:   -0.3° (-0.0052 rad)
    // Different phases across segments create a true suspension flexure
    const s0 = (Math.sin(time * cfg.cycleSpeed) * cfg.upperSegmentPitch) * motionScale;
    const s1 = (Math.sin(time * cfg.cycleSpeed + 0.45) * cfg.middleSegmentPitch) * motionScale;
    const s2 = (Math.sin(time * cfg.cycleSpeed + 0.90) * (cfg.middleSegmentPitch * 0.5)) * motionScale;
    const s3 = (Math.sin(time * cfg.cycleSpeed + 1.35) * cfg.lowerSegmentPitch) * motionScale;
    const s4 = (Math.sin(time * cfg.cycleSpeed + 1.80) * cfg.waistRingPitch) * motionScale;

    const segDamp = 1.0 - Math.exp(-5.5 * dt);
    this.segmentPitches[0] += (s0 - this.segmentPitches[0]) * segDamp;
    this.segmentPitches[1] += (s1 - this.segmentPitches[1]) * segDamp;
    this.segmentPitches[2] += (s2 - this.segmentPitches[2]) * segDamp;
    this.segmentPitches[3] += (s3 - this.segmentPitches[3]) * segDamp;
    this.segmentPitches[4] += (s4 - this.segmentPitches[4]) * segDamp;

    // 3. WAIST MECHANICAL SETTLING (Section 14)
    const targetWaistPitch = (gaze.waistPitch + s4 * 0.8) * motionScale;
    const targetWaistYaw = (gaze.waistYaw + Math.sin(time * 0.22) * 0.002) * motionScale;
    const targetWaistRoll = (-gaze.waistYaw * 0.05) * motionScale;

    const waistDamp = 1.0 - Math.exp(-3.8 * dt);
    this.currentWaistPitch += (targetWaistPitch - this.currentWaistPitch) * waistDamp;
    this.currentWaistYaw += (targetWaistYaw - this.currentWaistYaw) * waistDamp;
    this.currentWaistRoll += (targetWaistRoll - this.currentWaistRoll) * waistDamp;

    const res = this.result;
    res.chestPitch = this.currentChestPitch;
    res.chestYaw = this.currentChestYaw;
    res.chestRoll = this.currentChestRoll;

    const w = res.waistOffsets;
    w.segment01Pitch = this.segmentPitches[0];
    w.segment02Pitch = this.segmentPitches[1];
    w.segment03Pitch = this.segmentPitches[2];
    w.segment04Pitch = this.segmentPitches[3];
    w.segment05Pitch = this.segmentPitches[4];
    w.waistPivotPitch = this.currentWaistPitch;
    w.waistPivotYaw = this.currentWaistYaw;
    w.waistPivotRoll = this.currentWaistRoll;

    return res;
  }
}

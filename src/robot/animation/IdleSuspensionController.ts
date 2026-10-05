import { IdleSuspensionState } from './AnimationTypes';
import { ANIMATION_CONFIG } from './AnimationConfig';

export class IdleSuspensionController {
  private smoothedFloatingY: number = 0;
  private smoothedFloatingPitch: number = 0;
  private smoothedFloatingRoll: number = 0;

  private smoothedTorsoMicroPitch: number = 0;
  private smoothedTorsoMicroYaw: number = 0;

  private result: IdleSuspensionState = {
    floatingY: 0,
    floatingPitch: 0,
    floatingRoll: 0,
    torsoMicroPitch: 0,
    torsoMicroYaw: 0,
  };

  public update(
    time: number,
    dt: number,
    reducedMotion: boolean
  ): IdleSuspensionState {
    const cfg = ANIMATION_CONFIG.floating;

    if (reducedMotion && ANIMATION_CONFIG.reducedMotion.disableFloating) {
      const settleDamp = 1.0 - Math.exp(-3.0 * dt);
      this.smoothedFloatingY += (0 - this.smoothedFloatingY) * settleDamp;
      this.smoothedFloatingPitch += (0 - this.smoothedFloatingPitch) * settleDamp;
      this.smoothedFloatingRoll += (0 - this.smoothedFloatingRoll) * settleDamp;
      this.smoothedTorsoMicroPitch += (0 - this.smoothedTorsoMicroPitch) * settleDamp;
      this.smoothedTorsoMicroYaw += (0 - this.smoothedTorsoMicroYaw) * settleDamp;

      const res = this.result;
      res.floatingY = this.smoothedFloatingY;
      res.floatingPitch = this.smoothedFloatingPitch;
      res.floatingRoll = this.smoothedFloatingRoll;
      res.torsoMicroPitch = this.smoothedTorsoMicroPitch;
      res.torsoMicroYaw = this.smoothedTorsoMicroYaw;
      return res;
    }

    // LAYER 1: Floating Suspension Motion (Section 16)
    // Very slow harmonic sine curve (~9.2s period), range ±0.0065 world units
    const rawFloatingY = Math.sin(time * cfg.speed) * cfg.amplitude;
    const rawFloatingPitch = Math.cos(time * cfg.speed * 0.85) * cfg.tiltAmplitude;
    const rawFloatingRoll = Math.sin(time * cfg.speed * 0.70 + 1.2) * (cfg.tiltAmplitude * 0.6);

    // LAYER 2: Micro Torso Stabilization (asynchronous phase)
    const rawTorsoMicroPitch = Math.sin(time * 0.38 + 2.1) * 0.003;
    const rawTorsoMicroYaw = Math.cos(time * 0.29 + 0.7) * 0.0025;

    // Critically damped smoothing to guarantee rock-solid stabilization
    const damp = 1.0 - Math.exp(-4.0 * dt);
    this.smoothedFloatingY += (rawFloatingY - this.smoothedFloatingY) * damp;
    this.smoothedFloatingPitch += (rawFloatingPitch - this.smoothedFloatingPitch) * damp;
    this.smoothedFloatingRoll += (rawFloatingRoll - this.smoothedFloatingRoll) * damp;

    this.smoothedTorsoMicroPitch += (rawTorsoMicroPitch - this.smoothedTorsoMicroPitch) * damp;
    this.smoothedTorsoMicroYaw += (rawTorsoMicroYaw - this.smoothedTorsoMicroYaw) * damp;

    const res = this.result;
    res.floatingY = this.smoothedFloatingY;
    res.floatingPitch = this.smoothedFloatingPitch;
    res.floatingRoll = this.smoothedFloatingRoll;
    res.torsoMicroPitch = this.smoothedTorsoMicroPitch;
    res.torsoMicroYaw = this.smoothedTorsoMicroYaw;
    return res;
  }
}

import * as THREE from 'three';
import { ANIMATION_CONFIG } from './AnimationConfig';

export class EmissiveController {
  private currentIntensity: number = ANIMATION_CONFIG.emissive.baseIntensity;
  private nextBlinkTime: number = 4.5;
  private isBlinking: boolean = false;
  private blinkProgress: number = 1.0;

  constructor() {
    this.scheduleNextBlink(0);
  }

  private scheduleNextBlink(currentTime: number): void {
    const cfg = ANIMATION_CONFIG.blink;
    this.nextBlinkTime =
      currentTime + cfg.intervalMin + Math.random() * (cfg.intervalMax - cfg.intervalMin);
  }

  public update(
    time: number,
    dt: number,
    interactionIntensity: number,
    reducedMotion: boolean,
    materials: any,
    eyeLeft: THREE.Object3D,
    eyeRight: THREE.Object3D,
    visorLightBar: THREE.Object3D
  ): void {
    const cfg = ANIMATION_CONFIG.emissive;
    const blinkCfg = ANIMATION_CONFIG.blink;

    // 1. Interactive Emissive Intensity (Section 18 & 19)
    // Subtly intensifies from base (2.2) up to active (2.65) proportional to cursor speed & intensity
    const intensityTarget = reducedMotion
      ? cfg.baseIntensity
      : cfg.baseIntensity + interactionIntensity * (cfg.activeIntensity - cfg.baseIntensity);

    const smoothFactor = 1.0 - Math.exp(-cfg.responseSpeed * dt);
    this.currentIntensity += (intensityTarget - this.currentIntensity) * smoothFactor;

    // Subtle gentle pulse
    const pulse = 1.0 + Math.sin(time * cfg.pulseSpeed) * (cfg.pulseAmplitude * 0.12);
    const finalIntensity = this.currentIntensity * pulse;

    if (materials) {
      if (materials.chestGlow && 'emissiveIntensity' in materials.chestGlow) {
        materials.chestGlow.emissiveIntensity = finalIntensity * 1.25;
      }
      if (materials.earRingGlow && 'emissiveIntensity' in materials.earRingGlow) {
        materials.earRingGlow.emissiveIntensity = finalIntensity * 1.1;
      }
      if (materials.eyeGlow && 'emissiveIntensity' in materials.eyeGlow) {
        materials.eyeGlow.emissiveIntensity = finalIntensity;
      }
      if (materials.accentGlow && 'emissiveIntensity' in materials.accentGlow) {
        materials.accentGlow.emissiveIntensity = finalIntensity * 0.9;
      }
    }

    // 2. Eye Blink System
    if (time >= this.nextBlinkTime && !this.isBlinking) {
      this.isBlinking = true;
      this.blinkProgress = 0;
    }

    if (this.isBlinking) {
      this.blinkProgress += dt / blinkCfg.duration;
      if (this.blinkProgress >= 1.0) {
        this.blinkProgress = 1.0;
        this.isBlinking = false;
        this.scheduleNextBlink(time);
      }

      const dip = 1.0 - (1.0 - 0.08) * (1.0 - Math.abs(this.blinkProgress * 2 - 1));
      if (eyeLeft) eyeLeft.scale.y = dip;
      if (eyeRight) eyeRight.scale.y = dip;
      if (visorLightBar) visorLightBar.scale.y = Math.max(0.2, dip);
    } else {
      if (eyeLeft) eyeLeft.scale.y = 1.0;
      if (eyeRight) eyeRight.scale.y = 1.0;
      if (visorLightBar) visorLightBar.scale.y = 1.0;
    }
  }
}

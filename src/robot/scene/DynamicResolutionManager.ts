import * as THREE from 'three';

export interface DRSConfig {
  enabled?: boolean;
  minPixelRatio?: number;
  maxPixelRatio?: number;
  targetFrameTimeMs?: number;
  scaleDownThresholdMs?: number;
  scaleUpThresholdMs?: number;
  sampleWindowSize?: number;
  cooldownPeriodMs?: number;
  startupGracePeriodMs?: number;
  stepSize?: number;
}

export interface DRSStats {
  enabled: boolean;
  isForced: boolean;
  currentPixelRatio: number;
  targetPixelRatio: number;
  minPixelRatio: number;
  maxPixelRatio: number;
  avgFrameTimeMs: number;
  sampleCount: number;
  adjustmentsCount: number;
  isUnderPressure: boolean;
  lastAdjustmentTime: number;
}

/**
 * DynamicResolutionManager
 *
 * Adaptive GPU Resolution Controller for Three.js WebGL humanoid robot rendering.
 *
 * Core principles:
 * - Isolated from robot kinematics, controller, materials, and geometry.
 * - Controls ONLY the renderer pixel ratio / drawing buffer resolution.
 * - Respects strict minimum and maximum DPR limits (visual quality floor & production cap).
 * - Low-frequency controller with hysteresis deadband to prevent oscillation / pumping.
 * - Zero per-frame heap allocations (pre-allocated ring buffer).
 * - Startup grace period ensures initial asset and shader compilation do not cause false downscales.
 */
export class DynamicResolutionManager {
  private renderer: THREE.WebGLRenderer;

  private enabled: boolean = true;
  private forcedPixelRatio: number | null = null;

  private minPixelRatio: number = 0.85;
  private maxPixelRatio: number = 2.00;
  private currentPixelRatio: number = 1.0;

  // Hysteresis frame time thresholds (ms)
  private readonly targetFrameTimeMs: number = 16.67; // 60 FPS
  private readonly scaleDownThresholdMs: number = 18.20; // < ~55 FPS (frame drops detected)
  private readonly stableFrameTimeCapMs: number = 16.90; // Solid 60 FPS on VSync-locked displays
  private readonly stableWindowsRequiredForUpscale: number = 2; // ~2-3s of sustained 60 FPS

  // Controller frequency & timing
  private readonly sampleWindowSize: number = 60; // 60 frames ~ 1.0s at 60fps
  private readonly cooldownPeriodMs: number = 2000; // 2.0s settling time after adjustment
  private readonly startupGracePeriodMs: number = 2500; // 2.5s ignore window on boot
  private readonly stepSize: number = 0.10;

  // Pre-allocated ring buffer for zero-garbage metric tracking
  private sampleBuffer: Float64Array;
  private sampleIndex: number = 0;
  private sampleCount: number = 0;
  private sampleSum: number = 0;
  private stableWindowsCount: number = 0;

  private startTime: number = performance.now();
  private lastAdjustmentTime: number = 0;
  private adjustmentsCount: number = 0;
  private isUnderPressure: boolean = false;

  constructor(renderer: THREE.WebGLRenderer, initialPixelRatio?: number, config?: DRSConfig) {
    this.renderer = renderer;

    const initDpr = initialPixelRatio ?? this.renderer.getPixelRatio() ?? 1.0;
    this.maxPixelRatio = Math.max(initDpr, 2.0);

    if (config) {
      if (typeof config.enabled === 'boolean') this.enabled = config.enabled;
      if (typeof config.minPixelRatio === 'number') this.minPixelRatio = Math.max(0.5, config.minPixelRatio);
      if (typeof config.maxPixelRatio === 'number') this.maxPixelRatio = Math.min(3.0, config.maxPixelRatio);
      if (typeof config.scaleDownThresholdMs === 'number') (this as any).scaleDownThresholdMs = config.scaleDownThresholdMs;
      if (typeof config.sampleWindowSize === 'number') (this as any).sampleWindowSize = Math.max(10, config.sampleWindowSize);
      if (typeof config.cooldownPeriodMs === 'number') (this as any).cooldownPeriodMs = config.cooldownPeriodMs;
      if (typeof config.startupGracePeriodMs === 'number') (this as any).startupGracePeriodMs = config.startupGracePeriodMs;
      if (typeof config.stepSize === 'number') (this as any).stepSize = config.stepSize;
    }

    this.currentPixelRatio = Math.min(Math.max(initDpr, this.minPixelRatio), this.maxPixelRatio);
    this.currentPixelRatio = Math.round(this.currentPixelRatio * 100) / 100;

    this.sampleBuffer = new Float64Array(this.sampleWindowSize);
    this.startTime = performance.now();
    this.lastAdjustmentTime = this.startTime;

    // Synchronize initial pixel ratio with renderer
    this.renderer.setPixelRatio(this.currentPixelRatio);
  }

  /**
   * Called once per frame in the main render loop.
   * Records frame duration and evaluates scaling decisions at low frequency.
   *
   * @param dtMs - Delta time of the frame in milliseconds
   */
  public update(dtMs: number): void {
    if (!this.enabled || this.forcedPixelRatio !== null) {
      return;
    }

    const now = performance.now();

    // Ignore startup transients (shader compiles, layout reflows, HMR reloads)
    if (now - this.startTime < this.startupGracePeriodMs) {
      this.sampleSum = 0;
      this.sampleCount = 0;
      this.sampleIndex = 0;
      this.sampleBuffer.fill(0);
      return;
    }

    // Clamp extreme single-frame outlier hitches (e.g. from tab-switch, GC, or HMR re-evaluations)
    // to prevent artificial transient spikes from corrupting the moving average window
    const clampedSample = Math.min(dtMs, 50.0);

    // Record sample into ring buffer (zero allocation)
    const oldSample = this.sampleBuffer[this.sampleIndex];
    this.sampleBuffer[this.sampleIndex] = clampedSample;
    this.sampleSum = this.sampleSum - oldSample + clampedSample;

    this.sampleIndex = (this.sampleIndex + 1) % this.sampleWindowSize;
    if (this.sampleCount < this.sampleWindowSize) {
      this.sampleCount++;
    }

    // Only evaluate once a full window has been collected
    if (this.sampleCount < this.sampleWindowSize) {
      return;
    }

    // Cooldown check: prevent rapid oscillation
    if (now - this.lastAdjustmentTime < this.cooldownPeriodMs) {
      return;
    }

    const avgFrameTime = this.sampleSum / this.sampleWindowSize;

    if (avgFrameTime > this.scaleDownThresholdMs) {
      // GPU is struggling -> scale down resolution to relieve fragment burden
      this.isUnderPressure = true;
      this.stableWindowsCount = 0;
      if (this.currentPixelRatio > this.minPixelRatio) {
        const nextDpr = Math.max(
          this.minPixelRatio,
          Math.round((this.currentPixelRatio - this.stepSize) * 100) / 100
        );
        if (nextDpr < this.currentPixelRatio) {
          this.applyPixelRatio(nextDpr, now);
        }
      }
    } else if (avgFrameTime <= this.stableFrameTimeCapMs) {
      // Sustained solid 60 FPS detected without dropped frames
      this.isUnderPressure = false;
      if (this.currentPixelRatio < this.maxPixelRatio) {
        this.stableWindowsCount++;
        if (this.stableWindowsCount >= this.stableWindowsRequiredForUpscale) {
          this.stableWindowsCount = 0;
          const nextDpr = Math.min(
            this.maxPixelRatio,
            Math.round((this.currentPixelRatio + this.stepSize) * 100) / 100
          );
          if (nextDpr > this.currentPixelRatio) {
            this.applyPixelRatio(nextDpr, now);
          }
        }
      } else {
        this.stableWindowsCount = 0;
      }
    } else {
      // In intermediate range [16.90ms - 18.20ms], maintain current ratio
      this.isUnderPressure = false;
      this.stableWindowsCount = 0;
    }
  }

  private applyPixelRatio(newDpr: number, timestamp: number): void {
    const oldDpr = this.currentPixelRatio;
    this.currentPixelRatio = newDpr;
    this.renderer.setPixelRatio(newDpr);

    this.lastAdjustmentTime = timestamp;
    this.adjustmentsCount++;

    // Reset sample window so next evaluation measures the post-adjustment behavior cleanly
    this.sampleSum = 0;
    this.sampleCount = 0;
    this.sampleIndex = 0;
    this.sampleBuffer.fill(0);
  }

  /**
   * Forcing DPR overrides automatic adaptation (used in benchmarking / high-DPI testing).
   */
  public setForcedPixelRatio(dpr: number | null): void {
    this.forcedPixelRatio = dpr;
    if (dpr !== null) {
      const clamped = Math.min(Math.max(dpr, 0.25), 3.0);
      this.currentPixelRatio = Math.round(clamped * 100) / 100;
      this.renderer.setPixelRatio(this.currentPixelRatio);
    }
  }

  public getForcedPixelRatio(): number | null {
    return this.forcedPixelRatio;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setLimits(minDpr: number, maxDpr: number): void {
    this.minPixelRatio = Math.max(0.25, minDpr);
    this.maxPixelRatio = Math.max(this.minPixelRatio, maxDpr);
    if (this.currentPixelRatio > this.maxPixelRatio) {
      this.applyPixelRatio(this.maxPixelRatio, performance.now());
    } else if (this.currentPixelRatio < this.minPixelRatio) {
      this.applyPixelRatio(this.minPixelRatio, performance.now());
    }
  }

  public getEffectivePixelRatio(): number {
    return this.currentPixelRatio;
  }

  public getStats(): DRSStats {
    const avg = this.sampleCount > 0 ? this.sampleSum / this.sampleCount : 0;
    return {
      enabled: this.enabled,
      isForced: this.forcedPixelRatio !== null,
      currentPixelRatio: this.currentPixelRatio,
      targetPixelRatio: this.maxPixelRatio,
      minPixelRatio: this.minPixelRatio,
      maxPixelRatio: this.maxPixelRatio,
      avgFrameTimeMs: Math.round(avg * 100) / 100,
      sampleCount: this.sampleCount,
      adjustmentsCount: this.adjustmentsCount,
      isUnderPressure: this.isUnderPressure,
      lastAdjustmentTime: this.lastAdjustmentTime,
    };
  }

  public reset(): void {
    this.sampleSum = 0;
    this.sampleCount = 0;
    this.sampleIndex = 0;
    this.sampleBuffer.fill(0);
    this.startTime = performance.now();
    this.lastAdjustmentTime = this.startTime;
    this.adjustmentsCount = 0;
    this.isUnderPressure = false;
  }

  public dispose(): void {
    this.enabled = false;
    this.forcedPixelRatio = null;
  }
}

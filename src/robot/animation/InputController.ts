import { NormalizedInputState } from './AnimationTypes';

export class InputController {
  private state: NormalizedInputState = {
    targetX: 0,
    targetY: 0,
    speed: 0,
    intensity: 0,
    isHovered: false,
    reducedMotion: false,
  };

  private lastX: number = 0;
  private lastY: number = 0;

  public update(targetX: number, targetY: number, dt: number, isHovered: boolean, reducedMotion: boolean): void {
    this.state.isHovered = isHovered;
    this.state.reducedMotion = reducedMotion;

    if (reducedMotion) {
      this.state.targetX = 0;
      this.state.targetY = 0;
      this.state.speed = 0;
      this.state.intensity = 0;
      return;
    }

    // Clamp input coordinates
    const clampedX = Math.max(-1, Math.min(1, targetX));
    const clampedY = Math.max(-1, Math.min(1, targetY));

    // Calculate instantaneous cursor speed
    const dx = clampedX - this.lastX;
    const dy = clampedY - this.lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const instantSpeed = dt > 0.0001 ? dist / dt : 0;

    // Smooth speed metric
    this.state.speed = this.state.speed * 0.75 + instantSpeed * 0.25;

    // Compute interaction intensity [0, 1]
    const rawIntensity = Math.min(1.0, this.state.speed / 2.0);
    this.state.intensity = this.state.intensity * 0.82 + rawIntensity * 0.18;

    this.state.targetX = clampedX;
    this.state.targetY = clampedY;

    this.lastX = clampedX;
    this.lastY = clampedY;
  }

  public getState(): Readonly<NormalizedInputState> {
    return this.state;
  }
}

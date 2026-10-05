import * as THREE from 'three';
import { calculateCameraFraming } from '../utils/responsiveness';

export class CameraManager {
  public camera: THREE.PerspectiveCamera;
  public target: THREE.Vector3;

  private baseDistance: number = 2.16;
  private baseTargetY: number = 0.04;
  private currentZoom: number = 1.0;
  private targetZoom: number = 1.0;

  // Complete Zoom Range Boundaries:
  // 0.35 = Close macro inspection (ultra-crisp head, visor LEDs, chest reactor details)
  // 1.00 = Uploaded image hero portrait framing (default view)
  // 2.40 = Complete panoramic full-body zoom-out (full robot head-to-toe with generous margins)
  public readonly minZoom: number = 0.35;
  public readonly maxZoom: number = 2.40;

  constructor(aspect: number) {
    const framing = calculateCameraFraming(aspect);
    this.baseDistance = framing.cameraPosition[2];
    this.baseTargetY = framing.targetPosition[1];

    this.camera = new THREE.PerspectiveCamera(framing.fov, aspect, 0.1, 50);
    this.target = new THREE.Vector3(...framing.targetPosition);
    this.updateCameraTransform();
  }

  public updateAspect(aspect: number): void {
    const framing = calculateCameraFraming(aspect);
    this.camera.fov = framing.fov;
    this.camera.aspect = aspect;
    this.baseDistance = framing.cameraPosition[2];
    this.baseTargetY = framing.targetPosition[1];
    this.updateCameraTransform();
    this.camera.updateProjectionMatrix();
  }

  /**
   * Applies mouse wheel delta to zoom smoothly in or out.
   */
  public handleWheel(deltaY: number): void {
    // Normalizes scroll step across physical mouse wheels and precision trackpads
    const delta = Math.sign(deltaY) * Math.min(Math.abs(deltaY) * 0.0015, 0.09);
    this.targetZoom = THREE.MathUtils.clamp(this.targetZoom + delta, this.minZoom, this.maxZoom);
  }

  public zoomIn(step: number = 0.16): void {
    this.targetZoom = THREE.MathUtils.clamp(this.targetZoom - step, this.minZoom, this.maxZoom);
  }

  public zoomOut(step: number = 0.16): void {
    this.targetZoom = THREE.MathUtils.clamp(this.targetZoom + step, this.minZoom, this.maxZoom);
  }

  public resetZoom(): void {
    this.targetZoom = 1.0;
  }

  public setZoom(zoom: number): void {
    this.targetZoom = THREE.MathUtils.clamp(zoom, this.minZoom, this.maxZoom);
  }

  public setPreset(preset: 'closeup' | 'hero' | 'wide'): void {
    if (preset === 'closeup') {
      this.targetZoom = 0.42;
    } else if (preset === 'hero') {
      this.targetZoom = 1.0;
    } else if (preset === 'wide') {
      this.targetZoom = 2.10;
    }
  }

  public getZoom(): number {
    return this.currentZoom;
  }

  public getTargetZoom(): number {
    return this.targetZoom;
  }

  public getMinZoom(): number {
    return this.minZoom;
  }

  public getMaxZoom(): number {
    return this.maxZoom;
  }

  public getMagnification(): number {
    return 1.0 / this.currentZoom;
  }

  public getMagnificationPercent(): number {
    return Math.round((1.0 / this.currentZoom) * 100);
  }

  public isZoomed(): boolean {
    return Math.abs(this.currentZoom - 1.0) > 0.02 || Math.abs(this.targetZoom - 1.0) > 0.02;
  }

  /**
   * Frame-rate independent exponential interpolation for silky smooth motion.
   * Returns true if camera position changed this frame.
   */
  public update(dt: number): boolean {
    if (Math.abs(this.targetZoom - this.currentZoom) < 0.0005) {
      if (this.currentZoom !== this.targetZoom) {
        this.currentZoom = this.targetZoom;
        this.updateCameraTransform();
        return true;
      }
      return false;
    }

    const alpha = 1.0 - Math.exp(-12.0 * dt);
    this.currentZoom = THREE.MathUtils.lerp(this.currentZoom, this.targetZoom, alpha);
    this.updateCameraTransform();
    return true;
  }

  private updateCameraTransform(): void {
    const distance = this.baseDistance * this.currentZoom;

    // Smooth dual-direction adaptive framing tilt:
    // When zooming in (currentZoom < 1.0), lift target smoothly towards head/visor (up to +0.26)
    // When zooming out (currentZoom > 1.0), lower target slightly towards center of mass (up to -0.22)
    // so the entire body remains centered in the viewport
    let targetYOffset = 0;
    if (this.currentZoom < 1.0) {
      targetYOffset = (1.0 - this.currentZoom) * 0.26;
    } else if (this.maxZoom > 1.0) {
      const zoomOutProgress = (this.currentZoom - 1.0) / (this.maxZoom - 1.0);
      targetYOffset = -zoomOutProgress * 0.22;
    }

    const currentTargetY = this.baseTargetY + targetYOffset;

    this.camera.position.set(0, currentTargetY, distance);
    this.target.set(0, currentTargetY, 0);
    this.camera.lookAt(this.target);
  }
}

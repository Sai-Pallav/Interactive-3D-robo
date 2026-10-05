import { CAMERA_POSITION } from '../config';

export interface ViewportDimensions {
  width: number;
  height: number;
  aspect: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export function getViewportDimensions(container: HTMLElement): ViewportDimensions {
  const width = Math.max(container.clientWidth, 1);
  const height = Math.max(container.clientHeight, 1);
  const aspect = width / height;

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  return {
    width,
    height,
    aspect,
    isMobile,
    isTablet,
    isDesktop,
  };
}

/**
 * Calculates adaptive camera parameters (FOV, distance, height offset)
 * framing the humanoid robot as a prominent, grounded hero character (~1.25-1.30x visual scale),
 * with generous headroom below the navigation, full visibility of shoulders and hands,
 * and bottom anchoring emerging seamlessly from the hero section.
 */
export function calculateCameraFraming(aspect: number): {
  fov: number;
  cameraPosition: [number, number, number];
  targetPosition: [number, number, number];
} {
  const baseFov = CAMERA_POSITION.baseFov;
  // Center camera slightly below upper chest to balance headroom and lower body anchor
  const targetY = CAMERA_POSITION.targetY;
  const halfFovRad = (baseFov / 2) * (Math.PI / 180);

  // Vertical distance framing robot at ~1.24x visual scale with hands and head fully visible
  const minDistanceVert = CAMERA_POSITION.minDistanceVert;

  // Horizontal distance to ensure shoulders, elbows, and hands have generous side margins
  const minDistanceHoriz = CAMERA_POSITION.horizontalSpreadFactor / (aspect * Math.tan(halfFovRad));

  const distance = Math.max(minDistanceVert, minDistanceHoriz);

  return {
    fov: baseFov,
    cameraPosition: [0, targetY, distance],
    targetPosition: [0, targetY, 0],
  };
}


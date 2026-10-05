export interface InteractionState {
  clientX: number;
  clientY: number;
  hasPointer: boolean;
  targetX: number;             // Normalized [-1, 1]
  targetY: number;             // Normalized [-1, 1]
  speed: number;               // Current cursor velocity (units/sec)
  isHovered: boolean;
  reducedMotion: boolean;
}

export class RobotInteraction {
  private state: InteractionState = {
    clientX: 0,
    clientY: 0,
    hasPointer: false,
    targetX: 0,
    targetY: 0,
    speed: 0,
    isHovered: false,
    reducedMotion: false,
  };

  private container: HTMLElement;
  private lastTime: number = performance.now();
  private lastX: number = 0;
  private lastY: number = 0;
  private lastClientX: number = 0;
  private lastClientY: number = 0;
  private boundPointerMove: (e: PointerEvent) => void;
  private boundPointerLeave: () => void;
  private boundWindowBlur: () => void;
  private mediaQueryList?: MediaQueryList;

  // Relative anchor position of the robot face within the container [0, 1]
  // Calibrated to the exact 3D projection of the visor/face
  private faceRelX: number = 0.50;
  private faceRelY: number = 0.23;
  private cachedRect: DOMRect | null = null;
  private boundUpdateRect: () => void;

  constructor(container: HTMLElement) {
    this.container = container;

    // Check prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.mediaQueryList = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.state.reducedMotion = this.mediaQueryList.matches;
      this.mediaQueryList.addEventListener('change', (e) => {
        this.state.reducedMotion = e.matches;
      });
    }

    this.boundPointerMove = this.onPointerMove.bind(this);
    this.boundPointerLeave = this.onPointerLeave.bind(this);
    this.boundWindowBlur = this.onPointerLeave.bind(this);
    this.boundUpdateRect = () => {
      if (this.container) {
        this.cachedRect = this.container.getBoundingClientRect();
      }
    };

    // Track cursor across the ENTIRE window so head follows anywhere on page
    window.addEventListener('pointermove', this.boundPointerMove, { passive: true });
    window.addEventListener('pointerdown', this.boundPointerMove, { passive: true });
    window.addEventListener('resize', this.boundUpdateRect, { passive: true });
    window.addEventListener('scroll', this.boundUpdateRect, { passive: true });
    document.addEventListener('mouseleave', this.boundPointerLeave);
    window.addEventListener('blur', this.boundWindowBlur);
  }

  private onPointerMove(e: PointerEvent): void {
    // Disable cursor tracking on touch devices
    if (e.pointerType === 'touch') {
      return;
    }

    const now = performance.now();
    const dt = Math.max((now - this.lastTime) / 1000, 0.001);

    this.state.clientX = e.clientX;
    this.state.clientY = e.clientY;
    this.state.hasPointer = true;
    this.state.isHovered = true;

    // Calculate normalized coordinates relative to the robot FACE origin.
    // When cursor is directly on the face, normX = 0 and normY = 0 (looks straight ahead).
    // Moving up looks up, moving down looks down, moving left/right turns left/right.
    if (!this.cachedRect) {
      this.cachedRect = this.container.getBoundingClientRect();
    }
    const rect = this.cachedRect;
    const robotCenterX = rect.left + rect.width * this.faceRelX;
    const robotCenterY = rect.top + rect.height * this.faceRelY;

    // Direct proportional distance from the face origin to viewport edges:
    // Guarantees cursor on face is strictly (0, 0), and moving to each screen edge reaches ±1.0
    const distUp = Math.max(robotCenterY, 80);
    const distDown = Math.max(window.innerHeight - robotCenterY, 80);
    const distLeft = Math.max(robotCenterX, 80);
    const distRight = Math.max(window.innerWidth - robotCenterX, 80);

    const deltaX = e.clientX - robotCenterX;
    const deltaY = e.clientY - robotCenterY;

    const normX = deltaX < 0 ? deltaX / distLeft : deltaX / distRight;
    // Invert Y so moving cursor up from face gives positive Y (head looks up)
    const normY = deltaY < 0 ? -deltaY / distUp : -deltaY / distDown;

    // Clamp to [-1, 1]
    const clampedX = Math.max(-1, Math.min(1, normX));
    const clampedY = Math.max(-1, Math.min(1, normY));

    // Calculate velocity based on screen fraction distance
    const screenW = Math.max(window.innerWidth, 1);
    const screenH = Math.max(window.innerHeight, 1);
    const pDx = (e.clientX - (this.lastClientX || e.clientX)) / screenW;
    const pDy = (e.clientY - (this.lastClientY || e.clientY)) / screenH;
    const dist = Math.sqrt(pDx * pDx + pDy * pDy);
    const instantSpeed = dist / dt;

    // Smooth speed metric
    this.state.speed = this.state.speed * 0.7 + instantSpeed * 0.3;

    this.state.targetX = clampedX;
    this.state.targetY = clampedY;

    this.lastTime = now;
    this.lastX = clampedX;
    this.lastY = clampedY;
    this.lastClientX = e.clientX;
    this.lastClientY = e.clientY;
  }

  private onPointerLeave(): void {
    // Mouse left the browser window entirely — return to idle (looking straight forward)
    this.state.isHovered = false;
    this.state.hasPointer = false;
    this.state.targetX = 0;
    this.state.targetY = 0;
    this.state.speed = 0;
  }

  public getState(): Readonly<InteractionState> {
    return this.state;
  }

  public setFacePosition(relX: number, relY: number): void {
    this.faceRelX = Math.max(0.1, Math.min(0.9, relX));
    this.faceRelY = Math.max(0.05, Math.min(0.9, relY));
  }

  public setLookTarget(x: number, y: number): void {
    this.state.targetX = Math.max(-1, Math.min(1, x));
    this.state.targetY = Math.max(-1, Math.min(1, y));
  }

  public dispose(): void {
    window.removeEventListener('pointermove', this.boundPointerMove);
    window.removeEventListener('pointerdown', this.boundPointerMove);
    window.removeEventListener('resize', this.boundUpdateRect);
    window.removeEventListener('scroll', this.boundUpdateRect);
    document.removeEventListener('mouseleave', this.boundPointerLeave);
    window.removeEventListener('blur', this.boundWindowBlur);
  }
}

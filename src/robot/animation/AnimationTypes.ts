export interface NormalizedInputState {
  targetX: number;           // Normalized [-1, 1] across viewport
  targetY: number;           // Normalized [-1, 1]
  speed: number;             // Cursor speed units/sec
  intensity: number;         // Interaction intensity [0, 1]
  isHovered: boolean;
  reducedMotion: boolean;
  clientX?: number;          // Real viewport pixel X
  clientY?: number;          // Real viewport pixel Y
  hasPointer?: boolean;      // True if cursor is currently within the window
}

export interface HierarchicalGazeAngles {
  headYaw: number;
  headPitch: number;
  headRoll: number;
  neckYaw: number;
  neckPitch: number;
  shouldersYaw: number;
  chestYaw: number;
  chestPitch: number;
  waistYaw: number;
  waistPitch: number;
}

export interface ShoulderOffset {
  leftPitch: number;
  leftYaw: number;
  leftRoll: number;
  leftPosY: number;
  rightPitch: number;
  rightYaw: number;
  rightRoll: number;
  rightPosY: number;
}

export interface ArmPoseAngles {
  leftElbowBend: number;
  rightElbowBend: number;
  leftUpperPitch: number;
  rightUpperPitch: number;
  leftUpperRoll: number;
  rightUpperRoll: number;
  leftElbowRoll: number;
  rightElbowRoll: number;
}

export interface WristOffset {
  pitch: number;
  roll: number;
  yaw: number;
}

export interface HandFingerOffsets {
  proximalCurl: number;
  middleCurl: number;
  distalCurl: number;
  splay: number;
}

export interface HandOffsets {
  thumbPitch: number;
  thumbYaw: number;
  fingers: HandFingerOffsets[];
}

export interface WaistSuspensionOffsets {
  segment01Pitch: number;
  segment02Pitch: number;
  segment03Pitch: number;
  segment04Pitch: number;
  segment05Pitch: number;
  waistPivotPitch: number;
  waistPivotYaw: number;
  waistPivotRoll: number;
}

export interface IdleSuspensionState {
  floatingY: number;
  floatingPitch: number;
  floatingRoll: number;
  torsoMicroPitch: number;
  torsoMicroYaw: number;
}

// Centralized Brand Accent Color (Part 14 & 15: Purple is the ONLY emissive accent)
export const ROBOT_ACCENT = 0xa855f7;

// =========================================================================
// CENTRALIZED MASTER PRODUCTION CONFIGURATION CONSTANTS (Hero Refinement)
// =========================================================================

export const ROBOT_SCALE = {
  desktop: 1.62,
  desktopWide: 1.68,
  tablet: 1.40,
  mobile: 1.24,
};

export const ROBOT_POSITION = {
  desktop: { x: 0.0, y: -0.18, z: 0 },
  desktopWide: { x: 0.0, y: -0.18, z: 0 },
  tablet: { x: 0.0, y: -0.14, z: 0 },
  mobile: { x: 0.0, y: -0.10, z: 0 },
};

export const ROBOT_ROTATION = {
  yaw: -10 * (Math.PI / 180),   // ~-10 degrees (ideal 3/4 hero orientation revealing chest & joint depth)
  pitch: 0,                     // Neutral upright posture (eliminates backward tilt)
  roll: 0,
};

export const CAMERA_POSITION = {
  baseFov: 45,                  // Normal cinematic FOV
  targetY: 0.04,                // Centered on chest/torso, lowering robot so legs descend downward
  minDistanceVert: 2.16,        // Intimate, powerful hero scale showcasing head, chest, arms & waist
  horizontalSpreadFactor: 0.62,
};

export const LIGHT_INTENSITY = {
  ambient: 0.42,                // Very subtle ambient, maintains dark cavity depth
  key: 1.15,                    // Soft key light with rich gradients across armor
  fill: 0.32,                   // Controlled fill light preventing pure black shadows
  rimLeft: 0.65,                // Subtle titanium edge contour
  rimRight: 1.45,               // Crisp violet rim separation (shoulders, head, torso)
  purpleBounce: 0.45,           // Subtle local emissive bounce
  lowerFill: 0.25,              // Soft ground connection
};

export interface RobotDimensions {
  headScale: number;
  headWidth: number;
  headHeight: number;
  headDepth: number;
  visorWidthRatio: number;
  visorHeightRatio: number;
  sideModuleDiameterRatio: number;
  neckWidthRatio: number;
  neckRingsCount: number;
}

export interface RobotConfig {
  headYawLimit: number;
  headPitchLimit: number;
  headRollLimit: number;
  
  headDamping: number;
  eyeDamping: number;
  neckFollowStrength: number;
  torsoFollowStrength: number;
  shoulderFollowStrength: number;

  eyeGazeRangeX: number;
  eyeGazeRangeY: number;

  cursorSpeedThreshold: number;
  cursorSpeedAnticipation: number;

  idleBreathingSpeed: number;
  idleBreathingAmplitude: number;
  idleDriftSpeed: number;
  idleDriftAmplitude: number;
  blinkIntervalMin: number;
  blinkIntervalMax: number;
  blinkDuration: number;

  dimensions: RobotDimensions;

  colors: {
    armorWhite: number;
    jointDark: number;
    visorGlass: number;
    accentPurple: number;
    studioFloor: number;
  };
  materials: {
    armorRoughness: number;
    armorMetalness: number;
    armorClearcoat: number;
    armorClearcoatRoughness: number;
    jointRoughness: number;
    jointMetalness: number;
    visorRoughness: number;
    visorMetalness: number;
    visorClearcoat: number;
    visorClearcoatRoughness: number;
    emissiveIntensity: number;
    emissivePulseRange: [number, number];
  };

  maxPixelRatio: number;
  shadowMapSize: number;
}

export const ROBOT_CONFIG: RobotConfig = {
  headYawLimit: (30 * Math.PI) / 180,
  headPitchLimit: (18 * Math.PI) / 180,
  headRollLimit: (6 * Math.PI) / 180,

  headDamping: 6.5,
  eyeDamping: 7.2,
  neckFollowStrength: 0.22,
  torsoFollowStrength: 0.08,
  shoulderFollowStrength: 0.04,

  eyeGazeRangeX: 0.005,
  eyeGazeRangeY: 0.003,

  cursorSpeedThreshold: 1.4,
  cursorSpeedAnticipation: 0.16,

  idleBreathingSpeed: 1.2,
  idleBreathingAmplitude: 0.012,
  idleDriftSpeed: 0.6,
  idleDriftAmplitude: 0.004,
  blinkIntervalMin: 4.0,
  blinkIntervalMax: 8.0,
  blinkDuration: 0.16,

  dimensions: {
    headScale: 1.0,
    headWidth: 0.280,
    headHeight: 0.316,
    headDepth: 0.310,
    visorWidthRatio: 0.74,
    visorHeightRatio: 0.36,
    sideModuleDiameterRatio: 0.23,
    neckWidthRatio: 0.34,
    neckRingsCount: 4,
  },

  colors: {
    armorWhite: 0xd6dae6,                // Refined ceramic off-white with natural gradient falloff
    jointDark: 0x181a26,                 // Rich gunmetal titanium with specular depth
    visorGlass: 0x04030a,                // Deep obsidian glossy black
    accentPurple: ROBOT_ACCENT,          // Electric brand purple
    studioFloor: 0x03010f,
  },

  materials: {
    armorRoughness: 0.30,                // Plausible ceramic roughness for soft specular roll-off (P9)
    armorMetalness: 0.14,                // Controlled dielectric behavior with soft specular highlights
    armorClearcoat: 0.90,                // Liquid automotive/ceramic clearcoat
    armorClearcoatRoughness: 0.12,
    jointRoughness: 0.35,                // Satin brushed titanium
    jointMetalness: 0.85,                // Real metallic reflectance with visible cavity detail
    visorRoughness: 0.02,
    visorMetalness: 0.20,
    visorClearcoat: 1.0,
    visorClearcoatRoughness: 0.02,
    emissiveIntensity: 2.2,              // Controlled, premium glow
    emissivePulseRange: [1.9, 2.6],
  },

  maxPixelRatio: 3.0,
  shadowMapSize: 1024,
};

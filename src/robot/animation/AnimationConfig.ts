/**
 * Centralized Configuration Constants for the Production-Grade Robot Animation System.
 * Adheres strictly to Master Animation Specification:
 * - Damped spring interpolation constants
 * - Exact hierarchical look-at distribution ratios (Head 100% -> Neck 28% -> Shoulders 12% -> Chest 5.5% -> Waist 2%)
 * - Asymmetric mechanical shoulder response factors
 * - Partial-fold arm resting postures (Poses A, B, C)
 * - Coordinated finger curling & thumb thenar kinematics
 * - 8-Layer asynchronous idle frequencies & environmental floating
 * - Reduced-motion accessibility limits
 */

export const ANIMATION_CONFIG = {
  // ==========================================
  // 1. CURSOR TRACKING & HIERARCHICAL LOOK
  // ==========================================
  look: {
    // Physical joint limits (in radians) - wide natural humanoid range
    headYawLimit: (38 * Math.PI) / 180,       // ~±38° total local turn
    headPitchLimit: (26 * Math.PI) / 180,     // ~±26° downward pitch
    headPitchUpLimit: (18 * Math.PI) / 180,   // ~±18° upward pitch
    headRollLimit: (5 * Math.PI) / 180,       // ~±5° organic lateral tilt

    // Soft-knee linear thresholds (100% 1:1 direct tracking up to knee, smooth tanh compression beyond)
    yawKnee: (26 * Math.PI) / 180,            // 26° linear zone
    pitchDownKnee: (16 * Math.PI) / 180,      // 16° linear zone downward
    pitchUpKnee: (12 * Math.PI) / 180,        // 12° linear zone upward

    // Hierarchical response ratios (Head leads 72%, Neck follows 22%, Chest follows 6% -> Exact 100% sum)
    headRatio: 0.72,                          // 72%
    neckRatio: 0.22,                          // 22%
    chestRatio: 0.06,                         // 6%
    shouldersRatio: 0.10,                     // 10%
    waistRatio: 0.02,                         // 2%

    // Damping and spring smoothing (responsive, fluid, critically damped, zero jitter)
    headDamping: 8.5,
    neckDamping: 6.8,
    bodyDamping: 4.8,
    speedThreshold: 1.0,
    speedAnticipation: 0.08,
  },

  // ==========================================
  // 2. ASYMMETRIC MECHANICAL SHOULDER RESPONSE
  // ==========================================
  shoulder: {
    yawFactor: 0.028,                         // Subtle mechanical yaw reaction
    pitchFactor: 0.020,                       // Asymmetric pitch reaction (opposite side tilts)
    zReaction: 0.025,                         // Longitudinal shift (backward / forward)
    maxTravel: 0.035,                         // Mechanical hard limit
    smoothing: 4.5,
  },

  // ==========================================
  // 3. ARM POSTURES & PARTIAL FOLD
  // ==========================================
  arm: {
    // Poses with natural resting athletic flexion & relaxed outward-inward articulation:
    // Poses with natural resting athletic flexion & relaxed outward-inward articulation:
    // Upper arms angle slightly outward from torso (~7.4° = 0.130 rad roll) with forward pitch (-0.08 rad)
    // Elbows maintain natural organic relaxed flexion (~14.9° = -0.26 rad)
    // Forearms turn gracefully inward toward torso centerline
    poses: {
      poseA: {
        name: 'PoseA_SymmetricRelaxed',
        leftElbow: -0.26,                     // Natural organic relaxed flexion (~14.9°)
        rightElbow: -0.26,                    // Natural organic relaxed flexion (~14.9°)
        leftUpperPitch: -0.08,                // Forward drape (~4.6°)
        rightUpperPitch: -0.08,               // Forward drape (~4.6°)
        leftUpperRoll: -0.130,                // Shoulders to elbow OUTWARD (~7.4° abduction)
        rightUpperRoll: 0.130,                // Shoulders to elbow OUTWARD (~7.4° abduction)
        leftElbowRoll: 0.0,                   // Strict 1-DOF transverse hinge (zero internal knuckle shearing)
        rightElbowRoll: 0.0,
      },
      poseB: {
        name: 'PoseB_SymmetricRelaxed',
        leftElbow: -0.29,                     // Subtle shift (~16.6°)
        rightElbow: -0.29,
        leftUpperPitch: -0.09,
        rightUpperPitch: -0.09,
        leftUpperRoll: -0.135,                // Shoulders to elbow OUTWARD (~7.7°)
        rightUpperRoll: 0.135,                // Shoulders to elbow OUTWARD (~7.7°)
        leftElbowRoll: 0.0,
        rightElbowRoll: 0.0,
      },
      poseC: {
        name: 'PoseC_SymmetricRelaxed',
        leftElbow: -0.23,                     // Subtle shift (~13.2°)
        rightElbow: -0.23,
        leftUpperPitch: -0.07,
        rightUpperPitch: -0.07,
        leftUpperRoll: -0.125,                // Shoulders to elbow OUTWARD (~7.15°)
        rightUpperRoll: 0.125,                // Shoulders to elbow OUTWARD (~7.15°)
        leftElbowRoll: 0.0,
        rightElbowRoll: 0.0,
      },
    },
    poseIntervalMin: 14.0,                    // Infrequent pose transitions (seconds)
    poseIntervalMax: 22.0,
    transitionDuration: 4.5,                  // Extremely slow and smooth S-curve blend
  },

  // ==========================================
  // 4. WRIST STABILIZATION & MICRO-REACTION
  // ==========================================
  wrist: {
    pitchLimit: (4.0 * Math.PI) / 180,        // +/- 4 deg
    rollLimit: (3.0 * Math.PI) / 180,         // +/- 3 deg
    yawLimit: (2.5 * Math.PI) / 180,          // +/- 2.5 deg
    cursorReactFactor: 0.015,
    damping: 5.0,
  },

  // ==========================================
  // 5. HAND & COORDINATED FINGER MICRO-ANIMATION
  // ==========================================
  hand: {
    // Subtle curl range: fingers stay relaxed and hanging straight down
    minCurl: 0.0,
    maxCurl: (2.0 * Math.PI) / 180,           // ~2.0° subtle micro-motion
    cycleSpeed: 0.28,                         // Slow periodic cycle (~22s full cycle)
    splayAmplitude: 0.004,
    // Thumb thenar subtle micro-kinematics
    thumbPitchFactor: 0.012,
    thumbYawFactor: 0.008,
  },

  // ==========================================
  // 6. ABDOMEN / WAIST MECHANICAL SUSPENSION
  // ==========================================
  waist: {
    upperSegmentPitch: (0.5 * Math.PI) / 180, // +0.5°
    middleSegmentPitch: (0.3 * Math.PI) / 180,// +0.3°
    lowerSegmentPitch: (-0.2 * Math.PI) / 180,// -0.2°
    waistRingPitch: (-0.3 * Math.PI) / 180,   // -0.3°
    cycleSpeed: 0.48,                         // Asynchronous mechanical frequency
  },

  // ==========================================
  // 7. ENVIRONMENTAL FLOATING SUSPENSION
  // ==========================================
  floating: {
    amplitude: 0.0065,                        // ±0.0065 world units (gentle, stable suspension)
    speed: 0.68,                              // Slow sine cycle (~9.2s period)
    tiltAmplitude: 0.003,                     // Micro pitch/roll tilt
  },

  // ==========================================
  // 8. VISOR & EMISSIVE INTERACTION RESPONSE
  // ==========================================
  emissive: {
    baseIntensity: 2.2,
    activeIntensity: 2.65,
    responseSpeed: 3.5,
    pulseSpeed: 1.6,
    pulseAmplitude: 0.25,
  },

  // ==========================================
  // 9. BLINK SYSTEM
  // ==========================================
  blink: {
    intervalMin: 4.0,
    intervalMax: 8.5,
    duration: 0.16,
  },

  // ==========================================
  // 10. REDUCED MOTION LIMITS
  // ==========================================
  reducedMotion: {
    scale: 0.20,
    disableFloating: true,
  },
};

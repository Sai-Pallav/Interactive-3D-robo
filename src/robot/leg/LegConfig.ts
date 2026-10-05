/**
 * Master Geometric & Kinematic Configuration for the Procedural Robot Legs & Feet Assembly.
 * Proportioned for an athletic, heroic humanoid mecha aesthetic matching the torso, head, and arms.
 */
export const LEG_CONFIG = {
  // =========================================================================
  // 1. ANATOMICAL SEGMENT LENGTHS & RADII
  // =========================================================================
  hip: {
    // Offset from hip connection pivot down to the thigh rotation center
    yOffset: -0.026,
    actuatorRadius: 0.028,
    actuatorLength: 0.038,
    mountBracketWidth: 0.054,
    mountBracketHeight: 0.028,
    mountBracketDepth: 0.044,
    collarRadius: 0.034,
    collarHeight: 0.024,
    flangeRadius: 0.038,
    accentRingRadius: 0.025,
  },

  thigh: {
    // Upper leg length from hip joint to knee joint center
    length: 0.320,
    frame: {
      spineWidth: 0.036,
      spineDepth: 0.038,
      upperCollarRadius: 0.035,
      upperCollarHeight: 0.028,
      lowerForkWidth: 0.066,
      lowerForkDepth: 0.034,
      lowerForkLength: 0.058,
    },
    // Segmented armor: leaves visible structural frame at top (hip interface) and bottom (knee fork)
    anteriorArmor: {
      widthTop: 0.074,
      widthBottom: 0.054,
      length: 0.198, // Leaves ~48mm clearance to knee and ~32mm clearance to hip!
      thickness: 0.020,
      keelProtrusion: 0.010,
    },
    lateralArmor: {
      width: 0.042,
      thickness: 0.015,
      cowlLength: 0.156, // Leaves crisp 5mm clearance above knee rotary condyle disc
    },
    medialArmor: {
      width: 0.034,
      thickness: 0.012,
      cowlLength: 0.156,
    },
    ledStrip: {
      width: 0.0032,
      depth: 0.0025,
      length: 0.150,
    },
  },

  knee: {
    // Reference-driven compact rotary condyle bearing integrated flush with leg width
    discRadius: 0.022,
    discWidth: 0.010,
    outerDiscSpacing: 0.050,
    accentRingRadius: 0.015,
    centerCapRadius: 0.010,
    centralAxleRadius: 0.007,
    centralAxleLength: 0.060,
    // Central white faceted knee cover (Bearing's White Armor)
    patella: {
      width: 0.028,
      height: 0.046,
      thickness: 0.010,
      offsetZ: 0.0358, // Aligned flush with frontal depth plane of thigh suprapatellar arch
      yOffset: 0.0010, // Creates calibrated 5.0mm dark mechanical gap to upper thigh arch
      rotX: 0.000,
    },
    // Structural dark knee housing
    housingWidth: 0.034,
    upperStructureHeight: 0.022,
    lowerStructureHeight: 0.018,
    housingDepth: 0.024,
  },

  shin: {
    // Lower leg length from knee joint to ankle joint center
    length: 0.330,
    frame: {
      spineWidth: 0.032,
      spineDepth: 0.034,
      upperPlateauWidth: 0.034,
      upperPlateauDepth: 0.026,
      upperPlateauHeight: 0.018,
      lowerCollarRadius: 0.026,
    },
    // Segmented armor: leaves ~45mm clearance under knee and exposes tibial collar
    anteriorKeel: {
      widthTop: 0.056,
      widthBottom: 0.036,
      length: 0.208, // Segmented length leaves ~45mm clearance below knee!
      thickness: 0.020,
      keelProtrusion: 0.015,
    },
    posteriorCalf: {
      width: 0.054,
      height: 0.155,
      depth: 0.036,
      ventCount: 3,
      ventWidth: 0.030,
      ventHeight: 0.0045,
    },
    ledStrip: {
      width: 0.0026,
      depth: 0.0022,
      length: 0.180,
    },
  },

  ankle: {
    // Multi-axis spherical gimbal ankle
    housingRadius: 0.020,
    malleolusDiscRadius: 0.018,
    malleolusDiscWidth: 0.006,
    accentRingRadius: 0.014,
    achillesDamper: {
      cylinderRadius: 0.005,
      pistonRadius: 0.0032,
      mountY: 0.060,
      mountZ: -0.028,
      targetY: -0.015,
      targetZ: -0.048,
    },
  },

  foot: {
    // Athletic robotic foot dimensions
    length: 0.160,
    width: 0.064,
    height: 0.055,
    heelOffset: -0.048,
    toeOffset: 0.112,
    soleThickness: 0.014,
    treadPadsCount: 5,
    underglow: {
      width: 0.0035,
      height: 0.003,
      inset: 0.004,
    },
    dorsalPlate: {
      width: 0.052,
      length: 0.090,
      thickness: 0.012,
    },
    toeCap: {
      width: 0.056,
      length: 0.042,
      height: 0.028,
    },
    heelThruster: {
      radius: 0.010,
      depth: 0.012,
    },
  },

  // =========================================================================
  // 2. KINEMATIC ROTATION LIMITS (Radians)
  // =========================================================================
  limits: {
    hip: {
      pitchMin: -0.70, // Kick forward (~40°)
      pitchMax: 0.35,  // Extend backward (~20°)
      yawMin: -0.25,   // Inward rotation
      yawMax: 0.35,    // Outward rotation
      rollMin: -0.20,  // Adduction
      rollMax: 0.40,   // Abduction (~23°)
    },
    knee: {
      pitchMin: 0.0,   // Full extension
      pitchMax: 2.10,  // Deep flexion (~120°)
    },
    ankle: {
      pitchMin: -0.45, // Dorsiflexion (toes up ~25°)
      pitchMax: 0.60,  // Plantarflexion (toes down ~35°)
      rollMin: -0.22,  // Inversion
      rollMax: 0.22,   // Eversion
    },
    toe: {
      pitchMin: -0.05,
      pitchMax: 0.50,  // Toe hinge flex
    },
  },

  // =========================================================================
  // 3. DEFAULT REST / HEROIC STANDING STANCE
  // =========================================================================
  stance: {
    // Athletic heroic standing stance: assertive outward hip flare, active knee flexion, grounded level feet
    hipPitch: -0.080,    // ~-4.6° forward thigh incline for active muscular engagement
    hipRoll: 0.082,      // ~4.7° lateral abduction providing stable, confident A-frame stance
    hipYaw: 0.055,       // ~3.1° outward toe flare for anatomical knee-to-toe alignment
    hipYawLeft: 0.035,   // ~2.0° calibrated for 3/4 camera view to present anterior armor facet
    hipYawRight: 0.065,  // ~3.7° calibrated outward flare revealing lateral cowl and condyle
    kneePitch: 0.155,    // ~8.9° athletic knee flexion eliminating stiff/hyperextended look
    anklePitch: -0.075,  // Perfectly balances hip pitch and knee bend to keep foot level
    ankleRoll: -0.082,   // Counter-balances hip roll for 100% flush ground contact
  },
};

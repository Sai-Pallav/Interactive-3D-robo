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
    actuatorRadius: 0.026,
    actuatorLength: 0.034,
    mountBracketWidth: 0.052,
    mountBracketHeight: 0.026,
    mountBracketDepth: 0.042,
    collarRadius: 0.032,
    collarHeight: 0.022,
    flangeRadius: 0.036,
    accentRingRadius: 0.024,
  },

  thigh: {
    // Upper leg length from hip joint to knee joint center
    length: 0.285,
    frame: {
      spineWidth: 0.038,
      spineDepth: 0.042,
      upperCollarRadius: 0.034,
      upperCollarHeight: 0.026,
      lowerForkWidth: 0.064,
      lowerForkDepth: 0.036,
      lowerForkLength: 0.056,
    },
    // Segmented armor: leaves visible structural frame at top (hip interface) and bottom (knee fork)
    anteriorArmor: {
      widthTop: 0.076,
      widthBottom: 0.056,
      length: 0.146, // Calibrated clearance (5.0mm) to knee suprapatellar arch and hip
      thickness: 0.022,
      keelProtrusion: 0.012,
    },
    lateralArmor: {
      width: 0.046,
      thickness: 0.016,
      cowlLength: 0.126, // Calibrated clearance (>= 3.0mm) above knee rotary condyle disc
    },
    medialArmor: {
      width: 0.038,
      thickness: 0.013,
      cowlLength: 0.126, // Calibrated clearance (>= 2.5mm) above medial rotary disc
    },
    posteriorHamstring: {
      width: 0.052,
      length: 0.122,
      thickness: 0.014,
      fastenerCount: 0,
    },
    trochanter: {
      radius: 0.036,
      height: 0.052,
      thickness: 0.015,
    },
    ledStrip: {
      width: 0.0030,
      depth: 0.0024,
      length: 0.118,
    },
  },

  knee: {
    // Reference-driven compact rotary condyle bearing integrated flush with leg width
    discRadius: 0.024,
    discWidth: 0.011,
    outerDiscSpacing: 0.054,
    accentRingRadius: 0.017,
    centerCapRadius: 0.011,
    centralAxleRadius: 0.008,
    centralAxleLength: 0.062,
    // Central white faceted knee cover (Bearing's White Armor)
    patella: {
      width: 0.030,
      height: 0.046,
      thickness: 0.011,
      offsetZ: 0.0250, // Aligned flush with rotary condyle disc housing and leg profile
      yOffset: 0.000,  // Creates calibrated 5.0mm dark mechanical gap to upper thigh arch
      rotX: 0.000,
    },
    // Structural dark knee housing
    housingWidth: 0.036,
    upperStructureHeight: 0.022,
    lowerStructureHeight: 0.018,
    housingDepth: 0.026,
    linkage: {
      strutRadius: 0.0036,
      pistonRadius: 0.0022,
      length: 0.036,
      offsetZ: -0.015,
    },
  },

  shin: {
    // Lower leg length from knee joint to ankle joint center
    length: 0.284,
    frame: {
      spineWidth: 0.034,
      spineDepth: 0.040,
      upperPlateauWidth: 0.036,
      upperPlateauDepth: 0.028,
      upperPlateauHeight: 0.018,
      lowerCollarRadius: 0.027,
    },
    // Segmented white ceramic armor: flows cleanly from knee shelf down to distal ankle collar
    anteriorKeel: {
      widthTop: 0.058,
      widthBottom: 0.044,
      length: 0.226, // Refined gauntlet extending continuously to meet distal ankle collar
      thickness: 0.022,
      keelProtrusion: 0.015,
    },
    posteriorCalf: {
      width: 0.058,
      height: 0.138,
      depth: 0.042,
      ventCount: 3,
      ventWidth: 0.032,
      ventHeight: 0.0045,
    },
    ledStrip: {
      width: 0.0026,
      depth: 0.0022,
      length: 0.165,
    },
  },

  ankle: {
    // Multi-axis spherical gimbal ankle
    housingRadius: 0.021,
    malleolusDiscRadius: 0.019,
    malleolusDiscWidth: 0.007,
    accentRingRadius: 0.0145,
    achillesDamper: {
      cylinderRadius: 0.0052,
      pistonRadius: 0.0032,
      mountY: 0.056,
      mountZ: -0.029,
      targetY: -0.028,
      targetZ: -0.048,
    },
  },

  foot: {
    // Athletic robotic foot dimensions
    length: 0.168,
    width: 0.062,
    height: 0.054,
    heelOffset: -0.050,
    toeOffset: 0.118,
    soleThickness: 0.013,
    treadPadsCount: 5,
    underglow: {
      width: 0.0035,
      height: 0.003,
      inset: 0.004,
    },
    dorsalPlate: {
      width: 0.054,
      length: 0.096,
      thickness: 0.012,
    },
    toeCap: {
      width: 0.056,
      length: 0.042,
      height: 0.026,
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
    hipYaw: 0.048,       // ~2.75° outward toe flare for anatomical knee-to-toe alignment
    hipYawLeft: 0.048,   // Symmetrical left outward flare
    hipYawRight: 0.048,  // Symmetrical right outward flare
    kneePitch: 0.155,    // ~8.9° athletic knee flexion eliminating stiff/hyperextended look
    anklePitch: -0.075,  // Perfectly balances hip pitch and knee bend to keep foot level
    ankleRoll: -0.082,   // Counter-balances hip roll for 100% flush ground contact
  },
};

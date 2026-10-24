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
      thickness: 0.016, // Slimmed from 0.024 for form-fitting ceramic quad shell
      keelProtrusion: 0.009,
    },
    lateralArmor: {
      width: 0.058, // Streamlined from 0.068 to eliminate block-like flank overhang
      thickness: 0.012, // Slimmed from 0.018 for tight integration with femur spine
      cowlLength: 0.130, // Calibrated clearance (3.5mm) above knee rotary condyle bearing
    },
    medialArmor: {
      width: 0.046,
      thickness: 0.010,
      cowlLength: 0.130,
    },
    posteriorHamstring: {
      width: 0.052,
      length: 0.126,
      thickness: 0.012, // Slimmed from 0.016
      fastenerCount: 0,
    },
    trochanter: {
      radius: 0.036,
      height: 0.052,
      thickness: 0.013,
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
      thickness: 0.009, // Slimmed from 0.012
      offsetZ: 0.022,  // Brought flush with rotary condyle disc radius to eliminate forward gap
      yOffset: 0.000,  // Creates calibrated 5.0mm dark mechanical gap to upper thigh arch
      rotX: 0.000,
    },
    // Structural dark knee housing & C-bracket framing the rotary bearing
    housingWidth: 0.036,
    upperStructureHeight: 0.022,
    lowerStructureHeight: 0.018,
    housingDepth: 0.032,
    jointHousing: {
      innerRadius: 0.025,
      outerRadius: 0.0305,
      width: 0.018,
    },
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
      spineDepth: 0.038, // Slimmed from 0.040
      upperPlateauWidth: 0.036,
      upperPlateauDepth: 0.028,
      upperPlateauHeight: 0.018,
      lowerCollarRadius: 0.027,
    },
    // Segmented white ceramic armor: flows cleanly from knee shelf down to distal ankle collar
    anteriorKeel: {
      widthTop: 0.050, // Preserved exact width
      widthBottom: 0.038, // Preserved exact width
      length: 0.196, // Reduced length along vertical axis (shortened by 30mm)
      thickness: 0.012, // Preserved exact thickness
      keelProtrusion: 0.006, // Preserved exact protrusion
    },
    posteriorCalf: {
      width: 0.054, // Preserved exact width
      height: 0.190, // Increased length along vertical axis (extended by 30mm for more coverage)
      depth: 0.046, // Preserved exact depth
      ventCount: 0,
      spineLedWidth: 0.0030,
      spineLedLength: 0.108, // Extended to match increased calf height
    },
    ledStrip: {
      width: 0.0026,
      depth: 0.0022,
      length: 0.142, // Shortened to match shortened keel shell length
    },
  },

  ankle: {
    // Multi-axis spherical gimbal ankle
    housingRadius: 0.0195, // Slimmed from 0.021
    malleolusDiscRadius: 0.019,
    malleolusDiscWidth: 0.006, // Slimmed from 0.007
    accentRingRadius: 0.0145,
    achillesDamper: {
      cylinderRadius: 0.0048,
      pistonRadius: 0.0030,
      mountY: 0.034, // Lowered from 0.056 for compact, proportionate support rod length matching reference
      mountZ: -0.027, // Aligned with distal shin mounting bracket
      targetY: -0.026,
      targetZ: -0.048,
    },
  },

  foot: {
    // Athletic low-profile elongated robotic foot matching technical blueprint
    length: 0.176,
    width: 0.062,
    height: 0.040, // Slimmed from 0.044 for ultra sleek low profile
    heelOffset: -0.052,
    toeOffset: 0.124,
    soleThickness: 0.0085, // Sleek, thin high-traction dark sole chassis
    treadPadsCount: 5,
    lateralAccent: {
      width: 0.0024,
      length: 0.088,
      depth: 0.0022,
    },
    underglow: {
      width: 0.0035,
      height: 0.003,
      inset: 0.004,
    },
    dorsalPlate: {
      width: 0.050, // Slimmed from 0.054
      length: 0.106,
      thickness: 0.009, // Slimmed from 0.012
    },
    toeCap: {
      width: 0.048, // Slimmed from 0.054
      length: 0.044,
      height: 0.015, // Slimmed from 0.020
    },
    heelThruster: {
      radius: 0.009,
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

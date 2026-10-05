/**
 * Centralized dimensions, proportions, and mechanical constants for the procedural Robot Torso.
 * Adheres strictly to the Master Engineering Reference Blueprint:
 *
 * Dimensions (Reference):
 * - Chest Width: 320 mm (0.320)
 * - Torso Height: 280 mm (0.280)
 * - Abdomen Height: 140 mm (0.140)
 * - Waist Height: 80 mm (0.080)
 * - Pelvis Width: 260 mm (0.260)
 * - Torso Depth: 220 mm (0.220)
 *
 * 3-Segment Articulated Spine (Consistent cylindrical/central core width):
 * - Vertebra 01: y = -0.082, w = 0.078
 * - Vertebra 02: y = -0.118, w = 0.076
 * - Vertebra 03: y = -0.154, w = 0.074
 */

export interface StomachRingSpec {
  name: string;
  radiusX: number;
  radiusZ: number;
  height: number;
  thickness: number;
  yOffset: number;
  frontWidth: number;
  isNarrowest?: boolean;
}

export const TORSO_CONFIG = {
  // Proportions per Reference Blueprint
  proportions: {
    chestPercent: 0.52,
    waistPercent: 0.48,
  },

  // Total torso coordinate bounds
  totalHeight: 0.72,
  baseY: 0.12, // Anchor position in RobotRoot

  // Chest Assembly Dimensions (360 mm width, 220 mm depth — expanded upper chest)
  chest: {
    width: 0.360,
    height: 0.310,
    depth: 0.220,
    frontPlateThickness: 0.026,
    collarRadius: 0.076,
    collarY: 0.124,
    collarZ: 0.004,
    shoulderMountX: 0.210, // Wider shoulder span matching expanded clavicle
    shoulderMountY: 0.052,
    shoulderMountZ: 0.015,
    shoulderMountRadius: 0.056,
    logoWidth: 0.050,
    logoHeight: 0.056,
    logoDepth: 0.006,
  },

  // Abdomen & Spine Section: 5 Articulated Vertebral Modules + Bilateral Actuators
  stomach: {
    height: 0.140, // 140 mm per blueprint
    vertebraCount: 5,
    vertebraY: [-0.082, -0.108, -0.134, -0.158, -0.182] as const,
    vertebraWidth: 0.104,
    vertebraHeight: 0.020,
    vertebraDepth: 0.052,
    internalSpineRadius: 0.022,
    internalSpineHeight: 0.135,

    // Upper Connector receiving chest sternal mount & thoracic bridge
    upperConnector: {
      widthX: 0.150,
      depthZ: 0.076,
      height: 0.016,
      yOffset: -0.068,
    },

    // 5 Articulated Vertebrae Specifications (From bottom to top: small to big)
    rings: [
      { name: 'vertebra01', radiusX: 0.068, radiusZ: 0.038, height: 0.022, thickness: 0.012, yOffset: -0.082, frontWidth: 0.148 }, // Thoracic-to-Abdominal Transition Module
      { name: 'vertebra02', radiusX: 0.060, radiusZ: 0.035, height: 0.020, thickness: 0.012, yOffset: -0.108, frontWidth: 0.128 },
      { name: 'vertebra03', radiusX: 0.053, radiusZ: 0.032, height: 0.019, thickness: 0.012, yOffset: -0.134, frontWidth: 0.112 }, // Mid Thoracic Master Link
      { name: 'vertebra04', radiusX: 0.047, radiusZ: 0.029, height: 0.019, thickness: 0.011, yOffset: -0.158, frontWidth: 0.096 },
      { name: 'vertebra05', radiusX: 0.041, radiusZ: 0.026, height: 0.019, thickness: 0.010, yOffset: -0.182, frontWidth: 0.082 }, // Lumbar Base - Small
    ] as StomachRingSpec[],

    // 5 Tiered Articulated Vertebral Armor Facets (Small to Big from bottom to top, layered depth per Section 8)
    armorPlates: [
      { width: 0.148, height: 0.022, depth: 0.026, y: -0.082, z: 0.044 }, // Vertebra 01 (Thoracic-to-Abdominal Transition Module)
      { width: 0.128, height: 0.020, depth: 0.024, y: -0.108, z: 0.043 }, // Vertebra 02 (Upper Abdomen)
      { width: 0.112, height: 0.019, depth: 0.022, y: -0.134, z: 0.041 }, // Vertebra 03 (Mid Thoracic - Master Link)
      { width: 0.096, height: 0.019, depth: 0.021, y: -0.158, z: 0.039 }, // Vertebra 04 (Lower Abdomen)
      { width: 0.082, height: 0.019, depth: 0.020, y: -0.182, z: 0.037 }, // Vertebra 05 (Lumbar Base - Small)
    ] as const,

    // Backward compatibility aliases
    upperArmor: {
      width: 0.148,
      height: 0.022,
      depth: 0.026,
      y: -0.082,
      z: 0.044,
    },
    lowerArmor: {
      width: 0.082,
      height: 0.019,
      depth: 0.020,
      y: -0.182,
      z: 0.037,
    },

    // Lower Connector distributing load into waist
    lowerConnector: {
      widthX: 0.088,
      depthZ: 0.056,
      height: 0.016,
      yOffset: -0.204,
    },
    lowerAbdomen: {
      widthX: 0.088,
      depthZ: 0.056,
      height: 0.016,
      yOffset: -0.204,
    },

    // Side Actuator Mounting Coordinates (Upper poles wider at chest bottom, bottom poles untouched)
    actuator: {
      upperMount: { x: 0.118, y: -0.066, z: 0.024 },
      lowerMount: { x: 0.076, y: -0.204, z: 0.026 },
      upperX: 0.118,
      upperY: -0.066,
      upperZ: 0.024,
      lowerX: 0.076,
      lowerY: -0.204,
      lowerZ: 0.026,
      cylinderRadius: 0.0160,
      pistonRadius: 0.0072,
    },

    // Dual Side Actuators per side
    dualActuators: {
      outer: {
        upperMount: { x: 0.098, y: -0.066, z: 0.014 },
        lowerMount: { x: 0.076, y: -0.204, z: 0.016 },
        cylinderRadius: 0.0125,
        pistonRadius: 0.0068,
      },
      inner: {
        upperMount: { x: 0.076, y: -0.070, z: 0.006 },
        lowerMount: { x: 0.054, y: -0.204, z: 0.012 },
        cylinderRadius: 0.0090,
        pistonRadius: 0.0052,
      },
    },

    // Multi-Column Kinematic Actuator & Stabilizer Array
    actuatorArray: {
      frontLinear: {
        upperMount: { x: 0.098, y: -0.066, z: 0.014 },
        lowerMount: { x: 0.076, y: -0.204, z: 0.016 },
        cylinderRadius: 0.0125,
        pistonRadius: 0.0068,
        powerCoreLength: 0.034,
      },
      midStabilizer: {
        upperMount: { x: 0.076, y: -0.090, z: 0.002 },
        lowerMount: { x: 0.062, y: -0.205, z: 0.000 },
        columnRadius: 0.0075,
        collarRadius: 0.0105,
      },
      rearLinear: {
        upperMount: { x: 0.076, y: -0.070, z: 0.006 },
        lowerMount: { x: 0.054, y: -0.204, z: 0.012 },
        cylinderRadius: 0.0090,
        pistonRadius: 0.0052,
        powerCoreLength: 0.032,
      },
    },

    // Reference Actuator Specifications (Replicating media_1789199822492.png, media_1789199822498.png, media_1789199822501.png)
    referenceActuators: {
      outerAngled: {
        upperMount: { x: 0.106, y: -0.034, z: 0.016 },
        lowerMount: { x: 0.082, y: -0.200, z: 0.010 },
        cylinderRadius: 0.0092,
        pistonRadius: 0.0055,
        socketRadius: 0.0095,
        socketHeight: 0.012,
      },
      innerGlowing: {
        upperMount: { x: 0.052, y: -0.046, z: -0.006 },
        lowerMount: { x: 0.050, y: -0.198, z: -0.006 },
        cylinderRadius: 0.0084,
        glowingCoreRadius: 0.0076,
        glowingCoreLength: 0.042,
        pistonRadius: 0.0050,
        socketRadius: 0.0088,
        socketHeight: 0.012,
      },
      segmentedSpine: {
        discCount: 5,
        discRadius: 0.029,
        discHeight: 0.018,
        damperHeight: 0.006,
        damperRadius: 0.025,
        yStart: -0.058,
        yStep: 0.028,
      },
    },
  },

  // Rotational Waist Bearing Core (80 mm height per blueprint)
  waist: {
    height: 0.080,
    // 1. Primary Upper Waist Collar
    upperWaistRing: {
      radiusX: 0.084,
      radiusZ: 0.065,
      height: 0.014,
      yOffset: -0.221,
    },
    // 2. Rotational Bearing Turntable Core
    waistCore: {
      upperRadius: 0.070,
      lowerRadius: 0.076,
      height: 0.022,
      yOffset: -0.237,
      innerBoreRadius: 0.032,
    },
    // 3. Lower Waist Collar
    lowerWaistRing: {
      radiusX: 0.086,
      radiusZ: 0.066,
      height: 0.014,
      yOffset: -0.251,
    },
    // 4. Functional Hip Connectors & Pelvis Interface (260 mm pelvis width)
    hipConnector: {
      mountX: 0.096,
      mountY: -0.265,
      mountZ: 0.004,
      hubRadius: 0.020,
      hubWidth: 0.016,
      accentRingRadius: 0.015,
    },

    // Backward compatibility aliases
    upperCollarRadius: 0.084,
    rotationalRingRadius: 0.076,
    coreRadius: 0.070,
    pelvisRadius: 0.086,
    hipCowlX: 0.124,
    hipCowlY: -0.367,
    hipCowlZ: 0.005,
  },

  // Motion limits for robotic articulation
  limits: {
    chest: {
      pitchMin: -0.08,
      pitchMax: 0.14,
      yawMax: 0.18,
      rollMax: 0.06,
    },
    stomach: {
      pitchMin: -0.05,
      pitchMax: 0.08,
      yawMax: 0.10,
      rollMax: 0.04,
    },
    waist: {
      pitchMin: -0.06,
      pitchMax: 0.10,
      yawMax: 0.22,
      rollMax: 0.05,
    },
    // Controller property aliases
    waistPitch: 0.10,
    waistYaw: 0.22,
    waistRoll: 0.05,
  },
} as const;

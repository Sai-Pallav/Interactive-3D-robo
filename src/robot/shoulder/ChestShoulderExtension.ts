/**
 * ============================================================================
 * CHEST SHOULDER EXTENSION & SCULPTED WHITE PAULDRON ASSEMBLY (IMAGE 2 MASTER)
 * ============================================================================
 *
 * Replaces the old boxy rectangular shoulder block with an authentic mecha pauldron cowl:
 * - DESTROYS THE RECTANGULAR BOX: No enclosing front, rear, bottom, or outer white walls.
 * - Single sculpted white pauldron hood arching gracefully over the circular bearing.
 * - Leaves the circular bearing, metallic rings, dark housing, and purple halo 100% exposed!
 * - Deliberate 6mm air gap / black structural shadow between the pauldron and the bearing.
 * - Inboard transition collar connecting cleanly to the chest at X = ±0.175 → ±0.205.
 * ============================================================================
 */

import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { safeMergeGeometries } from '../utils/geometryMerger';
import { geoCache } from '../utils/GeometryCache';
import {
  createMultiAxisShoulderJoint,
  MultiAxisShoulderJointNodes,
} from './MultiAxisShoulderJoint';

export interface ShoulderExtensionNodes {
  group: THREE.Group;
  whiteStructuralAssembly: THREE.Group;
  chestTransitionPanel: THREE.Mesh;
  mountingFrame: THREE.Mesh;
  upperShoulderShell: THREE.Mesh | THREE.Group;
  lowerShoulderShell: THREE.Mesh | THREE.Group;
  frontStructuralPanel: THREE.Mesh | THREE.Group;
  rearStructuralPanel: THREE.Mesh | THREE.Group;
  innerCavityWalls: THREE.Mesh;
  outerShoulderShell: THREE.Group | THREE.Mesh;
  recessHousing: THREE.Mesh;
  extensionCowl: THREE.Group | THREE.Mesh;
  shoulderMountPivot: THREE.Group;
  baseFlange: THREE.Mesh;
  accentRing: THREE.Mesh;
  driveHub: THREE.Mesh;
  faceFlange: THREE.Mesh;
  rearTrussCage: THREE.Group;
  undersideChannel: THREE.Group;
  ledMeshes: THREE.Mesh[];
  multiAxisJoint?: MultiAxisShoulderJointNodes;
  primaryAxisPivot?: THREE.Group;
  secondaryAxisCarrier?: THREE.Group;
  secondaryAxisPivot?: THREE.Group;
  armMount?: THREE.Group;
  armMountingFlange?: THREE.Mesh;
  blackPlateBetweenShellAndRotational?: THREE.Mesh | THREE.Group;
}

// Shoulder Joint Axis Centerline (Model/Torso Space)
const Y_CENTER = 0.052;
const Z_CENTER = 0.015;

/**
 * Returns seam coordinate on the chest socket aperture where the extension mates flush.
 */
function getChestSeamPoint(sector: number, totalSectors: number, side: -1 | 1): { x: number; y: number; z: number } {
  const angle = (sector / totalSectors) * Math.PI * 2;
  const sinA = Math.sin(angle);
  const cosA = Math.cos(angle);

  let py = Y_CENTER + 0.054 * sinA;
  let pz = Z_CENTER + 0.058 * cosA;
  let xDepth = 0.174;

  if (sinA >= 0 && cosA >= 0) {
    const t = cosA;
    py = 0.108 * (1 - t) + 0.052 * t;
    pz = 0.018 * (1 - t) + 0.076 * t;
    xDepth = 0.155 * (1 - t) + 0.178 * t;
  } else if (sinA >= 0 && cosA < 0) {
    const t = -cosA;
    py = 0.108 * (1 - t) + 0.065 * t;
    const easeT = Math.pow(t, 0.45);
    pz = 0.018 * (1 - easeT) - 0.082 * easeT;
    xDepth = 0.155 * (1 - easeT) + 0.130 * easeT;
  } else if (sinA < 0 && cosA < 0) {
    const t = -cosA;
    py = 0.065 * t + 0.012 * (1 - t);
    pz = -0.082 * t + 0.015 * (1 - t);
    xDepth = 0.130 * t + 0.165 * (1 - t);
  } else {
    const t = cosA;
    py = 0.012 * (1 - t) + 0.052 * t;
    pz = 0.015 * (1 - t) + 0.076 * t;
    xDepth = 0.165 * (1 - t) + 0.178 * t;
  }

  return {
    x: side * xDepth,
    y: py,
    z: pz,
  };
}

/**
 * Creates the inboard white transitional collar (chestTransitionPanel).
 * Bridges flush from the chest armor (X ≈ ±0.175) to the base of the shoulder socket (X = ±0.205).
 * STOPS at X = ±0.205 so it NEVER covers the shoulder bearing mechanism!
 */
function createChestTransitionGeometry(side: -1 | 1): THREE.BufferGeometry {
  const SECTORS = 24;
  const positions: number[] = [];

  function pushQuad(
    p1: { x: number; y: number; z: number },
    p2: { x: number; y: number; z: number },
    p3: { x: number; y: number; z: number },
    p4: { x: number; y: number; z: number }
  ) {
    if (side === 1) {
      positions.push(p1.x, p1.y, p1.z, p3.x, p3.y, p3.z, p2.x, p2.y, p2.z);
      positions.push(p1.x, p1.y, p1.z, p4.x, p4.y, p4.z, p3.x, p3.y, p3.z);
    } else {
      positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z);
      positions.push(p1.x, p1.y, p1.z, p3.x, p3.y, p3.z, p4.x, p4.y, p4.z);
    }
  }

  const ring0 = [];
  const ring1 = [];
  const ring2 = [];
  const ring3 = [];
  const ring4 = [];

  const collarR = 0.0488;

  for (let s = 0; s < SECTORS; s++) {
    const angle = (s / SECTORS) * Math.PI * 2;
    const seam = getChestSeamPoint(s, SECTORS, side);
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    ring0.push(seam);

    ring1.push({
      x: side * (Math.abs(seam.x) * 0.40 + 0.188 * 0.60),
      y: seam.y * 0.40 + (Y_CENTER + collarR * sinA) * 0.60,
      z: seam.z * 0.40 + (Z_CENTER + collarR * cosA) * 0.60,
    });

    ring2.push({
      x: side * 0.192,
      y: Y_CENTER + collarR * 0.96 * sinA,
      z: Z_CENTER + collarR * 0.96 * cosA,
    });

    ring3.push({
      x: side * 0.196,
      y: Y_CENTER + collarR * 0.99 * sinA,
      z: Z_CENTER + collarR * 0.99 * cosA,
    });

    ring4.push({
      x: side * 0.199,
      y: Y_CENTER + collarR * sinA,
      z: Z_CENTER + collarR * cosA,
    });
  }

  // Connect upper clavicle arch and anterior/posterior wraps (s = 23 through 0 to 13: 210° arch)
  // Leaves the lower underside 100% open so the black mechanical joint, bearing, and connector are exposed!
  for (let idx = 0; idx < 14; idx++) {
    const s = (23 + idx) % SECTORS;
    const next = (s + 1) % SECTORS;
    pushQuad(ring0[s], ring0[next], ring1[next], ring1[s]);
    pushQuad(ring1[s], ring1[next], ring2[next], ring2[s]);
    pushQuad(ring2[s], ring2[next], ring3[next], ring3[s]);
    pushQuad(ring3[s], ring3[next], ring4[next], ring4[s]);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

/**
 * 1. Upper Shoulder Shell (Sculpted Compact Wrapped Shoulder Cowl - Region A)
 * Transforms the former block-like rectangular cap into a compact wrapped protective shell:
 * - Subtle arched convex crown across top eliminating the flat boxy ceiling (Requirement 3B)
 * - Inboard edge reaches seamlessly to meet chest collar at X ≈ ±0.198 (Requirement 3C)
 * - Wraps smoothly over circular joint rather than flaring out sharp wings (Requirement 3A, 3B)
 * - Shallow contoured opening leaves dark joint housing, purple detail, and connector visibly exposed (Requirement 3D, 3E)
 * - Outboard rim cleanly frames the recessed circular bearing with hard-surface beveling (Requirement 3F)
 * - Subtle flank taper preserves compact futuristic humanoid silhouette (Requirement 3B)
 */
/**
 * Mathematical surface point evaluator for the sculpted shoulder cowl.
 * Evaluates position on the outer (layer 0) or inner (layer 1) surface.
 */
function evaluatePauldronPoint(
  u: number, // 0 = anterior (front), 0.5 = apex (top), 1.0 = posterior (rear)
  v: number, // 0 = inboard (chest), 1.0 = outboard (lateral ring)
  layer: 0 | 1,
  side: -1 | 1,
  offset: number = 0
): THREE.Vector3 {
  // 1. Refined Hard-Surface Pauldron Cowl Extension (Towards Shoulder & Arm)
  // Replaces the former gaping arch cutout with an athletic, protective mecha cowl.
  // Extends smoothly over the dark titanium actuator cylinder and frames the shoulder joint,
  // while preserving generous, pristine clearance above the lower rotary black bearing.
  const vClamped = Math.max(0, Math.min(1, v));
  // Continuous downward extension in midspan giving complete armor coverage over shoulder joint
  // Leaves 9mm pristine mechanical clearance above the black rotary bearing
  const midCoverage = Math.sin(vClamped * Math.PI) * 0.070 * Math.PI;
  const startAngle = -0.085 * Math.PI - midCoverage;
  const endAngle = 1.085 * Math.PI + midCoverage;
  const angle = startAngle * (1 - u) + endAngle * u;

  const sinA = Math.sin(angle);
  const cosA = Math.cos(angle);

  // 2. Base inner radius & solid ceramic armor thickness (4.8mm)
  const rInner = 0.0485;
  const armorThick = 0.0048;

  // Hard-surface crest ridge crease along apex (u ≈ 0.5)
  const crestSharpness = Math.max(0, 1.0 - Math.abs(u - 0.5) / 0.16);
  const crestLift = Math.pow(crestSharpness, 1.5) * 0.0018;

  // Longitudinal crown
  const archCrown = 0.0012 * Math.sin(u * Math.PI);

  let rOuter = rInner + armorThick + archCrown + crestLift;

  // Sleek beveled return chamfer framing the outer rotational ring (v > 0.80)
  if (v > 0.80) {
    const tBevel = (v - 0.80) / 0.20;
    rOuter -= Math.pow(tBevel, 1.5) * 0.0016;
  }

  // 3. Lateral span X — Extended outward towards the shoulder rotational joint
  // Inboard: X = -0.0340 (flush with chest collar at X ≈ 0.2000)
  // Outboard: Extended to X = +0.0232 to interface flush with the metallic bearing race bezel
  const xInboard = -0.0340 + 0.0015 * Math.sin(u * Math.PI);
  const xOutboard = 0.0236; // Aligned with the outer bearing lip (0.0235) framing the purple accent halo
  let xSpan = xInboard * (1 - v) + xOutboard * v;

  const radius = (layer === 0 ? rOuter : rInner) + offset;
  let y = radius * sinA;
  let z = radius * cosA;
  let x = side * xSpan;

  // Outboard 45° beveled rim: inner layer steps slightly inboard (by 1.8mm)
  if (v > 0.85 && layer === 1) {
    const tRim = (v - 0.85) / 0.15;
    x -= side * tRim * 0.0018;
  }

  return new THREE.Vector3(x, y, z);
}

/**
 * Computes the local orthonormal tangent frame (position, outward normal, tangentU, tangentV, quaternion)
 * at any (u, v) parameter coordinates on the pauldron surface.
 */
function getPauldronFrame(
  u: number,
  v: number,
  side: -1 | 1,
  offset: number = 0
): { p: THREE.Vector3; n: THREE.Vector3; tangentU: THREE.Vector3; tangentV: THREE.Vector3; quat: THREE.Quaternion } {
  const eps = 0.004;
  const p = evaluatePauldronPoint(u, v, 0, side, offset);
  const pU = evaluatePauldronPoint(Math.min(1.0, u + eps), v, 0, side, offset);
  const pV = evaluatePauldronPoint(u, Math.min(1.0, v + eps), 0, side, offset);

  const tU = new THREE.Vector3().subVectors(pU, p).normalize();
  const tV = new THREE.Vector3().subVectors(pV, p).normalize();
  const n = new THREE.Vector3().crossVectors(tV, tU).multiplyScalar(side).normalize();

  const tangentU = new THREE.Vector3().crossVectors(n, tV).normalize();
  const tangentV = new THREE.Vector3().crossVectors(tangentU, n).normalize();

  const rotMat = new THREE.Matrix4().makeBasis(tangentV, n, tangentU);
  const quat = new THREE.Quaternion().setFromRotationMatrix(rotMat);

  return { p, n, tangentU, tangentV, quat };
}

/**
 * Generates a curved ribbon strip following the pauldron surface.
 * Used for precision recessed dark titanium panel seams.
 */
function createCurvedRibbon(
  u0: number,
  u1: number,
  v0: number,
  v1: number,
  side: -1 | 1,
  uSteps: number,
  vSteps: number,
  offset: number = 0.0004
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  for (let iu = 0; iu <= uSteps; iu++) {
    const u = u0 + (u1 - u0) * (iu / uSteps);
    for (let iv = 0; iv <= vSteps; iv++) {
      const v = v0 + (v1 - v0) * (iv / vSteps);
      const pt = evaluatePauldronPoint(u, v, 0, side, offset);
      positions.push(pt.x, pt.y, pt.z);
    }
  }

  for (let iu = 0; iu < uSteps; iu++) {
    for (let iv = 0; iv < vSteps; iv++) {
      const a = iu * (vSteps + 1) + iv;
      const b = a + 1;
      const c = a + (vSteps + 1);
      const d = c + 1;
      if (side === 1) {
        indices.push(a, b, c);
        indices.push(b, d, c);
      } else {
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * 1. Upper Shoulder Shell (Sculpted Compact Wrapped Shoulder Cowl - Region A)
 * Continuous sculpted white ceramic pauldron cowl with hard-surface crest facets.
 */
function createSculptedPauldronGeometry(side: -1 | 1): THREE.BufferGeometry {
  const uSegs = 36; // along arch (anterior front -> apex top -> posterior rear)
  const vSegs = 28; // across width (inboard chest -> outboard lateral bearing)
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Generate outer (0) and inner (1) surfaces
  for (let layer = 0; layer <= 1; layer++) {
    for (let iu = 0; iu <= uSegs; iu++) {
      for (let iv = 0; iv <= vSegs; iv++) {
        const u = iu / uSegs;
        const v = iv / vSegs;
        const p = evaluatePauldronPoint(u, v, layer as 0 | 1, side);
        positions.push(p.x, p.y, p.z);
        uvs.push(iv / vSegs, iu / uSegs);
      }
    }
  }

  const layerStride = (uSegs + 1) * (vSegs + 1);

  // Outer surface triangles
  for (let iu = 0; iu < uSegs; iu++) {
    for (let iv = 0; iv < vSegs; iv++) {
      const a = iu * (vSegs + 1) + iv;
      const b = a + 1;
      const c = a + (vSegs + 1);
      const d = c + 1;
      if (side === 1) {
        indices.push(a, b, c);
        indices.push(b, d, c);
      } else {
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }
  }

  // Inner surface triangles (reverse winding)
  for (let iu = 0; iu < uSegs; iu++) {
    for (let iv = 0; iv < vSegs; iv++) {
      const a = layerStride + iu * (vSegs + 1) + iv;
      const b = a + 1;
      const c = a + (vSegs + 1);
      const d = c + 1;
      if (side === 1) {
        indices.push(a, c, b);
        indices.push(b, c, d);
      } else {
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }
  }

  // Perimeter bevel edges
  // Front edge (iu = 0)
  for (let iv = 0; iv < vSegs; iv++) {
    const oA = iv;
    const oB = iv + 1;
    const iA = layerStride + iv;
    const iB = layerStride + iv + 1;
    if (side === 1) {
      indices.push(oA, iA, oB);
      indices.push(oB, iA, iB);
    } else {
      indices.push(oA, oB, iA);
      indices.push(oB, iB, iA);
    }
  }

  // Rear edge (iu = uSegs)
  const rearOffset = uSegs * (vSegs + 1);
  for (let iv = 0; iv < vSegs; iv++) {
    const oA = rearOffset + iv;
    const oB = rearOffset + iv + 1;
    const iA = layerStride + rearOffset + iv;
    const iB = layerStride + rearOffset + iv + 1;
    if (side === 1) {
      indices.push(oA, oB, iA);
      indices.push(oB, iB, iA);
    } else {
      indices.push(oA, iA, oB);
      indices.push(oB, iB, iA);
    }
  }

  // Inboard edge (iv = 0)
  for (let iu = 0; iu < uSegs; iu++) {
    const oA = iu * (vSegs + 1);
    const oC = (iu + 1) * (vSegs + 1);
    const iA = layerStride + oA;
    const iC = layerStride + oC;
    if (side === 1) {
      indices.push(oA, oC, iA);
      indices.push(oC, iC, iA);
    } else {
      indices.push(oA, iA, oC);
      indices.push(oC, iA, iC);
    }
  }

  // Outboard edge (iv = vSegs)
  for (let iu = 0; iu < uSegs; iu++) {
    const oA = iu * (vSegs + 1) + vSegs;
    const oC = (iu + 1) * (vSegs + 1) + vSegs;
    const iA = layerStride + oA;
    const iC = layerStride + oC;
    if (side === 1) {
      indices.push(oA, iA, oC);
      indices.push(oC, iA, iC);
    } else {
      indices.push(oA, oC, iA);
      indices.push(oC, iA, iC);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Clean, pristine white ceramic pauldron shell without scratch marks or artificial surface grooves.
 */
function createPauldronPanelSeams(
  side: -1 | 1,
  _materials: RobotMaterialPalette
): THREE.Group {
  const group = new THREE.Group();
  group.name = side === -1 ? 'LeftPauldronPanelSeams' : 'RightPauldronPanelSeams';
  // Surface scratches/grooves removed to ensure flawless, seamless white ceramic finish
  return group;
}

/**
 * Creates dark titanium concentric sub-rim seal ring underneath the outboard armor edge,
 * providing realistic mechanical depth behind the white ceramic casing.
 */
function createPauldronSubRim(
  side: -1 | 1,
  materials: RobotMaterialPalette
): THREE.Group {
  const group = new THREE.Group();
  group.name = side === -1 ? 'LeftPauldronSubRim' : 'RightPauldronSubRim';

  // Sub-rim reveal ribbon extending under the white armor edge to meet the rotational ring
  const subRimGeo = geoCache.get(`PauldronSubRimGeo_${side}`, () => createCurvedRibbon(0.03, 0.97, 0.94, 1.02, side, 28, 2, -0.0008));
  const subRimMesh = new THREE.Mesh(subRimGeo, materials.joint);
  subRimMesh.name = 'PauldronSubRim_TitaniumSeal';
  subRimMesh.castShadow = true;
  group.add(subRimMesh);

  // Precision metallic labyrinth seal wire
  const raceGeo = geoCache.get(`PauldronRaceGeo_${side}`, () => createCurvedRibbon(0.06, 0.94, 0.97, 0.995, side, 24, 1, -0.0003));
  const raceMesh = new THREE.Mesh(raceGeo, materials.metallic);
  raceMesh.name = 'PauldronSubRim_MetallicRace';
  group.add(raceMesh);

  return group;
}

/**
 * Creates the complete refined Upper Shoulder Shell assembly:
 * - Solid sculpted white ceramic pauldron cowl with hard-surface crest facet (Section 3F)
 * - Section 3E contoured lower clearance arch wrapping cleanly over the joint
 * - Precision dark titanium scribed panel seams (no bulky greebles)
 * - Concentric dark titanium sub-rim dust seal framing the rotational ring
 * - Pure horizontal alignment with the joint rotation axis
 */
function createUpperShoulderShell(
  side: -1 | 1,
  materials: RobotMaterialPalette,
  _ledMeshes?: THREE.Mesh[]
): THREE.Group {
  const group = new THREE.Group();
  group.name = side === -1 ? 'LeftUpperShoulderShell' : 'RightUpperShoulderShell';

  // 1. Continuous sculpted white ceramic pauldron cowl
  const geo = geoCache.get(`SculptedPauldronGeo_${side}`, () => createSculptedPauldronGeometry(side));
  const mesh = new THREE.Mesh(geo, materials.armorDoubleSide);
  mesh.name = side === -1 ? 'LeftUpperShoulderHood' : 'RightUpperShoulderHood';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  // 2. Precision dark titanium recessed panel seams
  const panelSeams = createPauldronPanelSeams(side, materials);
  group.add(panelSeams);

  // 3. Dark titanium sub-rim dust seal reveal framing the rotational ring
  const subRim = createPauldronSubRim(side, materials);
  group.add(subRim);

  // Concentric placement aligned with the rotational joint centerline
  group.position.set(side * 0.234, Y_CENTER, Z_CENTER);
  group.rotation.set(0, 0, 0);

  return group;
}

/**
 * 1B. Outer Shoulder Shell (Integrated lateral bracket / bezel)
 */
function createOuterShoulderShell(
  side: -1 | 1,
  _materials: RobotMaterialPalette
): THREE.Group {
  const group = new THREE.Group();
  group.name = side === -1 ? 'LeftOuterShoulderShell' : 'RightOuterShoulderShell';
  // Outer lateral trim is cleanly integrated directly into the sculpted pauldron bevel rim
  return group;
}

/**
 * 1C. Rear Shoulder Shell (Internal structural rib)
 */
function createRearShoulderShell(
  side: -1 | 1,
  _materials: RobotMaterialPalette
): THREE.Group {
  const group = new THREE.Group();
  group.name = side === -1 ? 'LeftRearShoulderShell' : 'RightRearShoulderShell';
  // Keep clean unobstructed view of mechanical joint from rear (Section 17 Back check)
  return group;
}

/**
 * 1D. Lower Shoulder Bracket (Internal structural anchor)
 */
function createLowerShoulderBracket(
  side: -1 | 1,
  _materials: RobotMaterialPalette
): THREE.Group {
  const group = new THREE.Group();
  group.name = side === -1 ? 'LeftLowerShoulderShell' : 'RightLowerShoulderShell';
  // Cleanly eliminated exterior cradle block to allow full visibility of layered connector
  return group;
}

/**
 * 2. Dark Titanium Mounting Bulkhead (mountingFrame).
 * Sits inside the inboard socket at X = ±0.198 with 12 radial socket cap screws.
 */
function createMountingBulkhead(
  side: -1 | 1,
  materials: RobotMaterialPalette
): THREE.Mesh {
  const plateRadius = 0.0440;
  const innerR = 0.0380;

  const geo = geoCache.get('MountingBulkheadPlateGeo', () => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, plateRadius, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, innerR, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.0035,
      bevelEnabled: true,
      bevelThickness: 0.0010,
      bevelSize: 0.0008,
      bevelSegments: 2,
      curveSegments: 32,
    });
    g.center();
    return g;
  });

  const mesh = new THREE.Mesh(geo, materials.joint);
  mesh.name = side === -1 ? 'LeftMountingFrame' : 'RightMountingFrame';
  mesh.rotation.y = Math.PI / 2;
  mesh.position.set(side * 0.198, Y_CENTER, Z_CENTER);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const boltGeo = geoCache.get('MountingBulkheadBoltGeo', () => {
    const g = new THREE.CylinderGeometry(0.0013, 0.0013, 0.0035, 6);
    g.rotateZ(Math.PI / 2);
    return g;
  });

  const mergedBoltsGeo = geoCache.get(`MountingBulkheadMergedBoltsGeo_${side}`, () => {
    const boltItems: { geometry: THREE.BufferGeometry; matrix: THREE.Matrix4 }[] = [];
    for (let b = 0; b < 12; b++) {
      const angle = (b / 12) * Math.PI * 2;
      const m = new THREE.Matrix4().makeTranslation(
        side * 0.0020,
        Math.sin(angle) * 0.0410,
        Math.cos(angle) * 0.0410
      );
      boltItems.push({ geometry: boltGeo, matrix: m });
    }
    return safeMergeGeometries(boltItems);
  });

  if (mergedBoltsGeo) {
    const boltMesh = new THREE.Mesh(mergedBoltsGeo, materials.metallic);
    boltMesh.name = `${mesh.name}_Bolts_Merged`;
    mesh.add(boltMesh);
  }

  return mesh;
}

/**
 * Creates the complete Chest Shoulder Extension Assembly.
 */
export function createChestShoulderExtension(
  side: -1 | 1,
  materials: RobotMaterialPalette
): ShoulderExtensionNodes {
  const group = new THREE.Group();
  group.name = side === -1 ? 'LeftShoulderModule' : 'RightShoulderModule';

  const ledMeshes: THREE.Mesh[] = [];

  // ==========================================================================
  // SYSTEM A: WHITE STRUCTURAL ARMOR (Stationary Load-Bearing Protective Cradle)
  // ==========================================================================
  const whiteStructuralAssembly = new THREE.Group();
  whiteStructuralAssembly.name =
    side === -1 ? 'LeftWhiteStructuralAssembly' : 'RightWhiteStructuralAssembly';
  group.add(whiteStructuralAssembly);

  // 1. Inboard White Collar (chestTransitionPanel) — stops at X = ±0.205
  const transitionGeo = geoCache.get(`ChestTransitionGeo_${side}`, () => createChestTransitionGeometry(side));
  const chestTransitionPanel = new THREE.Mesh(transitionGeo, materials.armorDoubleSide);
  chestTransitionPanel.name =
    side === -1 ? 'LeftChestTransitionPanel' : 'RightChestTransitionPanel';
  chestTransitionPanel.castShadow = true;
  chestTransitionPanel.receiveShadow = true;
  whiteStructuralAssembly.add(chestTransitionPanel);

  // 2. Dark Titanium Mounting Bulkhead at socket interface
  const mountingFrame = createMountingBulkhead(side, materials);
  whiteStructuralAssembly.add(mountingFrame);
  const recessHousing = mountingFrame;

  // 3. Arched White Shoulder Pauldron Cowl (Mantle arching over joint)
  const upperShoulderShell = createUpperShoulderShell(side, materials, ledMeshes);
  whiteStructuralAssembly.add(upperShoulderShell);

  const innerCavityWalls = new THREE.Mesh(); // stub for interface compatibility

  // 4. Multi-piece Shoulder Armor Panels (Pieces B, C, E)
  const outerShoulderShell = createOuterShoulderShell(side, materials);
  whiteStructuralAssembly.add(outerShoulderShell);

  const frontStructuralPanel = new THREE.Group();
  frontStructuralPanel.name = side === -1 ? 'LeftFrontShoulderPanel' : 'RightFrontShoulderPanel';
  whiteStructuralAssembly.add(frontStructuralPanel);

  const rearStructuralPanel = createRearShoulderShell(side, materials);
  whiteStructuralAssembly.add(rearStructuralPanel);

  const lowerShoulderShell = createLowerShoulderBracket(side, materials);
  whiteStructuralAssembly.add(lowerShoulderShell);

  const extensionCowl = upperShoulderShell;

  // ==========================================================================
  // SYSTEM B: DARK MECHANICAL SHOULDER JOINT & CIRCULAR BEARING MODULE
  // Centered at X = ±0.245, Y = 0.052, Z = 0.015
  // ==========================================================================
  const multiAxisJoint = createMultiAxisShoulderJoint(side, materials, ledMeshes);
  group.add(multiAxisJoint.foundation);

  const rearTrussCage = new THREE.Group();
  rearTrussCage.name = side === -1 ? 'LeftShoulderRearTruss' : 'RightShoulderRearTruss';
  group.add(rearTrussCage);

  const undersideChannel = new THREE.Group();
  undersideChannel.name =
    side === -1 ? 'LeftShoulderUndersideChannel' : 'RightShoulderUndersideChannel';
  group.add(undersideChannel);

  return {
    group,
    whiteStructuralAssembly,
    chestTransitionPanel,
    mountingFrame,
    upperShoulderShell,
    lowerShoulderShell,
    frontStructuralPanel,
    rearStructuralPanel,
    innerCavityWalls,
    outerShoulderShell,
    recessHousing,
    extensionCowl,
    shoulderMountPivot: multiAxisJoint.shoulderJoint,
    baseFlange: multiAxisJoint.stationaryCollar,
    accentRing: multiAxisJoint.accentRing,
    driveHub: multiAxisJoint.driveHub,
    faceFlange: multiAxisJoint.armMountingFlange,
    rearTrussCage,
    undersideChannel,
    ledMeshes,
    multiAxisJoint,
    primaryAxisPivot: multiAxisJoint.primaryAxisPivot,
    secondaryAxisCarrier: multiAxisJoint.secondaryAxisCarrier,
    secondaryAxisPivot: multiAxisJoint.secondaryAxisPivot,
    armMount: multiAxisJoint.armMount,
    armMountingFlange: multiAxisJoint.armMountingFlange,
    blackPlateBetweenShellAndRotational: multiAxisJoint.blackPlateBetweenShellAndRotational,
  };
}

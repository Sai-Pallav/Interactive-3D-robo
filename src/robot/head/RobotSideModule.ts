import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { ROBOT_ACCENT } from '../config';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger';
import { geoCache } from '../utils/GeometryCache';

export interface SideModuleNodes {
  group: THREE.Group;
  mount: THREE.Mesh;
  outerRing: THREE.Mesh;
  innerRing: THREE.Mesh;
  emissiveRing: THREE.Mesh;
  coreRingWhite: THREE.Mesh;
  core: THREE.Mesh;
  centerLens: THREE.Mesh;
  pointLight: THREE.PointLight;
}

/**
 * Creates the concentric circular ear modules per Part 7, 8, 11:
 * - Nested directly into the temple cutout arch of the helmet
 * - Concentric stepped mechanical cylinders and chamfered rings
 * - Vibrant illuminated purple ring with pure white core
 * - Dark recessed center dish and aperture pin
 */
export function createRobotSideModule(
  side: -1 | 1,
  materials: RobotMaterialPalette
): SideModuleNodes {
  const group = new THREE.Group();
  group.name = side === -1 ? 'LeftSideModule' : 'RightSideModule';

  // Position: Centered at anatomical ear position on lateral cranium (y = 0.020, z = -0.015)
  group.position.set(side * 0.136, 0.020, -0.015);

  // Rotation: Faces purely outward perpendicular to lateral skull
  group.rotation.set(0, side * (Math.PI / 2), 0);

  // 1. White Armor Mounting Cowl (Part 8: Integrates hardware into helmet shell)
  const mountGeo = geoCache.get('EarMountGeo', () => new THREE.TorusGeometry(0.044, 0.0050, 16, 40));
  const mount = new THREE.Mesh(mountGeo, materials.armor);
  mount.name = 'EarMount';
  mount.position.set(0, 0, -0.002);
  mount.castShadow = true;
  group.add(mount);

  const earJointGroup = new THREE.Group();

  // 2. Dark Titanium Stepped Outer Rotary Bezel (Part 7: outer dark-metal ring)
  const outerRingGeo = geoCache.get('EarOuterRingGeo', () => new THREE.CylinderGeometry(0.038, 0.042, 0.012, 40));
  const outerRing = new THREE.Mesh(outerRingGeo, materials.joint);
  outerRing.name = 'EarOuterRing';
  outerRing.rotation.x = Math.PI / 2;
  outerRing.position.set(0, 0, 0.005);
  outerRing.castShadow = true;
  earJointGroup.add(outerRing);

  // Recessed dark chamber
  const chamberGeo = geoCache.get('EarChamberGeo', () => new THREE.CylinderGeometry(0.035, 0.035, 0.008, 36));
  const chamber = new THREE.Mesh(chamberGeo, materials.joint);
  chamber.rotation.x = Math.PI / 2;
  chamber.position.set(0, 0, 0.010);
  earJointGroup.add(chamber);

  // 3. Chamfered Metallic Inner Rim Ring (Part 7: inner metallic ring)
  const innerRingGeo = geoCache.get('EarInnerRingGeo', () => new THREE.TorusGeometry(0.033, 0.0020, 16, 40));
  const innerRing = new THREE.Mesh(innerRingGeo, materials.joint);
  innerRing.name = 'EarInnerRing';
  innerRing.position.set(0, 0, 0.014);
  earJointGroup.add(innerRing);

  // 4. Glowing Neon Purple Ring (Part 7 & 15: ROBOT_ACCENT)
  const emissiveRingGeo = geoCache.get('EarEmissiveRingGeo', () => new THREE.TorusGeometry(0.026, 0.0036, 20, 48));
  const emissiveRing = new THREE.Mesh(emissiveRingGeo, materials.purpleEmissive);
  emissiveRing.name = 'EarEmissiveRing';
  emissiveRing.position.set(0, 0, 0.016);
  group.add(emissiveRing);

  // Incandescent pure white core inside the glowing purple torus
  const coreRingWhiteGeo = geoCache.get('EarCoreRingWhiteGeo', () => new THREE.TorusGeometry(0.026, 0.0012, 16, 48));
  const coreRingWhite = new THREE.Mesh(coreRingWhiteGeo, materials.whiteCoreEmissive);
  coreRingWhite.name = 'EarCoreRingWhite';
  coreRingWhite.position.set(0, 0, 0.017);
  group.add(coreRingWhite);

  // 5. Recessed Circular Sensor Core (Part 7: recessed circular core)
  const coreGeo = geoCache.get('EarCoreGeo', () => new THREE.CylinderGeometry(0.016, 0.014, 0.007, 32));
  const core = new THREE.Mesh(coreGeo, materials.joint);
  core.name = 'EarCore';
  core.rotation.x = Math.PI / 2;
  core.position.set(0, 0, 0.012);
  earJointGroup.add(core);

  // 6. Central Dark Lens / Aperture Pin (Part 7: central dark lens)
  const centerLensGeo = geoCache.get('EarCenterLensGeo', () => new THREE.CylinderGeometry(0.003, 0.003, 0.008, 16));
  const centerLens = new THREE.Mesh(centerLensGeo, materials.joint);
  centerLens.name = 'EarCenterLens';
  centerLens.rotation.x = Math.PI / 2;
  centerLens.position.set(0, 0, 0.017);
  earJointGroup.add(centerLens);

  // Merge static joint hardware of the ear module
  const cachedMergedEarJointGeo = geoCache.get('EarJointMergedGeo', () => {
    const merged = mergeGroupMeshesByMaterial(earJointGroup, materials.joint, 'EarJointMerged', false);
    return merged ? merged.geometry : null;
  });
  if (cachedMergedEarJointGeo) {
    const mergedEarJoint = new THREE.Mesh(cachedMergedEarJointGeo, materials.joint);
    mergedEarJoint.name = `${group.name}_JointMerged`;
    mergedEarJoint.castShadow = true;
    mergedEarJoint.receiveShadow = true;
    group.add(mergedEarJoint);
  }

  // Subtle local point light casting soft purple aura on lateral helmet and shoulder
  const pointLight = new THREE.PointLight(ROBOT_ACCENT, 1.8, 0.45);
  pointLight.position.set(0, 0, 0.030);
  group.add(pointLight);

  return {
    group,
    mount,
    outerRing,
    innerRing,
    emissiveRing,
    coreRingWhite,
    core,
    centerLens,
    pointLight,
  };
}

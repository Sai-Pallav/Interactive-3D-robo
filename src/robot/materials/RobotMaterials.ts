import * as THREE from 'three';
import { ROBOT_ACCENT } from '../config';

export interface RobotMaterialPalette {
  armor: THREE.MeshPhysicalMaterial;
  armorDoubleSide: THREE.MeshPhysicalMaterial;
  visor: THREE.MeshPhysicalMaterial;
  joint: THREE.MeshPhysicalMaterial;
  jointDoubleSide: THREE.MeshPhysicalMaterial;
  visorOuterFrame: THREE.MeshPhysicalMaterial;
  purpleEmissive: THREE.MeshBasicMaterial;
  whiteCoreEmissive: THREE.MeshBasicMaterial;
  purpleBloom: THREE.MeshBasicMaterial;
  metallic: THREE.MeshPhysicalMaterial;
  machinedLink: THREE.MeshPhysicalMaterial;
}

/**
 * Creates unified PBR materials adhering to P3:
 * - White Ceramic Armor: dimensional gradient shading, realistic specular roll-off, satiny sheen, no pure #ffffff clipping
 * - Black Mechanical Components: gunmetal titanium with controlled reflections, specular highlights, and ambient depth
 * - Obsidian Visor: deep obsidian black with mirror clearcoat
 * - Purple Emissive: subtle and controlled brand accent
 */
export function createRobotMaterials(): RobotMaterialPalette {
  const armor = new THREE.MeshPhysicalMaterial({
    color: 0xe2e7f4, // Luminous pearl ceramic off-white with smooth gradient falloff
    roughness: 0.22, // Silky smooth ceramic surface
    metalness: 0.12, // Subtle dielectric highlight
    clearcoat: 0.98, // Liquid-smooth clearcoat lacquer
    clearcoatRoughness: 0.06,
    sheen: 0.36,
    sheenColor: new THREE.Color(0xb4c2e6),
    sheenRoughness: 0.30,
    reflectivity: 0.95,
    name: 'RobotWhiteArmorMaterial',
  });

  const armorDoubleSide = armor.clone();
  armorDoubleSide.side = THREE.DoubleSide;
  armorDoubleSide.name = 'RobotWhiteArmorDoubleSideMaterial';

  const visor = new THREE.MeshPhysicalMaterial({
    color: 0x020108, // Deep obsidian glossy mirror
    roughness: 0.01,
    metalness: 0.18,
    clearcoat: 1.0,
    clearcoatRoughness: 0.01,
    reflectivity: 1.0,
    ior: 1.62,
    name: 'RobotObsidianVisorMaterial',
  });

  const joint = new THREE.MeshPhysicalMaterial({
    color: 0x141624, // Rich gunmetal titanium with specular depth
    roughness: 0.30, // Satin brushed titanium
    metalness: 0.90, // Real metallic reflectance
    clearcoat: 0.42,
    clearcoatRoughness: 0.16,
    reflectivity: 0.94,
    name: 'RobotDarkTitaniumMaterial',
  });

  const jointDoubleSide = joint.clone();
  jointDoubleSide.side = THREE.DoubleSide;
  jointDoubleSide.name = 'RobotDarkTitaniumDoubleSideMaterial';

  const visorOuterFrame = new THREE.MeshPhysicalMaterial({
    color: 0x101218,
    roughness: 0.32,
    metalness: 0.88,
    clearcoat: 0.35,
    clearcoatRoughness: 0.22,
    name: 'RobotVisorOuterFrameMaterial',
  });

  const purpleEmissive = new THREE.MeshBasicMaterial({
    color: ROBOT_ACCENT,
    toneMapped: false,
    name: 'RobotPurpleEmissiveMaterial',
  });

  const whiteCoreEmissive = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    toneMapped: false,
    name: 'RobotWhiteCoreEmissiveMaterial',
  });

  const purpleBloom = new THREE.MeshBasicMaterial({
    color: ROBOT_ACCENT,
    transparent: true,
    opacity: 0.18,
    toneMapped: false,
    name: 'RobotPurpleBloomMaterial',
  });

  const metallic = new THREE.MeshPhysicalMaterial({
    color: 0xd8e2f0, // Polished high-specular chrome / stainless steel
    roughness: 0.14,
    metalness: 0.96,
    clearcoat: 0.92,
    clearcoatRoughness: 0.06,
    reflectivity: 1.0,
    name: 'RobotMetallicMaterial',
  });

  const machinedLink = new THREE.MeshPhysicalMaterial({
    color: 0xdde6f5,
    metalness: 0.90,
    roughness: 0.18,
    clearcoat: 0.70,
    clearcoatRoughness: 0.10,
    reflectivity: 0.98,
    name: 'RobotMachinedLinkMaterial',
  });

  return {
    armor,
    armorDoubleSide,
    visor,
    joint,
    jointDoubleSide,
    visorOuterFrame,
    purpleEmissive,
    whiteCoreEmissive,
    purpleBloom,
    metallic,
    machinedLink,
  };
}

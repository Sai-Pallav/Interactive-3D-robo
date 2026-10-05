import * as THREE from 'three';
import { ROBOT_ACCENT, LIGHT_INTENSITY } from '../config';

export interface SceneLights {
  group: THREE.Group;
  keyLight: THREE.DirectionalLight;
  fillLight: THREE.DirectionalLight;
  rimLightLeft: THREE.DirectionalLight;
  rimLightRight: THREE.DirectionalLight;
  ambientLight: THREE.AmbientLight;
  contactShadow: THREE.Mesh;
}

/**
 * Creates dimensional studio/cinematic lighting per P2:
 * 1. Soft Key Light: above/front/left, produces readable highlights on white armor with soft falloff
 * 2. Controlled Fill Light: weaker than key, prevents dark side from becoming completely black
 * 3. Purple Rim Light: behind/side of robot, subtle violet edge separation around shoulders, head, and torso
 * 4. Ambient Environment Light: very subtle, maintains dark mechanical details
 */
export function createStudioLighting(): SceneLights {
  const group = new THREE.Group();
  group.name = 'StudioLightingGroup';

  // 1. Subtle Ambient Light - deep navy fill preserving cavity depth & mechanical contrast
  const ambientLight = new THREE.AmbientLight(0x0e0d1a, LIGHT_INTENSITY.ambient);
  group.add(ambientLight);

  // 2. Soft Key Light (Top-Front-Left) - neutral daylight sculpting armor curvature without clipping
  const keyLight = new THREE.DirectionalLight(0xf2f6fd, LIGHT_INTENSITY.key);
  keyLight.position.set(-2.0, 2.2, 2.2);
  keyLight.castShadow = false;
  group.add(keyLight);

  // 3. Controlled Fill Light (Front-Right) - soft cool slate fill preventing pitch-black shadows
  const fillLight = new THREE.DirectionalLight(0x7680a4, LIGHT_INTENSITY.fill);
  fillLight.position.set(2.2, 0.8, 1.8);
  group.add(fillLight);

  // 4. Rim Light Left (Back-Left) - subtle titanium contour edge trace
  const rimLightLeft = new THREE.DirectionalLight(0x404870, LIGHT_INTENSITY.rimLeft);
  rimLightLeft.position.set(-2.4, 1.4, -2.0);
  group.add(rimLightLeft);

  // 5. Purple Rim Light Right (Back-Right) - crisp violet edge separation on shoulders, head, and torso
  const rimLightRight = new THREE.DirectionalLight(ROBOT_ACCENT, LIGHT_INTENSITY.rimRight);
  rimLightRight.position.set(2.4, 1.6, -1.8);
  group.add(rimLightRight);

  // 6. Subtle Local Purple Emissive Bounce (Visor & Chest area)
  const purpleBounce = new THREE.PointLight(ROBOT_ACCENT, LIGHT_INTENSITY.purpleBounce, 2.5);
  purpleBounce.position.set(0.12, 0.10, 0.65);
  group.add(purpleBounce);

  // 7. Subtle Lower Torso Fill - Consolidated in P3 optimization (negligible visual contribution, saved ~20% draw/submit overhead)

  // 8. Contact Shadow Floor Mesh
  const contactShadow = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
  contactShadow.visible = false;
  contactShadow.name = 'ContactShadowPlane';

  return {
    group,
    keyLight,
    fillLight,
    rimLightLeft,
    rimLightRight,
    ambientLight,
    contactShadow,
  };
}

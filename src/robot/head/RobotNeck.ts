import * as THREE from 'three';
import { RobotMaterialPalette } from '../materials/RobotMaterials';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger';
import { geoCache } from '../utils/GeometryCache';

export interface NeckNodes {
  group: THREE.Group;
  baseCollar: THREE.Mesh;
  rings: THREE.Mesh[];
  centralShaft: THREE.Mesh;
  cervicalConnector: THREE.Mesh;
}

/**
 * Creates the telescoping mechanical neck per Part 10 & 11:
 * - Stacked metallic collar cylinders with stepped radii and beveled rims
 * - Dual lateral cervical actuator pistons (left & right) providing lifelike articulation
 * - Clearly visible articulated neck below the chin (reference 3/4 view)
 * - Central structural shaft and cervical connector
 */
export function createRobotNeck(materials: RobotMaterialPalette): NeckNodes {
  const group = new THREE.Group();
  group.name = 'Neck';

  // Base position of neck (joins torso collar to head base)
  group.position.set(0, 0.145, -0.005);

  const neckJointGroup = new THREE.Group();
  const neckSpacerGroup = new THREE.Group();

  // 1. Central Dark Structural Shaft (Part 10)
  const shaftGeo = geoCache.get('NeckShaftGeo', () => new THREE.CylinderGeometry(0.040, 0.044, 0.22, 32));
  const centralShaft = new THREE.Mesh(shaftGeo, materials.joint);
  centralShaft.name = 'NeckCentralShaft';
  centralShaft.position.set(0, 0.095, 0);
  centralShaft.castShadow = true;
  neckJointGroup.add(centralShaft);

  // 2. Base Collar / Pedestal Mount (Part 10: Base collar)
  const baseCollarGeo = geoCache.get('NeckBaseCollarGeo', () => new THREE.CylinderGeometry(0.062, 0.074, 0.024, 36));
  const baseCollar = new THREE.Mesh(baseCollarGeo, materials.joint);
  baseCollar.name = 'NeckBaseCollar';
  baseCollar.position.set(0, 0.010, 0);
  baseCollar.castShadow = true;
  baseCollar.receiveShadow = true;
  neckJointGroup.add(baseCollar);

  // Rounded rim on base collar
  const baseRimGeo = geoCache.get('NeckBaseRimGeo', () => new THREE.TorusGeometry(0.073, 0.004, 14, 36));
  const baseRim = new THREE.Mesh(baseRimGeo, materials.joint);
  baseRim.rotation.x = Math.PI / 2;
  baseRim.position.set(0, 0.004, 0);
  neckJointGroup.add(baseRim);

  // 3. Stacked Telescoping Neck Collar Rings (Part 10: Ring 01, 02, 03, 04)
  const rings: THREE.Mesh[] = [];
  const ringSpecs = [
    { radius: 0.058, height: 0.026, y: 0.038 },
    { radius: 0.054, height: 0.026, y: 0.068 },
    { radius: 0.050, height: 0.024, y: 0.098 },
    { radius: 0.046, height: 0.022, y: 0.126 },
  ];

  for (let i = 0; i < ringSpecs.length; i++) {
    const spec = ringSpecs[i];

    // Main collar ring cylinder
    const ringGeo = geoCache.get(`NeckRingGeo_${i}`, () => new THREE.CylinderGeometry(spec.radius, spec.radius * 1.02, spec.height, 36));
    const ringMesh = new THREE.Mesh(ringGeo, materials.joint);
    ringMesh.name = `NeckRing0${i + 1}`;
    ringMesh.position.set(0, spec.y, 0);
    ringMesh.castShadow = true;
    ringMesh.receiveShadow = true;
    neckJointGroup.add(ringMesh);
    rings.push(ringMesh);

    // Beveled highlight rim around the upper edge of each collar ring
    const rimGeo = geoCache.get(`NeckRimGeo_${i}`, () => new THREE.TorusGeometry(spec.radius, 0.0032, 12, 36));
    const rimMesh = new THREE.Mesh(rimGeo, materials.joint);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.set(0, spec.y + spec.height * 0.44, 0);
    neckJointGroup.add(rimMesh);

    // Dark recessed gasket spacer between rings
    if (i < ringSpecs.length - 1) {
      const spacerGeo = geoCache.get(`NeckSpacerGeo_${i}`, () => new THREE.CylinderGeometry(spec.radius * 0.86, spec.radius * 0.86, 0.008, 28));
      const spacer = new THREE.Mesh(spacerGeo, materials.jointDoubleSide);
      spacer.position.set(0, spec.y + spec.height * 0.5 + 0.004, 0);
      neckSpacerGroup.add(spacer);
    }
  }

  // 4. Lateral Cervical Hydraulic Struts (Left & Right sternocleidomastoid pistons)
  const pistonBaseGeo = geoCache.get('NeckPistonBaseGeo', () => new THREE.CylinderGeometry(0.006, 0.007, 0.065, 16));
  const rodGeo = geoCache.get('NeckRodGeo', () => new THREE.CylinderGeometry(0.0035, 0.0035, 0.060, 14));
  for (const side of [-1, 1]) {
    const pistonBase = new THREE.Mesh(pistonBaseGeo, materials.joint);
    pistonBase.position.set(side * 0.038, 0.048, -0.010);
    pistonBase.rotation.z = side * -0.14;
    pistonBase.rotation.x = 0.08;
    pistonBase.castShadow = true;
    neckJointGroup.add(pistonBase);

    const rod = new THREE.Mesh(rodGeo, materials.joint);
    rod.position.set(side * 0.032, 0.088, -0.008);
    rod.rotation.z = side * -0.14;
    rod.rotation.x = 0.08;
    neckJointGroup.add(rod);
  }

  // 5. Cervical Upper Connector (Part 10: Upper connector linking to skull)
  const cervicalGeo = geoCache.get('NeckCervicalGeo', () => new THREE.CylinderGeometry(0.044, 0.048, 0.028, 32));
  const cervicalConnector = new THREE.Mesh(cervicalGeo, materials.joint);
  cervicalConnector.name = 'NeckCervicalConnector';
  cervicalConnector.position.set(0, 0.150, -0.005);
  cervicalConnector.rotation.x = 0.05;
  neckJointGroup.add(cervicalConnector);

  // Merge static joint structure of neck
  const cachedMergedNeckJointGeo = geoCache.get('NeckStructureMergedGeo', () => {
    const merged = mergeGroupMeshesByMaterial(neckJointGroup, materials.joint, 'NeckStructure_Merged', false);
    return merged ? merged.geometry : null;
  });
  if (cachedMergedNeckJointGeo) {
    const mergedNeckJoint = new THREE.Mesh(cachedMergedNeckJointGeo, materials.joint);
    mergedNeckJoint.name = 'NeckStructure_Merged';
    mergedNeckJoint.castShadow = true;
    mergedNeckJoint.receiveShadow = true;
    group.add(mergedNeckJoint);
  }

  // Merge spacer gaskets
  const cachedMergedSpacersGeo = geoCache.get('NeckSpacersMergedGeo', () => {
    const merged = mergeGroupMeshesByMaterial(neckSpacerGroup, materials.jointDoubleSide, 'NeckSpacers_Merged', false);
    return merged ? merged.geometry : null;
  });
  if (cachedMergedSpacersGeo) {
    const mergedSpacers = new THREE.Mesh(cachedMergedSpacersGeo, materials.jointDoubleSide);
    mergedSpacers.name = 'NeckSpacers_Merged';
    group.add(mergedSpacers);
  }

  return {
    group,
    baseCollar,
    rings,
    centralShaft,
    cervicalConnector,
  };
}

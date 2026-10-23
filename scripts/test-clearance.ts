import * as THREE from 'three';

function testConfig(name: string, outerUpperX: number, outerUpperZ: number, outerLowerX: number, outerLowerZ: number, outerRadius: number) {
  const innerUpper = new THREE.Vector3(0.076, -0.070, 0.006);
  const innerLower = new THREE.Vector3(0.054, -0.204, 0.012);
  const innerRadius = 0.0095;
  const innerRodRadius = 0.0052;

  const outerUpper = new THREE.Vector3(outerUpperX, -0.066, outerUpperZ);
  const outerLower = new THREE.Vector3(outerLowerX, -0.204, outerLowerZ);
  const outerRodRadius = 0.0064;

  const innerDir = new THREE.Vector3().subVectors(innerLower, innerUpper);
  const outerDir = new THREE.Vector3().subVectors(outerLower, outerUpper);

  const innerAngleZ = Math.atan2(innerDir.x, -innerDir.y) * 180 / Math.PI;
  const outerAngleZ = Math.atan2(outerDir.x, -outerDir.y) * 180 / Math.PI;

  console.log(`\n=== CONFIG: ${name} ===`);
  console.log(`Inner Pole: Upper ${innerUpper.toArray()}, Lower ${innerLower.toArray()}, Angle Z: ${innerAngleZ.toFixed(2)}°`);
  console.log(`Outer Pole: Upper ${outerUpper.toArray()}, Lower ${outerLower.toArray()}, Angle Z: ${outerAngleZ.toFixed(2)}°`);
  console.log(`Angle Difference: ${(outerAngleZ - innerAngleZ).toFixed(2)}°`);

  // Check distance and clearance at 5 points along the height (t = 0 to 1)
  for (let t = 0; t <= 1; t += 0.25) {
    const ptInner = new THREE.Vector3().lerpVectors(innerUpper, innerLower, t);
    const ptOuter = new THREE.Vector3().lerpVectors(outerUpper, outerLower, t);
    const dist = ptInner.distanceTo(ptOuter);
    const rInner = t < 0.5 ? innerRadius : innerRodRadius;
    const rOuter = t < 0.5 ? outerRadius : outerRodRadius;
    const clearance = dist - (rInner + rOuter);
    console.log(`  t = ${t.toFixed(2)} (y ~ ${ptInner.y.toFixed(3)}): CenterDist = ${(dist * 1000).toFixed(1)} mm, Clearance = ${(clearance * 1000).toFixed(1)} mm`);
  }
}

testConfig('Current Config (Splayed 17°)', 0.118, 0.024, 0.076, 0.026, 0.0118);
testConfig('dualActuators Config (0.098 -> 0.076)', 0.098, 0.014, 0.076, 0.016, 0.0118);
testConfig('Slightly Spaced (0.100 -> 0.078, r=0.0110)', 0.100, 0.014, 0.078, 0.016, 0.0110);
testConfig('Refined (0.099 -> 0.077, r=0.0112)', 0.099, 0.014, 0.077, 0.016, 0.0112);

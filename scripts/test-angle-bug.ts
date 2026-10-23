import { TORSO_CONFIG } from '../src/robot/torso/TorsoConfig';

const dualCfg = TORSO_CONFIG.stomach.dualActuators;
const outerMount = dualCfg.outer.upperMount;
const outerLower = dualCfg.outer.lowerMount;
const outerAngleZ = Math.atan2(outerMount.x - outerLower.x, outerLower.y - outerMount.y);
console.log('BUGGY outerAngleZ in rad:', outerAngleZ, 'in deg:', outerAngleZ * 180 / Math.PI);

const correctOuterAngleZ = Math.atan2(outerMount.x - outerLower.x, outerMount.y - outerLower.y);
console.log('CORRECT outerAngleZ in rad:', correctOuterAngleZ, 'in deg:', correctOuterAngleZ * 180 / Math.PI);

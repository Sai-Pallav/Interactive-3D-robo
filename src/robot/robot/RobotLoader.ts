import * as THREE from 'three';
import { getProceduralRobot, getProceduralRobotAsync, RobotNodes } from './RobotProceduralFactory';

export interface LoadRobotResult {
  nodes: RobotNodes;
  source: 'procedural';
  mixer?: THREE.AnimationMixer;
}

/**
 * Synchronously loads the procedural robot without any microtask/tick delays.
 */
export function loadRobotModelSync(): LoadRobotResult {
  const proceduralNodes = getProceduralRobot();
  return { nodes: proceduralNodes, source: 'procedural' };
}

/**
 * Loads the 3D procedural robot model asynchronously.
 * Leverages RobotResourceManager to acquire a procedural robot instance
 * asynchronously across non-blocking yielded chunks.
 */
export async function loadRobotModel(): Promise<LoadRobotResult> {
  const proceduralNodes = await getProceduralRobotAsync();
  return { nodes: proceduralNodes, source: 'procedural' };
}

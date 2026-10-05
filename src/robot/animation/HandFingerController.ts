import { HandOffsets } from './AnimationTypes';
import { ANIMATION_CONFIG } from './AnimationConfig';

export class HandFingerController {
  private leftHandOffsets: HandOffsets;
  private rightHandOffsets: HandOffsets;
  private returnWrapper: { leftHand: HandOffsets; rightHand: HandOffsets };

  constructor() {
    this.leftHandOffsets = this.createDefaultOffsets();
    this.rightHandOffsets = this.createDefaultOffsets();
    this.returnWrapper = {
      leftHand: this.leftHandOffsets,
      rightHand: this.rightHandOffsets,
    };
  }

  private createDefaultOffsets(): HandOffsets {
    return {
      thumbPitch: 0,
      thumbYaw: 0,
      fingers: [
        { proximalCurl: 0, middleCurl: 0, distalCurl: 0, splay: 0 },
        { proximalCurl: 0, middleCurl: 0, distalCurl: 0, splay: 0 },
        { proximalCurl: 0, middleCurl: 0, distalCurl: 0, splay: 0 },
        { proximalCurl: 0, middleCurl: 0, distalCurl: 0, splay: 0 },
      ],
    };
  }

  public update(
    time: number,
    breathOffset: number,
    reducedMotion: boolean
  ): { leftHand: HandOffsets; rightHand: HandOffsets } {
    if (reducedMotion) {
      return this.returnWrapper;
    }

    const cfg = ANIMATION_CONFIG.hand;

    // Coordinated Finger Micro-curl Cycle:
    // Gentle progression 0° -> 2° -> 4° -> 1° over several seconds (~18-22s period)
    // Smooth dual harmonic shape
    const normalizedCurl = (Math.sin(time * cfg.cycleSpeed) * 0.7 + Math.sin(time * cfg.cycleSpeed * 0.5 + 1.0) * 0.3 + 1.0) * 0.5; // [0, 1]
    const baseCurl = cfg.minCurl + normalizedCurl * (cfg.maxCurl - cfg.minCurl);

    // Periodic subtle relaxation/settling pulse every ~8.5 seconds
    const relaxCycle = Math.sin(time * 0.16);
    const relaxPulse = Math.pow(Math.max(0, relaxCycle), 4) * 0.015;

    // 1. LEFT HAND FINGERS (Phase 0)
    for (let i = 0; i < 4; i++) {
      // Cascading anatomical delay across finger groups (Index -> Middle -> Ring -> Little)
      const fingerPhase = i * 0.35;
      const wave =
        Math.sin(time * 0.42 + fingerPhase) * 0.006 +
        baseCurl * 0.5 -
        relaxPulse * 0.5 +
        breathOffset * 0.02;

      const f = this.leftHandOffsets.fingers[i];
      f.proximalCurl = Math.max(0, wave);
      f.middleCurl = Math.max(0, wave * 1.15); // Middle phalanx couples slightly stronger
      f.distalCurl = Math.max(0, wave * 0.90);
      f.splay = Math.sin(time * 0.2 + fingerPhase) * 0.001;
    }

    // Left Thumb Thenar Dynamics
    const leftThumbWave =
      Math.cos(time * 0.38) * cfg.thumbPitchFactor +
      Math.sin(time * 0.75) * 0.006 -
      relaxPulse * 0.3;
    this.leftHandOffsets.thumbPitch = leftThumbWave;
    this.leftHandOffsets.thumbYaw = leftThumbWave * 0.2;

    // 2. RIGHT HAND FINGERS (Asymmetric phase offset = +2.4 rad)
    for (let i = 0; i < 4; i++) {
      const fingerPhase = i * 0.35 + 2.4;
      const wave =
        Math.sin(time * 0.38 + fingerPhase) * 0.006 +
        baseCurl * 0.5 -
        relaxPulse * 0.5 +
        breathOffset * 0.02;

      const f = this.rightHandOffsets.fingers[i];
      f.proximalCurl = Math.max(0, wave);
      f.middleCurl = Math.max(0, wave * 1.15);
      f.distalCurl = Math.max(0, wave * 0.90);
      f.splay = Math.cos(time * 0.22 + fingerPhase) * 0.001;
    }

    // Right Thumb Thenar Dynamics
    const rightThumbWave =
      Math.sin(time * 0.34 + 1.8) * cfg.thumbPitchFactor +
      Math.cos(time * 0.68 + 1.2) * 0.006 -
      relaxPulse * 0.3;
    this.rightHandOffsets.thumbPitch = rightThumbWave;
    this.rightHandOffsets.thumbYaw = rightThumbWave * 0.2;

    return this.returnWrapper;
  }
}

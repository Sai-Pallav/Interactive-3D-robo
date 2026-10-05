import * as THREE from 'three';
import { RobotNodes } from '../robot/RobotProceduralFactory';
import { InputController } from './InputController';
import { LookController } from './LookController';
import { ShoulderController } from './ShoulderController';
import { ArmElbowController } from './ArmElbowController';
import { HandFingerController } from './HandFingerController';
import { TorsoWaistController } from './TorsoWaistController';
import { IdleSuspensionController } from './IdleSuspensionController';
import { EmissiveController } from './EmissiveController';
import { ArmAnimationController, HandPoseName } from '../arm/ArmAnimationController';
import { TorsoAnimationController } from '../torso/TorsoAnimationController';
import { LegAnimationController } from '../leg/LegAnimationController';

export class RobotAnimationController {
  private nodes: RobotNodes;
  private time: number = 0;

  // Sub-controllers
  public inputController: InputController;
  public lookController: LookController;
  public shoulderController: ShoulderController;
  public armElbowController: ArmElbowController;
  public handFingerController: HandFingerController;
  public torsoWaistController: TorsoWaistController;
  public idleSuspensionController: IdleSuspensionController;
  public emissiveController: EmissiveController;

  // Existing modular controllers for deep node hierarchy access
  private armController: ArmAnimationController | null = null;
  private torsoController: TorsoAnimationController | null = null;
  private legController: LegAnimationController | null = null;

  // Cached base transforms (Zero runtime garbage collection)
  private baseRootY: number;
  private baseTorsoY: number;
  private baseHeadY: number;

  private baseLeftShoulderY: number;
  private baseRightShoulderY: number;
  private baseLeftShoulderRot: THREE.Euler;
  private baseRightShoulderRot: THREE.Euler;

  private baseLeftUpperArmRot: THREE.Euler;
  private baseRightUpperArmRot: THREE.Euler;
  private baseLeftForearmRot: THREE.Euler;
  private baseRightForearmRot: THREE.Euler;
  private baseLeftHandRot: THREE.Euler;
  private baseRightHandRot: THREE.Euler;

  private leftPoseOverrides = {
    upperArm: { x: 0, y: 0.08, z: 0 },
    elbowBend: 0,
    elbowRoll: 0,
    wrist: { pitch: 0, roll: 0, yaw: 0 },
    thumb: { proxCurl: 0, splay: 0 },
    fingers: [
      { proxCurl: 0, midCurl: 0, distCurl: 0, splay: 0 },
      { proxCurl: 0, midCurl: 0, distCurl: 0, splay: 0 },
      { proxCurl: 0, midCurl: 0, distCurl: 0, splay: 0 },
      { proxCurl: 0, midCurl: 0, distCurl: 0, splay: 0 },
    ],
  };

  private rightPoseOverrides = {
    upperArm: { x: 0, y: -0.08, z: 0 },
    elbowBend: 0,
    elbowRoll: 0,
    wrist: { pitch: 0, roll: 0, yaw: 0 },
    thumb: { proxCurl: 0, splay: 0 },
    fingers: [
      { proxCurl: 0, midCurl: 0, distCurl: 0, splay: 0 },
      { proxCurl: 0, midCurl: 0, distCurl: 0, splay: 0 },
      { proxCurl: 0, midCurl: 0, distCurl: 0, splay: 0 },
      { proxCurl: 0, midCurl: 0, distCurl: 0, splay: 0 },
    ],
  };

  constructor(nodes: RobotNodes) {
    this.nodes = nodes;

    // Initialize sub-controllers
    this.inputController = new InputController();
    this.lookController = new LookController();
    this.shoulderController = new ShoulderController();
    this.armElbowController = new ArmElbowController();
    this.handFingerController = new HandFingerController();
    this.torsoWaistController = new TorsoWaistController();
    this.idleSuspensionController = new IdleSuspensionController();
    this.emissiveController = new EmissiveController();

    // Cache initial base positions & rotations
    this.baseRootY = nodes.root.position.y;
    this.baseTorsoY = nodes.torso.position.y;
    this.baseHeadY = nodes.head.position.y;

    this.baseLeftShoulderY = nodes.leftShoulder.position.y;
    this.baseRightShoulderY = nodes.rightShoulder.position.y;
    this.baseLeftShoulderRot = nodes.leftShoulder.rotation.clone();
    this.baseRightShoulderRot = nodes.rightShoulder.rotation.clone();

    this.baseLeftUpperArmRot = nodes.leftUpperArm.rotation.clone();
    this.baseRightUpperArmRot = nodes.rightUpperArm.rotation.clone();
    this.baseLeftForearmRot = nodes.leftForearm.rotation.clone();
    this.baseRightForearmRot = nodes.rightForearm.rotation.clone();
    this.baseLeftHandRot = nodes.leftHand.rotation.clone();
    this.baseRightHandRot = nodes.rightHand.rotation.clone();

    // Instantiate existing arm, torso, and leg controllers if nodes exist
    if (nodes.leftArmNodes && nodes.rightArmNodes) {
      this.armController = new ArmAnimationController(nodes.leftArmNodes, nodes.rightArmNodes);
    }

    if (nodes.torsoNodes) {
      this.torsoController = new TorsoAnimationController(nodes.torsoNodes);
    }

    if (nodes.leftLegNodes && nodes.rightLegNodes) {
      this.legController = new LegAnimationController(nodes.leftLegNodes, nodes.rightLegNodes);
    }
  }

  public setCameraContext(camera: THREE.Camera, container: HTMLElement): void {
    const parentNode = this.nodes.neck.parent || this.nodes.neck;
    this.lookController.setRaycastContext(camera, container, this.nodes.head, parentNode);
  }

  public setPointerTarget(clientX: number, clientY: number, isHovered: boolean, speed: number = 0): void {
    this.lookController.setPointerTarget(clientX, clientY, isHovered, speed);
  }

  public setLookTarget(x: number, y: number, speed: number = 0): void {
    // Stored for the main update loop
  }

  public setIdleState(): void {
    this.lookController.setPointerTarget(0, 0, false, 0);
    const inputState = this.inputController.getState();
    this.inputController.update(0, 0, 0.016, false, inputState.reducedMotion);
  }

  public setReducedMotion(reduced: boolean): void {
    const inputState = this.inputController.getState();
    if (inputState.reducedMotion !== reduced) {
      this.inputController.update(
        inputState.targetX,
        inputState.targetY,
        0.016,
        inputState.isHovered,
        reduced
      );
    }
  }

  /**
   * Main Frame-rate independent delta-time update loop.
   * Executes strict Priority 1 through Priority 10 sequence with zero runtime garbage collection.
   */
  public update(deltaTime: number, externalTargetX?: number, externalTargetY?: number, cursorSpeed?: number): void {
    const dt = Math.min(deltaTime, 0.1); // Protect against large frame drops
    this.time += dt;

    // 0. Update Input Controller
    if (externalTargetX !== undefined && externalTargetY !== undefined) {
      const isHover = externalTargetX !== 0 || externalTargetY !== 0;
      this.inputController.update(
        externalTargetX,
        externalTargetY,
        dt,
        isHover,
        this.inputController.getState().reducedMotion
      );
    }

    const input = this.inputController.getState();
    const reducedMotion = input.reducedMotion;

    // Gentle baseline breathing harmonic
    const breathCycle = Math.sin(this.time * 0.95);
    const breathOffset = breathCycle * 0.012;

    // ==============================================================
    // PRIORITY 1 & 2: Head Tracking & Neck Follow (Critically Damped Spring)
    // ==============================================================
    const gaze = this.lookController.update(input, dt);

    // Apply Head (Heroic forward gaze with subtle heroic 3/4 baseline)
    this.nodes.head.rotation.set(
      gaze.headPitch,
      gaze.headYaw,
      -0.01 + gaze.headRoll,
      'YXZ'
    );

    // Apply Neck
    this.nodes.neck.rotation.set(
      gaze.neckPitch,
      gaze.neckYaw,
      0,
      'YXZ'
    );

    // Idle micro-drift on Head (Priority 15 - Layer 8)
    const headDriftX = Math.sin(this.time * 0.35) * 0.002;
    const headDriftY = Math.cos(this.time * 0.42) * 0.0015;
    this.nodes.head.position.x = headDriftX;
    this.nodes.head.position.y = this.baseHeadY + breathOffset * 0.25 + headDriftY;

    // ==============================================================
    // PRIORITY 3: Torso Follow & Abdomen/Waist Suspension
    // ==============================================================
    const torsoKinematics = this.torsoWaistController.update(
      gaze,
      this.time,
      dt,
      breathOffset,
      reducedMotion
    );

    if (this.nodes.torsoNodes) {
      const tNodes = this.nodes.torsoNodes;
      // Articulate chest pivot
      tNodes.chestPivot.rotation.set(
        torsoKinematics.chestPitch,
        torsoKinematics.chestYaw,
        torsoKinematics.chestRoll,
        'YXZ'
      );

      // Articulate stomach rings (Articulated cascaded suspension)
      const wOff = torsoKinematics.waistOffsets;
      const rings = tNodes.stomach.rings;
      if (rings[0]) rings[0].group.rotation.x = wOff.segment01Pitch;
      if (rings[1]) rings[1].group.rotation.x = wOff.segment02Pitch;
      if (rings[2]) rings[2].group.rotation.x = wOff.segment03Pitch;
      if (rings[3]) rings[3].group.rotation.x = wOff.segment04Pitch;
      if (rings[4]) rings[4].group.rotation.x = wOff.segment05Pitch;

      // Articulate waist pivot
      tNodes.waistPivot.rotation.set(
        wOff.waistPivotPitch,
        wOff.waistPivotYaw,
        wOff.waistPivotRoll,
        'YXZ'
      );
    } else {
      // Fallback if torsoNodes not provided
      this.nodes.torso.rotation.set(
        torsoKinematics.chestPitch,
        torsoKinematics.chestYaw,
        torsoKinematics.chestRoll,
        'YXZ'
      );
    }

    // ==============================================================
    // PRIORITY 4: Asymmetric Shoulder Mechanical Response
    // ==============================================================
    const headYaw = this.lookController.getCurrentHeadYaw();
    const headPitch = this.lookController.getCurrentHeadPitch();
    const shoulderOff = this.shoulderController.update(headYaw, headPitch, dt, breathOffset);

    this.nodes.leftShoulder.rotation.set(
      this.baseLeftShoulderRot.x + shoulderOff.leftPitch,
      this.baseLeftShoulderRot.y + shoulderOff.leftYaw,
      this.baseLeftShoulderRot.z + shoulderOff.leftRoll
    );
    this.nodes.leftShoulder.position.y = this.baseLeftShoulderY + shoulderOff.leftPosY;

    this.nodes.rightShoulder.rotation.set(
      this.baseRightShoulderRot.x + shoulderOff.rightPitch,
      this.baseRightShoulderRot.y + shoulderOff.rightYaw,
      this.baseRightShoulderRot.z + shoulderOff.rightRoll
    );
    this.nodes.rightShoulder.position.y = this.baseRightShoulderY + shoulderOff.rightPosY;

    // ==============================================================
    // PRIORITY 5, 6, 7: Arm Posture (Partial Fold), Elbow & Wrist Articulation
    // ==============================================================
    const armState = this.armElbowController.update(
      dt,
      this.time,
      breathOffset,
      headYaw,
      headPitch,
      reducedMotion
    );

    // ==============================================================
    // PRIORITY 8: Hand & Finger Coordinated Micro-Animation
    // ==============================================================
    const handState = this.handFingerController.update(this.time, breathOffset, reducedMotion);

    if (this.armController) {
      // Direct pass-through to high-fidelity ArmAnimationController
      const lOver = this.leftPoseOverrides;
      lOver.upperArm.x = armState.pose.leftUpperPitch;
      lOver.upperArm.y = 0.08;
      lOver.upperArm.z = armState.pose.leftUpperRoll;
      lOver.elbowBend = armState.pose.leftElbowBend;
      lOver.elbowRoll = 0.0; // Strict 1-DOF transverse hinge (zero internal knuckle shearing)
      lOver.wrist.pitch = armState.leftWrist.pitch;
      lOver.wrist.roll = armState.leftWrist.roll;
      lOver.wrist.yaw = armState.leftWrist.yaw;
      lOver.thumb.proxCurl = handState.leftHand.thumbPitch;
      lOver.thumb.splay = handState.leftHand.thumbYaw;
      for (let i = 0; i < 4; i++) {
        const src = handState.leftHand.fingers[i];
        const dst = lOver.fingers[i];
        if (src && dst) {
          dst.proxCurl = src.proximalCurl;
          dst.midCurl = src.middleCurl;
          dst.distCurl = src.distalCurl;
          dst.splay = src.splay;
        }
      }
      this.armController.setPoseOverrides('left', lOver);

      const rOver = this.rightPoseOverrides;
      rOver.upperArm.x = armState.pose.rightUpperPitch;
      rOver.upperArm.y = -0.08;
      rOver.upperArm.z = armState.pose.rightUpperRoll;
      rOver.elbowBend = armState.pose.rightElbowBend;
      rOver.elbowRoll = 0.0; // Strict 1-DOF transverse hinge (zero internal knuckle shearing)
      rOver.wrist.pitch = armState.rightWrist.pitch;
      rOver.wrist.roll = armState.rightWrist.roll;
      rOver.wrist.yaw = armState.rightWrist.yaw;
      rOver.thumb.proxCurl = handState.rightHand.thumbPitch;
      rOver.thumb.splay = handState.rightHand.thumbYaw;
      for (let i = 0; i < 4; i++) {
        const src = handState.rightHand.fingers[i];
        const dst = rOver.fingers[i];
        if (src && dst) {
          dst.proxCurl = src.proximalCurl;
          dst.midCurl = src.middleCurl;
          dst.distCurl = src.distalCurl;
          dst.splay = src.splay;
        }
      }
      this.armController.setPoseOverrides('right', rOver);

      this.armController.update(dt, breathOffset, headYaw, headPitch);
    } else {
      // Direct node transform fallback
      this.nodes.leftUpperArm.rotation.set(
        this.baseLeftUpperArmRot.x + armState.pose.leftUpperPitch,
        this.baseLeftUpperArmRot.y,
        this.baseLeftUpperArmRot.z + armState.pose.leftUpperRoll
      );
      this.nodes.rightUpperArm.rotation.set(
        this.baseRightUpperArmRot.x + armState.pose.rightUpperPitch,
        this.baseRightUpperArmRot.y,
        this.baseRightUpperArmRot.z + armState.pose.rightUpperRoll
      );

      this.nodes.leftForearm.rotation.set(
        armState.pose.leftElbowBend,
        this.baseLeftForearmRot.y,
        armState.pose.leftElbowRoll
      );
      this.nodes.rightForearm.rotation.set(
        armState.pose.rightElbowBend,
        this.baseRightForearmRot.y,
        armState.pose.rightElbowRoll
      );

      this.nodes.leftHand.rotation.set(
        this.baseLeftHandRot.x + armState.leftWrist.pitch,
        this.baseLeftHandRot.y + armState.leftWrist.roll,
        this.baseLeftHandRot.z + armState.leftWrist.yaw
      );
      this.nodes.rightHand.rotation.set(
        this.baseRightHandRot.x + armState.rightWrist.pitch,
        this.baseRightHandRot.y + armState.rightWrist.roll,
        this.baseRightHandRot.z + armState.rightWrist.yaw
      );
    }

    // ==============================================================
    // PRIORITY 9: Environmental Floating & Idle Suspension (Layer 1)
    // ==============================================================
    const idleState = this.idleSuspensionController.update(this.time, dt, reducedMotion);
    this.nodes.root.position.y = this.baseRootY + idleState.floatingY;
    this.nodes.root.rotation.x = idleState.floatingPitch;
    this.nodes.root.rotation.z = -0.02 + idleState.floatingRoll;

    // Update Leg Kinematics if available
    if (this.legController) {
      this.legController.update(dt, breathOffset);
    }

    // ==============================================================
    // PRIORITY 10: Interactive Visor / Emissive Intensity & Eye Blinks
    // ==============================================================
    this.emissiveController.update(
      this.time,
      dt,
      input.intensity,
      reducedMotion,
      this.nodes.materials,
      this.nodes.eyeLeft,
      this.nodes.eyeRight,
      this.nodes.visorLightBar
    );
  }

  public getArmController(): ArmAnimationController | null {
    return this.armController;
  }

  public setHandPose(
    side: 'left' | 'right' | 'both',
    pose: HandPoseName,
    durationSec: number = 0.4
  ): void {
    if (this.armController) {
      this.armController.setHandPose(side, pose, durationSec);
    }
  }

  public getHandPose(side: 'left' | 'right'): HandPoseName {
    if (this.armController) {
      return this.armController.getHandPose(side);
    }
    return 'relaxed';
  }

  public getTorsoController(): TorsoAnimationController | null {
    return this.torsoController;
  }

  public getLegController(): LegAnimationController | null {
    return this.legController;
  }

  public dispose(): void {
    this.lookController.dispose();
  }
}

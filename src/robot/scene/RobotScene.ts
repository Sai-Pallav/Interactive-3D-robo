import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CameraManager } from './camera';
import { createStudioLighting, SceneLights } from './lighting';
import { loadRobotModel, loadRobotModelSync, LoadRobotResult } from '../robot/RobotLoader';
import { RobotNodes } from '../robot/RobotProceduralFactory';
import { RobotResourceManager } from '../robot/RobotResourceManager';
import { RobotController } from '../robot/RobotController';
import { RobotInteraction } from '../robot/RobotInteraction';
import { getOptimalPixelRatio, deepDispose } from '../utils/performance';
import { getViewportDimensions } from '../utils/responsiveness';
import { ROBOT_CONFIG, ROBOT_SCALE, ROBOT_POSITION, ROBOT_ROTATION } from '../config';
import { DebugManager, DebugStats } from '../arm/DebugManager';
import { RobotLODManager, RobotLODLevel, RobotLODStats } from './RobotLODManager';
import { DynamicResolutionManager, DRSConfig, DRSStats } from './DynamicResolutionManager';
import { RobotOcclusionManager, RobotOcclusionStats } from './RobotOcclusionManager';
import { startupProfiler } from '../utils/startupProfiler';

export interface RobotSceneOptions {
  container: HTMLElement;
  pmremResolution?: number;
  onLoaded?: (source: 'procedural') => void;
  onError?: (err: Error) => void;
}

export class RobotScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private cameraManager: CameraManager;
  private lights: SceneLights;
  private controller: RobotController | null = null;
  private debugManager: DebugManager | null = null;
  private lodManager: RobotLODManager | null = null;
  private occlusionManager: RobotOcclusionManager | null = null;
  private drsManager: DynamicResolutionManager;
  private interaction: RobotInteraction;
  private mixer?: THREE.AnimationMixer;
  private robotNodes: RobotNodes | null = null;

  private isRunning: boolean = false;
  private isVisible: boolean = true;
  private isIntersecting: boolean = true;
  private animFrameId: number | null = null;
  private lastTime: number = performance.now();
  private resizeObserver: ResizeObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private pixelRatioMediaQuery: MediaQueryList | null = null;
  private boundPixelRatioChange: (() => void) | null = null;
  private boundVisibilityChange: () => void;
  private boundWheel: (e: WheelEvent) => void;
  private boundDblClick: (e: MouseEvent) => void;
  private boundTouchStart: (e: TouchEvent) => void;
  private boundTouchMove: (e: TouchEvent) => void;
  private boundTouchEnd: (e: TouchEvent) => void;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private touchStartDistance: number = 0;
  private touchStartZoom: number = 1.0;
  private isPinching: boolean = false;
  private lastTapTime: number = 0;

  public isReady: boolean = false;
  public modelSource: 'procedural' = 'procedural';
  private _tempFacePos = new THREE.Vector3();
  private currentPmremResolution: number = 256;

  constructor(options: RobotSceneOptions) {
    startupProfiler.mark('T2_sceneCreation');
    const tStart = performance.now();
    this.container = options.container;

    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = null; // Transparent to blend seamlessly with cosmos CSS theme
    startupProfiler.mark('T6_sceneCreated');
    const tScene = performance.now();

    // 2. Camera setup
    const dims = getViewportDimensions(this.container);
    this.cameraManager = new CameraManager(dims.aspect);
    startupProfiler.mark('T7_cameraCreated');
    const tCam = performance.now();

    // 3. Renderer setup
    const optimalDpr = getOptimalPixelRatio(ROBOT_CONFIG.maxPixelRatio);
    this.renderer = RobotResourceManager.getInstance().acquireSharedRenderer(
      this.container,
      dims.width,
      dims.height,
      optimalDpr
    );
    startupProfiler.mark('T5_rendererCreated');
    this.drsManager = new DynamicResolutionManager(this.renderer, optimalDpr, {
      minPixelRatio: 1.0,
      maxPixelRatio: optimalDpr,
    });

    // 4. Lighting setup
    startupProfiler.mark('T_lightingInitStart');
    this.lights = createStudioLighting();
    this.scene.add(this.lights.group);
    startupProfiler.mark('T_lightingInitEnd');
    const tLight = performance.now();

    // 5. Interaction setup
    this.interaction = new RobotInteraction(this.container);

    // Mouse wheel camera zoom and double-click reset
    this.boundWheel = this.onWheel.bind(this);
    this.boundDblClick = this.onDblClick.bind(this);
    this.renderer.domElement.addEventListener('wheel', this.boundWheel, { passive: false });
    this.renderer.domElement.addEventListener('dblclick', this.boundDblClick);
    this.renderer.domElement.addEventListener('click', this.onCanvasClick.bind(this));
    this.container.addEventListener('dblclick', this.boundDblClick);

    // Touch pinch-to-zoom and double-tap gestures
    this.boundTouchStart = this.onTouchStart.bind(this);
    this.boundTouchMove = this.onTouchMove.bind(this);
    this.boundTouchEnd = this.onTouchEnd.bind(this);
    this.renderer.domElement.addEventListener('touchstart', this.boundTouchStart, { passive: false });
    this.renderer.domElement.addEventListener('touchmove', this.boundTouchMove, { passive: false });
    this.renderer.domElement.addEventListener('touchend', this.boundTouchEnd, { passive: true });
    this.renderer.domElement.addEventListener('touchcancel', this.boundTouchEnd, { passive: true });

    // Keyboard zoom shortcuts (+ / - / 0)
    this.boundKeyDown = this.onKeyDown.bind(this);
    window.addEventListener('keydown', this.boundKeyDown);

    // 6. Responsive Resize Observer, Resolution/DPR Observer & Viewport Intersection Observer
    this.setupResizeObserver();
    this.setupPixelRatioObserver();
    this.setupIntersectionObserver();

    // 7. Page Visibility Listener
    this.boundVisibilityChange = this.onVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this.boundVisibilityChange);

    // 8. Load Model & Environment
    this.initModel(options);
  }

  private initModel(options: RobotSceneOptions): void {
    // Asynchronous non-blocking initialization allows React loading spinner to render immediately
    this.initModelAsync(options);
  }

  private initModelSync(options: RobotSceneOptions): void {
    try {
      const result: LoadRobotResult = loadRobotModelSync();
      this.modelSource = result.source;
      this.mixer = result.mixer;

      // Add to scene
      this.scene.add(result.nodes.root);
      startupProfiler.mark('T7_sceneAttachment');

      // Store nodes & apply responsive heroic scaling & bottom-anchored positioning
      this.robotNodes = result.nodes;
      this.updateRobotTransform();

      // Initialize kinematics controller
      this.controller = new RobotController(result.nodes);
      this.controller.setCameraContext(this.cameraManager.camera, this.container);

      // Initialize Section 9 Developer Debug Mode Manager
      this.debugManager = new DebugManager(result.nodes.root);

      // Initialize Section 13-17 Distance-Based Level of Detail (LOD) Manager
      this.lodManager = new RobotLODManager(result.nodes.root);

      // Initialize Section 18-24 Screen-Space / Camera-Facing Occlusion Manager
      this.occlusionManager = new RobotOcclusionManager(result.nodes.root);

      // Pre-warm WebGL shaders for instant zero-hitch initial render
      try {
        this.renderer.compile(this.scene, this.cameraManager.camera);
      } catch (compileErr) {
        // Fallback gracefully if compile is unsupported
      }

      // Render the very first frame immediately onto the WebGL canvas
      this.renderer.render(this.scene, this.cameraManager.camera);
      startupProfiler.mark('T8_firstRender');

      this.isReady = true;
      (window as any).__robotScene = this;
      (window as any).__setHandPose = (side: any, pose: any, dur?: any) => this.controller?.setHandPose(side, pose, dur);
      if (options.onLoaded) {
        options.onLoaded(this.modelSource);
      }

      this.start();
      startupProfiler.mark('T10_interactiveReady');
    } catch (err: any) {
      console.error('[RobotScene] Synchronous initialization failed:', err);
      if (options.onError) {
        options.onError(err);
      }
    }
  }

  private async setupEnvironmentAsync(size: number = 256): Promise<void> {
    startupProfiler.mark('T_pmremStart');

    // Instant reuse path: Use pre-cached shared environment map if available
    const sharedEnv = RobotResourceManager.getInstance().getSharedEnvironment();
    if (sharedEnv) {
      this.scene.environment = sharedEnv;
      this.currentPmremResolution = size;
      startupProfiler.mark('T_pmremEnd');
      return;
    }

    if (this.scene.environment) {
      this.scene.environment.dispose();
      this.scene.environment = null;
    }
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    const envTexture = pmremGenerator.fromScene(roomEnv, 0.04, 0.1, 100, { size }).texture;
    this.scene.environment = envTexture;
    RobotResourceManager.getInstance().setSharedEnvironment(envTexture);
    roomEnv.dispose();
    pmremGenerator.dispose();
    this.currentPmremResolution = size;
    startupProfiler.mark('T_pmremEnd');
  }

  private async initModelAsync(options: RobotSceneOptions): Promise<void> {
    try {
      startupProfiler.mark('T8_robotStartupBegins');
      const result: LoadRobotResult = await loadRobotModel();
      startupProfiler.mark('T15_materialsReady');
      await this.setupEnvironmentAsync(options.pmremResolution || 256);
      startupProfiler.mark('T16_environmentReady');

      this.modelSource = result.source;
      this.mixer = result.mixer;

      // Add to scene
      this.scene.add(result.nodes.root);
      startupProfiler.mark('T7_sceneAttachment');
      startupProfiler.mark('T13_sceneAttachment');

      // Store nodes & apply responsive heroic scaling & bottom-anchored positioning
      startupProfiler.mark('T_transformStart');
      this.robotNodes = result.nodes;
      this.updateRobotTransform();
      startupProfiler.mark('T_transformEnd');
      startupProfiler.mark('T14_rendererSizing');

      // Initialize kinematics controller
      startupProfiler.mark('T_controllerStart');
      this.controller = new RobotController(result.nodes);
      this.controller.setCameraContext(this.cameraManager.camera, this.container);
      startupProfiler.mark('T_controllerEnd');

      // Initialize Section 13-17 Distance-Based Level of Detail (LOD) Manager
      startupProfiler.mark('T_lodStart');
      this.lodManager = new RobotLODManager(result.nodes.root);
      startupProfiler.mark('T_lodEnd');

      // Initialize Section 18-24 Screen-Space / Camera-Facing Occlusion Manager
      startupProfiler.mark('T_occlusionStart');
      this.occlusionManager = new RobotOcclusionManager(result.nodes.root);
      startupProfiler.mark('T_occlusionEnd');

      // Render the very first frame immediately onto the WebGL canvas
      startupProfiler.mark('T_renderStart');
      this.renderer.render(this.scene, this.cameraManager.camera);
      startupProfiler.mark('T_renderEnd');
      startupProfiler.mark('T17_firstRenderCall');
      startupProfiler.mark('T8_firstRender');
      startupProfiler.mark('T9_firstVisibleFrame');

      // Stage 2: Initialize Developer Debug Mode Manager (wireframes/axes) post-first-frame
      this.debugManager = new DebugManager(result.nodes.root);

      this.isReady = true;
      (window as any).__robotScene = this;
      (window as any).__setHandPose = (side: any, pose: any, dur?: any) => this.controller?.setHandPose(side, pose, dur);
      if (options.onLoaded) {
        options.onLoaded(this.modelSource);
      }

      this.start();
      startupProfiler.mark('T19_firstInteractiveFrame');
      startupProfiler.mark('T20_fullInitialization');
      startupProfiler.mark('T10_interactiveReady');
    } catch (err: any) {
      console.error('[RobotScene] Async initialization failed:', err);
      if (options.onError) {
        options.onError(err);
      }
    }
  }

  private updateRobotTransform(): void {
    if (!this.robotNodes?.root) return;
    const width = this.container.clientWidth;

    // Priority 1: Grounded, prominent hero character scale (~1.22x–1.28x)
    // Anchored toward bottom of hero so lower torso naturally emerges from bottom stage,
    // head remains comfortably below top navigation, and both shoulders & hands are fully visible.
    let scale = ROBOT_SCALE.desktop;
    let pos = ROBOT_POSITION.desktop;

    if (width < 640) {
      scale = ROBOT_SCALE.mobile;
      pos = ROBOT_POSITION.mobile;
    } else if (width < 1024) {
      scale = ROBOT_SCALE.tablet;
      pos = ROBOT_POSITION.tablet;
    } else if (width > 1600) {
      scale = ROBOT_SCALE.desktopWide;
      pos = ROBOT_POSITION.desktopWide;
    }

    this.robotNodes.root.scale.setScalar(scale);
    this.robotNodes.root.position.set(pos.x, pos.y, pos.z);

    // Subtle 3/4 orientation toward screen-left and slight ground perspective
    this.robotNodes.root.rotation.y = ROBOT_ROTATION.yaw;
    this.robotNodes.root.rotation.x = ROBOT_ROTATION.pitch;
    this.robotNodes.root.rotation.z = ROBOT_ROTATION.roll;

    this.updateFaceProjection();
  }

  private updateFaceProjection(): void {
    if (!this.robotNodes?.root) return;
    this.robotNodes.root.updateMatrixWorld(true);
    const faceTarget = this.robotNodes.faceVisor || this.robotNodes.head;
    if (faceTarget) {
      faceTarget.getWorldPosition(this._tempFacePos);
      this._tempFacePos.project(this.cameraManager.camera);
      const relX = this._tempFacePos.x * 0.5 + 0.5;
      const relY = (1 - this._tempFacePos.y) * 0.5;
      this.interaction.setFacePosition(relX, relY);
    }
  }

  private setupResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === this.container) {
          const width = Math.max(Math.round(entry.contentRect.width), 1);
          const height = Math.max(Math.round(entry.contentRect.height), 1);
          const aspect = width / height;

          const optimalDpr = getOptimalPixelRatio(ROBOT_CONFIG.maxPixelRatio);
          if (Math.abs(this.renderer.getPixelRatio() - optimalDpr) > 0.01 && !this.drsManager?.getForcedPixelRatio()) {
            this.renderer.setPixelRatio(optimalDpr);
            this.drsManager?.setLimits(1.0, optimalDpr);
          }

          this.renderer.setSize(width, height, false);
          this.cameraManager.updateAspect(aspect);
          this.updateRobotTransform();
        }
      }
    });

    this.resizeObserver.observe(this.container);
  }

  private setupPixelRatioObserver(): void {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    this.boundPixelRatioChange = () => {
      const optimalDpr = getOptimalPixelRatio(ROBOT_CONFIG.maxPixelRatio);
      if (Math.abs(this.renderer.getPixelRatio() - optimalDpr) > 0.01 && !this.drsManager?.getForcedPixelRatio()) {
        this.renderer.setPixelRatio(optimalDpr);
        this.drsManager?.setLimits(1.0, optimalDpr);
      }
      const width = Math.max(Math.round(this.container.clientWidth), 1);
      const height = Math.max(Math.round(this.container.clientHeight), 1);
      this.renderer.setSize(width, height, false);
      this.cameraManager.updateAspect(width / height);
      this.updateRobotTransform();

      this.bindNextPixelRatioQuery();
    };

    this.bindNextPixelRatioQuery();
  }

  private bindNextPixelRatioQuery(): void {
    if (this.pixelRatioMediaQuery && this.boundPixelRatioChange) {
      this.pixelRatioMediaQuery.removeEventListener('change', this.boundPixelRatioChange);
    }
    const currentDpr = window.devicePixelRatio || 1;
    this.pixelRatioMediaQuery = window.matchMedia(`(resolution: ${currentDpr}dppx)`);
    if (this.boundPixelRatioChange) {
      this.pixelRatioMediaQuery.addEventListener('change', this.boundPixelRatioChange);
    }
  }

  private setupIntersectionObserver(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    this.intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        this.isIntersecting = entry.isIntersecting;
        if (this.isIntersecting && this.isVisible && this.isRunning && !this.animFrameId) {
          this.lastTime = performance.now();
          this.loop();
        }
      },
      { threshold: 0.01 }
    );

    this.intersectionObserver.observe(this.container);
  }

  private onVisibilityChange(): void {
    this.isVisible = document.visibilityState === 'visible';
    if (this.isVisible) {
      this.lastTime = performance.now();
      if (this.isRunning && !this.animFrameId) {
        this.loop();
      }
    } else {
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }
    }
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private loop = (): void => {
    if (!this.isRunning || !this.isVisible || !this.isIntersecting) return;

    const now = performance.now();
    const dt = Math.max((now - this.lastTime) / 1000, 0.001);
    this.lastTime = now;

    // 1. Process Interaction State
    const interactionState = this.interaction.getState();

    if (this.controller) {
      this.controller.setReducedMotion(interactionState.reducedMotion);

      // High-precision 3D raycast tracking across viewport
      this.controller.setPointerTarget(
        interactionState.clientX,
        interactionState.clientY,
        interactionState.isHovered,
        interactionState.speed
      );

      // Symmetrical 2D normalized target
      this.controller.setLookTarget(
        interactionState.targetX,
        interactionState.targetY,
        interactionState.speed
      );
      // isHovered=false means cursor left browser window; mark interacting=false for idle breathing
      this.controller.setInteractionState(interactionState.isHovered);

      this.controller.update(dt);
    }

    // 2. Update AnimationMixer if present
    if (this.mixer) {
      this.mixer.update(dt);
    }

    // Update distance-based Level of Detail with hysteresis before render
    if (this.lodManager) {
      this.lodManager.update(this.cameraManager.camera);
    }

    // Update screen-space / camera-facing occlusion culling
    if (this.occlusionManager) {
      this.occlusionManager.update(this.cameraManager.camera);
    }

    // Update Dynamic Resolution Scaling (DRS) based on measured frame time
    if (this.drsManager) {
      this.drsManager.update(dt * 1000);
    }

    // Update smooth camera zoom interpolation
    if (this.cameraManager.update(dt)) {
      this.updateFaceProjection();
    }

    // 3. Render
    this.renderer.render(this.scene, this.cameraManager.camera);

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  /**
   * Diagnostic / Feature Controls (Section 9)
   */
  public toggleDebugMode(): boolean {
    if (!this.debugManager) return false;
    const active = this.debugManager.toggleDebugMode();
    this.occlusionManager?.setDebugMode(active);
    return active;
  }

  public setDebugMode(enabled: boolean): void {
    this.debugManager?.setDebugMode(enabled);
    this.occlusionManager?.setDebugMode(enabled);
  }

  public isDebugMode(): boolean {
    return this.debugManager ? this.debugManager.isDebugEnabled() : false;
  }

  public getDebugStats(): DebugStats | null {
    return this.debugManager ? this.debugManager.getStats() : null;
  }

  public getController(): RobotController | null {
    return this.controller;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.cameraManager.camera;
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  public setWireframe(enabled: boolean): void {
    this.debugManager?.setDebugMode(enabled);
  }

  public toggleExplodedView(): boolean {
    const torsoCtrl = this.controller?.getTorsoController();
    const armCtrl = this.controller?.getArmController();
    const legCtrl = this.controller?.getLegController();
    let active = false;
    if (torsoCtrl) {
      active = torsoCtrl.toggleExplodedView();
    }
    if (armCtrl) {
      armCtrl.setExplodedView(active);
    }
    if (legCtrl) {
      legCtrl.setExplodedProgress(active ? 1 : 0);
    }
    this.occlusionManager?.setExplodedMode(active);
    return active;
  }

  public isExplodedView(): boolean {
    const torsoCtrl = this.controller?.getTorsoController();
    return torsoCtrl ? torsoCtrl.isExplodedActive() : false;
  }

  public getLODManager(): RobotLODManager | null {
    return this.lodManager;
  }

  public setLODLevel(level: RobotLODLevel | null): void {
    this.lodManager?.setForcedLevel(level);
  }

  public updateLOD(): RobotLODLevel {
    return this.lodManager ? this.lodManager.update(this.cameraManager.camera) : RobotLODLevel.LOD0;
  }

  public getLODLevel(): RobotLODLevel {
    if (this.lodManager) {
      this.lodManager.update(this.cameraManager.camera);
      return this.lodManager.getCurrentLevel();
    }
    return RobotLODLevel.LOD0;
  }

  public getLODStats(): RobotLODStats | null {
    if (this.lodManager) {
      this.lodManager.update(this.cameraManager.camera);
      return this.lodManager.getStats(this.cameraManager.camera);
    }
    return null;
  }

  public getDRSManager(): DynamicResolutionManager | null {
    return this.drsManager;
  }

  public getEffectivePixelRatio(): number {
    return this.drsManager ? this.drsManager.getEffectivePixelRatio() : this.renderer.getPixelRatio();
  }

  public setDRSForcedPixelRatio(dpr: number | null): void {
    this.drsManager?.setForcedPixelRatio(dpr);
  }

  public setDRSEnabled(enabled: boolean): void {
    this.drsManager?.setEnabled(enabled);
  }

  public getDRSStats(): DRSStats | null {
    return this.drsManager ? this.drsManager.getStats() : null;
  }

  public getOcclusionManager(): RobotOcclusionManager | null {
    return this.occlusionManager;
  }

  public setOcclusionForcedState(state: boolean | null): void {
    this.occlusionManager?.setForcedState(state);
  }

  public setOcclusionEnabled(enabled: boolean): void {
    this.occlusionManager?.setEnabled(enabled);
  }

  public getOcclusionStats(): RobotOcclusionStats | null {
    return this.occlusionManager ? this.occlusionManager.getStats() : null;
  }

  public setEnvironmentResolution(size: number = 256): void {
    if (this.scene.environment && this.scene.environment !== RobotResourceManager.getInstance().getSharedEnvironment()) {
      this.scene.environment.dispose();
      this.scene.environment = null;
    }
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    const envTexture = pmremGenerator.fromScene(roomEnv, 0.04, 0.1, 100, { size }).texture;
    this.scene.environment = envTexture;
    RobotResourceManager.getInstance().setSharedEnvironment(envTexture);
    roomEnv.dispose();
    pmremGenerator.dispose();
    this.currentPmremResolution = size;
  }

  public getEnvironmentResolution(): number {
    return this.currentPmremResolution;
  }

  public resetGaze(): void {
    this.interaction.setLookTarget(0, 0);
    this.controller?.setIdleState();
  }

  private onWheel(e: WheelEvent): void {
    if (Math.abs(e.deltaY) < 0.05) return;

    // Do not intercept if user has already scrolled down the page
    if (typeof window !== 'undefined' && window.scrollY > 40) {
      return;
    }

    const currentZoom = this.cameraManager.getZoom();
    const targetZoom = this.cameraManager.getTargetZoom();

    // Only allow native page scroll if attempting to zoom OUT past the maximum panoramic limit
    if (
      e.deltaY > 0 &&
      currentZoom >= (this.cameraManager.maxZoom - 0.02) &&
      targetZoom >= (this.cameraManager.maxZoom - 0.02)
    ) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    this.cameraManager.handleWheel(e.deltaY);
  }

  private onDblClick(e: MouseEvent): void {
    e.preventDefault();
    this.cameraManager.resetZoom();
  }

  private onCanvasClick(e: MouseEvent): void {
    if (e.detail === 2) {
      e.preventDefault();
      this.cameraManager.resetZoom();
    }
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this.touchStartDistance = Math.hypot(dx, dy);
      this.touchStartZoom = this.cameraManager.getTargetZoom();
      this.isPinching = true;
      e.preventDefault();
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (this.isPinching && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDistance = Math.hypot(dx, dy);
      if (this.touchStartDistance > 8) {
        const factor = currentDistance / this.touchStartDistance;
        // Spreading fingers apart (factor > 1) = zoom in (smaller camera distance multiplier)
        // Pinching together (factor < 1) = zoom out (larger camera distance multiplier)
        const newZoom = this.touchStartZoom / factor;
        this.cameraManager.setZoom(newZoom);
        e.preventDefault();
      }
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    if (e.touches.length < 2) {
      this.isPinching = false;
    }
    // Double-tap reset gesture on single tap lift
    if (e.touches.length === 0) {
      const now = performance.now();
      if (now - this.lastTapTime < 320) {
        this.cameraManager.resetZoom();
        this.lastTapTime = 0;
      } else {
        this.lastTapTime = now;
      }
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    // Avoid intercepting keystrokes when typing inside inputs or textareas
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target as HTMLElement)?.isContentEditable
    ) {
      return;
    }

    if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
      e.preventDefault();
      this.cameraManager.zoomIn();
    } else if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') {
      e.preventDefault();
      this.cameraManager.zoomOut();
    } else if (e.key === '0' || e.code === 'Digit0' || e.code === 'Numpad0') {
      e.preventDefault();
      this.cameraManager.resetZoom();
    }
  }

  public handleWheel(deltaY: number): void {
    this.cameraManager.handleWheel(deltaY);
  }

  public zoomIn(step?: number): void {
    this.cameraManager.zoomIn(step);
  }

  public zoomOut(step?: number): void {
    this.cameraManager.zoomOut(step);
  }

  public resetZoom(): void {
    this.cameraManager.resetZoom();
  }

  public setZoom(zoom: number): void {
    this.cameraManager.setZoom(zoom);
  }

  public setZoomPreset(preset: 'closeup' | 'hero' | 'wide'): void {
    this.cameraManager.setPreset(preset);
  }

  public getZoom(): number {
    return this.cameraManager.getZoom();
  }

  public getTargetZoom(): number {
    return this.cameraManager.getTargetZoom();
  }

  public getMinZoom(): number {
    return this.cameraManager.getMinZoom();
  }

  public getMaxZoom(): number {
    return this.cameraManager.getMaxZoom();
  }

  public getMagnification(): number {
    return this.cameraManager.getMagnification();
  }

  public getMagnificationPercent(): number {
    return this.cameraManager.getMagnificationPercent();
  }

  public isZoomed(): boolean {
    return this.cameraManager.isZoomed();
  }

  public dispose(): void {
    this.stop();

    if (this.renderer.domElement) {
      this.renderer.domElement.removeEventListener('wheel', this.boundWheel);
      this.renderer.domElement.removeEventListener('dblclick', this.boundDblClick);
      this.renderer.domElement.removeEventListener('touchstart', this.boundTouchStart);
      this.renderer.domElement.removeEventListener('touchmove', this.boundTouchMove);
      this.renderer.domElement.removeEventListener('touchend', this.boundTouchEnd);
      this.renderer.domElement.removeEventListener('touchcancel', this.boundTouchEnd);
    }
    this.container.removeEventListener('dblclick', this.boundDblClick);
    window.removeEventListener('keydown', this.boundKeyDown);

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.pixelRatioMediaQuery && this.boundPixelRatioChange) {
      this.pixelRatioMediaQuery.removeEventListener('change', this.boundPixelRatioChange);
      this.pixelRatioMediaQuery = null;
      this.boundPixelRatioChange = null;
    }

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }

    document.removeEventListener('visibilitychange', this.boundVisibilityChange);
    this.interaction.dispose();
    this.controller?.dispose();
    this.debugManager?.dispose();
    this.lodManager?.dispose();
    this.lodManager = null;
    this.occlusionManager?.dispose();
    this.occlusionManager = null;
    this.drsManager?.dispose();

    // Clean up instance-specific robot nodes without destroying shared geometries/materials
    if (this.robotNodes?.root) {
      this.scene.remove(this.robotNodes.root);
      RobotResourceManager.getInstance().disposeInstance(this.robotNodes);
      this.robotNodes = null;
    }

    if (this.lights?.group) {
      this.scene.remove(this.lights.group);
      if (this.lights.contactShadow) {
        this.lights.contactShadow.geometry?.dispose();
        if (Array.isArray(this.lights.contactShadow.material)) {
          this.lights.contactShadow.material.forEach((m) => m.dispose());
        } else {
          this.lights.contactShadow.material?.dispose();
        }
      }
    }

    // Release the shared WebGLRenderer (detaches canvas, clears frame buffer, preserves WebGL context & compiled shaders)
    RobotResourceManager.getInstance().releaseSharedRenderer();
  }
}


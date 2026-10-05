/**
 * High-resolution startup performance instrumentation.
 * Measures complete T0–T20 specification waterfall and 3 User Milestones with microsecond precision.
 */

export interface StartupTimings {
  // Specification Waterfall (Section 4)
  T0_navigationBegins?: number;
  T1_homeRouteBegins?: number;
  T2_homeReactRender?: number;
  T3_canvasRequested?: number;
  T4_canvasMounted?: number;
  T5_rendererCreated?: number;
  T6_sceneCreated?: number;
  T7_cameraCreated?: number;
  T8_robotStartupBegins?: number;
  T9_resourceManagerAccess?: number;
  T10_cacheCheck?: number;
  T11_resourceAcquisition?: number;
  T12_instanceCreation?: number;
  T13_sceneAttachment?: number;
  T14_rendererSizing?: number;
  T15_materialsReady?: number;
  T16_environmentReady?: number;
  T17_firstRenderCall?: number;
  T18_firstBrowserPaint?: number;
  T19_firstInteractiveFrame?: number;
  T20_fullInitialization?: number;

  // Granular Sub-intervals
  T_rendererInitStart?: number;
  T_rendererInitEnd?: number;
  T_lightingInitStart?: number;
  T_lightingInitEnd?: number;
  T_proceduralGenStart?: number;
  T_proceduralGenComplete?: number;
  T_cloneStart?: number;
  T_cloneEnd?: number;
  T_pmremStart?: number;
  T_pmremEnd?: number;
  T_transformStart?: number;
  T_transformEnd?: number;
  T_controllerStart?: number;
  T_controllerEnd?: number;
  T_lodStart?: number;
  T_lodEnd?: number;
  T_occlusionStart?: number;
  T_occlusionEnd?: number;
  T_renderStart?: number;
  T_renderEnd?: number;

  // Backwards-compatible legacy aliases
  T0_homeInit?: number;
  T1_canvasMount?: number;
  T2_sceneCreation?: number;
  T3_resourceRequest?: number;
  T4_proceduralGenStart?: number;
  T5_proceduralGenComplete?: number;
  T6_instanceAcquisition?: number;
  T7_sceneAttachment?: number;
  T8_firstRender?: number;
  T9_firstVisibleFrame?: number;
  T10_interactiveReady?: number;
}

export interface StartupReport {
  isCold: boolean;
  timings: StartupTimings;
  milestones: {
    milestoneA_firstRobotPixel: number;   // T18 - T0 (or first paint)
    milestoneB_visuallyComplete: number;  // T17 - T0 (first render call completion)
    milestoneC_interactiveReady: number;  // T19 - T0 (kinematics & animation active)
  };
  waterfall: {
    T0_navigationBegins: number;
    T1_homeRouteBegins: number;
    T2_homeReactRender: number;
    T3_canvasRequested: number;
    T4_canvasMounted: number;
    T5_rendererCreated: number;
    T6_sceneCreated: number;
    T7_cameraCreated: number;
    T8_robotStartupBegins: number;
    T9_resourceManagerAccess: number;
    T10_cacheCheck: number;
    T11_resourceAcquisition: number;
    T12_instanceCreation: number;
    T13_sceneAttachment: number;
    T14_rendererSizing: number;
    T15_materialsReady: number;
    T16_environmentReady: number;
    T17_firstRenderCall: number;
    T18_firstBrowserPaint: number;
    T19_firstInteractiveFrame: number;
    T20_fullInitialization: number;
  };
  intervals: {
    homeToCanvas: number;
    canvasToScene: number;
    rendererInitDuration: number;
    lightingInitDuration: number;
    sceneToResourceReq: number;
    resourceGenDuration: number;
    cloneDuration: number;
    instanceAcquisitionDuration: number;
    pmremDuration: number;
    sceneAttachmentDuration: number;
    transformDuration: number;
    controllerDuration: number;
    lodDuration: number;
    occlusionDuration: number;
    renderCallDuration: number;
    firstRenderDuration: number;
    firstVisibleDuration: number;
    interactiveReadyDuration: number;
    totalTimeToFirstVisible: number;
    totalTimeToInteractive: number;
  };
}

class StartupProfiler {
  private static instance: StartupProfiler | null = null;
  private currentRun: StartupTimings = {};
  private history: StartupReport[] = [];
  private isCold: boolean = true;

  public static getInstance(): StartupProfiler {
    if (!StartupProfiler.instance) {
      StartupProfiler.instance = new StartupProfiler();
      if (typeof window !== 'undefined') {
        (window as any).__startupProfiler = StartupProfiler.instance;
      }
    }
    return StartupProfiler.instance;
  }

  public resetForRemount(): void {
    this.currentRun = {};
    this.isCold = false;
  }

  public mark(key: keyof StartupTimings, time: number = performance.now()): void {
    if (this.currentRun[key] === undefined) {
      this.currentRun[key] = time;
    }

    // Auto-map specification aliases
    if (key === 'T0_homeInit' && this.currentRun.T0_navigationBegins === undefined) {
      this.currentRun.T0_navigationBegins = time;
      this.currentRun.T1_homeRouteBegins = time;
      this.currentRun.T2_homeReactRender = time;
    }
    if (key === 'T1_canvasMount') {
      if (this.currentRun.T3_canvasRequested === undefined) this.currentRun.T3_canvasRequested = time;
      if (this.currentRun.T4_canvasMounted === undefined) this.currentRun.T4_canvasMounted = time;
    }
    if (key === 'T2_sceneCreation' && this.currentRun.T5_rendererCreated === undefined) {
      this.currentRun.T5_rendererCreated = time;
    }
    if (key === 'T7_sceneAttachment' && this.currentRun.T13_sceneAttachment === undefined) {
      this.currentRun.T13_sceneAttachment = time;
    }
    if (key === 'T8_firstRender' && this.currentRun.T17_firstRenderCall === undefined) {
      this.currentRun.T17_firstRenderCall = time;
    }
    if (key === 'T9_firstVisibleFrame' && this.currentRun.T18_firstBrowserPaint === undefined) {
      this.currentRun.T18_firstBrowserPaint = time;
    }
    if (key === 'T10_interactiveReady') {
      if (this.currentRun.T19_firstInteractiveFrame === undefined) this.currentRun.T19_firstInteractiveFrame = time;
      if (this.currentRun.T20_fullInitialization === undefined) this.currentRun.T20_fullInitialization = time;
      if (this.currentRun.T8_firstRender || this.currentRun.T17_firstRenderCall) {
        this.finalize();
      }
    }
  }

  public markFirstVisible(time: number = performance.now()): void {
    if (this.currentRun.T9_firstVisibleFrame === undefined) {
      this.currentRun.T9_firstVisibleFrame = time;
    }
    if (this.currentRun.T18_firstBrowserPaint === undefined) {
      this.currentRun.T18_firstBrowserPaint = time;
    }
  }

  public finalize(): StartupReport {
    const t = this.currentRun;
    const t0 = t.T0_navigationBegins ?? t.T0_homeInit ?? 0;
    const t1 = t.T1_homeRouteBegins ?? t0;
    const t2 = t.T2_homeReactRender ?? t1;
    const t3 = t.T3_canvasRequested ?? t2;
    const t4 = t.T4_canvasMounted ?? t.T1_canvasMount ?? t3;
    const t5 = t.T5_rendererCreated ?? t.T2_sceneCreation ?? t4;
    const t6 = t.T6_sceneCreated ?? t5;
    const t7 = t.T7_cameraCreated ?? t6;
    const t8 = t.T8_robotStartupBegins ?? t7;
    const t9 = t.T9_resourceManagerAccess ?? t.T3_resourceRequest ?? t8;
    const t10 = t.T10_cacheCheck ?? t9;
    const t11 = t.T11_resourceAcquisition ?? t.T5_proceduralGenComplete ?? t10;
    const t12 = t.T12_instanceCreation ?? t.T6_instanceAcquisition ?? t11;
    const t13 = t.T13_sceneAttachment ?? t.T7_sceneAttachment ?? t12;
    const t14 = t.T14_rendererSizing ?? t.T_transformEnd ?? t13;
    const t15 = t.T15_materialsReady ?? t14;
    const t16 = t.T16_environmentReady ?? t.T_pmremEnd ?? t15;
    const t17 = t.T17_firstRenderCall ?? t.T8_firstRender ?? t16;
    const t18 = t.T18_firstBrowserPaint ?? t.T9_firstVisibleFrame ?? t17;
    const t19 = t.T19_firstInteractiveFrame ?? t.T10_interactiveReady ?? t18;
    const t20 = t.T20_fullInitialization ?? t19;

    const diff = (a?: number, b?: number) => (a !== undefined && b !== undefined ? Math.max(0, a - b) : 0);

    const report: StartupReport = {
      isCold: this.isCold,
      timings: { ...t },
      milestones: {
        milestoneA_firstRobotPixel: Math.max(0, t18 - t0),
        milestoneB_visuallyComplete: Math.max(0, t17 - t0),
        milestoneC_interactiveReady: Math.max(0, t19 - t0),
      },
      waterfall: {
        T0_navigationBegins: t0,
        T1_homeRouteBegins: t1,
        T2_homeReactRender: t2,
        T3_canvasRequested: t3,
        T4_canvasMounted: t4,
        T5_rendererCreated: t5,
        T6_sceneCreated: t6,
        T7_cameraCreated: t7,
        T8_robotStartupBegins: t8,
        T9_resourceManagerAccess: t9,
        T10_cacheCheck: t10,
        T11_resourceAcquisition: t11,
        T12_instanceCreation: t12,
        T13_sceneAttachment: t13,
        T14_rendererSizing: t14,
        T15_materialsReady: t15,
        T16_environmentReady: t16,
        T17_firstRenderCall: t17,
        T18_firstBrowserPaint: t18,
        T19_firstInteractiveFrame: t19,
        T20_fullInitialization: t20,
      },
      intervals: {
        homeToCanvas: Math.max(0, t4 - t0),
        canvasToScene: Math.max(0, t5 - t4),
        rendererInitDuration: diff(t.T_rendererInitEnd, t.T_rendererInitStart),
        lightingInitDuration: diff(t.T_lightingInitEnd, t.T_lightingInitStart),
        sceneToResourceReq: Math.max(0, t9 - t5),
        resourceGenDuration: diff(t.T_proceduralGenComplete, t.T_proceduralGenStart),
        cloneDuration: diff(t.T_cloneEnd, t.T_cloneStart),
        instanceAcquisitionDuration: Math.max(0, t12 - t9),
        pmremDuration: diff(t.T_pmremEnd, t.T_pmremStart),
        sceneAttachmentDuration: Math.max(0, t13 - t12),
        transformDuration: diff(t.T_transformEnd, t.T_transformStart),
        controllerDuration: diff(t.T_controllerEnd, t.T_controllerStart),
        lodDuration: diff(t.T_lodEnd, t.T_lodStart),
        occlusionDuration: diff(t.T_occlusionEnd, t.T_occlusionStart),
        renderCallDuration: diff(t.T_renderEnd, t.T_renderStart),
        firstRenderDuration: Math.max(0, t17 - t13),
        firstVisibleDuration: Math.max(0, t18 - t17),
        interactiveReadyDuration: Math.max(0, t19 - t18),
        totalTimeToFirstVisible: Math.max(0, t18 - t0),
        totalTimeToInteractive: Math.max(0, t19 - t0),
      },
    };

    this.history.push(report);
    return report;
  }

  public getCurrentReport(): StartupReport | null {
    if (this.history.length > 0) {
      return this.history[this.history.length - 1];
    }
    return null;
  }

  public getAllReports(): StartupReport[] {
    return this.history;
  }
}

export const startupProfiler = StartupProfiler.getInstance();


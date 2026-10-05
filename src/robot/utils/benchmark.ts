import * as THREE from 'three';

export interface PerfBenchmarkReport {
  timestamp: number;
  navigation: {
    dns: number;
    tcp: number;
    ttfb: number;
    domContentLoaded: number;
    loadEventEnd: number;
    totalDuration: number;
  };
  paint: {
    firstPaint: number;
    firstContentfulPaint: number;
    largestContentfulPaint?: number;
  };
  resources: {
    totalRequests: number;
    totalTransferSizeKB: number;
    jsRequests: number;
    jsTransferSizeKB: number;
    cssRequests: number;
    cssTransferSizeKB: number;
  };
  robot: {
    drawCalls: number;
    triangles: number;
    gpuGeometries: number;
    gpuTextures: number;
    sceneObjectCount: number;
    sceneMeshCount: number;
    uniqueGeometries: number;
    uniqueMaterials: number;
    instancedMeshCount: number;
    avgFps: number;
    minFps: number;
    avgFrameTimeMs: number;
    maxFrameTimeMs: number;
  };
  memory?: {
    usedJSHeapSizeMB: number;
    totalJSHeapSizeMB: number;
  };
}

export function runPerformanceBenchmark(onComplete?: (report: PerfBenchmarkReport) => void): void {
  // Let initial scene settle for 500ms
  setTimeout(() => {
    collectBenchmark(onComplete);
  }, 600);
}

function collectBenchmark(onComplete?: (report: PerfBenchmarkReport) => void): void {
  // 1. Navigation & Paint Timing
  const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const paintEntries = performance.getEntriesByType('paint');

  let fp = 0;
  let fcp = 0;
  for (const entry of paintEntries) {
    if (entry.name === 'first-paint') fp = entry.startTime;
    if (entry.name === 'first-contentful-paint') fcp = entry.startTime;
  }

  const navMetrics = {
    dns: navEntry ? Math.round(navEntry.domainLookupEnd - navEntry.domainLookupStart) : 0,
    tcp: navEntry ? Math.round(navEntry.connectEnd - navEntry.connectStart) : 0,
    ttfb: navEntry ? Math.round(navEntry.responseStart - navEntry.requestStart) : 0,
    domContentLoaded: navEntry ? Math.round(navEntry.domContentLoadedEventEnd) : 0,
    loadEventEnd: navEntry ? Math.round(navEntry.loadEventEnd) : 0,
    totalDuration: navEntry ? Math.round(navEntry.duration) : 0,
  };

  // 2. Resources
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  let totalTransfer = 0;
  let jsTransfer = 0;
  let jsCount = 0;
  let cssTransfer = 0;
  let cssCount = 0;

  for (const r of resources) {
    const size = r.transferSize || (r as any).encodedBodySize || 0;
    totalTransfer += size;
    if (r.initiatorType === 'script' || r.name.endsWith('.js') || r.name.includes('.js?')) {
      jsCount++;
      jsTransfer += size;
    } else if (r.initiatorType === 'css' || r.name.endsWith('.css') || r.name.includes('.css?')) {
      cssCount++;
      cssTransfer += size;
    }
  }

  // 3. Robot Scene Metrics
  const robotScene = (window as any).__robotScene;
  let drawCalls = 0;
  let triangles = 0;
  let gpuGeometries = 0;
  let gpuTextures = 0;
  let sceneObjectCount = 0;
  let sceneMeshCount = 0;
  let uniqueGeometries = 0;
  let uniqueMaterials = 0;
  let instancedMeshCount = 0;

  if (robotScene && robotScene.isReady) {
    const renderer = robotScene.getRenderer() as THREE.WebGLRenderer;
    const scene = robotScene.getScene() as THREE.Scene;

    if (renderer && renderer.info) {
      drawCalls = renderer.info.render.calls;
      triangles = renderer.info.render.triangles;
      gpuGeometries = renderer.info.memory.geometries;
      gpuTextures = renderer.info.memory.textures;
    }

    const geoSet = new Set<string | number>();
    const matSet = new Set<string | number>();

    scene.traverse((child) => {
      sceneObjectCount++;
      if ((child as THREE.Mesh).isMesh) {
        sceneMeshCount++;
        const mesh = child as THREE.Mesh;
        if ((child as any).isInstancedMesh) {
          instancedMeshCount++;
        }
        if (mesh.geometry) {
          geoSet.add(mesh.geometry.id);
        }
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => matSet.add(m.uuid));
          } else {
            matSet.add(mesh.material.uuid);
          }
        }
      }
    });

    uniqueGeometries = geoSet.size;
    uniqueMaterials = matSet.size;
  }

  // 4. Measure 120 frames for FPS & frame times
  const frameTimes: number[] = [];
  let frameCount = 0;
  const targetFrames = 120;
  let lastFrameTime = performance.now();

  function measureFrame(now: number) {
    const delta = now - lastFrameTime;
    lastFrameTime = now;
    if (frameCount > 0) { // skip first jump
      frameTimes.push(delta);
    }
    frameCount++;

    if (frameCount <= targetFrames) {
      requestAnimationFrame(measureFrame);
    } else {
      finalizeReport();
    }
  }

  requestAnimationFrame(measureFrame);

  function finalizeReport() {
    let sumTime = 0;
    let maxTime = 0;
    let minTime = Infinity;

    for (const t of frameTimes) {
      sumTime += t;
      if (t > maxTime) maxTime = t;
      if (t < minTime) minTime = t;
    }

    const avgFrameTime = frameTimes.length ? sumTime / frameTimes.length : 16.67;
    const avgFps = avgFrameTime > 0 ? Math.round(1000 / avgFrameTime) : 60;
    const minFps = maxTime > 0 ? Math.round(1000 / maxTime) : 60;

    let memData: { usedJSHeapSizeMB: number; totalJSHeapSizeMB: number } | undefined;
    if ((performance as any).memory) {
      const mem = (performance as any).memory;
      memData = {
        usedJSHeapSizeMB: Math.round((mem.usedJSHeapSize / 1048576) * 10) / 10,
        totalJSHeapSizeMB: Math.round((mem.totalJSHeapSize / 1048576) * 10) / 10,
      };
    }

    const report: PerfBenchmarkReport = {
      timestamp: Date.now(),
      navigation: navMetrics,
      paint: {
        firstPaint: Math.round(fp),
        firstContentfulPaint: Math.round(fcp),
      },
      resources: {
        totalRequests: resources.length,
        totalTransferSizeKB: Math.round(totalTransfer / 1024),
        jsRequests: jsCount,
        jsTransferSizeKB: Math.round(jsTransfer / 1024),
        cssRequests: cssCount,
        cssTransferSizeKB: Math.round(cssTransfer / 1024),
      },
      robot: {
        drawCalls,
        triangles,
        gpuGeometries,
        gpuTextures,
        sceneObjectCount,
        sceneMeshCount,
        uniqueGeometries,
        uniqueMaterials,
        instancedMeshCount,
        avgFps,
        minFps,
        avgFrameTimeMs: Math.round(avgFrameTime * 100) / 100,
        maxFrameTimeMs: Math.round(maxTime * 100) / 100,
      },
      memory: memData,
    };

    (window as any).__PERF_BENCHMARK_RESULTS__ = report;

    // Render into DOM for headless / subagent inspection
    let el = document.getElementById('perf-benchmark-data');
    if (!el) {
      el = document.createElement('div');
      el.id = 'perf-benchmark-data';
      el.style.display = 'none';
      document.body.appendChild(el);
    }
    el.setAttribute('data-json', JSON.stringify(report));
    el.innerText = JSON.stringify(report, null, 2);

    console.log('__PERF_BENCHMARK_COMPLETE__:', JSON.stringify(report));

    if (onComplete) {
      onComplete(report);
    }
  }
}

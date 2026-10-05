import React, { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { RobotScene } from '../../robot/scene/RobotScene';
import { DebugStats } from '../../robot/arm/DebugManager';
import { Cpu, Activity, Layers, RotateCcw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

import { runPerformanceBenchmark } from '../../robot/utils/benchmark';
import { startupProfiler } from '../../robot/utils/startupProfiler';

interface RobotCanvasProps {
  className?: string;
}

export const RobotCanvas: React.FC<RobotCanvasProps> = ({ className = '' }) => {
  startupProfiler.mark('T3_canvasRequested');
  startupProfiler.mark('T1_canvasMount');
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<RobotScene | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [isWireframe, setIsWireframe] = useState(false);
  const [isExploded, setIsExploded] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [debugStats, setDebugStats] = useState<DebugStats | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useLayoutEffect(() => {
    startupProfiler.mark('T4_canvasMounted');
    if (!containerRef.current) return;

    let isCancelled = false;
    let spinnerTimer: any = null;

    const scene = new RobotScene({
      container: containerRef.current,
      // Load procedural engine directly with full MeshPhysicalMaterial clearcoat & bloom
      onLoaded: () => {
        if (isCancelled) return;
        if (spinnerTimer) clearTimeout(spinnerTimer);
        setIsLoading(false);
        setIsRendered(true);
        requestAnimationFrame(() => {
          startupProfiler.mark('T18_firstBrowserPaint');
          startupProfiler.markFirstVisible();
        });
        runPerformanceBenchmark();
      },
      onError: (err) => {
        if (isCancelled) return;
        if (spinnerTimer) clearTimeout(spinnerTimer);
        console.error('Robot initialization error:', err);
        setIsLoading(false);
        setLoadError('Robot init error: ' + (err?.stack || err?.message || String(err)));
      },
    });

    if (isCancelled) {
      scene.dispose();
      return;
    }

    sceneRef.current = scene;
    (window as any).__robotScene = scene;

    if (scene.isReady) {
      setIsRendered(true);
    } else {
      spinnerTimer = setTimeout(() => {
        if (!isCancelled && !sceneRef.current?.isReady) {
          setIsLoading(true);
        }
      }, 180);
    }

    return () => {
      isCancelled = true;
      if (spinnerTimer) clearTimeout(spinnerTimer);
      (window as any).__robotScene = null;
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Continuous Zoom percentage tracking loop for responsive HUD display
  useEffect(() => {
    let animId: number;
    const trackZoom = () => {
      if (sceneRef.current) {
        const mag = sceneRef.current.getMagnificationPercent();
        if (mag !== zoomPercent) {
          setZoomPercent(mag);
        }
      }
      animId = requestAnimationFrame(trackZoom);
    };
    animId = requestAnimationFrame(trackZoom);
    return () => cancelAnimationFrame(animId);
  }, [zoomPercent]);

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center select-none overflow-hidden ${className}`}
    >
      {/* Three.js Canvas Container: immediately visible on first valid WebGL render without CSS fade lag */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full cursor-crosshair z-10 opacity-100"
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#030014]/80 backdrop-blur-md transition-opacity duration-500">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-2 border-violet-500/20 border-t-violet-400 animate-spin" />
            <Cpu className="w-6 h-6 text-violet-400 absolute" />
          </div>
          <div className="mt-4 flex flex-col items-center space-y-1">
            <span className="text-xs font-mono uppercase tracking-widest text-violet-300 font-medium">
              Initializing 3D Core...
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              Calibrating PBR Shaders & Kinematics
            </span>
          </div>
        </div>
      )}

      {/* Top-Right Secondary Action Toolbar */}
      {!isLoading && !loadError && (
        <div className="absolute top-6 right-4 sm:right-6 z-20 flex items-center space-x-2 pointer-events-auto opacity-75 hover:opacity-100 transition-opacity">
          {isWireframe && debugStats && (
            <div className="px-2.5 py-1 rounded-md bg-purple-950/80 border border-purple-500/40 text-[10px] font-mono text-purple-300 backdrop-blur-sm shadow-lg">
              {debugStats.armTriangleCount
                ? `${debugStats.armTriangleCount.toLocaleString()} Triangles / Arm (~${Math.round(debugStats.triangleCount / 1000)}k Total)`
                : `${debugStats.triangleCount.toLocaleString()} Triangles`} • Low-Poly Hierarchy
            </div>
          )}

          <button
            onClick={() => sceneRef.current?.zoomIn()}
            title="Zoom In (Close Macro Inspection) [Mouse Wheel Up / Key: +]"
            className="p-2 rounded-lg border backdrop-blur-md transition-all duration-300 bg-[#09061a]/60 border-zinc-800/80 text-zinc-400 hover:text-violet-300 hover:border-violet-500/40"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={() => sceneRef.current?.zoomOut()}
            title="Zoom Out (Full Body Panoramic View) [Mouse Wheel Down / Key: -]"
            className="p-2 rounded-lg border backdrop-blur-md transition-all duration-300 bg-[#09061a]/60 border-zinc-800/80 text-zinc-400 hover:text-violet-300 hover:border-violet-500/40"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            onClick={() => sceneRef.current?.resetZoom()}
            title="Reset Camera Zoom to 100% [Double-click / Key: 0]"
            className="p-2 rounded-lg border backdrop-blur-md transition-all duration-300 bg-[#09061a]/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (sceneRef.current) {
                const active = sceneRef.current.toggleExplodedView();
                setIsExploded(active);
              }
            }}
            title="Toggle Exploded Inspection View (Section 31)"
            className={`p-2 rounded-lg border backdrop-blur-md transition-all duration-300 ${
              isExploded
                ? 'bg-violet-600/40 border-violet-400 text-violet-200 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                : 'bg-[#09061a]/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            <Layers className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (sceneRef.current) {
                const active = sceneRef.current.toggleDebugMode();
                setIsWireframe(active);
                setDebugStats(sceneRef.current.getDebugStats());
              }
            }}
            title="Toggle Developer Debug Mode (Wireframe & Joint Axes)"
            className={`p-2 rounded-lg border backdrop-blur-md transition-all duration-300 ${
              isWireframe
                ? 'bg-purple-600/30 border-purple-400 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                : 'bg-[#09061a]/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            <Activity className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating Tactical Zoom Controller HUD (Right Edge) */}
      {!isLoading && !loadError && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 hidden sm:flex flex-col items-center space-y-2 p-2 rounded-2xl bg-[#09061a]/80 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.55)] pointer-events-auto transition-all">
          <div className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 font-semibold px-1">
            Zoom
          </div>

          {/* Zoom In (+) */}
          <button
            onClick={() => sceneRef.current?.zoomIn()}
            title="Zoom In (Close Macro Inspection) [Mouse Wheel Up / Key: +]"
            className="p-2 rounded-xl text-zinc-400 hover:text-violet-300 hover:bg-violet-600/20 active:scale-95 transition-all"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Zoom Magnification Badge */}
          <button
            onClick={() => sceneRef.current?.resetZoom()}
            title="Current Magnification (Click to Reset to 100%)"
            className="w-12 py-1 text-center font-mono text-[10px] font-bold text-violet-300 hover:text-white rounded-lg bg-violet-950/60 border border-violet-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)] hover:border-violet-400 transition-all"
          >
            {zoomPercent}%
          </button>

          {/* Zoom Out (-) */}
          <button
            onClick={() => sceneRef.current?.zoomOut()}
            title="Zoom Out (Full Body Panoramic View) [Mouse Wheel Down / Key: -]"
            className="p-2 rounded-xl text-zinc-400 hover:text-violet-300 hover:bg-violet-600/20 active:scale-95 transition-all"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <div className="w-6 h-[1px] bg-white/[0.08] my-1" />

          {/* Preset: Macro Face/Visor */}
          <button
            onClick={() => sceneRef.current?.setZoomPreset('closeup')}
            title="Macro Close-up View (Visor & Eyes: 240%)"
            className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-white/[0.04] text-zinc-400 hover:text-violet-300 hover:bg-violet-600/20 transition-all"
          >
            HEAD
          </button>

          {/* Preset: Hero Portrait */}
          <button
            onClick={() => sceneRef.current?.setZoomPreset('hero')}
            title="Hero Portrait View (Default: 100%)"
            className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-white/[0.04] text-zinc-400 hover:text-violet-300 hover:bg-violet-600/20 transition-all"
          >
            HERO
          </button>

          {/* Preset: Full Body Wide */}
          <button
            onClick={() => sceneRef.current?.setZoomPreset('wide')}
            title="Full Body Panoramic View (Head-to-Toe: ~48%)"
            className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-white/[0.04] text-zinc-400 hover:text-violet-300 hover:bg-violet-600/20 transition-all"
          >
            BODY
          </button>

          <div className="w-6 h-[1px] bg-white/[0.08] my-1" />

          {/* Reset Zoom Button */}
          <button
            onClick={() => sceneRef.current?.resetZoom()}
            title="Reset Zoom to 100% [Key: 0]"
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] active:scale-95 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error Fallback Banner */}
      {loadError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-[#060317]/95">
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-950/20 text-red-400 max-w-sm">
            <p className="text-sm font-medium">{loadError}</p>
            <p className="text-xs text-zinc-400 mt-2">
              Please verify your browser supports WebGL 2.0 with hardware acceleration.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RobotCanvas;

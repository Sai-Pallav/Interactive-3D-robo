import React, { useState, useEffect, useRef } from 'react';
import { RobotCanvas } from './components/robot/RobotCanvas';
import {
  Layers,
  Activity,
  RotateCcw,
  Maximize2,
  Minimize2,
  Download,
  Info,
  Sliders,
  Cpu,
  Eye,
  Crosshair,
  Shield,
  Zap,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Compass,
  ZoomIn,
  ZoomOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

export const App: React.FC = () => {
  const [isExploded, setIsExploded] = useState(false);
  const [isWireframe, setIsWireframe] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'view' | 'kinematics' | 'diagnostics' | 'specs'>('view');
  const [isDeckCollapsed, setIsDeckCollapsed] = useState(false);
  const [fps, setFps] = useState(60);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [autoRotate, setAutoRotate] = useState(false);
  const [orbitAngleDeg, setOrbitAngleDeg] = useState(-10);
  const autoRotateRef = useRef<number | null>(null);

  // Monitor FPS, Camera Zoom Magnification and Orbit Yaw Angle
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const loop = (now: number) => {
      frameCount++;
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }

      // Check zoom magnification and orbit angle from window.__robotScene if available
      const scene = (window as any).__robotScene;
      if (scene) {
        if (typeof scene.getZoom === 'function') {
          const mag = typeof scene.getMagnificationPercent === 'function'
            ? scene.getMagnificationPercent()
            : Math.round((1.0 / scene.getZoom()) * 100);
          if (mag !== zoomLevel) {
            setZoomLevel(mag);
          }
        }

        let currentYawRad = 0;
        if (typeof scene.getRobotYaw === 'function') {
          currentYawRad = scene.getRobotYaw();
        } else if (scene.robotNodes?.root) {
          currentYawRad = scene.robotNodes.root.rotation.y;
        }
        let deg = Math.round((currentYawRad * 180) / Math.PI) % 360;
        if (deg > 180) deg -= 360;
        if (deg < -180) deg += 360;
        setOrbitAngleDeg(deg);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [zoomLevel]);

  // Support automated testing URL parameters (e.g. ?yaw=180&zoom=100)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const yawParam = params.get('yaw');
    const zoomParam = params.get('zoom');
    const collapsedParam = params.get('collapsed');
    if (collapsedParam === '1') {
      setIsDeckCollapsed(true);
    }
    if (yawParam !== null || zoomParam !== null) {
      const targetDeg = yawParam !== null ? parseFloat(yawParam) : null;
      const targetZoom = zoomParam !== null ? parseFloat(zoomParam) : null;
      const timer = setInterval(() => {
        const scene = (window as any).__robotScene;
        if (scene && scene.robotNodes?.root) {
          if (targetDeg !== null && !isNaN(targetDeg)) {
            const rad = (targetDeg * Math.PI) / 180;
            if (typeof scene.setRobotYaw === 'function') {
              scene.setRobotYaw(rad, false);
            } else {
              scene.robotNodes.root.rotation.y = rad;
            }
            setOrbitAngleDeg(targetDeg);
          }
          if (targetZoom !== null && !isNaN(targetZoom)) {
            if (typeof scene.setZoom === 'function') {
              scene.setZoom(100 / targetZoom);
              setZoomLevel(targetZoom);
            }
          }
          clearInterval(timer);
        }
      }, 50);
      return () => clearInterval(timer);
    }
  }, []);

  // Handle Auto Rotation
  useEffect(() => {
    if (!autoRotate) {
      if (autoRotateRef.current) cancelAnimationFrame(autoRotateRef.current);
      return;
    }

    const scene = (window as any).__robotScene;
    if (scene && typeof scene.setRobotYaw === 'function' && scene.robotNodes?.root) {
      scene.setRobotYaw(scene.robotNodes.root.rotation.y, false);
    }

    let lastTick = performance.now();
    const rotateLoop = (now: number) => {
      const dt = (now - lastTick) / 1000;
      lastTick = now;
      const scene = (window as any).__robotScene;
      if (scene && scene.robotNodes?.root) {
        scene.robotNodes.root.rotation.y += dt * 0.35;
      }
      autoRotateRef.current = requestAnimationFrame(rotateLoop);
    };

    autoRotateRef.current = requestAnimationFrame(rotateLoop);
    return () => {
      if (autoRotateRef.current) cancelAnimationFrame(autoRotateRef.current);
    };
  }, [autoRotate]);

  const handleZoomIn = () => {
    const scene = (window as any).__robotScene;
    if (scene && typeof scene.zoomIn === 'function') {
      scene.zoomIn();
    }
  };

  const handleZoomOut = () => {
    const scene = (window as any).__robotScene;
    if (scene && typeof scene.zoomOut === 'function') {
      scene.zoomOut();
    }
  };

  const handleSetPreset = (preset: 'closeup' | 'hero' | 'wide') => {
    const scene = (window as any).__robotScene;
    if (scene && typeof scene.setZoomPreset === 'function') {
      scene.setZoomPreset(preset);
    }
  };

  const handleSetViewAngle = (targetYawRad: number) => {
    setAutoRotate(false);
    const scene = (window as any).__robotScene;
    if (scene) {
      if (typeof scene.setRobotYaw === 'function') {
        scene.setRobotYaw(targetYawRad, true);
      } else if (scene.robotNodes?.root) {
        scene.robotNodes.root.rotation.y = targetYawRad;
      }
    }
  };

  const handleAngleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const deg = Number(e.target.value);
    setAutoRotate(false);
    const rad = (deg * Math.PI) / 180;
    const scene = (window as any).__robotScene;
    if (scene) {
      if (typeof scene.setRobotYaw === 'function') {
        scene.setRobotYaw(rad, false);
      } else if (scene.robotNodes?.root) {
        scene.robotNodes.root.rotation.y = rad;
      }
    }
    setOrbitAngleDeg(deg);
  };

  const handleZoomSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const mag = Number(e.target.value);
    const scene = (window as any).__robotScene;
    if (scene && typeof scene.setZoom === 'function') {
      const newCameraZoom = 100 / mag;
      scene.setZoom(newCameraZoom);
      setZoomLevel(mag);
    }
  };

  const handleResetZoom = () => {
    const scene = (window as any).__robotScene;
    if (scene) {
      scene.resetZoom();
      setZoomLevel(100);
    }
  };

  const handleToggleExploded = () => {
    const scene = (window as any).__robotScene;
    if (scene) {
      const active = scene.toggleExplodedView();
      setIsExploded(active);
    }
  };

  const handleToggleWireframe = () => {
    const scene = (window as any).__robotScene;
    if (scene) {
      const active = scene.toggleDebugMode();
      setIsWireframe(active);
    }
  };

  const handleResetGaze = () => {
    const scene = (window as any).__robotScene;
    if (scene && typeof scene.resetGaze === 'function') {
      scene.resetGaze();
    }
  };

  const handleHandPose = (side: 'left' | 'right', pose: string) => {
    const setPose = (window as any).__setHandPose;
    if (typeof setPose === 'function') {
      setPose(side, pose, 0.4);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const handleDownloadGLB = () => {
    const link = document.createElement('a');
    link.href = '/models/robot.glb';
    link.download = 'procedural-robot-hyperion7.glb';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#030014] text-slate-100 flex flex-col font-sans select-none">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.14)_0%,rgba(80,70,228,0.06)_50%,transparent_75%)] blur-3xl pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Subtle Spatial Horizon Line & Grid Floor */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle at center, rgba(168,85,247,0.15) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
          maskImage: 'radial-gradient(circle at 50% 60%, black 25%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 60%, black 25%, transparent 70%)',
        }}
      />

      {/* TOP COMMAND HEADER */}
      <header className="relative z-30 flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 border-b border-white/[0.07] bg-[#060317]/85 backdrop-blur-xl shrink-0">
        <div className="flex items-center space-x-2.5 sm:space-x-3.5">
          <button
            onClick={() => setIsDeckCollapsed(!isDeckCollapsed)}
            title={isDeckCollapsed ? "Open Control Panel" : "Collapse Control Panel"}
            className={`p-2 rounded-xl border transition-all ${
              !isDeckCollapsed
                ? 'bg-violet-600/30 border-violet-400 text-violet-200 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white hover:border-zinc-600'
            }`}
          >
            {isDeckCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>

          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-[0_0_20px_rgba(147,51,234,0.45)] border border-violet-400/40">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white font-['Sora']">
                INNOVEX HYPERION-7
              </h1>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                STANDALONE
              </span>
            </div>
            <p className="text-[11px] font-mono text-zinc-400 hidden sm:block">
              Procedural Humanoid Three.js WebGL Core • 70+ Sub-Assemblies (Full 360° Coverage)
            </p>
          </div>
        </div>

        {/* Live Engine Badges */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="hidden md:flex items-center space-x-2 px-3 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs font-mono">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-zinc-400">ENGINE:</span>
            <span className="text-emerald-400 font-semibold">{fps} FPS</span>
          </div>

          <div className="hidden lg:flex items-center space-x-2 px-3 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs font-mono">
            <Shield className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-zinc-400">PBR:</span>
            <span className="text-violet-300">CLEARCOAT</span>
          </div>

          {/* Quick Header Action Buttons */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={handleToggleExploded}
              title="Toggle Exploded Mechanical View"
              className={`p-2 rounded-lg border text-xs transition-all ${
                isExploded
                  ? 'bg-violet-600/40 border-violet-400 text-violet-200 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                  : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white hover:border-zinc-600'
              }`}
            >
              <Layers className="w-4 h-4" />
            </button>

            <button
              onClick={handleToggleWireframe}
              title="Toggle Wireframe & Joint Axes"
              className={`p-2 rounded-lg border text-xs transition-all ${
                isWireframe
                  ? 'bg-purple-600/40 border-purple-400 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                  : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white hover:border-zinc-600'
              }`}
            >
              <Activity className="w-4 h-4" />
            </button>

            <button
              onClick={handleZoomIn}
              title="Zoom In (Close Macro Inspection) [Mouse Wheel Up / Key: +]"
              className="p-2 rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              onClick={handleZoomOut}
              title="Zoom Out (Full Body Panoramic View) [Mouse Wheel Down / Key: -]"
              className="p-2 rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <button
              onClick={handleResetZoom}
              title="Reset Camera Zoom & Alignment [Double-click / Key: 0]"
              className="p-2 rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={handleDownloadGLB}
              title="Download Robot 3D GLB Model (885 KB)"
              className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-violet-500/40 bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 hover:text-white transition-all text-xs font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              <span>GLB</span>
            </button>

            <button
              onClick={() => setIsSpecModalOpen(true)}
              title="System Specification & Forensic Architecture"
              className="p-2 rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
            >
              <Info className="w-4 h-4" />
            </button>

            <button
              onClick={toggleFullscreen}
              title="Toggle Fullscreen"
              className="p-2 rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE: LEFT PANEL, RIGHT ROBO */}
      <div className="relative flex-1 flex flex-col md:flex-row w-full h-[calc(100vh-57px)] overflow-hidden">
        {/* LEFT CONTROL PANEL */}
        {!isDeckCollapsed ? (
          <aside className="w-full md:w-[380px] lg:w-[410px] xl:w-[440px] h-[48vh] md:h-full shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-white/[0.08] bg-[#060317]/95 backdrop-blur-2xl z-20 shadow-[8px_0_32px_rgba(0,0,0,0.6)] transition-all duration-300">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.08] bg-white/[0.02]">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-violet-600/30 border border-violet-500/30 text-violet-300">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold tracking-wide uppercase text-white font-mono">
                    CONTROL PANEL
                  </h2>
                  <p className="text-[10px] text-zinc-400 font-mono">
                    Studio Telemetry & Camera
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsDeckCollapsed(true)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-all"
                title="Collapse Panel (Maximize 3D Stage)"
              >
                <PanelLeftClose className="w-4 h-4 hidden md:block" />
                <ChevronUp className="w-4 h-4 md:hidden" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center px-3 py-2 border-b border-white/[0.06] bg-black/20 gap-1.5">
              <button
                onClick={() => setActiveTab('view')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all text-center flex items-center justify-center space-x-1.5 ${
                  activeTab === 'view'
                    ? 'bg-violet-600/30 text-violet-200 border border-violet-500/40 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View</span>
              </button>
              <button
                onClick={() => setActiveTab('kinematics')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all text-center flex items-center justify-center space-x-1.5 ${
                  activeTab === 'kinematics'
                    ? 'bg-violet-600/30 text-violet-200 border border-violet-500/40 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Kinematics</span>
              </button>
              <button
                onClick={() => setActiveTab('diagnostics')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all text-center flex items-center justify-center space-x-1.5 ${
                  activeTab === 'diagnostics'
                    ? 'bg-violet-600/30 text-violet-200 border border-violet-500/40 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Diagnostics</span>
              </button>
            </div>

            {/* Scrollable Panel Body */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 custom-scrollbar text-xs font-sans">
              {activeTab === 'view' && (
                <div className="space-y-3.5">
                  {/* Quick Action Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleToggleExploded}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all ${
                        isExploded
                          ? 'bg-violet-600/30 border-violet-400 text-violet-200 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                          : 'bg-white/[0.03] border-white/[0.08] text-zinc-300 hover:border-zinc-600'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      <span className="font-semibold text-[11px]">Exploded View</span>
                      <span className="text-[10px] text-zinc-400">{isExploded ? 'ACTIVE' : 'EXPAND'}</span>
                    </button>

                    <button
                      onClick={() => setAutoRotate(!autoRotate)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all ${
                        autoRotate
                          ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                          : 'bg-white/[0.03] border-white/[0.08] text-zinc-300 hover:border-zinc-600'
                      }`}
                    >
                      <Compass className="w-4 h-4" />
                      <span className="font-semibold text-[11px]">Auto Rotate</span>
                      <span className="text-[10px] text-zinc-400">{autoRotate ? 'TURNING' : 'OFF'}</span>
                    </button>

                    <button
                      onClick={handleResetZoom}
                      className="p-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:border-zinc-600 flex flex-col items-center justify-center space-y-1 transition-all"
                    >
                      <RotateCcw className="w-4 h-4 text-zinc-400" />
                      <span className="font-semibold text-[11px]">Reset View</span>
                      <span className="text-[10px] text-zinc-400">100% SCALE</span>
                    </button>

                    <div className="p-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] flex flex-col items-center justify-center space-y-0.5 text-center">
                      <span className="text-[10px] font-mono text-zinc-400">CAMERA ZOOM</span>
                      <span className="text-sm font-bold font-mono text-violet-300">
                        {zoomLevel}%
                      </span>
                      <span className="text-[9px] text-zinc-500 font-mono">SCROLL / PINCH</span>
                    </div>
                  </div>

                  {/* Dedicated Zoom Controls & Slider */}
                  <div className="p-3 rounded-xl bg-black/30 border border-white/[0.06] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[11px] font-mono font-medium text-zinc-300">ZOOM:</span>
                        <span className="text-[11px] font-mono font-bold text-violet-400">{zoomLevel}%</span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {zoomLevel > 140 ? '(Macro)' : zoomLevel < 70 ? '(Wide)' : '(Hero)'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={handleZoomIn}
                          className="p-1 px-2 rounded-lg bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 flex items-center space-x-1 text-[10px] font-mono transition-all"
                          title="Zoom In [Key: +]"
                        >
                          <ZoomIn className="w-3 h-3" />
                          <span>In</span>
                        </button>
                        <button
                          onClick={handleZoomOut}
                          className="p-1 px-2 rounded-lg bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 flex items-center space-x-1 text-[10px] font-mono transition-all"
                          title="Zoom Out [Key: -]"
                        >
                          <ZoomOut className="w-3 h-3" />
                          <span>Out</span>
                        </button>
                      </div>
                    </div>

                    {/* Continuous Interactive Zoom Slider */}
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono text-zinc-500 min-w-[40px]">45%</span>
                      <input
                        type="range"
                        min="45"
                        max="250"
                        value={zoomLevel}
                        onChange={handleZoomSliderChange}
                        className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                      />
                      <span className="text-[10px] font-mono text-zinc-500 min-w-[40px] text-right">250%</span>
                    </div>

                    {/* Instant View Presets */}
                    <div className="flex flex-col space-y-1.5 pt-1.5 border-t border-white/[0.04]">
                      <span className="text-[10px] font-mono text-zinc-500">QUICK FRAMING PRESETS:</span>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          onClick={() => handleSetPreset('closeup')}
                          className="px-1.5 py-1 rounded text-[10px] font-mono bg-white/[0.04] hover:bg-violet-600/20 text-zinc-300 hover:text-violet-200 border border-white/[0.06] transition-all text-center"
                        >
                          Visor (240%)
                        </button>
                        <button
                          onClick={() => handleSetPreset('hero')}
                          className="px-1.5 py-1 rounded text-[10px] font-mono bg-white/[0.04] hover:bg-violet-600/20 text-zinc-300 hover:text-violet-200 border border-white/[0.06] transition-all text-center"
                        >
                          Hero (100%)
                        </button>
                        <button
                          onClick={() => handleSetPreset('wide')}
                          className="px-1.5 py-1 rounded text-[10px] font-mono bg-white/[0.04] hover:bg-violet-600/20 text-zinc-300 hover:text-violet-200 border border-white/[0.06] transition-all text-center"
                        >
                          Full (48%)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 360° CAD INSPECTION & REAR VALIDATION */}
                  <div className="p-3 rounded-xl bg-black/30 border border-white/[0.06] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <Compass className="w-3.5 h-3.5 text-violet-400" />
                        <span className="text-[11px] font-mono font-medium text-zinc-300">
                          360° INSPECTION:
                        </span>
                        <span className="text-[11px] font-mono font-bold text-violet-400">
                          {orbitAngleDeg > 0 ? `+${orbitAngleDeg}°` : `${orbitAngleDeg}°`}
                        </span>
                      </div>
                      <button
                        onClick={() => handleSetViewAngle(Math.PI)}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 border border-violet-500/40 transition-all font-semibold shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                        title="Instant Rear Spine & Pelvis Audit"
                      >
                        ★ Rear (180°)
                      </button>
                    </div>

                    {/* Continuous Orbit Azimuth Slider */}
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono text-zinc-500 min-w-[40px]">-180°</span>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={orbitAngleDeg}
                        onChange={handleAngleSliderChange}
                        className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                      />
                      <span className="text-[10px] font-mono text-zinc-500 min-w-[40px] text-right">+180°</span>
                    </div>

                    {/* Audit Angle Preset Buttons */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 pt-1.5 border-t border-white/[0.04]">
                      {[
                        { label: 'Hero 3/4', deg: -10, rad: -10 * (Math.PI / 180), desc: '-10°' },
                        { label: 'Front', deg: 0, rad: 0, desc: '0°' },
                        { label: 'Right Side', deg: -90, rad: -Math.PI * 0.5, desc: '-90°' },
                        { label: 'Left Side', deg: 90, rad: Math.PI * 0.5, desc: '+90°' },
                        { label: 'Rear-Right', deg: -135, rad: -Math.PI * 0.75, desc: '-135°' },
                        { label: 'Rear-Left', deg: 135, rad: Math.PI * 0.75, desc: '+135°' },
                        { label: 'Straight Rear', deg: 180, rad: Math.PI, desc: '180°' },
                      ].map((preset) => {
                        const isActive =
                          Math.abs(orbitAngleDeg - preset.deg) <= 12 ||
                          (preset.deg === 180 && Math.abs(Math.abs(orbitAngleDeg) - 180) <= 12);
                        return (
                          <button
                            key={preset.label}
                            onClick={() => handleSetViewAngle(preset.rad)}
                            className={`p-1.5 rounded-lg border text-center transition-all flex flex-col items-center justify-center ${
                              isActive
                                ? 'bg-violet-600/30 border-violet-400 text-violet-200 shadow-[0_0_10px_rgba(168,85,247,0.35)]'
                                : 'bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
                            }`}
                            title={`${preset.label} [${preset.desc}]`}
                          >
                            <span className="text-[10px] font-medium leading-tight">{preset.label}</span>
                            <span className="text-[9px] font-mono text-zinc-500">{preset.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'kinematics' && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                    <span className="font-mono">GAZE & POSTURE OVERRIDES</span>
                    <button
                      onClick={handleResetGaze}
                      className="px-2 py-0.5 rounded bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 font-mono text-[10px]"
                    >
                      Reset Center
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleHandPose('right', 'point')}
                      className="p-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-violet-600/20 text-zinc-300 font-mono text-[11px] transition-all text-left"
                    >
                      <span className="block text-violet-300 font-semibold">Right Arm</span>
                      <span className="text-[10px] text-zinc-400">Point Gesture</span>
                    </button>
                    <button
                      onClick={() => handleHandPose('right', 'grip')}
                      className="p-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-violet-600/20 text-zinc-300 font-mono text-[11px] transition-all text-left"
                    >
                      <span className="block text-violet-300 font-semibold">Right Arm</span>
                      <span className="text-[10px] text-zinc-400">Grip Clench</span>
                    </button>
                    <button
                      onClick={() => handleHandPose('left', 'open')}
                      className="p-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-violet-600/20 text-zinc-300 font-mono text-[11px] transition-all text-left"
                    >
                      <span className="block text-violet-300 font-semibold">Left Arm</span>
                      <span className="text-[10px] text-zinc-400">Open Palm</span>
                    </button>
                    <button
                      onClick={() => handleHandPose('left', 'relaxed')}
                      className="p-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-violet-600/20 text-zinc-300 font-mono text-[11px] transition-all text-left"
                    >
                      <span className="block text-violet-300 font-semibold">Left Arm</span>
                      <span className="text-[10px] text-zinc-400">Relaxed Idle</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'diagnostics' && (
                <div className="space-y-3 font-mono text-[11px]">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.06]">
                      <div className="text-zinc-500 text-[10px]">TOTAL TRIANGLES</div>
                      <div className="text-sm font-bold text-violet-300">~42,000</div>
                      <div className="text-[9px] text-zinc-400">Procedural Mesh</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.06]">
                      <div className="text-zinc-500 text-[10px]">SUB-ASSEMBLIES</div>
                      <div className="text-sm font-bold text-emerald-400">70+ Modules</div>
                      <div className="text-[9px] text-zinc-400">Head, Torso, Spine, Limbs</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.06]">
                      <div className="text-zinc-500 text-[10px]">DRS RESOLUTION</div>
                      <div className="text-sm font-bold text-indigo-300">Dynamic 1.0x-2.0x</div>
                      <div className="text-[9px] text-zinc-400">Adaptive Scaling</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.06]">
                      <div className="text-zinc-500 text-[10px]">NETWORK DEP</div>
                      <div className="text-sm font-bold text-emerald-300">0 KB (Isolated)</div>
                      <div className="text-[9px] text-zinc-400">Pure WebGL Math</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.06] text-[10px] space-y-1">
                    <div className="text-zinc-400 font-semibold uppercase">MATERIAL PIPELINE:</div>
                    <div className="text-zinc-300">• Liquid Ceramic Clearcoat PBR</div>
                    <div className="text-zinc-300">• Titanium Alloy Mechanical Core</div>
                    <div className="text-zinc-300">• Translucent Neon Polymer Visor</div>
                  </div>
                </div>
              )}
            </div>

            {/* Panel Footer */}
            <div className="p-3 border-t border-white/[0.06] bg-black/40 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
              <span>🖱️ Drag • 📜 Zoom</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleDownloadGLB}
                  className="text-violet-400 hover:text-violet-300 font-medium"
                  title="Download GLB 3D Model"
                >
                  Download GLB
                </button>
                <span className="text-zinc-600">•</span>
                <button
                  onClick={handleResetZoom}
                  className="text-zinc-400 hover:text-white"
                  title="Reset Camera Zoom"
                >
                  Reset (0)
                </button>
              </div>
            </div>
          </aside>
        ) : (
          /* Slim Collapsed Strip on Desktop */
          <aside className="hidden md:flex w-12 shrink-0 h-full flex-col items-center py-3 space-y-3 border-r border-white/[0.08] bg-[#060317]/90 backdrop-blur-xl z-20">
            <button
              onClick={() => setIsDeckCollapsed(false)}
              className="p-2 rounded-xl bg-violet-600/20 text-violet-300 hover:bg-violet-600/40 hover:text-white transition-all border border-violet-500/30"
              title="Expand Control Panel"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
            <div className="w-6 h-[1px] bg-white/[0.08]" />
            <button
              onClick={() => { setActiveTab('view'); setIsDeckCollapsed(false); }}
              className={`p-2 rounded-lg transition-all ${activeTab === 'view' ? 'text-violet-300 bg-violet-600/30' : 'text-zinc-400 hover:text-white'}`}
              title="Camera & View"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setActiveTab('kinematics'); setIsDeckCollapsed(false); }}
              className={`p-2 rounded-lg transition-all ${activeTab === 'kinematics' ? 'text-violet-300 bg-violet-600/30' : 'text-zinc-400 hover:text-white'}`}
              title="Kinematics"
            >
              <Zap className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setActiveTab('diagnostics'); setIsDeckCollapsed(false); }}
              className={`p-2 rounded-lg transition-all ${activeTab === 'diagnostics' ? 'text-violet-300 bg-violet-600/30' : 'text-zinc-400 hover:text-white'}`}
              title="Diagnostics"
            >
              <Activity className="w-4 h-4" />
            </button>
            <div className="w-6 h-[1px] bg-white/[0.08]" />
            <button
              onClick={handleToggleExploded}
              className={`p-2 rounded-lg transition-all ${isExploded ? 'text-violet-300 bg-violet-600/30' : 'text-zinc-400 hover:text-white'}`}
              title="Exploded View"
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={`p-2 rounded-lg transition-all ${autoRotate ? 'text-indigo-300 bg-indigo-600/30' : 'text-zinc-400 hover:text-white'}`}
              title="Auto Rotate"
            >
              <Compass className="w-4 h-4" />
            </button>
          </aside>
        )}

        {/* RIGHT SIDE: 3D ROBOT CANVAS STAGE */}
        <main className="relative flex-1 h-full w-full overflow-hidden bg-[#030014]">
          <RobotCanvas className="w-full h-full" />

          {/* Floating Controls Button if collapsed on mobile */}
          {isDeckCollapsed && (
            <button
              onClick={() => setIsDeckCollapsed(false)}
              className="md:hidden absolute top-4 left-4 z-20 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#060317]/90 border border-violet-500/40 text-violet-300 text-xs font-mono backdrop-blur-md shadow-xl"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>CONTROLS</span>
            </button>
          )}

          {/* INTERACTION HINT OVERLAY */}
          <div className="absolute top-4 left-4 md:left-6 z-10 pointer-events-none flex flex-col space-y-1">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/[0.08] text-[11px] font-mono text-zinc-300">
              <Crosshair className="w-3.5 h-3.5 text-violet-400" />
              <span>INTERACTIVE HEAD & GAZE TRACKING</span>
            </div>
          </div>

          {/* BOTTOM HELPER HINTS */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-center">
            <span className="text-[10px] font-mono text-zinc-400 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/[0.05]">
              🖱️ Mouse track • 📜 Scroll wheel to zoom in & out • ⚡ Double-click to reset [Keys: + - 0]
            </span>
          </div>
        </main>
      </div>

      {/* SPECIFICATION & ARCHITECTURE MODAL */}
      {isSpecModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="relative w-full max-w-3xl max-h-[85vh] rounded-2xl border border-white/[0.12] bg-[#08041d] p-6 shadow-2xl flex flex-col overflow-hidden text-zinc-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-violet-600/30 border border-violet-500/40 text-violet-300">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white font-['Sora']">
                    INNOVEX ARENA ROBOT ARCHITECTURE
                  </h2>
                  <p className="text-xs font-mono text-zinc-400">
                    Self-Contained Standalone Procedural WebGL Engine
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSpecModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs leading-relaxed font-mono">
              <div className="p-3.5 rounded-xl bg-violet-950/30 border border-violet-500/30 text-violet-200">
                <strong className="block text-sm font-semibold mb-1 text-white">
                  Independent Workspace Deployment Notice
                </strong>
                This folder contains the complete, 100% self-sufficient procedural humanoid robot package. It can be moved anywhere on your system or server and run via <code className="text-violet-300 bg-black/40 px-1 py-0.5 rounded">npm run dev</code> without any external dependencies from the parent workspace.
              </div>

              <div>
                <h3 className="text-xs uppercase font-bold text-white tracking-wider mb-2">
                  System Architecture & Sub-Assemblies
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                  <li><strong>Head & Visor:</strong> RobotHead, RobotVisor, RobotJaw, RobotNeck, RobotSideModule with emissive pulse.</li>
                  <li><strong>Torso & Spine:</strong> ChestAssembly with articulated vertebrae, AbdomenAssembly, WaistAssembly.</li>
                  <li><strong>Full 360° Posterior Coverage:</strong> Sculpted cranial armor shells, 4-segment posterior cervical column, thoracic backbone with twin radiator matrices & cooling impellers, 5-segment articulated posterior spine, lumbar load-transfer yoke, rear waist bearing housing, sculpted sacral pelvic shield, and rear tricep/extensor arm mechanics.</li>
                  <li><strong>Articulated Limbs:</strong> MultiAxisShoulderJoint, RobotArm (Forearm, UpperArm, Elbow, Wrist, 5 articulated fingers).</li>
                  <li><strong>Lower Assembly:</strong> Hip, Thigh, Knee, Shin, Ankle, and Foot with floor contact shadows.</li>
                  <li><strong>Materials:</strong> Liquid ceramic PBR, dark titanium brushed alloy, translucent neon polymer visor.</li>
                  <li><strong>Performance:</strong> Distance-based LOD, Camera-facing occlusion culling, Dynamic Resolution Scaling (DRS).</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xs uppercase font-bold text-white tracking-wider mb-2">
                  Quick Run Commands
                </h3>
                <div className="bg-black/60 p-3 rounded-xl border border-white/[0.06] text-zinc-300 space-y-1">
                  <div><span className="text-violet-400">npm run dev</span> : Launch standalone local interactive server</div>
                  <div><span className="text-violet-400">npm run build</span> : Compile high-speed production distribution bundle</div>
                  <div><span className="text-violet-400">npm run preview</span> : Preview compiled production distribution bundle</div>
                  <div><span className="text-violet-400">npm run generate:robot</span> : Re-generate 3D GLB export model file</div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-500">
                Specification: ROBOT_MASTER_TECHNICAL_SPECIFICATION.md
              </span>
              <button
                onClick={() => setIsSpecModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

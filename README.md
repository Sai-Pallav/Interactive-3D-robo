# 🤖 Interactive 3D Robo — Standalone Procedural Studio

An entirely self-contained, independent WebGL/Three.js interactive 3D humanoid robot application. Built with mathematical procedural geometry, physical PBR materials, dynamic kinematics, and multi-axis joint hierarchies.

---

## ⚡ Quick Start (Running Outside Any Workspace)

This folder can be placed anywhere on your computer or server and run independently.

### 1. Requirements
- [Node.js](https://nodejs.org/) (version 18 or newer)
- Modern web browser with WebGL 2.0 support (Chrome, Edge, Firefox, Safari)

### 2. Launch Local Dev Server
Open a terminal in this folder and run:
```bash
npm install
npm run dev
```
The studio will open at `http://localhost:5180`.

Or on Windows, simply double-click **`run.bat`**!

---

## 🛠️ Available NPM Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts Vite development server at `http://localhost:5180` with hot module replacement (HMR). |
| `npm run build` | Compiles and builds production-optimized bundle into `dist/` with chunk splitting. |
| `npm run preview` | Starts local production preview server at `http://localhost:5180`. |
| `npm run generate:robot` | Generates / updates the standalone binary `public/models/robot.glb` file. |

---

## 🕹️ Interactive Features

1. **Interactive Head & Visor Tracking**:
   - The robot's neck, head, and eyes smoothly track cursor position in real-time.
2. **Exploded Mechanical Inspection**:
   - Press the **Exploded View** button (`Layers` icon) to expand all internal vertebrae, shoulder linkages, arm assemblies, and cowl panels along their mechanical expansion trajectories.
3. **Developer Debug Mode**:
   - Toggle **Wireframe & Joint Axes** (`Activity` icon) to inspect low-poly geometry structures and local coordinate frames.
4. **Camera Controls**:
   - **Rotate / Pan**: Click and drag across the canvas.
   - **Zoom**: Use mouse scroll wheel directly over the robot (zoom range: 0.8x to 2.5x).
   - **Reset**: Double-click anywhere on the canvas or press the **Reset View** button.
5. **Kinematic Hand Poses**:
   - Override hand states on demand (Point, Grip, Open, Relaxed).
6. **Auto-Rotate**:
   - Enable continuous 360° showcase turntable rotation.
7. **GLB Model Export**:
   - Download the static binary GLB 3D model asset directly with the **GLB** button.

---

## 📁 Project Architecture & File Inventory

This project is completely isolated with **zero network dependencies** for 3D model loading. All geometry is procedurally synthesized using Three.js mathematical primitives.

```
interactive 3D robo/
├── public/
│   ├── favicon.svg                           # Robot favicon icon
│   └── models/
│       └── robot.glb                         # Exported 3D binary model (885 KB)
├── scripts/
│   ├── generate-robot-glb.mjs                # Three.js GLTFExporter generator script
│   └── *.json                                # Complete kinematic and mesh audit registries
├── src/
│   ├── components/
│   │   └── robot/
│   │       └── RobotCanvas.tsx               # Three.js canvas mount & lifecycle bridge
│   ├── robot/
│   │   ├── animation/                        # Kinematic controllers, input & look tracking
│   │   ├── arm/                              # Arm, elbow, forearm, wrist, and 5-finger assemblies
│   │   ├── head/                             # Head shell, visor, jaw, neck, side modules
│   │   ├── leg/                              # Hip, thigh, knee, shin, ankle, foot assemblies
│   │   ├── materials/                        # PBR Liquid Ceramic, brushed alloy & visor shaders
│   │   ├── robot/                            # Procedural factory, controller, lifecycle manager
│   │   ├── scene/                            # Scene, camera, studio lighting, DRS, LOD, Occlusion
│   │   ├── shoulder/                         # Multi-axis ball-and-socket shoulder extensions
│   │   ├── torso/                            # Pectoral chest, articulated spine, abdomen, waist
│   │   ├── utils/                            # Startup profiler, geometry cache, merger, benchmark
│   │   └── config.ts                         # Master robot geometric parameters
│   ├── App.tsx                               # Standalone Interactive 3D Studio interface
│   ├── index.css                             # Glassmorphism utilities & theme tokens
│   └── main.tsx                              # React DOM root entrypoint
├── index.html                                # HTML5 root document
├── package.json                              # Standalone project dependencies & scripts
├── postcss.config.js                         # PostCSS configuration
├── tailwind.config.js                        # Tailwind design tokens
├── tsconfig.json                             # TypeScript compiler configuration
├── tsconfig.node.json                        # Node TypeScript configuration
├── vite.config.ts                            # Vite build & bundle configuration
├── run.bat                                   # One-click Windows launch script
└── ROBOT_MASTER_TECHNICAL_SPECIFICATION.md   # Authoritative 118 KB master technical specification
```

---

## 🔬 Performance & Engine Highlights

- **Dynamic Resolution Scaling (DRS)**: Dynamically scales canvas pixel ratio between `1.0x` and `optimal DPR` based on real-time GPU frame times to maintain smooth 60 FPS.
- **Level of Detail (LOD)**: Automatically culls microscopic sub-assemblies (e.g. cervical neck rings, internal finger hinges) at distance.
- **Occlusion Culling**: Camera-facing normal checks cull internal components obscured by armor plates.
- **Geometry Caching & Batching**: Reusable geometries and materials are shared across left/right symmetric limbs.
- **Pre-warmed Shaders**: WebGL pipelines and PMREM environment reflections are pre-compiled for instant first render.

---

## 📜 Technical Specification

For an exhaustive, deep-dive forensic breakdown of every component, dimension, material property, and matrix calculation, refer to:
[ROBOT_MASTER_TECHNICAL_SPECIFICATION.md](./ROBOT_MASTER_TECHNICAL_SPECIFICATION.md)

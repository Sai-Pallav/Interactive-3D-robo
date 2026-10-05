import fs from 'fs';
import path from 'path';

const innovexRoot = 'c:/Users/kotas/Innovex-Arena';
if (!fs.existsSync(innovexRoot)) {
  process.exit(0);
}

// 1. Sync camera.ts
const cameraSrc = fs.readFileSync('src/robot/scene/camera.ts', 'utf-8');
fs.writeFileSync(path.join(innovexRoot, 'src/robot/scene/camera.ts'), cameraSrc);

// 2. Fix RobotScene.ts in Innovex-Arena
const innovexScenePath = path.join(innovexRoot, 'src/robot/scene/RobotScene.ts');
let sceneCode = fs.readFileSync(innovexScenePath, 'utf-8');

// Replace loop update
sceneCode = sceneCode.replace(
  `// Update camera zoom interpolation
    if (this.cameraManager.update(dt)) {
      this.updateFaceProjection();
    }`,
  `// Update camera zoom interpolation
    this.cameraManager.update(dt);`
);

// Ensure constructor initializes boundWheel
if (!sceneCode.includes("this.boundWheel = this.onWheel.bind(this);")) {
  const targetInit = `    // 7. Page Visibility Listener
    this.boundVisibilityChange = this.onVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this.boundVisibilityChange);`;

  const newInit = `    // 7. Page Visibility Listener
    this.boundVisibilityChange = this.onVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this.boundVisibilityChange);

    // Mouse wheel camera zoom and double-click reset
    this.boundWheel = this.onWheel.bind(this);
    this.boundDblClick = this.onDblClick.bind(this);
    this.renderer.domElement.addEventListener('wheel', this.boundWheel, { passive: false });
    this.renderer.domElement.addEventListener('dblclick', this.boundDblClick);
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
    window.addEventListener('keydown', this.boundKeyDown);`;

  sceneCode = sceneCode.replace(targetInit, newInit);
}

fs.writeFileSync(innovexScenePath, sceneCode);
console.log('Fixed and synced Innovex-Arena RobotScene.ts');

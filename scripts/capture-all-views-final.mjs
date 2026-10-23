import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9280;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_final_' + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tmpDir}`,
    '--window-size=1280,800',
    '--no-sandbox',
    '--disable-gpu-watchdog',
    '--enable-webgl',
    '--use-gl=angle',
    'http://localhost:5180/?collapsed=1'
  ]);

  let pageTarget = null;
  for (let i = 0; i < 30; i++) {
    await sleep(300);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = await res.json();
      pageTarget = targets?.find(t => t.type === 'page' && t.url.includes('5180')) || targets?.find(t => t.type === 'page');
      if (pageTarget?.webSocketDebuggerUrl) break;
    } catch (e) {}
  }

  if (!pageTarget?.webSocketDebuggerUrl) {
    chromeProc.kill();
    throw new Error('Chrome target not found');
  }

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let msgId = 1;
  const pending = new Map();
  ws.onmessage = (e) => {
    const d = JSON.parse(e.data);
    if (d.id && pending.has(d.id)) {
      const { resolve, reject } = pending.get(d.id);
      pending.delete(d.id);
      if (d.error) reject(d.error);
      else resolve(d.result);
    }
  };

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = msgId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');

  for (let i = 0; i < 40; i++) {
    await sleep(250);
    const evalRes = await send('Runtime.evaluate', {
      expression: 'Boolean(window.__robotScene && window.__robotScene.isReady)',
      returnByValue: true
    });
    if (evalRes?.result?.value) break;
  }
  await sleep(600);

  // Freeze camera auto-updates and mouse tracking for stable screenshots
  await send('Runtime.evaluate', {
    expression: `
      window.__robotScene.cameraManager.update = () => false;
      if (window.__robotScene.setMouseTrackingEnabled) window.__robotScene.setMouseTrackingEnabled(false);
      true;
    `,
    returnByValue: true
  });

  const outDir = path.resolve('capture_final_validation');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const shots = [
    {
      name: 'final_left_rear_45_low',
      setup: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        cam.position.set(-0.36, 0.08, -0.28);
        cam.lookAt(-0.21, 0.06, -0.008);
      `
    },
    {
      name: 'final_left_front_45',
      setup: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        cam.position.set(-0.38, 0.12, 0.38);
        cam.lookAt(-0.23, 0.05, -0.008);
      `
    },
    {
      name: 'final_left_lateral',
      setup: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        cam.position.set(-0.52, 0.06, -0.008);
        cam.lookAt(-0.23, 0.05, -0.008);
      `
    },
    {
      name: 'final_right_rear_45_low',
      setup: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        cam.position.set(0.36, 0.08, -0.28);
        cam.lookAt(0.21, 0.06, -0.008);
      `
    },
    {
      name: 'final_fullbody_front',
      setup: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        cam.position.set(0, 0.05, 1.45);
        cam.lookAt(0, 0.05, 0);
      `
    },
    {
      name: 'final_fullbody_side',
      setup: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        cam.position.set(-1.45, 0.05, 0);
        cam.lookAt(0, 0.05, 0);
      `
    },
    {
      name: 'final_fullbody_rear',
      setup: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        cam.position.set(0, 0.05, -1.45);
        cam.lookAt(0, 0.05, 0);
      `
    }
  ];

  for (const s of shots) {
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const scene = window.__robotScene;
          ${s.setup};
          cam.updateMatrixWorld(true);
          cam.updateProjectionMatrix();
          scene.renderer.render(scene.scene, cam);
          return true;
        })()
      `,
      returnByValue: true
    });
    await sleep(200);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, `${s.name}.png`), Buffer.from(shot.data, 'base64'));
    console.log(`Saved: ${s.name}.png`);
  }

  // Also test articulated posture (animation active)
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const scene = window.__robotScene;
        // Turn robot slightly and update animation to test moving shoulder
        if (scene.controller) {
          scene.controller.setLookTarget(100, 50, 1.0);
        }
        return true;
      })()
    `,
    returnByValue: true
  });
  await sleep(400);

  const articulatedShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, `final_articulated_movement.png`), Buffer.from(articulatedShot.data, 'base64'));
  console.log(`Saved: final_articulated_movement.png`);

  ws.close();
  chromeProc.kill();
}

main().catch(console.error);

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9260;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_test_cam_' + Date.now());
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

  // Disable camera manager auto-update
  await send('Runtime.evaluate', {
    expression: `
      window.__robotScene.cameraManager.update = () => false;
      if (window.__robotScene.setMouseTrackingEnabled) window.__robotScene.setMouseTrackingEnabled(false);
      true;
    `,
    returnByValue: true
  });

  const outDir = path.resolve('capture_camera_match');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // Let's test angles around the left shoulder (-0.234, 0.052, 0.015) in world space
  // World coordinates of left shoulder when yaw is set
  const shots = [
    {
      name: 'view1_front_34',
      code: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        // Looking at left shoulder from front-lateral
        cam.position.set(-0.38, 0.12, 0.38);
        cam.lookAt(-0.23, 0.05, 0.01);
        cam.updateMatrixWorld(true);
        cam.updateProjectionMatrix();
        scene.renderer.render(scene.scene, cam);
      `
    },
    {
      name: 'view2_rear_34',
      code: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        // Looking at left shoulder from rear-lateral
        cam.position.set(-0.40, 0.12, -0.28);
        cam.lookAt(-0.23, 0.05, 0.01);
        cam.updateMatrixWorld(true);
        cam.updateProjectionMatrix();
        scene.renderer.render(scene.scene, cam);
      `
    }
  ];

  for (const s of shots) {
    await send('Runtime.evaluate', {
      expression: `(() => { const scene = window.__robotScene; ${s.code}; return true; })()`,
      returnByValue: true
    });
    await sleep(300);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(shot.data, 'base64');
    fs.writeFileSync(path.join(outDir, `${s.name}.png`), buf);
    console.log(`Saved: ${s.name}.png`);
  }

  ws.close();
  chromeProc.kill();
}

main().catch(console.error);

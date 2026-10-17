import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9255;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_audit_' + Date.now());
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

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
    await sleep(400);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = await res.json();
      pageTarget = targets?.find(t => t.type === 'page' && t.url.includes('5180')) || targets?.find(t => t.type === 'page');
      if (pageTarget?.webSocketDebuggerUrl) break;
    } catch (e) {}
  }

  if (!pageTarget?.webSocketDebuggerUrl) {
    chromeProc.kill();
    throw new Error('Failed to connect to Chrome debugging target');
  }

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let msgId = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

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

  await sleep(800);

  // Disable camera manager auto-update & mouse tracking for precise, stable camera control
  await send('Runtime.evaluate', {
    expression: `
      if (window.__robotScene) {
        window.__robotScene.cameraManager.update = () => false;
        if (window.__robotScene.setMouseTrackingEnabled) {
          window.__robotScene.setMouseTrackingEnabled(false);
        }
      }
      true;
    `,
    returnByValue: true
  });

  const outDir = path.resolve('capture_audit');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const views = [
    {
      name: '1_fullbody_front',
      setup: `
        scene.setRobotYaw(0, false);
        scene.cameraManager.camera.position.set(0, -0.125, 4.2);
        scene.cameraManager.camera.lookAt(0, -0.125, 0);
      `
    },
    {
      name: '2_fullbody_side',
      setup: `
        scene.setRobotYaw(Math.PI / 2, false);
        scene.cameraManager.camera.position.set(0, -0.125, 4.2);
        scene.cameraManager.camera.lookAt(0, -0.125, 0);
      `
    },
    {
      name: '3_fullbody_rear',
      setup: `
        scene.setRobotYaw(Math.PI, false);
        scene.cameraManager.camera.position.set(0, -0.125, 4.2);
        scene.cameraManager.camera.lookAt(0, -0.125, 0);
      `
    },
    {
      name: '4_shoulder_chest_front',
      setup: `
        scene.setRobotYaw(0, false);
        scene.cameraManager.camera.position.set(0, 0.26, 1.35);
        scene.cameraManager.camera.lookAt(0, 0.26, 0);
      `
    },
    {
      name: '5_shoulder_lateral',
      setup: `
        scene.setRobotYaw(Math.PI * 0.35, false);
        scene.cameraManager.camera.position.set(0.28, 0.26, 1.20);
        scene.cameraManager.camera.lookAt(0.28, 0.26, 0);
      `
    },
    {
      name: '6_elbow_wrist_arm',
      setup: `
        scene.setRobotYaw(0, false);
        scene.cameraManager.camera.position.set(-0.35, 0.0, 1.05);
        scene.cameraManager.camera.lookAt(-0.35, 0.0, 0);
      `
    },
    {
      name: '7_pelvis_hips_waist',
      setup: `
        scene.setRobotYaw(0, false);
        scene.cameraManager.camera.position.set(0, -0.16, 1.15);
        scene.cameraManager.camera.lookAt(0, -0.16, 0);
      `
    },
    {
      name: '8_thigh_trochanter',
      setup: `
        scene.setRobotYaw(0, false);
        scene.cameraManager.camera.position.set(-0.18, -0.32, 1.05);
        scene.cameraManager.camera.lookAt(-0.18, -0.32, 0);
      `
    },
    {
      name: '9_knees_patella',
      setup: `
        scene.setRobotYaw(0, false);
        scene.cameraManager.camera.position.set(-0.18, -0.55, 1.05);
        scene.cameraManager.camera.lookAt(-0.18, -0.55, 0);
      `
    },
    {
      name: '10_ankles_damper_side',
      setup: `
        scene.setRobotYaw(Math.PI * 0.45, false);
        scene.cameraManager.camera.position.set(-0.18, -0.92, 0.95);
        scene.cameraManager.camera.lookAt(-0.18, -0.92, 0);
      `
    }
  ];

  for (const v of views) {
    console.log(`Setting up ${v.name}...`);
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const scene = window.__robotScene;
          ${v.setup}
          return true;
        })()
      `,
      returnByValue: true
    });

    await sleep(500);

    const shotRes = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(shotRes.data, 'base64');
    const filePath = path.join(outDir, `${v.name}.png`);
    fs.writeFileSync(filePath, buffer);
    console.log(`Saved screenshot: ${filePath} (${buffer.length} bytes)`);
  }

  ws.close();
  chromeProc.kill();
  console.log('Capture complete!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

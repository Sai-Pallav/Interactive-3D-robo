import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9275;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_val_' + Date.now());
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tmpDir}`,
    '--window-size=1280,1024',
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
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let msgId = 1;
  const pending = new Map();
  ws.onmessage = (e) => {
    const d = JSON.parse(e.data);
    if (d.id && pending.has(d.id)) {
      const p = pending.get(d.id);
      pending.delete(d.id);
      if (d.error) p.reject(d.error); else p.resolve(d.result);
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

  // Freeze camera auto-updates & gaze tracking
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

  const outDir = 'capture_validation_arm';
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const shots = [
    {
      name: '01_right_upper_arm_rear_close_matching_img2',
      setup: `
        scene.setRobotYaw(Math.PI, false);
        scene.cameraManager.camera.position.set(-0.35, -0.14, 0.40);
        scene.cameraManager.camera.lookAt(-0.35, -0.14, 0);
      `
    },
    {
      name: '02_left_upper_arm_rear_close_matching_img1',
      setup: `
        scene.setRobotYaw(Math.PI, false);
        scene.cameraManager.camera.position.set(0.35, -0.14, 0.40);
        scene.cameraManager.camera.lookAt(0.35, -0.14, 0);
      `
    },
    {
      name: '03_rear_full_upper_body',
      setup: `
        scene.setRobotYaw(Math.PI, false);
        scene.cameraManager.camera.position.set(0, -0.12, 0.95);
        scene.cameraManager.camera.lookAt(0, -0.12, 0);
      `
    },
    {
      name: '04_rear_34_right_arm',
      setup: `
        scene.setRobotYaw(Math.PI * 0.85, false);
        scene.cameraManager.camera.position.set(-0.35, -0.14, 0.45);
        scene.cameraManager.camera.lookAt(-0.35, -0.14, 0);
      `
    },
    {
      name: '05_rear_34_left_arm',
      setup: `
        scene.setRobotYaw(-Math.PI * 0.85, false);
        scene.cameraManager.camera.position.set(0.35, -0.14, 0.45);
        scene.cameraManager.camera.lookAt(0.35, -0.14, 0);
      `
    },
    {
      name: '06_lateral_right_arm',
      setup: `
        scene.setRobotYaw(Math.PI * 0.50, false);
        scene.cameraManager.camera.position.set(0, -0.14, 0.70);
        scene.cameraManager.camera.lookAt(0, -0.14, 0);
      `
    },
    {
      name: '07_lateral_left_arm',
      setup: `
        scene.setRobotYaw(-Math.PI * 0.50, false);
        scene.cameraManager.camera.position.set(0, -0.14, 0.70);
        scene.cameraManager.camera.lookAt(0, -0.14, 0);
      `
    },
    {
      name: '08_front_default_view',
      setup: `
        scene.setRobotYaw(0, false);
        scene.cameraManager.camera.position.set(0, -0.12, 0.95);
        scene.cameraManager.camera.lookAt(0, -0.12, 0);
      `
    }
  ];

  for (const s of shots) {
    await send('Runtime.evaluate', {
      expression: `(() => {
        const scene = window.__robotScene;
        ${s.setup}
        return true;
      })()`,
      returnByValue: true
    });
    await sleep(400);

    const snap = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, `${s.name}.png`), Buffer.from(snap.data, 'base64'));
    console.log(`Saved ${outDir}/${s.name}.png`);
  }

  chromeProc.kill();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9272;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_arm_' + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tmpDir}`,
    '--window-size=1280,1000',
    '--no-sandbox',
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
      pageTarget = targets?.find(t => t.type === 'page');
      if (pageTarget?.webSocketDebuggerUrl) break;
    } catch (e) {}
  }

  if (!pageTarget?.webSocketDebuggerUrl) {
    chromeProc.kill();
    throw new Error('Failed to connect');
  }

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(r => { ws.onopen = r; });

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

  await sleep(600);

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

  const shots = [
    {
      name: 'arm_left_full',
      setup: `
        scene.setRobotYaw(0, false);
        scene.cameraManager.camera.position.set(-0.38, -0.25, 1.15);
        scene.cameraManager.camera.lookAt(-0.38, -0.25, 0);
      `
    },
    {
      name: 'arm_right_full',
      setup: `
        scene.setRobotYaw(0, false);
        scene.cameraManager.camera.position.set(0.38, -0.25, 1.15);
        scene.cameraManager.camera.lookAt(0.38, -0.25, 0);
      `
    }
  ];

  for (const s of shots) {
    await send('Runtime.evaluate', {
      expression: `(() => { const scene = window.__robotScene; ${s.setup}; return true; })()`,
      returnByValue: true
    });
    await sleep(400);
    const snap = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.resolve(`capture_output/${s.name}.png`), Buffer.from(snap.data, 'base64'));
    console.log(`Saved capture_output/${s.name}.png`);
  }

  chromeProc.kill();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

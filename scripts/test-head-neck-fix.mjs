import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9245;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const outDir = path.resolve('capture_fix_tests');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_fix_' + Date.now());
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tmpDir}`,
    '--window-size=1280,960',
    '--no-sandbox',
    '--disable-gpu-watchdog',
    '--enable-webgl',
    '--use-gl=angle',
    'http://localhost:5180/'
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
  await sleep(1000);

  // Hide UI overlays
  await send('Runtime.evaluate', {
    expression: `
      document.querySelectorAll('.fixed, .absolute').forEach(el => {
        if (!el.querySelector('canvas') && !el.tagName.toLowerCase().includes('canvas')) {
          el.style.display = 'none';
        }
      });
      true;
    `,
    returnByValue: true
  });

  // Let's test combinations of headY and headZ
  const configs = [
    { name: 'y170_z_minus14', headY: 0.170, headZ: -0.014 },
    { name: 'y172_z_minus14', headY: 0.172, headZ: -0.014 },
    { name: 'y174_z_minus14', headY: 0.174, headZ: -0.014 },
    { name: 'y170_z_minus12', headY: 0.170, headZ: -0.012 },
    { name: 'y172_z_minus12', headY: 0.172, headZ: -0.012 },
  ];

  for (const cfg of configs) {
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const scene = window.__robotScene;
          if (!scene) return;
          scene.robotNodes.head.position.y = ${cfg.headY};
          scene.robotNodes.head.position.z = ${cfg.headZ};
          if (scene.controller) {
            scene.controller.baseHeadY = ${cfg.headY};
          }
          scene.robotNodes.root.updateMatrixWorld(true);
        })()
      `,
      returnByValue: true
    });

    // Capture Side view
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const scene = window.__robotScene;
          scene.setRobotYaw(Math.PI / 2, false);
          scene.cameraManager.baseTargetY = 0.34;
          scene.cameraManager.setZoom(0.38);
          scene.cameraManager.update(10.0);
        })()
      `,
      returnByValue: true
    });
    await sleep(400);
    let shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, `${cfg.name}_side.png`), Buffer.from(shot.data, 'base64'));

    // Capture Rear view
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const scene = window.__robotScene;
          scene.setRobotYaw(Math.PI, false);
          scene.cameraManager.baseTargetY = 0.34;
          scene.cameraManager.setZoom(0.38);
          scene.cameraManager.update(10.0);
        })()
      `,
      returnByValue: true
    });
    await sleep(400);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, `${cfg.name}_rear.png`), Buffer.from(shot.data, 'base64'));

    // Capture 3/4 view
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const scene = window.__robotScene;
          scene.setRobotYaw(-0.45, false);
          scene.cameraManager.baseTargetY = 0.34;
          scene.cameraManager.setZoom(0.38);
          scene.cameraManager.update(10.0);
        })()
      `,
      returnByValue: true
    });
    await sleep(400);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, `${cfg.name}_34.png`), Buffer.from(shot.data, 'base64'));

    // Capture Full Front
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const scene = window.__robotScene;
          scene.setRobotYaw(0, false);
          scene.cameraManager.baseTargetY = 0.05;
          scene.cameraManager.setZoom(1.0);
          scene.cameraManager.update(10.0);
        })()
      `,
      returnByValue: true
    });
    await sleep(400);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, `${cfg.name}_full_front.png`), Buffer.from(shot.data, 'base64'));

    console.log(`Captured ${cfg.name}`);
  }

  ws.close();
  chromeProc.kill();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

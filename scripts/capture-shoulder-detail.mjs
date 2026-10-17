import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9265;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_sh_detail_' + Date.now());
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
    'http://localhost:5180/?zoom=48&collapsed=1'
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

  await sleep(600);

  // Disable camera manager auto-update & hide UI overlays
  await send('Runtime.evaluate', {
    expression: `
      window.__robotScene.cameraManager.update = () => false;
      document.querySelectorAll('body *').forEach(el => {
        if (!el.contains(document.querySelector('canvas')) && el !== document.querySelector('canvas') && el !== document.body) {
          const pos = window.getComputedStyle(el).position;
          if (pos === 'fixed' || pos === 'absolute') {
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
          }
        }
      });
      true;
    `,
    returnByValue: true
  });

  const outDir = path.resolve('capture_shoulder_detail');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const shots = [
    { name: 'right_shoulder_front', side: 1, angle: 'front', dX: 0.02, dY: 0.0, dZ: 0.28 },
    { name: 'right_shoulder_lateral', side: 1, angle: 'lateral', dX: 0.36, dY: 0.0, dZ: 0.0 },
    { name: 'right_shoulder_front_34', side: 1, angle: 'front_34', dX: 0.18, dY: 0.02, dZ: 0.20 },
    { name: 'right_shoulder_rear_34', side: 1, angle: 'rear_34', dX: 0.18, dY: 0.02, dZ: -0.20 },
    { name: 'right_shoulder_top', side: 1, angle: 'top', dX: 0.04, dY: 0.26, dZ: 0.02 },
    { name: 'left_shoulder_lateral', side: -1, angle: 'lateral', dX: -0.36, dY: 0.0, dZ: 0.0 },
    { name: 'left_shoulder_front_34', side: -1, angle: 'front_34', dX: -0.18, dY: 0.02, dZ: 0.20 }
  ];

  for (const shot of shots) {
    console.log(`Setting up shot: ${shot.name}...`);
    const evalRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const scene = window.__robotScene;
          scene.setRobotYaw(0.0, false);
          const cam = scene.cameraManager.camera;

          // Target shoulder joint center in world coordinates
          const tx = ${shot.side * 0.230};
          const ty = 0.172;
          const tz = 0.052;
          cam.position.set(tx + ${shot.dX}, ty + ${shot.dY}, tz + ${shot.dZ});
          cam.lookAt(tx, ty, tz);
          cam.updateMatrixWorld(true);
          cam.updateProjectionMatrix();
          scene.renderer.render(scene.scene, cam);
          return { camPos: cam.position.toArray(), target: [tx, ty, tz] };
        })()
      `,
      returnByValue: true
    });
    console.log('Evaluated result:', evalRes?.result?.value);
    await sleep(350);

    const shotRes = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(shotRes.data, 'base64');
    const filePath = path.join(outDir, `${shot.name}.png`);
    fs.writeFileSync(filePath, buffer);
    console.log(`Saved: ${filePath}`);
  }

  ws.close();
  chromeProc.kill();
  console.log('Shoulder detail capture complete!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

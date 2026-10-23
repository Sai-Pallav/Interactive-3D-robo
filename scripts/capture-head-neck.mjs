import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9245;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const prefix = process.argv[2] || 'before';
  const outDir = path.resolve('capture_neck_head');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_neck_' + Date.now());
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  console.log(`Spawning Chrome on port ${PORT}...`);
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

  // Hide UI overlays for clean capture
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

  const views = [
    { name: 'front_closeup', yaw: 0, zoom: 0.38, targetY: 0.34 },
    { name: 'side_left_closeup', yaw: Math.PI / 2, zoom: 0.38, targetY: 0.34 },
    { name: 'side_right_closeup', yaw: -Math.PI / 2, zoom: 0.38, targetY: 0.34 },
    { name: 'three_quarter_closeup', yaw: -0.45, zoom: 0.38, targetY: 0.34 },
    { name: 'rear_closeup', yaw: Math.PI, zoom: 0.38, targetY: 0.34 },
    { name: 'full_front_neutral', yaw: 0, zoom: 1.0, targetY: 0.05 },
  ];

  for (const v of views) {
    const res = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const scene = window.__robotScene;
          if (!scene) return false;
          scene.setRobotYaw(${v.yaw}, false);
          scene.cameraManager.baseTargetY = ${v.targetY};
          scene.cameraManager.setZoom(${v.zoom});
          scene.cameraManager.update(10.0);
          return true;
        })()
      `,
      returnByValue: true
    });
    console.log(`View ${v.name} eval result:`, res);
    await sleep(600);

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const filename = `${prefix}_${v.name}.png`;
    fs.writeFileSync(path.join(outDir, filename), Buffer.from(shot.data, 'base64'));
    console.log(`Saved ${filename}`);
  }

  ws.close();
  chromeProc.kill();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9239;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_robo_final_' + Date.now());
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  console.log(`Spawning Chrome on port ${PORT}...`);
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tmpDir}`,
    '--window-size=1280,720',
    '--no-sandbox',
    '--disable-gpu-watchdog',
    '--enable-webgl',
    '--use-gl=angle',
    process.env.APP_URL || 'http://localhost:5180/'
  ]);

  chromeProc.stderr.on('data', () => {});
  chromeProc.stdout.on('data', () => {});

  let targets = null;
  let pageTarget = null;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      targets = await res.json();
      pageTarget = targets?.find(t => t.type === 'page' && t.url.includes('5180')) || targets?.find(t => t.type === 'page');
      if (pageTarget && pageTarget.webSocketDebuggerUrl) {
        break;
      }
    } catch (e) {
      // retry
    }
  }

  if (!pageTarget?.webSocketDebuggerUrl) {
    chromeProc.kill();
    throw new Error('Failed to connect to Chrome debugging target');
  }

  const wsUrl = pageTarget.webSocketDebuggerUrl;
  console.log('Connecting to WebSocket:', wsUrl);

  const ws = new WebSocket(wsUrl);
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
    if (evalRes?.result?.value) {
      console.log('__robotScene is ready!');
      break;
    }
  }

  await sleep(600);

  // Collapse the bottom dock
  await send('Runtime.evaluate', {
    expression: `
      const btn = document.querySelector('button[title*="Collapse Dock"]');
      if (btn) btn.click();
      true;
    `,
    returnByValue: true
  });
  await sleep(500);

  const outDir = path.resolve('capture_output');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const views = [
    { name: '1_straight_rear', yaw: Math.PI, zoom: 1.0, targetY: 0.04 },
    { name: '1b_rear_macro', yaw: Math.PI, zoom: 0.45, targetY: 0.04 },
    { name: '1c_lower_back_macro', yaw: Math.PI, zoom: 0.40, targetY: -0.26 },
    { name: '1d_lower_back_waist_closeup', yaw: Math.PI, zoom: 0.35, targetY: -0.32 },
    { name: '2_rear_left_three_quarter', yaw: Math.PI * 0.75, zoom: 1.0, targetY: 0.04 },
    { name: '2b_lower_back_34_left', yaw: Math.PI * 0.75, zoom: 0.45, targetY: -0.25 },
    { name: '3_rear_right_three_quarter', yaw: -Math.PI * 0.75, zoom: 1.0, targetY: 0.04 },
    { name: '3b_lower_back_34_right', yaw: -Math.PI * 0.75, zoom: 0.45, targetY: -0.25 },
    { name: '4_left_side', yaw: Math.PI * 0.5, zoom: 1.0, targetY: 0.04 },
    { name: '5_right_side', yaw: -Math.PI * 0.5, zoom: 1.0, targetY: 0.04 },
    { name: '6_default_front', yaw: -10 * (Math.PI / 180), zoom: 1.0, targetY: 0.04 }
  ];

  for (const v of views) {
    console.log(`Setting view: ${v.name} (yaw: ${v.yaw.toFixed(2)} rad, zoom: ${v.zoom}, targetY: ${v.targetY})...`);
    await send('Runtime.evaluate', {
      expression: `
        const scene = window.__robotScene;
        scene.setRobotYaw(${v.yaw}, false);
        scene.cameraManager.baseTargetY = ${v.targetY};
        if (typeof scene.setZoom === 'function') {
          scene.setZoom(${v.zoom});
        }
        scene.cameraManager.currentZoom = ${v.zoom};
        scene.cameraManager.update(0.016);
        true;
      `,
      returnByValue: true
    });
    // Wait for frame render
    await sleep(700);

    const shotRes = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(shotRes.data, 'base64');
    const filePath = path.join(outDir, `${v.name}.png`);
    fs.writeFileSync(filePath, buffer);
    console.log(`Saved screenshot: ${filePath} (${buffer.length} bytes)`);
  }

  // Restore camera defaults
  await send('Runtime.evaluate', {
    expression: `
      window.__robotScene.cameraManager.baseTargetY = 0.04;
      window.__robotScene.setZoom(1.0);
      window.__robotScene.setRobotYaw(-10 * (Math.PI / 180), false);
      true;
    `,
    returnByValue: true
  });

  ws.close();
  chromeProc.kill();
  console.log('Done capturing views!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

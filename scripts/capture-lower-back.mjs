import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9238;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_lb2_' + Date.now());
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

  await sleep(500);

  // Hide UI overlays
  await send('Runtime.evaluate', {
    expression: `
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
  await sleep(200);

  const outDir = path.resolve('capture_output');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const shots = [
    {
      name: 'lb_view_rear_macro',
      yaw: Math.PI,
      targetY: -0.08,
      zoom: 0.40
    },
    {
      name: 'lb_view_rear_medium',
      yaw: Math.PI,
      targetY: -0.06,
      zoom: 0.75
    },
    {
      name: 'lb_view_rear_waist_closeup',
      yaw: Math.PI,
      targetY: -0.14,
      zoom: 0.35
    },
    {
      name: 'lb_view_34_left',
      yaw: Math.PI * 0.78,
      targetY: -0.08,
      zoom: 0.48
    },
    {
      name: 'lb_view_34_right',
      yaw: -Math.PI * 0.78,
      targetY: -0.08,
      zoom: 0.48
    },
    {
      name: 'lb_view_full_rear',
      yaw: Math.PI,
      targetY: 0.02,
      zoom: 1.05
    }
  ];

  for (const s of shots) {
    console.log(`Setting up shot: ${s.name}...`);
    await send('Runtime.evaluate', {
      expression: `
        const scene = window.__robotScene;
        scene.setRobotYaw(${s.yaw}, false);
        const cm = scene.cameraManager;
        cm.baseTargetY = ${s.targetY};
        cm.setZoom(${s.zoom});
        // Force immediate camera transform
        cm.currentZoom = ${s.zoom};
        cm.updateCameraTransform();
        true;
      `,
      returnByValue: true
    });
    // Let RAF render 3 frames smoothly
    await sleep(600);

    const shotRes = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(shotRes.data, 'base64');
    const filePath = path.join(outDir, `${s.name}.png`);
    fs.writeFileSync(filePath, buffer);
    console.log(`Saved screenshot: ${filePath} (${buffer.length} bytes)`);
  }

  // Restore camera baseTargetY to default
  await send('Runtime.evaluate', {
    expression: `
      window.__robotScene.cameraManager.baseTargetY = 0.04;
      window.__robotScene.cameraManager.setZoom(1.0);
      true;
    `,
    returnByValue: true
  });

  ws.close();
  chromeProc.kill();
  console.log('Done capturing targeted lower back shots!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

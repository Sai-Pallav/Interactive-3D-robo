import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9245;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const prefix = process.argv[2] || 'before';
  const outDir = path.resolve('capture_user_match');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_ptr_' + Date.now());
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
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const pending = new Map();
  ws.onmessage = (e) => {
    const d = JSON.parse(e.data);
    if (d.id && pending.has(d.id)) {
      pending.get(d.id)(d.result || d.error);
    }
  };
  function send(method, params = {}) {
    return new Promise(r => {
      const cur = id++;
      pending.set(cur, r);
      ws.send(JSON.stringify({ id: cur, method, params }));
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

  const testCases = [
    { name: 'neutral_center', clientX: 640, clientY: 280, robotYaw: 0 },
    { name: 'ref1_tilt_up', clientX: 640, clientY: 40, robotYaw: 0 },
    { name: 'ref2_tilt_up_right', clientX: 1200, clientY: 40, robotYaw: 0 },
    { name: 'ref3_tilt_up_left', clientX: 80, clientY: 40, robotYaw: 0 },
    { name: 'ref4_rear_tilt_down', clientX: 1000, clientY: 850, robotYaw: Math.PI },
    { name: 'yaw_right', clientX: 1260, clientY: 280, robotYaw: 0 },
    { name: 'yaw_left', clientX: 20, clientY: 280, robotYaw: 0 },
    { name: 'tilt_down_center', clientX: 640, clientY: 900, robotYaw: 0 },
  ];

  for (const tc of testCases) {
    // Set robot yaw, camera zoom
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const scene = window.__robotScene;
          scene.setRobotYaw(${tc.robotYaw}, false);
          scene.cameraManager.baseTargetY = 0.33;
          scene.cameraManager.setZoom(0.36);
          scene.cameraManager.update(10.0);
        })()
      `,
      returnByValue: true
    });

    // Dispatch pointer events directly on window
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const scene = window.__robotScene;
          const ev = new PointerEvent('pointermove', {
            clientX: ${tc.clientX},
            clientY: ${tc.clientY},
            bubbles: true,
            cancelable: true,
            pointerType: 'mouse'
          });
          window.dispatchEvent(ev);
        })()
      `,
      returnByValue: true
    });

    // Wait for damping spring to settle (1.2s)
    await sleep(1200);

    const telemetry = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const scene = window.__robotScene;
          const nodes = scene.robotNodes;
          return {
            headRot: {
              pitch: (nodes.head.rotation.x * 180 / Math.PI).toFixed(1) + '°',
              yaw: (nodes.head.rotation.y * 180 / Math.PI).toFixed(1) + '°',
              roll: (nodes.head.rotation.z * 180 / Math.PI).toFixed(1) + '°',
            },
            neckRot: {
              pitch: (nodes.neck.rotation.x * 180 / Math.PI).toFixed(1) + '°',
              yaw: (nodes.neck.rotation.y * 180 / Math.PI).toFixed(1) + '°',
            }
          };
        })()
      `,
      returnByValue: true
    });

    console.log(`Pose ${tc.name}:`, JSON.stringify(telemetry?.result?.value));

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const filename = `${prefix}_${tc.name}.png`;
    fs.writeFileSync(path.join(outDir, filename), Buffer.from(shot.data, 'base64'));
    console.log(`Saved ${filename}`);
  }

  ws.close();
  chromeProc.kill();
}

main().catch(console.error);

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

  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_user_' + Date.now());
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

  // Define the 4 user reference cases
  // Ref 1: media_1792765770569_59ec470d.png -> front view, pitch up slightly (~ -10° total gaze)
  // Ref 2: media_1792765775740_5352294e.png -> front view, look up-left (~ pitch -15°, yaw -20°)
  // Ref 3: media_1792765788937_7422790c.png -> front view, look up-right (~ pitch -15°, yaw +25°)
  // Ref 4: media_1792765798303_3146f724.png -> rear view (robotYaw = 180°), head tilted down/turned (~ pitch +15°, yaw -15°)
  const testCases = [
    {
      name: 'ref1_front_tilt_up',
      robotYaw: 0,
      zoom: 0.36,
      targetY: 0.33,
      gazePitch: (-10 * Math.PI) / 180,
      gazeYaw: 0,
    },
    {
      name: 'ref2_tilt_up_turn_left',
      robotYaw: 0,
      zoom: 0.36,
      targetY: 0.33,
      gazePitch: (-15 * Math.PI) / 180,
      gazeYaw: (-22 * Math.PI) / 180,
    },
    {
      name: 'ref3_tilt_up_turn_right',
      robotYaw: 0,
      zoom: 0.36,
      targetY: 0.33,
      gazePitch: (-15 * Math.PI) / 180,
      gazeYaw: (25 * Math.PI) / 180,
    },
    {
      name: 'ref4_rear_tilt_down',
      robotYaw: Math.PI,
      zoom: 0.36,
      targetY: 0.33,
      gazePitch: (14 * Math.PI) / 180,
      gazeYaw: (-14 * Math.PI) / 180,
    },
    // Also include neutral and extreme pitch/yaw for validation
    {
      name: 'neutral_front',
      robotYaw: 0,
      zoom: 0.36,
      targetY: 0.33,
      gazePitch: 0,
      gazeYaw: 0,
    },
    {
      name: 'pitch_down_front',
      robotYaw: 0,
      zoom: 0.36,
      targetY: 0.33,
      gazePitch: (20 * Math.PI) / 180,
      gazeYaw: 0,
    },
    {
      name: 'pitch_up_front',
      robotYaw: 0,
      zoom: 0.36,
      targetY: 0.33,
      gazePitch: (-20 * Math.PI) / 180,
      gazeYaw: 0,
    },
    {
      name: 'full_yaw_right',
      robotYaw: 0,
      zoom: 0.36,
      targetY: 0.33,
      gazePitch: 0,
      gazeYaw: (35 * Math.PI) / 180,
    },
  ];

  for (const tc of testCases) {
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const scene = window.__robotScene;
          if (!scene) return;
          scene.setRobotYaw(${tc.robotYaw}, false);
          scene.cameraManager.baseTargetY = ${tc.targetY};
          scene.cameraManager.setZoom(${tc.zoom});
          scene.cameraManager.update(10.0);

          // Apply gaze directly to controller or nodes
          const ctrl = scene.controller;
          if (ctrl) {
            // Disable idle drift during pose test
            ctrl.lookController.currentPitch = ${tc.gazePitch};
            ctrl.lookController.currentYaw = ${tc.gazeYaw};
            ctrl.lookController.currentRoll = 0;
            // Trigger an update with dt = 0.0001
            ctrl.update(0.0001);
          }
          scene.robotNodes.root.updateMatrixWorld(true);
        })()
      `,
      returnByValue: true
    });

    await sleep(400);

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const filename = `${prefix}_${tc.name}.png`;
    fs.writeFileSync(path.join(outDir, filename), Buffer.from(shot.data, 'base64'));
    console.log(`Captured ${filename}`);
  }

  ws.close();
  chromeProc.kill();
}

main().catch(console.error);

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9245;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const outDir = path.resolve('capture_adversarial_audit');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_audit_' + Date.now());
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

  const DEG2RAD = Math.PI / 180;

  // The 4 user references plus critical boundary poses:
  const poses = [
    // 1. Neutral
    { name: '01_neutral_front', robotYaw: 0, gazePitch: 0, gazeYaw: 0, camTargetY: 0.33, zoom: 0.36 },
    // 2. User Ref 1: Head pitched up (front view)
    { name: '02_user_ref1_pitch_up_15', robotYaw: 0, gazePitch: -15 * DEG2RAD, gazeYaw: 0, camTargetY: 0.33, zoom: 0.36 },
    // 3. User Ref 2 & 3: Head pitched up -15° and yawed right +25°
    { name: '03_user_ref2_up_right_front', robotYaw: 0, gazePitch: -15 * DEG2RAD, gazeYaw: 25 * DEG2RAD, camTargetY: 0.33, zoom: 0.36 },
    // 4. User Ref 2 & 3 from 3/4 camera view
    { name: '04_user_ref3_up_right_34', robotYaw: -20 * DEG2RAD, gazePitch: -15 * DEG2RAD, gazeYaw: 25 * DEG2RAD, camTargetY: 0.33, zoom: 0.36 },
    // 5. User Ref 4: Rear view with pitch down +18° and yaw -15°
    { name: '05_user_ref4_rear_pitch_down', robotYaw: Math.PI, gazePitch: 18 * DEG2RAD, gazeYaw: -15 * DEG2RAD, camTargetY: 0.33, zoom: 0.36 },
    // 6. User Ref 4 alternative: Rear view with pitch UP -15° and yaw +25°
    { name: '06_user_ref4_rear_pitch_up', robotYaw: Math.PI, gazePitch: -15 * DEG2RAD, gazeYaw: 25 * DEG2RAD, camTargetY: 0.33, zoom: 0.36 },
    // 7. Max Pitch Down (+24°)
    { name: '07_max_pitch_down_24_front', robotYaw: 0, gazePitch: 24 * DEG2RAD, gazeYaw: 0, camTargetY: 0.33, zoom: 0.36 },
    // 8. Max Pitch Down (+24°) rear view
    { name: '08_max_pitch_down_24_rear', robotYaw: Math.PI, gazePitch: 24 * DEG2RAD, gazeYaw: 0, camTargetY: 0.33, zoom: 0.36 },
    // 9. Max Yaw Right (+38°)
    { name: '09_max_yaw_right_38_front', robotYaw: 0, gazePitch: 0, gazeYaw: 38 * DEG2RAD, camTargetY: 0.33, zoom: 0.36 },
    // 10. Max Yaw Left (-38°)
    { name: '10_max_yaw_left_38_front', robotYaw: 0, gazePitch: 0, gazeYaw: -38 * DEG2RAD, camTargetY: 0.33, zoom: 0.36 },
    // 11. Side view neutral
    { name: '11_side_neutral', robotYaw: Math.PI / 2, gazePitch: 0, gazeYaw: 0, camTargetY: 0.33, zoom: 0.36 },
    // 12. Side view pitch up -15°
    { name: '12_side_pitch_up_15', robotYaw: Math.PI / 2, gazePitch: -15 * DEG2RAD, gazeYaw: 0, camTargetY: 0.33, zoom: 0.36 },
    // 13. Side view pitch down +20°
    { name: '13_side_pitch_down_20', robotYaw: Math.PI / 2, gazePitch: 20 * DEG2RAD, gazeYaw: 0, camTargetY: 0.33, zoom: 0.36 },
  ];

  for (const p of poses) {
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const scene = window.__robotScene;
          scene.setRobotYaw(${p.robotYaw}, false);
          scene.cameraManager.baseTargetY = ${p.camTargetY};
          scene.cameraManager.setZoom(${p.zoom});
          scene.cameraManager.update(10.0);

          const cfg = {
            headRatio: 0.72,
            neckRatio: 0.22,
            chestRatio: 0.06,
          };
          const pitchSum = cfg.headRatio + cfg.neckRatio + cfg.chestRatio;
          const headPitchRatio = cfg.headRatio / pitchSum;
          const neckPitchRatio = cfg.neckRatio / pitchSum;

          const headPitch = ${p.gazePitch} * headPitchRatio;
          const neckPitch = ${p.gazePitch} * neckPitchRatio;
          const headYaw = ${p.gazeYaw} * cfg.headRatio;
          const neckYaw = ${p.gazeYaw} * cfg.neckRatio;

          // Override lookController.update
          scene.controller.lookController.update = () => ({
            headPitch,
            headYaw,
            headRoll: 0,
            neckPitch,
            neckYaw,
            chestPitch: 0,
            chestYaw: 0,
            shouldersYaw: 0,
            waistYaw: 0,
            waistPitch: 0,
          });

          scene.controller.update(0.016);
          scene.robotNodes.root.updateMatrixWorld(true);
        })()
      `,
      returnByValue: true
    });

    await sleep(250);

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const filename = `${p.name}.png`;
    fs.writeFileSync(path.join(outDir, filename), Buffer.from(shot.data, 'base64'));
    console.log(`Captured ${filename}`);
  }

  ws.close();
  chromeProc.kill();
  console.log('Done capturing all adversarial audit images.');
}

main().catch(console.error);

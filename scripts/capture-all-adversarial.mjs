import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9245;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const outDir = path.resolve('capture_adversarial_audit');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_adv_' + Date.now());
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

  const testCases = [
    { name: '01_neutral_front', robotYaw: 0, gazePitch: 0, gazeYaw: 0, zoom: 0.45 },
    { name: '02_ref1_pitch_up_15', robotYaw: 0, gazePitch: -15 * DEG2RAD, gazeYaw: 0, zoom: 0.45 },
    { name: '03_ref1_pitch_up_18_max', robotYaw: 0, gazePitch: -18 * DEG2RAD, gazeYaw: 0, zoom: 0.45 },
    { name: '04_ref2_up_right', robotYaw: 0, gazePitch: -15 * DEG2RAD, gazeYaw: 25 * DEG2RAD, zoom: 0.45 },
    { name: '05_ref3_up_right_34', robotYaw: -25 * DEG2RAD, gazePitch: -15 * DEG2RAD, gazeYaw: 25 * DEG2RAD, zoom: 0.45 },
    { name: '06_ref4_rear_pitch_down_16', robotYaw: Math.PI, gazePitch: 16 * DEG2RAD, gazeYaw: -15 * DEG2RAD, zoom: 0.45 },
    { name: '07_ref4_rear_pitch_up_15', robotYaw: Math.PI, gazePitch: -15 * DEG2RAD, gazeYaw: 25 * DEG2RAD, zoom: 0.45 },
    { name: '08_max_pitch_down_26_front', robotYaw: 0, gazePitch: 26 * DEG2RAD, gazeYaw: 0, zoom: 0.45 },
    { name: '09_max_pitch_down_26_side', robotYaw: Math.PI / 2, gazePitch: 26 * DEG2RAD, gazeYaw: 0, zoom: 0.45 },
    { name: '10_max_pitch_up_18_side', robotYaw: Math.PI / 2, gazePitch: -18 * DEG2RAD, gazeYaw: 0, zoom: 0.45 },
    { name: '11_max_yaw_38_right', robotYaw: 0, gazePitch: 0, gazeYaw: 38 * DEG2RAD, zoom: 0.45 },
    { name: '12_max_yaw_38_left', robotYaw: 0, gazePitch: 0, gazeYaw: -38 * DEG2RAD, zoom: 0.45 },
    { name: '13_extreme_down_yaw_front', robotYaw: 0, gazePitch: 24 * DEG2RAD, gazeYaw: 35 * DEG2RAD, zoom: 0.45 },
    { name: '14_extreme_down_yaw_rear', robotYaw: Math.PI, gazePitch: 24 * DEG2RAD, gazeYaw: 35 * DEG2RAD, zoom: 0.45 },
  ];

  for (const tc of testCases) {
    const headRatio = 0.72;
    const neckRatio = 0.22;
    const pitchSum = 0.72 + 0.22 + 0.06;
    const headPitchRatio = 0.72 / pitchSum;
    const neckPitchRatio = 0.22 / pitchSum;

    const hp = tc.gazePitch * headPitchRatio;
    const np = tc.gazePitch * neckPitchRatio;
    const hy = tc.gazeYaw * headRatio;
    const ny = tc.gazeYaw * neckRatio;

    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const scene = window.__robotScene;
          scene.setRobotYaw(${tc.robotYaw}, false);
          scene.cameraManager.setZoom(${tc.zoom});
          scene.cameraManager.update(10.0);

          // Hook update to directly apply exact pose
          scene.controller.update = function(dt) {
            this.nodes.head.rotation.set(${hp}, ${hy}, 0, 'YXZ');
            this.nodes.neck.rotation.set(${np}, ${ny}, 0, 'YXZ');
            this.nodes.head.position.x = 0;
            this.nodes.head.position.y = this.baseHeadY;
            if (this.nodes.torsoNodes) {
              this.nodes.torsoNodes.chestPivot.rotation.set(${tc.gazePitch * (0.06 / pitchSum)}, ${tc.gazeYaw * 0.06}, 0, 'YXZ');
            }
          };
          scene.robotNodes.root.updateMatrixWorld(true);
        })()
      `,
      returnByValue: true
    });

    await sleep(200);

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const filename = `${tc.name}.png`;
    fs.writeFileSync(path.join(outDir, filename), Buffer.from(shot.data, 'base64'));
    console.log(`Captured ${filename}`);
  }

  ws.close();
  chromeProc.kill();
  console.log('Finished capturing all test cases.');
}

main().catch(console.error);

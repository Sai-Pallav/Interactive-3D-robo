import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9245;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_robo_side_' + Date.now());
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
    'http://localhost:5180/'
  ]);

  chromeProc.stderr.on('data', () => {});
  chromeProc.stdout.on('data', () => {});

  let targets = null;
  let pageTarget = null;
  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      targets = await res.json();
      pageTarget = targets?.find(t => t.type === 'page' && t.url.includes('5180')) || targets?.find(t => t.type === 'page');
      if (pageTarget && pageTarget.webSocketDebuggerUrl) break;
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
  await sleep(400);

  // Disable camera manager auto-update & mouse tracking for precise, stable camera control
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

  const outDir = path.resolve('capture_output', 'side_audit');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const views = [
    { name: '1_full_left_side', yaw: Math.PI * 0.5, camY: -0.125, camZ: 4.2, targetY: -0.125 },
    { name: '2_full_right_side', yaw: -Math.PI * 0.5, camY: -0.125, camZ: 4.2, targetY: -0.125 },
    { name: '3_shoulder_arm_left', yaw: Math.PI * 0.5, camY: 0.22, camZ: 1.4, targetY: 0.22 },
    { name: '4_shoulder_arm_right', yaw: -Math.PI * 0.5, camY: 0.22, camZ: 1.4, targetY: 0.22 },
    { name: '5_torso_abdomen_left', yaw: Math.PI * 0.5, camY: 0.02, camZ: 1.25, targetY: 0.02 },
    { name: '6_torso_rear_scapula_left', yaw: Math.PI * 0.68, camY: 0.14, camZ: 1.35, targetY: 0.14 },
    { name: '7_waist_pelvis_hip_left', yaw: Math.PI * 0.5, camY: -0.22, camZ: 1.25, targetY: -0.22 },
    { name: '8_thigh_knee_left', yaw: Math.PI * 0.5, camY: -0.42, camZ: 1.25, targetY: -0.42 },
    { name: '9_ankle_foot_left', yaw: Math.PI * 0.5, camY: -0.68, camZ: 1.05, targetY: -0.68 },
    { name: '10_foot_ground_left', yaw: Math.PI * 0.5, camY: -0.72, camZ: 0.75, targetY: -0.72 },
    { name: '11_full_front', yaw: 0, camY: -0.125, camZ: 4.2, targetY: -0.125 },
    { name: '12_full_rear', yaw: Math.PI, camY: -0.125, camZ: 4.2, targetY: -0.125 }
  ];

  for (const v of views) {
    console.log(`Setting view: ${v.name}...`);
    await send('Runtime.evaluate', {
      expression: `
        const scene = window.__robotScene;
        scene.setRobotYaw(${v.yaw}, false);
        scene.cameraManager.camera.position.set(0, ${v.camY}, ${v.camZ});
        scene.cameraManager.camera.lookAt(0, ${v.targetY}, 0);
        true;
      `,
      returnByValue: true
    });
    await sleep(600);

    const shotRes = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(shotRes.data, 'base64');
    const filePath = path.join(outDir, `${v.name}.png`);
    fs.writeFileSync(filePath, buffer);
    console.log(`Saved screenshot: ${filePath}`);
  }

  ws.close();
  chromeProc.kill();
  console.log('Side audit screenshots complete!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

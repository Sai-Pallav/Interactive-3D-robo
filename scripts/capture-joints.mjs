import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9249;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_joints_' + Date.now());
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

  // Disable camera manager auto-update so custom camera placement sticks
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

  const outDir = path.resolve('capture_joints');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const jointShots = [
    // 1. Shoulders
    { name: '1_shoulder_front', target: [-0.22, 0.17, -0.02], cam: [-0.22, 0.17, 0.22], yaw: 0.0 },
    { name: '2_shoulder_lateral', target: [-0.22, 0.17, -0.02], cam: [-0.44, 0.17, -0.02], yaw: 0.0 },
    { name: '3_shoulder_rear', target: [-0.22, 0.17, -0.02], cam: [-0.22, 0.17, -0.26], yaw: 0.0 },
    
    // 2. Elbows
    { name: '4_elbow_front', target: [-0.25, -0.04, -0.01], cam: [-0.25, -0.04, 0.22], yaw: 0.0 },
    { name: '5_elbow_lateral', target: [-0.25, -0.04, -0.01], cam: [-0.46, -0.04, -0.01], yaw: 0.0 },
    { name: '6_elbow_rear', target: [-0.25, -0.04, -0.01], cam: [-0.25, -0.04, -0.24], yaw: 0.0 },

    // 3. Wrists
    { name: '7_wrist_front', target: [-0.26, -0.21, 0.05], cam: [-0.26, -0.21, 0.22], yaw: 0.0 },
    { name: '8_wrist_lateral', target: [-0.26, -0.21, 0.05], cam: [-0.44, -0.21, 0.05], yaw: 0.0 },

    // 4. Hips
    { name: '9_hip_front', target: [-0.095, -0.145, -0.01], cam: [-0.095, -0.145, 0.24], yaw: 0.0 },
    { name: '10_hip_rear', target: [-0.095, -0.145, -0.01], cam: [-0.095, -0.145, -0.26], yaw: 0.0 },

    // 5. Knees
    { name: '11_knee_front', target: [-0.115, -0.355, 0.0], cam: [-0.115, -0.355, 0.24], yaw: 0.0 },
    { name: '12_knee_lateral', target: [-0.115, -0.355, 0.0], cam: [-0.34, -0.355, 0.0], yaw: 0.0 },

    // 6. Ankles
    { name: '13_ankle_front', target: [-0.129, -0.581, -0.02], cam: [-0.129, -0.581, 0.22], yaw: 0.0 },
    { name: '14_ankle_rear', target: [-0.129, -0.581, -0.02], cam: [-0.129, -0.581, -0.24], yaw: 0.0 }
  ];

  for (const s of jointShots) {
    console.log(`Capturing shot: ${s.name}...`);
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const scene = window.__robotScene;
          scene.setRobotYaw(${s.yaw}, false);
          const cam = scene.cameraManager.camera;
          cam.position.set(${s.cam[0]}, ${s.cam[1]}, ${s.cam[2]});
          scene.cameraManager.target.set(${s.target[0]}, ${s.target[1]}, ${s.target[2]});
          cam.lookAt(scene.cameraManager.target);
          cam.updateMatrixWorld(true);
          cam.updateProjectionMatrix();
          return { pos: cam.position.toArray(), target: scene.cameraManager.target.toArray() };
        })()
      `,
      returnByValue: true
    });
    await sleep(400);

    const shotRes = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(shotRes.data, 'base64');
    const filePath = path.join(outDir, `${s.name}.png`);
    fs.writeFileSync(filePath, buffer);
    console.log(`Saved: ${filePath}`);
  }

  ws.close();
  chromeProc.kill();
  console.log('Done capturing targeted joint views!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

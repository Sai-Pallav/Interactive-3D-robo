import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9252;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_joints_exact_' + Date.now());
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

  const outDir = path.resolve('capture_joints_exact');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const targets = [
    { key: 'shoulder', getNode: 'window.__robotScene.robotNodes.torsoNodes.shoulderMountLeft.group', name: '1_shoulder', dist: 0.26 },
    { key: 'elbow', getNode: 'window.__robotScene.robotNodes.leftArmNodes.elbow.group', name: '2_elbow', dist: 0.18 },
    { key: 'wrist', getNode: 'window.__robotScene.robotNodes.leftArmNodes.wrist.group', name: '3_wrist', dist: 0.16 },
    { key: 'hip', getNode: 'window.__robotScene.robotNodes.leftLegNodes.hip.group', name: '4_hip', dist: 0.22 },
    { key: 'knee', getNode: 'window.__robotScene.robotNodes.leftLegNodes.knee.group', name: '5_knee', dist: 0.22 },
    { key: 'ankle', getNode: 'window.__robotScene.robotNodes.leftLegNodes.ankle.group', name: '6_ankle', dist: 0.18 }
  ];

  for (const t of targets) {
    for (const view of ['front', 'lateral', 'rear']) {
      const shotName = `${t.name}_${view}`;
      console.log(`Setting up: ${shotName}...`);

      const evalRes = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const scene = window.__robotScene;
            scene.setRobotYaw(0.0, false);
            const node = ${t.getNode};
            if (!node) return { error: 'node not found: ${t.getNode}' };
            const pos = new scene.cameraManager.camera.position.constructor();
            node.getWorldPosition(pos);
            const cam = scene.cameraManager.camera;
            
            let cx = pos.x;
            let cy = pos.y;
            let cz = pos.z;
            const d = ${t.dist};

            if ('${view}' === 'front') {
              cz += d;
            } else if ('${view}' === 'lateral') {
              cx -= d; // Left side is -X, so camera is further -X looking inward
            } else if ('${view}' === 'rear') {
              cz -= d;
            }

            cam.position.set(cx, cy, cz);
            cam.lookAt(pos);
            cam.updateMatrixWorld(true);
            cam.updateProjectionMatrix();
            scene.renderer.render(scene.scene, cam);
            return { joint: '${t.key}', worldPos: pos.toArray(), camPos: cam.position.toArray() };
          })()
        `,
        returnByValue: true
      });
      console.log(`Evaluated: ${JSON.stringify(evalRes?.result?.value)}`);
      await sleep(350);

      const shotRes = await send('Page.captureScreenshot', { format: 'png' });
      const buffer = Buffer.from(shotRes.data, 'base64');
      const filePath = path.join(outDir, `${shotName}.png`);
      fs.writeFileSync(filePath, buffer);
      console.log(`Saved: ${filePath}`);
    }
  }

  ws.close();
  chromeProc.kill();
  console.log('All exact joint views captured!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

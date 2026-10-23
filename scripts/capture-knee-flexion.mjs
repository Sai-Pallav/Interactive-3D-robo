import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9278;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_knee_' + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tmpDir}`,
    '--window-size=1280,960',
    '--no-sandbox',
    '--disable-gpu-watchdog',
    '--enable-webgl',
    '--use-gl=angle',
    'http://localhost:5180/?collapsed=1'
  ]);

  let pageTarget = null;
  for (let i = 0; i < 30; i++) {
    await sleep(300);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = await res.json();
      pageTarget = targets?.find(t => t.type === 'page' && t.url.includes('5180')) || targets?.find(t => t.type === 'page');
      if (pageTarget?.webSocketDebuggerUrl) break;
    } catch (e) {}
  }

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let msgId = 1;
  const pending = new Map();
  ws.onmessage = (e) => {
    const d = JSON.parse(e.data);
    if (d.id && pending.has(d.id)) {
      const { resolve, reject } = pending.get(d.id);
      pending.delete(d.id);
      if (d.error) reject(d.error);
      else resolve(d.result);
    }
  };

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = msgId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

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

  await send('Runtime.evaluate', {
    expression: `
      window.__robotScene.cameraManager.update = () => false;
      if (window.__robotScene.setMouseTrackingEnabled) window.__robotScene.setMouseTrackingEnabled(false);
      window.__robotScene.setRobotYaw(0, false);
      window.__robotScene.targetRobotYaw = 0;
      window.__robotScene.isAnimatingYaw = false;
      window.__robotScene.robotNodes.root.rotation.y = 0;

      // Pose left leg with substantial knee flexion
      const leftLeg = window.__robotScene.robotNodes.leftLegNodes;
      leftLeg.hip.group.rotation.x = -0.35; // thigh forward
      leftLeg.knee.shinPivot.rotation.x = 0.85; // knee bent
      leftLeg.ankle.footPivot.rotation.x = -0.50; // foot counter-rotated
      if (leftLeg.ankle.achillesDamper?.update) {
        leftLeg.ankle.achillesDamper.update();
      }

      const cam = window.__robotScene.cameraManager.camera;
      const wp = window.__robotScene.cameraManager.target;
      leftLeg.knee.patellaShield.getWorldPosition(wp);

      cam.position.set(wp.x - 0.70, wp.y + 0.10, wp.z + 0.70);
      cam.lookAt(wp.x, wp.y - 0.05, wp.z);
      cam.updateMatrixWorld(true);
      cam.updateProjectionMatrix();
      window.__robotScene.renderer.render(window.__robotScene.scene, cam);
      true;
    `,
    returnByValue: true
  });
  await sleep(250);

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('capture_legs_baseline/baseline_knee_flexion_3quarter.png', Buffer.from(shot.data, 'base64'));
  console.log('Saved: baseline_knee_flexion_3quarter.png');

  ws.close();
  chromeProc.kill();
}

main().catch(console.error);

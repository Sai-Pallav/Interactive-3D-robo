import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9277;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_flex_' + Date.now());
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

  // Stop the animation loop so controller.update doesn't overwrite our posed angles
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const scene = window.__robotScene;
        scene.stop();
        scene.cameraManager.update = () => false;
        if (scene.setMouseTrackingEnabled) scene.setMouseTrackingEnabled(false);
        scene.setRobotYaw(0, false);
        scene.targetRobotYaw = 0;
        scene.isAnimatingYaw = false;
        scene.robotNodes.root.rotation.y = 0;

        const leftLeg = scene.robotNodes.leftLegNodes;
        // Pose knee flexion: thigh lifted forward 25 deg, knee flexed 55 deg, foot counter-balanced
        leftLeg.hip.group.rotation.x = -0.45;
        leftLeg.knee.shinPivot.rotation.x = 0.95;
        leftLeg.ankle.footPivot.rotation.x = -0.50;

        // Force matrix update down the tree
        scene.robotNodes.root.updateMatrixWorld(true);

        // Update Achilles damper cylinder/piston alignment in world space
        if (leftLeg.ankle.achillesDamper?.update) {
          leftLeg.ankle.achillesDamper.update();
        }
        scene.robotNodes.root.updateMatrixWorld(true);

        const cam = scene.cameraManager.camera;
        const wp = scene.cameraManager.target;
        leftLeg.knee.patellaShield.getWorldPosition(wp);

        cam.position.set(wp.x - 0.65, wp.y + 0.15, wp.z + 0.70);
        cam.lookAt(wp.x, wp.y - 0.05, wp.z);
        cam.updateMatrixWorld(true);
        cam.updateProjectionMatrix();

        scene.renderer.render(scene.scene, cam);
        return { ok: true, kneeRotX: leftLeg.knee.shinPivot.rotation.x };
      })()
    `,
    returnByValue: true
  });

  await sleep(200);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('capture_legs_refined/refined_knee_flexion_3quarter.png', Buffer.from(shot.data, 'base64'));
  console.log('Saved: refined_knee_flexion_3quarter.png');

  ws.close();
  chromeProc.kill();
}

main().catch(console.error);

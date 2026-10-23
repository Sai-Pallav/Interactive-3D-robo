import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9298;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_sh_diag_' + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tmpDir}`,
    '--window-size=1280,800',
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

  if (!pageTarget?.webSocketDebuggerUrl) {
    chromeProc.kill();
    throw new Error('Chrome target not found');
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

  // Disable camera manager auto-update & hide UI overlays
  await send('Runtime.evaluate', {
    expression: `
      window.__robotScene.cameraManager.update = () => false;
      if (window.__robotScene.setMouseTrackingEnabled) window.__robotScene.setMouseTrackingEnabled(false);
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

  const outDir = path.resolve('capture_sh_diag');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const shots = [
    {
      name: 'R_front_45',
      code: `
        scene.setRobotYaw(0, false);
        const joint = scene.scene.getObjectByName('RightShoulderJoint');
        const pos = new THREE.Vector3();
        joint.getWorldPosition(pos);
        const cam = scene.cameraManager.camera;
        cam.position.set(pos.x + 0.16, pos.y + 0.08, pos.z + 0.26);
        cam.lookAt(pos.x, pos.y, pos.z);
        cam.updateMatrixWorld(true);
        cam.updateProjectionMatrix();
        scene.renderer.render(scene.scene, cam);
      `
    },
    {
      name: 'R_rear_45',
      code: `
        scene.setRobotYaw(0, false);
        const joint = scene.scene.getObjectByName('RightShoulderJoint');
        const pos = new THREE.Vector3();
        joint.getWorldPosition(pos);
        const cam = scene.cameraManager.camera;
        cam.position.set(pos.x + 0.16, pos.y + 0.08, pos.z - 0.26);
        cam.lookAt(pos.x, pos.y, pos.z);
        cam.updateMatrixWorld(true);
        cam.updateProjectionMatrix();
        scene.renderer.render(scene.scene, cam);
      `
    },
    {
      name: 'L_front_45',
      code: `
        scene.setRobotYaw(0, false);
        const joint = scene.scene.getObjectByName('LeftShoulderJoint');
        const pos = new THREE.Vector3();
        joint.getWorldPosition(pos);
        const cam = scene.cameraManager.camera;
        cam.position.set(pos.x - 0.16, pos.y + 0.08, pos.z + 0.26);
        cam.lookAt(pos.x, pos.y, pos.z);
        cam.updateMatrixWorld(true);
        cam.updateProjectionMatrix();
        scene.renderer.render(scene.scene, cam);
      `
    },
    {
      name: 'L_rear_45',
      code: `
        scene.setRobotYaw(0, false);
        const joint = scene.scene.getObjectByName('LeftShoulderJoint');
        const pos = new THREE.Vector3();
        joint.getWorldPosition(pos);
        const cam = scene.cameraManager.camera;
        cam.position.set(pos.x - 0.16, pos.y + 0.08, pos.z - 0.26);
        cam.lookAt(pos.x, pos.y, pos.z);
        cam.updateMatrixWorld(true);
        cam.updateProjectionMatrix();
        scene.renderer.render(scene.scene, cam);
      `
    }
  ];

  for (const s of shots) {
    const code = s.code.replace(/new THREE\.Vector3/g, 'new V3');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const scene = window.__robotScene;
        const V3 = scene.cameraManager.camera.position.constructor;
        ${code};
        return true;
      })()`,
      returnByValue: true
    });
    await sleep(250);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(shot.data, 'base64');
    fs.writeFileSync(path.join(outDir, `${s.name}.png`), buf);
    console.log(`Saved: ${s.name}.png`);
  }

  ws.close();
  chromeProc.kill();
}

main().catch(console.error);

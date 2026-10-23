import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9296;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_shifts_' + Date.now());
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

  const outDir = path.resolve('capture_shifts');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const shifts = [0, -0.015, -0.025, -0.035];

  for (const dz of shifts) {
    const evalRes = await send('Runtime.evaluate', {
      expression: `(() => {
        try {
          const scene = window.__robotScene;
          const V3 = scene.cameraManager.camera.position.constructor;
          scene.setRobotYaw(0, false);

          if (!window.__origPositions) {
            window.__origPositions = {
              rF: scene.scene.getObjectByName('RightShoulderFoundation')?.position.clone(),
              lF: scene.scene.getObjectByName('LeftShoulderFoundation')?.position.clone(),
              rShell: scene.scene.getObjectByName('RightUpperShoulderShell')?.position.clone(),
              lShell: scene.scene.getObjectByName('LeftUpperShoulderShell')?.position.clone(),
              rFrame: scene.scene.getObjectByName('RightMountingFrame')?.position.clone(),
              lFrame: scene.scene.getObjectByName('LeftMountingFrame')?.position.clone(),
            };
          }

          const dz = ${dz};
          const p = window.__origPositions;

          const rF = scene.scene.getObjectByName('RightShoulderFoundation');
          if (rF && p.rF) rF.position.set(p.rF.x, p.rF.y, p.rF.z + dz);

          const lF = scene.scene.getObjectByName('LeftShoulderFoundation');
          if (lF && p.lF) lF.position.set(p.lF.x, p.lF.y, p.lF.z + dz);

          const rShell = scene.scene.getObjectByName('RightUpperShoulderShell');
          if (rShell && p.rShell) rShell.position.set(p.rShell.x, p.rShell.y, p.rShell.z + dz);

          const lShell = scene.scene.getObjectByName('LeftUpperShoulderShell');
          if (lShell && p.lShell) lShell.position.set(p.lShell.x, p.lShell.y, p.lShell.z + dz);

          const rFrame = scene.scene.getObjectByName('RightMountingFrame');
          if (rFrame && p.rFrame) rFrame.position.set(p.rFrame.x, p.rFrame.y, p.rFrame.z + dz);

          const lFrame = scene.scene.getObjectByName('LeftMountingFrame');
          if (lFrame && p.lFrame) lFrame.position.set(p.lFrame.x, p.lFrame.y, p.lFrame.z + dz);

          scene.scene.updateMatrixWorld(true);

          const joint = scene.scene.getObjectByName('RightShoulderJoint');
          const pos = new V3();
          joint.getWorldPosition(pos);
          const cam = scene.cameraManager.camera;
          cam.position.set(pos.x + 0.20, pos.y + 0.04, pos.z - 0.22);
          cam.lookAt(pos.x - 0.02, pos.y, pos.z);
          cam.updateMatrixWorld(true);
          cam.updateProjectionMatrix();
          scene.renderer.render(scene.scene, cam);
          return { ok: true, pos: pos.toArray() };
        } catch (e) {
          return { error: e.toString(), stack: e.stack };
        }
      })()`,
      returnByValue: true
    });
    console.log(`dz = ${dz}:`, evalRes?.result?.value);

    await sleep(200);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(shot.data, 'base64');
    const name = `shift_${dz >= 0 ? '+' : ''}${Math.round(dz * 1000)}mm.png`;
    fs.writeFileSync(path.join(outDir, name), buf);
    console.log(`Saved: ${name}`);
  }

  ws.close();
  chromeProc.kill();
}

main().catch(console.error);

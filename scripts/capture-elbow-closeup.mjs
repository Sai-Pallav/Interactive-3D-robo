import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9276;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_elbow_' + Date.now());
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tmpDir}`,
    '--window-size=1280,1024',
    '--no-sandbox',
    '--disable-gpu-watchdog',
    '--enable-webgl',
    '--use-gl=angle',
    'http://localhost:5180/?collapsed=1'
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
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let msgId = 1;
  const pending = new Map();
  ws.onmessage = (e) => {
    const d = JSON.parse(e.data);
    if (d.id && pending.has(d.id)) {
      const p = pending.get(d.id);
      pending.delete(d.id);
      if (d.error) p.reject(d.error); else p.resolve(d.result);
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

  // Freeze camera auto-updates & gaze tracking
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

  const outDir = 'capture_elbow_before';
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const targets = [
    { name: 'left_arm', nodePath: 'window.__robotScene.robotNodes.leftArmNodes.elbow.group', sign: -1 },
    { name: 'right_arm', nodePath: 'window.__robotScene.robotNodes.rightArmNodes.elbow.group', sign: 1 }
  ];

  const views = [
    { suffix: 'front_closeup', dx: 0, dy: 0.02, dz: 0.22 },
    { suffix: 'front_34_matching_img2', dx: 0.08, dy: 0.04, dz: 0.20 },
    { suffix: 'rear_closeup', dx: 0, dy: 0.02, dz: -0.22 },
    { suffix: 'lateral_closeup', dx: 0.22, dy: 0.02, dz: 0 }
  ];

  for (const t of targets) {
    for (const v of views) {
      const shotName = `${t.name}_${v.suffix}`;
      console.log(`Capturing: ${shotName}...`);

      const evalRes = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const scene = window.__robotScene;
            scene.setRobotYaw(0.0, false);
            const node = ${t.nodePath};
            if (!node) return { error: 'node not found' };
            const pos = new scene.cameraManager.camera.position.constructor();
            node.getWorldPosition(pos);
            const cam = scene.cameraManager.camera;
            
            // Adjust dx by arm side for lateral view
            const effectiveDx = '${v.suffix}' === 'lateral_closeup' ? (${t.sign} * ${Math.abs(v.dx)}) : (${t.sign} * ${v.dx});
            cam.position.set(pos.x + effectiveDx, pos.y + ${v.dy}, pos.z + ${v.dz});
            cam.lookAt(pos.x, pos.y + 0.02, pos.z);
            cam.updateMatrixWorld(true);
            cam.updateProjectionMatrix();
            scene.renderer.render(scene.scene, cam);
            return { joint: '${t.name}', worldPos: pos.toArray() };
          })()
        `,
        returnByValue: true
      });
      console.log(`Evaluated:`, evalRes?.result?.value);
      await sleep(350);

      const shotRes = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(outDir, `${shotName}.png`), Buffer.from(shotRes.data, 'base64'));
      console.log(`Saved ${outDir}/${shotName}.png`);
    }
  }

  // Also capture articulation flexion test (-0.40 rad resting, -1.0 rad flex)
  for (const bend of [-0.40, -1.0]) {
    const shotName = `articulation_flexion_${Math.abs(bend).toFixed(2)}`;
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const scene = window.__robotScene;
          scene.robotNodes.leftArmNodes.elbow.forearmPivot.rotation.x = ${bend};
          scene.robotNodes.rightArmNodes.elbow.forearmPivot.rotation.x = ${bend};
          const node = window.__robotScene.robotNodes.leftArmNodes.elbow.group;
          const pos = new scene.cameraManager.camera.position.constructor();
          node.getWorldPosition(pos);
          const cam = scene.cameraManager.camera;
          cam.position.set(pos.x - 0.22, pos.y + 0.02, pos.z);
          cam.lookAt(pos.x, pos.y + 0.02, pos.z);
          cam.updateMatrixWorld(true);
          cam.updateProjectionMatrix();
          scene.renderer.render(scene.scene, cam);
          return true;
        })()
      `,
      returnByValue: true
    });
    await sleep(350);
    const shotRes = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, `${shotName}.png`), Buffer.from(shotRes.data, 'base64'));
    console.log(`Saved ${outDir}/${shotName}.png`);
  }

  chromeProc.kill();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

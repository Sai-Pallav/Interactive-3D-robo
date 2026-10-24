import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9244;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_leg_ref_' + Date.now());
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

  // Freeze camera auto-updates and mouse tracking, hide UI elements
  await send('Runtime.evaluate', {
    expression: `
      window.__robotScene.cameraManager.update = () => false;
      if (window.__robotScene.setMouseTrackingEnabled) window.__robotScene.setMouseTrackingEnabled(false);
      window.__robotScene.targetRobotYaw = 0;
      window.__robotScene.isAnimatingYaw = false;
      window.__robotScene.robotNodes.root.rotation.y = 0;
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

  const outDir = path.resolve('capture_legs_ref');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const shots = [
    {
      name: 'ref_front_view',
      code: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        cam.position.set(0, -0.95, 1.65);
        cam.lookAt(0, -0.95, 0);
      `
    },
    {
      name: 'ref_back_view',
      code: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        cam.position.set(0, -0.95, -1.65);
        cam.lookAt(0, -0.95, 0);
      `
    },
    {
      name: 'ref_left_view',
      code: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        cam.position.set(-1.65, -0.95, 0);
        cam.lookAt(0, -0.95, 0);
      `
    },
    {
      name: 'ref_right_view',
      code: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        cam.position.set(1.65, -0.95, 0);
        cam.lookAt(0, -0.95, 0);
      `
    },
    {
      name: 'ref_knee_detail',
      code: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        const target = scene.cameraManager.target;
        scene.robotNodes.leftLegNodes.knee.patellaShield.getWorldPosition(target);
        cam.position.set(target.x - 0.28, target.y - 0.02, target.z + 0.35);
        cam.lookAt(target.x, target.y - 0.02, target.z);
      `
    },
    {
      name: 'ref_thigh_detail',
      code: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        const target = scene.cameraManager.target;
        scene.robotNodes.leftLegNodes.thigh.lateralArmor.getWorldPosition(target);
        cam.position.set(target.x - 0.38, target.y, target.z + 0.20);
        cam.lookAt(target.x, target.y, target.z);
      `
    },
    {
      name: 'ref_calf_detail',
      code: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        const target = scene.cameraManager.target;
        scene.robotNodes.leftLegNodes.shin.posteriorCalfArmor.getWorldPosition(target);
        cam.position.set(target.x, target.y, target.z - 0.40);
        cam.lookAt(target.x, target.y, target.z);
      `
    },
    {
      name: 'ref_ankle_detail',
      code: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        const target = scene.cameraManager.target;
        scene.robotNodes.leftLegNodes.ankle.sphericalCore.getWorldPosition(target);
        cam.position.set(target.x - 0.35, target.y - 0.02, target.z + 0.18);
        cam.lookAt(target.x, target.y - 0.02, target.z);
      `
    },
    {
      name: 'ref_foot_detail',
      code: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        const target = scene.cameraManager.target;
        scene.robotNodes.leftLegNodes.foot.soleChassis.getWorldPosition(target);
        cam.position.set(target.x - 0.45, target.y + 0.08, target.z + 0.12);
        cam.lookAt(target.x, target.y + 0.02, target.z);
      `
    }
  ];

  for (const s of shots) {
    const evalRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          try {
            const scene = window.__robotScene;
            ${s.code};
            cam.updateMatrixWorld(true);
            cam.updateProjectionMatrix();
            scene.renderer.render(scene.scene, cam);
            return { ok: true };
          } catch (e) {
            return { ok: false, err: e.message, stack: e.stack };
          }
        })()
      `,
      returnByValue: true
    });
    if (evalRes?.result?.value?.ok === false) {
      console.error(`Error evaluating ${s.name}:`, evalRes.result.value.err);
    }
    await sleep(150);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, `${s.name}.png`), Buffer.from(shot.data, 'base64'));
    console.log(`Saved: ${s.name}.png`);
  }

  ws.close();
  chromeProc.kill();
  console.log('All reference comparison captures complete!');
}

main().catch(console.error);

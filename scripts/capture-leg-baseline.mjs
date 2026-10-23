import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9277;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_leg_base_' + Date.now());
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

  // Freeze camera auto-updates and mouse tracking for stable screenshots
  await send('Runtime.evaluate', {
    expression: `
      window.__robotScene.cameraManager.update = () => false;
      if (window.__robotScene.setMouseTrackingEnabled) window.__robotScene.setMouseTrackingEnabled(false);
      window.__robotScene.targetRobotYaw = 0;
      window.__robotScene.isAnimatingYaw = false;
      window.__robotScene.robotNodes.root.rotation.y = 0;
      true;
    `,
    returnByValue: true
  });

  const outDir = path.resolve('capture_legs_baseline');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const shots = [
    {
      name: 'baseline_fullbody_front',
      code: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        cam.position.set(0, -0.35, 3.10);
        cam.lookAt(0, -0.35, 0);
      `
    },
    {
      name: 'baseline_fullbody_rear',
      code: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        cam.position.set(0, -0.35, -3.10);
        cam.lookAt(0, -0.35, 0);
      `
    },
    {
      name: 'baseline_fullbody_side_left',
      code: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        cam.position.set(-3.10, -0.35, 0);
        cam.lookAt(0, -0.35, 0);
      `
    },
    {
      name: 'baseline_fullbody_side_right',
      code: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        cam.position.set(3.10, -0.35, 0);
        cam.lookAt(0, -0.35, 0);
      `
    },
    {
      name: 'baseline_fullbody_3quarter',
      code: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        cam.position.set(1.95, -0.30, 2.40);
        cam.lookAt(0, -0.35, 0);
      `
    },
    {
      name: 'baseline_legs_both_front',
      code: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        cam.position.set(0, -0.95, 1.65);
        cam.lookAt(0, -0.95, 0);
      `
    },
    {
      name: 'baseline_legs_both_rear',
      code: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        cam.position.set(0, -0.95, -1.65);
        cam.lookAt(0, -0.95, 0);
      `
    },
    {
      name: 'baseline_closeup_hip_thigh',
      code: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        const wp = scene.cameraManager.target;
        scene.robotNodes.leftLegNodes.thigh.anteriorArmor.getWorldPosition(wp);
        cam.position.set(wp.x, wp.y + 0.08, wp.z + 0.65);
        cam.lookAt(wp.x, wp.y + 0.08, wp.z);
      `
    },
    {
      name: 'baseline_closeup_knee',
      code: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        const wp = scene.cameraManager.target;
        scene.robotNodes.leftLegNodes.knee.patellaShield.getWorldPosition(wp);
        cam.position.set(wp.x, wp.y, wp.z + 0.45);
        cam.lookAt(wp.x, wp.y, wp.z);
      `
    },
    {
      name: 'baseline_closeup_knee_lateral',
      code: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        const wp = scene.cameraManager.target;
        scene.robotNodes.leftLegNodes.knee.lateralDisc.getWorldPosition(wp);
        cam.position.set(wp.x - 0.45, wp.y, wp.z);
        cam.lookAt(wp.x, wp.y, wp.z);
      `
    },
    {
      name: 'baseline_closeup_shin_ankle',
      code: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        const wp = scene.cameraManager.target;
        scene.robotNodes.leftLegNodes.shin.anteriorKeelArmor.getWorldPosition(wp);
        cam.position.set(wp.x, wp.y - 0.05, wp.z + 0.58);
        cam.lookAt(wp.x, wp.y - 0.05, wp.z);
      `
    },
    {
      name: 'baseline_closeup_foot_front',
      code: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        const wp = scene.cameraManager.target;
        scene.robotNodes.leftLegNodes.foot.soleChassis.getWorldPosition(wp);
        cam.position.set(wp.x, wp.y + 0.15, wp.z + 0.45);
        cam.lookAt(wp.x, wp.y + 0.04, wp.z);
      `
    },
    {
      name: 'baseline_closeup_foot_lateral',
      code: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        const wp = scene.cameraManager.target;
        scene.robotNodes.leftLegNodes.foot.soleChassis.getWorldPosition(wp);
        cam.position.set(wp.x - 0.45, wp.y + 0.10, wp.z);
        cam.lookAt(wp.x, wp.y + 0.04, wp.z);
      `
    },
    {
      name: 'baseline_closeup_foot_rear_thruster',
      code: `
        scene.setRobotYaw(0, false);
        const cam = scene.cameraManager.camera;
        const wp = scene.cameraManager.target;
        scene.robotNodes.leftLegNodes.foot.soleChassis.getWorldPosition(wp);
        cam.position.set(wp.x, wp.y + 0.10, wp.z - 0.42);
        cam.lookAt(wp.x, wp.y + 0.04, wp.z);
      `
    },
    {
      name: 'baseline_articulated_knee_bend',
      code: `
        scene.setRobotYaw(0, false);
        if (scene.robotNodes && scene.robotNodes.leftLegNodes) {
          scene.robotNodes.leftLegNodes.knee.shinPivot.rotation.x = 0.70;
          scene.robotNodes.leftLegNodes.ankle.footPivot.rotation.x = -0.45;
          if (scene.robotNodes.leftLegNodes.ankle.achillesDamper?.update) {
            scene.robotNodes.leftLegNodes.ankle.achillesDamper.update();
          }
        }
        const cam = scene.cameraManager.camera;
        const wp = scene.cameraManager.target;
        scene.robotNodes.leftLegNodes.knee.patellaShield.getWorldPosition(wp);
        cam.position.set(wp.x - 0.48, wp.y - 0.05, wp.z + 0.40);
        cam.lookAt(wp.x, wp.y - 0.05, wp.z);
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
  console.log('All baseline captures complete!');
}

main().catch(console.error);

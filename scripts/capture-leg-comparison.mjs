import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9296;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_leg_comp_' + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });

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

  const outDir = path.resolve('capture_legs_comparison');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const isolateLegs = `
    const nodes = scene.robotNodes;
    if (nodes.head) nodes.head.visible = false;
    if (nodes.neck) nodes.neck.visible = false;
    if (nodes.leftArmNodes?.group) nodes.leftArmNodes.group.visible = false;
    if (nodes.rightArmNodes?.group) nodes.rightArmNodes.group.visible = false;
    if (nodes.torsoNodes?.chest?.group) nodes.torsoNodes.chest.group.visible = false;
    if (nodes.torsoNodes?.abdomen?.group) nodes.torsoNodes.abdomen.group.visible = false;
  `;

  const restoreFullbody = `
    const nodes = scene.robotNodes;
    if (nodes.head) nodes.head.visible = true;
    if (nodes.neck) nodes.neck.visible = true;
    if (nodes.leftArmNodes?.group) nodes.leftArmNodes.group.visible = true;
    if (nodes.rightArmNodes?.group) nodes.rightArmNodes.group.visible = true;
    if (nodes.torsoNodes?.chest?.group) nodes.torsoNodes.chest.group.visible = true;
    if (nodes.torsoNodes?.abdomen?.group) nodes.torsoNodes.abdomen.group.visible = true;
  `;

  const shots = [
    // 1. Orthographic-aligned 4 primary views matching the reference layout (Pelvis + Legs)
    {
      name: 'comp_legs_front',
      code: `
        scene.setRobotYaw(0, false);
        ${isolateLegs}
        const cam = scene.cameraManager.camera;
        cam.position.set(0, -0.92, 1.62);
        cam.lookAt(0, -0.92, 0);
      `
    },
    {
      name: 'comp_legs_rear',
      code: `
        scene.setRobotYaw(0, false);
        ${isolateLegs}
        const cam = scene.cameraManager.camera;
        cam.position.set(0, -0.92, -1.62);
        cam.lookAt(0, -0.92, 0);
      `
    },
    {
      name: 'comp_legs_side_left',
      code: `
        scene.setRobotYaw(0, false);
        ${isolateLegs}
        const cam = scene.cameraManager.camera;
        cam.position.set(-1.62, -0.92, 0);
        cam.lookAt(0, -0.92, 0);
      `
    },
    {
      name: 'comp_legs_side_right',
      code: `
        scene.setRobotYaw(0, false);
        ${isolateLegs}
        const cam = scene.cameraManager.camera;
        cam.position.set(1.62, -0.92, 0);
        cam.lookAt(0, -0.92, 0);
      `
    },

    // 2. Technical detail callouts matching Reference Insets
    {
      name: 'comp_detail_knee_lateral',
      code: `
        scene.setRobotYaw(0, false);
        ${isolateLegs}
        const cam = scene.cameraManager.camera;
        const wp = scene.cameraManager.target;
        scene.robotNodes.leftLegNodes.knee.lateralDisc.getWorldPosition(wp);
        cam.position.set(wp.x - 0.38, wp.y, wp.z);
        cam.lookAt(wp.x, wp.y, wp.z);
      `
    },
    {
      name: 'comp_detail_thigh_lateral',
      code: `
        scene.setRobotYaw(0, false);
        ${isolateLegs}
        const cam = scene.cameraManager.camera;
        const wp = scene.cameraManager.target;
        scene.robotNodes.leftLegNodes.thigh.lateralArmor.getWorldPosition(wp);
        cam.position.set(wp.x - 0.48, wp.y, wp.z);
        cam.lookAt(wp.x, wp.y, wp.z);
      `
    },
    {
      name: 'comp_detail_calf_rear',
      code: `
        scene.setRobotYaw(0, false);
        ${isolateLegs}
        const cam = scene.cameraManager.camera;
        const wp = scene.cameraManager.target;
        scene.robotNodes.leftLegNodes.shin.posteriorCalfArmor.getWorldPosition(wp);
        cam.position.set(wp.x, wp.y, wp.z - 0.48);
        cam.lookAt(wp.x, wp.y, wp.z);
      `
    },
    {
      name: 'comp_detail_ankle_lateral',
      code: `
        scene.setRobotYaw(0, false);
        ${isolateLegs}
        const cam = scene.cameraManager.camera;
        const wp = scene.cameraManager.target;
        scene.robotNodes.leftLegNodes.ankle.malleolusLateral.getWorldPosition(wp);
        cam.position.set(wp.x - 0.36, wp.y, wp.z);
        cam.lookAt(wp.x, wp.y, wp.z);
      `
    },
    {
      name: 'comp_detail_foot_lateral',
      code: `
        scene.setRobotYaw(0, false);
        ${isolateLegs}
        const cam = scene.cameraManager.camera;
        const wp = scene.cameraManager.target;
        scene.robotNodes.leftLegNodes.foot.soleChassis.getWorldPosition(wp);
        cam.position.set(wp.x - 0.40, wp.y + 0.08, wp.z + 0.02);
        cam.lookAt(wp.x, wp.y + 0.03, wp.z + 0.02);
      `
    },

    // 3. Full-body restores
    {
      name: 'comp_fullbody_side_left',
      code: `
        scene.setRobotYaw(0, false);
        ${restoreFullbody}
        if (scene.robotNodes.leftArmNodes?.shoulder?.armPivot) {
          scene.robotNodes.leftArmNodes.shoulder.armPivot.rotation.x = 0.28;
        }
        if (scene.robotNodes.rightArmNodes?.shoulder?.armPivot) {
          scene.robotNodes.rightArmNodes.shoulder.armPivot.rotation.x = 0.28;
        }
        const cam = scene.cameraManager.camera;
        cam.position.set(-2.90, -0.45, 0);
        cam.lookAt(0, -0.45, 0);
      `
    },
    {
      name: 'comp_fullbody_side_right',
      code: `
        scene.setRobotYaw(0, false);
        ${restoreFullbody}
        if (scene.robotNodes.leftArmNodes?.shoulder?.armPivot) {
          scene.robotNodes.leftArmNodes.shoulder.armPivot.rotation.x = 0.28;
        }
        if (scene.robotNodes.rightArmNodes?.shoulder?.armPivot) {
          scene.robotNodes.rightArmNodes.shoulder.armPivot.rotation.x = 0.28;
        }
        const cam = scene.cameraManager.camera;
        cam.position.set(2.90, -0.45, 0);
        cam.lookAt(0, -0.45, 0);
      `
    },
    {
      name: 'comp_fullbody_front',
      code: `
        scene.setRobotYaw(0, false);
        ${restoreFullbody}
        if (scene.robotNodes.leftArmNodes?.shoulder?.armPivot) {
          scene.robotNodes.leftArmNodes.shoulder.armPivot.rotation.x = 0;
        }
        if (scene.robotNodes.rightArmNodes?.shoulder?.armPivot) {
          scene.robotNodes.rightArmNodes.shoulder.armPivot.rotation.x = 0;
        }
        const cam = scene.cameraManager.camera;
        cam.position.set(0, -0.40, 2.90);
        cam.lookAt(0, -0.40, 0);
      `
    },
    {
      name: 'comp_fullbody_rear',
      code: `
        scene.setRobotYaw(0, false);
        ${restoreFullbody}
        if (scene.robotNodes.leftArmNodes?.shoulder?.armPivot) {
          scene.robotNodes.leftArmNodes.shoulder.armPivot.rotation.x = 0;
        }
        if (scene.robotNodes.rightArmNodes?.shoulder?.armPivot) {
          scene.robotNodes.rightArmNodes.shoulder.armPivot.rotation.x = 0;
        }
        const cam = scene.cameraManager.camera;
        cam.position.set(0, -0.40, -2.90);
        cam.lookAt(0, -0.40, 0);
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
    await sleep(200);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, `${s.name}.png`), Buffer.from(shot.data, 'base64'));
    console.log(`Saved: ${s.name}.png`);
  }

  // Restore everything cleanly
  await send('Runtime.evaluate', {
    expression: `
      ${restoreFullbody}
      if (scene.robotNodes.leftArmNodes?.shoulder?.armPivot) {
        scene.robotNodes.leftArmNodes.shoulder.armPivot.rotation.x = 0;
      }
      if (scene.robotNodes.rightArmNodes?.shoulder?.armPivot) {
        scene.robotNodes.rightArmNodes.shoulder.armPivot.rotation.x = 0;
      }
      window.__robotScene.cameraManager.update = () => true;
      if (window.__robotScene.setMouseTrackingEnabled) window.__robotScene.setMouseTrackingEnabled(true);
      true;
    `,
    returnByValue: true
  });

  ws.close();
  chromeProc.kill();
  console.log('All comparison captures completed successfully!');
}

main().catch(console.error);

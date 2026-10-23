import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9245;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_eval_' + Date.now());
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tmpDir}`,
    '--window-size=1280,960',
    '--no-sandbox',
    '--disable-gpu-watchdog',
    '--enable-webgl',
    '--use-gl=angle',
    'http://localhost:5180/'
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

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const pending = new Map();
  ws.onmessage = (e) => {
    const d = JSON.parse(e.data);
    if (d.id && pending.has(d.id)) {
      pending.get(d.id)(d.result || d.error);
    }
  };
  function send(method, params = {}) {
    return new Promise(r => {
      const cur = id++;
      pending.set(cur, r);
      ws.send(JSON.stringify({ id: cur, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await sleep(2500);

  const res = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const scene = window.__robotScene;
        const ctrl = scene.controller;
        return {
          hasScene: !!scene,
          hasController: !!ctrl,
          hasLookController: !!(ctrl && ctrl.lookController),
          headName: scene.robotNodes.head.name,
          headRot: {
            x: scene.robotNodes.head.rotation.x,
            y: scene.robotNodes.head.rotation.y,
            z: scene.robotNodes.head.rotation.z,
          },
          neckRot: {
            x: scene.robotNodes.neck.rotation.x,
            y: scene.robotNodes.neck.rotation.y,
            z: scene.robotNodes.neck.rotation.z,
          }
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Browser state:', JSON.stringify(res.result.value, null, 2));

  // Now test modifying head.rotation directly:
  const setRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const scene = window.__robotScene;
        // Check what sets head.rotation every frame
        // Let's hook controller.update
        const oldUpdate = scene.controller.update.bind(scene.controller);
        scene.controller.update = function(dt) {
          oldUpdate(dt);
          this.nodes.head.rotation.y = 0.5; // ~28.6 degrees
          this.nodes.neck.rotation.y = 0.15;
        };
        return 'hooked';
      })()
    `,
    returnByValue: true
  });
  console.log('Hook result:', setRes.result.value);

  await sleep(500);

  const afterRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const scene = window.__robotScene;
        return {
          headRotY: scene.robotNodes.head.rotation.y,
          neckRotY: scene.robotNodes.neck.rotation.y,
        };
      })()
    `,
    returnByValue: true
  });
  console.log('After hook state:', JSON.stringify(afterRes.result.value, null, 2));

  // Take screenshot
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('capture_adversarial_audit/test_hooked_yaw.png', Buffer.from(shot.data, 'base64'));
  console.log('Saved test_hooked_yaw.png');

  ws.close();
  chromeProc.kill();
}

main().catch(console.error);

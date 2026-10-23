import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9245;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const outDir = path.resolve('capture_animation');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_anim_' + Date.now());
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

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

  if (!pageTarget?.webSocketDebuggerUrl) {
    chromeProc.kill();
    throw new Error('Failed to connect to Chrome debugging target');
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

  for (let i = 0; i < 40; i++) {
    await sleep(250);
    const evalRes = await send('Runtime.evaluate', {
      expression: 'Boolean(window.__robotScene && window.__robotScene.isReady)',
      returnByValue: true
    });
    if (evalRes?.result?.value) break;
  }
  await sleep(1000);

  // Hide UI overlays
  await send('Runtime.evaluate', {
    expression: `
      document.querySelectorAll('.fixed, .absolute').forEach(el => {
        if (!el.querySelector('canvas') && !el.tagName.toLowerCase().includes('canvas')) {
          el.style.display = 'none';
        }
      });
      true;
    `,
    returnByValue: true
  });

  // Focus camera close-up on head and neck
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const scene = window.__robotScene;
        scene.setRobotYaw(0, false);
        scene.cameraManager.baseTargetY = 0.34;
        scene.cameraManager.setZoom(0.38);
        scene.cameraManager.update(10.0);
      })()
    `,
    returnByValue: true
  });
  await sleep(500);

  const testPoses = [
    { name: 'center', clientX: 640, clientY: 220 }, // right at face
    { name: 'top_left', clientX: 100, clientY: 50 },
    { name: 'top_right', clientX: 1180, clientY: 50 },
    { name: 'bottom_left', clientX: 100, clientY: 900 },
    { name: 'bottom_right', clientX: 1180, clientY: 900 },
    { name: 'far_left', clientX: 20, clientY: 220 },
    { name: 'far_right', clientX: 1260, clientY: 220 },
  ];

  for (const pose of testPoses) {
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const ev = new PointerEvent('pointermove', {
            clientX: ${pose.clientX},
            clientY: ${pose.clientY},
            pointerType: 'mouse',
            bubbles: true
          });
          window.dispatchEvent(ev);
          return true;
        })()
      `,
      returnByValue: true
    });

    // Let the spring dampening and animation loop settle
    await sleep(700);

    // Read kinematics telemetry
    const telemetry = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const scene = window.__robotScene;
          const nodes = scene.robotNodes;
          return {
            headRot: {
              pitch: Number((nodes.head.rotation.x * 180 / Math.PI).toFixed(2)) + '°',
              yaw: Number((nodes.head.rotation.y * 180 / Math.PI).toFixed(2)) + '°',
              roll: Number((nodes.head.rotation.z * 180 / Math.PI).toFixed(2)) + '°',
            },
            neckRot: {
              pitch: Number((nodes.neck.rotation.x * 180 / Math.PI).toFixed(2)) + '°',
              yaw: Number((nodes.neck.rotation.y * 180 / Math.PI).toFixed(2)) + '°',
            },
            headPos: {
              x: Number(nodes.head.position.x.toFixed(4)),
              y: Number(nodes.head.position.y.toFixed(4)),
              z: Number(nodes.head.position.z.toFixed(4)),
            }
          };
        })()
      `,
      returnByValue: true
    });

    console.log(`Pose ${pose.name}:`, JSON.stringify(telemetry.result?.value));

    // Capture screenshot
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, `${pose.name}.png`), Buffer.from(shot.data, 'base64'));
  }

  ws.close();
  chromeProc.kill();
}

main().catch(console.error);

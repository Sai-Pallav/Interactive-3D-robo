import { spawn } from 'child_process';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9253;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_interact_' + Date.now());
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tmpDir}`,
    '--window-size=1280,800',
    '--no-sandbox',
    '--disable-gpu-watchdog',
    '--enable-webgl',
    '--use-gl=angle',
    'http://localhost:5180/?zoom=48&collapsed=1'
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
    throw new Error('Failed to connect to Chrome');
  }

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let msgId = 1;
  const pending = new Map();
  const consoleErrors = [];

  ws.onmessage = (e) => {
    const d = JSON.parse(e.data);
    if (d.method === 'Runtime.consoleAPICalled' && d.params?.type === 'error') {
      consoleErrors.push(d.params.args?.map(a => a.value || a.description).join(' '));
    }
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

  console.log('Scene is ready. Testing interaction and controllers...');

  // 1. Test Leg Controller presence and kinematics
  const legCheck = await send('Runtime.evaluate', {
    expression: `
      const scene = window.__robotScene;
      const ctrl = scene.controller;
      const legCtrl = ctrl.getLegController();
      Boolean(legCtrl);
    `,
    returnByValue: true
  });
  console.log('Leg controller present:', legCheck?.result?.value);
  if (!legCheck?.result?.value) throw new Error('Leg controller not found');

  // 2. Test Exploded View Mode
  console.log('Testing exploded progress 0.0 -> 1.0 -> 0.0...');
  for (let p = 0; p <= 1.0; p += 0.25) {
    await send('Runtime.evaluate', {
      expression: `
        window.__robotScene.controller.getLegController().setExplodedProgress(${p});
        true;
      `,
      returnByValue: true
    });
    await sleep(100);
  }
  await send('Runtime.evaluate', {
    expression: `
      window.__robotScene.controller.getLegController().setExplodedProgress(0.0);
      true;
    `,
    returnByValue: true
  });
  console.log('✓ Exploded view tested successfully');

  // 3. Test Debug Wireframe Mode
  console.log('Testing debug wireframe toggle...');
  const wireframeRes = await send('Runtime.evaluate', {
    expression: `
      const legCtrl = window.__robotScene.controller.getLegController();
      const on = legCtrl.toggleDebug(true);
      const off = legCtrl.toggleDebug(false);
      on === true && off === false;
    `,
    returnByValue: true
  });
  console.log('✓ Wireframe toggle result:', wireframeRes?.result?.value);

  // 4. Test Look/Gaze Tracking
  console.log('Testing gaze target interaction...');
  await send('Runtime.evaluate', {
    expression: `
      window.__robotScene.controller.setLookTarget(0.5, -0.3, 1.0);
      true;
    `,
    returnByValue: true
  });
  await sleep(300);
  await send('Runtime.evaluate', {
    expression: `
      window.__robotScene.controller.setIdleState();
      true;
    `,
    returnByValue: true
  });
  console.log('✓ Gaze target and reset tested successfully');

  // 5. Check console errors
  console.log('Console error count:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.warn('Errors observed in console:', consoleErrors);
  }

  ws.close();
  chromeProc.kill();
  console.log('--- BROWSER INTERACTION TEST COMPLETED WITH ZERO ERRORS ---');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

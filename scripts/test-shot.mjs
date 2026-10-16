import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9245;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function test() {
  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_shot_' + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tmpDir}`,
    '--window-size=1280,720',
    '--no-sandbox',
    '--no-first-run',
    '--disable-gpu-watchdog',
    '--enable-webgl',
    '--use-gl=angle',
    'http://localhost:5180/'
  ]);

  let targets = null;
  for (let i = 0; i < 30; i++) {
    await sleep(300);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      targets = await res.json();
      if (targets && targets.length > 0 && targets[0].webSocketDebuggerUrl) break;
    } catch (e) {}
  }

  if (!targets?.[0]?.webSocketDebuggerUrl) {
    chromeProc.kill();
    throw new Error('No debugger target');
  }

  const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let msgId = 1;
  const pending = new Map();
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');

  console.log('Waiting for ready...');
  let isReady = false;
  for (let i = 0; i < 60; i++) {
    await sleep(300);
    const res = await send('Runtime.evaluate', {
      expression: 'Boolean(window.__robotScene && window.__robotScene.isReady)',
      returnByValue: true
    });
    if (res?.result?.value) {
      console.log('Ready on attempt', i + 1);
      isReady = true;
      break;
    }
  }

  if (!isReady) {
    throw new Error('Timed out waiting for robotScene');
  }

  await sleep(1000);
  console.log('Setting yaw...');
  const yawRes = await send('Runtime.evaluate', {
    expression: 'window.__robotScene.setRobotYaw(Math.PI, false); true;',
    returnByValue: true
  });
  console.log('Yaw res:', yawRes);

  await sleep(500);
  console.log('Capturing screenshot...');
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  console.log('Shot received, size:', shot.data?.length);
  const absPath = path.resolve('capture_output/test_rear_view.png');
  console.log('Writing to absPath:', absPath, 'cwd:', process.cwd());
  fs.writeFileSync(absPath, Buffer.from(shot.data, 'base64'));
  console.log('Saved, exists now?', fs.existsSync(absPath));

  ws.close();
  chromeProc.kill();
}

test().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

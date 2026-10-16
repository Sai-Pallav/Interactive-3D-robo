import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9242;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const outDir = path.resolve('capture_output');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const tests = [
  { name: 'angle_straight_rear', url: 'http://localhost:5180/?yaw=180&zoom=100&collapsed=1' },
  { name: 'angle_rear_left_34', url: 'http://localhost:5180/?yaw=135&zoom=100&collapsed=1' },
  { name: 'angle_rear_right_34', url: 'http://localhost:5180/?yaw=-135&zoom=100&collapsed=1' },
  { name: 'angle_default_front', url: 'http://localhost:5180/?yaw=-10&zoom=100&collapsed=1' },
  { name: 'angle_left_side', url: 'http://localhost:5180/?yaw=90&zoom=100&collapsed=1' },
  { name: 'angle_right_side', url: 'http://localhost:5180/?yaw=-90&zoom=100&collapsed=1' }
];

async function captureUrl(name, url) {
  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_ang_' + Date.now() + '_' + Math.random().toString(36).slice(2));
  fs.mkdirSync(tmpDir, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tmpDir}`,
    '--window-size=1280,720',
    '--no-sandbox',
    '--disable-gpu-watchdog',
    '--enable-webgl',
    '--use-gl=angle',
    url
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
    throw new Error('Failed to connect to Chrome on ' + url);
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

  // Wait for robotScene ready
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    const evalRes = await send('Runtime.evaluate', {
      expression: 'Boolean(window.__robotScene && window.__robotScene.isReady)',
      returnByValue: true
    });
    if (evalRes?.result?.value) break;
  }

  // Let scene settle and render
  await sleep(1000);

  const shotRes = await send('Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(shotRes.data, 'base64');
  const filePath = path.join(outDir, `${name}.png`);
  fs.writeFileSync(filePath, buffer);
  console.log(`Saved screenshot: ${filePath} (${buffer.length} bytes)`);

  ws.close();
  chromeProc.kill();
  await sleep(400);
}

async function main() {
  for (const t of tests) {
    console.log(`Capturing ${t.name} from ${t.url}...`);
    await captureUrl(t.name, t.url);
  }
  console.log('All angle captures complete!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

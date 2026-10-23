import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9245;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_wp_' + Date.now());
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
  await sleep(500);

  const evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const scene = window.__robotScene;
      if (!scene) return null;
      const nodes = scene.robotNodes;
      const getWP = (obj) => {
        if (!obj) return null;
        obj.updateWorldMatrix(true, false);
        const e = obj.matrixWorld.elements;
        return { x: Number(e[12].toFixed(4)), y: Number(e[13].toFixed(4)), z: Number(e[14].toFixed(4)) };
      };
      return {
        neck: getWP(nodes.neck),
        head: getWP(nodes.head),
        leftSideModule: getWP(nodes.leftSideModule?.group),
        rightSideModule: getWP(nodes.rightSideModule?.group),
        innerSkull: getWP(nodes.head?.getObjectByName('InnerSkullCore')),
        jawNeckSocket: getWP(nodes.head?.getObjectByName('JawNeckSocketGorget')),
        cervicalConnector: getWP(nodes.neck?.getObjectByName('NeckCervicalConnector')),
        neckRing04: getWP(nodes.neck?.getObjectByName('NeckRing04')),
        neckRing01: getWP(nodes.neck?.getObjectByName('NeckRing01')),
        collar: getWP(nodes.torsoNodes?.upperTorsoFrame?.group?.getObjectByName('NeckCollar')),
        headLocal: { x: Number(nodes.head.position.x.toFixed(4)), y: Number(nodes.head.position.y.toFixed(4)), z: Number(nodes.head.position.z.toFixed(4)) },
        neckLocal: { x: Number(nodes.neck.position.x.toFixed(4)), y: Number(nodes.neck.position.y.toFixed(4)), z: Number(nodes.neck.position.z.toFixed(4)) },
      };
    })()`,
    returnByValue: true
  });
  console.log('evalRes:', evalRes);
  if (evalRes?.exceptionDetails) {
    console.error('Eval error:', evalRes.exceptionDetails);
  }
  console.log('World Positions:\n', JSON.stringify(evalRes?.result?.value || evalRes, null, 2));

  ws.close();
  chromeProc.kill();
}

main().catch(console.error);

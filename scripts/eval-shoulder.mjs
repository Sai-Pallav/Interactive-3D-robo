import { spawn } from 'child_process';
import path from 'path';

async function main() {
  const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const PORT = 9269;
  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_eval_' + Date.now());

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tmpDir}`,
    '--no-sandbox',
    '--disable-gpu-watchdog',
    '--enable-webgl',
    'http://localhost:5180/?zoom=48&collapsed=1'
  ]);

  let target = null;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = await res.json();
      target = targets.find(t => t.type === 'page' && t.url.includes('5180'));
      if (target?.webSocketDebuggerUrl) break;
    } catch (e) {}
  }

  if (!target?.webSocketDebuggerUrl) {
    chromeProc.kill();
    throw new Error('Chrome target not found');
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let msgId = 1;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = msgId++;
    const handler = (e) => {
      const d = JSON.parse(e.data);
      if (d.id === id) {
        ws.removeEventListener('message', handler);
        if (d.error) reject(d.error);
        else resolve(d.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');

  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 250));
    const chk = await send('Runtime.evaluate', {
      expression: 'Boolean(window.__robotScene && window.__robotScene.isReady)',
      returnByValue: true
    });
    if (chk?.result?.value) break;
  }

  const evalRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        try {
          const scene = window.__robotScene;
          const root = scene.scene;
          
          // Helper to compute box without global THREE
          function computeBox(obj) {
            let minX = Infinity, minY = Infinity, minZ = Infinity;
            let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
            obj.updateMatrixWorld(true);
            obj.traverse(child => {
              if (child.isMesh && child.geometry) {
                const pos = child.geometry.attributes.position;
                if (!pos) return;
                for (let i = 0; i < pos.count; i++) {
                  const x = pos.getX(i);
                  const y = pos.getY(i);
                  const z = pos.getZ(i);
                  // Apply world matrix
                  const e = child.matrixWorld.elements;
                  const wx = e[0] * x + e[4] * y + e[8] * z + e[12];
                  const wy = e[1] * x + e[5] * y + e[9] * z + e[13];
                  const wz = e[2] * x + e[6] * y + e[10] * z + e[14];
                  if (wx < minX) minX = wx; if (wx > maxX) maxX = wx;
                  if (wy < minY) minY = wy; if (wy > maxY) maxY = wy;
                  if (wz < minZ) minZ = wz; if (wz > maxZ) maxZ = wz;
                }
              }
            });
            if (minX === Infinity) return null;
            return {
              min: [minX.toFixed(4), minY.toFixed(4), minZ.toFixed(4)],
              max: [maxX.toFixed(4), maxY.toFixed(4), maxZ.toFixed(4)],
              size: [(maxX - minX).toFixed(4), (maxY - minY).toFixed(4), (maxZ - minZ).toFixed(4)],
              center: [((minX + maxX)/2).toFixed(4), ((minY + maxY)/2).toFixed(4), ((minZ + maxZ)/2).toFixed(4)]
            };
          }

          const targets = [
            'RightUpperShoulderHood',
            'RightUpperShoulderShell',
            'BearingHousingGroup_R',
            'ShoulderEnergyRing_R',
            'RightShoulderSocketReceiver',
            'RightUpperArmAssembly',
            'RightShoulderArmAdapter',
            'RightArmMount'
          ];
          const out = {};
          targets.forEach(tName => {
            const obj = scene.scene.getObjectByName(tName);
            if (!obj) { out[tName] = 'NOT FOUND'; return; }
            out[tName] = computeBox(obj);
          });
          return out;
        } catch (e) {
          return { error: e.toString() };
        }
      })()
    `,
    returnByValue: true
  });

  console.log('MEASUREMENTS:\n', JSON.stringify(evalRes?.result?.value, null, 2));

  ws.close();
  chromeProc.kill();
}

main().catch(console.error);

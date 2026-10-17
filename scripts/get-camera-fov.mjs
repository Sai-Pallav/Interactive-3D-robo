import { spawn } from 'child_process';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9265;

async function main() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
  const targets = await res.json();
  const pageTarget = targets?.find(t => t.type === 'page');
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `
        (() => {
          const cam = window.__robotScene.cameraManager.camera;
          return { fov: cam.fov, near: cam.near, far: cam.far, aspect: cam.aspect };
        })()
      `,
      returnByValue: true
    }
  }));

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Camera properties:', data.result?.result?.value);
    ws.close();
    process.exit(0);
  };
}
main();

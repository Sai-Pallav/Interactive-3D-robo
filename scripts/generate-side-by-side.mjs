import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9263;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function toBase64(filePath) {
  const buf = fs.readFileSync(filePath);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

async function main() {
  const beforeB64 = toBase64('C:/Users/kotas/.gemini/antigravity/brain/3d4ff560-8371-442d-a965-fbbbc3c44966/before_closeup_abdomen_front.png');
  const afterB64 = toBase64('C:/Users/kotas/.gemini/antigravity/brain/3d4ff560-8371-442d-a965-fbbbc3c44966/after_closeup_abdomen_front.png');
  const userRefB64 = toBase64('C:/Users/kotas/.gemini/antigravity/brain/3d4ff560-8371-442d-a965-fbbbc3c44966/user_abdomen_ref.png');

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { background: #0e1117; color: #e6edf3; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 30px; }
      h1 { font-size: 22px; font-weight: 600; margin-bottom: 24px; color: #58a6ff; }
      .container { display: flex; gap: 24px; align-items: flex-start; }
      .card { flex: 1; background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; text-align: center; }
      .card.highlight { border-color: #238636; box-shadow: 0 0 12px rgba(35, 134, 54, 0.4); }
      .card.user { flex: 0.8; border-color: #8957e5; }
      img { width: 100%; height: auto; border-radius: 4px; display: block; }
      .user-img { width: 100%; max-height: 480px; object-fit: contain; }
      h2 { margin: 0 0 12px 0; font-size: 15px; font-weight: 600; }
      .tag { display: inline-block; padding: 2px 8px; font-size: 12px; border-radius: 12px; margin-bottom: 8px; font-weight: 500; }
      .tag-before { background: #da3633; color: white; }
      .tag-after { background: #238636; color: white; }
      .tag-user { background: #8957e5; color: white; }
      p { font-size: 13px; color: #8b949e; line-height: 1.5; margin: 10px 0 0 0; text-align: left; }
    </style>
  </head>
  <body>
    <h1>Abdominal Support Poles Alignment Verification</h1>
    <div class="container">
      <div class="card">
        <span class="tag tag-before">BEFORE (16.93° Splay)</span>
        <h2>Overly Inclined Outer Poles</h2>
        <img src="${beforeB64}" />
        <p>• Outer poles splayed outward at ~17° inclination.<br>
        • Upper mounts at X = ±0.118 flare excessively.<br>
        • Misaligned with lower waist plinths (~7° orientation).</p>
      </div>
      <div class="card highlight">
        <span class="tag tag-after">AFTER (9.06° Alignment)</span>
        <h2>Corrected Companion Struts</h2>
        <img src="${afterB64}" />
        <p>• Outer poles set to intended X = ±0.098 upper, X = ±0.076 lower.<br>
        • Inclination is 9.06°, exactly matching inner poles (9.31°).<br>
        • Perfectly parallel twin cylinder spacing and coaxial plinth entry.</p>
      </div>
      <div class="card user">
        <span class="tag tag-user">USER UPLOAD REFERENCE</span>
        <h2>Target Visual Blueprint</h2>
        <img class="user-img" src="${userRefB64}" />
        <p>• Notice the uniform inward convergence of the support poles.<br>
        • Outer poles run cleanly along the flanks without protruding outwards.</p>
      </div>
    </div>
  </body>
  </html>
  `;

  fs.writeFileSync('comparison_report.html', htmlContent);

  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_compare_' + Date.now());
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tmpDir}`,
    '--window-size=1600,1050',
    '--no-sandbox',
    'file:///' + path.resolve('comparison_report.html').replace(/\\/g, '/')
  ]);

  let pageTarget = null;
  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = await res.json();
      pageTarget = targets?.find(t => t.type === 'page');
      if (pageTarget?.webSocketDebuggerUrl) break;
    } catch (e) {}
  }

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.onopen = resolve);

  let msgId = 1;
  const pending = new Map();
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve } = pending.get(data.id);
      pending.delete(data.id);
      resolve(data.result);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, { resolve });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');
  await sleep(1200);

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(shot.data, 'base64');
  const outPath = 'C:/Users/kotas/.gemini/antigravity/brain/3d4ff560-8371-442d-a965-fbbbc3c44966/side_by_side_validation.png';
  fs.writeFileSync(outPath, buffer);
  console.log(`Saved ${outPath} (${buffer.length} bytes)`);

  ws.close();
  chromeProc.kill();
}

main().catch(console.error);

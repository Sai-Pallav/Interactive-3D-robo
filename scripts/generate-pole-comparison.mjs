import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9268;

function toBase64(filePath) {
  const buf = fs.readFileSync(filePath);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const beforeFront = toBase64('capture_abdomen_before/fixed_abdomen_front.png');
  const afterFront = toBase64('capture_abdomen_after/fixed_abdomen_front.png');
  const beforeCloseup = toBase64('capture_abdomen_before/fixed_abdomen_closeup_front.png');
  const afterCloseup = toBase64('capture_abdomen_after/fixed_abdomen_closeup_front.png');
  const before3Q = toBase64('capture_abdomen_before/fixed_abdomen_3quarter_right.png');
  const after3Q = toBase64('capture_abdomen_after/fixed_abdomen_3quarter_right.png');
  const beforeRear = toBase64('capture_abdomen_before/fixed_abdomen_rear.png');
  const afterRear = toBase64('capture_abdomen_after/fixed_abdomen_rear.png');

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { background: #0b0f19; color: #e6edf3; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 30px; }
      h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #38bdf8; }
      p.subtitle { color: #94a3b8; font-size: 14px; margin-top: 0; margin-bottom: 24px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
      .section-title { font-size: 18px; font-weight: 600; margin: 24px 0 12px 0; color: #a855f7; border-bottom: 1px solid #1e293b; padding-bottom: 6px; }
      .card { background: #111827; border: 1px solid #1f2937; border-radius: 8px; padding: 14px; text-align: center; }
      .card.after { border-color: #10b981; box-shadow: 0 0 14px rgba(16, 185, 129, 0.25); }
      .tag { display: inline-block; padding: 3px 10px; font-size: 11px; border-radius: 12px; margin-bottom: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
      .tag-before { background: #ef4444; color: white; }
      .tag-after { background: #10b981; color: white; }
      img { width: 100%; height: auto; border-radius: 6px; display: block; }
      .caption { font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 10px 0 0 0; text-align: left; }
      .badge { font-family: monospace; background: #1e293b; padding: 2px 6px; border-radius: 4px; color: #38bdf8; font-size: 11px; }
    </style>
  </head>
  <body>
    <h1>Abdominal Support Pole Dimensions Standardization</h1>
    <p.subtitle>All 6 Support Poles Standardized to Common Slim Specification (Radius: 6.8 mm, Rod: 3.6 mm)</p>

    <div class="section-title">1. Full Frontal Abdominal Overview</div>
    <div class="grid">
      <div class="card">
        <span class="tag tag-before">BEFORE — Bulky Side Poles</span>
        <img src="${beforeFront}" />
        <div class="caption">
          • Outer barrel radius: <span class="badge">0.0118</span> (23.6 mm dia), rod: <span class="badge">0.0064</span><br>
          • Inner barrel radius: <span class="badge">0.0095</span> (19.0 mm dia), rod: <span class="badge">0.0052</span><br>
          • Heavy, overcrowded appearance crowding vertebral facets.
        </div>
      </div>
      <div class="card after">
        <span class="tag tag-after">AFTER — Standardized Slim Poles</span>
        <img src="${afterFront}" />
        <div class="caption">
          • All poles barrel radius: <span class="badge">0.0068</span> (13.6 mm dia), rod: <span class="badge">0.0036</span> (7.2 mm dia)<br>
          • Identical thickness across outer, inner, and rear poles.<br>
          • Balanced clearance (+8.8 mm) with sleek humanoid proportions.
        </div>
      </div>
    </div>

    <div class="section-title">2. Front Closeup Detail</div>
    <div class="grid">
      <div class="card">
        <span class="tag tag-before">BEFORE — Thick Cylinders & Mismatched Plinths</span>
        <img src="${beforeCloseup}" />
        <div class="caption">
          • Bulky gland collars and oversized uniball housings (r=0.0139).<br>
          • Mismatched clevis widths (outer: 22mm, inner: 16mm).
        </div>
      </div>
      <div class="card after">
        <span class="tag tag-after">AFTER — Unified Precision Actuators & Clevises</span>
        <img src="${afterCloseup}" />
        <div class="caption">
          • Standardized slim gland collars and uniballs (housing r=0.0080 fits 16mm clevis).<br>
          • Unified clevis width (16mm) and plinth width (14mm) across all mounts.
        </div>
      </div>
    </div>

    <div class="section-title">3. 3-Quarter Oblique Angle</div>
    <div class="grid">
      <div class="card">
        <span class="tag tag-before">BEFORE — Oblique Clutter</span>
        <img src="${before3Q}" />
        <div class="caption">
          • Disproportionate visual weight between front and rear struts.
        </div>
      </div>
      <div class="card after">
        <span class="tag tag-after">AFTER — Complete Circumferential Harmony</span>
        <img src="${after3Q}" />
        <div class="caption">
          • All visible poles share consistent cross-section and mechanical rhythm.<br>
          • Retains parallel inclination and precise mounting centerlines.
        </div>
      </div>
    </div>

    <div class="section-title">4. Posterior (Rear) View — Preserved Divergence & Balanced Thickness</div>
    <div class="grid">
      <div class="card">
        <span class="tag tag-before">BEFORE — Rear Poles Appeared Undersized</span>
        <img src="${beforeRear}" />
        <div class="caption">
          • Rear poles (r=0.0068) appeared frail against bulky side poles (r=0.0118).
        </div>
      </div>
      <div class="card after">
        <span class="tag tag-after">AFTER — Perfectly Balanced Rear Assembly</span>
        <img src="${afterRear}" />
        <div class="caption">
          • Rear poles retain exact spacing (160mm top, 112mm bot) & 9.09° outward divergence.<br>
          • No longer appear undersized; now harmonize with standardized 6.8mm side poles.
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  fs.writeFileSync('pole_standardization_comparison.html', htmlContent);
  console.log('Comparison HTML saved to pole_standardization_comparison.html');

  // Launch chrome to screenshot comparison page
  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_compare_' + Date.now());
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tmpDir}`,
    '--window-size=1600,2400',
    '--no-sandbox',
    '--disable-gpu-watchdog',
    path.resolve('pole_standardization_comparison.html')
  ]);

  let pageTarget = null;
  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = await res.json();
      pageTarget = targets?.find(t => t.type === 'page' && t.url.includes('pole_standardization_comparison')) || targets?.find(t => t.type === 'page');
      if (pageTarget?.webSocketDebuggerUrl) break;
    } catch (e) {}
  }

  if (pageTarget?.webSocketDebuggerUrl) {
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

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

    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

    await send('Page.enable');
    await sleep(1000);
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    fs.writeFileSync('pole_standardization_comparison.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved pole_standardization_comparison.png');
    ws.close();
  }

  chromeProc.kill();
}

main().catch(console.error);

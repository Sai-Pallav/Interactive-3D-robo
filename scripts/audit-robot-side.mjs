import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9246;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const tmpDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_audit_' + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });

  console.log(`Spawning Chrome on port ${PORT}...`);
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tmpDir}`,
    '--window-size=1600,1000',
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

  for (let i = 0; i < 40; i++) {
    await sleep(250);
    const evalRes = await send('Runtime.evaluate', {
      expression: 'Boolean(window.__robotScene && window.__robotScene.isReady)',
      returnByValue: true
    });
    if (evalRes?.result?.value) break;
  }

  await sleep(800);

  // Collapse bottom dock and any UI overlays for pristine captures
  await send('Runtime.evaluate', {
    expression: `
      const btn = document.querySelector('button[title*="Collapse Dock"]');
      if (btn) btn.click();
      true;
    `,
    returnByValue: true
  });
  await sleep(400);

  // Perform full scene and hierarchy audit
  const auditRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const scene = window.__robotScene;
        const root = scene.robotNodes.root;
        const THREE = window.THREE || root.children[0].children[0]?.__proto__.constructor.THREE || scene.cameraManager.camera.position.__proto__.constructor;
        
        // Compute world bounding boxes of key parts
        const nodes = scene.robotNodes;
        
        function getBox(obj) {
          if (!obj) return null;
          obj.updateMatrixWorld(true);
          const box = new (scene.cameraManager.camera.position.constructor.prototype.constructor.name === 'Vector3' ? 
            scene.cameraManager.target.clone().__proto__.constructor : 
            scene.scene.position.clone().__proto__.constructor)();
          // Use standard THREE.Box3
          // Find Box3
          let B3 = null;
          root.traverse(o => {
            if (o.geometry && !B3) {
              o.geometry.computeBoundingBox();
              B3 = o.geometry.boundingBox.constructor;
            }
          });
          const b = new B3();
          b.setFromObject(obj);
          return {
            min: { x: +b.min.x.toFixed(4), y: +b.min.y.toFixed(4), z: +b.min.z.toFixed(4) },
            max: { x: +b.max.x.toFixed(4), y: +b.max.y.toFixed(4), z: +b.max.z.toFixed(4) },
            size: {
              x: +(b.max.x - b.min.x).toFixed(4),
              y: +(b.max.y - b.min.y).toFixed(4),
              z: +(b.max.z - b.min.z).toFixed(4)
            },
            center: {
              x: +((b.min.x + b.max.x) / 2).toFixed(4),
              y: +((b.min.y + b.max.y) / 2).toFixed(4),
              z: +((b.min.z + b.max.z) / 2).toFixed(4)
            }
          };
        }

        const totalBox = getBox(root);

        const nodeKeys = Object.keys(nodes);
        const nodeBoxes = {};
        for (const k of nodeKeys) {
          if (nodes[k] && nodes[k].isObject3D) {
            nodeBoxes[k] = getBox(nodes[k]);
          }
        }

        // Get list of all named subassemblies under root
        const parts = [];
        root.traverse(child => {
          if (child.name && (child.isGroup || child.isMesh)) {
            parts.push({
              name: child.name,
              type: child.type,
              pos: { x: +child.position.x.toFixed(4), y: +child.position.y.toFixed(4), z: +child.position.z.toFixed(4) },
              rot: { x: +child.rotation.x.toFixed(4), y: +child.rotation.y.toFixed(4), z: +child.rotation.z.toFixed(4) },
              parent: child.parent?.name || 'anonymous'
            });
          }
        });

        return {
          totalBox,
          nodeBoxes,
          partsCount: parts.length
        };
      })()
    `,
    returnByValue: true
  });

  const auditData = auditRes.result.value;
  fs.writeFileSync('scripts/side_profile_audit_data.json', JSON.stringify(auditData, null, 2));
  console.log('Total Robot Bounding Box:', auditData.totalBox);

  const outDir = path.resolve('capture_output', 'side_audit_refined');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // We can position the camera precisely using direct target and distance!
  // To view full body cleanly:
  // Robot center Y is (totalBox.min.y + totalBox.max.y)/2, total height is totalBox.size.y
  const centerY = auditData.totalBox.center.y;
  const totalH = auditData.totalBox.size.y;
  console.log(`Robot Center Y: ${centerY}, Total Height: ${totalH}`);

  // Shots to take:
  const shots = [
    {
      name: '01_full_left_side_profile',
      yaw: Math.PI / 2, // 90 deg -> Left side
      camY: centerY,
      camDist: totalH * 1.6, // full height fits comfortably
      lookY: centerY
    },
    {
      name: '02_full_right_side_profile',
      yaw: -Math.PI / 2, // -90 deg -> Right side
      camY: centerY,
      camDist: totalH * 1.6,
      lookY: centerY
    },
    {
      name: '03_head_neck_left_profile',
      yaw: Math.PI / 2,
      camY: 0.65,
      camDist: 0.8,
      lookY: 0.65
    },
    {
      name: '04_head_neck_right_profile',
      yaw: -Math.PI / 2,
      camY: 0.65,
      camDist: 0.8,
      lookY: 0.65
    },
    {
      name: '05_torso_back_left_profile',
      yaw: Math.PI / 2,
      camY: 0.15,
      camDist: 1.1,
      lookY: 0.15
    },
    {
      name: '06_torso_back_right_profile',
      yaw: -Math.PI / 2,
      camY: 0.15,
      camDist: 1.1,
      lookY: 0.15
    },
    {
      name: '07_waist_pelvis_left_profile',
      yaw: Math.PI / 2,
      camY: -0.22,
      camDist: 0.9,
      lookY: -0.22
    },
    {
      name: '08_waist_pelvis_right_profile',
      yaw: -Math.PI / 2,
      camY: -0.22,
      camDist: 0.9,
      lookY: -0.22
    },
    {
      name: '09_thigh_knee_left_profile',
      yaw: Math.PI / 2,
      camY: -0.60,
      camDist: 1.1,
      lookY: -0.60
    },
    {
      name: '10_thigh_knee_right_profile',
      yaw: -Math.PI / 2,
      camY: -0.60,
      camDist: 1.1,
      lookY: -0.60
    },
    {
      name: '11_ankle_foot_left_profile',
      yaw: Math.PI / 2,
      camY: -1.18,
      camDist: 0.85,
      lookY: -1.18
    },
    {
      name: '12_ankle_foot_right_profile',
      yaw: -Math.PI / 2,
      camY: -1.18,
      camDist: 0.85,
      lookY: -1.18
    },
    {
      name: '13_full_front_view',
      yaw: 0,
      camY: centerY,
      camDist: totalH * 1.6,
      lookY: centerY
    },
    {
      name: '14_full_rear_view',
      yaw: Math.PI,
      camY: centerY,
      camDist: totalH * 1.6,
      lookY: centerY
    },
    {
      name: '15_three_quarter_front_left',
      yaw: Math.PI * 0.25,
      camY: centerY,
      camDist: totalH * 1.6,
      lookY: centerY
    },
    {
      name: '16_three_quarter_front_right',
      yaw: -Math.PI * 0.25,
      camY: centerY,
      camDist: totalH * 1.6,
      lookY: centerY
    },
    {
      name: '17_three_quarter_rear_left',
      yaw: Math.PI * 0.75,
      camY: centerY,
      camDist: totalH * 1.6,
      lookY: centerY
    },
    {
      name: '18_three_quarter_rear_right',
      yaw: -Math.PI * 0.75,
      camY: centerY,
      camDist: totalH * 1.6,
      lookY: centerY
    }
  ];

  for (const s of shots) {
    console.log(`Capturing ${s.name}...`);
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const scene = window.__robotScene;
          scene.setRobotYaw(${s.yaw}, false);
          
          // Disable camera auto-updates temporarily for exact audit shot
          const cam = scene.cameraManager.camera;
          cam.position.set(0, ${s.camY}, ${s.camDist});
          scene.cameraManager.target.set(0, ${s.lookY}, 0);
          cam.lookAt(0, ${s.lookY}, 0);
          cam.updateProjectionMatrix();

          // Force update scene
          scene.robotNodes.root.updateMatrixWorld(true);
          true;
        })()
      `,
      returnByValue: true
    });

    await sleep(600);

    const shotRes = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(shotRes.data, 'base64');
    const filePath = path.join(outDir, `${s.name}.png`);
    fs.writeFileSync(filePath, buffer);
    console.log(`Saved screenshot: ${filePath}`);
  }

  // Restore default interactive camera & capture it
  await send('Runtime.evaluate', {
    expression: `
      window.__robotScene.setRobotYaw(-10 * (Math.PI / 180), false);
      window.__robotScene.resetZoom();
      true;
    `,
    returnByValue: true
  });
  await sleep(600);
  const defShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, '19_default_interactive_view.png'), Buffer.from(defShot.data, 'base64'));
  console.log('Saved screenshot: 19_default_interactive_view.png');

  ws.close();
  chromeProc.kill();
  console.log('All side audit captures complete!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

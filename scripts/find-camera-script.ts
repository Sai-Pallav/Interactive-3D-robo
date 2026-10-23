import fs from 'fs';
import path from 'path';

function searchDir(dir: string, term: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules' && e.name !== '.git') {
      searchDir(full, term);
    } else if (e.isFile() && (e.name.endsWith('.ts') || e.name.endsWith('.js') || e.name.endsWith('.mjs') || e.name.endsWith('.json'))) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes(term)) {
        console.log(`Found "${term}" in ${full}`);
      }
    }
  }
}

searchDir('scripts', 'check_alignment');
searchDir('scripts', 'left_side_rear_lat_45');
searchDir('scripts', 'capture_camera_match');
searchDir('scripts', 'camera.position');

import fs from 'fs';

// Let's inspect scripts in the repo that took screenshots or cropped images
const rootFiles = fs.readdirSync('.');
const pngs = rootFiles.filter(f => f.endsWith('.png'));
console.log('PNG files in root:');
pngs.forEach(f => {
  const stat = fs.statSync(f);
  console.log(f.padEnd(35), stat.size, stat.mtime.toISOString());
});

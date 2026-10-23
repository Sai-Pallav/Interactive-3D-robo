import fs from 'fs';

const jsonFiles = [
  'scripts/side_profile_audit_data.json',
  'scripts/batch_candidates.json',
  'scripts/audit_mesh_list.json',
];

for (const f of jsonFiles) {
  if (fs.existsSync(f)) {
    const txt = fs.readFileSync(f, 'utf8');
    if (txt.includes('lat_45') || txt.includes('left_side')) {
      console.log(`Found in ${f}`);
    }
  }
}

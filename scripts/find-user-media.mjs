import fs from 'fs';

const p = 'C:/Users/kotas/.gemini/antigravity/brain/0416f272-e822-4248-b775-86570f15dce2/.system_generated/logs/transcript.jsonl';
const content = fs.readFileSync(p, 'utf8');
const firstLine = content.split('\n')[0];
const data = JSON.parse(firstLine);

console.log('Images in content:');
const matches = [...data.content.matchAll(/([a-zA-Z0-9_\-\.\/\\]+\.(?:png|jpg|jpeg))/gi)];
console.log(matches.map(m => m[0]));

console.log('\nAll "media_" matches:');
const mediaMatches = [...data.content.matchAll(/media_[a-zA-Z0-9_]+/gi)];
console.log([...new Set(mediaMatches.map(m => m[0]))]);

import fs from 'fs';

function getPngDims(filePath: string) {
  try {
    const buf = fs.readFileSync(filePath);
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  } catch (e: any) {
    return { error: e.message };
  }
}

console.log('check_alignment:', getPngDims('check_alignment.png'));
console.log('media 1:', getPngDims('C:/Users/kotas/.gemini/antigravity/brain/178c0e86-063b-4675-bdb8-075e2fd2cc46/.user_uploaded/media_1792581137845_3f6b6532.png'));
console.log('media 2:', getPngDims('C:/Users/kotas/.gemini/antigravity/brain/178c0e86-063b-4675-bdb8-075e2fd2cc46/.user_uploaded/media_1792581143734_a33118b3.png'));

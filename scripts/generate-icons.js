const sharp = require('sharp');
const fs = require('fs');

function createIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const entrySize = 16;
  let offset = headerSize + count * entrySize;
  
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(count, 4); // count
  
  const entries = [];
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(entrySize);
    entry.writeUInt8(item.width >= 256 ? 0 : item.width, 0);
    entry.writeUInt8(item.height >= 256 ? 0 : item.height, 1);
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(item.buffer.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset
    entries.push(entry);
    offset += item.buffer.length;
  }
  
  return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.buffer)]);
}

async function generate() {
  // 1. icon-192.png from public/icon-192.svg
  const svg192 = fs.readFileSync('public/icon-192.svg');
  await sharp(svg192).png().toFile('public/icon-192.png');
  console.log('Generated public/icon-192.png');

  // 2. icon-512.png from public/icon-512.svg
  const svg512 = fs.readFileSync('public/icon-512.svg');
  await sharp(svg512).png().toFile('public/icon-512.png');
  console.log('Generated public/icon-512.png');
  
  // 3. apple-touch-icon.png from public/icon-512.svg (180x180, transparent)
  await sharp(svg512)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');
  console.log('Generated public/apple-touch-icon.png');

  // 4. app/favicon.ico from app/icon.svg
  const svgIcon = fs.readFileSync('app/icon.svg');
  const b16 = await sharp(svgIcon).resize(16, 16).png().toBuffer();
  const b32 = await sharp(svgIcon).resize(32, 32).png().toBuffer();
  const b48 = await sharp(svgIcon).resize(48, 48).png().toBuffer();
  const ico = createIco([
    { width: 16, height: 16, buffer: b16 },
    { width: 32, height: 32, buffer: b32 },
    { width: 48, height: 48, buffer: b48 }
  ]);
  fs.writeFileSync('app/favicon.ico', ico);
  console.log('Generated app/favicon.ico');
}

generate().catch(console.error);

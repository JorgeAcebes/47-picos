const sharp = require('sharp');
const fs = require('fs');

const svgPath = 'public/icon-512.svg';
const sizes = [192, 512];

async function generate() {
  for (const size of sizes) {
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(`public/icon-${size}.png`);
    console.log(`Generated public/icon-${size}.png`);
  }
  
  // Also generate apple-touch-icon
  await sharp(svgPath)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');
  console.log('Generated public/apple-touch-icon.png');
}

generate().catch(console.error);

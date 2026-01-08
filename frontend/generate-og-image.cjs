const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'public', 'og-image.svg');
const pngPath = path.join(__dirname, 'public', 'og-image.png');

const svgContent = fs.readFileSync(svgPath, 'utf8');

sharp(Buffer.from(svgContent))
  .resize(1200, 630)
  .png()
  .toFile(pngPath)
  .then(() => {
    console.log('✅ og-image.png created successfully (1200x630)');
  })
  .catch(err => {
    console.error('Error:', err);
  });

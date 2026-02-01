const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, 'public');
const sourceImage = path.join(publicDir, 'brand/tab-logo.png');

const outputs = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-48x48.png', size: 48 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'favicon.ico', size: 32 }
];

async function generateFavicons() {
    console.log('🚀 Generating optimized favicons from new source...');

    if (!fs.existsSync(sourceImage)) {
        console.error(`❌ Source image not found: ${sourceImage}`);
        return;
    }

    for (const out of outputs) {
        const outputPath = path.join(publicDir, out.name);

        try {
            await sharp(sourceImage)
                .trim()
                .resize({
                    width: out.size,
                    height: out.size,
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .toFile(outputPath);

            console.log(`✅ Generated: ${out.name} (${out.size}x${out.size})`);
        } catch (err) {
            console.error(`❌ Error generating ${out.name}:`, err.message);
        }
    }

    console.log('✨ All favicons generated from new source!');
}

generateFavicons();

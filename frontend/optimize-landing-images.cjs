const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');

const jobs = [
    {
        input: 'illustrations/84406320_9963615.jpg',
        outputs: [
            { suffix: '-800w', width: 800, format: 'jpeg' },
            { suffix: '-1600w', width: 1600, format: 'jpeg' }
        ]
    },
    {
        input: 'mockups/dashboard-hero.png',
        outputs: [
            { suffix: '-600w', width: 600, format: 'webp' },
            { suffix: '-1200w', width: 1200, format: 'webp' },
            { suffix: '', width: null, format: 'webp' } // Original size but webp
        ]
    },
    {
        input: 'brand/owls/logo.webp',
        outputs: [
            { suffix: '-128w', width: 128, format: 'webp' }
        ]
    },
    {
        input: 'brand/owls/sticker.webp',
        outputs: [
            { suffix: '-256w', width: 256, format: 'webp' }
        ]
    }
];

async function run() {
    console.log('🚀 Starting image optimization...');

    for (const job of jobs) {
        const inputPath = path.join(publicDir, job.input);
        if (!fs.existsSync(inputPath)) {
            console.warn(`⚠️  Input not found: ${inputPath}`);
            continue;
        }

        const ext = path.extname(job.input);
        const base = job.input.slice(0, -ext.length);

        for (const out of job.outputs) {
            const outputPath = path.join(publicDir, `${base}${out.suffix}.${out.format}`);
            let pipeline = sharp(inputPath);

            if (out.width) {
                pipeline = pipeline.resize(out.width);
            }

            if (out.format === 'webp') {
                pipeline = pipeline.webp({ quality: 80, effort: 6 });
            } else if (out.format === 'jpeg') {
                pipeline = pipeline.jpeg({ quality: 80, progressive: true });
            }

            await pipeline.toFile(outputPath);
            const stats = fs.statSync(outputPath);
            console.log(`✅ Generated: ${path.relative(publicDir, outputPath)} (${(stats.size / 1024).toFixed(1)} KB)`);
        }
    }

    console.log('✨ All optimizations complete!');
}

run().catch(err => {
    console.error('❌ Error during optimization:', err);
    process.exit(1);
});

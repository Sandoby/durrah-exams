import fs from 'fs';

try {
    let rawData = fs.readFileSync('openrouter_models_utf8.json', 'utf8');
    if (rawData.startsWith('\uFEFF')) {
        rawData = rawData.slice(1);
    }
    const data = JSON.parse(rawData);
    const allFree = data.data
        .filter(m => m.id.endsWith(':free'))
        .map(m => m.id);

    console.log("All Free Models Found (" + allFree.length + "):");
    console.log(JSON.stringify(allFree, null, 2));
} catch (error) {
    console.error("Error:", error);
}

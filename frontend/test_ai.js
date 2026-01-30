// using global fetch

const key = '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';
const model = "google/gemma-3-27b-it:free";

async function test() {
    console.log("Testing OpenRouter with minimal headers...");
    try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`,
                'HTTP-Referer': 'https://durrahtutors.com',
                'X-Title': 'Durrah Tutors',
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: 'Say hello' }]
            })
        });

        console.log("Status:", res.status);
        const data = await res.json();
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error:", err);
    }
}

test();

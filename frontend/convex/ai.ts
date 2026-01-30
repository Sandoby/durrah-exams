import { v } from "convex/values";
import { action } from "./_generated/server";

const FREE_MODELS = [
    "google/gemma-3-27b-it:free",
    "meta-llama/llama-3.1-8b-instruct:free",
    "google/gemma-7b-it:free",
    "mistralai/mistral-7b-instruct:free",
];

export const generateOptions = action({
    args: {
        questionText: v.string(),
        type: v.string(),
    },
    handler: async (_, args) => {
        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "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";

        console.log("Generating options for:", args.questionText);

        const prompt = `Based on the following question text (which may contain HTML tags), generate 4 distinct, plausible options for a ${args.type} question.
One of them should be the intended correct answer, and the others should be realistic distractors.

Question: ${JSON.stringify(args.questionText)}

Return ONLY a JSON array of 4 strings reflecting the options. NO other text.`;

        let lastError = null;

        for (const modelId of FREE_MODELS) {
            try {
                console.log(`Attempting model: ${modelId}`);
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${OPENROUTER_API_KEY.trim()}`,
                    },
                    body: JSON.stringify({
                        model: modelId,
                        messages: [
                            {
                                role: "system",
                                content: "You are an educational assistant specialized in creating multiple choice options."
                            },
                            {
                                role: "user",
                                content: prompt
                            }
                        ],
                        temperature: 0.6,
                    }),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Error with ${modelId}:`, errorText);
                    lastError = errorText;
                    continue;
                }

                const data = await response.json();
                const content = data.choices?.[0]?.message?.content;

                if (!content) {
                    console.error(`Empty content with ${modelId}`);
                    continue;
                }

                let jsonStr = content.trim();
                if (jsonStr.startsWith("```json")) {
                    jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");
                } else if (jsonStr.startsWith("```")) {
                    jsonStr = jsonStr.replace(/```\n?/g, "");
                }

                try {
                    const options = JSON.parse(jsonStr);
                    if (Array.isArray(options) && options.length > 0) {
                        return options;
                    }
                } catch (e) {
                    console.error(`Invalid JSON with ${modelId}:`, content);
                    continue;
                }
            } catch (err: any) {
                console.error(`Fetch failed for ${modelId}:`, err);
                lastError = err.message;
            }
        }

        throw new Error("AI generation failed. Please try again later. Detail: " + lastError);
    },
});

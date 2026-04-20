// lib/gemini.ts
// ─────────────────────────────────────────────────────────────
// LLM API wrapper — configured for K2-Think-v2
// (OpenAI-compatible endpoint at api.k2think.ai).
// ─────────────────────────────────────────────────────────────

import OpenAI from "openai";

function getClient(): OpenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is not set. " +
      "Copy .env.example to .env.local and add your K2 API key."
    );
  }
  return new OpenAI({
    apiKey:  key,
    baseURL: "https://api.k2think.ai/v1",
  });
}

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `
You are an accessibility assistant for people with dyslexia.
Transform the user's text into a JSON object. Output ONLY the JSON — no thinking, no explanation, no markdown.

JSON shape (fill every field with real content — never use "...", "string", or placeholders):
{
  "title": "3 to 6 word title describing the text",
  "simplified_text": "The full rewritten text in simple language. Short sentences. Max 15 words each.",
  "chunked_lines": ["One short idea per item.", "5 to 12 words each.", "At least 4 items."],
  "hard_words": [
    {
      "word": "difficult word from text",
      "simple_meaning": "what it means in plain English",
      "syllables": ["syl", "la", "ble"],
      "pronunciation": "how to say it",
      "example_sentence": "A simple sentence using the word."
    }
  ],
  "reading_tips": ["Tip 1 relevant to this text.", "Tip 2.", "Tip 3."]
}

Rules:
- simplified_text must be a complete rewrite of the input — never empty, never "..."
- chunked_lines must have at least 4 entries
- hard_words: pick up to 8 genuinely difficult words from the text
- reading_tips: 2 to 4 tips specific to this content
- Preserve all facts — never invent information
`.trim();

/**
 * Sends OCR text to K2 and returns the raw response string.
 */
export async function processTextWithGemini(rawText: string): Promise<string> {
  const client = getClient();

  console.log("[k2] Sending request, text length:", rawText.length);

  try {
    const response = await client.chat.completions.create({
      model:       "MBZUAI-IFM/K2-Think-v2",
      max_tokens:  4096,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role:    "user",
          content: `Transform this text for a dyslexic reader. Return only the JSON object:\n\n${rawText}`,
        },
      ],
      stream: false,
    });

    const text = response.choices[0]?.message?.content;

    if (!text) {
      throw new Error("K2 returned an empty response.");
    }

    console.log("[k2] Raw response (first 500 chars):", text.slice(0, 500));
    return text;

  } catch (err) {
    console.error("[k2] Full error:", JSON.stringify(err, null, 2));
    throw err;
  }
}

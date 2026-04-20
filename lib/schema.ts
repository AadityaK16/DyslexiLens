// lib/schema.ts
// ─────────────────────────────────────────────────────────────
// Runtime validation for the K2 JSON response.
// ─────────────────────────────────────────────────────────────

import type { DyslexiaResult, HardWord } from "@/types/dyslexia";

/** Safe fallback returned when parsing fails */
export const FALLBACK_RESULT: DyslexiaResult = {
  title:           "Could not process text",
  simplified_text: "We had trouble processing your text. Please try again with a clearer image.",
  chunked_lines:   [
    "We had trouble processing your text.",
    "Please try again.",
    "Use a clear image with good lighting.",
    "Make sure the text is in focus.",
  ],
  hard_words:   [],
  reading_tips: ["Try uploading a clearer image with good lighting and high contrast."],
};

/** Placeholder values the model sometimes returns instead of real content */
const PLACEHOLDER_VALUES = new Set([
  "...", "string", "text", "example", "placeholder", "", "null", "undefined",
]);

function isPlaceholder(val: string): boolean {
  return PLACEHOLDER_VALUES.has(val.trim().toLowerCase()) || val.trim().length < 3;
}

/**
 * Strips <think> blocks and code fences, then extracts the LAST
 * complete top-level JSON object from the response.
 */
function extractJson(raw: string): string {
  // 1. Remove <think>...</think> blocks
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, "");

  // 2. Remove markdown code fences
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();

  // 3. Walk BACKWARDS to find the last complete { ... } block
  let depth = 0;
  let end   = -1;
  let start = -1;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    if (cleaned[i] === "}") {
      if (depth === 0) end = i;
      depth++;
    } else if (cleaned[i] === "{") {
      depth--;
      if (depth === 0) {
        start = i;
        break;
      }
    }
  }

  if (start !== -1 && end !== -1) {
    return cleaned.slice(start, end + 1);
  }

  return cleaned;
}

function isHardWord(obj: unknown): obj is HardWord {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.word             === "string" &&
    typeof o.simple_meaning   === "string" &&
    Array.isArray(o.syllables) &&
    typeof o.pronunciation    === "string" &&
    typeof o.example_sentence === "string" &&
    !isPlaceholder(o.word as string)
  );
}

/**
 * Attempts to recover a usable DyslexiaResult even from partial/flawed output.
 * Falls back field-by-field rather than rejecting the whole response.
 */
function recoverResult(obj: Record<string, unknown>): DyslexiaResult {
  const title = (typeof obj.title === "string" && !isPlaceholder(obj.title))
    ? obj.title
    : FALLBACK_RESULT.title;

  const simplified_text = (
    typeof obj.simplified_text === "string" &&
    !isPlaceholder(obj.simplified_text) &&
    obj.simplified_text.trim().length > 10
  )
    ? obj.simplified_text
    : FALLBACK_RESULT.simplified_text;

  const chunked_lines = (
    Array.isArray(obj.chunked_lines) &&
    (obj.chunked_lines as unknown[]).some(
      (l) => typeof l === "string" && !isPlaceholder(l)
    )
  )
    ? (obj.chunked_lines as unknown[])
        .filter((l): l is string => typeof l === "string" && !isPlaceholder(l))
    : FALLBACK_RESULT.chunked_lines;

  const hard_words = Array.isArray(obj.hard_words)
    ? (obj.hard_words as unknown[]).filter(isHardWord)
    : [];

  const reading_tips = (
    Array.isArray(obj.reading_tips) &&
    (obj.reading_tips as unknown[]).some(
      (t) => typeof t === "string" && !isPlaceholder(t)
    )
  )
    ? (obj.reading_tips as unknown[]).filter(
        (t): t is string => typeof t === "string" && !isPlaceholder(t)
      )
    : FALLBACK_RESULT.reading_tips;

  return { title, simplified_text, chunked_lines, hard_words, reading_tips };
}

/**
 * Parses the raw LLM response into a validated DyslexiaResult.
 * Attempts field-level recovery before falling back entirely.
 */
export function parseGeminiResponse(raw: string): DyslexiaResult {
  try {
    const jsonStr = extractJson(raw);
    console.log("[schema] Extracted JSON (first 300):", jsonStr.slice(0, 300));

    const parsed = JSON.parse(jsonStr);

    if (typeof parsed !== "object" || parsed === null) {
      console.warn("[schema] Parsed value is not an object");
      return FALLBACK_RESULT;
    }

    const result = recoverResult(parsed as Record<string, unknown>);

    if (isPlaceholder(result.simplified_text)) {
      console.warn("[schema] simplified_text is still a placeholder after recovery");
      return FALLBACK_RESULT;
    }

    return result;

  } catch (err) {
    console.error("[schema] JSON parse error:", err);
    console.error("[schema] Raw (first 500):", raw.slice(0, 500));
    return FALLBACK_RESULT;
  }
}

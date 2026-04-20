// types/dyslexia.ts
// ─────────────────────────────────────────────────────────────
// Central type definitions for the DyslexiLens data pipeline.
// These mirror the exact JSON shape that Gemini must return.
// ─────────────────────────────────────────────────────────────

/** One difficult word with full accessibility metadata */
export interface HardWord {
  word:             string;   // The difficult word as it appears
  simple_meaning:   string;   // Plain-English definition (≤ 15 words)
  syllables:        string[]; // e.g. ["pho", "to", "syn", "the", "sis"]
  pronunciation:    string;   // Phonetic guide, e.g. "foh-toh-SIN-thuh-sis"
  example_sentence: string;   // Simple sentence using the word
}

/** Full structured response from the Gemini processing layer */
export interface DyslexiaResult {
  title:           string;     // Short descriptive title for the content
  simplified_text: string;     // Full rewritten text at ~6th grade reading level
  chunked_lines:   string[];   // Text split into bite-sized readable phrases
  hard_words:      HardWord[]; // Up to 10 difficult words
  reading_tips:    string[];   // 2-4 actionable tips for reading this specific text
}

/** Processing state used across UI components */
export type ProcessingStatus =
  | "idle"
  | "ocr"
  | "gemini"
  | "done"
  | "error";

/** Wraps the result with UI state so components can react */
export interface AppState {
  status:      ProcessingStatus;
  imageUrl:    string | null;       // Object URL for preview
  rawText:     string | null;       // Output from OCR
  result:      DyslexiaResult | null;
  errorMsg:    string | null;
}

/** Shape sent to the /api/process-text endpoint */
export interface ProcessTextRequest {
  text: string;
}

/** Shape returned by the /api/process-text endpoint */
export type ProcessTextResponse =
  | { ok: true;  result: DyslexiaResult }
  | { ok: false; error:  string };

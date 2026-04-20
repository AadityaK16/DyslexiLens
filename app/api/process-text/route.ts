// app/api/process-text/route.ts
// ─────────────────────────────────────────────────────────────
// Server-side API route.
// Accepts: POST { text: string }
// Returns: { ok: true, result: DyslexiaResult } | { ok: false, error: string }
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { processTextWithGemini } from "@/lib/gemini";
import { parseGeminiResponse } from "@/lib/schema";
import type { ProcessTextRequest } from "@/types/dyslexia";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ProcessTextRequest;

    if (!body.text || typeof body.text !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid `text` field in request body." },
        { status: 400 }
      );
    }

    const trimmed = body.text.trim();

    if (trimmed.length < 10) {
      return NextResponse.json(
        { ok: false, error: "Text is too short to process. Please provide more content." },
        { status: 400 }
      );
    }

    if (trimmed.length > 8000) {
      return NextResponse.json(
        { ok: false, error: "Text exceeds the 8,000-character limit. Please use a smaller image." },
        { status: 400 }
      );
    }

    const rawResponse = await processTextWithGemini(trimmed);
    const result = parseGeminiResponse(rawResponse);

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[api/process-text] Error:", err);
    const message =
      err instanceof Error ? err.message : "An unexpected server error occurred.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

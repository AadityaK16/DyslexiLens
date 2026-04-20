"use client";
// app/page.tsx
// ─────────────────────────────────────────────────────────────
// Main page — owns all app state and orchestrates the pipeline:
//   ImageCapture → OCR → /api/process-text → ResultsView
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect } from "react";
import ImageCapture from "@/components/ImageCapture";
import ResultsView from "@/components/ResultsView";
import { extractTextFromImage } from "@/lib/ocr";
import type { AppState, DyslexiaResult } from "@/types/dyslexia";

const INITIAL_STATE: AppState = {
  status:   "idle",
  imageUrl: null,
  rawText:  null,
  result:   null,
  errorMsg: null,
};

const DEMO_RESULT: DyslexiaResult = {
  title: "Demo: The Solar System",
  simplified_text: "The solar system has the Sun and eight planets. Planets move around the Sun. Earth is one of them.",
  chunked_lines: [
    "The solar system has the Sun at its centre.",
    "Eight planets orbit around the Sun.",
    "Earth is the third planet from the Sun.",
    "The Moon goes around the Earth once a month.",
    "Mars is called the Red Planet.",
    "Jupiter is the largest planet in the system.",
  ],
  hard_words: [
    { word: "orbit", simple_meaning: "to move in a circle around something", syllables: ["or","bit"], pronunciation: "OR-bit", example_sentence: "The moon orbits the Earth." }
  ],
  reading_tips: [
    "Read one line at a time.",
    "Use the reading ruler to keep your place.",
    "Tap a word to hear it."
  ],
};

export default function HomePage() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [ocrProgress, setOcrProgress] = useState(0);

  // Demo mode: ?demo=1 seeds the results view so reviewers can see
  // the slider alignment & reading ruler without running OCR + LLM.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1") {
      setState({
        status: "done",
        imageUrl: null,
        rawText: "The solar system has the Sun at its centre. Eight planets orbit around it.",
        result: DEMO_RESULT,
        errorMsg: null,
      });
    }
  }, []);

  // ── Reset everything back to the capture screen
  const handleReset = useCallback(() => {
    if (state.imageUrl) URL.revokeObjectURL(state.imageUrl);
    setState(INITIAL_STATE);
    setOcrProgress(0);
  }, [state.imageUrl]);

  // ── Main pipeline: File → OCR → Gemini → Result
  const handleProcess = useCallback(async (file: File) => {
    // Create a preview URL
    const imageUrl = URL.createObjectURL(file);
    setState({ ...INITIAL_STATE, status: "ocr", imageUrl });
    setOcrProgress(0);

    let rawText: string;

    // ── Step 1: OCR
    try {
      rawText = await extractTextFromImage(file, (p) => setOcrProgress(p));
    } catch (err) {
      setState((s) => ({
        ...s,
        status:   "error",
        errorMsg: err instanceof Error ? err.message : "OCR failed.",
      }));
      return;
    }

    // ── Step 2: Gemini processing
    setState((s) => ({ ...s, status: "gemini", rawText }));

    try {
      const res = await fetch("/api/process-text", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text: rawText }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error ?? "Unknown server error.");
      }

      setState((s) => ({
        ...s,
        status: "done",
        result: data.result as DyslexiaResult,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        status:   "error",
        errorMsg: err instanceof Error ? err.message : "Processing failed.",
      }));
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ── */}
      <header className="px-5 pt-6 pb-4 text-center sm:pt-10 sm:pb-6">
        <div className="inline-flex items-center gap-2 mb-2">
          {/* Logo mark */}
          <span className="text-3xl" role="img" aria-label="lens">🔍</span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink-900">
            DyslexiLens
          </h1>
        </div>
        <p className="text-ink-500 text-sm sm:text-base max-w-xs mx-auto leading-relaxed">
          Point at any text — we make it easier to read.
        </p>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 px-4 pb-6 sm:pb-12 max-w-lg mx-auto w-full">

        {/* CAPTURE / IDLE SCREEN */}
        {(state.status === "idle") && (
          <ImageCapture onFileSelected={handleProcess} />
        )}

        {/* OCR PROGRESS */}
        {state.status === "ocr" && (
          <StatusCard
            icon="📷"
            title="Reading your image…"
            subtitle={`Extracting text (${ocrProgress}%)`}
            progress={ocrProgress}
          />
        )}

        {/* GEMINI PROGRESS */}
        {state.status === "gemini" && (
          <StatusCard
            icon="✨"
            title="Making it easier to read…"
            subtitle="Simplifying and chunking your text"
            progress={null}
          />
        )}

        {/* ERROR SCREEN */}
        {state.status === "error" && (
          <div className="card text-center space-y-4">
            <span className="text-4xl block">😔</span>
            <h2 className="font-display text-xl font-semibold text-ink-900">
              Something went wrong
            </h2>
            <p className="text-ink-500 text-sm reading-text">
              {state.errorMsg}
            </p>
            <button onClick={handleReset} className="btn-primary w-full">
              Try Again
            </button>
          </div>
        )}

        {/* RESULTS SCREEN */}
        {state.status === "done" && state.result && (
          <ResultsView
            result={state.result}
            rawText={state.rawText ?? ""}
            imageUrl={state.imageUrl ?? ""}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  );
}

// ── Small inline helper component for loading states ──────────
function StatusCard({
  icon,
  title,
  subtitle,
  progress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  progress: number | null;
}) {
  return (
    <div className="card text-center space-y-5 py-10">
      <span className="text-5xl block animate-pulse">{icon}</span>
      <div>
        <h2 className="font-display text-xl font-semibold text-ink-900 mb-1">
          {title}
        </h2>
        <p className="text-ink-500 text-sm">{subtitle}</p>
      </div>
      {progress !== null ? (
        <div className="w-full bg-cream-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-focus h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : (
        // Indeterminate spinner for Gemini (unknown duration)
        <div className="w-full bg-cream-200 rounded-full h-2 overflow-hidden">
          <div className="h-2 w-1/3 bg-focus rounded-full animate-[shimmer_1.2s_ease-in-out_infinite]" />
        </div>
      )}
    </div>
  );
}

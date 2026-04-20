"use client";
// components/FocusMode.tsx
// ─────────────────────────────────────────────────────────────
// Displays ONE chunked line at a time with Prev/Next navigation.
// Helps dyslexic readers maintain place without losing context.
// Keyboard: left/right arrow keys also navigate.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";

interface FocusModeProps {
  lines:   string[];
  onClose: () => void;
}

export default function FocusMode({ lines, onClose }: FocusModeProps) {
  const [index, setIndex] = useState(0);

  const goNext = useCallback(() => setIndex((i) => Math.min(i + 1, lines.length - 1)), [lines.length]);
  const goPrev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   goPrev();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, onClose]);

  // Touch swipe navigation
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0) goNext(); // swipe left → next
      else         goPrev(); // swipe right → prev
    }
    touchStartX.current = null;
  }, [goNext, goPrev]);

  // Read aloud the current line via browser speech synthesis
  const readLine = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(lines[index]);
    utt.rate  = 0.85; // Slightly slower for dyslexic readers
    utt.pitch = 1.0;
    window.speechSynthesis.speak(utt);
  }, [lines, index]);

  const line = lines[index];

  return (
    // Full-screen overlay
    <div
      className="fixed inset-0 z-50 bg-cream-50 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Focus reading mode"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 pt-safe pb-0">
        <div className="pt-4">
          <span className="text-ink-500 text-sm font-medium">
            {index + 1} <span className="text-ink-300">/ {lines.length}</span>
          </span>
        </div>
        <div className="pt-4">
          <h2 className="font-display font-semibold text-ink-900 text-sm">
            Focus Mode
          </h2>
        </div>
        <div className="pt-4">
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-900 transition-colors p-2 -mr-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Exit focus mode"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="h-1 bg-cream-200 mx-5 rounded-full overflow-hidden mt-3 mb-4">
        <div
          className="h-1 bg-focus rounded-full transition-all duration-300"
          style={{ width: `${((index + 1) / lines.length) * 100}%` }}
        />
      </div>

      {/* ── The line ── */}
      <div className="flex-1 flex items-center justify-center px-6 overflow-hidden">
        <p
          className="font-display text-2xl sm:text-3xl font-semibold text-ink-900 reading-text text-center leading-snug"
          style={{ letterSpacing: "0.04em" }}
          aria-live="polite"
          aria-atomic="true"
        >
          {line}
        </p>
      </div>

      {/* ── Controls ── */}
      <div className="px-5 pb-safe space-y-3 pb-6">
        {/* Read aloud */}
        <button
          onClick={readLine}
          className="btn-ghost w-full flex items-center justify-center gap-2 py-3"
          aria-label="Read this line aloud"
        >
          <span className="text-xl">🔊</span>
          <span>Read Aloud</span>
        </button>

        {/* Prev / Next */}
        <div className="flex gap-3">
          <button
            onClick={goPrev}
            disabled={index === 0}
            className="btn-ghost flex-1 py-4 text-lg"
            aria-label="Previous line"
          >
            ← Prev
          </button>
          <button
            onClick={goNext}
            disabled={index === lines.length - 1}
            className="btn-primary flex-1 py-4 text-lg"
            aria-label="Next line"
          >
            Next →
          </button>
        </div>

        {/* Keyboard hint (desktop only) */}
        <p className="text-center text-ink-300 text-xs hidden md:block">
          Use ← → arrow keys to navigate · Esc to exit
        </p>

        {/* Bottom safe area spacer for home indicator */}
        <div style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
      </div>
    </div>
  );
}

"use client";
// components/ReadingRuler.tsx
// ─────────────────────────────────────────────────────────────
// A reading ruler (a.k.a. reading guide) that shows where the
// reader is currently looking. Two modes work together:
//
//  • MOUSE MODE — a horizontal highlight bar follows the cursor
//    across the page, making it easy to keep your place.
//  • SPEECH MODE — when the caller is playing audio, the
//    external "speechLineEl" prop tells us which line element is
//    currently being read, so the ruler snaps to that line.
//
// The ruler can be toggled on/off and its opacity/height tuned.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from "react";

interface ReadingRulerProps {
  /** External element the ruler should follow (e.g. active spoken line). */
  speechLineEl?: HTMLElement | null;
  /** Called when the user closes the ruler. */
  onClose?: () => void;
}

export default function ReadingRuler({ speechLineEl, onClose }: ReadingRulerProps) {
  const [y, setY] = useState<number>(() => (typeof window !== "undefined" ? window.innerHeight / 2 : 300));
  const [height, setHeight] = useState<number>(52);
  const [opacity, setOpacity] = useState<number>(0.28);
  const [locked, setLocked] = useState<boolean>(false);
  const [panelOpen, setPanelOpen] = useState<boolean>(false);

  const lastMouseY = useRef<number>(y);

  // ── Follow the mouse (unless locked) ──
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      lastMouseY.current = e.clientY;
      if (!locked && !speechLineEl) setY(e.clientY);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [locked, speechLineEl]);

  // ── Snap to the currently spoken line ──
  useEffect(() => {
    if (!speechLineEl) return;
    const rect = speechLineEl.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    setY(center);
    setHeight(Math.max(40, Math.min(rect.height + 12, 120)));
  }, [speechLineEl]);

  // ── Keyboard: arrow keys nudge when locked, Esc closes panel ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && panelOpen) setPanelOpen(false);
      if (!locked) return;
      if (e.key === "ArrowDown") setY((v) => Math.min(window.innerHeight - 10, v + 12));
      if (e.key === "ArrowUp")   setY((v) => Math.max(10, v - 12));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked, panelOpen]);

  const toggleLock = useCallback(() => setLocked((v) => !v), []);

  const bandTop = y - height / 2;

  return (
    <>
      {/* ── Ruler overlay — highlight band only, no dark dims ── */}
      <div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-[45] pointer-events-none flex justify-center"
        style={{ height: "100vh" }}
        data-testid="reading-ruler-overlay"
      >
        {/* focus band — constrained to content width (max-w-lg matches the page layout) */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(100%, 512px)",   /* matches max-w-lg = 32rem = 512px */
            top: Math.max(0, bandTop),
            height: height,
            borderTop: "2px solid rgba(244,167,35,0.85)",
            borderBottom: "2px solid rgba(244,167,35,0.85)",
            backgroundColor: `rgba(253,230,138,${opacity})`,
            borderRadius: 6,
            transition: "top 120ms ease-out, height 160ms ease-out",
          }}
        />
      </div>

      {/* ── Floating control (clickable) ── */}
      <div className="fixed right-4 bottom-20 z-[60] flex flex-col items-end gap-2" data-testid="reading-ruler-controls">
        {panelOpen && (
          <div className="bg-white border border-cream-200 rounded-2xl shadow-xl p-4 w-60 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-display font-semibold text-ink-900 text-sm">Reading Ruler</p>
              <button
                onClick={() => setPanelOpen(false)}
                className="text-ink-400 hover:text-ink-900 text-sm w-7 h-7 flex items-center justify-center rounded-lg hover:bg-cream-100"
                aria-label="Close ruler panel"
                data-testid="reading-ruler-panel-close"
              >
                ✕
              </button>
            </div>

            <label className="block">
              <div className="flex justify-between text-xs text-ink-500 mb-1">
                <span>Band height</span>
                <span>{height}px</span>
              </div>
              <input
                type="range" min={28} max={140} step={2}
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full"
                data-testid="ruler-height-slider"
              />
            </label>

            <label className="block">
              <div className="flex justify-between text-xs text-ink-500 mb-1">
                <span>Highlight strength</span>
                <span>{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range" min={0} max={0.6} step={0.02}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-full"
                data-testid="ruler-opacity-slider"
              />
            </label>

            <button
              onClick={toggleLock}
              className={`w-full text-sm rounded-xl py-2 border transition-colors ${
                locked ? "bg-focus text-white border-focus" : "bg-white text-ink-700 border-cream-200 hover:bg-cream-100"
              }`}
              data-testid="ruler-lock-toggle"
            >
              {locked ? "🔒 Locked (↑↓ to move)" : "🖱 Follow mouse"}
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="w-full text-xs text-ink-500 py-2 rounded-xl border border-cream-200 hover:bg-cream-100"
                data-testid="ruler-hide"
              >
                Hide ruler
              </button>
            )}
          </div>
        )}

        <button
          onClick={() => setPanelOpen((v) => !v)}
          className="w-12 h-12 rounded-full bg-focus text-white shadow-lg active:scale-95 transition-all flex items-center justify-center"
          aria-label="Ruler settings"
          data-testid="reading-ruler-toggle"
          title="Reading ruler settings"
        >
          <span className="text-xl">📏</span>
        </button>
      </div>
    </>
  );
}

"use client";
// components/ResultsView.tsx

import { useState, useCallback, useRef, useEffect } from "react";
import FocusMode from "@/components/FocusMode";
import ReadingRuler from "@/components/ReadingRuler";
import type { DyslexiaResult, HardWord } from "@/types/dyslexia";

interface ResultsViewProps {
  result:   DyslexiaResult;
  rawText:  string;
  imageUrl: string;
  onReset:  () => void;
}

type Tab = "chunked" | "words" | "tips" | "original";

const TEXT_COLOURS = [
  { label: "Dark",   value: "#1A1209" },
  { label: "Navy",   value: "#1a3a5c" },
  { label: "Forest", value: "#1a3d2b" },
  { label: "Purple", value: "#3b1f5e" },
  { label: "Brown",  value: "#5c3317" },
];

// ── Word pronunciation helper ──────────────────────────────────
function speakWord(word: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(word);
  utt.rate  = 0.75;
  utt.pitch = 1.0;
  window.speechSynthesis.speak(utt);
}

// ── Clickable word component ───────────────────────────────────
function ClickableText({
  text,
  style,
  className,
}: {
  text: string;
  style?: React.CSSProperties;
  className?: string;
}) {
  const [spoken, setSpoken] = useState<string | null>(null);

  const handleWordClick = (word: string) => {
    const clean = word.replace(/[^a-zA-Z'\u2019\-]/g, "");
    if (!clean) return;
    speakWord(clean);
    setSpoken(clean);
    setTimeout(() => setSpoken(null), 1200);
  };

  const words = text.split(/(\s+)/);

  return (
    <p style={style} className={className}>
      {words.map((chunk, i) => {
        if (/^\s+$/.test(chunk)) return <span key={i}>{chunk}</span>;
        const clean = chunk.replace(/[^a-zA-Z'\u2019\-]/g, "");
        const isSpoken = spoken === clean && clean !== "";
        return (
          <span
            key={i}
            onClick={() => handleWordClick(chunk)}
            title={clean ? `Tap to hear "${clean}"` : undefined}
            style={{
              cursor: clean ? "pointer" : "default",
              borderRadius: 4,
              padding: "0 1px",
              backgroundColor: isSpoken ? "#FDE68A" : "transparent",
              transition: "background-color 0.2s",
              display: "inline",
            }}
          >
            {chunk}
          </span>
        );
      })}
    </p>
  );
}

// ── Horizontal slider (bigger, touch-friendly) ─────────────────
function HSlider({
  label, icon, value, min, max, step, unit, onChange,
}: {
  label: string; icon: string; value: number; min: number; max: number;
  step: number; unit: string; onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium text-ink-600">
          <span className="text-base">{icon}</span>
          {label}
        </span>
        <span
          className="text-ink-500 font-mono text-xs bg-cream-100 px-2 py-0.5 rounded-lg"
          style={{ minWidth: 44, textAlign: "center" }}
        >
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="hslider"
      />
    </div>
  );
}

export default function ResultsView({
  result, rawText, imageUrl, onReset,
}: ResultsViewProps) {
  const [activeTab, setActiveTab]         = useState<Tab>("chunked");
  const [focusOpen, setFocusOpen]         = useState(false);
  const [isSpeaking, setIsSpeaking]       = useState(false);
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [activeLineIdx, setActiveLineIdx] = useState<number | null>(null);
  const [rulerOn, setRulerOn]             = useState(true);

  // Refs for each chunked line (so the ruler can follow the spoken line)
  const lineRefs = useRef<Array<HTMLLIElement | null>>([]);
  const speechLineEl = activeLineIdx !== null && isSpeaking
    ? lineRefs.current[activeLineIdx] ?? null
    : null;

  // ── Reading settings ──
  const [fontSize,      setFontSize]      = useState(18);
  const [lineSpacing,   setLineSpacing]   = useState(1.9);
  const [wordSpacing,   setWordSpacing]   = useState(0.05);
  const [letterSpacing, setLetterSpacing] = useState(0.05);
  const [textColour,    setTextColour]    = useState(TEXT_COLOURS[0].value);

  const readingStyle: React.CSSProperties = {
    fontSize:      `${fontSize}px`,
    lineHeight:    lineSpacing,
    letterSpacing: `${letterSpacing}em`,
    wordSpacing:   `${wordSpacing}em`,
    color:         textColour,
  };

  // ── Read aloud: walks through chunked lines one at a time so
  // the ruler + line highlight can follow along. ──
  const utterQueueRef = useRef<SpeechSynthesisUtterance[]>([]);

  const stopReading = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    utterQueueRef.current = [];
    setIsSpeaking(false);
    setActiveLineIdx(null);
  }, []);

  const handleReadAloud = useCallback(() => {
    if (!("speechSynthesis" in window)) {
      alert("Speech synthesis is not supported in your browser.");
      return;
    }
    if (isSpeaking) {
      stopReading();
      return;
    }
    window.speechSynthesis.cancel();
    utterQueueRef.current = [];
    setIsSpeaking(true);

    // ── If on Original tab, read the raw text as one utterance ──
    if (activeTab === "original") {
      const u = new SpeechSynthesisUtterance(rawText);
      u.rate = 0.85;
      u.pitch = 1.0;
      u.onend = () => { setIsSpeaking(false); setActiveLineIdx(null); };
      u.onerror = () => { setIsSpeaking(false); setActiveLineIdx(null); };
      utterQueueRef.current.push(u);
      window.speechSynthesis.speak(u);
      return;
    }

    // ── Otherwise walk through chunked lines one by one ──
    const lines = result.chunked_lines;
    lines.forEach((line, idx) => {
      const u = new SpeechSynthesisUtterance(line);
      u.rate = 0.85;
      u.pitch = 1.0;
      u.onstart = () => setActiveLineIdx(idx);
      u.onend = () => {
        if (idx === lines.length - 1) {
          setIsSpeaking(false);
          setActiveLineIdx(null);
        }
      };
      u.onerror = () => {
        setIsSpeaking(false);
        setActiveLineIdx(null);
      };
      utterQueueRef.current.push(u);
      window.speechSynthesis.speak(u);
    });
  }, [isSpeaking, activeTab, rawText, result.chunked_lines, stopReading]);

  // Stop speech when component unmounts
  useEffect(() => () => stopReading(), [stopReading]);

  const readLine = useCallback((line: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(line);
    utt.rate  = 0.85;
    window.speechSynthesis.speak(utt);
  }, []);

  const TABS: { id: Tab; label: string; emoji: string }[] = [
    { id: "chunked",  label: "Chunks",   emoji: "🧩" },
    { id: "words",    label: "Words",    emoji: "💡" },
    { id: "tips",     label: "Tips",     emoji: "✅" },
    { id: "original", label: "Original", emoji: "📄" },
  ];

  return (
    <div className="relative">

      {/* ── Reading Ruler overlay (toggled on/off) ─────────────── */}
      {rulerOn && (
        <ReadingRuler
          speechLineEl={speechLineEl}
          onClose={() => setRulerOn(false)}
        />
      )}

      {/* ── RIGHT SIDEBAR ────────────────────────────────────────── */}

      <div
        className={`fixed top-0 right-0 h-full z-50 bg-white shadow-2xl border-l border-cream-200
          flex flex-col transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "translate-x-full"}`}
        style={{ width: 270 }}
        role="dialog"
        aria-label="Reading settings"
        aria-modal="true"
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 pt-safe pb-0">
          <div className="pt-4">
            <h2 className="font-display font-bold text-ink-900 text-base">Reading</h2>
            <p className="text-ink-400 text-xs">Adjust to your comfort</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="mt-4 p-2 rounded-xl text-ink-400 hover:text-ink-900 hover:bg-cream-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">

          {/* ── Big horizontal sliders ── */}
          <div>
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-4">
              Text Style
            </p>
            <div className="flex flex-col gap-6 bg-cream-50 rounded-2xl py-5 px-4 border border-cream-200">
              <HSlider
                label="Font Size" icon="🔤"
                value={fontSize} min={14} max={32} step={1} unit="px"
                onChange={setFontSize}
              />
              <HSlider
                label="Line Spacing" icon="↕️"
                value={lineSpacing} min={1.2} max={3.0} step={0.1} unit="×"
                onChange={setLineSpacing}
              />
              <HSlider
                label="Word Spacing" icon="↔️"
                value={wordSpacing} min={0} max={0.3} step={0.01} unit="em"
                onChange={setWordSpacing}
              />
              <HSlider
                label="Letter Spacing" icon="🔡"
                value={letterSpacing} min={0} max={0.2} step={0.01} unit="em"
                onChange={setLetterSpacing}
              />
            </div>
          </div>

          {/* Text colour */}
          <div>
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-3">
              Text Colour
            </p>
            <div className="grid grid-cols-5 gap-2">
              {TEXT_COLOURS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setTextColour(c.value)}
                  title={c.label}
                  aria-label={`Text colour: ${c.label}`}
                  className={`w-9 h-9 rounded-full border-4 transition-all duration-150
                    ${textColour === c.value
                      ? "border-focus scale-110 shadow-md"
                      : "border-cream-200"
                    }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          {/* Live preview */}
          <div>
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2">
              Preview
            </p>
            <div className="bg-cream-50 rounded-xl p-3 border border-cream-200">
              <p style={readingStyle} className="font-sans">
                The quick brown fox jumps.
              </p>
            </div>
          </div>

          {/* Pronunciation hint */}
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
            <p className="text-xs text-amber-700 font-medium">
              💬 Tap any word in the text to hear its pronunciation.
            </p>
          </div>

          {/* Reset button */}
          <button
            onClick={() => {
              setFontSize(18);
              setLineSpacing(1.9);
              setWordSpacing(0.05);
              setLetterSpacing(0.05);
              setTextColour(TEXT_COLOURS[0].value);
            }}
            className="w-full text-xs text-ink-400 py-2 rounded-xl border border-cream-200 hover:bg-cream-100 transition-colors"
          >
            Reset to defaults
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
      <div className="space-y-5">

        {focusOpen && (
          <FocusMode
            lines={result.chunked_lines}
            onClose={() => setFocusOpen(false)}
          />
        )}

        {/* Header card */}
        <div className="card">
          <div className="flex items-start gap-3">
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="Source image"
                className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-cream-200"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-ink-300 uppercase tracking-wider mb-0.5 font-medium">
                Processed
              </p>
              <h2 className="font-display text-lg font-bold text-ink-900 leading-tight">
                {result.title}
              </h2>
            </div>
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-cream-100 border border-cream-200 flex items-center justify-center text-lg transition-colors active:bg-cream-200"
              aria-label="Open reading settings"
            >
              ⚙️
            </button>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setFocusOpen(true)}
              className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 text-sm"
              aria-label="Open Focus Mode"
              data-testid="open-focus-mode-btn"
            >
              <span>🎯</span>
              <span>Focus Mode</span>
            </button>
            <button
              onClick={handleReadAloud}
              className="btn-ghost flex-1 flex items-center justify-center gap-2 py-3 text-sm"
              aria-label={isSpeaking ? "Stop reading" : "Read aloud"}
              data-testid="read-aloud-btn"
            >
              <span>{isSpeaking ? "⏹" : "🔊"}</span>
              <span>{isSpeaking ? "Stop" : "Read Aloud"}</span>
            </button>
          </div>

          {/* Ruler toggle */}
          <button
            onClick={() => setRulerOn((v) => !v)}
            className={`mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-display font-medium border transition-colors ${
              rulerOn
                ? "bg-focus/10 border-focus/40 text-focus"
                : "bg-white border-cream-200 text-ink-500 hover:bg-cream-100"
            }`}
            aria-pressed={rulerOn}
            aria-label={rulerOn ? "Hide reading ruler" : "Show reading ruler"}
            data-testid="reading-ruler-main-toggle"
          >
            <span className="text-base">📏</span>
            <span>{rulerOn ? "Reading Ruler: On" : "Reading Ruler: Off"}</span>
          </button>
        </div>

        {/* Tab navigation — 2×2 grid for 4 tabs */}
        <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Reading mode tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-display font-medium
                transition-all duration-150 min-h-[52px]
                ${activeTab === tab.id
                  ? "bg-focus text-white shadow-sm"
                  : "bg-white border border-cream-200 text-ink-500 active:bg-cream-100"
                }
              `}
            >
              <span className="text-base">{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* CHUNKS TAB */}
        {activeTab === "chunked" && (
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-ink-700 text-sm uppercase tracking-wider">
                Reading Chunks
              </h3>
              <p className="text-ink-400 text-xs">Tap line · tap word 🔊</p>
            </div>
            <ol className="space-y-2" aria-label="Text chunks">
              {result.chunked_lines.map((line, i) => (
                <li
                  key={i}
                  ref={(el) => { lineRefs.current[i] = el; }}
                  className={`
                    flex gap-3 items-start rounded-xl px-3 py-2
                    transition-all duration-150
                    ${activeLineIdx === i
                      ? "bg-focus/15 border-2 border-focus/50"
                      : "border-2 border-transparent"
                    }
                  `}
                  aria-current={activeLineIdx === i ? "true" : undefined}
                >
                  <span
                    onClick={() => {
                      setActiveLineIdx(i === activeLineIdx ? null : i);
                      readLine(line);
                    }}
                    className={`font-display font-bold text-sm mt-1 min-w-[1.5rem] flex-shrink-0 cursor-pointer select-none
                      ${activeLineIdx === i ? "text-focus" : "text-ink-300"}`}
                  >
                    {i + 1}.
                  </span>
                  <div className="flex-1">
                    <ClickableText
                      text={line}
                      style={readingStyle}
                      className="font-sans"
                    />
                  </div>
                  {activeLineIdx === i && (
                    <span className="text-focus text-xs mt-1 flex-shrink-0">🔊</span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* HARD WORDS TAB */}
        {activeTab === "words" && (
          <div className="space-y-3">
            {result.hard_words.length === 0 ? (
              <div className="card text-center py-8">
                <span className="text-3xl block mb-2">🎉</span>
                <p className="text-ink-500">No particularly difficult words found!</p>
              </div>
            ) : (
              result.hard_words.map((hw, i) => (
                <HardWordCard key={i} word={hw} readingStyle={readingStyle} />
              ))
            )}
          </div>
        )}

        {/* TIPS TAB */}
        {activeTab === "tips" && (
          <div className="card space-y-4">
            <h3 className="font-display font-semibold text-ink-700 text-sm uppercase tracking-wider">
              Reading Tips
            </h3>
            <ul className="space-y-3" aria-label="Reading tips">
              {result.reading_tips.map((tip, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span
                    className="w-6 h-6 rounded-full bg-leaf-light text-leaf flex items-center justify-center text-sm flex-shrink-0 mt-0.5"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  <ClickableText text={tip} style={readingStyle} className="font-sans flex-1" />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ORIGINAL TEXT TAB */}
        {activeTab === "original" && (
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-ink-700 text-sm uppercase tracking-wider">
                Original Text
              </h3>
              <p className="text-ink-400 text-xs">Tap any word 🔊</p>
            </div>
            <div className="bg-cream-50 rounded-xl p-4 border border-cream-200">
              {rawText.trim() ? (
                rawText.split("\n").filter(Boolean).map((paragraph, i) => (
                  <ClickableText
                    key={i}
                    text={paragraph}
                    style={readingStyle}
                    className="font-sans mb-3 last:mb-0"
                  />
                ))
              ) : (
                <p className="text-ink-400 text-sm italic">No original text available.</p>
              )}
            </div>
          </div>
        )}

        {/* Start over */}
        <button onClick={onReset} className="btn-ghost w-full" aria-label="Scan a new image">
          ← Scan New Image
        </button>
      </div>
    </div>
  );
}

// ── Hard word expandable card ──────────────────────────────────
function HardWordCard({
  word, readingStyle,
}: {
  word: HardWord;
  readingStyle: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left gap-3"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <span
            style={{ color: readingStyle.color }}
            className="font-display text-lg font-bold block truncate"
          >
            {word.word}
          </span>
          <span className="text-ink-400 text-sm italic">
            {word.syllables.join(" · ")}
          </span>
        </div>
        <span
          className="text-focus text-xl transition-transform duration-200 flex-shrink-0"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="mt-4 space-y-3 pt-4 border-t border-cream-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sky text-sm font-medium">Say it:</span>
            <span className="font-display text-ink-700 text-sm bg-sky-light px-2 py-0.5 rounded-md">
              {word.pronunciation}
            </span>
            <button
              onClick={() => speakWord(word.word)}
              className="ml-auto flex items-center gap-1 text-xs bg-focus/10 text-focus px-3 py-1.5 rounded-full font-medium active:scale-95 transition-all min-h-[36px]"
              aria-label={`Hear pronunciation of ${word.word}`}
            >
              🔊 Hear it
            </button>
          </div>
          <ClickableText
            text={`Means: ${word.simple_meaning}`}
            style={readingStyle}
            className="font-sans"
          />
          <div className="bg-cream-100 rounded-xl p-3">
            <ClickableText
              text={`"${word.example_sentence}"`}
              style={{ ...readingStyle, fontStyle: "italic" }}
              className="font-sans"
            />
          </div>
        </div>
      )}
    </div>
  );
}

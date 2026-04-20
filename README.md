# 🔍 DyslexiLens

**Point your camera at any text. DyslexiLens simplifies, chunks, and explains it — built for people with dyslexia.**

DyslexiLens is a mobile-first web app that turns a photo of any text (a book page, a sign, a form, a menu) into a clean, accessible reading experience. It runs OCR in the browser, sends the extracted text to an AI backend powered by [K2-Think-v2](https://k2think.ai), and returns a fully structured, dyslexia-optimised result: simplified language, bite-sized reading chunks, hard word definitions with pronunciation guides, and personalised reading tips.

---

## ✨ Features

### Core pipeline
- **Live camera capture** — opens the rear-facing camera directly in the browser, no app install needed
- **Gallery upload** — accepts JPEG, PNG, or WebP up to 10 MB
- **Client-side OCR** — Tesseract.js runs entirely in the browser (no image data ever leaves the device during OCR); real phase-mapped progress 0 → 100%
- **AI simplification** — K2-Think-v2 rewrites the extracted text at a ~6th-grade reading level and returns structured JSON
- **Robust JSON parsing** — multi-strategy extraction + field-level recovery so a single model formatting quirk never silently breaks the result

### Reading tools
| Tool | Description |
|---|---|
| **Reading Chunks** | Text split into 5–12 word bite-sized lines, each tappable to hear aloud |
| **Focus Mode** | Full-screen one-line-at-a-time view with swipe navigation and progress bar |
| **Read Aloud** | Walks through every chunk in sequence; the reading ruler tracks the active line |
| **Reading Ruler** | Amber highlight band that follows your finger/cursor; snaps to the currently spoken line during read-aloud |
| **Hard Words** | Expandable cards with syllable breakdown, pronunciation guide, plain-English meaning, and example sentence |
| **Reading Tips** | 2–4 AI-generated tips specific to the content just scanned |
| **Word tap-to-speak** | Tap any individual word in any tab to hear it pronounced |

### Personalisation (reading settings sidebar)
- Font size (14–32 px)
- Line spacing (1.2× – 3.0×)
- Word spacing (0–0.3 em)
- Letter spacing (0–0.2 em)
- Five text colour presets (dark, navy, forest, purple, brown)
- Reading ruler height and highlight intensity

### Accessibility defaults
- [Atkinson Hyperlegible](https://brailleinstitute.org/freefont) for body text — designed specifically for low-vision readers
- [Lexend](https://www.lexend.com/) for headings — clinically tested to improve reading fluency
- 0.08 em letter spacing and 1.9× line height throughout
- All interactive elements meet the 44 × 44 px minimum touch target
- `focus-visible` ring on every focusable element
- `aria-live` regions on Focus Mode and read-aloud state

### Developer experience
- **Demo mode** — append `?demo=1` to the URL to load a pre-seeded result without running OCR or calling the API; useful for UI review
- Typed end-to-end with TypeScript
- No external UI component library — plain Tailwind CSS with a custom design token set

---

## 🏗 Architecture

```
Browser                                  Server (Next.js API route)
───────────────────────────────────      ────────────────────────────────
ImageCapture (camera / gallery)
        │ File
        ▼
lib/ocr.ts  ← Tesseract.js (WASM)
  real progress 0–100%
        │ raw text string
        ▼
POST /api/process-text ──────────────▶  app/api/process-text/route.ts
                                               │
                                        lib/gemini.ts
                                        K2-Think-v2 via OpenAI-compat API
                                               │ raw JSON string
                                        lib/schema.ts
                                        parse + field-level recovery
                                               │ DyslexiaResult
◀──────────────────────────────────────────────┘
        │
        ▼
ResultsView
  ├── Chunks tab  (ClickableText + ReadingRuler)
  ├── Words tab   (HardWordCard)
  ├── Tips tab
  ├── Original tab
  └── FocusMode overlay
```

**Why client-side OCR?** K2-Think-v2 is a text-only model — it has no vision capability. Running Tesseract.js in the browser avoids shipping image data to a server for OCR, keeps latency low on repeated scans (the WASM binary is cached after the first load), and sidesteps Worker restrictions in Next.js serverless API routes that would cause recognition to hang.

---

## 📁 Project structure

```
dyslexilens/
├── app/
│   ├── api/
│   │   └── process-text/
│   │       └── route.ts      # POST handler — calls K2, returns DyslexiaResult
│   ├── globals.css            # Tailwind layers, custom slider CSS, safe-area utilities
│   ├── layout.tsx             # Font loading (Lexend + Atkinson), viewport meta
│   └── page.tsx               # Root page — state machine, pipeline orchestration
├── components/
│   ├── FocusMode.tsx          # Full-screen one-line reader with swipe + keyboard nav
│   ├── ImageCapture.tsx       # Camera capture + gallery upload
│   ├── ReadingRuler.tsx       # Amber highlight band following pointer / speech
│   └── ResultsView.tsx        # Four-tab results view + settings sidebar
├── lib/
│   ├── gemini.ts              # K2-Think-v2 API client (OpenAI-compat SDK)
│   ├── ocr.ts                 # Tesseract.js wrapper with phase-mapped progress
│   └── schema.ts              # JSON extraction, repair, and field-level recovery
├── types/
│   └── dyslexia.ts            # Shared TypeScript interfaces
├── .env.example               # Required environment variables
├── next.config.js             # Webpack fallbacks for Tesseract WASM worker
├── tailwind.config.js         # Design tokens (cream, ink, focus, leaf, sky palettes)
└── package.json
```

---

## 🚀 Getting started

### Prerequisites

- Node.js 18 or later
- A K2-Think API key — get one at [api.k2think.ai](https://api.k2think.ai)

### 1. Clone and install

```bash
git clone https://github.com/your-username/dyslexilens.git
cd dyslexilens
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Open `.env.local` and set your key:

```env
GEMINI_API_KEY=your_k2_api_key_here
```

> The variable is named `GEMINI_API_KEY` for historical reasons. It holds your K2-Think API key.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

On first use, Tesseract.js downloads the English language model (~10 MB). This is cached by the browser afterwards.

### 4. Try demo mode

To see the full results UI without an API key or a real image:

```
http://localhost:3000/?demo=1
```

---

## 🔑 Environment variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ Yes | Your K2-Think API key from [api.k2think.ai](https://api.k2think.ai) |

No other environment variables are needed.

---

## 🧩 Key implementation details

### OCR progress mapping

Tesseract.js emits several named phases before recognition. `lib/ocr.ts` maps them into a smooth 0–100% progress arc:

| Tesseract phase | Progress range |
|---|---|
| loading tesseract core | 0–15% |
| initialising tesseract | 15–25% |
| loading language traineddata | 25–45% |
| initialising api | 45–55% |
| recognising text | 55–100% |

### JSON response recovery

K2-Think-v2 is a reasoning model that can emit `<think>…</think>` blocks before its answer. `lib/schema.ts` applies a multi-step recovery pipeline to every response:

1. Strip `<think>` blocks and markdown code fences
2. Walk the string backwards to extract the last complete `{ … }` block (handles preamble text gracefully)
3. Attempt `JSON.parse` directly
4. If that fails, attempt common repairs (trailing commas, mismatched quotes) then re-parse
5. If the object parses but individual fields are placeholder values (`"..."`, `"string"`, etc.), substitute field-level fallbacks rather than discarding the whole result
6. Only if everything fails return the static `FALLBACK_RESULT`

### Reading ruler — two modes

`ReadingRuler` operates in two simultaneous modes:

- **Pointer mode** — listens to `mousemove` and `touchmove` events and moves the amber band to follow the reader's finger or cursor
- **Speech mode** — when the parent passes a `speechLineEl` ref (the `<li>` element for the currently spoken chunk), the ruler ignores the pointer and snaps its band to that element's bounding box, updating as each line finishes

Both modes coexist; speech mode takes priority when active.

### Prompt security

The system prompt that instructs K2 how to format its JSON response lives exclusively in `app/api/process-text/route.ts` on the server. It is never included in the JavaScript bundle sent to the browser and is not returned in any API response.

---

## 🛠 Scripts

```bash
npm run dev      # Start development server on http://localhost:3000
npm run build    # Production build
npm run start    # Start production server (after build)
npm run lint     # ESLint
```

---

## 📦 Dependencies

| Package | Purpose |
|---|---|
| `next` 15 | App framework (App Router, API routes) |
| `react` 19 | UI |
| `tesseract.js` | Client-side OCR (WASM, runs in browser) |
| `openai` | OpenAI-compatible SDK used to call the K2-Think-v2 endpoint |
| `tailwindcss` | Utility CSS |
| `autoprefixer` / `postcss` | CSS toolchain |

---

## 🎨 Design tokens

The Tailwind config extends the default palette with a warm, low-contrast colour system chosen to be comfortable for dyslexic readers:

| Token | Hex | Use |
|---|---|---|
| `cream-50` | `#FFFDF5` | Page background |
| `cream-100` | `#FFF8E7` | Card backgrounds |
| `cream-200` | `#FFF0C8` | Borders, dividers |
| `ink-900` | `#1A1209` | Primary text |
| `ink-500` | `#6B5A42` | Secondary text |
| `ink-300` | `#A8977E` | Placeholder / hint text |
| `focus` | `#F4A723` | Primary action, ruler highlight |
| `leaf` | `#3D8A5E` | Success, tips |
| `sky` | `#4A7FB5` | Pronunciation tags |

Typography defaults: **0.08 em letter spacing**, **1.9× line height**, **0.05 em word spacing** — applied globally via the `.reading-text` utility class.

---

## 🔄 Swapping the OCR engine

`lib/ocr.ts` is the single integration point for OCR. To replace Tesseract.js with a cloud provider:

1. Remove the `tesseract.js` import
2. Convert the `File` to base64 and POST it to your own `/api/ocr` server route
3. Call your provider (Google Cloud Vision, AWS Textract, Azure Computer Vision, etc.) from that route
4. Return `{ ok: true, text: string }` in the same shape
5. Update `extractTextFromImage` in `lib/ocr.ts` to call that route instead

The rest of the pipeline (`page.tsx` → `/api/process-text` → `ResultsView`) requires no changes.

---

## 🌐 Deployment with ngrok

DyslexiLens is deployed for sharing and testing using **[ngrok](https://ngrok.com)**, which exposes the local Next.js server over a public HTTPS URL — no cloud hosting required. This is especially useful for testing on real mobile devices, where camera access requires a secure origin (`https://`).

### Install ngrok

```bash
# macOS
brew install ngrok

# or download directly from https://ngrok.com/download
```

Sign up for a free ngrok account and authenticate:

```bash
ngrok config add-authtoken YOUR_NGROK_AUTH_TOKEN
```

### Run the app and expose it

In one terminal, start the Next.js production server:

```bash
npm run build
npm run start
```

In a second terminal, start the ngrok tunnel on the same port:

```bash
ngrok http 3000
```

ngrok will print a public URL like:

```
Forwarding   https://a1b2-203-0-113-0.ngrok-free.app → http://localhost:3000
```

Open that URL on any device — phones, tablets, and external testers can all access the app over HTTPS. Camera capture works because the connection is served over a valid secure origin.

### Notes

- The public URL changes each time you restart ngrok (on the free plan). Use `ngrok http --domain=your-static-domain.ngrok-free.app 3000` if you have a reserved domain.
- The `GEMINI_API_KEY` in your `.env.local` is read server-side and is never exposed through the tunnel.
- For a persistent production deployment, consider [Vercel](https://vercel.com) or any Node.js-compatible host — set `GEMINI_API_KEY` as an environment variable in the host's dashboard.

---

## 📄 License

MIT

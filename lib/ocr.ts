// lib/ocr.ts
// ─────────────────────────────────────────────────────────────
// OCR abstraction layer.
// Currently powered by Tesseract.js (runs entirely in the browser).
//
// TODO (OCR swap): To use a cloud OCR provider instead:
//   1. Replace `extractTextFromImage` with an API call to your provider
//      (e.g. Google Cloud Vision, AWS Textract, Azure Computer Vision).
//   2. Send the base64 image data to your /api/ocr server route.
//   3. The rest of the pipeline remains unchanged.
// ─────────────────────────────────────────────────────────────

/** Progress callback so the UI can show OCR progress (0–100) */
export type OcrProgressCallback = (progress: number) => void;

/**
 * Extracts plain text from an image File using Tesseract.js.
 *
 * @param imageFile  - The image File object from input or camera capture
 * @param onProgress - Optional callback receiving progress 0–100
 * @returns          - Extracted raw text string
 */
export async function extractTextFromImage(
  imageFile: File,
  onProgress?: OcrProgressCallback
): Promise<string> {
  // Dynamic import keeps Tesseract.js out of the initial bundle
  const Tesseract = await import("tesseract.js");

  const result = await Tesseract.recognize(imageFile, "eng", {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  const text = result.data.text.trim();

  if (!text) {
    throw new Error(
      "No text could be extracted from the image. " +
      "Try a clearer image with good contrast and lighting."
    );
  }

  return text;
}

// ─────────────────────────────────────────────────────────────
// TODO (mock): During offline development you can swap the
// export above with this mock to skip real OCR:
//
// export async function extractTextFromImage(
//   _imageFile: File,
//   onProgress?: OcrProgressCallback
// ): Promise<string> {
//   for (let i = 0; i <= 100; i += 20) {
//     onProgress?.(i);
//     await new Promise(r => setTimeout(r, 80));
//   }
//   return "The mitochondria is the powerhouse of the cell. " +
//          "Photosynthesis converts sunlight into glucose.";
// }
// ─────────────────────────────────────────────────────────────

import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createWorker } from "tesseract.js";

import type { ExtractedPage } from "@/lib/extract";

export type OcrResult = {
  text: string;
  pages: ExtractedPage[];
  runtime: "node";
};

// Resume CVs are commonly Indonesian; default to ind+eng. Higher render scale
// = sharper glyphs = better OCR (at more memory/time).
// ponytail: knobs — turunkan OCR_SCALE bila memori/lambat.
const OCR_LANGS = process.env.OCR_LANGS ?? "ind+eng";
const OCR_SCALE = Number(process.env.OCR_SCALE ?? 3);

function newWorker() {
  return createWorker(OCR_LANGS, undefined, {
    langPath: process.env.TESSERACT_LANG_PATH,
  });
}

/**
 * Node OCR path for a single image (jpg/png): tesseract.js runs directly on
 * the image bytes — no PDF rendering needed.
 */
export async function ocrImageWithNode(imageBuffer: Buffer): Promise<OcrResult> {
  const worker = await newWorker();
  try {
    const { data } = await worker.recognize(imageBuffer);
    const text = data.text.trim();
    return { text, pages: [{ page: 1, text }], runtime: "node" };
  } finally {
    await worker.terminate();
  }
}

/**
 * Node OCR path: renders each PDF page to an image (pdfjs + @napi-rs/canvas)
 * and runs tesseract.js (WASM) on it. No system dependencies.
 */
export async function ocrPdfWithNode(pdfBuffer: Buffer): Promise<OcrResult> {
  const task = getDocument({ data: new Uint8Array(pdfBuffer) });
  const doc = await task.promise;
  const worker = await newWorker();
  const pages: ExtractedPage[] = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: OCR_SCALE });
      const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
      const ctx = canvas.getContext("2d");
      await page
        .render({
          canvas: null,
          canvasContext: ctx as unknown as CanvasRenderingContext2D,
          viewport,
        })
        .promise;
      const { data } = await worker.recognize(canvas.toBuffer("image/png"));
      pages.push({ page: i, text: data.text.trim() });
    }
  } finally {
    await worker.terminate();
  }
  const text = pages.map((p) => p.text).join("\n");
  return { text, pages, runtime: "node" };
}

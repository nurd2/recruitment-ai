import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

import type { ExtractedPage } from "@/lib/extract";

const execFileAsync = promisify(execFile);

export type OcrResult = {
  text: string;
  pages: ExtractedPage[];
  runtime: "python";
};

const WORKER_PATH = path.join(process.cwd(), "workers", "ocr-python", "ocr_worker.py");
const PYTHON_CMD = process.env.OCR_PYTHON_CMD ?? ".venv/bin/python";

/**
 * Python OCR path: delegates to workers/ocr-python/ocr_worker.py
 * (pypdfium2 + pytesseract). Requires a local tesseract binary.
 * Returns the same shape as the Node path so callers are agnostic.
 */
export async function ocrPdfWithPython(pdfPath: string): Promise<OcrResult> {
  const { stdout } = await execFileAsync(PYTHON_CMD, [WORKER_PATH, pdfPath], {
    maxBuffer: 64 * 1024 * 1024,
  });
  const parsed = JSON.parse(stdout) as { pages: ExtractedPage[] };
  const text = parsed.pages.map((p) => p.text).join("\n");
  return { text, pages: parsed.pages, runtime: "python" };
}

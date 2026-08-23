import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { ExtractedPage } from "@/lib/extract";
import { ocrImageWithNode, ocrPdfWithNode } from "@/lib/ocr/tesseract";
import { ocrPdfWithPython } from "@/lib/ocr/python";

export type OcrResult = {
  text: string;
  pages: ExtractedPage[];
  runtime: "node" | "python";
};

/**
 * OCR a scanned PDF using the runtime selected by OCR_RUNTIME=node|python.
 * The node runtime is self-contained (tesseract.js); the python runtime
 * delegates to workers/ocr-python (pytesseract) for better accuracy.
 */
export async function runOcr(
  buffer: Buffer,
  mimeType = "application/pdf",
): Promise<OcrResult> {
  // Images always go through the node runtime (python worker is PDF-only).
  if (mimeType.startsWith("image/")) return ocrImageWithNode(buffer);

  const pdfBuffer = buffer;
  const runtime = process.env.OCR_RUNTIME ?? "node";
  if (runtime === "python") {
    const dir = await mkdtemp(path.join(tmpdir(), "ocr-"));
    try {
      const pdfPath = path.join(dir, "input.pdf");
      await writeFile(pdfPath, pdfBuffer);
      return await ocrPdfWithPython(pdfPath);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
  return ocrPdfWithNode(pdfBuffer);
}

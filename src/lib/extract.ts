import { pathToFileURL } from "node:url";
import path from "node:path";

import mammoth from "mammoth";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export type ExtractedPage = { page: number; text: string };

export type ExtractionResult = {
  text: string;
  pages: ExtractedPage[];
  totalPages: number;
};

const standardFontsUrl = pathToFileURL(
  `${path.join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts")}/`,
).href;

/**
 * A scanned / image-only document yields very little text per page.
 * Below these thresholds we consider the text layer insufficient and OCR.
 */
export function isScannedText(result: ExtractionResult): boolean {
  if (result.text.trim().length < 120) return true;
  if (result.totalPages > 0 && result.text.trim().length / result.totalPages < 40) {
    return true;
  }
  return false;
}

export async function extractTextFromPdf(buffer: Buffer): Promise<ExtractionResult> {
  const task = getDocument({
    data: new Uint8Array(buffer),
    standardFontDataUrl: standardFontsUrl,
    disableFontFace: true,
  });
  const doc = await task.promise;
  const pages: ExtractedPage[] = [];
  const texts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? (item as { str: string }).str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push({ page: i, text: pageText });
    texts.push(pageText);
  }
  return { text: texts.join("\n"), pages, totalPages: doc.numPages };
}

export async function extractTextFromDocx(buffer: Buffer): Promise<ExtractionResult> {
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value.trim(), pages: [], totalPages: 1 };
}

export async function extractText(
  buffer: Buffer,
  mimeType: string,
): Promise<ExtractionResult> {
  if (mimeType === "application/pdf") return extractTextFromPdf(buffer);
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    return extractTextFromDocx(buffer);
  }
  // Images have no text layer: return empty so isScannedText() triggers OCR.
  if (mimeType.startsWith("image/")) {
    return { text: "", pages: [], totalPages: 1 };
  }
  throw new Error(`UNSUPPORTED_MIME: ${mimeType}`);
}

import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { extractText, isScannedText } from "@/lib/extract";

describe("text extraction", () => {
  it("extracts the text layer from a PDF", async () => {
    const buffer = await readFile("tests/fixtures/resume.pdf");
    const result = await extractText(buffer, "application/pdf");
    expect(result.totalPages).toBe(1);
    expect(result.text).toContain("JANE DOE");
    expect(result.text).toContain("jane.doe@example.com");
    expect(isScannedText(result)).toBe(false);
  });
});

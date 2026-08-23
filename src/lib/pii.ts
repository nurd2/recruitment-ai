/**
 * PII handling for external AI providers.
 *
 * Privacy rule: address, date-of-birth/age, and phone are masked before text
 * is sent to external providers. Email/phone are still captured for the
 * candidate record and dedup via local (regex) extraction from the raw text.
 */

export const DEFAULT_MASKED_FIELDS = ["address", "dateOfBirth", "phone"];

export function extractEmail(text: string): string | null {
  const match = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  return match ? match[0].toLowerCase() : null;
}

export function extractPhone(text: string): string | null {
  // Match digit runs with common separators (+62, 08xx, spaces/dashes/parens),
  // then keep the first whose digit count looks like a real phone (9-15).
  // The length filter rejects year ranges and other stray number sequences.
  const candidates = text.match(/\+?\d[\d\s().-]{7,16}\d/g) ?? [];
  for (const c of candidates) {
    const digits = c.replace(/\D/g, "");
    if (digits.length >= 9 && digits.length <= 15) {
      return c.trim().replace(/[\s().-]/g, "");
    }
  }
  return null;
}

export function redactPii(text: string, maskedFields: string[]): string {
  let out = text;
  if (maskedFields.includes("phone")) {
    out = out.replace(/\+?\d[\d\s().-]{7,}\d/g, "[PHONE]");
  }
  if (maskedFields.includes("dateOfBirth") || maskedFields.includes("age")) {
    out = out.replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, "[DOB]");
  }
  if (maskedFields.includes("address")) {
    out = out
      .split("\n")
      .map((line) => {
        if (
          /(street|st\.?|road|rd\.?|avenue|ave\.?|boulevard|blvd|drive|dr\.?|lane|ln\.?|jalan|jl\.?|rt\.?|rw\.?|kecamatan|kelurahan|village|city|zip|postal|kode pos)/i.test(
            line,
          )
        ) {
          return "[ADDRESS]";
        }
        return line;
      })
      .join("\n");
  }
  return out;
}

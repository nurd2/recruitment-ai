import { completeJson } from "@/lib/ai";
import { extractEmail, extractPhone, redactPii } from "@/lib/pii";
import {
  aiValidationSchema,
  type aiValidationSchema as validationSchemaType,
} from "@/lib/validation";
import type { z } from "zod";

const SYSTEM_PROMPT = `You extract and validate structured candidate data from a resume.

Return a single JSON object with exactly these top-level keys:
- "fields": the extracted candidate data
- "fieldMeta": an object mapping each field name to {source, confidence, evidence, page, status}
- "conflicts": array of {field, message} for contradictory values
- "fieldsRequiringReview": array of field names that need a human recruiter to verify

Field schema for "fields":
{
  "fullName": string|null,
  "email": string|null,
  "phone": string|null,
  "location": string|null,
  "dateOfBirth": string|null (ISO yyyy-mm-dd),
  "profileSummary": string|null,
  "education": [{"institution": string, "degree"?: string, "field"?: string, "startYear"?: number, "endYear"?: number}],
  "workExperience": [{"company": string, "title": string, "startDate"?: string, "endDate"?: string, "description"?: string}],
  "skills": string[],
  "certifications": string[],
  "languages": string[],
  "links": string[],
  "totalYearsExperience": number|null
}

Rules:
- Use null for missing values. NEVER invent, guess, or fabricate values.
- fullName: the candidate's name, usually the most prominent line in the header.
- location: extract the city/region/country even when no street address is given (e.g. "Jakarta, ID" -> "Jakarta, Indonesia"). Do not require a full address.
- Resumes may be in Indonesian. Handle Indonesian phone formats (+62..., 0812..., with spaces/dashes), Indonesian month names, and dd/mm/yyyy dates. Normalize dateOfBirth to ISO yyyy-mm-dd.
- education.degree: normalize to ONE canonical token: SD, SMP, SMA, D1, D2, D3, D4, S1, S2, S3 (e.g. "Bachelor of Computer Science" -> degree "S1", field "Computer Science"; "Magister Manajemen" -> "S2"). Keep the study program in "field".
- When the degree word is NOT stated but the institution implies a level, infer it: "Universitas / Institut / Sekolah Tinggi" (with a study program) -> "S1"; "Politeknik / Akademi" -> "D3". An explicit degree always wins over this fallback (Magister/Master -> S2, Doktor/PhD -> S3). Do NOT infer a level for a plain "SMA/SMK" or when no institution/program is given.
- For an inferred degree (not literally written), set that education entry's fieldMeta to source "ai" and status "needs_review" so a recruiter verifies it. This inference is standard normalization, not fabrication.
- Derive totalYearsExperience from the work experience entries only.
- source is "resume" when the value is directly in the text, "ai" when normalized/inferred.
- status is one of confirmed, draft, unknown, needs_review.
- confidence is a number 0..1 and is REQUIRED for every field you populate (never omit it).
- page is the source page number when identifiable, else omit.
- evidence is a short verbatim quote from the text, when available.`;

export type AiValidationOutput = z.infer<typeof validationSchemaType>;

export async function runAiValidation(input: {
  rawText: string;
  maskedFields: string[];
}): Promise<{ output: AiValidationOutput; provider: string; model: string }> {
  const userPrompt = `Resume text:\n${redactPii(input.rawText, input.maskedFields)}`;
  const { data, provider, model } = await completeJson(
    {
      system: SYSTEM_PROMPT,
      user: userPrompt,
    },
    "validate",
  );

  const parsed = aiValidationSchema.safeParse(data);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`AI_SCHEMA_INVALID: ${detail}`);
  }
  return { output: parsed.data, provider, model };
}

/**
 * Email/phone are masked before hitting the provider (privacy rule) but are
 * still captured locally so the candidate record and dedup keep working.
 */
export function mergeLocalContacts(
  output: AiValidationOutput,
  rawText: string,
): AiValidationOutput {
  const email = extractEmail(rawText);
  const phone = extractPhone(rawText);
  const meta = { ...output.fieldMeta };
  // Only backfill when the model left the field empty — don't clobber a value
  // the model already extracted (and its richer confidence) with a blind 0.9.
  if (email && !output.fields.email) {
    output.fields.email = email;
    meta.email = { source: "resume", status: "draft", confidence: 0.9 };
  }
  if (phone && !output.fields.phone) {
    output.fields.phone = phone;
    meta.phone = { source: "resume", status: "draft", confidence: 0.9 };
  }
  output.fieldMeta = meta;
  return output;
}

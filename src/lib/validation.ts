import { z } from "zod";

import { STATUS_COLORS } from "@/lib/status-colors";

/* ------------------------------------------------------------------ */
/* Domain input schemas (form + server action validation)              */
/* ------------------------------------------------------------------ */

export const competencySchema = z.object({
  name: z.string().trim().min(1).max(200),
  required: z.boolean().default(false),
});

export const jobTitleInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(10000).optional().default(""),
  competencies: z.array(competencySchema).default([]),
  minYearsExperience: z.coerce.number().min(0).max(100).default(0),
  minEducation: z.string().max(200).optional().default(""),
  location: z.string().max(200).optional().default(""),
  workType: z.string().max(100).optional().default(""),
  workArrangement: z.string().max(100).optional().default(""),
  language: z.string().max(100).optional().default(""),
});

export const statusInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

import { RESUME_SOURCES } from "@/lib/resume-sources";
export const statusColorSchema = z.object({
  color: z.enum(STATUS_COLORS),
});

export const resumeSourceSchema = z.enum(RESUME_SOURCES);

export const candidateEditSchema = z.object({
  fullName: z.string().trim().max(300).optional().default(""),
  email: z.string().trim().max(300).optional().default(""),
  phone: z.string().trim().max(100).optional().default(""),
  dateOfBirth: z.string().optional().default(""),
  location: z.string().trim().max(300).optional().default(""),
  profileSummary: z.string().max(10000).optional().default(""),
  skills: z.array(z.string().trim().max(200)).default([]),
  certifications: z.array(z.string().trim().max(200)).default([]),
  languages: z.array(z.string().trim().max(100)).default([]),
  links: z.array(z.string().trim().max(500)).default([]),
  totalYearsExperience: z.coerce.number().min(0).max(100).optional().default(0),
});

export const aiConfigInputSchema = z
  .object({
    provider: z.enum(["openai", "deepseek", "gemini", "anthropic", "openai_compatible"]),
    name: z.string().trim().min(1).max(200),
    // Required for openai_compatible (custom); preset base URLs for named providers.
    baseUrl: z
      .union([z.string().url(), z.literal("")])
      .optional()
      .default(""),
    model: z.string().trim().min(1).max(200),
    // Plaintext key entered in the admin UI; encrypted at rest before storage.
    apiKey: z.string().trim().max(2000).optional().default(""),
    // Legacy: env var name reference (no DB key).
    enabled: z.boolean().default(true),
    isDefault: z.boolean().default(false),
    fallbackEnabled: z.boolean().default(false),
    masking: z.array(z.string().trim().max(100)).default([]),
  })
  .superRefine((val, ctx) => {
    if (val.provider === "openai_compatible" && !val.baseUrl) {
      ctx.addIssue({
        code: "custom",
        path: ["baseUrl"],
        message: "Custom (OpenAI-compatible) providers require a base URL.",
      });
    }
  });

/* ------------------------------------------------------------------ */
/* Shared candidate JSON shapes (mirrored in schema.ts types)          */
/* ------------------------------------------------------------------ */

export const educationEntrySchema = z.object({
  institution: z.string().trim().max(300),
  degree: z.string().trim().max(300).optional(),
  field: z.string().trim().max(300).optional(),
  startYear: z.number().int().min(1900).max(2100).optional(),
  endYear: z.number().int().min(1900).max(2100).optional(),
});

export const workExperienceEntrySchema = z.object({
  company: z.string().trim().max(300),
  title: z.string().trim().max(300),
  startDate: z.string().trim().max(100).optional(),
  endDate: z.string().trim().max(100).optional(),
  description: z.string().trim().max(5000).optional(),
});

// Models frequently return `null` for an empty array instead of omitting the
// key or sending []. `.default([])` only covers a MISSING key, so coerce
// null/undefined → [] to keep valid extractions from failing schema parse.
const arrayOrEmpty = <T extends z.ZodTypeAny>(item: T) =>
  z
    .array(item)
    .nullish()
    .transform((v) => v ?? []);

export const candidateFieldsSchema = z.object({
  fullName: z.string().trim().max(300).nullable().optional(),
  email: z.string().trim().max(300).nullable().optional(),
  phone: z.string().trim().max(100).nullable().optional(),
  location: z.string().trim().max(300).nullable().optional(),
  dateOfBirth: z.string().trim().max(50).nullable().optional(),
  profileSummary: z.string().max(10000).nullable().optional(),
  education: arrayOrEmpty(educationEntrySchema),
  workExperience: arrayOrEmpty(workExperienceEntrySchema),
  skills: arrayOrEmpty(z.string().trim().max(200)),
  certifications: arrayOrEmpty(z.string().trim().max(200)),
  languages: arrayOrEmpty(z.string().trim().max(100)),
  links: arrayOrEmpty(z.string().trim().max(500)),
  totalYearsExperience: z.number().min(0).max(100).nullable().optional(),
});

/* ------------------------------------------------------------------ */
/* AI output schemas (schema-validated before persistence)             */
/* ------------------------------------------------------------------ */

export const fieldMetaSchema = z.object({
  // Models occasionally emit source/status values outside our vocabulary
  // (e.g. "unknown", "local"). Fall back instead of failing the whole parse.
  source: z.enum(["resume", "ai", "manual"]).catch("ai"),
  confidence: z.number().min(0).max(1).optional(),
  evidence: z
    .string()
    .max(2000)
    .nullable()
    .transform((value) => value ?? undefined)
    .optional(),
  page: z.number().int().min(0).optional(),
  status: z.enum(["confirmed", "draft", "unknown", "needs_review"]).catch("draft"),
});

export const conflictSchema = z.object({
  field: z.string().max(200),
  message: z.string().max(1000),
});

/** Single AI call that extracts AND validates structured candidate data. */
export const aiValidationSchema = z.object({
  fields: candidateFieldsSchema,
  fieldMeta: z.record(z.string(), fieldMetaSchema).default({}),
  conflicts: z.array(conflictSchema).default([]),
  fieldsRequiringReview: z.array(z.string().max(200)).default([]),
});

/** Single job-title recommendation from AI. */
export const aiRecommendationSchema = z.object({
  jobTitleId: z.string().max(100),
  explanation: z.string().max(2000),
  matchedCompetencies: z.array(z.string().max(200)).default([]),
  experienceFit: z.string().max(500).optional().default(""),
  educationFit: z.string().max(500).optional().default(""),
  unmetRequirements: z.array(z.string().max(500)).default([]),
  score: z.number().min(0).max(1),
});

export const aiRecommendationsSchema = z.object({
  recommendations: z.array(aiRecommendationSchema).default([]),
});

export const aiJobTitleAutofillSchema = z.object({
  description: z.string().max(10000).default(""),
  competencies: z.array(competencySchema).max(50).default([]),
  minYearsExperience: z.number().min(0).max(100).default(0),
  minEducation: z.string().max(200).default(""),
  location: z.string().max(200).default(""),
  workType: z.string().max(100).default(""),
  workArrangement: z.string().max(100).default(""),
  language: z.string().max(100).default(""),
});

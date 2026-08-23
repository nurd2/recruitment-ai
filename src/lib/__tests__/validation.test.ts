import { describe, expect, it } from "vitest";

import { mockResult } from "@/lib/ai/mock";
import { aiRecommendationsSchema, aiValidationSchema } from "@/lib/validation";

describe("AI output schemas (FR-AI-004)", () => {
  it("accepts the mock validation output", () => {
    const parsed = aiValidationSchema.safeParse(mockResult("validate", ""));
    expect(parsed.success).toBe(true);
  });

  it("accepts null evidence from providers", () => {
    const parsed = aiValidationSchema.safeParse({
      fields: {},
      fieldMeta: {
        fullName: {
          source: "resume",
          confidence: 0.8,
          evidence: null,
          status: "draft",
        },
      },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.fieldMeta.fullName.evidence).toBeUndefined();
    }
  });

  it("accepts the mock recommendations output and maps job titles", () => {
    const data = mockResult(
      "recommend",
      JSON.stringify({ jobTitles: [{ id: "title-1" }] }),
    );
    const parsed = aiRecommendationsSchema.safeParse(data);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.recommendations[0].jobTitleId).toBe("title-1");
    }
  });

  it("rejects malformed AI output", () => {
    const parsed = aiValidationSchema.safeParse({ fields: { fullName: 42 } });
    expect(parsed.success).toBe(false);
  });
});

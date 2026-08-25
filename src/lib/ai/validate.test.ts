import { describe, expect, it } from "vitest";

import { normalizeAiFields } from "@/lib/ai/validate";
import { aiValidationSchema } from "@/lib/validation";

describe("AI validation output", () => {
  it("accepts a work experience entry with a missing title", () => {
    const result = aiValidationSchema.safeParse(
      normalizeAiFields({
      fields: {
        workExperience: [{ company: "Example Corp" }, { company: "Second Corp", title: "" }],
      },
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fields.workExperience[0].title).toBe("");
    }
  });
});
import { describe, expect, it } from "vitest";

import {
  educationRank,
  highestEducationLevel,
  normalizeEducationLevel,
} from "@/lib/education";

describe("education levels", () => {
  it("normalizes common OCR and resume aliases", () => {
    expect(normalizeEducationLevel("Bachelor's degree in Computer Science")).toBe("S1");
    expect(normalizeEducationLevel("Master of Business Administration")).toBe("S2");
    expect(normalizeEducationLevel("Ph.D. in Engineering")).toBe("S3");
  });

  it("returns the highest level from education entries", () => {
    expect(
      highestEducationLevel([
        { degree: "S1", field: "Computer Science" },
        { degree: "Master's degree", field: "Management" },
      ]),
    ).toBe("S2");
    expect(educationRank("S2")).toBeGreaterThan(educationRank("S1")!);
  });
});
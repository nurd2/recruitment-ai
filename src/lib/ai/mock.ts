/**
 * Deterministic mock AI output, enabled with AI_MOCK=true.
 * Lets the whole pipeline run offline (dev/test) without any API key.
 */
export function mockResult(
  kind: "validate" | "recommend" | "autofill",
  userPrompt: string,
): unknown {
  if (kind === "autofill") {
    let title = "the role";
    try {
      title = (JSON.parse(userPrompt) as { title?: string }).title ?? title;
    } catch {
      // ignore parse errors
    }
    return {
      description: `We are looking for a ${title} to build reliable, user-focused products with a collaborative team.`,
      competencies: [
        { name: "Communication", required: true },
        { name: "Problem solving", required: true },
        { name: "Relevant domain experience", required: false },
      ],
      minYearsExperience: 3,
      minEducation: "S1",
      location: "",
      workType: "Full-time",
      workArrangement: "Hybrid",
      language: "English",
    };
  }

  if (kind === "recommend") {
    let jobTitleId = "";
    try {
      const parsed = JSON.parse(userPrompt) as { jobTitles?: { id: string }[] };
      jobTitleId = parsed.jobTitles?.[0]?.id ?? "";
    } catch {
      // ignore parse errors
    }
    if (!jobTitleId) return { recommendations: [] };
    return {
      recommendations: [
        {
          jobTitleId,
          explanation: "Mock decision support only. Matches required competencies and experience.",
          matchedCompetencies: ["React", "TypeScript"],
          experienceFit: "4 years meets the minimum requirement",
          educationFit: "Bachelor's degree meets the minimum requirement",
          unmetRequirements: [],
          score: 0.82,
        },
      ],
    };
  }

  return {
    fields: {
      fullName: "Mock Candidate",
      email: "mock.candidate@example.com",
      phone: "628123456789",
      location: "Jakarta",
      dateOfBirth: null,
      profileSummary: "Sample profile produced by the offline mock provider.",
      education: [
        {
          institution: "University of Testing",
          degree: "Bachelor",
          field: "Computer Science",
          startYear: 2015,
          endYear: 2019,
        },
      ],
      workExperience: [
        {
          company: "Mock Corp",
          title: "Software Engineer",
          startDate: "2019",
          endDate: "2023",
          description: "Built web applications.",
        },
      ],
      skills: ["React", "TypeScript", "PostgreSQL"],
      certifications: [],
      languages: ["English", "Indonesian"],
      links: [],
      totalYearsExperience: 4,
    },
    fieldMeta: {
      fullName: { source: "ai", confidence: 0.95, status: "confirmed" },
      email: { source: "ai", confidence: 0.98, status: "confirmed" },
      phone: { source: "ai", confidence: 0.9, status: "confirmed" },
      location: { source: "ai", confidence: 0.8, status: "draft" },
      dateOfBirth: { source: "ai", confidence: 0.2, status: "needs_review" },
      profileSummary: { source: "ai", confidence: 0.8, status: "draft" },
    },
    conflicts: [],
    fieldsRequiringReview: ["dateOfBirth"],
  };
}

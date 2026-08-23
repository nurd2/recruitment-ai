import { completeJson } from "@/lib/ai";
import {
  aiRecommendationsSchema,
  type candidateFieldsSchema as candidateFieldsType,
} from "@/lib/validation";
import {
  educationRank,
  highestEducationLevel,
  normalizeEducationLevel,
} from "@/lib/education";
import {
  arrangementFromLegacyLocation,
  locationWithoutArrangement,
} from "@/lib/work-arrangement";
import type { z } from "zod";

type CandidateFields = z.infer<typeof candidateFieldsType>;

export type RecommendableJobTitle = {
  id: string;
  title: string;
  description?: string;
  competencies: { name: string; required: boolean }[];
  minYearsExperience?: number;
  minEducation?: string;
  location?: string;
  workArrangement?: string;
};

const SYSTEM_PROMPT = `You are a decision-support assistant for recruiters. You NEVER make hiring decisions.

Given a candidate profile and a list of open job titles (each with an id and hiring criteria), recommend the most suitable job titles.

Return a single JSON object:
{ "recommendations": [ { "jobTitleId": string, "explanation": string, "matchedCompetencies": string[], "experienceFit": string, "educationFit": string, "unmetRequirements": string[], "score": number } ] }

Rules:
- "jobTitleId" MUST exactly match one of the provided ids.
- Compare education using the canonical levels SD, SMP, SMA, D1, D2, D3, D4, S1, S2, S3.
- A candidate below "minEducation" must have that gap listed in "unmetRequirements".
- Missing education must be treated as unverified, not as a match.
- Use workArrangement (On-site, Hybrid, Remote, or Flexible) as job context. Do not infer a candidate's work-mode preference when the resume does not state one.
- Keep location and workArrangement separate: location is geographic; workArrangement is the work mode. Legacy suffixes such as "(hybrid)" belong to workArrangement, not location.
- score is 0..1 and is DECISION SUPPORT ONLY — label it clearly in the explanation.
- Do NOT use age, address, contact details, or any demographic data for scoring.
- Return at most 5 recommendations. If none fit, return an empty array.
- "unmetRequirements" lists concrete criteria from the job description the candidate does not meet.`;

/**
 * Build a masked candidate profile for recommendation: no name, contacts,
 * age, or address — these must never drive scoring (responsible-AI rule).
 */
export function maskProfileForScoring(fields: CandidateFields) {
  return {
    profileSummary: fields.profileSummary ?? null,
    education: fields.education ?? [],
    workExperience: fields.workExperience ?? [],
    skills: fields.skills ?? [],
    certifications: fields.certifications ?? [],
    languages: fields.languages ?? [],
    totalYearsExperience: fields.totalYearsExperience ?? null,
  };
}

export async function runAiRecommendations(input: {
  fields: CandidateFields;
  jobTitles: RecommendableJobTitle[];
}): Promise<{
  recommendations: z.infer<typeof aiRecommendationsSchema>["recommendations"];
  provider: string;
  model: string;
}> {
  if (input.jobTitles.length === 0) {
    return { recommendations: [], provider: "none", model: "none" };
  }

  const userPrompt = JSON.stringify({
    candidate: {
      ...maskProfileForScoring(input.fields),
      highestEducationLevel: highestEducationLevel(input.fields.education),
    },
    jobTitles: input.jobTitles.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description ?? "",
      requiredCompetencies: t.competencies
        .filter((c) => c.required)
        .map((c) => c.name),
      minYearsExperience: t.minYearsExperience ?? 0,
      minEducation: t.minEducation ?? "",
      minEducationLevel: normalizeEducationLevel(t.minEducation),
      location: locationWithoutArrangement(t.location),
      workArrangement:
        t.workArrangement ?? arrangementFromLegacyLocation(t.location) ?? "",
    })),
  });

  const { data, provider, model } = await completeJson(
    {
      system: SYSTEM_PROMPT,
      user: userPrompt,
    },
    "recommend",
  );

  const parsed = aiRecommendationsSchema.safeParse(data);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`AI_SCHEMA_INVALID: ${detail}`);
  }

  const jobTitleById = new Map(input.jobTitles.map((title) => [title.id, title]));
  const candidateEducationLevel = highestEducationLevel(input.fields.education);
  const candidateEducationRank = educationRank(candidateEducationLevel);
  const recommendations = parsed.data.recommendations
    .filter((recommendation) => jobTitleById.has(recommendation.jobTitleId))
    .map((recommendation) => {
      const title = jobTitleById.get(recommendation.jobTitleId)!;
      const minimumLevel = normalizeEducationLevel(title.minEducation);
      const minimumRank = educationRank(minimumLevel);
      if (!minimumRank || (candidateEducationRank && candidateEducationRank >= minimumRank)) {
        return recommendation;
      }

      const educationGap = candidateEducationRank
        ? `Minimum education ${minimumLevel} is above the candidate's ${candidateEducationLevel}.`
        : `Minimum education ${minimumLevel} could not be verified from the resume.`;
      return {
        ...recommendation,
        educationFit: recommendation.educationFit || educationGap,
        unmetRequirements: recommendation.unmetRequirements.includes(educationGap)
          ? recommendation.unmetRequirements
          : [...recommendation.unmetRequirements, educationGap],
      };
    });

  return { recommendations, provider, model };
}

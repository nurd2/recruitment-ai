import { completeJson } from "@/lib/ai";
import { aiJobTitleAutofillSchema } from "@/lib/validation";

const SYSTEM_PROMPT = `You help recruiters draft job title hiring criteria. Return only one JSON object with these keys:
{ "description": string, "competencies": [{ "name": string, "required": boolean }], "minYearsExperience": number, "minEducation": string, "location": string, "workType": string, "workArrangement": string, "language": string }

Rules:
- Use the job title and recruiter's custom instructions as context.
- Write a concise, practical job description.
- Return 3-12 relevant competencies and mark core requirements as required.
- Use a numeric minimum experience from 0 to 100.
- Use canonical education values when appropriate: SD, SMP, SMA, D1, D2, D3, D4, S1, S2, S3.
- Use workType such as Full-time, Part-time, Contract, Freelance, Internship, Temporary, or Volunteer when applicable.
- Use workArrangement such as On-site, Hybrid, Remote, or Flexible when applicable; otherwise return an empty string.
- Do not invent a specific location unless the recruiter asks for one.`;

export async function runAiJobTitleAutofill(input: { title: string; prompt: string }) {
  const { data, provider, model } = await completeJson(
    {
      system: SYSTEM_PROMPT,
      user: JSON.stringify(input),
    },
    "autofill",
  );
  const parsed = aiJobTitleAutofillSchema.safeParse(data);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`AI_SCHEMA_INVALID: ${detail}`);
  }
  return { ...parsed.data, provider, model };
}

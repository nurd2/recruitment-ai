import { callProvider, type AiPrompt } from "@/lib/ai/providers";
import { resolveAiConfigs } from "@/lib/ai/config";
import { mockResult } from "@/lib/ai/mock";

export type JsonResult = {
  data: unknown;
  provider: string;
  model: string;
};

/**
 * Run a JSON completion against the configured primary provider with
 * bounded fallback (only when the admin has enabled a fallback provider).
 * Returns the parsed JSON plus provider/model metadata for auditability
 * (FR-AI-003). Provider failures surface as thrown errors with a safe,
 * actionable message.
 */
export async function completeJson(
  prompt: AiPrompt,
  kind: "validate" | "recommend" | "autofill",
): Promise<JsonResult> {
  if (process.env.AI_MOCK === "true") {
    return { data: mockResult(kind, prompt.user), provider: "mock", model: "mock" };
  }
  const { primary, fallback } = await resolveAiConfigs();
  try {
    const data = await callProvider(primary, prompt);
    return { data, provider: primary.provider, model: primary.model };
  } catch (primaryError) {
    if (!fallback) throw primaryError;
    try {
      const data = await callProvider(fallback, prompt);
      return { data, provider: fallback.provider, model: fallback.model };
    } catch {
      throw primaryError;
    }
  }
}

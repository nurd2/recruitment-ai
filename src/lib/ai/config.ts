import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { aiConfigs } from "@/db/schema";
import { decryptSecret } from "@/lib/ai/secrets";
import type { AiProviderName } from "@/lib/ai/providers-meta";
import type { ResolvedAiConfig } from "@/lib/ai/providers";

/**
 * Resolve a stored row's credentials: an AES-256-GCM encrypted key
 * (api_key_enc) is decrypted at runtime. Decryption failures propagate so the
 * operator sees an actionable APP_ENCRYPTION_KEY error instead of a silent
 * empty key.
 */
function fromRow(row: typeof aiConfigs.$inferSelect): ResolvedAiConfig {
  let apiKey = "";
  if (row.apiKeyEnc) {
    apiKey = decryptSecret(row.apiKeyEnc);
  }
  return {
    provider: row.provider as AiProviderName,
    model: row.model,
    baseUrl: row.baseUrl ?? undefined,
    apiKey,
  };
}

export type AiConfigPair = {
  primary: ResolvedAiConfig;
  fallback?: ResolvedAiConfig;
};

/**
 * Resolve the AI provider config: Admin-managed rows from `ai_configs`
 * (fallback only when enabled). API keys are decrypted at runtime from the
 * encrypted-at-rest value.
 */
export async function resolveAiConfigs(): Promise<AiConfigPair> {
  let rows: typeof aiConfigs.$inferSelect[];
  try {
    rows = await db
      .select()
      .from(aiConfigs)
      .where(eq(aiConfigs.enabled, true))
      .orderBy(asc(aiConfigs.createdAt));
  } catch {
    throw new Error("AI_PROVIDER_DATABASE_UNAVAILABLE");
  }

  if (rows.length === 0) throw new Error("AI_PROVIDER_NOT_CONFIGURED");

  const defaultRow = rows.find((r) => r.isDefault) ?? rows[0];
  const primary = fromRow(defaultRow);

  const fallbackRow = rows.find(
    (r) => r.fallbackEnabled && r.id !== defaultRow.id && r.enabled,
  );
  const fallback = fallbackRow ? fromRow(fallbackRow) : undefined;

  return { primary, fallback };
}

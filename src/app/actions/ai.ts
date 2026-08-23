"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { aiConfigs } from "@/db/schema";
import { requireAdmin } from "@/lib/authz";
import { runAction } from "@/lib/action-result";
import { recordAudit } from "@/lib/audit";
import { decryptSecret, encryptSecret } from "@/lib/ai/secrets";
import { PRESET_BASE_URLS } from "@/lib/ai/providers-meta";
import { testProvider } from "@/lib/ai/providers";
import type { ResolvedAiConfig } from "@/lib/ai/providers";
import { aiConfigInputSchema } from "@/lib/validation";

export type AiConfigInput = z.infer<typeof aiConfigInputSchema> & { id?: string };

export async function upsertAiConfigAction(input: AiConfigInput) {
  return runAction(async () => {
    const actor = await requireAdmin();
    const parsed = aiConfigInputSchema.parse(input);

    if (parsed.isDefault) {
      await db
        .update(aiConfigs)
        .set({ isDefault: false })
        .where(eq(aiConfigs.isDefault, true));
    }

    // Only replace the stored key when a new one is typed. Leaving the field
    // blank on edit keeps the existing encrypted key (apiKeyEnc untouched).
    let apiKeyEnc: string | null | undefined;
    if (parsed.apiKey) {
      apiKeyEnc = encryptSecret(parsed.apiKey);
    } else if (!input.id) {
      apiKeyEnc = null; // brand-new config without a key yet
    }

    const base = {
      provider: parsed.provider,
      name: parsed.name,
      baseUrl: parsed.baseUrl || null,
      model: parsed.model,
      enabled: parsed.enabled,
      isDefault: parsed.isDefault,
      fallbackEnabled: parsed.fallbackEnabled,
      masking: parsed.masking,
      updatedAt: new Date(),
    };

    let id = input.id;
    if (id) {
      const setData: Partial<typeof aiConfigs.$inferInsert> = { ...base };
      if (apiKeyEnc !== undefined) setData.apiKeyEnc = apiKeyEnc;
      await db.update(aiConfigs).set(setData).where(eq(aiConfigs.id, id));
    } else {
      const [row] = await db
        .insert(aiConfigs)
        .values({ ...base, apiKeyEnc: apiKeyEnc ?? null })
        .returning({ id: aiConfigs.id });
      id = row.id;
    }

    await recordAudit({
      actorId: actor.id,
      action: id ? "ai_config.update" : "ai_config.create",
      entityType: "ai_config",
      entityId: id,
      after: { provider: parsed.provider, model: parsed.model },
    });
    return { id };
  });
}

export async function deleteAiConfigAction(id: string) {
  return runAction(async () => {
    const actor = await requireAdmin();
    await db.delete(aiConfigs).where(eq(aiConfigs.id, id));
    await recordAudit({
      actorId: actor.id,
      action: "ai_config.delete",
      entityType: "ai_config",
      entityId: id,
    });
    return { id };
  });
}

/**
 * Non-blocking "Test connection": validates the submitted credentials by
 * sending a cheap request to the provider. When editing an existing config
 * without re-typing the key, the stored encrypted key is used for the test.
 */
export async function testAiConfigAction(input: AiConfigInput) {
  return runAction(async () => {
    await requireAdmin();
    const parsed = aiConfigInputSchema.parse(input);

    let apiKey = parsed.apiKey;
    if (!apiKey && input.id) {
      const [row] = await db
        .select()
        .from(aiConfigs)
        .where(eq(aiConfigs.id, input.id))
        .limit(1);
      if (row?.apiKeyEnc) apiKey = decryptSecret(row.apiKeyEnc);
    }
    if (!apiKey) {
      return {
        ok: false,
        message: "No API key set. Type a key above and test again.",
      };
    }

    const baseUrl =
      parsed.baseUrl ||
      (parsed.provider === "openai_compatible"
        ? undefined
        : PRESET_BASE_URLS[parsed.provider]);

    const config: ResolvedAiConfig = {
      provider: parsed.provider,
      model: parsed.model,
      baseUrl,
      apiKey,
    };
    const result = await testProvider(config);
    if (!result.ok) return { ok: false, message: result.message };
    return { ok: true, message: "Connection OK." };
  });
}

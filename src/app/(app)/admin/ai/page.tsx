import { asc } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db";
import { aiConfigs } from "@/db/schema";
import { requireAdmin } from "@/lib/authz";
import { AiAdmin, type AiConfigRow } from "@/components/app/ai-admin";

export const dynamic = "force-dynamic";

export default async function AdminAiPage() {
  try {
    await requireAdmin();
  } catch {
    notFound();
  }

  const rows = await db.select().from(aiConfigs).orderBy(asc(aiConfigs.createdAt));
  const configs: AiConfigRow[] = rows.map((c) => ({
    id: c.id,
    provider: c.provider,
    name: c.name,
    baseUrl: c.baseUrl,
    model: c.model,
    hasApiKey: Boolean(c.apiKeyEnc),
    enabled: c.enabled,
    isDefault: c.isDefault,
    fallbackEnabled: c.fallbackEnabled,
    masking: c.masking,
  }));

  return (
    <div className="grid max-w-3xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI configuration</h1>
        <p className="text-sm text-muted-foreground">
          Admin only. Choose OpenAI, DeepSeek, Gemini, Anthropic, or a custom
          OpenAI-compatible endpoint. API keys are AES-256-GCM encrypted at
          rest and never stored or displayed in plaintext.
        </p>
      </div>
      <AiAdmin configs={configs} />
    </div>
  );
}

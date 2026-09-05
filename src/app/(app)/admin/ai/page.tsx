import { asc } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db";
import { aiConfigs } from "@/db/schema";
import { requireAdminPage } from "@/lib/authz";
import { AiAdmin, type AiConfigRow } from "@/components/app/ai-admin";

export const dynamic = "force-dynamic";

export default async function AdminAiPage() {
  try {
    await requireAdminPage();
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

  return <AiAdmin configs={configs} />;
}

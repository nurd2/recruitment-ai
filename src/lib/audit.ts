import { db } from "@/db";
import { auditLogs } from "@/db/schema";

/**
 * Record an auditable change (actor + timestamp + before/after snapshot).
 * Call inside the same transaction when available; otherwise standalone.
 */
export async function recordAudit(input: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  await db.insert(auditLogs).values({
    actorId: input.actorId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    before: input.before === undefined ? null : input.before,
    after: input.after === undefined ? null : input.after,
  });
}

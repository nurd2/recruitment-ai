"use server";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  processingJobs,
  processingResults,
  recommendations,
} from "@/db/schema";
import { requireRole } from "@/lib/authz";
import { runAction } from "@/lib/action-result";
import { recordAudit } from "@/lib/audit";
import { shortId } from "@/lib/ids";
import { JOB_ATTEMPTS, documentQueue } from "@/worker/queue";

export async function retryProcessingAction(processingJobId: string) {
  return runAction(async () => {
    const actor = await requireRole("admin", "recruiter");
    const [job] = await db
      .select()
      .from(processingJobs)
      .where(eq(processingJobs.id, processingJobId));
    if (!job) throw new Error("PROCESSING_JOB_NOT_FOUND");

    await db
      .update(processingJobs)
      .set({
        state: "queued",
        stage: "extract",
        attempts: 0,
        lastError: null,
        startedAt: null,
        finishedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(processingJobs.id, processingJobId));

    await documentQueue.add(
      "process-document",
      {
        processingJobId: job.id,
        resumeDocumentId: job.resumeDocumentId,
        jobTitleId: job.jobTitleId,
      },
      {
        // A failed BullMQ job is retained by removeOnFail, so reusing the
        // original deterministic ID would return the old job instead of
        // enqueueing a retry.
        jobId: `doc-${job.resumeDocumentId}-retry-${shortId()}`,
        attempts: JOB_ATTEMPTS,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 500,
        removeOnFail: 500,
      },
    );

    await recordAudit({
      actorId: actor.id,
      action: "processing.retry",
      entityType: "processing_job",
      entityId: processingJobId,
    });
    return { processingJobId };
  });
}

/**
 * Delete a document's intake pipeline (processing job + result + its
 * recommendations) from the Uploads / Processing lists. The resume_document
 * itself is KEPT — a candidate created from it references it as their resume,
 * so this never affects candidate data. Deletes children first to respect the
 * NO-ACTION FKs. Recorded in the audit log.
 */
export async function deleteProcessingAction(resumeDocumentId: string) {
  return runAction(async () => {
    const actor = await requireRole("admin", "recruiter");

    await db
      .delete(recommendations)
      .where(eq(recommendations.resumeDocumentId, resumeDocumentId));
    await db
      .delete(processingResults)
      .where(eq(processingResults.resumeDocumentId, resumeDocumentId));
    await db
      .delete(processingJobs)
      .where(eq(processingJobs.resumeDocumentId, resumeDocumentId));

    await recordAudit({
      actorId: actor.id,
      action: "processing.delete",
      entityType: "resume_document",
      entityId: resumeDocumentId,
    });
    return { id: resumeDocumentId };
  });
}

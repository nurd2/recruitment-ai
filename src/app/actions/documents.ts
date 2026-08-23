"use server";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  processingJobs,
  processingResults,
  recommendations,
  resumeDocuments,
} from "@/db/schema";
import { requireRole } from "@/lib/authz";
import { runAction } from "@/lib/action-result";
import { recordAudit } from "@/lib/audit";
import { sha256 } from "@/lib/hash";
import { shortId } from "@/lib/ids";
import { uploadResume } from "@/lib/storage";
import { JOB_ATTEMPTS, documentQueue, type DocumentJob } from "@/worker/queue";

const MAX_SIZE = Number(process.env.MAX_UPLOAD_SIZE_BYTES ?? 10 * 1024 * 1024);
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/jpeg",
  "image/png",
]);

export async function uploadResumeAction(formData: FormData) {
  return runAction(async () => {
    const actor = await requireRole("admin", "recruiter");

    const file = formData.get("file") as File | null;
    const rawJobTitleId = formData.get("jobTitleId");
    const jobTitleId =
      rawJobTitleId && rawJobTitleId !== "" ? String(rawJobTitleId) : null;

    if (!file || file.size === 0) throw new Error("FILE_REQUIRED");
    if (!ALLOWED_MIME.has(file.type)) {
      throw new Error(
        "UNSUPPORTED_FILE_TYPE: only PDF, DOCX, and JPG/PNG images are supported.",
      );
    }
    if (file.size > MAX_SIZE) throw new Error("FILE_TOO_LARGE");

    const buffer = Buffer.from(await file.arrayBuffer());
    const checksum = sha256(buffer);
    const { bucket, storagePath } = await uploadResume(
      buffer,
      file.name,
      file.type,
    );

    const [doc] = await db
      .insert(resumeDocuments)
      .values({
        storagePath,
        bucket,
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        checksum,
        uploaderId: actor.id,
      })
      .returning({ id: resumeDocuments.id });

    const [job] = await db
      .insert(processingJobs)
      .values({
        resumeDocumentId: doc.id,
        jobTitleId,
        state: "queued",
        stage: "extract",
        correlationId: shortId("job"),
      })
      .returning({ id: processingJobs.id });

    const jobData: DocumentJob = {
      processingJobId: job.id,
      resumeDocumentId: doc.id,
      jobTitleId,
    };
    await documentQueue.add("process-document", jobData, {
      jobId: `doc-${doc.id}`, // idempotent enqueue per document
      attempts: JOB_ATTEMPTS,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 500,
      removeOnFail: 500,
    });

    await recordAudit({
      actorId: actor.id,
      action: "document.upload",
      entityType: "resume_document",
      entityId: doc.id,
      after: { name: file.name, mime: file.type, size: file.size, checksum },
    });

    return { resumeDocumentId: doc.id, processingJobId: job.id };
  });
}

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
        jobId: `doc-${job.resumeDocumentId}`,
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

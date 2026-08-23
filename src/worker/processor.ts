import { and, eq } from "drizzle-orm";
import { Worker } from "bullmq";

import { db } from "@/db";
import {
  jobTitles,
  processingJobs,
  processingResults,
  recommendations,
  resumeDocuments,
} from "@/db/schema";
import { extractText, isScannedText } from "@/lib/extract";
import { runOcr } from "@/lib/ocr";
import { mergeLocalContacts, runAiValidation } from "@/lib/ai/validate";
import { runAiRecommendations } from "@/lib/ai/recommend";
import { getFileBuffer } from "@/lib/storage";
import { connection, JOB_ATTEMPTS, type DocumentJob } from "@/worker/queue";

/**
 * One job per document, run as staged steps: extract → validate → recommend.
 * All writes are idempotent (upserts keyed by resume_document_id), so retries
 * never create duplicate results, candidates, or applications.
 */
export async function processDocument(
  job: DocumentJob,
  attemptsMade = 1,
): Promise<void> {
  const now = new Date();
  await db
    .update(processingJobs)
    .set({
      state: "processing",
      stage: "extract",
      startedAt: now,
      attempts: attemptsMade,
      lastError: null,
      updatedAt: now,
    })
    .where(eq(processingJobs.id, job.processingJobId));

  const [doc] = await db
    .select()
    .from(resumeDocuments)
    .where(eq(resumeDocuments.id, job.resumeDocumentId));
  if (!doc) throw new Error("RESUME_NOT_FOUND");

  const buffer = await getFileBuffer(doc.storagePath);

  /* ------------------ Stage 1: extract text / OCR ------------------ */
  let extraction;
  try {
    extraction = await extractText(buffer, doc.mimeType);
  } catch (err) {
    throw new Error(`EXTRACT_FAILED: ${(err as Error).message}`);
  }
  let rawText = extraction.text;
  let ocrUsed = false;
  let ocrRuntime: string | null = null;
  if (isScannedText(extraction)) {
    if (
      doc.mimeType === "application/pdf" ||
      doc.mimeType.startsWith("image/")
    ) {
      const ocr = await runOcr(buffer, doc.mimeType);
      rawText = ocr.text;
      ocrUsed = true;
      ocrRuntime = ocr.runtime;
    }
  }

  await db
    .update(processingJobs)
    .set({ stage: "validate", updatedAt: new Date() })
    .where(eq(processingJobs.id, job.processingJobId));

  /* ------------ Stage 2: AI extraction + validation ----------------- */
  // ponytail: masking dimatikan untuk ekstraksi (akurasi > redaksi ke LLM).
  // DEFAULT_MASKED_FIELDS/redactPii disimpan untuk redaksi log bila diperlukan.
  const { output, provider, model } = await runAiValidation({
    rawText,
    maskedFields: [],
  });
  mergeLocalContacts(output, rawText);

  const needsReview =
    ocrUsed ||
    output.fieldsRequiringReview.length > 0 ||
    output.conflicts.length > 0;

  const [result] = await db
    .insert(processingResults)
    .values({
      resumeDocumentId: job.resumeDocumentId,
      processingJobId: job.processingJobId,
      schemaVersion: "1",
      rawText,
      ocrUsed,
      ocrRuntime,
      fields: output.fields,
      fieldMeta: output.fieldMeta,
      conflicts: output.conflicts,
      fieldsRequiringReview: output.fieldsRequiringReview,
      provider,
      model,
      aiTimestamp: new Date(),
    })
    .onConflictDoUpdate({
      target: processingResults.resumeDocumentId,
      set: {
        processingJobId: job.processingJobId,
        schemaVersion: "1",
        rawText,
        ocrUsed,
        ocrRuntime,
        fields: output.fields,
        fieldMeta: output.fieldMeta,
        conflicts: output.conflicts,
        fieldsRequiringReview: output.fieldsRequiringReview,
        provider,
        model,
        aiTimestamp: new Date(),
        updatedAt: new Date(),
      },
    })
    .returning({ id: processingResults.id });

  /* ---------- Stage 3: recommendations (general intake only) -------- */
  if (!job.jobTitleId) {
    await db
      .update(processingJobs)
      .set({ stage: "recommend", updatedAt: new Date() })
      .where(eq(processingJobs.id, job.processingJobId));

    const active = await db
      .select()
      .from(jobTitles)
      .where(eq(jobTitles.active, true));

    const { recommendations: recs, provider: recProvider, model: recModel } =
      await runAiRecommendations({
        fields: output.fields,
        jobTitles: active.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description ?? "",
          competencies: t.competencies ?? [],
          minYearsExperience: t.minYearsExperience,
          minEducation: t.minEducation ?? "",
          location: t.location ?? "",
          workArrangement: t.workArrangement ?? "",
        })),
      });

    // Replace stale pending recommendations for this resume (idempotent).
    await db
      .delete(recommendations)
      .where(
        and(
          eq(recommendations.resumeDocumentId, job.resumeDocumentId),
          eq(recommendations.status, "pending"),
        ),
      );

    for (const r of recs) {
      await db
        .insert(recommendations)
        .values({
          processingResultId: result.id,
          resumeDocumentId: job.resumeDocumentId,
          jobTitleId: r.jobTitleId,
          score: r.score,
          explanation: r.explanation,
          matchedCompetencies: r.matchedCompetencies,
          experienceFit: r.experienceFit ?? "",
          educationFit: r.educationFit ?? "",
          unmetRequirements: r.unmetRequirements,
          status: "pending",
          provider: recProvider,
          model: recModel,
        })
        .onConflictDoNothing();
    }
  }

  await db
    .update(processingJobs)
    .set({
      state: needsReview ? "needs_review" : "ready",
      stage: "done",
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(processingJobs.id, job.processingJobId));
}

export function startProcessor(): Worker<DocumentJob> {
  const worker = new Worker<DocumentJob>(
    "document-processing",
    async (job) => {
      await processDocument(job.data, job.attemptsMade + 1);
    },
    {
      connection,
      concurrency: 2,
    },
  );

  worker.on("failed", async (job, err) => {
    if (!job) return;
    const final = job.attemptsMade >= (job.opts.attempts ?? 1);
    await db
      .update(processingJobs)
      .set({
        state: final ? "failed" : "queued",
        lastError: err.message,
        finishedAt: final ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(processingJobs.id, job.data.processingJobId));
    console.error(`[worker] job ${job.id} failed (final=${final}): ${err.message}`);
  });

  worker.on("error", (err) => console.error("[worker] connection error:", err));

  return worker;
}

export { JOB_ATTEMPTS };

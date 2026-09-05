import { db } from "@/db";
import { processingJobs, resumeDocuments } from "@/db/schema";
import { requireAdmin } from "@/lib/authz";
import { recordAudit } from "@/lib/audit";
import { sha256 } from "@/lib/hash";
import { shortId } from "@/lib/ids";
import { uploadResume } from "@/lib/storage";
import { JOB_ATTEMPTS, documentQueue, type DocumentJob } from "@/worker/queue";

export const MAX_UPLOAD_SIZE = Number(process.env.MAX_UPLOAD_SIZE_BYTES ?? 10 * 1024 * 1024);

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/jpeg",
  "image/png",
]);

export async function createResumeUpload(formData: FormData) {
  const actor = await requireAdmin();
  const file = formData.get("file");
  const rawJobTitleId = formData.get("jobTitleId");
  const jobTitleId = rawJobTitleId && rawJobTitleId !== "" ? String(rawJobTitleId) : null;

  if (!(file instanceof File) || file.size === 0) throw new Error("FILE_REQUIRED");
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("UNSUPPORTED_FILE_TYPE: only PDF, DOCX, and JPG/PNG images are supported.");
  }
  if (file.size > MAX_UPLOAD_SIZE) throw new Error("FILE_TOO_LARGE");

  const buffer = Buffer.from(await file.arrayBuffer());
  const checksum = sha256(buffer);
  const { bucket, storagePath } = await uploadResume(buffer, file.name, file.type);

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
    jobId: `doc-${doc.id}`,
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
}

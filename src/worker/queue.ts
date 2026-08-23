import { Queue } from "bullmq";
import IORedis from "ioredis";

export const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export type DocumentJob = {
  processingJobId: string;
  resumeDocumentId: string;
  jobTitleId?: string | null;
};

export const JOB_ATTEMPTS = 3;

export const documentQueue = new Queue<DocumentJob>("document-processing", {
  connection,
});

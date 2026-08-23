import { Storage } from "@google-cloud/storage";

import { shortId } from "@/lib/ids";

const bucketName = process.env.GCS_BUCKET ?? "recruitment-resumes";
const endpoint = process.env.GCS_ENDPOINT; // fake-gcs-server in dev
const projectId = process.env.GCS_PROJECT_ID ?? "recruitment";

function getStorage(): Storage {
  if (endpoint) {
    return new Storage({ projectId, apiEndpoint: endpoint });
  }
  return new Storage({ projectId });
}

async function getBucket() {
  const storage = getStorage();
  const bucket = storage.bucket(bucketName);
  const [exists] = await bucket.exists();
  if (!exists) {
    await bucket.create();
  }
  return bucket;
}

export type StoredObject = {
  bucket: string;
  storagePath: string; // object name within the bucket
};

/** Upload a resume file to the private bucket. */
export async function uploadResume(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
): Promise<StoredObject> {
  const bucket = await getBucket();
  const safeName = originalName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-100);
  const storagePath = `resumes/${shortId()}_${safeName}`;
  await bucket.file(storagePath).save(buffer, {
    contentType: mimeType,
    metadata: {
      metadata: { originalName, mimeType, sizeBytes: String(buffer.length) },
    },
  });
  return { bucket: bucketName, storagePath };
}

/** Download the full file buffer (used by the processing worker). */
export async function getFileBuffer(storagePath: string): Promise<Buffer> {
  const bucket = await getBucket();
  const [data] = await bucket.file(storagePath).download();
  return Buffer.from(data);
}

export async function deleteObject(storagePath: string): Promise<void> {
  const bucket = await getBucket();
  await bucket.file(storagePath).delete({ ignoreNotFound: true });
}

/** Create a short-lived read URL for browser download. */
export async function getReadUrl(storagePath: string, expiresMs = 15 * 60 * 1000) {
  const bucket = await getBucket();
  const file = bucket.file(storagePath);
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + expiresMs,
  });
  return url;
}

export { bucketName };

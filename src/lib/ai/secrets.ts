import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Secret at-rest encryption for AI provider API keys.
 *
 * API keys typed into the admin UI are AES-256-GCM encrypted before being
 * stored in `ai_config.api_key_enc`. The encryption key comes from the
 * `APP_ENCRYPTION_KEY` env var (a 32-byte key) and is never persisted.
 * A key stored in the DB is useless without the server-side env key.
 */

const KEY_ENV = "APP_ENCRYPTION_KEY";

function getKey(): Buffer {
  const raw = process.env[KEY_ENV];
  if (!raw) {
    throw new Error(`${KEY_ENV} is not set. Generate one with: openssl rand -hex 32`);
  }
  const normalized =
    raw.length === 64 && /^[0-9a-fA-F]{64}$/.test(raw)
      ? Buffer.from(raw, "hex")
      : Buffer.from(raw, "utf8");
  if (normalized.length !== 32) {
    throw new Error(`${KEY_ENV} must resolve to 32 bytes (64 hex chars or a 32-char passphrase)`);
  }
  return normalized;
}

export function hasEncryptionKey(): boolean {
  return Boolean(process.env[KEY_ENV]);
}

/** Encrypt a plaintext secret. Output format: "<iv>.<authTag>.<ciphertext>" (base64). */
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

/** Decrypt a secret produced by encryptSecret. */
export function decryptSecret(payload: string): string {
  const key = getKey();
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("INVALID_ENCRYPTED_SECRET");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
  return plain;
}

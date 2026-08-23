import { afterEach, describe, expect, it } from "vitest";

import {
  decryptSecret,
  encryptSecret,
  hasEncryptionKey,
} from "@/lib/ai/secrets";

const KEY = "0123456789abcdef0123456789abcdef"; // 32 bytes

describe("ai secrets (encrypt at rest)", () => {
  const oldKey = process.env.APP_ENCRYPTION_KEY;

  it("round-trips a secret through encrypt/decrypt", () => {
    process.env.APP_ENCRYPTION_KEY = KEY;
    const secret = "sk-very-secret-123";
    const cipher = encryptSecret(secret);
    expect(cipher).not.toContain(secret);
    expect(cipher.split(".")).toHaveLength(3);
    expect(decryptSecret(cipher)).toBe(secret);
  });

  it("produces a unique ciphertext each time (random IV)", () => {
    process.env.APP_ENCRYPTION_KEY = KEY;
    const a = encryptSecret("same");
    const b = encryptSecret("same");
    expect(a).not.toBe(b);
  });

  it("fails to decrypt when the key changes (tamper/wrong key)", () => {
    process.env.APP_ENCRYPTION_KEY = KEY;
    const cipher = encryptSecret("secret");
    process.env.APP_ENCRYPTION_KEY = "fedcba9876543210fedcba9876543210";
    expect(() => decryptSecret(cipher)).toThrow();
  });

  it("rejects malformed ciphertext", () => {
    process.env.APP_ENCRYPTION_KEY = KEY;
    expect(() => decryptSecret("not-a-valid-payload")).toThrow(
      "INVALID_ENCRYPTED_SECRET",
    );
  });

  it("reports when no encryption key is configured", () => {
    delete process.env.APP_ENCRYPTION_KEY;
    expect(hasEncryptionKey()).toBe(false);
    expect(() => encryptSecret("x")).toThrow(/APP_ENCRYPTION_KEY is not set/);
  });

  it("accepts a 64-char hex key", () => {
    process.env.APP_ENCRYPTION_KEY = "49c14ed35a7542da744b2974404c8d1e64bb64641aa8e00c8e0ddaa7f1b5b02e";
    const cipher = encryptSecret("hex-key-test");
    expect(decryptSecret(cipher)).toBe("hex-key-test");
  });

  afterEach(() => {
    if (oldKey === undefined) delete process.env.APP_ENCRYPTION_KEY;
    else process.env.APP_ENCRYPTION_KEY = oldKey;
  });
});

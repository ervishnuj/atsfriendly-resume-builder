import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key(): Buffer {
  const secret = process.env.APP_ENCRYPTION_KEY;
  if (!secret) throw new Error("Missing APP_ENCRYPTION_KEY");
  // Derive a stable 32-byte (AES-256) key from the configured secret.
  return createHash("sha256").update(secret).digest();
}

/** AES-256-GCM field-level encryption. Output: base64(iv).base64(tag).base64(ciphertext) */
export function encryptField(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), enc.toString("base64")].join(".");
}

export function decryptField(payload: string | null | undefined): string | null {
  if (!payload) return null;
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

export function encryptJson(value: unknown): string {
  return encryptField(JSON.stringify(value ?? null));
}

export function decryptJson<T>(payload: string | null | undefined, fallback: T): T {
  const raw = decryptField(payload);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
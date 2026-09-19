import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key(): Buffer {
  const raw = process.env["APP_ENCRYPTION_KEY"];
  if (!raw) throw new Error("APP_ENCRYPTION_KEY is not set");
  return createHash("sha256").update(raw, "utf8").digest();
}

export function encryptJson(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

export function encryptScopedJson(value: unknown, scope: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(scope, "utf8"));
  const ct = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

export function decryptJson<T>(stored: string | null): T | null {
  if (!stored) return null;
  try {
    const buf = Buffer.from(stored, "base64");
    const decipher = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
    decipher.setAuthTag(buf.subarray(12, 28));
    const plain = Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
    return JSON.parse(plain) as T;
  } catch {
    return null;
  }
}


export function decryptScopedJson<T>(stored: string | null, scope: string): T | null {
  if (!stored) return null;
  try {
    const buf = Buffer.from(stored, "base64");
    const decipher = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
    decipher.setAAD(Buffer.from(scope, "utf8"));
    decipher.setAuthTag(buf.subarray(12, 28));
    const plain = Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
    return JSON.parse(plain) as T;
  } catch {
    return null;
  }
}

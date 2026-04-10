

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be set (64 hex chars). Generate with: openssl rand -hex 32"
    );
  }
  return Buffer.from(hex, "hex");
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  const [ivHex, tagHex, encHex] = ciphertext.split(":");
  if (!ivHex || !tagHex || !encHex) {
    throw new Error("Invalid encrypted value format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encHex, "hex");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function isEncryptionConfigured(): boolean {
  const hex = process.env.ENCRYPTION_KEY;
  return !!hex && hex.length === 64;
}

export function encryptJSON<T>(data: T): string {
  return encrypt(JSON.stringify(data));
}

export function decryptJSON<T>(ciphertext: string): T {
  return JSON.parse(decrypt(ciphertext)) as T;
}

export function tryDecrypt(value: string | null | undefined): string | null {
  if (!value) return null;

  if (!/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/.test(value)) {
    return value;
  }
  try {
    return decrypt(value);
  } catch {
    return value;
  }
}

export function tryDecryptJSON<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  if (!/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/.test(value)) {

    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  try {
    return decryptJSON<T>(value);
  } catch {

    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
}

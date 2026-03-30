/**
 * Application-level AES-256-GCM encryption for sensitive PII fields.
 *
 * Requires ENCRYPTION_KEY env var (64 hex chars = 32 bytes).
 * Generate with: openssl rand -hex 32
 *
 * Usage:
 *   encrypt("sensitive-data") → "iv:tag:ciphertext" (hex-encoded)
 *   decrypt(encrypted)        → "sensitive-data"
 */

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

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns "iv:authTag:ciphertext" in hex encoding.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt a value produced by encrypt().
 */
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

/**
 * Check if ENCRYPTION_KEY is configured.
 */
export function isEncryptionConfigured(): boolean {
  const hex = process.env.ENCRYPTION_KEY;
  return !!hex && hex.length === 64;
}

/**
 * Encrypt a JSON-serialisable object.
 */
export function encryptJSON<T>(data: T): string {
  return encrypt(JSON.stringify(data));
}

/**
 * Decrypt a value back to a parsed object.
 */
export function decryptJSON<T>(ciphertext: string): T {
  return JSON.parse(decrypt(ciphertext)) as T;
}

/**
 * Safely try to decrypt; returns null on failure (e.g. unencrypted legacy data).
 */
export function tryDecrypt(value: string | null | undefined): string | null {
  if (!value) return null;
  // Check if value looks like our encrypted format (hex:hex:hex)
  if (!/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/.test(value)) {
    return value; // Unencrypted legacy value — return as-is
  }
  try {
    return decrypt(value);
  } catch {
    return value; // Decryption failed — probably unencrypted legacy data
  }
}

/**
 * Safely try to decrypt a JSON value; returns null on failure.
 */
export function tryDecryptJSON<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  if (!/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/.test(value)) {
    // Likely raw JSON — try to parse directly
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  try {
    return decryptJSON<T>(value);
  } catch {
    // Fall back to trying raw parse for legacy data
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
}

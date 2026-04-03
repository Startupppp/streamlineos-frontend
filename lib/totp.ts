import { generateSecret, generateURI, generateSync, verifySync } from "otplib";
import QRCode from "qrcode";

export function generateTotpSecret(): string {
  return generateSecret();
}

export function generateTotpUri(secret: string, email: string): string {
  return generateURI({ secret, label: email, issuer: "Vaivamm CRM", type: "totp" });
}

export async function generateQrCodeDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri);
}

export function generateTotpToken(secret: string): string {
  return generateSync({ secret, type: "totp" });
}

export function verifyTotpToken(token: string, secret: string): boolean {
  try {
    const result = verifySync({ secret, token, type: "totp" });
    return result.valid;
  } catch {
    return false;
  }
}

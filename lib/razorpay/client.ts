import "server-only";
import Razorpay from "razorpay";
import { createHmac, timingSafeEqual } from "crypto";

let cached: Razorpay | null = null;
let cacheKey = "";

export function getRazorpay(): Razorpay | null {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) return null;
  const key = `${id}:${secret}`;
  if (cached && cacheKey === key) return cached;
  cached = new Razorpay({ key_id: id, key_secret: secret });
  cacheKey = key;
  return cached;
}

export function isRazorpayConfigured(): boolean {
  return !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET;
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  try {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

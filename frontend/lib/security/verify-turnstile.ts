import { logger } from "@/lib/logger";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileResult =
  | { ok: true }
  | { ok: false; reason: "missing-token" | "invalid-token" | "misconfigured" | "network-error" };

export async function verifyTurnstileToken(
  token: string | undefined | null,
  ip: string,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    logger.error("[turnstile] TURNSTILE_SECRET_KEY is not set — refusing to verify (fail closed)");
    return { ok: false, reason: "misconfigured" };
  }

  if (!token) return { ok: false, reason: "missing-token" };

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        ...(ip && ip !== "unknown" ? { remoteip: ip } : {}),
      }),
      cache: "no-store",
    });
    const json = (await res.json()) as { success: boolean; "error-codes"?: string[] };
    if (json.success) return { ok: true };
    logger.warn("[turnstile] verification rejected", { errorCodes: json["error-codes"] });
    return { ok: false, reason: "invalid-token" };
  } catch (error) {
    logger.error("[turnstile] siteverify network error", { error });
    return { ok: false, reason: "network-error" };
  }
}

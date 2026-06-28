"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { logger } from "@/lib/logger";
import { verifyTurnstileToken } from "@/lib/security/verify-turnstile";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Enter a valid email"),
  company: z.string().max(200).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  topic: z
    .enum(["sales", "support", "partnership", "press", "other"])
    .default("sales"),
  message: z.string().min(10, "Tell us a little more").max(5000),
  cfTurnstileToken: z.string().optional(),
});

type ContactInput = z.infer<typeof contactSchema>;

type ContactResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      fieldErrors?: Partial<Record<keyof ContactInput, string>>;
    };

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1500";

export async function submitContactForm(raw: unknown): Promise<ContactResult> {
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof ContactInput, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof ContactInput;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      ok: false,
      error: "Please check the highlighted fields.",
      fieldErrors,
    };
  }
  const data = parsed.data;

  const requestHeaders = await headers();
  const ipAddress =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
    const turnstile = await verifyTurnstileToken(
      data.cfTurnstileToken,
      ipAddress,
    );
    if (!turnstile.ok) {
      logger.warn("[contact-form] Turnstile rejected", { reason: turnstile.reason });
      return {
        ok: false,
        error:
          turnstile.reason === "missing-token"
            ? "Please complete the bot verification challenge."
            : "Bot verification failed. Please refresh and try again.",
      };
    }
  }

  const { cfTurnstileToken: _token, ...rest } = data;

  try {
    const res = await fetch(`${BACKEND_URL}/platform/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rest),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { message?: string };
      logger.error("[contact-form] Backend submission failed", { status: res.status });
      return {
        ok: false,
        error: body.message ?? "Couldn't save your message. Please try again in a minute.",
      };
    }

    return { ok: true };
  } catch (error) {
    logger.error("[contact-form] Backend call failed", { error });
    return {
      ok: false,
      error: "Couldn't save your message. Please try again in a minute.",
    };
  }
}

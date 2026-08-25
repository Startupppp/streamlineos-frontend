import {
  waitlistSchema,
  type WaitlistFieldErrors,
  type WaitlistFormValues,
  type WaitlistResult,
} from "./waitlist-schema";

const GENERIC_ERROR = "Couldn't add you to the waitlist. Please try again.";

const FIELD_NAMES = new Set(Object.keys(waitlistSchema.shape));

/**
 * The API wraps a handler's return in `{ success, data }` and reports a failure
 * as `{ code, message, details }` — `details` carries one entry per rejected
 * Zod path, which is the only place per-field server errors come from.
 */
type SuccessEnvelope = {
  data?: { reference?: string; alreadyJoined?: boolean };
};

type ErrorEnvelope = {
  message?: string;
  details?: { path?: string; message?: string }[];
};

function toFieldErrors(details: ErrorEnvelope["details"]): WaitlistFieldErrors | undefined {
  if (!details?.length) return undefined;
  const errors: WaitlistFieldErrors = {};
  for (const detail of details) {
    const field = detail.path?.split(".").pop();
    if (!field || !FIELD_NAMES.has(field) || !detail.message) continue;
    errors[field as keyof WaitlistFormValues] = detail.message;
  }
  return Object.keys(errors).length ? errors : undefined;
}

export async function joinWaitlist(
  values: WaitlistFormValues,
  cfTurnstileToken?: string,
): Promise<WaitlistResult> {
  let res: Response;
  try {
    res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/public/waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        email: values.email,
        organization: values.organization,
        role: values.role || undefined,
        teamSize: values.teamSize,
        notes: values.notes || undefined,
        cfTurnstileToken,
      }),
    });
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }

  let body: SuccessEnvelope & ErrorEnvelope = {};
  try {
    body = (await res.json()) as typeof body;
  } catch {}

  if (!res.ok) {
    return {
      ok: false,
      error: body.message ?? GENERIC_ERROR,
      fieldErrors: toFieldErrors(body.details),
    };
  }

  return {
    ok: true,
    entry: {
      reference: body.data?.reference ?? "",
      alreadyJoined: body.data?.alreadyJoined ?? false,
    },
  };
}

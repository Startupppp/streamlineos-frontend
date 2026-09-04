import { buildUrl } from "@/lib/api-client";
import { parseApiResponse } from "@/lib/api-envelope";
import {
  intakeSubmitResponseContract,
  type IntakeFormOutput,
  type IntakeSubmitResponse,
} from "./public-intake-schema";
import { withCorrelation } from "@/lib/observability/with-correlation";

/**
 * Unauthenticated intake submit. The response goes through `parseApiResponse`
 * so the backend's `{ success, data }` envelope is unwrapped; reading
 * `res.json()` directly resolved to the envelope, leaving both declared fields
 * undefined while the type said otherwise.
 */
export async function submitIntake(
  projectId: string,
  body: IntakeFormOutput,
): Promise<IntakeSubmitResponse> {
  const path = `/public/intake/${projectId}`;
  const res = await fetch(buildUrl(path), {
    method: "POST",
    headers: withCorrelation(new Headers({ "Content-Type": "application/json" })),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = "Failed to submit. Please try again.";
    try {
      const data = (await res.json()) as Record<string, unknown>;
      if (
        typeof data?.message === "string" &&
        data.message &&
        !data.message.startsWith(String(res.status))
      ) {
        message = data.message;
      } else if (Array.isArray(data?.message) && data.message.length > 0) {
        const messages = data.message.filter(
          (m): m is string => typeof m === "string",
        );
        if (messages.length > 0) message = messages.join(", ");
      }
    } catch {}
    throw new Error(message);
  }
  return parseApiResponse(res, intakeSubmitResponseContract, path);
}

import { buildUrl } from "@/lib/api-client";
import { ApiError, parseApiResponse } from "@/lib/api-envelope";
import {
  intakeSubmitResponseContract,
  type IntakeFormOutput,
  type IntakeSubmitResponse,
} from "./public-intake-schema";
import { withCorrelation } from "@/lib/observability/with-correlation";

async function postIntake(
  path: string,
  body: IntakeFormOutput,
): Promise<IntakeSubmitResponse> {
  const res = await fetch(buildUrl(path), {
    method: "POST",
    headers: withCorrelation(new Headers({ "Content-Type": "application/json" })),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = "Failed to submit. Please try again.";
    let code: string | undefined;
    let details: unknown;
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
      if (typeof data?.code === "string") code = data.code;
      if ("details" in data) details = data.details;
    } catch {}
    throw new ApiError(message, res.status, code, details, path);
  }
  return parseApiResponse(res, intakeSubmitResponseContract, path);
}

export function submitIntakeByToken(
  intakeToken: string,
  body: IntakeFormOutput,
): Promise<IntakeSubmitResponse> {
  return postIntake(`/public/intake/t/${intakeToken}`, body);
}

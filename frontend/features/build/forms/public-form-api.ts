import { buildUrl } from "@/lib/api-client";
import { parseApiResponse } from "@/lib/api-envelope";
import {
  publicFormDefinitionContract,
  publicFormSubmitResponseContract,
  type PublicFormDefinition,
  type PublicFormSubmitResponse,
} from "./form-submission-schema";
import { withCorrelation } from "@/lib/observability/with-correlation";

/**
 * The public form is read with a bare `fetch` rather than `apiClient` because
 * it is unauthenticated and must not drag the token cache or the auto-sign-out
 * behaviour onto a page a stranger opens. The response still goes through
 * `parseApiResponse`, which is what unwraps the backend's `{ success, data }`
 * envelope — reading `res.json()` directly resolved to the envelope and left
 * every declared field undefined.
 */
async function messageFrom(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as Record<string, unknown>;
    if (
      typeof data?.message === "string" &&
      data.message &&
      !data.message.startsWith(String(res.status))
    )
      return data.message;
    if (Array.isArray(data?.message) && data.message.length > 0) {
      const messages = data.message.filter(
        (m): m is string => typeof m === "string",
      );
      if (messages.length > 0) return messages.join(", ");
    }
  } catch {}
  return fallback;
}

export async function fetchPublicForm(
  token: string,
): Promise<PublicFormDefinition> {
  const path = `/public/forms/${token}`;
  const res = await fetch(buildUrl(path), { headers: withCorrelation(new Headers()) });
  if (!res.ok)
    throw new Error(
      await messageFrom(res, "Form not found or no longer active."),
    );
  return parseApiResponse(res, publicFormDefinitionContract, path);
}

export async function submitPublicForm(
  token: string,
  values: Record<string, string>,
  submittedByName?: string,
): Promise<PublicFormSubmitResponse> {
  const path = `/public/forms/${token}/submit`;
  const res = await fetch(buildUrl(path), {
    method: "POST",
    headers: withCorrelation(new Headers({ "Content-Type": "application/json" })),
    body: JSON.stringify({ values, submittedByName }),
  });
  if (!res.ok)
    throw new Error(
      await messageFrom(res, "Failed to submit. Please try again."),
    );
  return parseApiResponse(res, publicFormSubmitResponseContract, path);
}

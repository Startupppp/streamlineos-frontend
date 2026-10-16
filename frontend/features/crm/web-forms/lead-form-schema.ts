import { z } from "zod";
import type { WebFormField } from "@/hooks/api/crm/web-forms-schema";

/**
 * A visitor-side schema built from the form's own field list, so a required
 * field is refused in the browser with the same "<label> is required" the
 * backend would answer with.
 */
export function buildLeadFormSchema(fields: readonly WebFormField[]) {
  const shape: Record<string, z.ZodString> = {};
  for (const field of fields) {
    let value = z.string().trim().max(5000);
    if (field.required) value = value.min(1, `${field.label} is required`);
    shape[field.name] =
      field.type === "email"
        ? value.refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address")
        : value;
  }
  return z.object(shape);
}

export function emptyLeadFormValues(fields: readonly WebFormField[]): Record<string, string> {
  return Object.fromEntries(fields.map((field) => [field.name, ""]));
}

/** Only an absolute http(s) URL is followed; anything else would be a script or a typo. */
export function safeRedirect(url: string | null): string | null {
  const parsed = url ? parseUrl(url) : null;
  return parsed && (parsed.protocol === "https:" || parsed.protocol === "http:") ? parsed.toString() : null;
}

/** `URL.canParse` is missing from Safari < 17 and jsdom, so parse and catch. */
export function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/** Blank optionals are not sent: the backend stores the body as the lead's custom data. */
export function toLeadSubmission(values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim() !== ""));
}

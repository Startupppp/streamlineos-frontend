import { z } from "zod";

function isHttpsOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.origin === value && !url.hostname.includes("*");
  } catch {
    return false;
  }
}

export function parseAllowedOrigins(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((part) => part.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

export const allowedOriginsSchema = z.object({
  allowedOrigins: z
    .string()
    .refine((raw) => parseAllowedOrigins(raw).every(isHttpsOrigin), "Each site must be an https address such as https://www.example.com")
    .refine((raw) => parseAllowedOrigins(raw).length <= 10, "Add at most 10 sites"),
});

export type AllowedOriginsValues = z.infer<typeof allowedOriginsSchema>;

export function embedSnippetFor(appOrigin: string, collectorToken: string): string {
  return `<iframe src="${appOrigin}/s/${collectorToken}?embed=1" width="100%" height="640" style="border:0" title="Survey"></iframe>`;
}

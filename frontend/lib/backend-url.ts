import "server-only";

function requireAbsoluteUrl(value: string, name: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${name} must use http or https`);
  }
  return value.replace(/\/$/, "");
}

const publicUrl = process.env.NEXT_PUBLIC_API_URL;
if (!publicUrl) throw new Error("NEXT_PUBLIC_API_URL is not set");

const internalUrl = process.env.API_INTERNAL_URL?.trim();

export const BACKEND_URL: string = requireAbsoluteUrl(
  internalUrl && internalUrl.length > 0 ? internalUrl : publicUrl,
  internalUrl && internalUrl.length > 0 ? "API_INTERNAL_URL" : "NEXT_PUBLIC_API_URL",
);

import { BRAND_NAME, BRAND_URL } from "@/lib/branding";

/**
 * Canonical URLs come from the configured brand origin (NEXT_PUBLIC_BRAND_DOMAIN), never from the
 * request's Host header, and never carry query parameters.
 */
export const SITE_ORIGIN = BRAND_URL.replace(/\/+$/, "");
export const JOURNAL_NAME = `The ${BRAND_NAME} Journal`;
export const JOURNAL_PATH = "/blogs";

export function blogUrl(path = ""): string {
  return `${SITE_ORIGIN}${JOURNAL_PATH}${path}`;
}

/** JSON for a <script type="application/ld+json">, with `<` escaped so text can never close the tag. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

export const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;

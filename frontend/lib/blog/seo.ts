import { BRAND_NAME, BRAND_URL } from "@/lib/branding";

export const SITE_ORIGIN = BRAND_URL.replace(/\/+$/, "");
export const JOURNAL_NAME = `The ${BRAND_NAME} Journal`;
export const JOURNAL_PATH = "/blogs";

export function blogUrl(path = ""): string {
  return `${SITE_ORIGIN}${JOURNAL_PATH}${path}`;
}

export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

export const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;

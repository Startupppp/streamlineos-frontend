import { BRAND_URL } from "@/lib/branding";

export const FEEDBUCKET_WIDGET_SCRIPT_PATH = "/feedbucket-widget.js";

export function getFeedbucketProjectId(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_FEEDBUCKET_PROJECT_ID?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : null;
}

export function getFeedbucketApiBase(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "");
  return fromEnv && fromEnv.length > 0 ? fromEnv : null;
}

export function getFeedbucketAppOrigin(): string {
  if (
    typeof window !== "undefined" &&
    window.location.origin &&
    window.location.origin !== "null"
  ) {
    return window.location.origin;
  }

  const fromAuth = process.env.NEXTAUTH_URL?.trim();
  if (fromAuth && fromAuth.length > 0) {
    try {
      return new URL(fromAuth).origin;
    } catch {
      return BRAND_URL;
    }
  }

  return BRAND_URL;
}

export function getFeedbucketWidgetScriptSrc(absolute = true): string {
  if (!absolute) return FEEDBUCKET_WIDGET_SCRIPT_PATH;

  const origin = getFeedbucketAppOrigin().replace(/\/$/, "");
  return `${origin}${FEEDBUCKET_WIDGET_SCRIPT_PATH}`;
}

export function buildFeedbucketEmbedSnippet(options: {
  publicKey: string;
  scriptSrc?: string;
  apiBase?: string | null;
}): string {
  const scriptSrc = options.scriptSrc ?? getFeedbucketWidgetScriptSrc(true);
  const apiBase =
    options.apiBase === undefined ? getFeedbucketApiBase() : options.apiBase;
  const apiAttr = apiBase && apiBase.length > 0 ? ` data-api="${apiBase}"` : "";
  return `<script src="${scriptSrc}" data-key="${options.publicKey}"${apiAttr} async></script>`;
}

import DOMPurify, { type Config, type ElementHook } from "isomorphic-dompurify";

export interface SanitizeHtmlPolicy {
  config?: Omit<Config, "RETURN_DOM" | "RETURN_DOM_FRAGMENT" | "RETURN_TRUSTED_TYPE">;
  afterSanitizeAttributes?: ElementHook;
}

export function sanitizeHtml(html: string, policy: SanitizeHtmlPolicy = {}): string {
  const { config, afterSanitizeAttributes } = policy;
  if (afterSanitizeAttributes)
    DOMPurify.addHook("afterSanitizeAttributes", afterSanitizeAttributes);
  try {
    return DOMPurify.sanitize(html, config ?? {});
  } finally {
    if (afterSanitizeAttributes)
      DOMPurify.removeHook("afterSanitizeAttributes", afterSanitizeAttributes);
  }
}

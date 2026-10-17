import { reportError } from "./error-reporter";
import { isApiError } from "@/lib/api-envelope";

let installed = false;

const BENIGN_BROWSER_NOTICES: readonly string[] = [
  "ResizeObserver loop completed with undelivered notifications",
  "ResizeObserver loop limit exceeded",
];

function isBenignBrowserNotice(event: ErrorEvent): boolean {
  const msg = typeof event.message === "string" ? event.message : "";
  return BENIGN_BROWSER_NOTICES.some((notice) => msg.includes(notice));
}

function isExpectedRejection(reason: unknown): boolean {
  return isApiError(reason) && reason.status === 404;
}

/**
 * Catches the failures React never sees: an error thrown outside a render, and a
 * promise nobody awaited. Without these, the only record is the user's console,
 * which nobody reads.
 *
 * Returns an uninstall function, and is idempotent — React strict mode mounts
 * effects twice in development, and double-reporting every error would be worse
 * than not reporting at all.
 */
export function installGlobalErrorHandlers(): () => void {
  if (typeof window === "undefined") return () => undefined;
  if (installed) return () => undefined;

  const onError = (event: ErrorEvent): void => {
    if (isBenignBrowserNotice(event)) return;
    reportError(event.error ?? event.message, {
      source: "window.onerror",
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
    });
  };

  const onRejection = (event: PromiseRejectionEvent): void => {
    const reason: unknown = event.reason;
    if (isExpectedRejection(reason)) return;
    reportError(reason, { source: "unhandledrejection" });
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  installed = true;

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    installed = false;
  };
}

import { reportError } from "./error-reporter";

let installed = false;

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
    reportError(event.error ?? event.message, {
      source: "window.onerror",
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
    });
  };

  const onRejection = (event: Event): void => {
    const reason = (event as Event & { reason?: unknown }).reason;
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

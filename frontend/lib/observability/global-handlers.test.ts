import { resetErrorReporter, setErrorReporter, type ErrorReport } from "./error-reporter";
import { installGlobalErrorHandlers } from "./global-handlers";

/**
 * A real `ErrorEvent` carrying an `error` is treated by jsdom as an uncaught
 * exception and re-thrown, failing the test regardless of what listeners do.
 * A plain event with the same shape exercises the listener without that.
 */
function dispatchError(error: unknown): void {
  const event = new Event("error", { cancelable: true }) as Event & { error?: unknown };
  event.error = error;
  // jsdom escalates an uncancelled window "error" to an uncaught exception, and it
  // surfaces asynchronously on whichever test happens to be running next.
  const swallowDefault = (e: Event): void => e.preventDefault();
  window.addEventListener("error", swallowDefault);
  try {
    window.dispatchEvent(event);
  } finally {
    window.removeEventListener("error", swallowDefault);
  }
}

function dispatchRejection(reason: unknown): void {
  const event = new Event("unhandledrejection") as Event & { reason?: unknown };
  event.reason = reason;
  window.dispatchEvent(event);
}

describe("installGlobalErrorHandlers", () => {
  let reports: ErrorReport[];
  let uninstall: () => void;

  beforeEach(() => {
    reports = [];
    setErrorReporter({ report: (r) => reports.push(r) });
    uninstall = installGlobalErrorHandlers();
  });

  afterEach(() => {
    uninstall();
    resetErrorReporter();
  });

  it("reports an uncaught error that would otherwise only reach the console", () => {
    dispatchError(new Error("boom"));
    expect(reports).toHaveLength(1);
    expect(reports[0].extra).toMatchObject({ source: "window.onerror" });
  });

  it("reports an unhandled promise rejection", () => {
    dispatchRejection(new Error("rejected"));
    expect(reports).toHaveLength(1);
    expect(reports[0].extra).toMatchObject({ source: "unhandledrejection" });
  });

  it("still reports a rejection whose reason is not an Error", () => {
    dispatchRejection("just a string");
    expect(reports).toHaveLength(1);
    expect(reports[0].error).toBe("just a string");
  });

  it("stops reporting once uninstalled, so a remount does not double-report", () => {
    uninstall();
    dispatchError(new Error("boom"));
    expect(reports).toHaveLength(0);
  });

  it("is safe to install twice without duplicating reports", () => {
    const second = installGlobalErrorHandlers();
    dispatchError(new Error("boom"));
    second();
    expect(reports).toHaveLength(1);
  });

  it("does not report a ResizeObserver loop notice — it is a browser scheduler signal, not an application error", () => {
    const event = new Event("error", { cancelable: true }) as Event & {
      message?: string;
      error?: unknown;
    };
    event.message = "ResizeObserver loop completed with undelivered notifications";
    const swallow = (e: Event) => e.preventDefault();
    window.addEventListener("error", swallow);
    try {
      window.dispatchEvent(event);
    } finally {
      window.removeEventListener("error", swallow);
    }
    expect(reports).toHaveLength(0);
  });

  it("does not report the older ResizeObserver loop limit exceeded variant", () => {
    const event = new Event("error", { cancelable: true }) as Event & {
      message?: string;
      error?: unknown;
    };
    event.message = "ResizeObserver loop limit exceeded";
    const swallow = (e: Event) => e.preventDefault();
    window.addEventListener("error", swallow);
    try {
      window.dispatchEvent(event);
    } finally {
      window.removeEventListener("error", swallow);
    }
    expect(reports).toHaveLength(0);
  });
});

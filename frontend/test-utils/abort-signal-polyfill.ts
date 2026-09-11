/**
 * jsdom 20 ships neither `AbortSignal.timeout` nor `AbortSignal.any`, both of
 * which `lib/api-client.ts` uses to combine a caller's signal with the request
 * timeout. Without them a cancellation test cannot exercise the real client at
 * all. The timeout half never fires here — a test that wants a timeout aborts
 * its own controller.
 */
export function installAbortSignalPolyfill(): void {
  if (typeof AbortSignal.timeout !== "function") {
    Object.defineProperty(AbortSignal, "timeout", {
      configurable: true,
      writable: true,
      value: () => new AbortController().signal,
    });
  }

  if (typeof AbortSignal.any !== "function") {
    Object.defineProperty(AbortSignal, "any", {
      configurable: true,
      writable: true,
      value: (signals: Iterable<AbortSignal>): AbortSignal => {
        const controller = new AbortController();
        for (const signal of signals) {
          if (signal.aborted) {
            controller.abort(signal.reason);
            break;
          }
          signal.addEventListener("abort", () => controller.abort(signal.reason), {
            once: true,
          });
        }
        return controller.signal;
      },
    });
  }
}

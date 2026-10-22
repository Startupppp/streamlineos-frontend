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

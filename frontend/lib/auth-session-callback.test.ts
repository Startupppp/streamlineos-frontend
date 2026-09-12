/**
 * @jest-environment node
 */
import { fetchSessionData, exchangeSessionForBackendJwt, resolveGoogleUser } from "@/lib/auth-session";

const ORIGINAL_ENV = process.env;

beforeAll(() => {
  process.env = {
    ...ORIGINAL_ENV,
    INTERNAL_API_SECRET: "test-internal-secret",
    NEXTAUTH_SECRET: "test-nextauth-secret-must-be-at-least-32-chars-long",
    BACKEND_URL: "http://backend.test",
  };
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

function installAbortSensitiveFetch(
  resolveHeaders: boolean,
  resolveBody: boolean,
): void {
  (global.fetch as jest.Mock) = jest.fn().mockImplementation((_url: unknown, opts: RequestInit = {}) => {
    const signal = opts.signal ?? null;
    return new Promise<Response>((resolveP, rejectP) => {
      function handleAbort() {
        rejectP(new DOMException("Aborted", "AbortError"));
      }
      if (signal) signal.addEventListener("abort", handleAbort);
      if (resolveHeaders) {
        resolveP({
          ok: true,
          json: () =>
            new Promise<unknown>((resolveBody_, rejectBody_) => {
              if (resolveBody) {
                resolveBody_({});
                return;
              }
              if (signal) {
                if (signal.aborted) {
                  rejectBody_(new DOMException("Aborted", "AbortError"));
                  return;
                }
                signal.addEventListener("abort", () => {
                  rejectBody_(new DOMException("Aborted", "AbortError"));
                });
              }
            }),
        } as Response);
      }
    });
  });
}

describe("fetchSessionData transport deadlines", () => {
  test("returns null when response headers never arrive (stalled header)", async () => {
    jest.useFakeTimers();
    installAbortSensitiveFetch(false, false);

    const promise = fetchSessionData("user-123");
    await jest.runAllTimersAsync();

    const result = await promise;
    expect(result).toBeNull();
  });

  test("returns null when response body stalls past deadline", async () => {
    jest.useFakeTimers();
    installAbortSensitiveFetch(true, false);

    const promise = fetchSessionData("user-123");
    await jest.runAllTimersAsync();

    const result = await promise;
    expect(result).toBeNull();
  });

  test("abort signal is present on all fetch calls", async () => {
    jest.useFakeTimers();
    const signals: Array<AbortSignal | null> = [];
    (global.fetch as jest.Mock) = jest.fn().mockImplementation((_url: unknown, opts: RequestInit = {}) => {
      signals.push(opts.signal ?? null);
      return new Promise<Response>((_resolve, reject) => {
        const sig = opts.signal;
        if (sig) sig.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      });
    });

    const promise = fetchSessionData("user-789");
    await jest.runAllTimersAsync();
    await promise;

    expect(signals.length).toBeGreaterThan(0);
    for (const sig of signals) {
      expect(sig).not.toBeNull();
      expect(sig!.aborted).toBe(true);
    }
  });
});

describe("exchangeSessionForBackendJwt transport deadlines", () => {
  test("returns null when response headers never arrive (stalled header)", async () => {
    jest.useFakeTimers();
    installAbortSensitiveFetch(false, false);

    const promise = exchangeSessionForBackendJwt("user-123", "session-abc", "org-xyz");
    await jest.runAllTimersAsync();

    const result = await promise;
    expect(result).toBeNull();
  });

  test("returns null when response body stalls past deadline", async () => {
    jest.useFakeTimers();
    installAbortSensitiveFetch(true, false);

    const promise = exchangeSessionForBackendJwt("user-123", "session-abc", "org-xyz");
    await jest.runAllTimersAsync();

    const result = await promise;
    expect(result).toBeNull();
  });

  test("abort signal stays active through body parsing", async () => {
    jest.useFakeTimers();

    let capturedSignal: AbortSignal | null = null;
    (global.fetch as jest.Mock) = jest.fn().mockImplementation((_url: unknown, opts: RequestInit = {}) => {
      capturedSignal = opts.signal ?? null;
      return Promise.resolve({
        ok: true,
        json: () =>
          new Promise<unknown>((_resolve, reject) => {
            if (capturedSignal) {
              capturedSignal.addEventListener("abort", () => {
                reject(new DOMException("Aborted", "AbortError"));
              });
            }
          }),
      } as Response);
    });

    const promise = exchangeSessionForBackendJwt("user-123", "session-abc", "org-xyz");
    await jest.runAllTimersAsync();

    const result = await promise;
    expect(result).toBeNull();
    expect(capturedSignal).not.toBeNull();
    expect(capturedSignal!.aborted).toBe(true);
  });
});

describe("resolveGoogleUser transport deadlines", () => {
  test("returns null when response headers never arrive (stalled header)", async () => {
    jest.useFakeTimers();
    installAbortSensitiveFetch(false, false);

    const promise = resolveGoogleUser("a@b.com", "google-id", null, null);
    await jest.runAllTimersAsync();

    const result = await promise;
    expect(result).toBeNull();
  });

  test("returns null when response body stalls past deadline", async () => {
    jest.useFakeTimers();
    installAbortSensitiveFetch(true, false);

    const promise = resolveGoogleUser("a@b.com", "google-id", null, null);
    await jest.runAllTimersAsync();

    const result = await promise;
    expect(result).toBeNull();
  });

  test("abort signal stays active through body parsing", async () => {
    jest.useFakeTimers();

    let capturedSignal: AbortSignal | null = null;
    (global.fetch as jest.Mock) = jest.fn().mockImplementation((_url: unknown, opts: RequestInit = {}) => {
      capturedSignal = opts.signal ?? null;
      return Promise.resolve({
        ok: true,
        json: () =>
          new Promise<unknown>((_resolve, reject) => {
            if (capturedSignal) {
              capturedSignal.addEventListener("abort", () => {
                reject(new DOMException("Aborted", "AbortError"));
              });
            }
          }),
      } as Response);
    });

    const promise = resolveGoogleUser("a@b.com", "google-id", null, null);
    await jest.runAllTimersAsync();

    const result = await promise;
    expect(result).toBeNull();
    expect(capturedSignal).not.toBeNull();
    expect(capturedSignal!.aborted).toBe(true);
  });
});

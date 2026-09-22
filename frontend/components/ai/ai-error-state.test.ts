import { ApiError } from "@/lib/api-envelope";
import { classifyAiError, isRetryableAiFailure } from "./ai-error-state";

describe("classifyAiError", () => {
  it("separates the credit ledger's 402 from the breaker's 503 and the cap's 503", () => {
    const quota = classifyAiError(
      new ApiError("Insufficient AI credits", 402, "INSUFFICIENT_CREDITS"),
    );
    const breaker = classifyAiError(
      new ApiError("AI chat provider is temporarily unavailable", 503),
    );
    const cap = classifyAiError(
      new ApiError("Too many concurrent AI requests for this organization", 503, "AI_CONCURRENCY_LIMIT"),
    );

    expect(quota.status).toBe("quota");
    expect(breaker.status).toBe("unavailable");
    expect(cap.status).toBe("queued");
    expect(new Set([quota.status, breaker.status, cap.status]).size).toBe(3);
  });

  it("reads a plan gate as denied, not as exhausted credits", () => {
    const failure = classifyAiError(
      new ApiError("This module is not available on your plan.", 402, "MODULE_NOT_ENABLED"),
    );
    expect(failure.status).toBe("denied");
  });

  it("treats a bare 402 with no code as credit exhaustion", () => {
    expect(classifyAiError(new ApiError("Payment Required", 402)).status).toBe("quota");
  });

  it("maps a revoked permission to denied whether it comes from the API or the client gate", () => {
    expect(classifyAiError(new ApiError("Forbidden", 403)).status).toBe("denied");
    expect(
      classifyAiError(new Error("Missing permission: ai:chat:use")).status,
    ).toBe("denied");
  });

  it("maps 429 to the same queued state as the concurrency cap", () => {
    expect(classifyAiError(new ApiError("Too Many Requests", 429)).status).toBe("queued");
  });

  it("maps a user abort to cancelled, not to an error", () => {
    const domException = new DOMException("aborted", "AbortError");
    expect(classifyAiError(domException).status).toBe("cancelled");
    expect(
      classifyAiError(new ApiError("Request was cancelled.", undefined, "ABORTED")).status,
    ).toBe("cancelled");
  });

  it("maps a transport failure to offline", () => {
    expect(
      classifyAiError(new ApiError("Network error", undefined, "NETWORK_ERROR")).status,
    ).toBe("offline");
  });

  it("maps a gateway fault or a timeout to unavailable", () => {
    expect(classifyAiError(new ApiError("Bad Gateway", 502)).status).toBe("unavailable");
    expect(classifyAiError(new ApiError("Gateway Timeout", 504)).status).toBe("unavailable");
    expect(
      classifyAiError(new ApiError("Request timed out.", undefined, "TIMEOUT")).status,
    ).toBe("unavailable");
  });

  it("falls through to a generic error for anything else", () => {
    const failure = classifyAiError(new ApiError("Boom", 500));
    expect(failure.status).toBe("error");
    if (failure.status === "error") expect(failure.message.length).toBeGreaterThan(0);
  });

  it("never offers retry on a state re-dispatch cannot fix", () => {
    expect(isRetryableAiFailure("quota")).toBe(false);
    expect(isRetryableAiFailure("denied")).toBe(false);
    expect(isRetryableAiFailure("queued")).toBe(true);
    expect(isRetryableAiFailure("unavailable")).toBe(true);
  });
});

describe("classifyAiError — offline browser", () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    window.navigator,
    "onLine",
  );

  afterEach(() => {
    if (descriptor) Object.defineProperty(window.navigator, "onLine", descriptor);
  });

  it("reports offline before it reports a status code", () => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => false,
    });
    expect(classifyAiError(new ApiError("Service Unavailable", 503)).status).toBe(
      "offline",
    );
  });
});

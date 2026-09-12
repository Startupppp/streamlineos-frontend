import { ApiError } from "@/lib/api-client";
import { parseAuthErrorCode, readRetryAfterSeconds } from "@/lib/parse-auth-error";

function rateLimited(details?: unknown): ApiError {
  return new ApiError("Too many attempts", 429, "AUTH_RATE_LIMITED", details);
}

describe("parseAuthErrorCode", () => {
  it("recognises a known code and carries the lockout window", () => {
    expect(parseAuthErrorCode("AUTH_RATE_LIMITED")).toEqual({ code: "AUTH_RATE_LIMITED" });
    expect(parseAuthErrorCode("AUTH_ACCOUNT_LOCKED:120")).toEqual({
      code: "AUTH_ACCOUNT_LOCKED",
      retryAfterSeconds: 120,
    });
  });

  it("(negative) falls back to a default window on an unparseable lockout, and to UNKNOWN otherwise", () => {
    expect(parseAuthErrorCode("AUTH_ACCOUNT_LOCKED:soon")).toEqual({
      code: "AUTH_ACCOUNT_LOCKED",
      retryAfterSeconds: 900,
    });
    expect(parseAuthErrorCode("SOMETHING_ELSE")).toEqual({ code: "UNKNOWN" });
  });
});

describe("readRetryAfterSeconds", () => {
  it("reads the window the rate limiter reports", () => {
    expect(readRetryAfterSeconds(rateLimited({ retryAfterSeconds: 45 }))).toBe(45);
  });

  it("accepts a numeric string and rounds a fractional second upward", () => {
    expect(readRetryAfterSeconds(rateLimited({ retryAfterSeconds: "45" }))).toBe(45);
    expect(readRetryAfterSeconds(rateLimited({ retryAfterSeconds: 12.1 }))).toBe(13);
  });

  it("caps a window that would strand the control", () => {
    expect(readRetryAfterSeconds(rateLimited({ retryAfterSeconds: 86_400 }))).toBe(900);
  });

  it("(negative) returns null for every unusable value, so the caller keeps its own default", () => {
    const unusable: unknown[] = [
      rateLimited(),
      rateLimited({}),
      rateLimited({ retryAfterSeconds: 0 }),
      rateLimited({ retryAfterSeconds: -30 }),
      rateLimited({ retryAfterSeconds: "soon" }),
      rateLimited({ retryAfterSeconds: null }),
      rateLimited({ retryAfterSeconds: Number.NaN }),
      rateLimited({ retryAfterSeconds: Number.POSITIVE_INFINITY }),
      rateLimited({ retryAfterSeconds: { seconds: 30 } }),
      rateLimited("not-a-record"),
    ];

    expect(unusable.filter((e) => readRetryAfterSeconds(e) === null)).toHaveLength(
      unusable.length,
    );
  });

  it("(negative) returns null for anything that is not a 429 ApiError", () => {
    expect(
      readRetryAfterSeconds(new ApiError("nope", 401, "X", { retryAfterSeconds: 45 })),
    ).toBeNull();
    expect(readRetryAfterSeconds(new Error("plain"))).toBeNull();
    expect(readRetryAfterSeconds({ status: 429, details: { retryAfterSeconds: 45 } })).toBeNull();
    expect(readRetryAfterSeconds(null)).toBeNull();
  });
});

import { ApiError, apiErrorFromResponse, getRetryAfterSeconds } from "@/lib/api-envelope";
import { queryRetryDelay } from "@/lib/query-error-policy";
import { getErrorMessage } from "@/lib/get-error-message";

function rateLimited(retryAfterSecs: number) {
  return {
    ok: false,
    status: 429,
    statusText: "Too Many Requests",
    json: async () => ({ message: "Rate limit exceeded", retryAfterSecs }),
  };
}

describe("a 429 carries its wait and its endpoint", () => {
  it("reads retryAfterSecs off the body", async () => {
    const error = await apiErrorFromResponse(rateLimited(37), "/notifications/events/token");

    expect(getRetryAfterSeconds(error)).toBe(37);
  });

  it("names the endpoint that was throttled", async () => {
    const error = await apiErrorFromResponse(rateLimited(37), "/notifications/events/token");

    expect(error.endpoint).toBe("/notifications/events/token");
  });

  it("returns undefined when the response carries no wait", async () => {
    const error = new ApiError("Boom", 500);

    expect(getRetryAfterSeconds(error)).toBeUndefined();
  });
});

describe("queryRetryDelay", () => {
  it("waits the server's Retry-After instead of the 1s default", async () => {
    const error = await apiErrorFromResponse(rateLimited(37), "/x");

    expect(queryRetryDelay(0, error)).toBe(37_000);
  });

  it("caps an absurd Retry-After so a query cannot hang for an hour", async () => {
    const error = await apiErrorFromResponse(rateLimited(3600), "/x");

    expect(queryRetryDelay(0, error)).toBe(60_000);
  });

  it("falls back to exponential backoff for everything else", () => {
    expect(queryRetryDelay(0, new Error("network"))).toBe(1_000);
    expect(queryRetryDelay(1, new Error("network"))).toBe(2_000);
    expect(queryRetryDelay(9, new Error("network"))).toBe(30_000);
  });
});

describe("getErrorMessage for a 429", () => {
  it("tells the user how long to wait and which endpoint was throttled", async () => {
    const error = await apiErrorFromResponse(rateLimited(37), "/notifications/events/token");
    const message = getErrorMessage(error);

    expect(message).toContain("37");
    expect(message).toContain("/notifications/events/token");
  });
});

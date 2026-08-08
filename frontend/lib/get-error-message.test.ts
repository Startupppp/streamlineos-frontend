import { getErrorMessage } from "./get-error-message";

describe("getErrorMessage", () => {
  it("returns the real backend message untouched", () => {
    expect(getErrorMessage(new Error("Employee code already in use"))).toBe(
      "Employee code already in use",
    );
  });

  it("falls back to a friendly message for empty or unknown errors", () => {
    expect(getErrorMessage(undefined)).toBe("Something went wrong. Please try again.");
    expect(getErrorMessage(new Error("   "))).toBe("Something went wrong. Please try again.");
    expect(getErrorMessage({ message: "[object Object]" })).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("maps a bare status line to its friendly fallback", () => {
    expect(getErrorMessage(new Error("403 Forbidden"))).toBe(
      "You don't have permission for this action.",
    );
    expect(getErrorMessage("500")).toBe(
      "Something went wrong on our end. Please try again shortly.",
    );
  });

  it("maps a bare HTTP reason phrase from a message-less Nest exception", () => {
    expect(getErrorMessage({ statusCode: 403, message: "Forbidden" })).toBe(
      "You don't have permission for this action.",
    );
    expect(getErrorMessage(new Error("Not Found"))).toBe(
      "The requested item could not be found.",
    );
  });

  it("replaces generic backend failures with a useful server fallback", () => {
    expect(
      getErrorMessage({
        status: 500,
        message: "An unexpected error occurred",
      }),
    ).toBe("Something went wrong on our end. Please try again shortly.");
  });

  it("covers 402 credit and plan limits", () => {
    expect(getErrorMessage({ status: 402, message: "Payment Required" })).toBe(
      "You've reached a credit or plan limit for this action.",
    );
    expect(getErrorMessage({ status: 402, message: "Insufficient AI credits" })).toBe(
      "Insufficient AI credits",
    );
  });

  it("uses the status when the error carries no message at all", () => {
    expect(getErrorMessage({ status: 429, message: "" })).toBe(
      "Too many requests. Please wait a moment and try again.",
    );
    expect(getErrorMessage({ statusCode: 415 })).toBe("That file type isn't supported.");
  });

  it("joins a NestJS validation message array", () => {
    expect(getErrorMessage({ message: ["email must be an email", "name should not be empty"] })).toBe(
      "email must be an email, name should not be empty",
    );
  });

  it("reads the legacy error field", () => {
    expect(getErrorMessage({ error: "Export failed" })).toBe("Export failed");
  });

  it("unwraps an empty error to its cause", () => {
    expect(getErrorMessage(new Error("", { cause: new Error("Upload rejected") }))).toBe(
      "Upload rejected",
    );
  });

  it("reports network failures, naming the host when known", () => {
    expect(getErrorMessage(new Error("Failed to fetch"))).toBe(
      "Network error. Check your connection and try again.",
    );
    expect(
      getErrorMessage(
        new Error("Network error contacting api.streamlineos.in. Check your connection and try again."),
      ),
    ).toBe("Network error contacting api.streamlineos.in. Check your connection and try again.");
  });

  it("reports a stale build rather than a network error for chunk failures", () => {
    expect(getErrorMessage(new Error("Loading chunk 483 failed."))).toBe(
      "A new version of the app is available. Please refresh the page and try again.",
    );
    expect(getErrorMessage(new Error("Failed to fetch dynamically imported module: /_next/x.js"))).toBe(
      "A new version of the app is available. Please refresh the page and try again.",
    );
  });
});

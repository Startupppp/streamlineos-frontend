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

  it("keeps the failing method and path so a network failure is diagnosable", () => {
    expect(
      getErrorMessage(
        new Error(
          "Network error contacting api.streamlineos.in (PATCH /me/expenses/1). Check your connection and try again.",
        ),
      ),
    ).toBe(
      "Network error contacting api.streamlineos.in (PATCH /me/expenses/1). Check your connection and try again.",
    );
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

/**
 * Validation refusals, which used to arrive as three words.
 *
 * `AllExceptionsFilter` answers a `ZodError` with `"Validation failed."` and
 * the issues in `details`. Reading only `message` meant a form could be refused
 * for a named field and say nothing about which one -- the CRM assignment-rule
 * sheet lost three of its five options behind that sentence.
 */
describe("getErrorMessage on a validation refusal", () => {
  function refusal(details: unknown, message = "Validation failed.") {
    return Object.assign(new Error(message), { status: 400, code: "VALIDATION_FAILED", details });
  }

  it("says which field was refused instead of just that something was", () => {
    expect(
      getErrorMessage(
        refusal([{ path: "unitPrice", message: "Unit price must be positive" }]),
      ),
    ).toBe("unitPrice: Unit price must be positive");
  });

  it("drops the placeholder path the filter uses for a whole-body issue", () => {
    expect(getErrorMessage(refusal([{ path: "body", message: "Expected an object" }]))).toBe(
      "Expected an object",
    );
  });

  it("caps a long list rather than filling the screen with it", () => {
    const many = Array.from({ length: 6 }, (_, i) => ({
      path: `field${i}`,
      message: "Required",
    }));
    const result = getErrorMessage(refusal(many));
    expect(result).toBe("field0: Required; field1: Required; field2: Required (and 3 more)");
  });

  it("keeps a real message and adds the detail to it", () => {
    expect(
      getErrorMessage(
        refusal([{ path: "stage", message: "Required" }], "Stage transition blocked"),
      ),
    ).toBe("Stage transition blocked stage: Required");
  });

  it("ignores details that carry no readable issue", () => {
    expect(getErrorMessage(refusal([{ path: "x" }, { message: "  " }]))).toBe("Validation failed.");
    expect(getErrorMessage(refusal({ missingFields: ["a"] }))).toBe("Validation failed.");
  });

  it("leaves every other error exactly as it was", () => {
    expect(getErrorMessage(new Error("Quote is pending approval and cannot be sent"))).toBe(
      "Quote is pending approval and cannot be sent",
    );
  });
});

import { ApiError } from "./api-envelope";
import { getErrorMessage, isValidationRefusal } from "./get-error-message";

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

  it("flags a Zod refusal so the composer can keep the typed message", () => {
    const error = new ApiError("Validation failed.", 400, "VALIDATION_FAILED", [
      { path: "messages.0.content", message: "Too big: expected string to have <=10000 characters" },
    ]);
    expect(isValidationRefusal(error)).toBe(true);
    expect(getErrorMessage(error)).toBe(
      "messages.0.content: Too big: expected string to have <=10000 characters",
    );
  });

  it("does not treat credit exhaustion as a composer validation", () => {
    expect(
      isValidationRefusal(new ApiError("AI credits exhausted", 402, "INSUFFICIENT_CREDITS")),
    ).toBe(false);
  });
});

describe("getErrorMessage on a coded Build refusal", () => {
  it("names the locked project's standing and the way out on a 409 PROJECT_LOCKED", () => {
    const error = new ApiError(
      "This project is archived. Reopen it before making changes.",
      409,
      "PROJECT_LOCKED",
      { state: "ARCHIVED" },
    );
    expect(getErrorMessage(error)).toBe("This project is archived — reopen it to make changes.");
  });

  it("still explains a PROJECT_LOCKED refusal that carries no state", () => {
    const error = new ApiError("", 409, "PROJECT_LOCKED");
    expect(getErrorMessage(error)).toBe(
      "This project is archived or completed — reopen it to make changes.",
    );
  });

  it("keeps an ordinary 409 conflict on its own message", () => {
    const error = new ApiError("Ticket was changed by someone else", 409, "VERSION_CONFLICT");
    expect(getErrorMessage(error)).toBe("Ticket was changed by someone else");
  });

  it("points a plan-locked MODULE_NOT_ENABLED refusal at billing", () => {
    const error = new ApiError("Build is not included in your current plan.", 402, "MODULE_NOT_ENABLED", {
      moduleKey: "build",
      reason: "not-in-plan",
      upgradePath: "/settings/billing",
    });
    expect(getErrorMessage(error)).toBe(
      "Build is not included in your current plan. Upgrade your plan in Settings → Billing to use it.",
    );
  });

  it("does not offer an upgrade for a module an admin switched off", () => {
    const error = new ApiError("Build is not enabled for your organization.", 402, "MODULE_NOT_ENABLED", {
      moduleKey: "build",
      reason: "org-disabled",
      upgradePath: null,
    });
    expect(getErrorMessage(error)).toBe("Build is not enabled for your organization.");
  });
});

describe("getErrorMessage strips correlation and raw IDs", () => {
  it("does not surface a bare UUID from the server message", () => {
    const uuid = "7eca7bad-1234-4abc-9def-0123456789ab";
    expect(getErrorMessage(new Error(`Request failed ${uuid}`))).not.toContain(uuid);
  });

  it("maps 401 to a session-expired prompt", () => {
    expect(getErrorMessage({ status: 401, message: "Unauthorized" })).toBe(
      "Your session expired. Please sign in again.",
    );
  });

  it("maps network failures to a connection prompt", () => {
    expect(getErrorMessage(new Error("Failed to fetch"))).toMatch(/network/i);
  });
});

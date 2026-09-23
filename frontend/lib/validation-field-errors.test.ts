import { ApiError, getValidationFieldErrors } from "@/lib/api-envelope";

describe("a Zod rejection from the API reaches the field that caused it, because the envelope's own message is only \"Validation failed.\"", () => {
  it("reads the details array the backend sends", () => {
    const error = new ApiError("Validation failed.", 400, "VALIDATION_FAILED", [
      { path: "accrualRate", message: "Accrual rate is required" },
    ]);

    expect(getValidationFieldErrors(error)).toEqual([
      { path: "accrualRate", message: "Accrual rate is required" },
    ]);
  });

  it("reads it when the correlation id has wrapped the array", () => {
    const error = new ApiError("Validation failed.", 400, "VALIDATION_FAILED", {
      details: [{ path: "maxBalance", message: "Must be a valid decimal number" }],
      correlationId: "req-1",
    });

    expect(getValidationFieldErrors(error)).toEqual([
      { path: "maxBalance", message: "Must be a valid decimal number" },
    ]);
  });

  it("returns nothing for an error that is not a validation rejection", () => {
    expect(
      getValidationFieldErrors(new ApiError("Boom", 500, "INTERNAL")),
    ).toEqual([]);
    expect(getValidationFieldErrors(new Error("plain"))).toEqual([]);
  });

  it("skips malformed entries rather than trusting the body's shape", () => {
    const error = new ApiError("Validation failed.", 400, "VALIDATION_FAILED", [
      { path: "ok", message: "fine" },
      { path: 42 },
      "nonsense",
    ]);

    expect(getValidationFieldErrors(error)).toEqual([
      { path: "ok", message: "fine" },
    ]);
  });
});

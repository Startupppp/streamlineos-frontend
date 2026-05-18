import { describe, expect, it } from "vitest";
import { derivePayslipPassword } from "./payslip-password";

describe("derivePayslipPassword", () => {
  it("returns DDMMYYYY from ISO date of birth", () => {
    expect(derivePayslipPassword({ dateOfBirth: "1995-10-05" })).toBe("05101995");
  });

  it("pads single-digit day and month", () => {
    expect(derivePayslipPassword({ dateOfBirth: "1995-01-01" })).toBe("01011995");
  });

  it("returns null when DOB missing", () => {
    expect(derivePayslipPassword({})).toBeNull();
    expect(derivePayslipPassword({ dateOfBirth: null })).toBeNull();
  });

  it("uses local-date components when DOB is a Date instance", () => {
    const dob = new Date(1995, 9, 5);
    expect(derivePayslipPassword({ dateOfBirth: dob })).toBe("05101995");
  });

  it("does not shift the day when DOB Date crosses midnight in IST", () => {
    const dob = new Date(1995, 9, 5, 0, 30);
    expect(derivePayslipPassword({ dateOfBirth: dob })).toBe("05101995");
  });
});

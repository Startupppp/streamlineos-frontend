import { describe, expect, it } from "vitest";
import { derivePayslipPassword } from "./payslip-password";

describe("derivePayslipPassword", () => {
  it("standard format: PAN first 4 + DDMM of DOB", () => {
    expect(
      derivePayslipPassword({
        panNumber: "ABCDE1234F",
        dateOfBirth: "1995-10-05",
      })
    ).toBe("ABCD0510");
  });

  it("PAN is uppercased", () => {
    expect(
      derivePayslipPassword({
        panNumber: "abcde1234f",
        dateOfBirth: "1995-10-05",
      })
    ).toBe("ABCD0510");
  });

  it("strips non-letters from PAN before taking first 4", () => {
    expect(
      derivePayslipPassword({
        panNumber: "AB-CD-1234F",
        dateOfBirth: "1995-10-05",
      })
    ).toBe("ABCD0510");
  });

  it("DDMM padded for single-digit days/months", () => {
    expect(
      derivePayslipPassword({
        panNumber: "ABCDE1234F",
        dateOfBirth: "1995-01-01",
      })
    ).toBe("ABCD0101");
  });

  it("falls back to employee name when PAN missing", () => {
    expect(
      derivePayslipPassword({
        employeeName: "Rohit Sharma",
        dateOfBirth: "1990-12-15",
      })
    ).toBe("ROHI1512");
  });

  it("falls back to joiningDate when DOB missing", () => {
    expect(
      derivePayslipPassword({
        panNumber: "ABCDE1234F",
        joiningDate: "2024-03-08",
      })
    ).toBe("ABCD0803");
  });

  it("returns null when both name source and date source are missing", () => {
    expect(derivePayslipPassword({ panNumber: "ABCDE1234F" })).toBeNull();
    expect(derivePayslipPassword({ dateOfBirth: "1995-10-05" })).toBeNull();
    expect(derivePayslipPassword({})).toBeNull();
  });

  it("returns null when name source resolves to fewer than 4 letters", () => {
    expect(
      derivePayslipPassword({
        panNumber: "AB",
        dateOfBirth: "1995-10-05",
      })
    ).toBeNull();
  });
});

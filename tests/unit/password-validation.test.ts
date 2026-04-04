import { describe, it, expect } from "vitest";
import { z } from "zod";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const passwordSchema = z.string().min(8).max(128).regex(PASSWORD_REGEX, {
  message: "Password must contain uppercase, lowercase, number, and special character",
});

describe("password validation schema", () => {
  it("accepts a valid strong password", () => {
    expect(() => passwordSchema.parse("Secure@123")).not.toThrow();
  });

  it("rejects a password without uppercase", () => {
    const result = passwordSchema.safeParse("secure@123");
    expect(result.success).toBe(false);
  });

  it("rejects a password without lowercase", () => {
    const result = passwordSchema.safeParse("SECURE@123");
    expect(result.success).toBe(false);
  });

  it("rejects a password without a number", () => {
    const result = passwordSchema.safeParse("Secure@abc");
    expect(result.success).toBe(false);
  });

  it("rejects a password without a special character", () => {
    const result = passwordSchema.safeParse("Secure123");
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = passwordSchema.safeParse("S@1a");
    expect(result.success).toBe(false);
  });

  it("rejects a password longer than 128 characters", () => {
    const long = "Aa@1" + "x".repeat(130);
    const result = passwordSchema.safeParse(long);
    expect(result.success).toBe(false);
  });

  it("accepts passwords with all required character classes", () => {
    const passwords = ["MyPass@1", "Hello$2025", "Tr0uble!!", "Abcd!123"];
    for (const pw of passwords) {
      expect(() => passwordSchema.parse(pw), `Expected "${pw}" to be valid`).not.toThrow();
    }
  });
});

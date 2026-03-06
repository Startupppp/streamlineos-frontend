import { describe, it, expect } from "vitest";
import {
  getPasswordStrength,
  PASSWORD_REGEX,
  PASSWORD_REQUIREMENTS,
} from "@/lib/password-utils";

describe("getPasswordStrength", () => {
  it("returns weak for empty password", () => {
    const result = getPasswordStrength("");
    expect(result.level).toBe("weak");
    expect(result.passed).toBe(0);
    expect(result.percentage).toBe(0);
  });

  it("returns weak for short lowercase-only password", () => {
    const result = getPasswordStrength("abc");
    expect(result.level).toBe("weak");
    expect(result.checks.length).toBe(false);
    expect(result.checks.lowercase).toBe(true);
  });

  it("returns fair for medium password", () => {
    // length(8+) + lowercase + uppercase = 3 checks
    const result = getPasswordStrength("Password");
    expect(result.level).toBe("fair");
    expect(result.passed).toBe(3);
  });

  it("returns good for decent password", () => {
    const result = getPasswordStrength("Password1");
    expect(result.level).toBe("good");
    expect(result.passed).toBe(4);
  });

  it("returns strong for complete password", () => {
    const result = getPasswordStrength("MyP@ss1word");
    expect(result.level).toBe("strong");
    expect(result.passed).toBe(5);
    expect(result.percentage).toBe(100);
    expect(result.color).toBe("bg-green-500");
  });

  it("checks individual requirements", () => {
    const result = getPasswordStrength("Abcd1234!");
    expect(result.checks.length).toBe(true);
    expect(result.checks.lowercase).toBe(true);
    expect(result.checks.uppercase).toBe(true);
    expect(result.checks.number).toBe(true);
    expect(result.checks.special).toBe(true);
  });
});

describe("PASSWORD_REGEX", () => {
  it("matches strong passwords", () => {
    expect(PASSWORD_REGEX.test("MyP@ss1word")).toBe(true);
    expect(PASSWORD_REGEX.test("Str0ng!Pass")).toBe(true);
  });

  it("rejects weak passwords", () => {
    expect(PASSWORD_REGEX.test("password")).toBe(false);
    expect(PASSWORD_REGEX.test("12345678")).toBe(false);
    expect(PASSWORD_REGEX.test("Short1!")).toBe(false);
    expect(PASSWORD_REGEX.test("nouppercasenum1!")).toBe(false);
  });
});

describe("PASSWORD_REQUIREMENTS", () => {
  it("has 5 requirements", () => {
    expect(PASSWORD_REQUIREMENTS).toHaveLength(5);
  });

  it("includes expected keys", () => {
    const keys = PASSWORD_REQUIREMENTS.map((r) => r.key);
    expect(keys).toContain("length");
    expect(keys).toContain("uppercase");
    expect(keys).toContain("lowercase");
    expect(keys).toContain("number");
    expect(keys).toContain("special");
  });
});

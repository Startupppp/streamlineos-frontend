import {
  SECURITY_LIST_MAX_ENTRIES,
  orgSecurityFormSchema,
  parseSecurityList,
} from "./org-security-schema";

describe("organization security form", () => {
  it("normalizes comma and line-separated policy values", () => {
    expect(parseSecurityList("example.com,\n subsidiary.com")).toEqual([
      "example.com",
      "subsidiary.com",
    ]);
  });

  it("accepts an unlimited session policy", () => {
    expect(
      orgSecurityFormSchema.safeParse({
        mfaEnforced: true,
        allowedEmailDomains: "example.com",
        ipAllowlist: "",
        maxConcurrentSessions: "",
      }).success,
    ).toBe(true);
  });

  it("rejects invalid domains and session limits", () => {
    expect(
      orgSecurityFormSchema.safeParse({
        mfaEnforced: false,
        allowedEmailDomains: "not a domain",
        ipAllowlist: "",
        maxConcurrentSessions: "101",
      }).success,
    ).toBe(false);
  });

  it("accepts exactly the backend list ceiling", () => {
    const entries = Array.from(
      { length: SECURITY_LIST_MAX_ENTRIES },
      (_, i) => `10.0.0.${i}`,
    ).join("\n");

    expect(
      orgSecurityFormSchema.safeParse({
        mfaEnforced: false,
        allowedEmailDomains: "",
        ipAllowlist: entries,
        maxConcurrentSessions: "",
      }).success,
    ).toBe(true);
  });

  it("rejects an IP allowlist longer than the backend accepts", () => {
    const entries = Array.from(
      { length: SECURITY_LIST_MAX_ENTRIES + 1 },
      (_, i) => `10.0.1.${i}`,
    ).join("\n");

    expect(
      orgSecurityFormSchema.safeParse({
        mfaEnforced: false,
        allowedEmailDomains: "",
        ipAllowlist: entries,
        maxConcurrentSessions: "",
      }).success,
    ).toBe(false);
  });

  it("rejects a domain list longer than the backend accepts", () => {
    const entries = Array.from(
      { length: SECURITY_LIST_MAX_ENTRIES + 1 },
      (_, i) => `tenant${i}.example.com`,
    ).join("\n");

    expect(
      orgSecurityFormSchema.safeParse({
        mfaEnforced: false,
        allowedEmailDomains: entries,
        ipAllowlist: "",
        maxConcurrentSessions: "",
      }).success,
    ).toBe(false);
  });
});

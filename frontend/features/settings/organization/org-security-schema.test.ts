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

  it.each(["10.0.0.1", "203.0.113.0/24", "2001:db8::/32", "::1"])(
    "accepts the IP allowlist entry %s",
    (entry) => {
      expect(
        orgSecurityFormSchema.safeParse({
          mfaEnforced: false,
          allowedEmailDomains: "",
          ipAllowlist: entry,
          maxConcurrentSessions: "",
        }).success,
      ).toBe(true);
    },
  );

  it.each(["10.0.0", "not-an-ip", "10.0.0.1/33", "10.0.0.1/24/1"])(
    "rejects the malformed IP allowlist entry %s before it can lock members out",
    (entry) => {
      const result = orgSecurityFormSchema.safeParse({
        mfaEnforced: false,
        allowedEmailDomains: "",
        ipAllowlist: `10.0.0.1\n${entry}`,
        maxConcurrentSessions: "",
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toMatch(/IPv4 or IPv6/);
    },
  );

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

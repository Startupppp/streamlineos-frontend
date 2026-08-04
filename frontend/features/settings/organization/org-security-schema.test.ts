import {
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
});

import { validateInviteEmail } from "./invite-email";
import type { Invitee } from "./wizard-data-schema";

const none: Invitee[] = [];

function invitee(email: string): Invitee {
  return { email, role: "MEMBER" };
}

describe("validateInviteEmail", () => {
  it("accepts a well-formed address", () => {
    expect(validateInviteEmail("teammate@company.com", none)).toEqual({
      ok: true,
      email: "teammate@company.com",
    });
  });

  it("trims surrounding whitespace", () => {
    const result = validateInviteEmail("  teammate@company.com  ", none);
    expect(result).toEqual({ ok: true, email: "teammate@company.com" });
  });

  it("canonicalises to lowercase, as the backend does", () => {
    const result = validateInviteEmail("Teammate@Company.COM", none);
    expect(result).toEqual({ ok: true, email: "teammate@company.com" });
  });

  // The old check was `includes("@")`, which let all of these through to a
  // bulk-invite request the backend rejects wholesale.
  it.each(["a@", "@b", "a@@b", "@", "no-at-sign", "spaced out@x.com"])(
    "rejects %p",
    (value) => {
      const result = validateInviteEmail(value, none);
      expect(result.ok).toBe(false);
    },
  );

  it("rejects an empty or whitespace-only value", () => {
    expect(validateInviteEmail("", none).ok).toBe(false);
    expect(validateInviteEmail("   ", none).ok).toBe(false);
  });

  it("rejects an address longer than the backend's 254-character cap", () => {
    const long = `${"a".repeat(250)}@company.com`;
    expect(validateInviteEmail(long, none).ok).toBe(false);
  });

  it("reports a duplicate rather than silently dropping it", () => {
    const result = validateInviteEmail("teammate@company.com", [
      invitee("teammate@company.com"),
    ]);
    expect(result).toEqual({
      ok: false,
      error: "That address is already on the invite list.",
    });
  });

  it("treats a duplicate as duplicate regardless of case", () => {
    const result = validateInviteEmail("TEAMMATE@company.com", [
      invitee("teammate@company.com"),
    ]);
    expect(result.ok).toBe(false);
  });

  it("returns a message a user can act on", () => {
    const result = validateInviteEmail("a@", none);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Enter a valid email address");
  });
});

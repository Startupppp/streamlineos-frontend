import { describeInviteFailure } from "./invite-error-message";

describe("Flow 2 — an invite failure must name its cause, never a silent 404", () => {
  it("separates an expired invitation from a revoked one", () => {
    expect(describeInviteFailure("resend", "Invitation expired")).toMatch(/expired/i);
    expect(describeInviteFailure("resend", "Invitation was revoked")).toMatch(/revoked/i);
    expect(describeInviteFailure("resend", "Invitation expired")).not.toEqual(
      describeInviteFailure("resend", "Invitation was revoked"),
    );
  });

  it("says an already-used invitation was accepted rather than reporting a failure to find it", () => {
    expect(describeInviteFailure("cancel", "Invitation already accepted")).toMatch(
      /already used/i,
    );
  });

  it("points an already-a-member case at access management instead of a second invitation", () => {
    expect(describeInviteFailure("invite", "User is already a member")).toMatch(
      /already a member/i,
    );
  });

  it("never leaves a bare not-found on screen, and says which action failed", () => {
    const cancelled = describeInviteFailure("cancel", "Invitation not found");
    const resent = describeInviteFailure("resend", "Invitation not found");

    expect(cancelled).toMatch(/cancelled/);
    expect(resent).toMatch(/resent/);
    expect(cancelled).not.toBe("Invitation not found");
  });

  it("passes an unrecognised server message through rather than inventing a cause", () => {
    expect(describeInviteFailure("invite", "Mail provider rejected the domain")).toBe(
      "Mail provider rejected the domain",
    );
  });
});

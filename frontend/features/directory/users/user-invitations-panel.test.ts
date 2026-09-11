import {
  isInvitationResendPending,
  isInvitationRoleChangePending,
} from "./user-invitations-panel";

describe("invitation row resend state", () => {
  it("marks only the row represented by the mutation variables as pending", () => {
    expect(isInvitationResendPending(true, "invite-2", "invite-1")).toBe(false);
    expect(isInvitationResendPending(true, "invite-2", "invite-2")).toBe(true);
  });

  it("does not leave a row pending after the mutation settles", () => {
    expect(isInvitationResendPending(false, "invite-2", "invite-2")).toBe(false);
  });

  it("disables only the invitation whose role is changing", () => {
    expect(isInvitationRoleChangePending(true, "invite-2", "invite-1")).toBe(
      false,
    );
    expect(isInvitationRoleChangePending(true, "invite-2", "invite-2")).toBe(
      true,
    );
  });
});

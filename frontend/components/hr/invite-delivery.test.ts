import { INVITE_NOT_SENT_FALLBACK, describeUnsentInvite } from "@/components/hr/invite-delivery";

describe("describeUnsentInvite — the wizard and the resend action share one reading of the backend's invite outcome", () => {
  it("is silent when the invite was accepted for delivery", () => {
    expect(describeUnsentInvite({ sent: true, reason: null })).toBeNull();
  });

  it("names the backend's reason when the invite was not sent", () => {
    expect(
      describeUnsentInvite({
        sent: false,
        reason: "No email provider is configured, so the email could not be sent.",
      }),
    ).toBe("Invitation not sent. No email provider is configured, so the email could not be sent.");
  });

  it("still warns when the backend gave no reason, rather than reading as success", () => {
    expect(describeUnsentInvite({ sent: false, reason: null })).toBe(
      `Invitation not sent. ${INVITE_NOT_SENT_FALLBACK}`,
    );
  });
});

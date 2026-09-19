import { parseAskOsDirective } from "./ask-os-directive-schema";

describe("parseAskOsDirective", () => {
  it("parses a valid CONFIRM_ACTION directive", () => {
    const body = JSON.stringify({
      proposalId: 7,
      token: "tok-xyz",
      action: "send_email",
      summary: "Send email to Jane",
      preview: { to: "jane@example.com", subject: "Hello" },
    });
    const result = parseAskOsDirective(`CONFIRM_ACTION:${body}`);
    expect(result).toEqual({
      kind: "confirm-action",
      proposalId: 7,
      token: "tok-xyz",
      action: "send_email",
      summary: "Send email to Jane",
      preview: { to: "jane@example.com", subject: "Hello" },
    });
  });

  it("parses a valid CONNECT_INTEGRATION directive with no-connection reason", () => {
    const body = JSON.stringify({
      toolkit: "gmail",
      reason: "no-connection",
      summary: "No Gmail account connected.",
    });
    const result = parseAskOsDirective(`CONNECT_INTEGRATION:${body}`);
    expect(result).toEqual({
      kind: "connect-integration",
      toolkit: "gmail",
      reason: "no-connection",
      summary: "No Gmail account connected.",
    });
  });

  it("parses a valid CONNECT_INTEGRATION directive with needs-reauth reason, distinguishable from no-connection", () => {
    const body = JSON.stringify({
      toolkit: "outlook",
      reason: "needs-reauth",
      summary: "Your Outlook connection needs refreshing.",
    });
    const result = parseAskOsDirective(`CONNECT_INTEGRATION:${body}`);
    expect(result).toEqual({
      kind: "connect-integration",
      toolkit: "outlook",
      reason: "needs-reauth",
      summary: "Your Outlook connection needs refreshing.",
    });
    expect(result?.reason).not.toBe("no-connection");
  });

  it("returns null for malformed JSON after a known prefix", () => {
    expect(parseAskOsDirective("CONFIRM_ACTION:{broken json")).toBeNull();
  });

  it("returns null for an unknown prefix", () => {
    expect(
      parseAskOsDirective('UNKNOWN_DIRECTIVE:{"toolkit":"gmail"}'),
    ).toBeNull();
  });

  it("returns null when a required field is missing from the payload", () => {
    const bodyMissingToken = JSON.stringify({
      proposalId: 1,
      action: "send_email",
      summary: "Missing token field",
      preview: {},
    });
    expect(parseAskOsDirective(`CONFIRM_ACTION:${bodyMissingToken}`)).toBeNull();
  });
});

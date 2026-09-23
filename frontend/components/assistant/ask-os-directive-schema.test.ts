import {
  appendAskOsDirective,
  extractAskOsDirective,
  parseAskOsDirective,
  parseAskOsDirectivePayload,
  serializeAskOsDirective,
} from "./ask-os-directive-schema";

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

  it("parses a valid CONFIRM_ACTION directive with optional expiresAt, title and confirmLabel", () => {
    const body = JSON.stringify({
      proposalId: 7,
      token: "tok-xyz",
      action: "email.send",
      summary: "Send email to Jane",
      preview: { to: "jane@example.com" },
      expiresAt: "2026-09-19T10:00:00.000Z",
      title: "Send email",
      confirmLabel: "Send",
    });
    const result = parseAskOsDirective(`CONFIRM_ACTION:${body}`);
    expect(result).toEqual({
      kind: "confirm-action",
      proposalId: 7,
      token: "tok-xyz",
      action: "email.send",
      summary: "Send email to Jane",
      preview: { to: "jane@example.com" },
      expiresAt: "2026-09-19T10:00:00.000Z",
      title: "Send email",
      confirmLabel: "Send",
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
    if (result?.kind === "connect-integration") expect(result.reason).not.toBe("no-connection");
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
    const bodyMissingAction = JSON.stringify({
      proposalId: 1,
      summary: "Missing action field",
      preview: {},
    });
    expect(parseAskOsDirective(`CONFIRM_ACTION:${bodyMissingAction}`)).toBeNull();
  });
});

describe("parseAskOsDirectivePayload — typed object path for stream data frames", () => {
  it("parses a confirm-action object directly without any text prefix, reusing the same schema", () => {
    const result = parseAskOsDirectivePayload({
      kind: "confirm-action",
      proposalId: 3,
      token: "tok-abc",
      action: "create_task",
      summary: "Create a task for Alice",
      preview: { title: "Follow up" },
    });
    expect(result).toEqual({
      kind: "confirm-action",
      proposalId: 3,
      token: "tok-abc",
      action: "create_task",
      summary: "Create a task for Alice",
      preview: { title: "Follow up" },
    });
  });

  it("parses a confirm-action with expiresAt, title and confirmLabel from the stream data frame", () => {
    const result = parseAskOsDirectivePayload({
      kind: "confirm-action",
      proposalId: 3,
      token: "tok-abc",
      action: "email.send",
      summary: "Send email to Alice",
      preview: { to: "alice@example.com" },
      expiresAt: "2026-09-19T10:00:00.000Z",
      title: "Send email",
      confirmLabel: "Send",
    });
    expect(result?.kind).toBe("confirm-action");
    if (result?.kind !== "confirm-action") throw new Error("narrowing");
    expect(result.expiresAt).toBe("2026-09-19T10:00:00.000Z");
    expect(result.title).toBe("Send email");
    expect(result.confirmLabel).toBe("Send");
  });

  it("parses a connect-integration object directly without any text prefix", () => {
    const result = parseAskOsDirectivePayload({
      kind: "connect-integration",
      toolkit: "gmail",
      reason: "no-connection",
      summary: "Connect Gmail to continue.",
    });
    expect(result).toEqual({
      kind: "connect-integration",
      toolkit: "gmail",
      reason: "no-connection",
      summary: "Connect Gmail to continue.",
    });
  });

  it("returns null for a malformed payload missing required fields, so invalid server data is safe", () => {
    expect(parseAskOsDirectivePayload({ kind: "confirm-action" })).toBeNull();
  });

  it("returns null for an unrecognised kind, so future server additions don't crash older clients", () => {
    expect(parseAskOsDirectivePayload({ kind: "unknown-directive", data: {} })).toBeNull();
  });

  it("returns null when the payload is not an object, guarding against primitive data frames", () => {
    expect(parseAskOsDirectivePayload("some string")).toBeNull();
    expect(parseAskOsDirectivePayload(null)).toBeNull();
    expect(parseAskOsDirectivePayload(42)).toBeNull();
  });

  it("the historical text-sentinel path still works for already-persisted messages via parseAskOsDirective", () => {
    const body = JSON.stringify({
      proposalId: 7,
      token: "tok-xyz",
      action: "send_email",
      summary: "Send email to Jane",
      preview: { to: "jane@example.com" },
    });
    const result = parseAskOsDirective(`CONFIRM_ACTION:${body}`);
    expect(result?.kind).toBe("confirm-action");
    if (result?.kind === "confirm-action") expect(result.token).toBe("tok-xyz");
  });
});

describe("Ask OS directive encoding stays on the message, not a separate footer", () => {
  const connect = {
    kind: "connect-integration" as const,
    toolkit: "gmail" as const,
    reason: "no-connection" as const,
    summary: "Connect a mail account to read your inbox.",
  };

  const confirmEmail = {
    kind: "confirm-action" as const,
    proposalId: 1,
    token: "tok-1",
    action: "email.send",
    summary: "Send email to jane@example.com",
    preview: { to: "jane@example.com" },
    title: "Send email",
    confirmLabel: "Send",
  };

  it("round-trips a connect directive so a persisted assistant turn can render the same action", () => {
    expect(parseAskOsDirective(serializeAskOsDirective(connect))).toEqual(connect);
  });

  it("keeps assistant prose and hangs the encoded connect action off the last line", () => {
    const encoded = appendAskOsDirective(
      "I can search the knowledge base after you connect mail.",
      [connect],
    );

    expect(extractAskOsDirective(encoded)).toEqual({
      directives: [connect],
      prose: "I can search the knowledge base after you connect mail.",
    });
  });

  it("does not duplicate an already-encoded connect action when the stream also sent a data frame", () => {
    const encoded = serializeAskOsDirective(connect);
    expect(appendAskOsDirective(encoded, [connect])).toBe(encoded);
  });

  it("extracts directives from a message that has a trailing newline so LLM responses are handled correctly", () => {
    const encoded = appendAskOsDirective(
      "I can search the knowledge base after you connect mail.",
      [connect],
    );
    const withTrailingNewline = `${encoded}\n`;
    expect(extractAskOsDirective(withTrailingNewline)).toEqual({
      directives: [connect],
      prose: "I can search the knowledge base after you connect mail.",
    });
  });

  it("accumulates N directives in order so a multi-action turn persists correctly", () => {
    const encoded = appendAskOsDirective("", [confirmEmail, connect]);
    const { directives, prose } = extractAskOsDirective(encoded);
    expect(prose).toBe("");
    expect(directives).toHaveLength(2);
    expect(directives[0]?.kind).toBe("confirm-action");
    expect(directives[1]?.kind).toBe("connect-integration");
  });

  it("preserves prose when multiple directives are appended on consecutive final lines", () => {
    const prose = "I have two things to show you.";
    const encoded = appendAskOsDirective(prose, [confirmEmail, connect]);
    const extracted = extractAskOsDirective(encoded);
    expect(extracted.prose).toBe(prose);
    expect(extracted.directives).toHaveLength(2);
  });
});

describe("a directive replayed from stored chat history carries no redeemable token", () => {
  const PERSISTED = `CONFIRM_ACTION:${JSON.stringify({
    proposalId: 42,
    action: "hr.grantBonus",
    summary: "Grant a bonus of 5,000 to Priya Raman",
    preview: { amount: 5000 },
    expiresAt: "2026-09-20T12:00:00.000Z",
    title: "Grant bonus",
    confirmLabel: "Grant",
  })}`;

  it("parses a stored directive that has no token, because the backend stopped persisting one and a reject would blank the card", () => {
    const parsed = parseAskOsDirective(PERSISTED);

    expect(parsed).not.toBeNull();
    expect(parsed?.kind).toBe("confirm-action");
  });

  it("keeps everything the read-only card renders", () => {
    const parsed = parseAskOsDirective(PERSISTED);

    expect(parsed).toMatchObject({
      proposalId: 42,
      action: "hr.grantBonus",
      summary: "Grant a bonus of 5,000 to Priya Raman",
      title: "Grant bonus",
      confirmLabel: "Grant",
    });
  });

  it("refuses a live stream payload with no token, so a tokenless directive can never reach the confirm button", () => {
    expect(
      parseAskOsDirectivePayload({
        kind: "confirm-action",
        proposalId: 42,
        action: "hr.grantBonus",
        summary: "s",
        preview: {},
      }),
    ).toBeNull();
  });

  it("refuses a live payload whose token is an empty string, because an empty token would render an unusable Confirm button", () => {
    expect(
      parseAskOsDirectivePayload({
        kind: "confirm-action",
        proposalId: 42,
        token: "",
        action: "hr.grantBonus",
        summary: "s",
        preview: {},
      }),
    ).toBeNull();
  });

  it("accepts a live payload that does carry a token, so the assertions above are not rejecting everything", () => {
    expect(
      parseAskOsDirectivePayload({
        kind: "confirm-action",
        proposalId: 42,
        token: "redeemable",
        action: "hr.grantBonus",
        summary: "s",
        preview: {},
      }),
    ).toMatchObject({ token: "redeemable" });
  });
});

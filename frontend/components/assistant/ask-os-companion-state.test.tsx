import { render, screen } from "@testing-library/react";
import type { ConfirmActionActivity } from "@/hooks/api/ai-confirm-action";
import type { AskAiHistoryMessage } from "@/hooks/api/chat-ai-assistant";
import {
  AskOsCompanionStateContext,
  AskOsStatusText,
  deriveAskOsCompanionState,
  useAskOsCompanionState,
} from "./ask-os-companion-state";
import { serializeAskOsDirective, type AskOsDirective } from "./ask-os-directive-schema";

const IDLE: ConfirmActionActivity = { status: "idle", submittedAt: 0 };
const REPLY_AT = "2026-10-09T09:00:00.000Z";

function reply(...directives: AskOsDirective[]): AskAiHistoryMessage[] {
  return [
    { id: -2, role: "user", content: "hi", createdAt: REPLY_AT },
    {
      id: -1,
      role: "assistant",
      content: ["Answer", ...directives.map(serializeAskOsDirective)].join("\n"),
      createdAt: REPLY_AT,
    },
  ];
}

const clarify: AskOsDirective = {
  kind: "clarify",
  clarificationId: "c",
  purpose: "scope",
  question: "Which?",
  options: [{ id: "mine", label: "Mine" }],
  expiresAt: "2999-01-01T00:00:00.000Z",
};

const proposal: AskOsDirective = {
  kind: "confirm-action",
  proposalId: 1,
  token: "tok",
  action: "a",
  summary: "s",
  preview: {},
};

function state(
  input: Partial<Parameters<typeof deriveAskOsCompanionState>[0]>,
  confirm: ConfirmActionActivity = IDLE,
) {
  return deriveAskOsCompanionState(
    { draft: null, failure: null, directives: [], persisted: [], ...input },
    confirm,
  );
}

describe("deriveAskOsCompanionState", () => {
  it("is idle with nothing going on", () => {
    expect(state({})).toBe("idle");
  });

  it("is thinking while a reply is pending with nothing structured yet", () => {
    expect(state({ draft: { assistant: "" } })).toBe("thinking");
  });

  it("maps each failure to its own state", () => {
    expect(state({ failure: { status: "cancelled" } })).toBe("stopped");
    expect(state({ failure: { status: "offline", message: "x" } })).toBe("disconnected");
    expect(state({ failure: { status: "denied", reason: "x" } })).toBe("denied");
    expect(state({ failure: { status: "quota" } })).toBe("failed");
  });

  it("asks for a choice when the latest turn carries a clarification", () => {
    expect(state({ persisted: reply(clarify) })).toBe("clarification");
    expect(state({ draft: { assistant: "" }, directives: [clarify] })).toBe("clarification");
  });

  it("is proposal ready when a redeemable proposal is on screen", () => {
    expect(state({ persisted: reply(proposal) })).toBe("proposal-ready");
  });

  it("reports partial evidence only when a source was not fully available", () => {
    const ok: AskOsDirective = { kind: "evidence", sources: [{ owner: "B", label: "x", status: "ok" }] };
    const degraded: AskOsDirective = {
      kind: "evidence",
      sources: [{ owner: "D", label: "y", status: "degraded" }],
    };
    expect(state({ persisted: reply(ok) })).toBe("idle");
    expect(state({ persisted: reply(degraded) })).toBe("partial-evidence");
  });

  it("maps a capability limit to disconnected or denied", () => {
    expect(
      state({ persisted: reply({ kind: "capability-limit", reason: "needs-connection", summary: "s" }) }),
    ).toBe("disconnected");
    expect(state({ persisted: reply({ kind: "capability-limit", reason: "unsupported", summary: "s" }) })).toBe(
      "denied",
    );
  });

  it("follows a confirmation from pending to the receipt it returned", () => {
    const after = Date.parse(REPLY_AT) + 1000;
    expect(state({ persisted: reply(proposal) }, { status: "pending", submittedAt: after })).toBe(
      "confirmation-pending",
    );
    const receipt = {
      proposalId: 1,
      action: "a",
      summary: "s",
      at: REPLY_AT,
    };
    expect(
      state(
        { persisted: reply(proposal) },
        { status: "success", submittedAt: after, receipt: { ...receipt, status: "committed" } },
      ),
    ).toBe("success");
    expect(
      state(
        { persisted: reply(proposal) },
        { status: "success", submittedAt: after, receipt: { ...receipt, status: "conflicted" } },
      ),
    ).toBe("conflict");
    expect(
      state({ persisted: reply(proposal) }, { status: "error", submittedAt: after, errorStatus: 403 }),
    ).toBe("denied");
  });

  it("ignores a confirmation older than the latest reply", () => {
    const before = Date.parse(REPLY_AT) - 1000;
    expect(state({ persisted: reply() }, { status: "success", submittedAt: before })).toBe("idle");
  });

  it("reads a receipt directive in the latest turn", () => {
    expect(
      state({
        persisted: reply({
          kind: "action-receipt",
          proposalId: 1,
          action: "a",
          status: "expired",
          summary: "s",
          at: REPLY_AT,
        }),
      }),
    ).toBe("conflict");
  });
});

function Probe() {
  return <span>{useAskOsCompanionState()}</span>;
}

describe("companion state for the launcher", () => {
  it("defaults to idle and reads the provided state", () => {
    const { rerender } = render(<Probe />);
    expect(screen.getByText("idle")).toBeInTheDocument();
    rerender(
      <AskOsCompanionStateContext value="thinking">
        <Probe />
      </AskOsCompanionStateContext>,
    );
    expect(screen.getByText("thinking")).toBeInTheDocument();
  });

  it("announces the state politely", () => {
    render(<AskOsStatusText state="proposal-ready" />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("A proposal is ready for your review");
  });
});

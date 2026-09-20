import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <div className={className}>{children}</div>,
    span: ({ children }: { children: React.ReactNode }) => (
      <span>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useReducedMotion: () => false,
}));

jest.mock("@/components/brand/animated-logo", () => ({
  AnimatedLogo: () => null,
}));

jest.mock("@/components/markdown/markdown-content", () => ({
  MarkdownContent: ({ content }: { content: string }) => <span>{content}</span>,
}));

const mutate = jest.fn();

jest.mock("@/hooks/api/ai-confirm-action", () => ({
  useConfirmAction: () => ({ mutate, isPending: false }),
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn() },
}));

import { AskOsBubble } from "./ask-os-chat-utils";
import { serializeAskOsDirective } from "./ask-os-directive-schema";
import type { ConfirmActionResult } from "@/hooks/api/ai-confirm-action";

const bonusDirective = {
  kind: "confirm-action" as const,
  proposalId: 7,
  token: "tok-bonus",
  action: "hr.bonus.create",
  summary: "Grant a bonus to Jane Doe",
  preview: { amount: "5000" },
  title: "Grant bonus",
};

const storedBonusDirective = {
  kind: "confirm-action" as const,
  proposalId: 7,
  action: "hr.bonus.create",
  summary: "Grant a bonus to Jane Doe",
  preview: { amount: "5000" },
  title: "Grant bonus",
};

const leaveDirective = {
  kind: "confirm-action" as const,
  proposalId: 8,
  token: "tok-leave",
  action: "self.leave.request",
  summary: "Request leave",
  preview: { startDate: "2026-10-01" },
  title: "Request leave",
};

function resolveConfirmWith(summary: string) {
  mutate.mockImplementation(
    (_token: string, options: { onSuccess: (data: ConfirmActionResult) => void }) => {
      options.onSuccess({ ok: true, result: {}, summary });
    },
  );
}

const emailDirective = {
  kind: "confirm-action" as const,
  proposalId: 1,
  token: "tok-email",
  action: "email.send",
  summary: "Send email to test@example.com",
  preview: { toEmail: "test@example.com", subject: "Quarterly Report" },
  title: "Send email",
  confirmLabel: "Send",
};

beforeEach(() => {
  mutate.mockReset();
});

describe("AskOsBubble confirm-action routing — persisted vs live", () => {
  it("a persisted assistant turn (no directivesProp) renders the confirm card title and preview fields", async () => {
    const content = `I will send that email for you.\n${serializeAskOsDirective(emailDirective)}`;

    render(
      <AskOsBubble
        role="assistant"
        content={content}
        streaming={false}
        reduce={false}
      />,
    );

    expect(await screen.findByText("Send email")).toBeInTheDocument();
    expect(await screen.findByText("test@example.com")).toBeInTheDocument();
  });

  it("a persisted confirm card exposes no Confirm or Discard button so the expired token cannot be resubmitted", async () => {
    const content = `I will send that email for you.\n${serializeAskOsDirective(emailDirective)}`;

    render(
      <AskOsBubble
        role="assistant"
        content={content}
        streaming={false}
        reduce={false}
      />,
    );

    expect(await screen.findByText("Past proposal — view only.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send|confirm|discard/i })).not.toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("a live assistant turn (directivesProp supplied) renders a working Confirm button and no past-proposal copy", async () => {
    render(
      <AskOsBubble
        role="assistant"
        content="I will send that email for you."
        streaming={false}
        reduce={false}
        directives={[emailDirective]}
      />,
    );

    expect(await screen.findByRole("button", { name: "Send" })).toBeInTheDocument();
    expect(screen.queryByText("Past proposal — view only.")).not.toBeInTheDocument();
  });

  it("clicking Confirm on a live card calls the confirm hook with the proposal token", async () => {
    render(
      <AskOsBubble
        role="assistant"
        content="I will send that email for you."
        streaming={false}
        reduce={false}
        directives={[emailDirective]}
      />,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Send" }));

    expect(mutate).toHaveBeenCalledWith(
      "tok-email",
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});

describe("a confirm directive the backend no longer ships a token for cannot be executed", () => {
  it("renders a tokenless directive as a read-only past proposal instead of a button that would confirm nothing", async () => {
    render(
      <AskOsBubble
        role="assistant"
        content="Granting that bonus."
        streaming={false}
        reduce={false}
        directives={[storedBonusDirective]}
      />,
    );

    expect(await screen.findByText("Past proposal — view only.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /confirm|discard/i })).not.toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });
});

describe("a confirmed action reports what the backend actually did", () => {
  it("renders the backend summary so granting a bonus does not read the same as filing leave", async () => {
    resolveConfirmWith("Bonus created (PENDING payroll approval): 5000");

    render(
      <AskOsBubble
        role="assistant"
        content="Granting that bonus."
        streaming={false}
        reduce={false}
        directives={[bonusDirective]}
      />,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Confirm" }));

    expect(
      await screen.findByText("Bonus created (PENDING payroll approval): 5000"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Done.")).not.toBeInTheDocument();
  });

  it("renders the leave summary rather than the hardcoded Done. that made every action look identical", async () => {
    resolveConfirmWith("Leave request submitted from 2026-10-01 to 2026-10-03");

    render(
      <AskOsBubble
        role="assistant"
        content="Filing that leave request."
        streaming={false}
        reduce={false}
        directives={[leaveDirective]}
      />,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Confirm" }));

    expect(
      await screen.findByText("Leave request submitted from 2026-10-01 to 2026-10-03"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Done.")).not.toBeInTheDocument();
  });

  it("renders the recipient-bearing email summary instead of the generic Email sent.", async () => {
    resolveConfirmWith("Email sent to test@example.com");

    render(
      <AskOsBubble
        role="assistant"
        content="Sending that email."
        streaming={false}
        reduce={false}
        directives={[emailDirective]}
      />,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Send" }));

    expect(await screen.findByText("Email sent to test@example.com")).toBeInTheDocument();
    expect(screen.queryByText("Email sent.")).not.toBeInTheDocument();
  });

  it("falls back to the per-action copy when the summary is blank so an older response never renders an empty line", async () => {
    resolveConfirmWith("   ");

    render(
      <AskOsBubble
        role="assistant"
        content="Granting that bonus."
        streaming={false}
        reduce={false}
        directives={[bonusDirective]}
      />,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Confirm" }));

    expect(await screen.findByText("Done.")).toBeInTheDocument();
  });

  it("falls back to Email sent. when an email confirm returns no summary", async () => {
    resolveConfirmWith("");

    render(
      <AskOsBubble
        role="assistant"
        content="Sending that email."
        streaming={false}
        reduce={false}
        directives={[emailDirective]}
      />,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Send" }));

    expect(await screen.findByText("Email sent.")).toBeInTheDocument();
  });
});

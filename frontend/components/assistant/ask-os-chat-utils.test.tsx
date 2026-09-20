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

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import type { AskAiHistoryMessage } from "@/hooks/api/chat-ai-assistant";
import { AskOsChatView } from "./ask-os-chat-view";
import { serializeAskOsDirective } from "./ask-os-directive-schema";

jest.mock("@/components/brand/animated-logo", () => ({
  AnimatedLogo: () => <span />,
}));

jest.mock("@/components/markdown/markdown-content", () => ({
  MarkdownContent: ({ content }: { content: string }) => <p>{content}</p>,
}));

jest.mock("@/hooks/api/ai-confirm-action", () => ({
  ...jest.requireActual<typeof import("@/hooks/api/ai-confirm-action")>("@/hooks/api/ai-confirm-action"),
  useConfirmAction: () => ({ mutate: jest.fn(), isPending: false }),
  useDeclineProposal: () => ({ mutate: jest.fn(), isPending: false }),
}));

function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createAppQueryClient()}>{children}</QueryClientProvider>;
}

const scrollRef = { current: null };
const topSentinelRef = { current: null };

const viewProps = {
  atBottom: true,
  failure: null,
  hasNextPage: false,
  isFetchingNextPage: false,
  onJumpToLatest: jest.fn(),
  onLoadOlder: jest.fn(),
  onRetry: jest.fn(),
  onScroll: jest.fn(),
  onSuggestion: jest.fn(),
  persisted: [],
  reduce: true,
  scrollRef,
  topSentinelRef,
};

describe("AskOsChatView — first send", () => {
  it("shows the user message instead of skeletons while the new conversation is still loading", () => {
    render(
      <AskOsChatView
        {...viewProps}
        draft={{ user: "Summarize my day", assistant: "" }}
        isLoading
        isStreaming={false}
        showEmpty={false}
      />,
      { wrapper: Providers },
    );

    expect(screen.getByText("Summarize my day")).toBeInTheDocument();
    expect(screen.queryByText("How can I help?")).toBeNull();
  });
});

const clarify = serializeAskOsDirective({
  kind: "clarify",
  clarificationId: "clr-1",
  purpose: "scope",
  question: "Which bugs should I count?",
  options: [
    { id: "project:42", label: "This project" },
    { id: "mine", label: "My assigned work" },
  ],
  expiresAt: "2999-01-01T00:00:00.000Z",
});

function history(...assistantContents: string[]): AskAiHistoryMessage[] {
  return assistantContents.flatMap((content, index) => [
    { id: index * 2 + 1, role: "user" as const, content: "How many open bugs?", createdAt: "2026-10-09T09:00:00.000Z" },
    { id: index * 2 + 2, role: "assistant" as const, content, createdAt: "2026-10-09T09:00:01.000Z" },
  ]);
}

describe("AskOsChatView — clarification", () => {
  it("lets the latest clarification be answered and sends the chosen option", async () => {
    const onClarify = jest.fn();
    render(
      <AskOsChatView
        {...viewProps}
        draft={null}
        isLoading={false}
        isStreaming={false}
        showEmpty={false}
        persisted={history(`I need a scope.\n${clarify}`)}
        onClarify={onClarify}
      />,
      { wrapper: Providers },
    );

    await userEvent.click(await screen.findByRole("radio", { name: /My assigned work/ }));
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(onClarify).toHaveBeenCalledWith({
      clarificationId: "clr-1",
      optionId: "mine",
      label: "My assigned work",
    });
    expect(screen.getByRole("status")).toHaveTextContent("Waiting for you to choose an option");
  });

  it("keeps an older clarification view only once the conversation moved on", async () => {
    render(
      <AskOsChatView
        {...viewProps}
        draft={null}
        isLoading={false}
        isStreaming={false}
        showEmpty={false}
        persisted={history(clarify, "There are 4 open bugs.")}
        onClarify={jest.fn()}
      />,
      { wrapper: Providers },
    );

    expect(await screen.findByText("No longer active — view only.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
  });

  it("does not offer the answer while a reply is still streaming", async () => {
    render(
      <AskOsChatView
        {...viewProps}
        draft={{ user: "next", assistant: "" }}
        isLoading={false}
        isStreaming
        showEmpty={false}
        persisted={history(clarify)}
        onClarify={jest.fn()}
      />,
      { wrapper: Providers },
    );

    expect(await screen.findByText("No longer active — view only.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Working on your request");
  });
});

describe("AskOsChatView — a just-finished proposal stays confirmable", () => {
  const proposal = serializeAskOsDirective({
    kind: "confirm-action",
    proposalId: 5,
    token: "tok-5",
    action: "build.ticket.updateStatus",
    summary: "Move STRE-7 to Done",
    preview: { status: "Done" },
    confirmLabel: "Move",
  });

  it("renders a live Confirm for this session's turn (temporary id)", async () => {
    render(
      <AskOsChatView
        {...viewProps}
        draft={null}
        isLoading={false}
        isStreaming={false}
        showEmpty={false}
        persisted={[
          { id: -2, role: "user", content: "close it", createdAt: "2026-10-09T09:00:00.000Z" },
          { id: -1, role: "assistant", content: proposal, createdAt: "2026-10-09T09:00:01.000Z" },
        ]}
      />,
      { wrapper: Providers },
    );

    expect(await screen.findByRole("button", { name: "Move" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("A proposal is ready for your review");
  });

  it("renders a server-loaded proposal as a record", async () => {
    render(
      <AskOsChatView
        {...viewProps}
        draft={null}
        isLoading={false}
        isStreaming={false}
        showEmpty={false}
        persisted={history(proposal)}
      />,
      { wrapper: Providers },
    );

    expect(await screen.findByText("Past proposal — view only.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Move" })).toBeNull();
  });
});

import { render, screen } from "@testing-library/react";
import { AskOsChatView } from "./ask-os-chat-view";

jest.mock("@/components/brand/animated-logo", () => ({
  AnimatedLogo: () => <span />,
}));

jest.mock("@/components/markdown/markdown-content", () => ({
  MarkdownContent: ({ content }: { content: string }) => <p>{content}</p>,
}));

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
  directive: null,
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
    );

    expect(screen.getByText("Summarize my day")).toBeInTheDocument();
    expect(screen.queryByText("How can I help?")).toBeNull();
  });
});

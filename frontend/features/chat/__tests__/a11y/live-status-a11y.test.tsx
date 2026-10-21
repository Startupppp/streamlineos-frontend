import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { UNSCOPED } from "@/lib/org-scoped-storage";
import { expectNoAxeViolations } from "@/test-utils/axe";
import { appendOutboxEntry, chatDraftKey } from "../../composer-draft";
import { ChatBubbleFailedSend } from "../../chat-bubble-failed-send";
import {
  installMessageListEnvironment,
  props as listProps,
} from "../../message-list-test-harness";
import { MessageList } from "../../message-list";

installMessageListEnvironment();

beforeEach(() => localStorage.clear());

describe("Not sent status", () => {
  function renderFailed() {
    appendOutboxEntry(chatDraftKey(7, UNSCOPED), { content: "hello", clientKey: "k-1", failed: true });
    return render(
      <QueryClientProvider client={new QueryClient()}>
        <ChatBubbleFailedSend channelId={7} clientKey="k-1" />
      </QueryClientProvider>,
    );
  }

  it("is a status region whose text and actions are exposed", () => {
    renderFailed();
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Not sent");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discard" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    jest.useRealTimers();
    const { container } = renderFailed();
    await expectNoAxeViolations(container);
  });
});

describe("message list live regions", () => {
  it("announces the loading state as status text", () => {
    render(<MessageList {...listProps({ isLoading: true })} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading messages");
  });

  it("announces fetching older messages politely", () => {
    render(<MessageList {...listProps({ isFetchingNextPage: true })} />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Loading older messages");
  });
});

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { ThreadPanel } from "./thread-panel";
import type { Message } from "@/types/chat";
const PANEL_RENDER_PAGE_SIZE = 25;

const useThreadReplies = jest.fn();
const useThreadOutbox = jest.fn();
const useChatOrgUsers = jest.fn();

jest.mock("@/hooks/api/chat-search", () => ({
  useThreadReplies: (channelId: number, messageId: number) => useThreadReplies(channelId, messageId),
}));

jest.mock("./use-chat-offline-queue", () => ({
  useThreadOutbox: () => useThreadOutbox(),
}));

jest.mock("@/hooks/api/chat-core-read", () => ({
  useChatOrgUsers: () => useChatOrgUsers(),
}));

jest.mock("./chat-attachment", () => ({
  ChatAttachment: ({ fileName }: { fileName: string }) => <span>{fileName}</span>,
}));

jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn(), dismiss: jest.fn() }),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({
    iconRef: { current: null },
    hoverHandlers: { onMouseEnter: jest.fn(), onMouseLeave: jest.fn() },
  }),
}));

const fetchNextPage = jest.fn();
const noop = () => undefined;

function infiniteResult(pages: unknown[], hasNextPage: boolean) {
  return {
    data: { pages, pageParams: [] },
    isLoading: false,
    isError: false,
    hasNextPage,
    isFetchingNextPage: false,
    fetchNextPage,
    refetch: jest.fn(),
  };
}

function makeMessage(index: number): Message {
  return {
    id: index,
    channelId: 1,
    senderId: "user-1",
    content: `reply-${index}`,
    replyToId: null,
    isEdited: false,
    isDeleted: false,
    messageType: "text",
    metadata: null,
    actionStatus: null,
    reactions: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    sender: { id: "user-1", name: "Ada", image: null },
    attachments: [],
    replyTo: null,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useChatOrgUsers.mockReturnValue({ data: [] });
  useThreadOutbox.mockReturnValue({
    enqueue: jest.fn(),
    isOnline: true,
    isPending: false,
    draftKey: "unscoped::chat:thread:7:42",
    discardFailed: jest.fn(),
  });
});

describe("ThreadPanel — older replies load by scrolling, not by a visible button", () => {
  it("renders the older-replies control as a scroll sentinel whose button is screen-reader only", () => {
    useThreadReplies.mockReturnValue(
      infiniteResult(
        [{ parentMessage: makeMessage(0), replies: Array.from({ length: 60 }, (_, i) => makeMessage(i + 1)), nextCursor: undefined }],
        false,
      ),
    );
    render(<ThreadPanel channelId={1} parentMessageId={7} currentUserId="user-1" onClose={noop} />);
    const control = screen.getByRole("button", { name: /show 25 more/i });
    expect(control.className).toContain("sr-only");
    expect(screen.queryByRole("button", { name: /load older replies/i })).toBeNull();
  });
});

describe("ThreadPanel — a thread opens at its newest reply", () => {
  it("scrolls the thread viewport to the bottom once the replies load", () => {
    const scrollHeight = jest
      .spyOn(HTMLElement.prototype, "scrollHeight", "get")
      .mockReturnValue(900);
    const scrollTop = jest.spyOn(Element.prototype, "scrollTop", "set");
    useThreadReplies.mockReturnValue(
      infiniteResult(
        [{ parentMessage: makeMessage(0), replies: [makeMessage(1), makeMessage(2)], nextCursor: undefined }],
        false,
      ),
    );
    const { container } = render(
      <ThreadPanel channelId={1} parentMessageId={7} currentUserId="user-1" onClose={noop} />,
    );
    const viewport = container.querySelector('[data-slot="scroll-area-viewport"]');
    expect(viewport).not.toBeNull();
    expect(scrollTop).toHaveBeenCalledWith(900);
    expect(scrollTop.mock.contexts).toContain(viewport);
    scrollHeight.mockRestore();
    scrollTop.mockRestore();
  });
});

describe("ThreadPanel — the reply window is a tail and is bounded", () => {
  function renderPanel(total: number, hasNextPage = false) {
    useThreadReplies.mockReturnValue(
      infiniteResult(
        [
          {
            parentMessage: makeMessage(0),
            replies: Array.from({ length: total }, (_, i) => makeMessage(i + 1)),
            nextCursor: undefined,
          },
        ],
        hasNextPage,
      ),
    );
    return render(
      <ThreadPanel channelId={1} parentMessageId={7} currentUserId="user-1" onClose={noop} />,
    );
  }

  it("mounts one page of replies for a 500-reply thread, not 500", () => {
    renderPanel(500);
    expect(screen.getAllByRole("listitem")).toHaveLength(PANEL_RENDER_PAGE_SIZE);
  });

  it("keeps the newest replies and holds the older ones back", () => {
    renderPanel(500);
    expect(screen.getByText("reply-500")).toBeInTheDocument();
    expect(screen.queryByText("reply-475")).toBeNull();
  });

  it("numbers a windowed reply by its position in the whole thread", () => {
    renderPanel(500);
    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveAttribute("aria-posinset", "476");
    expect(rows[0]).toHaveAttribute("aria-setsize", "500");
  });

  it("reveals older replies without skipping any", async () => {
    const user = userEvent.setup();
    renderPanel(500);
    await user.click(screen.getByRole("button", { name: /show 25 more \(25 of 500\)/i }));
    expect(screen.getByText("reply-475")).toBeInTheDocument();
    expect(screen.getByText("reply-476")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(PANEL_RENDER_PAGE_SIZE * 2);
  });

  it("goes back to the newest page when the reader opens a different thread", async () => {
    const user = userEvent.setup();
    const { rerender } = renderPanel(500);
    await user.click(screen.getByRole("button", { name: /show 25 more/i }));
    expect(screen.getAllByRole("listitem")).toHaveLength(PANEL_RENDER_PAGE_SIZE * 2);
    rerender(
      <ThreadPanel channelId={1} parentMessageId={8} currentUserId="user-1" onClose={noop} />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(PANEL_RENDER_PAGE_SIZE);
  });

  it("still counts the whole thread in its reply summary", () => {
    renderPanel(500);
    expect(screen.getByText("500 replies")).toBeInTheDocument();
  });
});

describe("ThreadPanel — a ?message reply is highlighted and scrolled to inside its thread", () => {
  function renderThread(highlightedReplyId: number | null) {
    useThreadReplies.mockReturnValue(
      infiniteResult(
        [
          {
            parentMessage: makeMessage(0),
            replies: Array.from({ length: 100 }, (_, i) => makeMessage(i + 1)),
            nextCursor: undefined,
          },
        ],
        false,
      ),
    );
    return render(
      <ThreadPanel
        channelId={1}
        parentMessageId={7}
        currentUserId="user-1"
        onClose={noop}
        highlightedReplyId={highlightedReplyId}
      />,
    );
  }

  it("keeps an old anchored reply mounted, marks it and scrolls it into view", () => {
    jest.useFakeTimers();
    const scrollIntoView = jest.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const { container } = renderThread(10);
    act(() => {
      jest.runAllTimers();
    });
    jest.useRealTimers();
    const anchored = container.querySelector('[data-anchored="true"]');
    expect(anchored?.id).toBe("thread-reply-10");
    expect(screen.getByText("reply-100")).toBeInTheDocument();
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("pages older replies until the anchored reply arrives, and stops after a bounded number of pages", () => {
    fetchNextPage.mockClear();
    useThreadReplies.mockReturnValue(
      infiniteResult(
        [{ parentMessage: makeMessage(0), replies: [makeMessage(90), makeMessage(91)], nextCursor: 89 }],
        true,
      ),
    );
    const { rerender } = render(
      <ThreadPanel channelId={1} parentMessageId={7} currentUserId="user-1" onClose={noop} highlightedReplyId={5} />,
    );
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    for (let page = 0; page < 20; page += 1) {
      const pages = [
        { parentMessage: makeMessage(0), replies: [makeMessage(89 - page), makeMessage(90), makeMessage(91)], nextCursor: 1 },
      ];
      useThreadReplies.mockReturnValue({ ...infiniteResult(pages, true), isFetchingNextPage: true });
      rerender(
        <ThreadPanel channelId={1} parentMessageId={7} currentUserId="user-1" onClose={noop} highlightedReplyId={5} />,
      );
      useThreadReplies.mockReturnValue(infiniteResult(pages, true));
      rerender(
        <ThreadPanel channelId={1} parentMessageId={7} currentUserId="user-1" onClose={noop} highlightedReplyId={5} />,
      );
    }
    expect(fetchNextPage.mock.calls.length).toBeGreaterThan(1);
    expect(fetchNextPage.mock.calls.length).toBeLessThanOrEqual(10);
  });

  function pageUntilExhausted(highlightedReplyId: number | null) {
    useThreadReplies.mockReturnValue(
      infiniteResult(
        [{ parentMessage: makeMessage(0), replies: [makeMessage(90), makeMessage(91)], nextCursor: 89 }],
        true,
      ),
    );
    const view = render(
      <ThreadPanel channelId={1} parentMessageId={7} currentUserId="user-1" onClose={noop} highlightedReplyId={highlightedReplyId} />,
    );
    const cycle = (replyId: number | null) => {
      for (let page = 0; page < 20; page += 1) {
        const pages = [
          { parentMessage: makeMessage(0), replies: [makeMessage(89 - page), makeMessage(90), makeMessage(91)], nextCursor: 1 },
        ];
        useThreadReplies.mockReturnValue({ ...infiniteResult(pages, true), isFetchingNextPage: true });
        view.rerender(
          <ThreadPanel channelId={1} parentMessageId={7} currentUserId="user-1" onClose={noop} highlightedReplyId={replyId} />,
        );
        useThreadReplies.mockReturnValue(infiniteResult(pages, true));
        view.rerender(
          <ThreadPanel channelId={1} parentMessageId={7} currentUserId="user-1" onClose={noop} highlightedReplyId={replyId} />,
        );
      }
    };
    cycle(highlightedReplyId);
    return { ...view, cycle };
  }

  it("tells the reader once, without blocking, when the paging budget runs out before the anchored reply arrives", () => {
    fetchNextPage.mockClear();
    jest.mocked(toast).mockClear();
    pageUntilExhausted(5);
    expect(toast).toHaveBeenCalledTimes(1);
    expect(jest.mocked(toast).mock.calls[0]?.[0]).toMatch(/reply/i);
  });

  it("gives a fresh paging budget when the anchor moves away and comes back to the same reply", () => {
    fetchNextPage.mockClear();
    const { cycle } = pageUntilExhausted(5);
    const spent = fetchNextPage.mock.calls.length;
    cycle(null);
    expect(fetchNextPage.mock.calls.length).toBe(spent);
    cycle(5);
    expect(fetchNextPage.mock.calls.length).toBeGreaterThan(spent);
  });

  it("marks nothing when no reply is anchored", () => {
    const { container } = renderThread(null);
    expect(container.querySelector('[data-anchored="true"]')).toBeNull();
  });
});

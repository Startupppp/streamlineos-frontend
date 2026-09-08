/**
 * The three chat side panels read through `useInfiniteQuery`, so their pages
 * accumulate for as long as the query stays in cache: re-opening a panel
 * restored every page fetched earlier in the session and mounted all of them at
 * once. These assert the bound, that nothing behind the bound is unreachable,
 * that the bound keeps list semantics, and that revealing held rows does not
 * fire a second cursor request.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SharedFilesPanel } from "./shared-files-panel";
import { SavedMessagesPanel } from "./saved-messages-panel";
import { ThreadPanel } from "./thread-panel";
import { PANEL_RENDER_PAGE_SIZE } from "./panel-render-window";
import type { ChannelFile } from "@/hooks/api/chat-personal-b";
import type { Message, SavedMessage } from "@/types/chat";

const useChannelFiles = jest.fn();
const useSavedMessages = jest.fn();
const useThreadReplies = jest.fn();
const useUnsaveMessage = jest.fn();
const useSendThreadReply = jest.fn();
const useChatOrgUsers = jest.fn();

jest.mock("@/hooks/api", () => ({
  useChannelFiles: (channelId: number) => useChannelFiles(channelId),
  useSavedMessages: () => useSavedMessages(),
  useThreadReplies: (channelId: number, messageId: number) =>
    useThreadReplies(channelId, messageId),
  useUnsaveMessage: () => useUnsaveMessage(),
  useSendThreadReply: () => useSendThreadReply(),
  useChatOrgUsers: () => useChatOrgUsers(),
}));

jest.mock("./chat-attachment", () => ({
  ChatAttachment: ({ fileName }: { fileName: string }) => <span>{fileName}</span>,
}));

const fetchNextPage = jest.fn();

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

function makeFiles(count: number): ChannelFile[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    messageId: i + 1,
    fileName: `file-${i + 1}.pdf`,
    mimeType: "application/pdf",
    fileSize: 1024,
    fileUrl: `/files/${i + 1}`,
  }));
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
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: null,
    sender: { id: "user-1", name: "Ada", image: null },
    attachments: [],
    replyTo: null,
  };
}

function makeSaved(count: number): SavedMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    orgId: "org-1",
    membershipId: 1,
    messageId: i + 1,
    savedAt: "2026-01-01T00:00:00.000Z",
    message: {
      id: i + 1,
      channelId: 1,
      senderId: "user-1",
      sender: { id: "user-1", name: "Ada", image: null },
      content: `saved-${i + 1}`,
      replyToId: null,
      isEdited: false,
      isDeleted: false,
      messageType: "text",
      metadata: null,
      actionStatus: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      attachments: [],
      replyTo: null,
      channel: null,
    },
  }));
}

beforeEach(() => {
  jest.clearAllMocks();
  useChatOrgUsers.mockReturnValue({ data: [] });
  useUnsaveMessage.mockReturnValue({ mutateAsync: jest.fn() });
  useSendThreadReply.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
});

const noop = () => undefined;

describe("SharedFilesPanel — the mounted row count is bounded", () => {
  function renderPanel(total: number, hasNextPage = false) {
    useChannelFiles.mockReturnValue(
      infiniteResult([{ files: makeFiles(total), nextCursor: undefined }], hasNextPage),
    );
    return render(<SharedFilesPanel channelId={1} onClose={noop} />);
  }

  it("mounts one page of rows for 500 accumulated files, not 500", () => {
    renderPanel(500);
    expect(screen.getAllByRole("listitem")).toHaveLength(PANEL_RENDER_PAGE_SIZE);
  });

  it("mounts every row when the accumulated pages already fit one window", () => {
    renderPanel(12);
    expect(screen.getAllByRole("listitem")).toHaveLength(12);
    expect(screen.queryByRole("button", { name: /show .* more/i })).toBeNull();
  });

  it("keeps row 51 reachable behind the bound", async () => {
    const user = userEvent.setup();
    renderPanel(500);
    expect(screen.queryByText("file-51.pdf")).toBeNull();
    await user.click(screen.getByRole("button", { name: /show 25 more \(25 of 500\)/i }));
    await user.click(screen.getByRole("button", { name: /show 25 more \(50 of 500\)/i }));
    expect(screen.getByText("file-51.pdf")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(PANEL_RENDER_PAGE_SIZE * 3);
  });

  it("reports the true set size and position, not the window's", () => {
    renderPanel(500);
    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveAttribute("aria-setsize", "500");
    expect(rows[0]).toHaveAttribute("aria-posinset", "1");
    expect(rows[PANEL_RENDER_PAGE_SIZE - 1]).toHaveAttribute(
      "aria-posinset",
      String(PANEL_RENDER_PAGE_SIZE),
    );
  });

  it("declares the set size unknown while the cursor has more pages", () => {
    renderPanel(500, true);
    expect(screen.getAllByRole("listitem")[0]).toHaveAttribute("aria-setsize", "-1");
  });

  it("goes back to the first page of rows when the reader switches channel", async () => {
    const user = userEvent.setup();
    useChannelFiles.mockReturnValue(
      infiniteResult([{ files: makeFiles(500), nextCursor: undefined }], false),
    );
    const { rerender } = render(<SharedFilesPanel channelId={1} onClose={noop} />);
    await user.click(screen.getByRole("button", { name: /show 25 more/i }));
    expect(screen.getAllByRole("listitem")).toHaveLength(PANEL_RENDER_PAGE_SIZE * 2);
    rerender(<SharedFilesPanel channelId={2} onClose={noop} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(PANEL_RENDER_PAGE_SIZE);
  });

  it("names the list for a screen reader", () => {
    renderPanel(500);
    expect(screen.getByRole("list", { name: "Shared files" })).toBeInTheDocument();
  });
});

describe("SharedFilesPanel — revealing held rows is not a cursor request", () => {
  it("reveals what is already held without asking the server for another page", async () => {
    const user = userEvent.setup();
    useChannelFiles.mockReturnValue(
      infiniteResult([{ files: makeFiles(500), nextCursor: 500 }], true),
    );
    render(<SharedFilesPanel channelId={1} onClose={noop} />);
    await user.click(screen.getByRole("button", { name: /show 25 more/i }));
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it("asks for the next cursor page only once nothing is held back", async () => {
    const user = userEvent.setup();
    useChannelFiles.mockReturnValue(
      infiniteResult([{ files: makeFiles(10), nextCursor: 10 }], true),
    );
    render(<SharedFilesPanel channelId={1} onClose={noop} />);
    await user.click(screen.getByRole("button", { name: /load more/i }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });
});

describe("SavedMessagesPanel — the mounted row count is bounded", () => {
  function renderPanel(total: number, hasNextPage = false) {
    useSavedMessages.mockReturnValue(
      infiniteResult([{ items: makeSaved(total), nextCursor: undefined }], hasNextPage),
    );
    return render(<SavedMessagesPanel onClose={noop} onJumpToChannel={noop} />);
  }

  it("mounts one page of cards for 500 saved messages, not 500", () => {
    renderPanel(500);
    expect(screen.getAllByRole("listitem")).toHaveLength(PANEL_RENDER_PAGE_SIZE);
  });

  it("keeps row 51 reachable behind the bound", async () => {
    const user = userEvent.setup();
    renderPanel(500);
    expect(screen.queryByText("saved-51")).toBeNull();
    await user.click(screen.getByRole("button", { name: /show 25 more \(25 of 500\)/i }));
    await user.click(screen.getByRole("button", { name: /show 25 more \(50 of 500\)/i }));
    expect(screen.getByText("saved-51")).toBeInTheDocument();
  });

  it("names the list and reports the true set size", () => {
    renderPanel(500);
    expect(screen.getByRole("list", { name: "Saved messages" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")[0]).toHaveAttribute("aria-setsize", "500");
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
